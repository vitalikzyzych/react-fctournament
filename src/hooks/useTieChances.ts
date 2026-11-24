import { useMemo } from "react";

import {
  computeTieChances,
  type IMatch,
  type ITieChance,
  type ITournament,
  seededRandom,
} from "@/domain";
import { useSettings } from "@/providers";

/**
 * Chance of each club to go through every open playoff tie, by tieKey, while
 * the tournament is active (empty otherwise). A fixed seed keeps the numbers
 * steady between renders.
 */
export const useTieChances = (
  tournament: ITournament | undefined,
  matches: IMatch[]
): Map<string, ITieChance> => {
  const { showChances } = useSettings().settings;
  return useMemo(
    () =>
      showChances && tournament?.status === "active"
        ? computeTieChances(matches, seededRandom(3))
        : new Map(),
    [tournament, matches, showChances]
  );
};
