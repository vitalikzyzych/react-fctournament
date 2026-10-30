import type {
  IClub,
  IMatch,
  IPlayoffMatch,
  IScore,
  PlayoffRound,
} from "./types";

export interface IPlayoffRoundInfo {
  id: PlayoffRound;
  name: string;
  ties: number;
  /** Games created when a tie is set up: two legs, or a single final. */
  legs: number;
  /**
   * Picker rule for this round: the two clubs must belong to different
   * players and come from different groups. Later rounds are free, because
   * the winners left may all belong to one player or share a group.
   */
  strictPairing: boolean;
}

export const PLAYOFF_ROUNDS: IPlayoffRoundInfo[] = [
  { id: "QF", name: "1/4 фіналу", ties: 4, legs: 2, strictPairing: true },
  { id: "SF", name: "1/2 фіналу", ties: 2, legs: 2, strictPairing: false },
  { id: "F", name: "Фінал", ties: 1, legs: 1, strictPairing: false },
];

export const PLAYOFF_ROUND_IDS: PlayoffRound[] = PLAYOFF_ROUNDS.map(
  (round) => round.id
);

export const MAX_PLAYOFF_GAMES = 20;

const roundInfo = (round: PlayoffRound): IPlayoffRoundInfo =>
  PLAYOFF_ROUNDS.find((r) => r.id === round) ?? PLAYOFF_ROUNDS[0];

export const roundName = (round: PlayoffRound): string => roundInfo(round).name;

export const roundLegs = (round: PlayoffRound): number => roundInfo(round).legs;

/** Fixed document id of a playoff game: "QF1-1", "SF2-1", "F1-3". */
export const playoffMatchId = (
  round: PlayoffRound,
  tie: number,
  game: number
): string => `${round}${tie}-${game}`;

/** Furthest stage a club reached in the playoff. */
export type PlayoffReach = PlayoffRound | "champion";

export interface IPlayoffTie {
  round: PlayoffRound;
  tie: number;
  /** Clubs as in game 1 (home there); null until both are picked. */
  home: string | null;
  away: string | null;
  /** Legs, then extra games, in order. */
  games: IPlayoffMatch[];
  /** Goals of `home` and `away` over every played game of the tie. */
  aggregate: IScore;
  /** Set when every game is played and the aggregate is not level. */
  winner: string | null;
}

export const groupMatches = (matches: IMatch[]) =>
  matches.filter((match) => match.stage === "group");

export const playoffMatches = (matches: IMatch[]) =>
  matches.filter((match) => match.stage === "playoff");

/**
 * Home and away swap from game to game: game 1 at the first club, game 2 (the
 * second leg, or a final replay) at the second, game 3 back at the first.
 */
export const gameTeams = (
  first: string,
  second: string,
  game: number
): { home: string; away: string } =>
  game % 2 === 1
    ? { home: first, away: second }
    : { home: second, away: first };

/** The games created for a new tie: two legs in QF and SF, one final. */
export const newTieGames = (
  round: PlayoffRound,
  tie: number,
  first: string,
  second: string
): IPlayoffMatch[] =>
  Array.from({ length: roundLegs(round) }, (_, index) => {
    const game = index + 1;
    return {
      id: playoffMatchId(round, tie, game),
      stage: "playoff",
      round,
      tie,
      game,
      ...gameTeams(first, second, game),
      result: null,
    };
  });

const aggregateOf = (first: string | null, games: IPlayoffMatch[]): IScore => {
  const total = { home: 0, away: 0 };
  games.forEach(({ home, result }) => {
    if (!result) return;
    const firstIsHome = home === first;
    total.home += firstIsHome ? result.home : result.away;
    total.away += firstIsHome ? result.away : result.home;
  });
  return total;
};

const allPlayed = (games: IPlayoffMatch[]) =>
  games.length > 0 && games.every((game) => game.result !== null);

const buildTie = (
  round: PlayoffRound,
  tie: number,
  games: IPlayoffMatch[]
): IPlayoffTie => {
  const sorted = [...games].sort((a, b) => a.game - b.game);
  const home = sorted[0]?.home ?? null;
  const away = sorted[0]?.away ?? null;
  const aggregate = aggregateOf(home, sorted);
  const decided = allPlayed(sorted) && aggregate.home !== aggregate.away;
  return {
    round,
    tie,
    home,
    away,
    games: sorted,
    aggregate,
    winner: decided ? (aggregate.home > aggregate.away ? home : away) : null,
  };
};

