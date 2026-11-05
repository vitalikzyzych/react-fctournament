import { describe, expect, it } from "vitest";

import completedExample from "../../examples/tournament-completed.example.json";
import newExample from "../../examples/tournament-new.example.json";

import { toTournamentFile } from "./exportJson";
import {
  computeClubHistories,
  computeHeadToHead,
  countTitles,
  findChampionClub,
  summarizeTournament,
} from "./history";
import {
  canPair,
  computePlayoff,
  describeMatch,
  findChampion,
  groupMatches,
  newTieGames,
  pendingReplay,
  staleExtraGames,
} from "./playoff";
import { computeStandings } from "./standings";
import { computePlayerRecords, computeTournamentStats } from "./stats";
import type { IClub, IMatch, ITournament, ITournamentFile } from "./types";
import { validateTournamentFile } from "./validation";

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value));
const noExisting = { existing: [] };

const toTournament = (file: ITournamentFile): ITournament => ({
  ...file.tournament,
  champion: file.tournament.champion ?? null,
  schemaVersion: file.schemaVersion,
  players: file.players,
  groups: file.groups,
  clubs: file.clubs,
});

describe("validateTournamentFile", () => {
  it("accepts both example files", () => {
    const fresh = validateTournamentFile(newExample, noExisting);
    expect(fresh.errors).toEqual([]);
    expect(fresh.file?.matches).toHaveLength(32);

    // 32 group matches, 13 playoff legs (two per QF and SF tie, one final)
    // and one extra game after a level quarter-final.
    const completed = validateTournamentFile(completedExample, noExisting);
    expect(completed.errors).toEqual([]);
    expect(completed.file?.matches).toHaveLength(46);
  });

  it("reads a missing result as not played", () => {
    const raw = clone(newExample) as { matches: Record<string, unknown>[] };
    delete raw.matches[0].result;
    expect(
      validateTournamentFile(raw, noExisting).file?.matches[0].result
    ).toBeNull();
  });

  it("rejects a match between clubs of the same player", () => {
    const raw = clone(newExample);
    // real-madrid and bayern-munich both belong to S in group A.
    raw.matches[0].away = "bayern-munich";
    const report = validateTournamentFile(raw, noExisting);
    expect(report.file).toBeNull();
    expect(report.errors.some((e) => e.includes("одного гравця"))).toBe(true);
  });

  it("rejects unknown club references and bad scores", () => {
    const raw = clone(completedExample);
    raw.matches[1].home = "unknown-club";
    expect(validateTournamentFile(raw, noExisting).errors.join()).toContain(
      "unknown-club"
    );

    const negative = clone(completedExample);
    negative.matches[0].result = { home: -1, away: 0 };
    expect(validateTournamentFile(negative, noExisting).errors[0]).toContain(
      "matches[0]"
    );
  });

  it("requires every result in a completed tournament", () => {
    const raw = clone(completedExample) as { matches: { result: unknown }[] };
    raw.matches[5].result = null;
    expect(validateTournamentFile(raw, noExisting).errors.join()).toContain(
      "без результату"
    );
  });

  it("blocks a duplicate tournament id and warns about club id drift", () => {
    const existing = toTournament(
      validateTournamentFile(completedExample, noExisting).file!
    );
    const renamed = clone(newExample);
    renamed.clubs[0].id = "real-madrid-cf";
    renamed.matches = renamed.matches.map((m) => ({
      ...m,
      home: m.home === "real-madrid" ? "real-madrid-cf" : m.home,
      away: m.away === "real-madrid" ? "real-madrid-cf" : m.away,
    }));
    const report = validateTournamentFile(renamed, { existing: [existing] });
    expect(report.errors).toEqual([]);
    expect(report.warnings.join()).toContain('"real-madrid"');

    const duplicate = validateTournamentFile(completedExample, {
      existing: [existing],
    });
    expect(duplicate.errors.join()).toContain("вже існує");
  });
});

const club = (id: string, owner: "S" | "V"): IClub => ({
  id,
  name: id,
  owner,
  group: "A",
});
const match = (
  home: string,
  away: string,
  h: number | null,
  a = 0
): IMatch => ({
  id: `${home}-${away}`,
  stage: "group",
  group: "A",
  matchday: 1,
  home,
  away,
  result: h === null ? null : { home: h, away: a },
});

