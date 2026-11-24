import { useMemo } from "react";

import {
  computeTitleRace,
  type IMatch,
  type ITitleRace,
  type ITournament,
  seededRandom,
} from "@/domain";
import { useSettings } from "@/providers";

/**
 * Each club's chance to win the tournament while it is active and has no
 * champion yet; null otherwise. A fixed seed keeps the numbers steady
 * between renders.
 */
export const useTitleRace = (
  tournament: ITournament | undefined,
  matches: IMatch[]
): ITitleRace | null => {
  const { showChances } = useSettings().settings;
  return useMemo(
    () =>
      showChances && tournament?.status === "active"
        ? computeTitleRace(tournament, matches, seededRandom(4))
        : null,
    [tournament, matches, showChances]
  );
};
