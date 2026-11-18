import { describe, expect, it } from "vitest";

import { computeAchievements, countAchievements } from "./achievements";
import {
  computeGoalsPerMatch,
  computeMilestones,
  computeRace,
  computeScoreGrid,
  computeWinsRace,
  currentStreaks,
  latestMatchdayRecap,
  playoffComebacks,
  recentDuels,
} from "./insights";
import { seededRandom } from "./timeline";
import type {
  ICard,
  IClub,
  IGroupMatch,
  IMatch,
  IPlayoffMatch,
  ITournament,
} from "./types";

const clubs: IClub[] = [
  { id: "a", name: "A", owner: "S", group: "A" },
  { id: "b", name: "B", owner: "S", group: "A" },
  { id: "x", name: "X", owner: "V", group: "A" },
  { id: "y", name: "Y", owner: "V", group: "A" },
];

const tournament: ITournament = {
  id: "t1",
  schemaVersion: 1,
  number: 1,
  name: "T",
  game: "FC",
  format: "sv-groups-4x4",
  status: "active",
  players: [
    { id: "S", name: "S" },
    { id: "V", name: "V" },
  ],
  groups: [{ id: "A", name: "Група A" }],
  clubs,
  champion: null,
};

const g = (
  matchday: number,
  home: string,
  away: string,
  score: [number, number] | null,
  cards: ICard[] = []
): IGroupMatch => ({
  id: `A${matchday}-${home}`,
  stage: "group",
  group: "A",
  matchday,
  home,
  away,
  result: score && { home: score[0], away: score[1] },
  cards,
});

const p = (
  tie: number,
  game: number,
  home: string,
  away: string,
  score: [number, number]
): IPlayoffMatch => ({
  id: `QF${tie}-${game}`,
  stage: "playoff",
  round: "QF",
  tie,
  game,
  home,
  away,
  result: { home: score[0], away: score[1] },
});

const yellow = (club: string, n: number): ICard[] =>
  Array.from({ length: n }, (_, i) => ({
    id: `${club}${i}`,
    club,
    player: `P${i}`,
    type: "yellow",
  }));

// Matchday 1: S wins both. Matchday 2: S wins both, one by 6.
// Matchday 3: a draw and a V win, x keeps a third clean sheet. Matchday 4 open.
const matches: IMatch[] = [
  g(1, "a", "x", [2, 0]),
  g(1, "b", "y", [1, 0], yellow("b", 2)),
  g(2, "x", "b", [0, 1]),
  g(2, "a", "y", [6, 0], yellow("a", 1)),
  g(3, "a", "x", [0, 0]),
  g(3, "y", "b", [4, 3]),
  g(4, "a", "y", null),
  g(4, "b", "x", null),
];

describe("form strip and streaks", () => {
  it("lists the last duels with their winners", () => {
    expect(recentDuels(clubs, matches, 3).map((d) => d.winner)).toEqual([
      "S",
      null,
      "V",
    ]);
  });

  it("counts running streaks from the last match", () => {
    expect(currentStreaks(clubs, matches)).toEqual({
      S: { wins: 0, unbeaten: 0 },
      V: { wins: 1, unbeaten: 2 },
    });
  });
});

describe("matchday recap", () => {
  it("sums up the last complete matchday", () => {
    const recap = latestMatchdayRecap(clubs, matches);
    expect(recap?.matchday).toBe(3);
    expect(recap?.wins).toEqual({ S: 0, V: 1 });
    expect(recap?.draws).toBe(1);
    expect(recap?.goals).toEqual({ S: 3, V: 4 });
    expect(recap?.biggest?.id).toBe("A3-y");
  });
});

