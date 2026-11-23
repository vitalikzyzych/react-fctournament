import { countsAsTitle, findChampionClub } from "./history";
import { matchWinner, ownersOf } from "./insights";
import {
  computePlayoffReach,
  PLAYOFF_ROUNDS,
  roundName,
  statMatches,
} from "./playoff";
import { playedChronologically } from "./sessions";
import {
  addResult,
  emptyRecord,
  type IPlayedMatch,
  isPlayed,
} from "./standings";
import {
  computePlayerRecords,
  computeTournamentStats,
  type PlayerRecords,
  sumPlayerRecords,
} from "./stats";
import {
  type IClub,
  type IMatch,
  type ITournament,
  type ITournamentWithMatches,
  PLAYER_IDS,
  type PlayerId,
} from "./types";

const byNumber = (a: ITournamentWithMatches, b: ITournamentWithMatches) =>
  a.tournament.number - b.tournament.number;

// ---------------------------------------------------------------------------
// Record book

export interface IRecordEntry {
  id: string;
  label: string;
  value: string;
  club?: IClub;
  player?: PlayerId;
  tournament: ITournament;
  match?: IPlayedMatch;
}

export interface ITournamentMatch {
  tournament: ITournament;
  match: IPlayedMatch;
}

export interface IRecordBook {
  records: IRecordEntry[];
  biggestWins: ITournamentMatch[];
  highestScoring: ITournamentMatch[];
}

const margin = (match: IPlayedMatch) =>
  Math.abs(match.result.home - match.result.away);
const goalsIn = (match: IPlayedMatch) => match.result.home + match.result.away;

/** Matches a player needs in a tournament for its win share to count. */
const BEST_TOURNAMENT_MIN_MATCHES = 10;
const TOP = 5;

/** The longest run of S against V wins of each player in a tournament. */
const playerWinRuns = (
  tournament: ITournament,
  matches: IMatch[]
): Record<PlayerId, number> => {
  const owners = ownersOf(tournament.clubs);
  const best = { S: 0, V: 0 };
  const run = { S: 0, V: 0 };
  playedChronologically(matches).forEach((match) => {
    const home = owners.get(match.home);
    const away = owners.get(match.away);
    if (!home || !away || home === away) return;
    const winner = matchWinner(match, owners);
    PLAYER_IDS.forEach((player) => {
      run[player] = winner === player ? run[player] + 1 : 0;
      best[player] = Math.max(best[player], run[player]);
    });
  });
  return best;
};

/**
 * The best of everything over all tournaments: the biggest win, the match
 * with the most goals, the longest runs, the best tournament of a club and
 * of a player. A record is kept by whoever set it first.
 */
export const computeRecordBook = (
  list: ITournamentWithMatches[],
  includePlayoff = true
): IRecordBook => {
  const records = new Map<string, IRecordEntry & { score: number }>();
  const offer = (entry: IRecordEntry, score: number) => {
    const current = records.get(entry.id);
    if (score > 0 && (!current || score > current.score)) {
      records.set(entry.id, { ...entry, score });
    }
  };
  const all: ITournamentMatch[] = [];

  [...list].sort(byNumber).forEach(({ tournament, matches }) => {
    const counted = statMatches(matches, includePlayoff);
    const played = counted.filter(isPlayed);
    if (!played.length) return;
    played.forEach((match) => all.push({ tournament, match }));
    const stats = computeTournamentStats(tournament.clubs, counted);

    const win = stats.winStreaks[0];
    if (win) {
      offer(
        {
          id: "clubWins",
          label: "Найдовша серія перемог клубу",
          value: `${win.count} поспіль`,
          club: win.club,
          tournament,
        },
        win.count
      );
    }
    const unbeaten = stats.unbeatenStreaks[0];
    if (unbeaten) {
      offer(
        {
          id: "clubUnbeaten",
          label: "Найдовша серія клубу без поразок",
          value: `${unbeaten.count} поспіль`,
          club: unbeaten.club,
          tournament,
        },
        unbeaten.count
      );
    }
    stats.clubs.forEach((club) => {
      offer(
        {
          id: "clubGoals",
          label: "Найбільше голів клубу за турнір",
          value: `${club.goalsFor} у ${club.played} матчах`,
          club: club.club,
          tournament,
        },
        club.goalsFor
      );
      offer(
        {
          id: "clubPoints",
          label: "Найбільше перемог клубу за турнір",
          value: `${club.won} із ${club.played}`,
          club: club.club,
          tournament,
        },
        club.won
      );
    });
    const runs = playerWinRuns(tournament, counted);
    PLAYER_IDS.forEach((player) => {
      offer(
        {
          id: "playerRun",
          label: "Найдовша серія перемог гравця",
          value: `${runs[player]} поспіль`,
          player,
          tournament,
        },
        runs[player]
      );
      const record = stats.players[player];
      if (record.played >= BEST_TOURNAMENT_MIN_MATCHES) {
        offer(
          {
            id: "playerShare",
            label: "Найкращий турнір гравця",
            value: `${Math.round(record.winRate * 100)}% перемог (${record.won} із ${record.played})`,
            player,
            tournament,
          },
          record.winRate
        );
      }
      offer(
        {
          id: "playerGoals",
          label: "Найбільше голів гравця за турнір",
          value: `${record.goalsFor} у ${record.played} матчах`,
          player,
          tournament,
        },
        record.goalsFor
      );
    });
    offer(
      {
        id: "goalsPerMatch",
        label: "Найрезультативніший турнір",
        value: `${stats.avgGoals.toFixed(2).replace(".", ",")} гола за матч`,
        tournament,
      },
      stats.avgGoals
    );
  });

  const biggestWins = all
    .filter(({ match }) => margin(match) > 0)
    .sort(
      (a, b) =>
        margin(b.match) - margin(a.match) || goalsIn(b.match) - goalsIn(a.match)
    )
    .slice(0, TOP);
  const highestScoring = [...all]
    .sort(
      (a, b) =>
        goalsIn(b.match) - goalsIn(a.match) || margin(a.match) - margin(b.match)
    )
    .slice(0, TOP);
  return {
    records: [...records.values()].map(({ score: _score, ...entry }) => entry),
    biggestWins,
    highestScoring,
  };
};

