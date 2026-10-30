import { isLeagueFormat } from "./formats";
import { groupMatches } from "./playoff";
import { computeStandings, type IStandingRow } from "./standings";
import type { IClub, IMatch, ITournament } from "./types";

/** Clubs of each player that go to the playoff from a league table. */
export const LEAGUE_QUALIFIERS_PER_PLAYER = 4;

/** Where a club was drawn from: "Кошик 2" in a league, "Гр. A" otherwise. */
export const clubOrigin = (club: IClub): string =>
  club.pot ? `Кошик ${club.pot}` : `Гр. ${club.group}`;

/** Table of one group (the whole league in a league format). */
export const groupTable = (
  tournament: ITournament,
  matches: IMatch[],
  groupId: string
): IStandingRow[] =>
  computeStandings(
    tournament.clubs.filter((club) => club.group === groupId),
    groupMatches(matches).filter((match) => match.group === groupId)
  );

/**
 * Club ids suggested for the quarter-final draw: the 4 best S and the 4 best
 * V clubs of the league table, or the first two of every group.
 */
export const playoffQualifiers = (
  tournament: ITournament,
  matches: IMatch[]
): string[] => {
  const tables = tournament.groups.map((group) =>
    groupTable(tournament, matches, group.id)
  );
  if (!isLeagueFormat(tournament.format)) {
    return tables.flatMap((rows) =>
      rows.filter((row) => row.position <= 2).map((row) => row.club.id)
    );
  }
  const rows = tables.flat().sort((a, b) => a.position - b.position);
  return (["S", "V"] as const).flatMap((owner) =>
    rows
      .filter((row) => row.club.owner === owner)
      .slice(0, LEAGUE_QUALIFIERS_PER_PLAYER)
      .map((row) => row.club.id)
  );
};

/**
 * Winner of the league table, a champion next to the playoff champion. Set
 * once every league match is played; null for group formats.
 */
export const findLeagueWinner = (
  tournament: ITournament,
  matches: IMatch[]
): IClub | null => {
  if (!isLeagueFormat(tournament.format)) return null;
  const league = groupMatches(matches);
  if (!league.length || league.some((match) => match.result === null)) {
    return null;
  }
  const group = tournament.groups[0];
  return group
    ? (groupTable(tournament, matches, group.id)[0]?.club ?? null)
    : null;
};
