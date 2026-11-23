import { playoffQualifiers } from "./league";
import { groupMatches } from "./playoff";
import { clubStrengths, simulateByStrength } from "./tieChances";
import type { IMatch, ITournament } from "./types";

/** Simulated seasons behind the playoff chances. */
export const CHANCE_RUNS = 1000;

/**
 * Chance of every club to reach a playoff place (the 4 best S and V clubs of
 * a league, the first two of a group): the share of simulated seasons in
 * which it does. Every unplayed group match gets a score drawn from both
 * clubs' strengths (goals scored and conceded so far in this tournament, see
 * clubStrengths), so a club in form is likelier to win than one out of it.
 * Null once every group match is played.
 */
export const computePlayoffChances = (
  tournament: ITournament,
  matches: IMatch[],
  random: () => number,
  runs = CHANCE_RUNS
): Map<string, number> | null => {
  const group = groupMatches(matches);
  if (!group.some((match) => match.result === null)) return null;
  const strengths = clubStrengths(matches);
  const counts = new Map<string, number>(
    tournament.clubs.map((club) => [club.id, 0])
  );
  for (let run = 0; run < runs; run += 1) {
    playoffQualifiers(
      tournament,
      simulateByStrength(group, strengths, random)
    ).forEach((id) => counts.set(id, (counts.get(id) ?? 0) + 1));
  }
  return new Map(
    [...counts].map(([id, count]): [string, number] => [id, count / runs])
  );
};

export interface IStakes {
  /** Playoff chance of the club after a win, a draw and a loss. */
  win: number;
  draw: number;
  loss: number;
}

/** Simulated rests of the group stage behind each number of the stakes. */
export const STAKES_RUNS = 200;

/**
 * What a group match means for both clubs: each club's playoff chance
 * (computePlayoffChances) after a home win, a draw and an away win, taken
 * as 1:0, 1:1 and 0:1. Null for a played or a playoff match.
 */
export const computeStakes = (
  tournament: ITournament,
  matches: IMatch[],
  match: IMatch,
  random: () => number,
  runs = STAKES_RUNS
): { home: IStakes; away: IStakes } | null => {
  if (match.stage !== "group" || match.result !== null) return null;
  const after = (home: number, away: number) => {
    const changed = matches.map((m) =>
      m.id === match.id ? { ...m, result: { home, away } } : m
    );
    const chances = computePlayoffChances(tournament, changed, random, runs);
    // The last open match: the table is final, so the places are certain.
    const places = chances ? null : playoffQualifiers(tournament, changed);
    return (clubId: string) =>
      chances ? (chances.get(clubId) ?? 0) : places?.includes(clubId) ? 1 : 0;
  };
  const homeWin = after(1, 0);
  const draw = after(1, 1);
  const awayWin = after(0, 1);
  return {
    home: {
      win: homeWin(match.home),
      draw: draw(match.home),
      loss: awayWin(match.home),
    },
    away: {
      win: awayWin(match.away),
      draw: draw(match.away),
      loss: homeWin(match.away),
    },
  };
};
