import { describe, expect, it } from "vitest";

import { newTieGames } from "./playoff";
import { latestResult, upcomingMatches } from "./schedule";
import type { IMatch, IStoredMatch } from "./types";

const group = (
  id: string,
  matchday: number,
  result: IMatch["result"] = null
): IMatch => ({
  id,
  stage: "group",
  group: "A",
  matchday,
  home: `${id}-h`,
  away: `${id}-a`,
  result,
});

const quarterFinals = (): IMatch[] =>
  [1, 2, 3, 4].flatMap((tie) =>
    newTieGames("QF", tie, `home${tie}`, `away${tie}`)
  );

describe("upcomingMatches", () => {
  it("plays the group stage by matchday before the playoff", () => {
    const matches = [group("A2-1", 2), group("A1-1", 1), ...quarterFinals()];
    expect(
      upcomingMatches(matches)
        .map((m) => m.id)
        .slice(0, 3)
    ).toEqual(["A1-1", "A2-1", "QF1-1"]);
  });

  it("plays every first leg of a round before the second legs", () => {
    expect(upcomingMatches(quarterFinals()).map((m) => m.id)).toEqual([
      "QF1-1",
      "QF2-1",
      "QF3-1",
      "QF4-1",
      "QF1-2",
      "QF2-2",
      "QF3-2",
      "QF4-2",
    ]);
  });

  it("adds the extra game of a tie that is level on aggregate", () => {
    const matches = quarterFinals().map((m) =>
      m.stage === "playoff" && m.tie === 1
        ? { ...m, result: { home: 1, away: 1 } }
        : m
    );
    const ids = upcomingMatches(matches).map((m) => m.id);
    expect(ids).not.toContain("QF1-1");
    // Extra games come after the legs of the round.
    expect(ids.at(-1)).toBe("QF1-3");
  });
});

describe("latestResult", () => {
  it("returns the result changed last and ignores unplayed matches", () => {
    const stored = (match: IMatch, updatedAtMs: number): IStoredMatch => ({
      ...match,
      updatedAtMs,
    });
    const matches = [
      stored(group("A1-1", 1, { home: 1, away: 0 }), 100),
      stored(group("A1-2", 1, { home: 2, away: 2 }), 300),
      stored(group("A2-1", 2), 500),
    ];
    expect(latestResult(matches)?.id).toBe("A1-2");
    expect(latestResult([])).toBeNull();
  });
});
