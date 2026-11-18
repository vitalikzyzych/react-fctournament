import { matchCards } from "./cards";
import { sortMatches } from "./exportJson";
import { groupTable } from "./league";
import { computePlayoff, groupMatches } from "./playoff";
import { type IPlayedMatch, isPlayed } from "./standings";
import {
  cardPoints,
  computePlayerRecords,
  type ICardCount,
  type PlayerRecords,
} from "./stats";
import { simulateResults } from "./timeline";
import {
  type IClub,
  type IMatch,
  type ITournament,
  type ITournamentWithMatches,
  PLAYER_IDS,
  type PlayerId,
  type PlayoffRound,
} from "./types";

type Owners = Map<string, PlayerId>;

export const ownersOf = (clubs: IClub[]): Owners =>
  new Map(clubs.map((club) => [club.id, club.owner]));

/** Played matches in play order: group matchdays, then the playoff. */
export const playedInOrder = (matches: IMatch[]): IPlayedMatch[] =>
  sortMatches(matches).filter(isPlayed);

/** Matches between an S club and a V club (all group matches, most playoff). */
const isDuel = (match: IMatch, owners: Owners) => {
  const home = owners.get(match.home);
  const away = owners.get(match.away);
  return home !== undefined && away !== undefined && home !== away;
};

/** The player whose club won, or null for a draw. */
export const matchWinner = (
  match: IPlayedMatch,
  owners: Owners
): PlayerId | null => {
  const { home, away } = match.result;
  if (home === away) return null;
  return owners.get(home > away ? match.home : match.away) ?? null;
};

export const other = (player: PlayerId): PlayerId =>
  player === "S" ? "V" : "S";

// ---------------------------------------------------------------------------
// Form strip and streaks

export interface IDuel {
  match: IPlayedMatch;
  /** null for a draw. */
  winner: PlayerId | null;
}

/** The last S against V matches in play order, oldest first. */
export const recentDuels = (
  clubs: IClub[],
  matches: IMatch[],
  count = 10
): IDuel[] => {
  const owners = ownersOf(clubs);
  return playedInOrder(matches)
    .filter((match) => isDuel(match, owners))
    .slice(-count)
    .map((match) => ({ match, winner: matchWinner(match, owners) }));
};

export interface IPlayerStreak {
  /** Wins in a row up to the last match. */
  wins: number;
  /** Matches without a loss up to the last match. */
  unbeaten: number;
}

/** Each player's running streaks at the end of the S against V matches. */
export const currentStreaks = (
  clubs: IClub[],
  matches: IMatch[]
): Record<PlayerId, IPlayerStreak> => {
  const duels = recentDuels(clubs, matches, Infinity).reverse();
  const run = (keep: (duel: IDuel) => boolean) => {
    const end = duels.findIndex((duel) => !keep(duel));
    return end === -1 ? duels.length : end;
  };
  const of = (player: PlayerId): IPlayerStreak => ({
    wins: run((duel) => duel.winner === player),
    unbeaten: run((duel) => duel.winner !== other(player)),
  });
  return { S: of("S"), V: of("V") };
};

// ---------------------------------------------------------------------------
// Matchday headline

export interface IMatchdayRecap {
  matchday: number;
  matches: IPlayedMatch[];
  wins: Record<PlayerId, number>;
  draws: number;
  goals: Record<PlayerId, number>;
  /** The biggest win of the matchday, null when every match was a draw. */
  biggest: IPlayedMatch | null;
  cards: ICardCount;
}

const margin = (match: IPlayedMatch) =>
  Math.abs(match.result.home - match.result.away);
const goalsIn = (match: IPlayedMatch) => match.result.home + match.result.away;