describe("computeStandings", () => {
  const clubs = [
    club("s1", "S"),
    club("s2", "S"),
    club("v1", "V"),
    club("v2", "V"),
  ];

  it("counts 0:0 as a played draw and skips unplayed matches", () => {
    const rows = computeStandings(clubs, [
      match("s1", "v1", 0, 0),
      match("s2", "v2", null),
    ]);
    const s1 = rows.find((r) => r.club.id === "s1")!;
    expect(s1).toMatchObject({ played: 1, drawn: 1, points: 1 });
    expect(rows.find((r) => r.club.id === "s2")!.played).toBe(0);
  });

  it("orders by points, then goal difference, then head-to-head", () => {
    // s1 and v1 finish on 3 points with goal difference 0; v1 won their meeting.
    const rows = computeStandings(clubs, [
      match("s1", "v2", 2, 0), // s1 +2
      match("v1", "s1", 2, 0), // v1 beats s1, s1 back to 0
      match("v1", "s2", 0, 2), // v1 back to 0
    ]);
    const order = rows.map((r) => r.club.id);
    expect(order.indexOf("s2")).toBe(0);
    expect(order.indexOf("v1")).toBeLessThan(order.indexOf("s1"));
  });
});

describe("statistics", () => {
  const file = validateTournamentFile(completedExample, noExisting).file!;
  const tournament = toTournament(file);

  it("S and V records mirror each other", () => {
    const { S, V } = computePlayerRecords(file.clubs, file.matches);
    // 32 group matches plus the 12 playoff games between an S and a V club.
    expect(S.played).toBe(44);
    expect(S.won).toBe(V.lost);
    expect(S.goalsFor).toBe(V.goalsAgainst);
  });

  it("tournament totals add up", () => {
    const stats = computeTournamentStats(file.clubs, file.matches);
    const goals = file.matches.reduce(
      (s, m) => s + m.result!.home + m.result!.away,
      0
    );
    expect(stats.totalGoals).toBe(goals);
    expect(stats.playedMatches).toBe(46);
  });

  it("club history follows ownership per tournament", () => {
    const second: ITournament = {
      ...tournament,
      id: "t2",
      number: 2,
      clubs: tournament.clubs.map((c) => ({
        ...c,
        owner: c.owner === "S" ? "V" : "S",
      })),
    };
    const list = [
      { tournament, matches: file.matches },
      { tournament: second, matches: file.matches },
    ];
    const madrid = computeClubHistories(list).find(
      (h) => h.clubId === "real-madrid"
    )!;
    expect(madrid.entries).toHaveLength(2);
    expect(madrid.timesByPlayer).toEqual({ S: 1, V: 1 });
    // Every match of the club in each tournament, and only those.
    madrid.entries.forEach((entry) => {
      expect(entry.matches.length).toBeGreaterThanOrEqual(4);
      entry.matches.forEach((m) =>
        expect([m.home, m.away]).toContain("real-madrid")
      );
    });

    const h2h = computeHeadToHead(list, "real-madrid", "arsenal");
    expect(h2h.matches).toHaveLength(4);
    expect(h2h.tournamentCount).toBe(2);
  });

  it("leaves the playoff out on request, but not the champion", () => {
    const list = [{ tournament, matches: file.matches }];
    const groupOnly = computeClubHistories(list, false);
    const champion = findChampionClub(tournament, file.matches)!;
    const history = groupOnly.find((h) => h.clubId === champion.id)!;
    expect(history.entries[0].matches.every((m) => m.stage === "group")).toBe(
      true
    );
    expect(history.entries[0].playoff).toBe("champion");
    expect(history.titles).toBe(1);
    // 32 group matches, all between an S and a V club.
    expect(summarizeTournament(list[0], false).players.S.played).toBe(32);
    expect(summarizeTournament(list[0], false).champion?.id).toBe(champion.id);
  });

  it("export round-trips through validation", () => {
    const exported = toTournamentFile(tournament, file.matches);
    expect(validateTournamentFile(exported, noExisting).errors).toEqual([]);
    expect(exported).toEqual(file);
  });
});

