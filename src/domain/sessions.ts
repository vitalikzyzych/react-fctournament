import { ownersOf, playedInOrder } from "./insights";
import { type IPlayedMatch, isPlayed } from "./standings";
import {
  type IMatch,
  type ITournament,
  type ITournamentWithMatches,
  PLAYER_IDS,
  type PlayerId,
} from "./types";

/** A longer break between two results starts a new session. */
export const SESSION_GAP_MS = 3 * 60 * 60 * 1000;

export interface ISession {
  /** Time of the first and the last result, in milliseconds. */
  start: number;
  end: number;
  matches: { tournament: ITournament; match: IPlayedMatch }[];
  /** Match wins of each player's clubs (S against V matches only). */
  wins: Record<PlayerId, number>;
  draws: number;
  goals: Record<PlayerId, number>;
}

/** Time a result was entered, or null when it has no date. */
export const playedAtMs = (match: { playedAt?: string | null }) => {
  const ms = match.playedAt ? Date.parse(match.playedAt) : NaN;
  return Number.isNaN(ms) ? null : ms;
};

/**
 * Playing sessions ("evenings") over every tournament: the dated results in
 * time order, split wherever more than SESSION_GAP_MS passed between two of
 * them. So a session that runs past midnight stays one. Oldest first.
 */
export const computeSessions = (list: ITournamentWithMatches[]): ISession[] => {
  const dated = list
    .flatMap(({ tournament, matches }) => {
      const owners = ownersOf(tournament.clubs);
      return matches.filter(isPlayed).flatMap((match) => {
        const at = playedAtMs(match);
        return at === null ? [] : [{ tournament, match, at, owners }];
      });
    })
    .sort((a, b) => a.at - b.at);

  const sessions: ISession[] = [];
  dated.forEach(({ tournament, match, at, owners }) => {
    let session = sessions[sessions.length - 1];
    if (!session || at - session.end > SESSION_GAP_MS) {
      session = {
        start: at,
        end: at,
        matches: [],
        wins: { S: 0, V: 0 },
        draws: 0,
        goals: { S: 0, V: 0 },
      };
      sessions.push(session);
    }
    session.end = at;
    session.matches.push({ tournament, match });
    const home = owners.get(match.home);
    const away = owners.get(match.away);
    if (home) session.goals[home] += match.result.home;
    if (away) session.goals[away] += match.result.away;
    if (!home || !away || home === away) return;
    if (match.result.home === match.result.away) session.draws += 1;
    else session.wins[match.result.home > match.result.away ? home : away] += 1;
  });
  return sessions;
};

export interface ISessionSummary {
  count: number;
  /** Matches per session on average. */
  avgMatches: number;
  /** The session with the most matches. */
  longest: ISession | null;
  /** Sessions each player won on match wins; level ones in `level`. */
  won: Record<PlayerId, number>;
  level: number;
  /** Each player's best session by the margin of wins. */
  best: Record<PlayerId, ISession | null>;
}

export const summarizeSessions = (sessions: ISession[]): ISessionSummary => {
  const won = { S: 0, V: 0 };
  const best: Record<PlayerId, ISession | null> = { S: null, V: null };
  const lead = (session: ISession, player: PlayerId) =>
    session.wins[player] - session.wins[player === "S" ? "V" : "S"];
  sessions.forEach((session) => {
    PLAYER_IDS.forEach((player) => {
      const margin = lead(session, player);
      if (margin <= 0) return;
      won[player] += 1;
      const current = best[player];
      if (!current || margin > lead(current, player)) best[player] = session;
    });
  });
  const total = sessions.reduce((sum, s) => sum + s.matches.length, 0);
  return {
    count: sessions.length,
    avgMatches: sessions.length ? total / sessions.length : 0,
    longest:
      [...sessions].sort((a, b) => b.matches.length - a.matches.length)[0] ??
      null,
    won,
    level: sessions.length - won.S - won.V,
    best,
  };
};

/**
 * Played matches in the order they really happened: by the time the results
 * were entered when every one of them has a date, otherwise in play order
 * (group matchdays, then the playoff).
 */
export const playedChronologically = (matches: IMatch[]): IPlayedMatch[] => {
  const ordered = playedInOrder(matches);
  const times = ordered.map(playedAtMs);
  if (times.some((time) => time === null)) return ordered;
  return ordered
    .map((match, index) => ({ match, at: times[index] ?? 0, index }))
    .sort((a, b) => a.at - b.at || a.index - b.index)
    .map(({ match }) => match);
};
