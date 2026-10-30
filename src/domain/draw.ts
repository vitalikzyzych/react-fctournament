import { PLAYOFF_ROUNDS } from "./playoff";
import type { IClub, PlayoffRound } from "./types";

/** Pairs in tie order; the first club of each pair hosts game 1. */
export type PlayoffDraw = [IClub, IClub][];

export interface IDrawCandidates {
  /** Every pairing with the fewest conflicts. Empty when none is allowed. */
  draws: PlayoffDraw[];
  /**
   * Conflicts per draw: pairs of the same player plus pairs of one group (not
   * counted in a league).
   */
  conflicts: number;
}

const pairConflicts = (a: IClub, b: IClub, league: boolean): number =>
  (a.owner === b.owner ? 1 : 0) + (!league && a.group === b.group ? 1 : 0);

const drawConflicts = (draw: PlayoffDraw, league: boolean): number =>
  draw.reduce((sum, [a, b]) => sum + pairConflicts(a, b, league), 0);

/** Every way to split `clubs` into pairs (105 for 8 clubs, 3 for 4). */
const allPairings = (clubs: IClub[]): PlayoffDraw[] => {
  if (clubs.length === 0) return [[]];
  const [first, ...rest] = clubs;
  return rest.flatMap((partner, index) =>
    allPairings(rest.filter((_, other) => other !== index)).map(
      (pairs): PlayoffDraw => [[first, partner], ...pairs]
    )
  );
};

/**
 * The draws allowed for `round` with the selected clubs. In the quarter-finals
 * every pair is an S club against a V club from another group, otherwise
 * there is no draw. In later rounds the same rule is followed as far as the
 * clubs left allow. A league has one group, so only the player counts there.
 */
export const drawCandidates = (
  round: PlayoffRound,
  clubs: IClub[],
  league = false
): IDrawCandidates => {
  const info = PLAYOFF_ROUNDS.find((r) => r.id === round);
  if (!info || clubs.length !== info.ties * 2) {
    return { draws: [], conflicts: 0 };
  }
  const scored = allPairings(clubs).map((draw) => ({
    draw,
    conflicts: drawConflicts(draw, league),
  }));
  const allowed = info.strictPairing
    ? scored.filter((s) => s.conflicts === 0)
    : scored;
  if (!allowed.length) return { draws: [], conflicts: 0 };
  const fewest = Math.min(...allowed.map((s) => s.conflicts));
  return {
    draws: allowed.filter((s) => s.conflicts === fewest).map((s) => s.draw),
    conflicts: fewest,
  };
};

/** One random draw: a random pairing, tie order and home club per pair. */
export const pickDraw = (
  draws: PlayoffDraw[],
  random: () => number = Math.random
): PlayoffDraw | null => {
  if (!draws.length) return null;
  const pairs = draws[Math.floor(random() * draws.length)].map(
    ([a, b]): [IClub, IClub] => (random() < 0.5 ? [a, b] : [b, a])
  );
  for (let i = pairs.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [pairs[i], pairs[j]] = [pairs[j], pairs[i]];
  }
  return pairs;
};