// ---------------------------------------------------------------------------
// Medals

export interface IMedals {
  gold: number;
  silver: number;
  bronze: number;
}

export interface IMedalRow extends IMedals {
  clubId: string;
  name: string;
  country?: string;
}

export interface IMedalTable {
  clubs: IMedalRow[];
  players: Record<PlayerId, IMedals>;
}

/**
 * Medals of completed tournaments: gold for the champion, silver for the
 * other finalist, bronze for both losing semi-finalists.
 */
export const computeMedals = (list: ITournamentWithMatches[]): IMedalTable => {
  const clubs = new Map<string, IMedalRow>();
  const players: Record<PlayerId, IMedals> = {
    S: { gold: 0, silver: 0, bronze: 0 },
    V: { gold: 0, silver: 0, bronze: 0 },
  };
  [...list].sort(byNumber).forEach(({ tournament, matches }) => {
    if (!countsAsTitle(tournament)) return;
    const reach = computePlayoffReach(matches);
    const champion = findChampionClub(tournament, matches);
    if (champion) reach.set(champion.id, "champion");
    tournament.clubs.forEach((club) => {
      const stage = reach.get(club.id);
      const medal =
        stage === "champion"
          ? "gold"
          : stage === "F"
            ? "silver"
            : stage === "SF"
              ? "bronze"
              : null;
      if (!medal) return;
      const row = clubs.get(club.id) ?? {
        clubId: club.id,
        name: club.name,
        country: club.country,
        gold: 0,
        silver: 0,
        bronze: 0,
      };
      row.name = club.name;
      row[medal] += 1;
      clubs.set(club.id, row);
      players[club.owner][medal] += 1;
    });
  });
  return {
    clubs: [...clubs.values()].sort(
      (a, b) =>
        b.gold - a.gold ||
        b.silver - a.silver ||
        b.bronze - a.bronze ||
        a.name.localeCompare(b.name)
    ),
    players,
  };
};

// ---------------------------------------------------------------------------
// S against V by category

export interface ICategoryRow {
  key: string;
  label: string;
  records: PlayerRecords;
}

/** One match from one player's side. */
interface IMatchSide {
  scored: number;
  conceded: number;
}

type SideStore = Map<string, Record<PlayerId, IMatchSide[]>>;

export interface ICategories {
  /** Group stage, then every playoff round that was played. */
  stages: ICategoryRow[];
  /** Each player's record with clubs of a country, most matches first. */
  countries: ICategoryRow[];
  /** League pots: each player's record with clubs of a pot. */
  pots: ICategoryRow[];
}

/**
 * S and V records split three ways. A stage row holds the matches of that
 * stage. A country or pot row holds, for each player, the matches of that
 * player's own clubs of the country or pot, so the two sides of a row are
 * different matches: "S with Spanish clubs" against "V with Spanish clubs".
 */
