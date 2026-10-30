import { sortMatches } from "./exportJson";
import {
  computePlayoff,
  groupMatches,
  pendingReplay,
  PLAYOFF_ROUND_IDS,
} from "./playoff";
import { isPlayed } from "./standings";
import type { IMatch, IPlayoffMatch, IStoredMatch } from "./types";

/**
 * Matches still to play, in the order they are played: group matches by
 * matchday, then the playoff round by round, every first leg before the
 * second legs. A tie whose games are all played with a level aggregate
 * contributes its pending extra game (not stored until its result is saved).
 */
export const upcomingMatches = (matches: IMatch[]): IMatch[] => {
  const group = groupMatches(sortMatches(matches)).filter(
    (match) => match.result === null
  );
  const playoff: IPlayoffMatch[] = computePlayoff(matches).flatMap((tie) => {
    const open = tie.games.filter((game) => game.result === null);
    if (open.length) return open;
    const extra = pendingReplay(tie);
    return extra ? [extra] : [];
  });
  playoff.sort(
    (a, b) =>
      PLAYOFF_ROUND_IDS.indexOf(a.round) - PLAYOFF_ROUND_IDS.indexOf(b.round) ||
      a.game - b.game ||
      a.tie - b.tie
  );
  return [...group, ...playoff];
};

/** The result entered or changed last. */
export const latestResult = (matches: IStoredMatch[]): IStoredMatch | null =>
  matches
    .filter(isPlayed)
    .reduce<IStoredMatch | null>(
      (latest, match) =>
        !latest || (match.updatedAtMs ?? 0) > (latest.updatedAtMs ?? 0)
          ? match
          : latest,
      null
    );
