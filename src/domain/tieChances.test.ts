import { describe, expect, it } from "vitest";

import { computePlayoff } from "./playoff";
import {
  clubStrengths,
  computeTieChances,
  expectedGoals,
  tieKey,
} from "./tieChances";
import { seededRandom } from "./timeline";
import type { IGroupMatch, IMatch, IPlayoffMatch } from "./types";

const g = (
  id: string,
  home: string,
  away: string,
  score: [number, number]
): IGroupMatch => ({
  id,
  stage: "group",
  group: "A",
  matchday: 1,
  home,
  away,
  result: { home: score[0], away: score[1] },
});

const leg = (
  game: number,
  home: string,
  away: string,
  score: [number, number] | null
): IPlayoffMatch => ({
  id: `QF1-${game}`,
  stage: "playoff",
  round: "QF",
  tie: 1,
  game,
  home,
  away,
  result: score && { home: score[0], away: score[1] },
});

// "strong" scores a lot and concedes little; "weak" the other way round.
const group: IMatch[] = [
  g("1", "strong", "x", [4, 0]),
  g("2", "strong", "y", [3, 1]),
  g("3", "weak", "x", [0, 3]),
  g("4", "weak", "y", [1, 4]),
  g("5", "even", "x", [2, 2]),
  g("6", "even2", "y", [2, 2]),
];

const chanceOf = (matches: IMatch[]) =>
  computeTieChances(matches, seededRandom(1), 4000).get("QF1");

describe("tie chances", () => {
  it("rates clubs by goals per match, pulled toward the average", () => {
    const strengths = clubStrengths(group);
    expect(strengths.average).toBeCloseTo(2);
    const strong = strengths.clubs.get("strong");
    // (7 + 3 * 2) / 5 scored, (1 + 3 * 2) / 5 conceded.
    expect(strong?.attack).toBeCloseTo(2.6);
    expect(strong?.defence).toBeCloseTo(1.4);
    expect(expectedGoals(strengths, "strong", "weak")).toBeGreaterThan(
      expectedGoals(strengths, "weak", "strong")
    );
  });

  it("is about even for equal clubs before any leg", () => {
    const chance = chanceOf([
      ...group,
      leg(1, "even", "even2", null),
      leg(2, "even2", "even", null),
    ]);
    expect(chance?.home).toBeGreaterThan(0.45);
    expect(chance?.home).toBeLessThan(0.55);
    expect((chance?.home ?? 0) + (chance?.away ?? 0)).toBeCloseTo(1);
  });

  it("favours the stronger club and counts the first leg", () => {
    const before = chanceOf([
      ...group,
      leg(1, "weak", "strong", null),
      leg(2, "strong", "weak", null),
    ]);
    expect(before?.away).toBeGreaterThan(0.75);
    // The weak club won the first leg 3:0: now it leads the tie.
    const after = chanceOf([
      ...group,
      leg(1, "weak", "strong", [3, 0]),
      leg(2, "strong", "weak", null),
    ]);
    expect(after?.home).toBeGreaterThan(before?.home ?? 1);
  });

  it("skips decided ties and ties without clubs", () => {
    const decided = [
      ...group,
      leg(1, "weak", "strong", [0, 1]),
      leg(2, "strong", "weak", [2, 0]),
    ];
    expect(chanceOf(decided)).toBeUndefined();
    const [tie] = computePlayoff(decided);
    expect(tieKey(tie)).toBe("QF1");
  });
});
