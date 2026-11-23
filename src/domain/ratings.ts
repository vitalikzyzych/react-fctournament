import { playedChronologically } from "./sessions";
import type { IPlayedMatch } from "./standings";
import type {
  IClub,
  ITournament,
  ITournamentWithMatches,
  PlayerId,
} from "./types";

/** Rating of a club before its first match. */
export const RATING_START = 1500;
/** Points at stake in a match decided by one goal. */
const K = 20;
/** A win this unlikely before the match is a sensation. */
export const UPSET_CHANCE = 0.35;

/** Expected score (1 win, 0.5 draw, 0 loss) of a club rated `own`. */
export const expectedScore = (own: number, opponent: number) =>
  1 / (1 + 10 ** ((opponent - own) / 400));

/** A bigger win moves more points: 1 goal 1, 3 goals 2, 7 goals 3. */
const marginFactor = (goalDiff: number) =>
  goalDiff === 0 ? 1 : Math.log2(1 + Math.abs(goalDiff));

export interface IRatedMatch {
  tournament: ITournament;
  match: IPlayedMatch;
  /** Ratings before the match. */
  home: number;
  away: number;
  /** Expected score of the home club before the match. */
  expectedHome: number;
  /** Points the home club gained (the away club lost the same). */
  change: number;
}

export interface IClubRating {
  clubId: string;
  name: string;
  country?: string;
  rating: number;
  played: number;
  peak: number;
  /** Change over the club's last tournament. */
  lastChange: number;
  /** Rating after each of the club's tournaments, oldest first. */
  history: { tournament: ITournament; rating: number }[];
}

export interface IUpset {
  tournament: ITournament;
  match: IPlayedMatch;
  winner: string;
  loser: string;
  /** Expected score of the winner before the match. */
  chance: number;
  /** Rating gap: the loser's minus the winner's. */
  gap: number;
}

export interface IRatings {
  /** Every club with at least one played match, the best first. */
  clubs: IClubRating[];
  byClub: Map<string, IClubRating>;
  matches: IRatedMatch[];
  /** Ratings at the start of each tournament, by tournament id. */
  before: Map<string, Map<string, number>>;
  /** Wins against a much stronger club, the least likely first. */
  upsets: IUpset[];
}

/**
 * Elo ratings of the clubs over every tournament, oldest first. A club keeps
 * its rating from tournament to tournament whoever owns it, so the rating
 * says how the club does in these games, not how good it is in real life.
 */
