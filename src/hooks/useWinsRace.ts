import { useMemo } from "react";

import {
  computeWinsRace,
  type IMatch,
  type ITournament,
  type IWinsRace,
  seededRandom,
} from "@/domain";
import { useSettings } from "@/providers";

/**
 * Chance of S or V ending the group stage with more match wins, while a
 * tournament is active and has a group match left; null otherwise. A fixed
 * seed keeps the numbers steady between renders.
 */
export const useWinsRace = (
  tournament: ITournament | undefined,
  matches: IMatch[]
): IWinsRace | null => {
  const { showChances } = useSettings().settings;
  return useMemo(
    () =>
      showChances && tournament?.status === "active"
        ? computeWinsRace(tournament, matches, seededRandom(2))
        : null,
    [tournament, matches, showChances]
  );
};
