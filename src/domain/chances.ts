import { playoffQualifiers } from "./league";
import { groupMatches } from "./playoff";
import { simulateResults } from "./timeline";
import type { IMatch, ITournament } from "./types";

/** Simulated seasons behind the playoff chances. */
export const CHANCE_RUNS = 1000;

/**
 * Chance of every club to reach a playoff place (the 4 best S and V clubs of
 * a league, the first two of a group): the share of simulated seasons in
 * which it does, with a random score for every unplayed group match. Clubs
 * of equal strength, so it shows what the table and the remaining schedule
 * allow, not who is better. Null once every group match is played.
 */
export const computePlayoffChances = (
  tournament: ITournament,
  matches: IMatch[],
  random: () => number,
  runs = CHANCE_RUNS
): Map<string, number> | null => {
  const group = groupMatches(matches);
  if (!group.some((match) => match.result === null)) return null;
  const counts = new Map<string, number>(
    tournament.clubs.map((club) => [club.id, 0])
  );
  for (let run = 0; run < runs; run += 1) {
    playoffQualifiers(tournament, simulateResults(group, random)).forEach(
      (id) => counts.set(id, (counts.get(id) ?? 0) + 1)
    );
  }
  return new Map(
    [...counts].map(([id, count]): [string, number] => [id, count / runs])
  );
};
