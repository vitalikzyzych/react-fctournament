import { matchCards, playerKey } from "./cards";
import { sortMatches } from "./exportJson";
import {
  addResult,
  buildRecords,
  emptyRecord,
  type IPlayedMatch,
  type IRecord,
  isPlayed,
} from "./standings";
import type { IClub, IMatch, PlayerId } from "./types";

export interface IPlayerRecord extends IRecord {
  player: PlayerId;
  /** Share of played matches won, 0 to 1. */
  winRate: number;
}

export type PlayerRecords = Record<PlayerId, IPlayerRecord>;

export interface IClubStat extends IRecord {
  club: IClub;
}

/** A club with a count: clean sheets, a streak and the like. */
export interface IClubCount {
  club: IClub;
  count: number;
}

export interface IStreak extends IClubCount {
  /** The streak is still running (it includes the club's last match). */
  ongoing: boolean;
}

export interface ICardLeader {
  club: IClub;
  /** The name as typed on the footballer's first card. */
  player: string;
  yellow: number;
  red: number;
}

export interface ICardCount {
  yellow: number;
  red: number;
}

export interface ITournamentStats {
  totalMatches: number;
  playedMatches: number;
  totalGoals: number;
  avgGoals: number;
  draws: number;
  homeWins: number;
  awayWins: number;
  goallessDraws: number;
  /** Cards of each player's clubs, using per-tournament ownership. */
  playerCards: Record<PlayerId, ICardCount>;
  players: PlayerRecords;
  clubs: IClubStat[];
  topAttack: IClubStat[];
  worstAttack: IClubStat[];
  bestDefence: IClubStat[];
  worstDefence: IClubStat[];
  biggestWins: IPlayedMatch[];
  highestScoring: IPlayedMatch[];
  lowestScoring: IPlayedMatch[];
  cleanSheets: IClubCount[];
  winStreaks: IStreak[];
  unbeatenStreaks: IStreak[];
  /** Footballers with the most cards, per player. */
  cardLeaders: Record<PlayerId, ICardLeader[]>;
}

/** Entries of the ranked lists on the statistics tab. */
const TOP = 5;

const withWinRate = (player: PlayerId, record: IRecord): IPlayerRecord => ({
  ...record,
  player,
  winRate: record.played ? record.won / record.played : 0,
});

/** S and V records over matches between their clubs, using per-tournament ownership. */
export const computePlayerRecords = (
  clubs: IClub[],
  matches: IMatch[]
): PlayerRecords => {
  const ownerOf = new Map(clubs.map((club) => [club.id, club.owner]));
  const records: Record<PlayerId, IRecord> = {
    S: emptyRecord(),
    V: emptyRecord(),
  };

  matches.filter(isPlayed).forEach(({ home, away, result }) => {
    const homeOwner = ownerOf.get(home);
    const awayOwner = ownerOf.get(away);
    if (!homeOwner || !awayOwner || homeOwner === awayOwner) return;
    addResult(records[homeOwner], result.home, result.away);
    addResult(records[awayOwner], result.away, result.home);
  });

  return { S: withWinRate("S", records.S), V: withWinRate("V", records.V) };
};

export const sumPlayerRecords = (list: PlayerRecords[]): PlayerRecords => {
  const sum = (player: PlayerId) => {
    const total = emptyRecord();
    list.forEach((records) => {
      const record = records[player];
      total.played += record.played;
      total.won += record.won;
      total.drawn += record.drawn;
      total.lost += record.lost;
      total.goalsFor += record.goalsFor;
      total.goalsAgainst += record.goalsAgainst;
      total.points += record.points;
    });
    total.goalDiff = total.goalsFor - total.goalsAgainst;
    return withWinRate(player, total);
  };
  return { S: sum("S"), V: sum("V") };
};

const margin = (match: IPlayedMatch) =>
  Math.abs(match.result.home - match.result.away);
const goalsIn = (match: IPlayedMatch) => match.result.home + match.result.away;

/** Clean sheets per club, most first. */
const countCleanSheets = (
  clubs: IClub[],
  played: IPlayedMatch[]
): IClubCount[] =>
  clubs
    .map((club) => ({
      club,
      count: played.filter(
        ({ home, away, result }) =>
          (home === club.id && result.away === 0) ||
          (away === club.id && result.home === 0)
      ).length,
    }))
    .filter((entry) => entry.count > 0)
    .sort((a, b) => b.count - a.count || a.club.name.localeCompare(b.club.name))
    .slice(0, TOP);

/**
 * Longest run of matches in play order (group matchdays, then the playoff)
 * that pass the test, per club; runs of at least 2 only.
 */
