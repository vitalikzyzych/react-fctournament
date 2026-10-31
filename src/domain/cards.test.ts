import { describe, expect, it } from "vitest";

import { computeDiscipline } from "./cards";
import { newTieGames } from "./playoff";
import type { CardType, ICard, IGroupMatch, IMatch } from "./types";

let nextId = 0;
const card = (club: string, player: string, type: CardType): ICard => ({
  id: `c${(nextId += 1)}`,
  club,
  player,
  type,
});

/** Real Madrid against Arsenal on every matchday, home and away swapping. */
const fixtures = (days: number): IGroupMatch[] =>
  Array.from({ length: days }, (_, i) => ({
    id: `M${i + 1}`,
    stage: "group",
    group: "A",
    matchday: i + 1,
    home: i % 2 ? "arsenal" : "real-madrid",
    away: i % 2 ? "real-madrid" : "arsenal",
    result: null,
  }));

const withCards = (
  matches: IMatch[],
  cards: Record<string, ICard[]>
): IMatch[] => matches.map((m) => ({ ...m, cards: cards[m.id] ?? [] }));

const bannedIn = (matches: IMatch[], matchId: string) =>
  (computeDiscipline(matches).suspensions.get(matchId) ?? []).map(
    (s) => `${s.player}:${s.reason}`
  );

describe("cards and bans", () => {
  it("bans after the second yellow, then after every yellow", () => {
    const matches = withCards(fixtures(6), {
      M1: [card("real-madrid", "Vinicius", "yellow")],
      M2: [card("real-madrid", " vinicius ", "yellow")],
      M4: [card("real-madrid", "Vinicius", "yellow")],
    });
    expect(bannedIn(matches, "M2")).toEqual([]);
    expect(bannedIn(matches, "M3")).toEqual(["Vinicius:two-yellows"]);
    expect(bannedIn(matches, "M4")).toEqual([]);
    expect(bannedIn(matches, "M5")).toEqual(["Vinicius:yellow-after-ban"]);
    expect(bannedIn(matches, "M6")).toEqual([]);
  });

  it("bans for one match after a red or two yellows in one match", () => {
    const matches = withCards(fixtures(5), {
      M1: [card("arsenal", "Saka", "red")],
      M3: [
        card("real-madrid", "Rudiger", "yellow"),
        card("real-madrid", "Rudiger", "yellow"),
      ],
      M4: [card("arsenal", "Saka", "yellow")],
    });
    expect(bannedIn(matches, "M2")).toEqual(["Saka:red"]);
    expect(bannedIn(matches, "M3")).toEqual([]);
    expect(bannedIn(matches, "M4")).toEqual(["Rudiger:two-yellows-match"]);
    // Saka has served a ban, so his first yellow after it bans him again.
    expect(bannedIn(matches, "M5")).toEqual(["Saka:yellow-after-ban"]);
  });

  it("does not count a game's cards again in the extra game it leads to", () => {
    const legs = newTieGames("QF", 1, "real-madrid", "inter").map((g) => ({
      ...g,
      result: { home: 1, away: 1 },
    }));
    const matches = withCards(legs, {
      "QF1-2": [card("inter", "Lautaro", "yellow")],
    });
    // One yellow only: no ban in the pending extra game QF1-3.
    expect(bannedIn(matches, "QF1-3")).toEqual([]);
  });

  it("counts per club and carries yellows into the playoff", () => {
    const legs = newTieGames("QF", 1, "real-madrid", "inter");
    const matches = withCards([...fixtures(2), ...legs], {
      M1: [
        card("real-madrid", "Modric", "yellow"),
        card("arsenal", "Modric", "yellow"),
      ],
      M2: [card("real-madrid", "Modric", "yellow")],
    });
    // Two different footballers called Modric: only Real Madrid's has two.
    expect(bannedIn(matches, "QF1-1")).toEqual(["Modric:two-yellows"]);
    expect(computeDiscipline(matches).playersByClub.get("real-madrid")).toEqual(
      ["Modric"]
    );
  });
});