/** Summary of the last group matchday with every match played. */
export const latestMatchdayRecap = (
  clubs: IClub[],
  matches: IMatch[]
): IMatchdayRecap | null => {
  const owners = ownersOf(clubs);
  const group = groupMatches(sortMatches(matches));
  const days = [...new Set(group.map((m) => m.matchday))].sort((a, b) => b - a);
  const matchday = days.find((day) =>
    group.every((m) => m.matchday !== day || m.result !== null)
  );
  if (matchday === undefined) return null;
  const played = group.filter(
    (m): m is IPlayedMatch & { stage: "group" } =>
      m.matchday === matchday && isPlayed(m)
  );
  const wins = { S: 0, V: 0 };
  const goals = { S: 0, V: 0 };
  const cards = { yellow: 0, red: 0 };
  played.forEach((match) => {
    const winner = matchWinner(match, owners);
    if (winner) wins[winner] += 1;
    const home = owners.get(match.home);
    const away = owners.get(match.away);
    if (home) goals[home] += match.result.home;
    if (away) goals[away] += match.result.away;
    matchCards(match).forEach((card) => (cards[card.type] += 1));
  });
  const biggest =
    played
      .filter((match) => margin(match) > 0)
      .sort((a, b) => margin(b) - margin(a) || goalsIn(b) - goalsIn(a))[0] ??
    null;
  return {
    matchday,
    matches: played,
    wins,
    draws: played.length - wins.S - wins.V,
    goals,
    biggest,
    cards,
  };
};

// ---------------------------------------------------------------------------
// Milestones over all tournaments

export type MilestoneId =
  "goals" | "goalsS" | "goalsV" | "matches" | "winsS" | "winsV";

const MILESTONES: {
  id: MilestoneId;
  label: (n: number) => string;
  add: (match: IPlayedMatch, owners: Owners) => number;
}[] = [
  {
    id: "goals",
    label: (n) => `${n}-й гол в історії`,
    add: (match) => goalsIn(match),
  },
  ...PLAYER_IDS.map((player) => ({
    id: `goals${player}` as const,
    label: (n: number) => `${n}-й гол ${player}`,
    add: (match: IPlayedMatch, owners: Owners) =>
      (owners.get(match.home) === player ? match.result.home : 0) +
      (owners.get(match.away) === player ? match.result.away : 0),
  })),
  {
    id: "matches",
    label: (n) => `${n}-й матч S проти V`,
    add: (match, owners) => (isDuel(match, owners) ? 1 : 0),
  },
  ...PLAYER_IDS.map((player) => ({
    id: `wins${player}` as const,
    label: (n: number) => `${n}-та перемога ${player}`,
    add: (match: IPlayedMatch, owners: Owners) =>
      isDuel(match, owners) && matchWinner(match, owners) === player ? 1 : 0,
  })),
];

/** Round numbers get further apart as the count grows. */
const milestoneStep = (value: number) =>
  value < 100 ? 25 : value < 1000 ? 100 : 250;

const nextTarget = (value: number) => {
  const step = milestoneStep(value);
  return (Math.floor(value / step) + 1) * step;
};

export interface IMilestone {
  id: MilestoneId;
  /** "500-й гол S": the target, not the current count. */
  label: string;
  value: number;
  target: number;
  remaining: number;
}

export interface IReachedMilestone {
  id: MilestoneId;
  label: string;
  tournament: ITournament;
  match: IPlayedMatch;
}

export interface IMilestones {
  /** Next round number of every count, the closest first. */
  upcoming: IMilestone[];
  /** Every round number reached, in order. */
  reached: IReachedMilestone[];
}

/** Round-number milestones over every tournament, in tournament order. */
export const computeMilestones = (
  list: ITournamentWithMatches[]
): IMilestones => {
  const totals = new Map<MilestoneId, number>();
  const reached: IReachedMilestone[] = [];
  [...list]
    .sort((a, b) => a.tournament.number - b.tournament.number)
    .forEach(({ tournament, matches }) => {
      const owners = ownersOf(tournament.clubs);
      playedInOrder(matches).forEach((match) => {
        MILESTONES.forEach(({ id, label, add }) => {
          const before = totals.get(id) ?? 0;
          const after = before + add(match, owners);
          for (let t = nextTarget(before); t <= after; t = nextTarget(t)) {
            reached.push({ id, label: label(t), tournament, match });
          }
          totals.set(id, after);
        });
      });
    });
  const upcoming = MILESTONES.map(({ id, label }) => {
    const value = totals.get(id) ?? 0;
    const target = nextTarget(value);
    return {
      id,
      label: label(target),
      value,
      target,
      remaining: target - value,
    };
  }).sort(
    (a, b) =>
      a.remaining / milestoneStep(a.value) -
        b.remaining / milestoneStep(b.value) || a.remaining - b.remaining
  );
  return { upcoming, reached };
};

// ---------------------------------------------------------------------------
// Race of S and V through one tournament

