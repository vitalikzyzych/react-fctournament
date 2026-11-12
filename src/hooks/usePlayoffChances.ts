import { useMemo } from "react";

import {
  computePlayoffChances,
  type IMatch,
  type ITournament,
  seededRandom,
} from "@/domain";

/**
 * Playoff chance per club id while a tournament is active and its group
 * stage is under way (at least one result, at least one match left); null
 * otherwise. A fixed seed keeps the numbers steady between renders.
 */
export const usePlayoffChances = (
  tournament: ITournament | undefined,
  matches: IMatch[]
): Map<string, number> | null =>
  useMemo(() => {
    if (tournament?.status !== "active") return null;
    const started = matches.some(
      (match) => match.stage === "group" && match.result !== null
    );
    return started
      ? computePlayoffChances(tournament, matches, seededRandom(1))
      : null;
  }, [tournament, matches]);
