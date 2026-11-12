import { describe, expect, it } from "vitest";

import leagueExample from "../../examples/tournament-league.example.json";

import { computePlayoffChances } from "./chances";
import { seededRandom, simulateResults } from "./timeline";
import type { ITournament, ITournamentFile } from "./types";
import { validateTournamentFile } from "./validation";

const file: ITournamentFile = validateTournamentFile(leagueExample, {
  existing: [],
}).file!;
const tournament: ITournament = {
  ...file.tournament,
  champion: null,
  schemaVersion: file.schemaVersion,
  players: file.players,
  groups: file.groups,
  clubs: file.clubs,
};

describe("playoff chances", () => {
  it("gives 8 places in every simulated league season", () => {
    const chances = computePlayoffChances(
      tournament,
      file.matches,
      seededRandom(1)
    )!;
    const total = [...chances.values()].reduce((sum, c) => sum + c, 0);
    expect(total).toBeCloseTo(8);
    expect(chances.size).toBe(40);
  });

  it("is null once every group match is played", () => {
    const played = simulateResults(file.matches, seededRandom(3));
    expect(computePlayoffChances(tournament, played, seededRandom(1))).toBe(
      null
    );
  });
});