export const computeCategories = (
  list: ITournamentWithMatches[],
  countryOf: (club: IClub) => string | undefined,
  includePlayoff = true
): ICategories => {
  const stages = new Map<string, PlayerRecords[]>();
  const countries: SideStore = new Map();
  const pots: SideStore = new Map();
  const push = (
    store: SideStore,
    key: string | undefined,
    player: PlayerId,
    side: IMatchSide
  ) => {
    if (!key) return;
    const entry = store.get(key) ?? { S: [], V: [] };
    entry[player].push(side);
    store.set(key, entry);
  };

  [...list].sort(byNumber).forEach(({ tournament, matches }) => {
    const counted = statMatches(matches, includePlayoff).filter(isPlayed);
    const clubs = new Map(tournament.clubs.map((club) => [club.id, club]));
    const stageOf = (match: IMatch) =>
      match.stage === "group" ? "group" : match.round;
    [...new Set(counted.map(stageOf))].forEach((stage) => {
      const records = computePlayerRecords(
        tournament.clubs,
        counted.filter((match) => stageOf(match) === stage)
      );
      stages.set(stage, [...(stages.get(stage) ?? []), records]);
    });
    counted.forEach((match) => {
      const home = clubs.get(match.home);
      const away = clubs.get(match.away);
      if (!home || !away || home.owner === away.owner) return;
      const homeSide = {
        scored: match.result.home,
        conceded: match.result.away,
      };
      const awaySide = {
        scored: match.result.away,
        conceded: match.result.home,
      };
      push(countries, countryOf(home), home.owner, homeSide);
      push(countries, countryOf(away), away.owner, awaySide);
      push(pots, home.pot ? String(home.pot) : undefined, home.owner, homeSide);
      push(pots, away.pot ? String(away.pot) : undefined, away.owner, awaySide);
    });
  });

  const toRecords = (entry: Record<PlayerId, IMatchSide[]>): PlayerRecords => {
    const of = (player: PlayerId) => {
      const record = emptyRecord();
      entry[player].forEach(({ scored, conceded }) =>
        addResult(record, scored, conceded)
      );
      return {
        ...record,
        player,
        winRate: record.played ? record.won / record.played : 0,
      };
    };
    return { S: of("S"), V: of("V") };
  };
  const rows = (
    store: SideStore,
    label: (key: string) => string
  ): ICategoryRow[] =>
    [...store.entries()].map(([key, entry]) => ({
      key,
      label: label(key),
      records: toRecords(entry),
    }));
  const order = ["group", ...PLAYOFF_ROUNDS.map((round) => round.id)];

  return {
    stages: order.flatMap((key) => {
      const records = stages.get(key);
      if (!records) return [];
      const round = PLAYOFF_ROUNDS.find((r) => r.id === key);
      return [
        {
          key,
          label: round ? roundName(round.id) : "Груповий етап / ліга",
          records: sumPlayerRecords(records),
        },
      ];
    }),
    countries: rows(countries, (key) => key).sort(
      (a, b) =>
        b.records.S.played +
        b.records.V.played -
        (a.records.S.played + a.records.V.played)
    ),
    pots: rows(pots, (key) => `Кошик ${key}`).sort((a, b) =>
      a.key.localeCompare(b.key)
    ),
  };
};

// ---------------------------------------------------------------------------
// The same stage of earlier tournaments

export interface ISameStage {
  /** Played matches of the current tournament, the point of comparison. */
  played: number;
  /** The current tournament first, then earlier ones, newest first. */
  rows: { tournament: ITournament; records: PlayerRecords }[];
}

/**
 * S and V after the same number of matches in every earlier tournament that
 * got that far: "after 40 matches last time S had 22 wins". Null without a
 * result or without an earlier tournament to compare with.
 */
export const computeSameStage = (
  list: ITournamentWithMatches[],
  current: ITournament
): ISameStage | null => {
  const own = list.find((item) => item.tournament.id === current.id);
  const played = own ? own.matches.filter(isPlayed).length : 0;
  if (!own || !played) return null;
  const rows = list
    .filter(
      ({ tournament, matches }) =>
        tournament.number <= current.number &&
        matches.filter(isPlayed).length >= played
    )
    .sort((a, b) => b.tournament.number - a.tournament.number)
    .map(({ tournament, matches }) => ({
      tournament,
      records: computePlayerRecords(
        tournament.clubs,
        playedChronologically(matches).slice(0, played)
      ),
    }));
  return rows.length > 1 ? { played, rows } : null;
};
