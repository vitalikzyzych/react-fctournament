import { describe, expect, it } from "vitest";

import completedExample from "../../examples/tournament-completed.example.json";
import leagueExample from "../../examples/tournament-league.example.json";

import { pickKnockoutDraw, pickRound16Draw, samePlayerPairs } from "./draw";
import { leagueKnockoutClubs, playoffQualifiers } from "./league";
import { canPair, computePlayoff, newTieGames } from "./playoff";
import { seededRandom, simulateResults } from "./timeline";
import type { IClub, ITournament, ITournamentFile } from "./types";
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
const played = simulateResults(file.matches, seededRandom(5));
const byId = new Map(tournament.clubs.map((club) => [club.id, club]));
const clubs = (ids: string[]) => ids.map((id) => byId.get(id) as IClub);

describe("league playoff", () => {
  it("splits the table: 4 direct and 8 knockout clubs per player", () => {
    const direct = clubs(playoffQualifiers(tournament, played));
    const knockout = clubs(leagueKnockoutClubs(tournament, played));
    expect(direct.filter((c) => c.owner === "S")).toHaveLength(4);
    expect(knockout.filter((c) => c.owner === "V")).toHaveLength(8);
    expect(knockout.some((c) => direct.includes(c))).toBe(false);
  });

  it("draws the knockout round S against V", () => {
    const knockout = clubs(leagueKnockoutClubs(tournament, played));
    const draw = pickKnockoutDraw(knockout, seededRandom(2))!;
    expect(draw).toHaveLength(8);
    expect(samePlayerPairs(draw)).toBe(0);
    expect(new Set(draw.flat()).size).toBe(16);
  });

  it("pairs direct clubs with winners, S against V as far as possible", () => {
    const direct = clubs(playoffQualifiers(tournament, played));
    const knockout = clubs(leagueKnockoutClubs(tournament, played));
    // Six S winners and two V winners: the 4 direct S clubs can meet only
    // the 2 V winners, so at least 2 pairs share a player.
    const winners = [
      ...knockout.filter((c) => c.owner === "S").slice(0, 6),
      ...knockout.filter((c) => c.owner === "V").slice(0, 2),
    ];
    for (let seed = 1; seed < 20; seed += 1) {
      const draw = pickRound16Draw(direct, winners, seededRandom(seed))!;
      expect(draw).toHaveLength(8);
      expect(samePlayerPairs(draw)).toBe(2);
      // The winner hosts game 1, the direct club game 2.
      draw.forEach(([first, second]) => {
        expect(winners).toContain(first);
        expect(direct).toContain(second);
      });
    }
  });

  it("has the league rounds only for a league", () => {
    expect(computePlayoff([], true)).toHaveLength(8 + 8 + 4 + 2 + 1);
    expect(computePlayoff([])).toHaveLength(7);
    const ko = newTieGames("KO", 3, "a", "b");
    expect(
      computePlayoff(ko).find((t) => t.round === "KO" && t.tie === 3)?.home
    ).toBe("a");
    // The knockout round is S against V; later league rounds are free.
    const [s1, s2] = tournament.clubs.filter((c) => c.owner === "S");
    expect(canPair("KO", s1, s2, true)).toBe(false);
    expect(canPair("QF", s1, s2, true)).toBe(true);
  });

  it("refuses league rounds in a group tournament", () => {
    const raw = JSON.parse(JSON.stringify(completedExample));
    raw.matches.push(...newTieGames("KO", 1, raw.clubs[0].id, raw.clubs[1].id));
    const result = validateTournamentFile(raw, { existing: [] });
    expect(result.errors.join(" ")).toContain("лише в лізі");
  });
});
