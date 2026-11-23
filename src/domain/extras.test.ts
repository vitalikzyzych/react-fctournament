import { describe, expect, it } from "vitest";

import completedExample from "../../examples/tournament-completed.example.json";
import leagueExample from "../../examples/tournament-league.example.json";
import newExample from "../../examples/tournament-new.example.json";

import { computePlayoffChances, computeStakes } from "./chances";
import { toTournamentFile } from "./exportJson";
import { computeFeed } from "./feed";
import { groupMatches } from "./playoff";
import { computeDrawStrength, computeRatings, RATING_START } from "./ratings";
import {
  computeCategories,
  computeMedals,
  computeRecordBook,
  computeSameStage,
} from "./records";
import {
  computeSessions,
  playedChronologically,
  summarizeSessions,
} from "./sessions";
import { clubStrengths, predictMatch } from "./tieChances";
import { seededRandom } from "./timeline";
import { computeTitleRace } from "./titleRace";
import type {
  IMatch,
  ITournament,
  ITournamentFile,
  ITournamentWithMatches,
} from "./types";
import { validateTournamentFile } from "./validation";
import { computeWrapUp } from "./wrapup";

const load = (raw: unknown): ITournamentWithMatches => {
  const file: ITournamentFile | null = validateTournamentFile(raw, {
    existing: [],
  }).file;
  if (!file) throw new Error("example file is invalid");
  const tournament: ITournament = {
    ...file.tournament,
    champion: file.tournament.champion ?? null,
    schemaVersion: file.schemaVersion,
    players: file.players,
    groups: file.groups,
    clubs: file.clubs,
  };
  return { tournament, matches: file.matches };
};

const completed = load(completedExample);
const fresh = load(newExample);
const league = load(leagueExample);

/** The first `count` group matches get a result; the rest stay open. */
const partly = (
  item: ITournamentWithMatches,
  count: number
): ITournamentWithMatches => ({
  tournament: { ...item.tournament, status: "active" },
  matches: item.matches.map((match, index) =>
    index < count
      ? { ...match, result: { home: (index % 4) + 1, away: index % 3 } }
      : match
  ),
});

describe("result dates", () => {
  it("reads playedAt from a file and writes it back", () => {
    const raw = structuredClone(completedExample) as {
      matches: { playedAt?: string }[];
    };
    raw.matches[0].playedAt = "2026-03-01T20:15:00.000Z";
    const { tournament, matches } = load(raw);
    expect(matches[0].playedAt).toBe("2026-03-01T20:15:00.000Z");
    const file = toTournamentFile(tournament, matches);
    expect(file.matches[0].playedAt).toBe("2026-03-01T20:15:00.000Z");
    expect("playedAt" in file.matches[1]).toBe(false);
  });

  it("refuses a date that is not an ISO date and time", () => {
    const raw = structuredClone(completedExample) as {
      matches: { playedAt?: string }[];
    };
    raw.matches[0].playedAt = "yesterday";
    expect(validateTournamentFile(raw, { existing: [] }).file).toBeNull();
  });

  it("splits dated results into sessions by the break between them", () => {
    const hour = 60 * 60 * 1000;
    const start = Date.parse("2026-03-01T19:00:00.000Z");
    // Three matches an evening, a day apart.
    const matches: IMatch[] = completed.matches.slice(0, 6).map((m, i) => ({
      ...m,
      playedAt: new Date(
        start + Math.floor(i / 3) * 24 * hour + (i % 3) * hour
      ).toISOString(),
    }));
    const sessions = computeSessions([{ ...completed, matches }]);
    expect(sessions.map((s) => s.matches.length)).toEqual([3, 3]);
    const summary = summarizeSessions(sessions);
    expect(summary.count).toBe(2);
    expect(summary.avgMatches).toBe(3);
    expect(summary.won.S + summary.won.V + summary.level).toBe(2);
  });

  it("orders results by date only when every result has one", () => {
    const [first, second, ...rest] = completed.matches;
    const dated: IMatch[] = [
      { ...first, playedAt: "2026-03-02T10:00:00.000Z" },
      { ...second, playedAt: "2026-03-01T10:00:00.000Z" },
    ];
    expect(playedChronologically(dated).map((m) => m.id)).toEqual([
      second.id,
      first.id,
    ]);
    expect(playedChronologically([...dated, ...rest])[0].id).toBe(first.id);
  });
});

