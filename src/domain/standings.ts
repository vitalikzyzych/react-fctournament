import type { IClub, IMatch, IScore } from "./types";

export interface IRecord {
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDiff: number;
  points: number;
}

export interface IStandingRow extends IRecord {
  club: IClub;
  position: number;
}

export type IPlayedMatch = IMatch & { result: IScore };

export const WIN_POINTS = 3;
export const DRAW_POINTS = 1;

export const isPlayed = (match: IMatch): match is IPlayedMatch =>
  match.result !== null;

export const emptyRecord = (): IRecord => ({
  played: 0,
  won: 0,
  drawn: 0,
  lost: 0,
  goalsFor: 0,
  goalsAgainst: 0,
  goalDiff: 0,
  points: 0,
});

/** Adds one result, seen from one side, to a record (mutates it). */
export const addResult = (
  record: IRecord,
  scored: number,
  conceded: number
) => {
  record.played += 1;
  record.goalsFor += scored;
  record.goalsAgainst += conceded;
  record.goalDiff = record.goalsFor - record.goalsAgainst;
  if (scored > conceded) {
    record.won += 1;
    record.points += WIN_POINTS;
  } else if (scored === conceded) {
    record.drawn += 1;
    record.points += DRAW_POINTS;
  } else {
    record.lost += 1;
  }
};

/** Records per club id over the given played matches. */
export const buildRecords = (
  clubIds: string[],
  matches: IMatch[]
): Map<string, IRecord> => {
  const records = new Map(clubIds.map((id) => [id, emptyRecord()]));
  matches.filter(isPlayed).forEach(({ home, away, result }) => {
    const homeRecord = records.get(home);
    const awayRecord = records.get(away);
    if (homeRecord) addResult(homeRecord, result.home, result.away);
    if (awayRecord) addResult(awayRecord, result.away, result.home);
  });
  return records;
};

/**
 * Group table. Order: points, goal difference, head-to-head between the tied
 * clubs (points, goal difference, goals in those matches), goals scored, name.
 */
export const computeStandings = (
  clubs: IClub[],
  matches: IMatch[]
): IStandingRow[] => {
  const clubIds = clubs.map((club) => club.id);
  const records = buildRecords(clubIds, matches);
  const recordOf = (club: IClub) => records.get(club.id) ?? emptyRecord();

  const byPointsAndDiff = (a: IClub, b: IClub) =>
    recordOf(b).points - recordOf(a).points ||
    recordOf(b).goalDiff - recordOf(a).goalDiff;

  const sorted = [...clubs].sort(byPointsAndDiff);

  // Resolve each block of clubs level on points and goal difference.
  const ordered: IClub[] = [];
  for (let start = 0; start < sorted.length;) {
    let end = start + 1;
    while (
      end < sorted.length &&
      byPointsAndDiff(sorted[start], sorted[end]) === 0
    )
      end += 1;
    const tied = sorted.slice(start, end);

    if (tied.length === 1) {
      ordered.push(tied[0]);
    } else {
      const tiedIds = new Set(tied.map((club) => club.id));
      const between = matches.filter(
        (m) => tiedIds.has(m.home) && tiedIds.has(m.away)
      );
      const mini = buildRecords([...tiedIds], between);
      const miniOf = (club: IClub) => mini.get(club.id) ?? emptyRecord();
      tied.sort(
        (a, b) =>
          miniOf(b).points - miniOf(a).points ||
          miniOf(b).goalDiff - miniOf(a).goalDiff ||
          miniOf(b).goalsFor - miniOf(a).goalsFor ||
          recordOf(b).goalsFor - recordOf(a).goalsFor ||
          a.name.localeCompare(b.name)
      );
      ordered.push(...tied);
    }
    start = end;
  }

  return ordered.map((club, index) => ({
    ...recordOf(club),
    club,
    position: index + 1,
  }));
};
