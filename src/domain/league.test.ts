import { describe, expect, it } from "vitest";

import leagueExample from "../../examples/tournament-league.example.json";

import { drawCandidates } from "./draw";
import { findLeagueWinner, groupTable, playoffQualifiers } from "./league";
import { canPair } from "./playoff";
import type { IGroupMatch, ITournament, ITournamentFile } from "./types";
import { validateTournamentFile } from "./validation";

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value));
const noExisting = { existing: [] };

const parse = (raw: unknown): ITournamentFile => {
  const report = validateTournamentFile(raw, noExisting);
  if (!report.file) throw new Error(report.errors.join("\n"));
  return report.file;
};

const toTournament = (file: ITournamentFile): ITournament => ({
  ...file.tournament,
  champion: null,
  schemaVersion: file.schemaVersion,
  players: file.players,
  groups: file.groups,
  clubs: file.clubs,
});

/** Every match won by the home club, by 2 goals when it belongs to S. */
const playAll = (file: ITournamentFile): IGroupMatch[] => {
  const ownerOf = new Map(file.clubs.map((club) => [club.id, club.owner]));
  return file.matches
    .filter((match) => match.stage === "group")
    .map((match) => ({
      ...match,
      result: { home: ownerOf.get(match.home) === "S" ? 2 : 1, away: 0 },
    }));
};

describe("sv-league-40", () => {
  it("accepts the example league file", () => {
    const file = parse(leagueExample);
    expect(file.clubs).toHaveLength(40);
    expect(file.matches).toHaveLength(160);
  });

  it("refuses broken league rules", () => {
    const sameOwner = clone(leagueExample);
    const s = sameOwner.clubs.filter((club) => club.owner === "S");
    sameOwner.matches[0].away =
      s.find((club) => club.id !== sameOwner.matches[0].home)?.id ?? "";
    const errors = validateTournamentFile(sameOwner, noExisting).errors;
    expect(errors.some((e) => e.includes("клуби одного гравця"))).toBe(true);
    expect(errors.some((e) => e.includes("грає 2 раз"))).toBe(true);

    const noPot = clone(leagueExample);
    delete (noPot.clubs[0] as { pot?: number }).pot;
    expect(
      validateTournamentFile(noPot, noExisting).errors.some((e) =>
        e.includes("потрібен pot")
      )
    ).toBe(true);

    const short = clone(leagueExample);
    short.matches = short.matches.slice(0, 150);
    expect(
      validateTournamentFile(short, noExisting).errors.some((e) =>
        e.includes("Потрібно 160 матчів")
      )
    ).toBe(true);
  });

  it("has a league winner only once every league match is played", () => {
    const file = parse(leagueExample);
    const tournament = toTournament(file);
    expect(findLeagueWinner(tournament, file.matches)).toBeNull();

    const played = playAll(file);
    const winner = findLeagueWinner(tournament, played);
    expect(winner?.id).toBe(groupTable(tournament, played, "L")[0].club.id);
    const oneLeft = [{ ...played[0], result: null }, ...played.slice(1)];
    expect(findLeagueWinner(tournament, oneLeft)).toBeNull();
  });

  it("suggests the 4 best S and the 4 best V clubs for the playoff", () => {
    const file = parse(leagueExample);
    const tournament = toTournament(file);
    const played = playAll(file);
    const ids = playoffQualifiers(tournament, played);
    const rows = groupTable(tournament, played, "L");
    const best = (owner: "S" | "V") =>
      rows
        .filter((row) => row.club.owner === owner)
        .slice(0, 4)
        .map((row) => row.club.id);
    expect(ids).toEqual([...best("S"), ...best("V")]);
  });

  it("pairs S with V in the quarter-finals without the group rule", () => {
    const file = parse(leagueExample);
    const tournament = toTournament(file);
    const ids = playoffQualifiers(tournament, playAll(file));
    const clubs = file.clubs.filter((club) => ids.includes(club.id));
    const [s1, , , , v1] = clubs.sort((a, b) => a.owner.localeCompare(b.owner));
    expect(canPair("QF", s1, v1, true)).toBe(true);
    expect(canPair("QF", s1, v1)).toBe(false);

    // 4! ways to pair 4 S clubs with 4 V clubs.
    expect(drawCandidates("QF", clubs, true).draws).toHaveLength(24);
    expect(drawCandidates("QF", clubs).draws).toHaveLength(0);
  });
});