const longestStreaks = (
  clubs: IClub[],
  played: IPlayedMatch[],
  counts: (scored: number, conceded: number) => boolean
): IStreak[] => {
  const ordered = sortMatches(played).filter(isPlayed);
  return clubs
    .map((club) => {
      let run = 0;
      let best = 0;
      ordered.forEach(({ home, away, result }) => {
        if (home !== club.id && away !== club.id) return;
        const [scored, conceded] =
          home === club.id
            ? [result.home, result.away]
            : [result.away, result.home];
        run = counts(scored, conceded) ? run + 1 : 0;
        best = Math.max(best, run);
      });
      return { club, count: best, ongoing: run > 0 && run === best };
    })
    .filter((entry) => entry.count >= 2)
    .sort((a, b) => b.count - a.count || a.club.name.localeCompare(b.club.name))
    .slice(0, TOP);
};

/** Footballers with the most cards (reds weigh more on a tie). */
const findCardLeaders = (
  clubsById: Map<string, IClub>,
  matches: IMatch[]
): Record<PlayerId, ICardLeader[]> => {
  const leaders = new Map<string, ICardLeader>();
  matches.flatMap(matchCards).forEach((card) => {
    const club = clubsById.get(card.club);
    if (!club) return;
    const key = `${card.club}:${playerKey(card.player)}`;
    const leader = leaders.get(key) ?? {
      club,
      player: card.player.trim(),
      yellow: 0,
      red: 0,
    };
    leader[card.type] += 1;
    leaders.set(key, leader);
  });
  const ranked = [...leaders.values()].sort(
    (a, b) =>
      b.yellow + b.red - (a.yellow + a.red) ||
      b.red - a.red ||
      a.player.localeCompare(b.player)
  );
  const of = (owner: PlayerId) =>
    ranked.filter((leader) => leader.club.owner === owner).slice(0, TOP);
  return { S: of("S"), V: of("V") };
};

const countPlayerCards = (
  clubsById: Map<string, IClub>,
  matches: IMatch[]
): Record<PlayerId, ICardCount> => {
  const counts: Record<PlayerId, ICardCount> = {
    S: { yellow: 0, red: 0 },
    V: { yellow: 0, red: 0 },
  };
  matches.flatMap(matchCards).forEach((card) => {
    const owner = clubsById.get(card.club)?.owner;
    if (owner) counts[owner][card.type] += 1;
  });
  return counts;
};

export const computeTournamentStats = (
  clubs: IClub[],
  matches: IMatch[]
): ITournamentStats => {
  const played = matches.filter(isPlayed);
  const records = buildRecords(
    clubs.map((club) => club.id),
    matches
  );
  const clubStats: IClubStat[] = clubs.map((club) => ({
    ...(records.get(club.id) ?? emptyRecord()),
    club,
  }));
  const withMatches = clubStats.filter((stat) => stat.played > 0);
  const totalGoals = played.reduce((sum, match) => sum + goalsIn(match), 0);
  const clubsById = new Map(clubs.map((club) => [club.id, club]));

  return {
    totalMatches: matches.length,
    playedMatches: played.length,
    totalGoals,
    avgGoals: played.length ? totalGoals / played.length : 0,
    draws: played.filter((match) => match.result.home === match.result.away)
      .length,
    homeWins: played.filter((match) => match.result.home > match.result.away)
      .length,
    awayWins: played.filter((match) => match.result.home < match.result.away)
      .length,
    goallessDraws: played.filter((match) => goalsIn(match) === 0).length,
    playerCards: countPlayerCards(clubsById, matches),
    players: computePlayerRecords(clubs, matches),
    clubs: clubStats,
    topAttack: [...withMatches]
      .sort((a, b) => b.goalsFor - a.goalsFor || a.played - b.played)
      .slice(0, TOP),
    // Fewest goals; over more matches is worse.
    worstAttack: [...withMatches]
      .sort((a, b) => a.goalsFor - b.goalsFor || b.played - a.played)
      .slice(0, TOP),
    bestDefence: [...withMatches]
      .sort((a, b) => a.goalsAgainst - b.goalsAgainst || b.played - a.played)
      .slice(0, TOP),
    // Most goals conceded; over fewer matches is worse.
    worstDefence: [...withMatches]
      .sort((a, b) => b.goalsAgainst - a.goalsAgainst || a.played - b.played)
      .slice(0, TOP),
    biggestWins: played
      .filter((match) => margin(match) > 0)
      .sort((a, b) => margin(b) - margin(a) || goalsIn(b) - goalsIn(a))
      .slice(0, TOP),
    highestScoring: [...played]
      .sort((a, b) => goalsIn(b) - goalsIn(a) || margin(a) - margin(b))
      .slice(0, TOP),
    lowestScoring: [...played]
      .sort((a, b) => goalsIn(a) - goalsIn(b) || margin(a) - margin(b))
      .slice(0, TOP),
    cleanSheets: countCleanSheets(clubs, played),
    winStreaks: longestStreaks(clubs, played, (s, c) => s > c),
    unbeatenStreaks: longestStreaks(clubs, played, (s, c) => s >= c),
    cardLeaders: findCardLeaders(clubsById, matches),
  };
};
