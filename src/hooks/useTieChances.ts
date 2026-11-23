import { useMemo } from "react";

import {
  computeTieChances,
  type IMatch,
  type ITieChance,
  type ITournament,
  seededRandom,
} from "@/domain";

/**
 * Chance of each club to go through every open playoff tie, by tieKey, while
 * the tournament is active (empty otherwise). A fixed seed keeps the numbers
 * steady between renders.
 */
export const useTieChances = (
  tournament: ITournament | undefined,
  matches: IMatch[]
): Map<string, ITieChance> =>
  useMemo(
    () =>
      tournament?.status === "active"
        ? computeTieChances(matches, seededRandom(3))
        : new Map(),
    [tournament, matches]
  );