export const computeRatings = (list: ITournamentWithMatches[]): IRatings => {
  const byClub = new Map<string, IClubRating>();
  const matches: IRatedMatch[] = [];
  const before = new Map<string, Map<string, number>>();
  const upsets: IUpset[] = [];
  const ratingOf = (id: string) => byClub.get(id)?.rating ?? RATING_START;

  [...list]
    .sort((a, b) => a.tournament.number - b.tournament.number)
    .forEach(({ tournament, matches: own }) => {
      const start = new Map(
        tournament.clubs.map((club): [string, number] => [
          club.id,
          ratingOf(club.id),
        ])
      );
      before.set(tournament.id, start);
      const entry = (club: IClub | undefined, id: string): IClubRating => {
        const existing = byClub.get(id);
        if (existing) {
          if (club) {
            existing.name = club.name;
            existing.country = club.country ?? existing.country;
          }
          return existing;
        }
        const created: IClubRating = {
          clubId: id,
          name: club?.name ?? id,
          country: club?.country,
          rating: RATING_START,
          played: 0,
          peak: RATING_START,
          lastChange: 0,
          history: [],
        };
        byClub.set(id, created);
        return created;
      };
      const clubs = new Map(tournament.clubs.map((club) => [club.id, club]));
      const touched = new Set<string>();

      playedChronologically(own).forEach((match) => {
        const home = entry(clubs.get(match.home), match.home);
        const away = entry(clubs.get(match.away), match.away);
        const expectedHome = expectedScore(home.rating, away.rating);
        const diff = match.result.home - match.result.away;
        const score = diff > 0 ? 1 : diff === 0 ? 0.5 : 0;
        const change = K * marginFactor(diff) * (score - expectedHome);
        matches.push({
          tournament,
          match,
          home: home.rating,
          away: away.rating,
          expectedHome,
          change,
        });
        if (diff !== 0) {
          const winnerIsHome = diff > 0;
          const chance = winnerIsHome ? expectedHome : 1 - expectedHome;
          if (chance <= UPSET_CHANCE) {
            upsets.push({
              tournament,
              match,
              winner: winnerIsHome ? match.home : match.away,
              loser: winnerIsHome ? match.away : match.home,
              chance,
              gap: winnerIsHome
                ? away.rating - home.rating
                : home.rating - away.rating,
            });
          }
        }
        home.rating += change;
        away.rating -= change;
        [home, away].forEach((club) => {
          club.played += 1;
          club.peak = Math.max(club.peak, club.rating);
          touched.add(club.clubId);
        });
      });

      touched.forEach((id) => {
        const club = byClub.get(id);
        if (!club) return;
        club.lastChange = club.rating - (start.get(id) ?? RATING_START);
        club.history.push({ tournament, rating: club.rating });
      });
    });

  const clubs = [...byClub.values()]
    .filter((club) => club.played > 0)
    .sort((a, b) => b.rating - a.rating || a.name.localeCompare(b.name));
  return {
    clubs,
    byClub,
    matches,
    before,
    upsets: upsets.sort((a, b) => a.chance - b.chance),
  };
};

export interface IDrawStrength {
  /** Average rating of each player's clubs before the tournament. */
  players: Record<PlayerId, number>;
  /** Average rating per group, the strongest first. */
  groups: { groupId: string; rating: number }[];
  /** Clubs with a rating from earlier tournaments. */
  known: number;
}

const average = (values: number[]) =>
  values.length ? values.reduce((sum, v) => sum + v, 0) / values.length : 0;

/**
 * How strong the draw of a tournament was on paper: the clubs' ratings
 * before its first match. Null when no club had played before.
 */
export const computeDrawStrength = (
  tournament: ITournament,
  ratings: IRatings
): IDrawStrength | null => {
  const start = ratings.before.get(tournament.id);
  if (!start) return null;
  const earlier = new Set(
    ratings.matches
      .filter((rated) => rated.tournament.number < tournament.number)
      .flatMap((rated) => [rated.match.home, rated.match.away])
  );
  const known = tournament.clubs.filter((club) => earlier.has(club.id)).length;
  if (!known) return null;
  const of = (clubs: IClub[]) =>
    average(clubs.map((club) => start.get(club.id) ?? RATING_START));
  return {
    players: {
      S: of(tournament.clubs.filter((club) => club.owner === "S")),
      V: of(tournament.clubs.filter((club) => club.owner === "V")),
    },
    groups: tournament.groups
      .map((group) => ({
        groupId: group.id,
        rating: of(tournament.clubs.filter((c) => c.group === group.id)),
      }))
      .sort((a, b) => b.rating - a.rating),
    known,
  };
};

/** Rating change of every club over one tournament, the biggest gain first. */
export const tournamentRatingChanges = (
  tournament: ITournament,
  ratings: IRatings
): { club: IClub; change: number }[] => {
  const totals = new Map<string, number>();
  ratings.matches
    .filter((rated) => rated.tournament.id === tournament.id)
    .forEach(({ match, change }) => {
      totals.set(match.home, (totals.get(match.home) ?? 0) + change);
      totals.set(match.away, (totals.get(match.away) ?? 0) - change);
    });
  return tournament.clubs
    .flatMap((club) => {
      const change = totals.get(club.id);
      return change === undefined ? [] : [{ club, change }];
    })
    .sort((a, b) => b.change - a.change);
};