describe("club ratings", () => {
  const ratings = computeRatings([completed]);

  it("moves as many points to the winner as the loser gives up", () => {
    const total = ratings.clubs.reduce((sum, club) => sum + club.rating, 0);
    expect(total / ratings.clubs.length).toBeCloseTo(RATING_START, 6);
    expect(ratings.matches).toHaveLength(completed.matches.length);
    expect(ratings.clubs[0].rating).toBeGreaterThan(RATING_START);
  });

  it("starts the next tournament from the ratings of the one before", () => {
    const next = {
      tournament: { ...completed.tournament, id: "next", number: 200 },
      matches: completed.matches,
    };
    const both = computeRatings([next, completed]);
    const best = ratings.clubs[0];
    expect(both.before.get("next")?.get(best.clubId)).toBeCloseTo(best.rating);
    expect(computeDrawStrength(completed.tournament, both)).toBeNull();
    const strength = computeDrawStrength(next.tournament, both);
    expect(strength?.known).toBe(completed.tournament.clubs.length);
    expect(strength?.groups).toHaveLength(completed.tournament.groups.length);
  });

  it("lists wins against much stronger clubs as upsets", () => {
    ratings.upsets.forEach((upset) =>
      expect(upset.chance).toBeLessThanOrEqual(0.35)
    );
  });
});

describe("predictions", () => {
  it("gives outcome chances that add up, favouring the stronger club", () => {
    const active = partly(fresh, 16);
    const strengths = clubStrengths(active.matches);
    const [strong] = [...strengths.clubs].sort(
      (a, b) => b[1].attack - b[1].defence - (a[1].attack - a[1].defence)
    )[0];
    const [weak] = [...strengths.clubs].sort(
      (a, b) => a[1].attack - a[1].defence - (b[1].attack - b[1].defence)
    )[0];
    const prediction = predictMatch(strengths, strong, weak);
    expect(prediction.home + prediction.draw + prediction.away).toBeCloseTo(1);
    expect(prediction.home).toBeGreaterThan(prediction.away);
  });

  it("shows what a group match means for both clubs", () => {
    const active = partly(fresh, 16);
    const open = active.matches.find((m) => m.result === null);
    if (!open) throw new Error("no open match");
    const stakes = computeStakes(
      active.tournament,
      active.matches,
      open,
      seededRandom(5)
    );
    expect(stakes?.home.win).toBeGreaterThanOrEqual(stakes?.home.loss ?? 1);
    expect(stakes?.away.win).toBeGreaterThanOrEqual(stakes?.away.loss ?? 1);
    expect(
      computeStakes(
        active.tournament,
        active.matches,
        active.matches[0],
        seededRandom(5)
      )
    ).toBeNull();
  });

  it("keeps playoff chances for 2 places per group", () => {
    const active = partly(fresh, 16);
    const chances = computePlayoffChances(
      active.tournament,
      active.matches,
      seededRandom(1),
      200
    );
    const total = [...(chances?.values() ?? [])].reduce((s, c) => s + c, 0);
    expect(total).toBeCloseTo(active.tournament.groups.length * 2);
  });
});

