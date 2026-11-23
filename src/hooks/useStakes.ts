import { useMemo } from "react";

import {
  computeStakes,
  type IMatch,
  type IStakes,
  type ITournament,
  seededRandom,
} from "@/domain";

/**
 * What an open group match of an active tournament means for both clubs
 * (computeStakes); null for any other match.
 */
export const useStakes = (
  tournament: ITournament,
  matches: IMatch[],
  match: IMatch | undefined
): { home: IStakes; away: IStakes } | null =>
  useMemo(
    () =>
      match && tournament.status === "active"
        ? computeStakes(tournament, matches, match, seededRandom(6))
        : null,
    [tournament, matches, match]
  );