describe("playoff", () => {
  const file = validateTournamentFile(completedExample, noExisting).file!;
  const tournament = toTournament(file);
  type RawMatch = Record<string, unknown> & { id: string; result: unknown };
  const playoffIndex = (raw: { matches: RawMatch[] }, id: string) =>
    raw.matches.findIndex((m) => m.id === id);

  it("decides a drawn tie by its replay and finds the champion", () => {
    const ties = computePlayoff(file.matches);
    expect(ties).toHaveLength(7);
    const qf2 = ties.find((t) => t.round === "QF" && t.tie === 2)!;
    expect(qf2.games.map((g) => g.game)).toEqual([1, 2, 3]);
    // 2:2 and 1:1 (away) make 3:3, the extra game decides.
    expect(qf2.aggregate).toEqual({ home: 4, away: 3 });
    expect(qf2.winner).toBe("manchester-city");
    expect(findChampion(file.matches)).toBe("paris-saint-germain");
    expect(pendingReplay(qf2)).toBeNull();
  });

  it("creates two legs with home and away swapped, and one final", () => {
    expect(
      newTieGames("QF", 2, "a", "b").map((g) => [g.id, g.home, g.away])
    ).toEqual([
      ["QF2-1", "a", "b"],
      ["QF2-2", "b", "a"],
    ]);
    expect(newTieGames("SF", 1, "a", "b")).toHaveLength(2);
    expect(newTieGames("F", 1, "a", "b").map((g) => g.id)).toEqual(["F1-1"]);
  });

  it("decides two legs on aggregate and adds a replay when level", () => {
    const [leg1, leg2] = newTieGames("SF", 1, "a", "b");
    const tieWith = (r1: IMatch["result"], r2: IMatch["result"]) =>
      computePlayoff([
        { ...leg1, result: r1 },
        { ...leg2, result: r2 },
      ]).find((t) => t.round === "SF" && t.tie === 1)!;

    // A drawn first leg is no reason for a replay: leg 2 is still to come.
    const afterLeg1 = tieWith({ home: 1, away: 1 }, null);
    expect(afterLeg1.winner).toBeNull();
    expect(pendingReplay(afterLeg1)).toBeNull();

    // a 2:1 at home, then b 1:0 at home: 2:2 on aggregate.
    const level = tieWith({ home: 2, away: 1 }, { home: 1, away: 0 });
    expect(level.aggregate).toEqual({ home: 2, away: 2 });
    expect(level.winner).toBeNull();
    expect(pendingReplay(level)).toMatchObject({
      id: "SF1-3",
      game: 3,
      home: "a",
      away: "b",
    });

    const won = tieWith({ home: 2, away: 1 }, { home: 3, away: 0 });
    expect(won.winner).toBe("b");
    expect(pendingReplay(won)).toBeNull();
  });

  it("replays a drawn final at the other club", () => {
    const [final] = newTieGames("F", 1, "a", "b");
    const tie = computePlayoff([
      { ...final, result: { home: 0, away: 0 } },
    ]).find((t) => t.round === "F")!;
    expect(pendingReplay(tie)).toMatchObject({
      id: "F1-2",
      home: "b",
      away: "a",
    });
    expect(describeMatch(pendingReplay(tie)!)).toBe("Фінал · перегравання");
  });

  it("drops extra games once a corrected leg decides the tie", () => {
    const qf2 = computePlayoff(file.matches).find(
      (t) => t.round === "QF" && t.tie === 2
    )!;
    expect(
      staleExtraGames(qf2, "QF2-1", { home: 3, away: 2 }).map((g) => g.id)
    ).toEqual(["QF2-3"]);
    // Still level after the change: the extra game stays.
    expect(staleExtraGames(qf2, "QF2-1", { home: 1, away: 1 })).toEqual([]);
    // Clearing a leg leaves nothing for the extra game to decide.
    expect(staleExtraGames(qf2, "QF2-2", null).map((g) => g.id)).toEqual([
      "QF2-3",
    ]);
  });

  it("pairs quarter-final clubs only across players and groups", () => {
    const club = (id: string, owner: "S" | "V", group: string): IClub => ({
      id,
      name: id,
      owner,
      group,
    });
    const barcelona = club("barcelona", "V", "A");
    expect(canPair("QF", barcelona, club("x", "S", "B"))).toBe(true);
    expect(canPair("QF", barcelona, club("x", "S", "A"))).toBe(false);
    expect(canPair("QF", barcelona, club("x", "V", "B"))).toBe(false);
    expect(canPair("QF", barcelona, barcelona)).toBe(false);
    expect(canPair("QF", undefined, barcelona)).toBe(true);
    // Later rounds are free: the winners left may share a player or group.
    expect(canPair("SF", barcelona, club("x", "V", "A"))).toBe(true);
  });

  it("keeps group tables free of playoff games", () => {
    const groupOnly = groupMatches(file.matches);
    const clubsA = file.clubs.filter((c) => c.group === "A");
    const inA = groupOnly.filter((m) => m.group === "A");
    expect(computeStandings(clubsA, inA)[0].played).toBe(4);
  });

  it("counts playoff games, reach and titles in club history", () => {
    const histories = computeClubHistories([
      { tournament, matches: file.matches },
    ]);
    const psg = histories.find((h) => h.clubId === "paris-saint-germain")!;
    expect(psg.titles).toBe(1);
    expect(psg.entries[0].playoff).toBe("champion");
    // 4 group matches, two legs in QF and SF, and the final.
    expect(psg.total.played).toBe(9);
    const madrid = histories.find((h) => h.clubId === "real-madrid")!;
    expect(madrid.entries[0].playoff).toBe("SF");
    expect(
      histories.find((h) => h.clubId === "arsenal")!.entries[0].playoff
    ).toBeNull();
  });

  it("rejects an extra game after a decided aggregate", () => {
    const raw = clone(completedExample) as { matches: RawMatch[] };
    raw.matches[playoffIndex(raw, "QF2-1")].result = { home: 3, away: 2 };
    expect(validateTournamentFile(raw, noExisting).errors.join()).toContain(
      "рівного рахунку за сумою"
    );
  });

  it("accepts older files with single-game ties and same-home replays", () => {
    const raw = clone(completedExample) as { matches: RawMatch[] };
    // QF1 as one game, QF2 game 2 with the same home club as game 1.
    raw.matches.splice(playoffIndex(raw, "QF1-2"), 1);
    const qf22 = raw.matches[playoffIndex(raw, "QF2-2")];
    qf22.home = "manchester-city";
    qf22.away = "inter";
    qf22.result = { home: 1, away: 1 };
    expect(validateTournamentFile(raw, noExisting).errors).toEqual([]);
  });

  it("rejects playoff ids that do not match round, tie and game", () => {
    const raw = clone(completedExample) as { matches: RawMatch[] };
    raw.matches[playoffIndex(raw, "F1-1")].id = "final";
    expect(validateTournamentFile(raw, noExisting).errors.join()).toContain(
      '"F1-1"'
    );
  });

  it("uses a hand-picked champion only while the final is undecided", () => {
    const withoutFinal = file.matches.filter((m) => m.id !== "F1-1");
    const picked = { ...tournament, champion: "liverpool" };
    expect(findChampionClub(picked, withoutFinal)?.id).toBe("liverpool");
    expect(findChampionClub(tournament, withoutFinal)).toBeNull();
    // A decided final wins over the hand-picked club.
    expect(findChampionClub(picked, file.matches)?.id).toBe(
      "paris-saint-germain"
    );

    const list = [{ tournament: picked, matches: withoutFinal }];
    expect(countTitles(list)).toEqual({ S: 1, V: 0 });

    // A tournament in progress shows its champion but wins no title yet.
    const active = [
      {
        tournament: { ...picked, status: "active" as const },
        matches: withoutFinal,
      },
    ];
    expect(countTitles(active)).toEqual({ S: 0, V: 0 });
    expect(
      computeClubHistories(active).find((h) => h.clubId === "liverpool")!.titles
    ).toBe(0);
    const liverpool = computeClubHistories(list).find(
      (h) => h.clubId === "liverpool"
    )!;
    expect(liverpool.titles).toBe(1);
    expect(liverpool.entries[0].playoff).toBe("champion");
  });

  it("checks an imported champion against the clubs and the final", () => {
    const unknown = clone(completedExample) as {
      tournament: Record<string, unknown>;
    };
    unknown.tournament.champion = "unknown-club";
    expect(validateTournamentFile(unknown, noExisting).errors.join()).toContain(
      "tournament.champion"
    );

    const differs = clone(completedExample) as {
      tournament: Record<string, unknown>;
    };
    differs.tournament.champion = "liverpool";
    const report = validateTournamentFile(differs, noExisting);
    expect(report.errors).toEqual([]);
    expect(report.warnings.join()).toContain("переможцем фіналу");
  });

  it("rejects a club in two ties of one round", () => {
    const raw = clone(completedExample) as { matches: RawMatch[] };
    raw.matches[playoffIndex(raw, "QF4-1")].home = "real-madrid";
    expect(validateTournamentFile(raw, noExisting).errors.join()).toContain(
      "у двох парах"
    );
  });
});
