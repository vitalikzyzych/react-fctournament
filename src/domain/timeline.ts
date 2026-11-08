import { groupTable } from "./league";
import { groupMatches } from "./playoff";
import type { IClub, IMatch, ITournament } from "./types";

export interface ITimelineRow {
  club: IClub;
  /** Table place before matchday 1 (draw order), then after every matchday. */
  positions: number[];
  /** Points at the same moments (0 before matchday 1). */
  points: number[];
}

export interface ILeagueTimeline {
  /** Matchdays in the schedule (8 in sv-league-40). */
  matchdays: number;
  /** Last matchday with at least one result; 0 before the first result. */
  lastPlayed: number;
  rows: ITimelineRow[];
}

/** Draw order: pot, then the number in the club's code ("2S-4"), then name. */
const drawOrder = (a: IClub, b: IClub) =>
  (a.pot ?? 0) - (b.pot ?? 0) ||
  (a.code ?? "").localeCompare(b.code ?? "", undefined, { numeric: true }) ||
  a.name.localeCompare(b.name);

/**
 * How the table of one group (the league) changed: the place and points of
 * every club after each matchday, counting the results of that matchday and
 * all before it. Before matchday 1 the clubs stand in draw order.
 */
export const computeTimeline = (
  tournament: ITournament,
  matches: IMatch[],
  groupId: string
): ILeagueTimeline => {
  const own = groupMatches(matches).filter((m) => m.group === groupId);
  const matchdays = Math.max(0, ...own.map((m) => m.matchday));
  const lastPlayed = Math.max(
    0,
    ...own.filter((m) => m.result !== null).map((m) => m.matchday)
  );
  const clubs = tournament.clubs
    .filter((club) => club.group === groupId)
    .sort(drawOrder);
  const rows = new Map<string, ITimelineRow>(
    clubs.map((club, index) => [
      club.id,
      { club, positions: [index + 1], points: [0] },
    ])
  );

  for (let day = 1; day <= matchdays; day += 1) {
    groupTable(
      tournament,
      own.filter((m) => m.matchday <= day),
      groupId
    ).forEach(({ club, position, points }) => {
      const row = rows.get(club.id);
      row?.positions.push(position);
      row?.points.push(points);
    });
  }

  return { matchdays, lastPlayed, rows: [...rows.values()] };
};

/** Goals in a simulated match: mostly 0 to 2, now and then more. */
const GOAL_WEIGHTS = [26, 32, 22, 12, 6, 2];

const randomGoals = (random: () => number) => {
  let roll = random() * GOAL_WEIGHTS.reduce((sum, w) => sum + w, 0);
  for (let goals = 0; goals < GOAL_WEIGHTS.length; goals += 1) {
    roll -= GOAL_WEIGHTS[goals];
    if (roll < 0) return goals;
  }
  return 0;
};

/**
 * The matches with a random score for every unplayed group match, for a
 * preview of how the table could move. Nothing of this is stored.
 */
export const simulateResults = (
  matches: IMatch[],
  random: () => number = Math.random
): IMatch[] =>
  matches.map((match) =>
    match.stage === "group" && match.result === null
      ? {
          ...match,
          result: { home: randomGoals(random), away: randomGoals(random) },
        }
      : match
  );

/** Small seeded generator, so "Ще раз" gives a new but repeatable season. */
export const seededRandom = (seed: number): (() => number) => {
  let state = seed >>> 0 || 1;
  return () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return (state >>> 0) / 4294967296;
  };
};
