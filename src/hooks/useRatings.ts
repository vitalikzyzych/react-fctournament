import { useMemo } from "react";

import { computeRatings, type IRatings } from "@/domain";
import { useTournamentData } from "@/providers";

/** Club ratings over every tournament, recomputed when a result changes. */
export const useRatings = (): IRatings => {
  const { all } = useTournamentData();
  return useMemo(() => computeRatings(all), [all]);
};
