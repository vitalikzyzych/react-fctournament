import { findLeagueWinner } from "./league";
import {
  computePlayoffReach,
  findChampion,
  groupMatches,
  type PlayoffReach,
} from "./playoff";
import {
  addResult,
  buildRecords,
  computeStandings,
  emptyRecord,
  type IPlayedMatch,
  type IRecord,
  isPlayed,
} from "./standings";
import {
  computePlayerRecords,
  type PlayerRecords,
  sumPlayerRecords,
} from "./stats";
import type {
  IClub,
  IMatch,
  ITournament,
  ITournamentWithMatches,
  PlayerId,
} from "./types";

export interface ITournamentSummary {
  tournament: ITournament;
  totalMatches: number;
  playedMatches: number;
  totalGoals: number;
  players: PlayerRecords;
  /** Current leader of each group (final winner once the tournament is completed). */
  groupLeaders: IClub[];
  /** Winner of the playoff final, null until it is decided. */
  champion: IClub | null;
  /** League formats: winner of the league table once every match is played. */
  leagueWinner: IClub | null;
}

export interface IClubHistoryEntry {
  tournament: ITournament;
  club: IClub;
  /** Group and playoff matches together. */
  record: IRecord;
  /** Place in the group table. */
  position: number;
  playoff: PlayoffReach | null;
}

export interface IClubHistory {
  clubId: string;
  name: string;
  country?: string;
  entries: IClubHistoryEntry[];
  total: IRecord;
  timesByPlayer: Record<PlayerId, number>;
  titles: number;
}

export interface IHeadToHeadMatch {
  tournament: ITournament;
  match: IPlayedMatch;
}

export interface IHeadToHead {
  clubA: string;
  clubB: string;
  matches: IHeadToHeadMatch[];
  winsA: number;
  winsB: number;
  draws: number;
  goalsA: number;
  goalsB: number;
  tournamentCount: number;
}

const byNumber = (a: ITournamentWithMatches, b: ITournamentWithMatches) =>
  a.tournament.number - b.tournament.number;

export const findChampionClub = (
  tournament: ITournament,
  matches: IMatch[]
): IClub | null => {
  // A decided final wins; otherwise the champion picked by hand.
  const championId = findChampion(matches) ?? tournament.champion ?? null;
  return tournament.clubs.find((club) => club.id === championId) ?? null;
};

/**
 * Whether a tournament's champion counts as a title. Only completed
 * tournaments do: a tournament in progress may already show a champion (a
 * decided final or a hand pick), but the title is not won until it is
 * completed.
 */
export const countsAsTitle = (tournament: ITournament): boolean =>
  tournament.status === "completed";

/** Titles per player: champions of completed tournaments. */
export const countTitles = (
  list: ITournamentWithMatches[]
): Record<PlayerId, number> => {
  const titles: Record<PlayerId, number> = { S: 0, V: 0 };
  list.forEach(({ tournament, matches }) => {
    if (!countsAsTitle(tournament)) return;
    const champion = findChampionClub(tournament, matches);
    if (champion) titles[champion.owner] += 1;
  });
  return titles;
};

export const summarizeTournament = ({
  tournament,
  matches,
}: ITournamentWithMatches): ITournamentSummary => {
  const played = matches.filter(isPlayed);
  return {
    tournament,
    totalMatches: matches.length,
    playedMatches: played.length,
    totalGoals: played.reduce(
      (sum, m) => sum + m.result.home + m.result.away,
      0
    ),
    players: computePlayerRecords(tournament.clubs, matches),
    groupLeaders: tournament.groups.flatMap((group) => {
      const rows = computeStandings(
        tournament.clubs.filter((club) => club.group === group.id),
        groupMatches(matches).filter((match) => match.group === group.id)
      );
      return rows[0] && rows[0].played > 0 ? [rows[0].club] : [];
    }),
    champion: findChampionClub(tournament, matches),
    leagueWinner: findLeagueWinner(tournament, matches),
  };
};

/** Oldest first, so tables and charts read left to right in time. */
export const summarizeTournaments = (
  list: ITournamentWithMatches[]
): ITournamentSummary[] => [...list].sort(byNumber).map(summarizeTournament);

export const computeAllTimePlayers = (
  list: ITournamentWithMatches[]
): PlayerRecords =>
  sumPlayerRecords(
    list.map((t) => computePlayerRecords(t.tournament.clubs, t.matches))
  );

