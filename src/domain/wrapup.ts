import { matchCards } from "./cards";
import { findChampionClub } from "./history";
import { findLeagueWinner } from "./league";
import { computePlayoff } from "./playoff";
import { type IRatings, tournamentRatingChanges } from "./ratings";
import type { IPlayedMatch } from "./standings";
import {
  cardPoints,
  computeTournamentStats,
  type ICardCount,
  type PlayerRecords,
} from "./stats";
import type { IClub, IMatch, ITournament, PlayerId } from "./types";

export interface IAward {
  id: string;
  title: string;
  /** What earned it: "34 голи у 9 матчах". */
  value: string;
  club?: IClub;
  player?: PlayerId;
  match?: IPlayedMatch;
}

export interface IWrapUp {
  champion: IClub | null;
  /** The club that lost the final. */
  finalist: IClub | null;
  leagueWinner: IClub | null;
  players: PlayerRecords;
  /** The player with more match wins, null when level. */
  winner: PlayerId | null;
  playedMatches: number;
  totalGoals: number;
  awards: IAward[];
}

/** A club needs this share of the busiest club's matches for a rate award. */
const MIN_MATCH_SHARE = 0.5;

const perMatch = (value: number, played: number) =>
  (value / played).toFixed(2).replace(".", ",");

/**
 * The story of a tournament in a few awards: the champion, who won more
 * matches, the best attack and defence per match, the biggest win, the goal
 * fest, the longest run, the discovery and the disappointment (rating gained
 * and lost, when the ratings are given), the sensation and the cards.
 */
export const computeWrapUp = (
  tournament: ITournament,
  matches: IMatch[],
  ratings?: IRatings
): IWrapUp => {
  const stats = computeTournamentStats(tournament.clubs, matches);
  const clubsById = new Map(tournament.clubs.map((club) => [club.id, club]));
  const champion = findChampionClub(tournament, matches);
  const final = computePlayoff(matches).find((tie) => tie.round === "F");
  const finalistId =
    champion && final?.home && final.away
      ? [final.home, final.away].find((id) => id !== champion.id)
      : undefined;
  const awards: IAward[] = [];

  const busiest = Math.max(0, ...stats.clubs.map((club) => club.played));
  const regulars = stats.clubs.filter(
    (club) => club.played > 0 && club.played >= busiest * MIN_MATCH_SHARE
  );
  const attack = [...regulars].sort(
    (a, b) => b.goalsFor / b.played - a.goalsFor / a.played
  )[0];
  if (attack) {
    awards.push({
      id: "attack",
      title: "Найкраща атака",
      value: `${perMatch(attack.goalsFor, attack.played)} гола за матч (${attack.goalsFor} у ${attack.played})`,
      club: attack.club,
    });
  }
  const defence = [...regulars].sort(
    (a, b) => a.goalsAgainst / a.played - b.goalsAgainst / b.played
  )[0];
  if (defence) {
    awards.push({
      id: "defence",
      title: "Найкращий захист",
      value: `${perMatch(defence.goalsAgainst, defence.played)} пропущеного за матч (${defence.goalsAgainst} у ${defence.played})`,
      club: defence.club,
    });
  }
  const streak = stats.winStreaks[0];
  if (streak && streak.count >= 3) {
    awards.push({
      id: "streak",
      title: "Найдовша серія перемог",
      value: `${streak.count} поспіль`,
      club: streak.club,
    });
  }
  const biggest = stats.biggestWins[0];
  if (biggest) {
    const winner =
      biggest.result.home > biggest.result.away ? biggest.home : biggest.away;
    awards.push({
      id: "biggest",
      title: "Найбільша перемога",
      value: "",
      club: clubsById.get(winner),
      match: biggest,
    });
  }
  const fest = stats.highestScoring[0];
  if (fest && fest.id !== biggest?.id) {
    awards.push({
      id: "fest",
      title: "Найрезультативніший матч",
      value: `${fest.result.home + fest.result.away} голів`,
      match: fest,
    });
  }

  if (ratings) {
    const changes = tournamentRatingChanges(tournament, ratings);
    const up = changes[0];
    const down = changes[changes.length - 1];
    if (up && up.change >= 1) {
      awards.push({
        id: "discovery",
        title: "Відкриття турніру",
        value: `+${Math.round(up.change)} до рейтингу`,
        club: up.club,
      });
    }
    if (down && down.change <= -1 && down.club.id !== up?.club.id) {
      awards.push({
        id: "disappointment",
        title: "Розчарування турніру",
        value: `${Math.round(down.change)} до рейтингу`,
        club: down.club,
      });
    }
    const upset = ratings.upsets.find((u) => u.tournament.id === tournament.id);
    if (upset) {
      awards.push({
        id: "upset",
        title: "Сенсація турніру",
        value: `шанс на перемогу був ${Math.round(upset.chance * 100)}%`,
        club: clubsById.get(upset.winner),
        match: upset.match,
      });
    }
  }

  // Cards: the roughest club, and the player with fewer card points.
  const clubCards = new Map<string, ICardCount>();
  matches.flatMap(matchCards).forEach((card) => {
    const count = clubCards.get(card.club) ?? { yellow: 0, red: 0 };
    count[card.type] += 1;
    clubCards.set(card.club, count);
  });
  const roughest = [...clubCards.entries()].sort(
    (a, b) => cardPoints(b[1]) - cardPoints(a[1])
  )[0];
  if (roughest) {
    awards.push({
      id: "rough",
      title: "Найгрубіший клуб",
      value: `жовтих ${roughest[1].yellow}, червоних ${roughest[1].red}`,
      club: clubsById.get(roughest[0]),
    });
    const points = {
      S: cardPoints(stats.playerCards.S),
      V: cardPoints(stats.playerCards.V),
    };
    if (points.S !== points.V) {
      const fair: PlayerId = points.S < points.V ? "S" : "V";
      awards.push({
        id: "fair",
        title: "Чистіша гра",
        value: `${points[fair]} проти ${points[fair === "S" ? "V" : "S"]} карткових очок`,
        player: fair,
      });
    }
  }

  const { S, V } = stats.players;
  return {
    champion,
    finalist: (finalistId && clubsById.get(finalistId)) || null,
    leagueWinner: findLeagueWinner(tournament, matches),
    players: stats.players,
    winner: S.won === V.won ? null : S.won > V.won ? "S" : "V",
    playedMatches: stats.playedMatches,
    totalGoals: stats.totalGoals,
    awards,
  };
};
