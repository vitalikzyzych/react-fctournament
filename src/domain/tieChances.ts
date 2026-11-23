import { computePlayoff, type IPlayoffTie, MAX_PLAYOFF_GAMES } from "./playoff";
import { isPlayed } from "./standings";
import type { IMatch } from "./types";

/** Simulated rests of a tie behind each chance. */
export const TIE_CHANCE_RUNS = 5000;

/**
 * Matches of average weight added to every club's record, so that a few
 * matches do not swing a club's rates too far from the tournament average.
 */
const PRIOR_MATCHES = 3;

/** Expected goals of one club in one game stay within these bounds. */
const MIN_GOALS = 0.2;
const MAX_GOALS = 8;

export interface IClubStrength {
  /** Goals scored per match, pulled toward the tournament average. */
  attack: number;
  /** Goals conceded per match, pulled toward the tournament average. */
  defence: number;
}

export interface IStrengths {
  clubs: Map<string, IClubStrength>;
  /** Goals per club per match over the whole tournament. */
  average: number;
}

/**
 * Every club's goals scored and conceded per match over the played matches
 * of the tournament (group stage and playoff alike).
 */
export const clubStrengths = (matches: IMatch[]): IStrengths => {
  const played = matches.filter(isPlayed);
  const totals = new Map<string, { for: number; against: number; n: number }>();
  const add = (club: string, scored: number, conceded: number) => {
    const total = totals.get(club) ?? { for: 0, against: 0, n: 0 };
    total.for += scored;
    total.against += conceded;
    total.n += 1;
    totals.set(club, total);
  };
  let goals = 0;
  played.forEach(({ home, away, result }) => {
    add(home, result.home, result.away);
    add(away, result.away, result.home);
    goals += result.home + result.away;
  });
  // Goals per club per match; a fallback before the first result.
  const average = played.length ? goals / (played.length * 2) : 1.5;
  const clubs = new Map<string, IClubStrength>();
  totals.forEach((total, club) => {
    const n = total.n + PRIOR_MATCHES;
    clubs.set(club, {
      attack: (total.for + PRIOR_MATCHES * average) / n,
      defence: (total.against + PRIOR_MATCHES * average) / n,
    });
  });
  return { clubs, average };
};

/** Expected goals of `club` against `opponent` in one game. */
export const expectedGoals = (
  strengths: IStrengths,
  club: string,
  opponent: string
) => {
  const { average } = strengths;
  const attack = strengths.clubs.get(club)?.attack ?? average;
  const defence = strengths.clubs.get(opponent)?.defence ?? average;
  const goals = average > 0 ? (attack * defence) / average : average;
  return Math.min(Math.max(goals, MIN_GOALS), MAX_GOALS);
};

/** A Poisson-distributed goal count (Knuth's method; the means are small). */
const poisson = (mean: number, random: () => number) => {
  const limit = Math.exp(-mean);
  let goals = 0;
  let product = random();
  while (product > limit) {
    goals += 1;
    product *= random();
  }
  return goals;
};

export interface ITieChance {
  /** Chance of the tie's first club (home in game 1) to go through. */
  home: number;
  away: number;
}

/**
 * Chance of each club to go through a tie that is not decided yet: the games
 * still to play are simulated with Poisson goals from both clubs' strengths
 * (expectedGoals), on top of the scores already played. A level aggregate
 * after every game adds extra games until one is won, as in the app's rules.
 * Null for a tie without both clubs or already decided.
 */
export const tieChance = (
  tie: IPlayoffTie,
  strengths: IStrengths,
  random: () => number,
  runs = TIE_CHANCE_RUNS
): ITieChance | null => {
  const { home, away } = tie;
  if (!home || !away || tie.winner || !tie.games.length) return null;
  const meanHome = expectedGoals(strengths, home, away);
  const meanAway = expectedGoals(strengths, away, home);
  const open = tie.games.filter((game) => game.result === null).length;
  const extraLimit = MAX_PLAYOFF_GAMES - tie.games.length;
  let homeWins = 0;
  for (let run = 0; run < runs; run += 1) {
    let homeGoals = tie.aggregate.home;
    let awayGoals = tie.aggregate.away;
    for (let game = 0; game < open; game += 1) {
      homeGoals += poisson(meanHome, random);
      awayGoals += poisson(meanAway, random);
    }
    let extra = 0;
    while (homeGoals === awayGoals && extra < extraLimit) {
      homeGoals += poisson(meanHome, random);
      awayGoals += poisson(meanAway, random);
      extra += 1;
    }
    if (homeGoals > awayGoals || (homeGoals === awayGoals && random() < 0.5)) {
      homeWins += 1;
    }
  }
  return { home: homeWins / runs, away: 1 - homeWins / runs };
};

/** Key of a tie in the map below: "QF1", "R168". */
export const tieKey = (tie: Pick<IPlayoffTie, "round" | "tie">) =>
  `${tie.round}${tie.tie}`;

/** Chances of every open tie of the tournament, by tieKey. */
export const computeTieChances = (
  matches: IMatch[],
  random: () => number,
  runs = TIE_CHANCE_RUNS
): Map<string, ITieChance> => {
  const strengths = clubStrengths(matches);
  const chances = new Map<string, ITieChance>();
  computePlayoff(matches).forEach((tie) => {
    const chance = tieChance(tie, strengths, random, runs);
    if (chance) chances.set(tieKey(tie), chance);
  });
  return chances;
};
