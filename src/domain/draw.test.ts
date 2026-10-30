import { describe, expect, it } from "vitest";

import { drawCandidates, pickDraw } from "./draw";
import type { IClub, PlayerId } from "./types";

const club = (id: string, owner: PlayerId, group: string): IClub => ({
  id,
  name: id,
  owner,
  group,
});

// Top S and top V club of every group.
const qualified = ["A", "B", "C", "D"].flatMap((group) => [
  club(`s-${group}`, "S", group),
  club(`v-${group}`, "V", group),
]);

describe("playoff draw", () => {
  it("pairs S with V from another group in the quarter-finals", () => {
    const { draws, conflicts } = drawCandidates("QF", qualified);
    // Derangements of 4 groups: every S club avoids the V club of its group.
    expect(draws).toHaveLength(9);
    expect(conflicts).toBe(0);
    draws.flat().forEach(([a, b]) => {
      expect(a.owner).not.toBe(b.owner);
      expect(a.group).not.toBe(b.group);
    });
  });

  it("has no quarter-final draw without four clubs of each player", () => {
    const fiveS = [...qualified.slice(0, 7), club("s-E", "S", "A")];
    expect(drawCandidates("QF", fiveS).draws).toEqual([]);
    expect(drawCandidates("QF", qualified.slice(0, 6)).draws).toEqual([]);
  });

  it("follows the rule in the semi-finals as far as the clubs allow", () => {
    const mixed = drawCandidates("SF", [
      club("s-A", "S", "A"),
      club("v-A", "V", "A"),
      club("s-B", "S", "B"),
      club("v-B", "V", "B"),
    ]);
    expect(mixed.conflicts).toBe(0);
    expect(mixed.draws).toHaveLength(1);

    const allS = drawCandidates("SF", [
      club("s-A", "S", "A"),
      club("s-B", "S", "B"),
      club("s-C", "S", "C"),
      club("s-D", "S", "D"),
    ]);
    expect(allS.conflicts).toBe(2);
    expect(allS.draws).toHaveLength(3);
  });

  it("picks one draw with every selected club exactly once", () => {
    const { draws } = drawCandidates("QF", qualified);
    const draw = pickDraw(draws);
    expect(draw).toHaveLength(4);
    expect(
      draw
        ?.flat()
        .map((c) => c.id)
        .sort()
    ).toEqual(qualified.map((c) => c.id).sort());
    expect(pickDraw([])).toBeNull();
  });
});