describe("title race", () => {
  it("is not shown before the first result or once there is a champion", () => {
    expect(
      computeTitleRace(fresh.tournament, fresh.matches, seededRandom(4), 50)
    ).toBeNull();
    expect(
      computeTitleRace(
        completed.tournament,
        completed.matches,
        seededRandom(4),
        50
      )
    ).toBeNull();
  });

  it("splits the title between the clubs during the group stage", () => {
    const active = partly(fresh, 16);
    const race = computeTitleRace(
      active.tournament,
      active.matches,
      seededRandom(4),
      300
    );
    expect(race?.players.S ?? 0).toBeGreaterThan(0);
    expect((race?.players.S ?? 0) + (race?.players.V ?? 0)).toBeCloseTo(1);
    expect(race?.clubs.length).toBeGreaterThan(2);
  });

  it("leaves the title to the finalists once the final is set", () => {
    const final = completed.matches.find(
      (m) => m.stage === "playoff" && m.round === "F"
    );
    if (!final) throw new Error("no final");
    const matches = completed.matches
      .filter((m) => m.stage !== "playoff" || m.round !== "F" || m.game === 1)
      .map((m) => (m.id === final.id ? { ...m, result: null } : m));
    const race = computeTitleRace(
      { ...completed.tournament, status: "active" },
      matches,
      seededRandom(4),
      300
    );
    expect(race?.clubs.map(({ club }) => club.id).sort()).toEqual(
      [final.home, final.away].sort()
    );
  });

  it("runs a league through the knockout round and the round of 16", () => {
    const active = partly(league, 160);
    const race = computeTitleRace(
      active.tournament,
      active.matches,
      seededRandom(4),
      100
    );
    expect((race?.players.S ?? 0) + (race?.players.V ?? 0)).toBeCloseTo(1);
    // Places 13 to 20 of each player are out: at most 24 clubs can win.
    expect(race?.clubs.length).toBeLessThanOrEqual(24);
  });
});

describe("story feed", () => {
  const feed = computeFeed(completed.tournament, completed.matches);

  it("ends with the champion and reports every decided tie", () => {
    expect(feed[feed.length - 1].kind).toBe("champion");
    expect(feed.filter((e) => e.kind === "through")).toHaveLength(6);
    expect(feed.filter((e) => e.kind === "stageDone")).toHaveLength(
      completed.tournament.groups.length
    );
  });

  it("gives every event its own id", () => {
    const ids = feed.map((event) => `${event.id}:${event.title}`);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("records and medals", () => {
  it("fills the record book from every tournament", () => {
    const book = computeRecordBook([completed]);
    expect(book.biggestWins.length).toBeGreaterThan(0);
    expect(book.highestScoring[0].tournament.id).toBe(completed.tournament.id);
    expect(book.records.map((r) => r.id)).toContain("clubGoals");
    const groupOnly = computeRecordBook([completed], false);
    expect(
      groupOnly.highestScoring.every(({ match }) => match.stage === "group")
    ).toBe(true);
  });

  it("gives one gold, one silver and two bronze medals per tournament", () => {
    const medals = computeMedals([completed]);
    const sum = (key: "gold" | "silver" | "bronze") =>
      medals.clubs.reduce((total, row) => total + row[key], 0);
    expect([sum("gold"), sum("silver"), sum("bronze")]).toEqual([1, 1, 2]);
    expect(medals.players.S.gold + medals.players.V.gold).toBe(1);
    expect(computeMedals([partly(fresh, 16)]).clubs).toHaveLength(0);
  });

  it("splits S against V by stage, country and pot", () => {
    const categories = computeCategories([completed], (club) => club.country);
    expect(categories.stages[0].key).toBe("group");
    expect(categories.stages[0].records.S.played).toBe(
      groupMatches(completed.matches).length
    );
    expect(categories.stages.map((row) => row.key)).toContain("F");
    expect(categories.pots).toHaveLength(0);
  });

  it("compares the same number of matches of earlier tournaments", () => {
    const current = partly(
      { ...fresh, tournament: { ...fresh.tournament, number: 150 } },
      10
    );
    const stage = computeSameStage([current, completed], current.tournament);
    expect(stage?.played).toBe(10);
    expect(stage?.rows.map((row) => row.tournament.id)).toEqual([
      current.tournament.id,
      completed.tournament.id,
    ]);
    expect(stage?.rows[1].records.S.played).toBeLessThanOrEqual(10);
    expect(computeSameStage([current], current.tournament)).toBeNull();
  });
});

describe("wrap-up", () => {
  it("names the champion, the finalist and the awards", () => {
    const wrap = computeWrapUp(
      completed.tournament,
      completed.matches,
      computeRatings([completed])
    );
    expect(wrap.champion).not.toBeNull();
    expect(wrap.finalist).not.toBeNull();
    expect(wrap.finalist?.id).not.toBe(wrap.champion?.id);
    const ids = wrap.awards.map((award) => award.id);
    expect(ids).toEqual(expect.arrayContaining(["attack", "defence"]));
    expect(ids).toContain("discovery");
  });
});
