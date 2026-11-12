import { isLeagueFormat } from "./formats";
import { groupMatches } from "./playoff";
import { computeStandings, type IStandingRow } from "./standings";
import {
  type IClub,
  type IMatch,
  type ITournament,
  PLAYER_IDS,
  type PlayerId,
} from "./types";

/** Clubs of each player that go straight to the round of 16 from a league. */
export const LEAGUE_QUALIFIERS_PER_PLAYER = 4;

/** Clubs of each player after those that play the knockout round. */
export const LEAGUE_KNOCKOUT_PER_PLAYER = 8;

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

/** League table rows of one player, best first. */
const leagueRows = (
  tournament: ITournament,
  matches: IMatch[],
  owner: PlayerId
): IStandingRow[] =>
  tournament.groups
    .flatMap((group) => groupTable(tournament, matches, group.id))
    .sort((a, b) => a.position - b.position)
    .filter((row) => row.club.owner === owner);

/**
 * Club ids with a playoff place: in a league the 4 best S and the 4 best V
 * clubs (straight to the round of 16), otherwise the first two of every
 * group (the quarter-finals).
 */
export const playoffQualifiers = (
  tournament: ITournament,
  matches: IMatch[]
): string[] => {
  if (!isLeagueFormat(tournament.format)) {
    return tournament.groups.flatMap((group) =>
      groupTable(tournament, matches, group.id)
        .filter((row) => row.position <= 2)
        .map((row) => row.club.id)
    );
  }
  return PLAYER_IDS.flatMap((owner) =>
    leagueRows(tournament, matches, owner)
      .slice(0, LEAGUE_QUALIFIERS_PER_PLAYER)
      .map((row) => row.club.id)
  );
};

/**
 * League clubs of the knockout round: the next 8 of each player after the
 * direct places (places 5 to 12 among the player's clubs). Empty for groups.
 */
export const leagueKnockoutClubs = (
  tournament: ITournament,
  matches: IMatch[]
): string[] => {
  if (!isLeagueFormat(tournament.format)) return [];
  return PLAYER_IDS.flatMap((owner) =>
    leagueRows(tournament, matches, owner)
      .slice(
        LEAGUE_QUALIFIERS_PER_PLAYER,
        LEAGUE_QUALIFIERS_PER_PLAYER + LEAGUE_KNOCKOUT_PER_PLAYER
      )
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