/** Every club that played in any tournament, with its per-tournament records. */
export const computeClubHistories = (
  list: ITournamentWithMatches[]
): IClubHistory[] => {
  const histories = new Map<string, IClubHistory>();

  [...list].sort(byNumber).forEach(({ tournament, matches }) => {
    const records = buildRecords(
      tournament.clubs.map((club) => club.id),
      matches
    );
    const reach = computePlayoffReach(matches);
    const championId = findChampionClub(tournament, matches)?.id;
    if (championId) reach.set(championId, "champion");
    tournament.groups.forEach((group) => {
      const rows = computeStandings(
        tournament.clubs.filter((club) => club.group === group.id),
        groupMatches(matches).filter((match) => match.group === group.id)
      );
      rows.forEach(({ club, position }) => {
        const record = records.get(club.id) ?? emptyRecord();
        const playoff = reach.get(club.id) ?? null;
        const history = histories.get(club.id) ?? {
          clubId: club.id,
          name: club.name,
          country: club.country,
          entries: [],
          total: emptyRecord(),
          timesByPlayer: { S: 0, V: 0 },
          titles: 0,
        };
        // Latest tournament wins for the display name.
        history.name = club.name;
        history.country = club.country ?? history.country;
        history.entries.push({ tournament, club, record, position, playoff });
        history.timesByPlayer[club.owner] += 1;
        if (playoff === "champion" && countsAsTitle(tournament)) {
          history.titles += 1;
        }
        histories.set(club.id, history);
      });
    });
  });

  histories.forEach((history) => {
    const total = emptyRecord();
    history.entries.forEach(({ record }) => {
      total.played += record.played;
      total.won += record.won;
      total.drawn += record.drawn;
      total.lost += record.lost;
      total.goalsFor += record.goalsFor;
      total.goalsAgainst += record.goalsAgainst;
      total.points += record.points;
    });
    total.goalDiff = total.goalsFor - total.goalsAgainst;
    history.total = total;
  });

  return [...histories.values()].sort(
    (a, b) =>
      b.total.points - a.total.points || b.total.goalDiff - a.total.goalDiff
  );
};

export const computeHeadToHead = (
  list: ITournamentWithMatches[],
  clubA: string,
  clubB: string
): IHeadToHead => {
  const h2h: IHeadToHead = {
    clubA,
    clubB,
    matches: [],
    winsA: 0,
    winsB: 0,
    draws: 0,
    goalsA: 0,
    goalsB: 0,
    tournamentCount: 0,
  };
  const record = emptyRecord();

  [...list].sort(byNumber).forEach(({ tournament, matches }) => {
    const between = matches
      .filter(isPlayed)
      .filter(
        (m) =>
          (m.home === clubA && m.away === clubB) ||
          (m.home === clubB && m.away === clubA)
      );
    if (between.length) h2h.tournamentCount += 1;
    between.forEach((match) => {
      h2h.matches.push({ tournament, match });
      const aIsHome = match.home === clubA;
      addResult(
        record,
        aIsHome ? match.result.home : match.result.away,
        aIsHome ? match.result.away : match.result.home
      );
    });
  });

  h2h.winsA = record.won;
  h2h.winsB = record.lost;
  h2h.draws = record.drawn;
  h2h.goalsA = record.goalsFor;
  h2h.goalsB = record.goalsAgainst;
  return h2h;
};

/** Club pairs that met in two or more tournaments, most frequent first. */
export const listRivalries = (
  list: ITournamentWithMatches[]
): IHeadToHead[] => {
  const tournamentsByPair = new Map<string, Set<string>>();
  list.forEach(({ tournament, matches }) =>
    matches.filter(isPlayed).forEach((match) => {
      const key = [match.home, match.away].sort().join("|");
      const set = tournamentsByPair.get(key) ?? new Set<string>();
      set.add(tournament.id);
      tournamentsByPair.set(key, set);
    })
  );

  return [...tournamentsByPair.entries()]
    .filter(([, tournaments]) => tournaments.size >= 2)
    .map(([key]) => {
      const [clubA, clubB] = key.split("|");
      return computeHeadToHead(list, clubA, clubB);
    })
    .sort((a, b) => b.matches.length - a.matches.length);
};

/** Latest known name per club id across all tournaments. */
export const buildClubNames = (
  tournaments: ITournament[]
): Map<string, string> => {
  const names = new Map<string, string>();
  [...tournaments]
    .sort((a, b) => a.number - b.number)
    .forEach((t) => t.clubs.forEach((club) => names.set(club.id, club.name)));
  return names;
};
