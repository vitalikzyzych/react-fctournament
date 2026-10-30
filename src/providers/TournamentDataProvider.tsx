import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import type {
  IStoredMatch,
  ITournament,
  ITournamentWithMatches,
} from "@/domain";
import {
  subscribeAllMatches,
  subscribeTournaments,
} from "@/source/TournamentSource";

interface ITournamentData {
  tournaments: ITournament[];
  matchesByTournament: Map<string, IStoredMatch[]>;
  /** Every tournament with its matches, newest first. */
  all: ITournamentWithMatches[];
  loading: boolean;
  error: string | null;
}

const TournamentDataContext = createContext<ITournamentData | null>(null);

/**
 * One live subscription to all tournaments and one to all matches, shared by
 * every screen. The whole history is a few hundred small documents, so loading
 * it once is simpler and cheaper than a query per screen.
 */
export const TournamentDataProvider = ({
  children,
}: {
  children: ReactNode;
}) => {
  const [tournaments, setTournaments] = useState<ITournament[] | null>(null);
  const [matchesByTournament, setMatches] = useState<Map<
    string,
    IStoredMatch[]
  > | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const onError = (e: Error) => setError(e.message);
    const unsubscribeTournaments = subscribeTournaments(
      setTournaments,
      onError
    );
    const unsubscribeMatches = subscribeAllMatches(setMatches, onError);
    return () => {
      unsubscribeTournaments();
      unsubscribeMatches();
    };
  }, []);

  const value = useMemo<ITournamentData>(() => {
    const list = tournaments ?? [];
    const matches = matchesByTournament ?? new Map<string, IStoredMatch[]>();
    return {
      tournaments: list,
      matchesByTournament: matches,
      all: list.map((tournament) => ({
        tournament,
        matches: matches.get(tournament.id) ?? [],
      })),
      loading: (tournaments === null || matchesByTournament === null) && !error,
      error,
    };
  }, [tournaments, matchesByTournament, error]);

  return (
    <TournamentDataContext.Provider value={value}>
      {children}
    </TournamentDataContext.Provider>
  );
};

export const useTournamentData = (): ITournamentData => {
  const context = useContext(TournamentDataContext);
  if (!context)
    throw new Error(
      "useTournamentData must be used inside TournamentDataProvider"
    );
  return context;
};

/** Active tournament with the highest number, or the newest one when none is active. */
export const pickCurrentTournament = (
  all: ITournamentWithMatches[]
): ITournamentWithMatches | null =>
  all.find((t) => t.tournament.status === "active") ?? all[0] ?? null;