/** Every tie slot of the bracket, including the empty ones. */
export const computePlayoff = (matches: IMatch[]): IPlayoffTie[] => {
  const games = playoffMatches(matches);
  return PLAYOFF_ROUNDS.flatMap(({ id, ties }) =>
    Array.from({ length: ties }, (_, index) =>
      buildTie(
        id,
        index + 1,
        games.filter((game) => game.round === id && game.tie === index + 1)
      )
    )
  );
};

/** Club id that won the final, or null. */
export const findChampion = (matches: IMatch[]): string | null =>
  computePlayoff(matches).find((tie) => tie.round === "F")?.winner ?? null;

/** Furthest playoff stage per club id; clubs not in the playoff are absent. */
export const computePlayoffReach = (
  matches: IMatch[]
): Map<string, PlayoffReach> => {
  const reach = new Map<string, PlayoffReach>();
  computePlayoff(matches).forEach((tie) => {
    [tie.home, tie.away].forEach((clubId) => {
      if (clubId) reach.set(clubId, tie.round);
    });
    if (tie.round === "F" && tie.winner) reach.set(tie.winner, "champion");
  });
  return reach;
};

/**
 * The extra game due when every game is played and the aggregate is level
 * (a drawn final, or two legs with equal goals). Not stored until its result
 * is saved. Null when no extra game is due.
 */
export const pendingReplay = (tie: IPlayoffTie): IPlayoffMatch | null => {
  const last = tie.games[tie.games.length - 1];
  if (!last || !tie.home || !tie.away || !allPlayed(tie.games)) return null;
  if (tie.winner || last.game >= MAX_PLAYOFF_GAMES) return null;
  const game = last.game + 1;
  return {
    ...last,
    ...gameTeams(tie.home, tie.away, game),
    id: playoffMatchId(tie.round, tie.tie, game),
    game,
    result: null,
  };
};

/**
 * Extra games that are no longer needed once `gameId` gets `result`: an
 * earlier level aggregate now has a winner, or a game was cleared. The legs
 * created with the tie are always kept.
 */
export const staleExtraGames = (
  tie: IPlayoffTie,
  gameId: string,
  result: IScore | null
): IPlayoffMatch[] => {
  const games = tie.games.map((game) =>
    game.id === gameId ? { ...game, result } : game
  );
  let keep = Math.min(roundLegs(tie.round), games.length);
  while (keep < games.length) {
    const prefix = games.slice(0, keep);
    const total = aggregateOf(tie.home, prefix);
    if (!allPlayed(prefix) || total.home !== total.away) break;
    keep += 1;
  }
  return games.slice(keep);
};

/**
 * Whether `candidate` may face `picked` in a tie of `round`. In the
 * quarter-finals the clubs must belong to different players and come from
 * different groups. A league has one group, so there only the player counts.
 */
export const canPair = (
  round: PlayoffRound,
  picked: IClub | undefined,
  candidate: IClub,
  league = false
): boolean => {
  if (!picked) return true;
  if (picked.id === candidate.id) return false;
  if (!roundInfo(round).strictPairing) return true;
  return (
    picked.owner !== candidate.owner &&
    (league || picked.group !== candidate.group)
  );
};

/** "1-й матч", "2-й матч" for legs; "Перегравання", "Перегравання 2" after. */
export const gameLabel = (match: IPlayoffMatch): string | null => {
  const legs = roundLegs(match.round);
  if (match.game <= legs) return legs > 1 ? `${match.game}-й матч` : null;
  const extra = match.game - legs;
  return extra === 1 ? "Перегравання" : `Перегравання ${extra}`;
};

/**
 * "Група A · тур 2" ("Ліга · тур 2" in a league), "1/4 фіналу · 2-й матч",
 * "Фінал · перегравання".
 */
export const describeMatch = (match: IMatch, league = false): string => {
  if (match.stage === "group") {
    return league
      ? `Ліга · тур ${match.matchday}`
      : `Група ${match.group} · тур ${match.matchday}`;
  }
  const label = gameLabel(match);
  return label
    ? `${roundName(match.round)} · ${label.toLowerCase()}`
    : roundName(match.round);
};
