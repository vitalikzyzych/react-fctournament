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

export interface ITournamentStats {
  totalMatches: number;
  playedMatches: number;
  totalGoals: number;
  avgGoals: number;
  draws: number;
  players: PlayerRecords;
  clubs: IClubStat[];
  topAttack: IClubStat[];
  bestDefence: IClubStat[];
  biggestWins: IPlayedMatch[];
}

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

  return {
    totalMatches: matches.length,
    playedMatches: played.length,
    totalGoals,
    avgGoals: played.length ? totalGoals / played.length : 0,
    draws: played.filter((match) => match.result.home === match.result.away)
      .length,
    players: computePlayerRecords(clubs, matches),
    clubs: clubStats,
    topAttack: [...withMatches]
      .sort((a, b) => b.goalsFor - a.goalsFor || a.played - b.played)
      .slice(0, 5),
    bestDefence: [...withMatches]
      .sort((a, b) => a.goalsAgainst - b.goalsAgainst || b.played - a.played)
      .slice(0, 5),
    biggestWins: played
      .filter((match) => margin(match) > 0)
      .sort((a, b) => margin(b) - margin(a) || goalsIn(b) - goalsIn(a))
      .slice(0, 5),
  };
};