describe("milestones", () => {
  it("finds the next round numbers and the ones reached", () => {
    const { upcoming, reached } = computeMilestones([{ tournament, matches }]);
    // 17 goals so far: the 25th is next.
    expect(upcoming.find((m) => m.id === "goals")).toMatchObject({
      value: 17,
      target: 25,
      remaining: 8,
    });
    expect(reached).toEqual([]);
    const more = computeMilestones([
      { tournament, matches: [...matches, g(4, "a", "y", [9, 0])] },
    ]);
    expect(more.reached.map((m) => m.label)).toEqual(["25-й гол в історії"]);
  });
});

describe("race, score grid and goals per match", () => {
  it("adds up S and V after every matchday", () => {
    const race = computeRace(tournament, matches);
    expect(race.map((point) => point.label)).toEqual(["Т1", "Т2", "Т3"]);
    expect(race.map((point) => point.records.S.won)).toEqual([2, 4, 4]);
  });

  it("counts scores with the winner first", () => {
    const grid = computeScoreGrid(matches);
    expect(grid.counts[1][0]).toBe(2);
    expect(grid.counts[4][3]).toBe(1);
    expect(grid.counts[6][0]).toBe(1);
    expect(grid.total).toBe(6);
  });

  it("counts matches by their total goals", () => {
    const goals = computeGoalsPerMatch(matches);
    expect(goals.counts.slice(0, 8)).toEqual([1, 2, 1, 0, 0, 0, 1, 1]);
    expect(goals.most?.id).toBe("A3-y");
  });
});

describe("wins race", () => {
  it("is null once the group stage is over and sums to one", () => {
    const race = computeWinsRace(tournament, matches, seededRandom(1), 200);
    expect(race).not.toBeNull();
    expect((race?.S ?? 0) + (race?.V ?? 0) + (race?.level ?? 0)).toBeCloseTo(1);
    // S leads 4 to 1 with two matches left: V cannot catch up.
    expect(race?.S).toBe(1);
    const done = matches.map((m) =>
      m.result ? m : { ...m, result: { home: 1, away: 1 } }
    );
    expect(computeWinsRace(tournament, done, seededRandom(1))).toBeNull();
  });
});

describe("achievements", () => {
  it("finds routs, walls, perfect days and comebacks", () => {
    const list = computeAchievements(tournament, [
      ...matches,
      p(1, 1, "a", "x", [2, 0]),
      p(1, 2, "x", "a", [3, 0]),
    ]);
    const types = list.map((a) => `${a.type}:${a.club?.id ?? a.player}`);
    expect(types).toContain("rout:a");
    // 4:3 is not a goal fest any more; 6:4 is.
    expect(types.some((t) => t.startsWith("goalFest"))).toBe(false);
    expect(
      computeAchievements(tournament, [g(1, "a", "x", [6, 4])]).map(
        (a) => `${a.type}:${a.club?.id}`
      )
    ).toContain("goalFest:a");
    expect(types).toContain("perfectDay:S");
    expect(types).toContain("comeback:x");
    expect(types.filter((t) => t === "perfectDay:S")).toHaveLength(2);
    expect(
      playoffComebacks([p(1, 1, "a", "x", [2, 0]), p(1, 2, "x", "a", [3, 0])])
    ).toHaveLength(1);
  });

  it("gives unbeaten and fair play once the group stage is over", () => {
    const done = matches.map((m) =>
      m.result ? m : { ...m, result: { home: 0, away: 0 } }
    );
    const list = computeAchievements(tournament, done);
    // At most one goal conceded: a 4 times, b and x 3 times, y twice.
    const walls = list.filter((a) => a.type === "wall").map((a) => a.club?.id);
    expect(walls.filter((id) => id === "a")).toHaveLength(4);
    expect(walls).toHaveLength(12);
    expect(list.find((a) => a.type === "fairPlay")?.player).toBe("V");
    expect(
      list.filter((a) => a.type === "unbeaten").map((a) => a.club?.id)
    ).toEqual(["a"]);
    const totals = countAchievements([{ tournament, matches: done }]);
    expect(totals.fairPlay).toEqual({ S: 0, V: 1 });
  });
});
