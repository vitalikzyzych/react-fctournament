import { describe, expect, it } from "vitest";

import leagueExample from "../../examples/tournament-league.example.json";

import { computeTimeline, seededRandom, simulateResults } from "./timeline";
import type { IMatch, ITournament, ITournamentFile } from "./types";
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

describe("league timeline", () => {
  it("starts in draw order and has a place for every matchday", () => {
    const timeline = computeTimeline(tournament, file.matches, "L");
    expect(timeline.matchdays).toBe(8);
    expect(timeline.lastPlayed).toBe(0);
    expect(timeline.rows).toHaveLength(40);
    expect(timeline.rows[0].club.code).toBe("1S-1");
    expect(timeline.rows[5].club.code).toBe("1V-1");
    timeline.rows.forEach((row) => {
      expect(row.positions).toHaveLength(9);
      expect(row.points).toHaveLength(9);
    });
  });

  it("follows the results matchday by matchday", () => {
    const played: IMatch[] = simulateResults(file.matches, seededRandom(7));
    expect(played.every((m) => m.result !== null)).toBe(true);
    // The same seed gives the same season.
    expect(simulateResults(file.matches, seededRandom(7))).toEqual(played);

    const timeline = computeTimeline(tournament, played, "L");
    expect(timeline.lastPlayed).toBe(8);
    for (let day = 1; day <= 8; day += 1) {
      const places = timeline.rows
        .map((row) => row.positions[day])
        .sort((a, b) => a - b);
      expect(places).toEqual(Array.from({ length: 40 }, (_, i) => i + 1));
    }
    // Points never go down.
    timeline.rows.forEach((row) =>
      row.points
        .slice(1)
        .forEach((p, i) => expect(p).toBeGreaterThanOrEqual(row.points[i]))
    );
  });
});