export interface IRacePoint {
  /** "Т1" for a matchday, "1/4" for a playoff round. */
  label: string;
  /** Totals after this matchday or round, counting all before it. */
  records: PlayerRecords;
}

const ROUND_LABELS: Record<PlayoffRound, string> = {
  KO: "Стик.",
  R16: "1/8",
  QF: "1/4",
  SF: "1/2",
  F: "Фінал",
};

/** S and V totals after every played matchday, then every playoff round. */
export const computeRace = (
  tournament: ITournament,
  matches: IMatch[]
): IRacePoint[] => {
  const played = playedInOrder(matches);
  const steps: { label: string; matches: IPlayedMatch[] }[] = [];
  const days = [
    ...new Set(
      played.flatMap((m) => (m.stage === "group" ? [m.matchday] : []))
    ),
  ];
  days.forEach((day) =>
    steps.push({
      label: `Т${day}`,
      matches: played.filter((m) => m.stage === "group" && m.matchday === day),
    })
  );
  const rounds = [
    ...new Set(played.flatMap((m) => (m.stage === "playoff" ? [m.round] : []))),
  ];
  rounds.forEach((round) =>
    steps.push({
      label: ROUND_LABELS[round],
      matches: played.filter((m) => m.stage === "playoff" && m.round === round),
    })
  );
  const sofar: IPlayedMatch[] = [];
  return steps.map((step) => {
    sofar.push(...step.matches);
    return {
      label: step.label,
      records: computePlayerRecords(tournament.clubs, sofar),
    };
  });
};

// ---------------------------------------------------------------------------
// Score grid

/** Scores shown in the grid up to this many goals; more is "10+". */
export const SCORE_GRID_MAX = 10;

export interface IScoreGrid {
  /** counts[winner goals][loser goals], capped at SCORE_GRID_MAX. */
  counts: number[][];
  max: number;
  total: number;
}

/** How often each score happened, the winner's goals first (2:1 = 1:2). */
export const computeScoreGrid = (matches: IMatch[]): IScoreGrid => {
  const size = SCORE_GRID_MAX + 1;
  const counts = Array.from({ length: size }, () =>
    Array<number>(size).fill(0)
  );
  const played = matches.filter(isPlayed);
  played.forEach(({ result }) => {
    const high = Math.min(Math.max(result.home, result.away), SCORE_GRID_MAX);
    const low = Math.min(Math.min(result.home, result.away), SCORE_GRID_MAX);
    counts[high][low] += 1;
  });
  return { counts, max: Math.max(0, ...counts.flat()), total: played.length };
};

// ---------------------------------------------------------------------------
// Goals per match

/** Goals per match shown one by one up to this many; more is "12+". */
export const GOALS_CHART_MAX = 12;

export interface IGoalsPerMatch {
  /** counts[n]: matches with n goals in total, the last bucket n or more. */
  counts: number[];
  total: number;
  /** The match with the most goals. */
  most: IPlayedMatch | null;
}

/** How many matches ended with 0, 1, 2 ... goals in total. */
export const computeGoalsPerMatch = (matches: IMatch[]): IGoalsPerMatch => {
  const counts = Array<number>(GOALS_CHART_MAX + 1).fill(0);
  const played = matches.filter(isPlayed);
  played.forEach((match) => {
    counts[Math.min(goalsIn(match), GOALS_CHART_MAX)] += 1;
  });
  const most = [...played].sort((a, b) => goalsIn(b) - goalsIn(a))[0] ?? null;
  return { counts, total: played.length, most };
};

// ---------------------------------------------------------------------------
// League pots

export interface IPotRow {
  pot: number;
  clubs: number;
  played: number;
  points: number;
  /** Average place in the league table. */
  avgPosition: number;
}

export interface IPotClub {
  club: IClub;
  position: number;
  /** Places better (surprise) or worse (disappointment) than the pot. */
  gap: number;
  /** The places the club's pot takes in the table, from and to. */
  potPlaces: [number, number];
}

export interface IPotPerformance {
  pots: IPotRow[];
  /** The club furthest above the places of its pot, if any. */
  surprise: IPotClub | null;
  /** The club furthest below the places of its pot, if any. */
  disappointment: IPotClub | null;
}

/**
 * How the league pots did. A pot "owns" an equal share of the table (pot 1
 * the top 10 places of 40, pot 4 the last 10); the surprise and the
 * disappointment are measured from the middle of that share.
 */
