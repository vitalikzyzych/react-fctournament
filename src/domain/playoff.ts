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
  /** Only in a league: the knockout round and the round of 16. */
  leagueOnly: boolean;
}

export const PLAYOFF_ROUNDS: IPlayoffRoundInfo[] = [
  { id: "KO", name: "Стикові матчі", ties: 8, legs: 2, leagueOnly: true },
  { id: "R16", name: "1/8 фіналу", ties: 8, legs: 2, leagueOnly: true },
  { id: "QF", name: "1/4 фіналу", ties: 4, legs: 2, leagueOnly: false },
  { id: "SF", name: "1/2 фіналу", ties: 2, legs: 2, leagueOnly: false },
  { id: "F", name: "Фінал", ties: 1, legs: 1, leagueOnly: false },
];

export const PLAYOFF_ROUND_IDS: PlayoffRound[] = PLAYOFF_ROUNDS.map(
  (round) => round.id
);

/**
 * Rounds of a format: a league plays a knockout round (places 5 to 12 of
 * each player) and the round of 16 before the quarter-finals; group
 * tournaments start at the quarter-finals.
 */
export const playoffRounds = (league: boolean): IPlayoffRoundInfo[] =>
  PLAYOFF_ROUNDS.filter((round) => league || !round.leagueOnly);

/**
 * Picker rule of a round: the two clubs must belong to different players
 * (and, in groups, come from different groups). It applies where the clubs
 * come from the table: the group quarter-finals and the league knockout
 * round. Later rounds are free, because the winners left may share a player
 * or a group.
 */
export const isStrictPairing = (round: PlayoffRound, league: boolean) =>
  league ? round === "KO" : round === "QF";

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
 * Matches that count in statistics: all of them, or the group stage only
 * when the "with playoff" switch is off. Champions, titles and playoff reach
 * always use every match.
 */
export const statMatches = (matches: IMatch[], includePlayoff: boolean) =>
  includePlayoff ? matches : groupMatches(matches);

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

/**
 * Every tie slot of the bracket, including the empty ones. The league rounds
 * (KO, R16) are included for a league, or when a game of them exists.
 */
export const computePlayoff = (
  matches: IMatch[],
  league = false
): IPlayoffTie[] => {
  const games = playoffMatches(matches);
  const withLeagueRounds =
    league ||
    games.some(
      (game) => PLAYOFF_ROUNDS.find((r) => r.id === game.round)?.leagueOnly
    );
  return playoffRounds(withLeagueRounds).flatMap(({ id, ties }) =>
    Array.from({ length: ties }, (_, index) =>
      buildTie(
        id,
        index + 1,
        games.filter((game) => game.round === id && game.tie === index + 1)
      )
    )
  );
};

export interface IEarlierGames {
  /** Played games of the tie before this one, in order. */
  games: IPlayoffMatch[];
  /** Goals over those games, from this game's home and away clubs. */
  aggregate: IScore;
}

/**
 * The played games of the same tie before a playoff game (the first leg for
 * a second leg, both legs for an extra game). Null for group matches and
 * for the first game of a tie.
 */
export const earlierTieGames = (
  match: IMatch,
  matches: IMatch[]
): IEarlierGames | null => {
  if (match.stage !== "playoff") return null;
  const games = playoffMatches(matches)
    .filter(
      (game) =>
        game.round === match.round &&
        game.tie === match.tie &&
        game.game < match.game &&
        game.result !== null
    )
    .sort((a, b) => a.game - b.game);
  if (!games.length) return null;
  return { games, aggregate: aggregateOf(match.home, games) };
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
    // A new game starts without the previous game's cards.
    cards: [],
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
 * Whether `candidate` may face `picked` in a tie of `round`. Where the rule
 * applies (isStrictPairing) the clubs must belong to different players and,
 * in groups, come from different groups. A league has one group, so there
 * only the player counts.
 */
export const canPair = (
  round: PlayoffRound,
  picked: IClub | undefined,
  candidate: IClub,
  league = false
): boolean => {
  if (!picked) return true;
  if (picked.id === candidate.id) return false;
  if (!isStrictPairing(round, league)) return true;
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
