import {
  collection,
  collectionGroup,
  doc,
  type DocumentData,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
  type Unsubscribe,
  updateDoc,
  writeBatch,
} from "firebase/firestore";

import { getDb } from "@/core/firebase";
import {
  gameTeams,
  type IMatch,
  type IPlayoffMatch,
  type IScore,
  type IStoredMatch,
  type ITournament,
  type ITournamentFile,
  type TournamentStatus,
} from "@/domain";

/**
 * Firestore layout:
 *   tournaments/{tournamentId}                    ITournament without matches
 *   tournaments/{tournamentId}/matches/{matchId}  one document per match
 * firestore.rules mirrors these shapes, so keep both in sync.
 */
const TOURNAMENTS = "tournaments";
const MATCHES = "matches";

type OnError = (error: Error) => void;

const toTournament = (id: string, data: DocumentData): ITournament => ({
  id,
  schemaVersion: data.schemaVersion,
  number: data.number,
  name: data.name,
  game: data.game,
  format: data.format,
  status: data.status,
  champion: data.champion ?? null,
  players: data.players ?? [],
  groups: data.groups ?? [],
  clubs: data.clubs ?? [],
});

const toMatch = (id: string, data: DocumentData): IStoredMatch => {
  const common = {
    id,
    home: data.home,
    away: data.away,
    result: data.result ?? null,
    // Pending local writes have no server time yet: treat them as "just now".
    updatedAtMs:
      data.updatedAt instanceof Timestamp
        ? data.updatedAt.toMillis()
        : Date.now(),
  };
  return data.stage === "playoff"
    ? {
        ...common,
        stage: "playoff",
        round: data.round,
        tie: data.tie,
        game: data.game,
      }
    : { ...common, stage: "group", group: data.group, matchday: data.matchday };
};

/** Document fields of a match (the id is the document id). */
const matchData = (match: IMatch) =>
  match.stage === "group"
    ? {
        stage: match.stage,
        group: match.group,
        matchday: match.matchday,
        home: match.home,
        away: match.away,
        result: match.result,
        updatedAt: serverTimestamp(),
      }
    : {
        stage: match.stage,
        round: match.round,
        tie: match.tie,
        game: match.game,
        home: match.home,
        away: match.away,
        result: match.result,
        updatedAt: serverTimestamp(),
      };

export const subscribeTournaments = (
  onData: (tournaments: ITournament[]) => void,
  onError: OnError
): Unsubscribe =>
  onSnapshot(
    query(collection(getDb(), TOURNAMENTS), orderBy("number", "desc")),
    (snapshot) =>
      onData(snapshot.docs.map((d) => toTournament(d.id, d.data()))),
    onError
  );

/** Matches of every tournament, grouped by tournament id. */
export const subscribeAllMatches = (
  onData: (matches: Map<string, IStoredMatch[]>) => void,
  onError: OnError
): Unsubscribe =>
  onSnapshot(
    collectionGroup(getDb(), MATCHES),
    (snapshot) => {
      const byTournament = new Map<string, IStoredMatch[]>();
      snapshot.docs.forEach((d) => {
        const tournamentId = d.ref.parent.parent?.id;
        if (!tournamentId) return;
        const list = byTournament.get(tournamentId) ?? [];
        list.push(toMatch(d.id, d.data()));
        byTournament.set(tournamentId, list);
      });
      onData(byTournament);
    },
    onError
  );

