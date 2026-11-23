import { isLeagueFormat } from "./formats";
import { findChampionClub } from "./history";
import {
  groupTable,
  LEAGUE_KNOCKOUT_PER_PLAYER,
  LEAGUE_QUALIFIERS_PER_PLAYER,
} from "./league";
import {
  computePlayoff,
  groupMatches,
  type IPlayoffTie,
  MAX_PLAYOFF_GAMES,
  playoffRounds,
} from "./playoff";
import {
  clubStrengths,
  expectedGoals,
  simulateByStrength,
  simulateTie,
} from "./tieChances";
import {
  type IClub,
  type IMatch,
  type ITournament,
  PLAYER_IDS,
  type PlayerId,
} from "./types";

/** Simulated rests of the tournament behind the title chances. */
export const TITLE_RUNS = 2000;

export interface ITitleRace {
  /** Clubs that won at least one simulated tournament, the likeliest first. */
  clubs: { club: IClub; chance: number }[];
  /** Chance of the trophy going to a club of each player. */
  players: Record<PlayerId, number>;
}

const shuffle = <T>(items: T[], random: () => number): T[] => {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
};

/**
 * Random pairs, an S club against a V club while both are left (as the
 * draws do), then whoever remains among themselves.
 */
const pairUp = (clubs: IClub[], random: () => number): [IClub, IClub][] => {
  const s = shuffle(
    clubs.filter((club) => club.owner === "S"),
    random
  );
  const v = shuffle(
    clubs.filter((club) => club.owner === "V"),
    random
  );
  const pairs: [IClub, IClub][] = [];
  while (s.length && v.length) {
    const a = s.pop();
    const b = v.pop();
    if (a && b) pairs.push([a, b]);
  }
  const rest = [...s, ...v];
  for (let i = 0; i + 1 < rest.length; i += 2) {
    pairs.push([rest[i], rest[i + 1]]);
  }
  return pairs;
};

/**
 * Chance of every club to win the tournament, from simulated rests of it:
 * the open group matches (scores from the clubs' strengths), then the
 * playoff round by round. Ties already picked are kept with their played
 * games; empty ties are drawn from the clubs the table or the round before
 * sends through, S against V where possible. Null before the first result
 * and once the champion is known.
 */
export const computeTitleRace = (
  tournament: ITournament,
  matches: IMatch[],
  random: () => number,
  runs = TITLE_RUNS
): ITitleRace | null => {
  if (!matches.some((match) => match.result !== null)) return null;
  if (findChampionClub(tournament, matches)) return null;

  const league = isLeagueFormat(tournament.format);
  const strengths = clubStrengths(matches);
  const clubsById = new Map(tournament.clubs.map((club) => [club.id, club]));
  const clubsOf = (ids: string[]) =>
    ids.flatMap((id) => clubsById.get(id) ?? []);
  const group = groupMatches(matches);
  const groupOpen = group.some((match) => match.result === null);
  const rounds = playoffRounds(league);
  const ties = computePlayoff(matches, league);

  /** Clubs the group stage sends on: straight places, and a league's KO. */
  const fromTables = (results: IMatch[]) => {
    const rows = tournament.groups.flatMap((g) =>
      groupTable(tournament, results, g.id)
    );
    if (!league) {
      return {
        direct: rows.filter((row) => row.position <= 2).map((row) => row.club),
        knockout: [],
      };
    }
    const sorted = [...rows].sort((a, b) => a.position - b.position);
    const own = (owner: PlayerId) =>
      sorted.filter((row) => row.club.owner === owner).map((row) => row.club);
    const last = LEAGUE_QUALIFIERS_PER_PLAYER + LEAGUE_KNOCKOUT_PER_PLAYER;
    return {
      direct: PLAYER_IDS.flatMap((owner) =>
        own(owner).slice(0, LEAGUE_QUALIFIERS_PER_PLAYER)
      ),
      knockout: PLAYER_IDS.flatMap((owner) =>
        own(owner).slice(LEAGUE_QUALIFIERS_PER_PLAYER, last)
      ),
    };
  };
  const fixedTables = groupOpen ? null : fromTables(group);

  const means = new Map<string, number>();
  const mean = (club: string, opponent: string) => {
    const key = `${club}|${opponent}`;
    let value = means.get(key);
    if (value === undefined) {
      value = expectedGoals(strengths, club, opponent);
      means.set(key, value);
    }
    return value;
  };
  const playTie = (tie: IPlayoffTie): IClub | undefined => {
    if (!tie.home || !tie.away) return undefined;
    if (tie.winner) return clubsById.get(tie.winner);
    const open = tie.games.filter((game) => game.result === null).length;
    const first = simulateTie(
      mean(tie.home, tie.away),
      mean(tie.away, tie.home),
      tie.aggregate,
      open,
      MAX_PLAYOFF_GAMES - tie.games.length,
      random
    );
    return clubsById.get(first ? tie.home : tie.away);
  };
  const playPair = (a: IClub, b: IClub, legs: number): IClub =>
    simulateTie(
      mean(a.id, b.id),
      mean(b.id, a.id),
      { home: 0, away: 0 },
      legs,
      MAX_PLAYOFF_GAMES - legs,
      random
    )
      ? a
      : b;

  const wins = new Map<string, number>();
  for (let run = 0; run < runs; run += 1) {
    const tables =
      fixedTables ?? fromTables(simulateByStrength(group, strengths, random));
    let winners: IClub[] = [];
    rounds.forEach((round, index) => {
      const set = ties.filter(
        (tie) => tie.round === round.id && tie.home && tie.away
      );
      const taken = new Set(set.flatMap((tie) => [tie.home, tie.away]));
      const free = (clubs: IClub[]) =>
        clubs.filter((club) => !taken.has(club.id));
      let pairs: [IClub, IClub][];
      if (index === 0) {
        pairs = pairUp(free(league ? tables.knockout : tables.direct), random);
      } else if (round.id === "R16") {
        // Every direct club meets a winner of the knockout round.
        const direct = shuffle(free(tables.direct), random);
        const rest = free(winners);
        pairs = direct.flatMap((club): [IClub, IClub][] => {
          const other = rest.findIndex((w) => w.owner !== club.owner);
          const [rival] = rest.splice(other === -1 ? 0 : other, 1);
          return rival ? [[rival, club]] : [];
        });
      } else {
        pairs = pairUp(free(winners), random);
      }
      winners = [
        ...set.flatMap((tie) => playTie(tie) ?? []),
        ...pairs
          .slice(0, Math.max(0, round.ties - set.length))
          .map(([a, b]) => playPair(a, b, round.legs)),
      ];
    });
    const champion = winners[0];
    if (champion) wins.set(champion.id, (wins.get(champion.id) ?? 0) + 1);
  }

  const total = [...wins.values()].reduce((sum, n) => sum + n, 0);
  if (!total) return null;
  const clubs = clubsOf([...wins.keys()])
    .map((club) => ({ club, chance: (wins.get(club.id) ?? 0) / total }))
    .sort((a, b) => b.chance - a.chance);
  const share = (owner: PlayerId) =>
    clubs
      .filter(({ club }) => club.owner === owner)
      .reduce((sum, { chance }) => sum + chance, 0);
  return { clubs, players: { S: share("S"), V: share("V") } };
};
