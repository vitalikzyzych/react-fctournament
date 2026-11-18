import { describe, expect, it } from "vitest";

import { computeForm, computeNextMatches } from "./standings";
import { cardMoods, computeTournamentStats } from "./stats";
import type { ICard, IClub, IGroupMatch } from "./types";

const clubs: IClub[] = [
  { id: "real", name: "Real", owner: "S", group: "A" },
  { id: "inter", name: "Inter", owner: "V", group: "A" },
  { id: "ajax", name: "Ajax", owner: "S", group: "A" },
];

const match = (
  matchday: number,
  home: string,
  away: string,
  score: [number, number] | null,
  cards: ICard[] = []
): IGroupMatch => ({
  id: `M${matchday}-${home}`,
  stage: "group",
  group: "A",
  matchday,
  home,
  away,
  result: score && { home: score[0], away: score[1] },
  cards,
});

const matches = [
  match(
    1,
    "real",
    "inter",
    [3, 0],
    [{ id: "c1", club: "inter", player: "Barella", type: "yellow" }]
  ),
  match(
    2,
    "inter",
    "real",
    [0, 0],
    [{ id: "c2", club: "inter", player: " barella", type: "red" }]
  ),
  match(3, "real", "ajax", [2, 1]),
  match(4, "ajax", "real", [4, 1]),
  match(5, "inter", "ajax", null),
];

describe("tournament stats", () => {
  const stats = computeTournamentStats(clubs, matches);

  it("counts results and cards", () => {
    expect(stats.homeWins).toBe(3);
    expect(stats.awayWins).toBe(0);
    expect(stats.goallessDraws).toBe(1);
    expect(stats.playerCards).toEqual({
      S: { yellow: 0, red: 0 },
      V: { yellow: 1, red: 1 },
    });
    expect(stats.cardLeaders).toEqual({
      S: [],
      V: [{ club: clubs[1], player: "Barella", yellow: 1, red: 1 }],
    });
  });

  it("ranks matches and clubs", () => {
    expect(stats.highestScoring[0].id).toBe("M4-ajax");
    expect(stats.lowestScoring[0].id).toBe("M2-inter");
    expect(stats.worstAttack[0].club.id).toBe("inter");
    expect(stats.worstDefence[0].club.id).toBe("real");
    expect(stats.cleanSheets).toEqual([
      { club: clubs[0], count: 2 },
      { club: clubs[1], count: 1 },
    ]);
  });

  it("finds streaks in play order", () => {
    // Real: win, draw, win, loss.
    expect(stats.winStreaks).toEqual([]);
    expect(stats.unbeatenStreaks).toEqual([
      { club: clubs[0], count: 3, ongoing: false },
    ]);
  });
});

describe("form", () => {
  it("keeps the last results per club, oldest first", () => {
    const form = computeForm(matches, 3);
    expect(form.get("real")?.map((f) => f.outcome)).toEqual([
      "draw",
      "win",
      "loss",
    ]);
    expect(form.get("inter")?.map((f) => f.outcome)).toEqual(["loss", "draw"]);
  });

  it("finds each club's next unplayed match", () => {
    const next = computeNextMatches([
      ...matches,
      match(9, "ajax", "inter", null),
      match(8, "real", "ajax", null),
    ]);
    expect(next.get("ajax")?.matchday).toBe(5);
    expect(next.get("inter")?.matchday).toBe(5);
    expect(next.get("real")?.matchday).toBe(8);
  });
});

describe("card moods", () => {
  const count = (yellow: number, red = 0) => ({ yellow, red });
  const moods = (s: number, sRed: number, v: number, vRed: number) => {
    const result = cardMoods({ S: count(s, sRed), V: count(v, vRed) });
    return [result.S.mood, result.V.mood];
  };

  it("is polite without cards or with equal points", () => {
    expect(moods(0, 0, 0, 0)).toEqual(["polite", "polite"]);
    // A red is 3 points, as much as three yellows.
    expect(moods(3, 0, 0, 1)).toEqual(["polite", "polite"]);
  });

  it("gets angrier step by step with more points than the other", () => {
    expect(moods(1, 0, 0, 0)).toEqual(["neutral", "happy"]);
    expect(moods(3, 0, 0, 0)).toEqual(["displeased", "happy"]);
    expect(moods(2, 1, 0, 0)).toEqual(["annoyed", "angel"]);
    expect(moods(5, 1, 0, 0)).toEqual(["angry", "angel"]);
    expect(moods(6, 2, 0, 0)).toEqual(["furious", "angel"]);
    expect(cardMoods({ S: count(2, 1), V: count(0) }).S.points).toBe(5);
  });
});