/** Creates the tournament and all its matches in one atomic batch. */
export const importTournament = async (
  file: ITournamentFile
): Promise<void> => {
  const db = getDb();
  const batch = writeBatch(db);
  const { tournament } = file;
  const tournamentRef = doc(db, TOURNAMENTS, tournament.id);

  batch.set(tournamentRef, {
    id: tournament.id,
    schemaVersion: file.schemaVersion,
    number: tournament.number,
    name: tournament.name,
    game: tournament.game,
    format: tournament.format,
    status: tournament.status,
    champion: tournament.champion ?? null,
    players: file.players,
    groups: file.groups,
    // Firestore rejects `undefined`, so drop an absent country.
    clubs: file.clubs.map(({ country, ...club }) =>
      country ? { ...club, country } : club
    ),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  file.matches.forEach((match) => {
    batch.set(doc(tournamentRef, MATCHES, match.id), matchData(match));
  });

  await batch.commit();
};

/**
 * Saves or clears (`null`) a result. The local snapshot updates at once; the
 * promise settles when the server confirms, which can be much later offline.
 */
export const saveMatchResult = (
  tournamentId: string,
  matchId: string,
  result: IScore | null
): Promise<void> =>
  updateDoc(doc(getDb(), TOURNAMENTS, tournamentId, MATCHES, matchId), {
    result,
    updatedAt: serverTimestamp(),
  });

/**
 * Creates playoff games in one batch: the legs of a new tie (two in QF and SF,
 * one final), or an extra game with its result after a level aggregate. Ids
 * are fixed ("QF1-2"), so two devices creating the same game end up with one
 * document.
 */
export const createPlayoffGames = async (
  tournamentId: string,
  games: IPlayoffMatch[]
): Promise<void> => {
  const db = getDb();
  const batch = writeBatch(db);
  games.forEach((game) =>
    batch.set(
      doc(db, TOURNAMENTS, tournamentId, MATCHES, game.id),
      matchData(game)
    )
  );
  await batch.commit();
};

/**
 * Changes the clubs of a tie. `first` hosts game 1 and the other odd games,
 * `second` hosts game 2 and the other even games.
 */
export const setPlayoffTeams = async (
  tournamentId: string,
  games: IPlayoffMatch[],
  first: string,
  second: string
): Promise<void> => {
  const db = getDb();
  const batch = writeBatch(db);
  games.forEach((game) =>
    batch.update(doc(db, TOURNAMENTS, tournamentId, MATCHES, game.id), {
      ...gameTeams(first, second, game.game),
      updatedAt: serverTimestamp(),
    })
  );
  await batch.commit();
};

/**
 * Saves a playoff result and removes replays that no longer apply (an earlier
 * draw was corrected to a win, or cleared), in one batch.
 */
export const savePlayoffResult = async (
  tournamentId: string,
  matchId: string,
  result: IScore | null,
  removeIds: string[]
): Promise<void> => {
  const db = getDb();
  const batch = writeBatch(db);
  batch.update(doc(db, TOURNAMENTS, tournamentId, MATCHES, matchId), {
    result,
    updatedAt: serverTimestamp(),
  });
  removeIds.forEach((id) =>
    batch.delete(doc(db, TOURNAMENTS, tournamentId, MATCHES, id))
  );
  await batch.commit();
};

/** Removes playoff games (a whole tie). The rules refuse group matches. */
export const deletePlayoffMatches = async (
  tournamentId: string,
  matchIds: string[]
): Promise<void> => {
  const db = getDb();
  const batch = writeBatch(db);
  matchIds.forEach((id) =>
    batch.delete(doc(db, TOURNAMENTS, tournamentId, MATCHES, id))
  );
  await batch.commit();
};

/** Picks (club id) or clears (`null`) the champion of a tournament by hand. */
export const setTournamentChampion = (
  tournamentId: string,
  champion: string | null
): Promise<void> =>
  updateDoc(doc(getDb(), TOURNAMENTS, tournamentId), {
    champion,
    updatedAt: serverTimestamp(),
  });

export const setTournamentStatus = (
  tournamentId: string,
  status: TournamentStatus
): Promise<void> =>
  updateDoc(doc(getDb(), TOURNAMENTS, tournamentId), {
    status,
    updatedAt: serverTimestamp(),
  });

/** Deletes the tournament and its matches. The rules refuse completed tournaments. */
export const deleteTournament = async (
  tournamentId: string,
  matchIds: string[]
) => {
  const db = getDb();
  const batch = writeBatch(db);
  const tournamentRef = doc(db, TOURNAMENTS, tournamentId);
  matchIds.forEach((id) => batch.delete(doc(tournamentRef, MATCHES, id)));
  batch.delete(tournamentRef);
  await batch.commit();
};