export const computePotPerformance = (
  tournament: ITournament,
  matches: IMatch[]
): IPotPerformance | null => {
  const group = tournament.groups[0];
  if (!group || !tournament.clubs.some((club) => club.pot)) return null;
  const rows = groupTable(tournament, matches, group.id);
  if (!rows.some((row) => row.played > 0)) return null;
  const potIds = [...new Set(rows.map((row) => row.club.pot ?? 0))].sort(
    (a, b) => a - b
  );
  const share = rows.length / potIds.length;
  const expected = (pot: number) =>
    potIds.indexOf(pot) * share + (share + 1) / 2;
  const pots = potIds.map((pot) => {
    const own = rows.filter((row) => (row.club.pot ?? 0) === pot);
    return {
      pot,
      clubs: own.length,
      played: own.reduce((sum, row) => sum + row.played, 0),
      points: own.reduce((sum, row) => sum + row.points, 0),
      avgPosition: own.reduce((sum, row) => sum + row.position, 0) / own.length,
    };
  });
  const gaps = rows.map((row) => {
    const index = potIds.indexOf(row.club.pot ?? 0);
    return {
      club: row.club,
      position: row.position,
      gap: expected(row.club.pot ?? 0) - row.position,
      potPlaces: [
        Math.round(index * share + 1),
        Math.round((index + 1) * share),
      ] satisfies [number, number],
    };
  });
  const best = [...gaps].sort((a, b) => b.gap - a.gap)[0];
  const worst = [...gaps].sort((a, b) => a.gap - b.gap)[0];
  return {
    pots,
    surprise: best && best.gap > 0 ? best : null,
    disappointment:
      worst && worst.gap < 0 ? { ...worst, gap: -worst.gap } : null,
  };
};

// ---------------------------------------------------------------------------
// Who ends the group stage with more wins

export interface IWinsRace {
  S: number;
  V: number;
  /** Share of runs that end level. */
  level: number;
}

/**
 * Shares of simulated rests of the group stage (random scores, clubs of equal
 * strength) in which S or V ends with more match wins, counting every result
 * already played (the playoff too). Null when no group match is left.
 */
export const computeWinsRace = (
  tournament: ITournament,
  matches: IMatch[],
  random: () => number,
  runs = 1000
): IWinsRace | null => {
  if (!groupMatches(matches).some((m) => m.result === null)) return null;
  const tally = { S: 0, V: 0, level: 0 };
  for (let i = 0; i < runs; i += 1) {
    const { S, V } = computePlayerRecords(
      tournament.clubs,
      simulateResults(matches, random)
    );
    if (S.won > V.won) tally.S += 1;
    else if (V.won > S.won) tally.V += 1;
    else tally.level += 1;
  }
  return { S: tally.S / runs, V: tally.V / runs, level: tally.level / runs };
};

// ---------------------------------------------------------------------------
// Playoff comebacks

export interface IComeback {
  round: PlayoffRound;
  tie: number;
  winner: string;
  loser: string;
  /** Game 1, which the winner lost. */
  firstGame: IPlayedMatch;
}

/** Playoff ties won by the club that lost the first game. */
export const playoffComebacks = (matches: IMatch[]): IComeback[] =>
  computePlayoff(matches).flatMap((tie) => {
    const first = tie.games[0];
    if (!tie.winner || !first || !isPlayed(first)) return [];
    const { home, away } = first.result;
    const firstWinner =
      home > away ? first.home : away > home ? first.away : null;
    if (!firstWinner || firstWinner === tie.winner) return [];
    return [
      {
        round: tie.round,
        tie: tie.tie,
        winner: tie.winner,
        loser: firstWinner,
        firstGame: first,
      },
    ];
  });

/** Card points per player in the matches (yellow 1, red 3). */
export const playerCardPoints = (
  clubs: IClub[],
  matches: IMatch[]
): Record<PlayerId, number> => {
  const owners = ownersOf(clubs);
  const counts = { S: { yellow: 0, red: 0 }, V: { yellow: 0, red: 0 } };
  matches.flatMap(matchCards).forEach((card) => {
    const owner = owners.get(card.club);
    if (owner) counts[owner][card.type] += 1;
  });
  return { S: cardPoints(counts.S), V: cardPoints(counts.V) };
};
