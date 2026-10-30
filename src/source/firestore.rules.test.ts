/**
 * Checks firestore.rules against the payloads the app really sends.
 * Needs the emulator running: `npm run emulator`, then `npm run test:rules`.
 */
import { initializeApp } from "firebase/app";
import {
  connectFirestoreEmulator,
  deleteDoc,
  doc,
  getFirestore,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { beforeAll, describe, expect, it, vi } from "vitest";

import completedExample from "../../examples/tournament-completed.example.json";
import leagueExample from "../../examples/tournament-league.example.json";
import newExample from "../../examples/tournament-new.example.json";

import {
  computePlayoff,
  type IPlayoffMatch,
  type ITournamentFile,
  newTieGames,
  validateTournamentFile,
} from "@/domain";

const PROJECT_ID = "demo-fc-tournament";
const app = initializeApp({ projectId: PROJECT_ID }, "rules-test");
const db = getFirestore(app);
connectFirestoreEmulator(db, "127.0.0.1", 8080);

vi.mock("@/core/firebase", () => ({ getDb: () => db }));

const {
  applyPlayoffDraw,
  createPlayoffGames,
  deletePlayoffMatches,
  deleteTournament,
  importTournament,
  savePlayoffResult,
  saveMatchResult,
  setPlayoffTeams,
  setTournamentChampion,
  setTournamentName,
  setTournamentStatus,
} = await import("./TournamentSource");

const parse = (raw: unknown, id: string): ITournamentFile => {
  const file = validateTournamentFile(raw, { existing: [] }).file;
  if (!file) throw new Error("example file is invalid");
  return { ...file, tournament: { ...file.tournament, id } };
};

const newFile = parse(newExample, "rules-new");
const completedFile = parse(completedExample, "rules-completed");
const leagueFile = parse(leagueExample, "rules-league");
const firstMatch = newFile.matches[0].id;

const matchRef = (tournamentId: string, matchId: string) =>
  doc(db, "tournaments", tournamentId, "matches", matchId);

beforeAll(async () => {
  await fetch(
    `http://127.0.0.1:8080/emulator/v1/projects/${PROJECT_ID}/databases/(default)/documents`,
    { method: "DELETE" }
  );
});

describe("firestore.rules", () => {
  it("imports a new and a completed tournament in one batch each", async () => {
    await importTournament(newFile);
    await importTournament(completedFile);
  });

  it("imports a 40-club league with its 160 matches", async () => {
    await importTournament(leagueFile);
  });

  it("refuses to import over an existing tournament", async () => {
    await expect(importTournament(newFile)).rejects.toThrow();
  });

  it("saves, edits and clears a result on an active tournament", async () => {
    await saveMatchResult("rules-new", firstMatch, { home: 0, away: 0 });
    await saveMatchResult("rules-new", firstMatch, { home: 3, away: 1 });
    await saveMatchResult("rules-new", firstMatch, null);
  });

  it("rejects malformed scores and changes to other match fields", async () => {
    const ref = matchRef("rules-new", firstMatch);
    const bad = [
      { result: { home: -1, away: 0 }, updatedAt: serverTimestamp() },
      { result: { home: 1.5, away: 0 }, updatedAt: serverTimestamp() },
      { result: { home: "2", away: 0 }, updatedAt: serverTimestamp() },
      { result: { home: 1, away: 0, note: "x" }, updatedAt: serverTimestamp() },
      { result: { home: 1, away: 0 } },
      { home: "chelsea", updatedAt: serverTimestamp() },
    ];
    for (const data of bad) {
      await expect(updateDoc(ref, data)).rejects.toThrow();
    }
  });

  it("locks results of a completed tournament until it is unlocked", async () => {
    const matchId = completedFile.matches[0].id;
    await expect(
      saveMatchResult("rules-completed", matchId, { home: 9, away: 9 })
    ).rejects.toThrow();
    await expect(deleteTournament("rules-completed", [])).rejects.toThrow();

    await setTournamentStatus("rules-completed", "active");
    await saveMatchResult("rules-completed", matchId, { home: 2, away: 2 });
    await setTournamentStatus("rules-completed", "completed");
  });

  it("renames a tournament in any status, nothing else with it", async () => {
    await setTournamentName("rules-new", "Інша назва");
    await setTournamentName("rules-completed", "Завершений, нова назва");
    const ref = doc(db, "tournaments", "rules-new");
    await expect(setTournamentName("rules-new", "")).rejects.toThrow();
    await expect(
      setTournamentName("rules-new", "x".repeat(81))
    ).rejects.toThrow();
    await expect(
      updateDoc(ref, {
        name: "Назва",
        number: 5,
        updatedAt: serverTimestamp(),
      })
    ).rejects.toThrow();
  });

  it("allows only status changes on a tournament", async () => {
    const ref = doc(db, "tournaments", "rules-new");
    await expect(
      updateDoc(ref, { game: "Інша гра", updatedAt: serverTimestamp() })
    ).rejects.toThrow();
    await expect(
      updateDoc(ref, { status: "archived", updatedAt: serverTimestamp() })
    ).rejects.toThrow();
  });

  it("builds a two-leg tie: legs, level aggregate, replay, fix a team", async () => {
    const legs = newTieGames("QF", 1, "real-madrid", "inter");
    expect(legs.map((g) => [g.id, g.home, g.away])).toEqual([
      ["QF1-1", "real-madrid", "inter"],
      ["QF1-2", "inter", "real-madrid"],
    ]);
    await createPlayoffGames("rules-new", legs);
    await savePlayoffResult("rules-new", "QF1-1", { home: 2, away: 1 }, []);
    await savePlayoffResult("rules-new", "QF1-2", { home: 1, away: 0 }, []);
    // 2:2 on aggregate: an extra game, created together with its result.
    await createPlayoffGames("rules-new", [
      { ...legs[0], id: "QF1-3", game: 3, result: { home: 3, away: 0 } },
    ]);
    const games = [...legs, { ...legs[0], id: "QF1-3", game: 3, result: null }];
    await setPlayoffTeams("rules-new", games, "real-madrid", "arsenal");
    // Correcting a leg so the aggregate is decided removes the extra game.
    await savePlayoffResult("rules-new", "QF1-1", { home: 3, away: 1 }, [
      "QF1-3",
    ]);
    await deletePlayoffMatches("rules-new", ["QF1-1", "QF1-2"]);
  });

  it("applies a draw: new ties get legs, set-up ties get new clubs", async () => {
    // Tie 1 is already set up, ties 2 to 4 are empty.
    const tieOne = newTieGames("QF", 1, "inter", "arsenal");
    await createPlayoffGames("rules-new", tieOne);
    const ties = computePlayoff(tieOne).filter((tie) => tie.round === "QF");
    await applyPlayoffDraw("rules-new", ties, [
      ["real-madrid", "inter"],
      ["arsenal", "bayern-munich"],
      ["manchester-city", "juventus"],
      ["barcelona", "borussia-dortmund"],
    ]);
    await deletePlayoffMatches(
      "rules-new",
      ties.flatMap((tie) => [`QF${tie.tie}-1`, `QF${tie.tie}-2`])
    );
  });

  it("rejects malformed playoff games", async () => {
    const valid: IPlayoffMatch = {
      id: "SF1-1",
      stage: "playoff",
      round: "SF",
      tie: 1,
      game: 1,
      home: "napoli",
      away: "chelsea",
      result: null,
    };
    const bad: IPlayoffMatch[] = [
      { ...valid, id: "SF1-2" }, // id does not match the game number
      { ...valid, id: "SF3-1", tie: 3 }, // only 2 semi-final ties
      { ...valid, away: "napoli" }, // a club against itself
    ];
    for (const match of bad) {
      await expect(createPlayoffGames("rules-new", [match])).rejects.toThrow();
    }
    await createPlayoffGames("rules-new", [valid]);
    await expect(
      updateDoc(matchRef("rules-new", "SF1-1"), {
        round: "F",
        updatedAt: serverTimestamp(),
      })
    ).rejects.toThrow();
  });

  it("locks the playoff of a completed tournament", async () => {
    await expect(
      createPlayoffGames("rules-completed", [
        {
          // A new extra game: a create, not an update of an existing game.
          id: "SF1-3",
          stage: "playoff",
          round: "SF",
          tie: 1,
          game: 3,
          home: "real-madrid",
          away: "manchester-city",
          result: null,
        },
      ])
    ).rejects.toThrow();
  });

  it("picks a champion by hand only while the tournament is not completed", async () => {
    await setTournamentChampion("rules-new", "liverpool");
    await setTournamentChampion("rules-new", null);
    await expect(
      updateDoc(doc(db, "tournaments", "rules-new"), {
        champion: 7,
        updatedAt: serverTimestamp(),
      })
    ).rejects.toThrow();
    await expect(
      updateDoc(doc(db, "tournaments", "rules-new"), {
        champion: "liverpool",
        status: "completed",
        updatedAt: serverTimestamp(),
      })
    ).rejects.toThrow();
    await expect(
      setTournamentChampion("rules-completed", "liverpool")
    ).rejects.toThrow();
  });

  it("keeps a planned tournament read-only until it starts", async () => {
    const planned = {
      ...newFile,
      tournament: {
        ...newFile.tournament,
        id: "rules-planned",
        status: "planned" as const,
      },
    };
    await importTournament(planned);
    await expect(
      saveMatchResult("rules-planned", firstMatch, { home: 1, away: 0 })
    ).rejects.toThrow();
    await expect(
      setTournamentChampion("rules-planned", "liverpool")
    ).rejects.toThrow();
    await expect(
      createPlayoffGames(
        "rules-planned",
        newTieGames("QF", 1, "real-madrid", "borussia-dortmund")
      )
    ).rejects.toThrow();

    await setTournamentStatus("rules-planned", "active");
    await saveMatchResult("rules-planned", firstMatch, { home: 1, away: 0 });
  });

  it("deletes a match only together with its tournament", async () => {
    await expect(
      deleteDoc(matchRef("rules-new", firstMatch))
    ).rejects.toThrow();
    await deleteTournament("rules-new", [
      ...newFile.matches.map((m) => m.id),
      "SF1-1",
    ]);
  });

  it("rejects writes outside the known collections", async () => {
    await expect(setDoc(doc(db, "anything", "x"), { a: 1 })).rejects.toThrow();
  });
});
