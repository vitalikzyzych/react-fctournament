import { groupMatches, PLAYOFF_ROUND_IDS, playoffMatches } from "./playoff";
import type { IMatch, ITournament, ITournamentFile } from "./types";

/** Group matches by matchday and group, then the playoff round by round. */
export const sortMatches = (matches: IMatch[]): IMatch[] => {
  const group = groupMatches(matches).sort(
    (a, b) =>
      a.matchday - b.matchday ||
      a.group.localeCompare(b.group) ||
      a.id.localeCompare(b.id, undefined, { numeric: true })
  );
  const playoff = playoffMatches(matches).sort(
    (a, b) =>
      PLAYOFF_ROUND_IDS.indexOf(a.round) - PLAYOFF_ROUND_IDS.indexOf(b.round) ||
      a.tie - b.tie ||
      a.game - b.game
  );
  return [...group, ...playoff];
};

/** Only the fields of the exchange format (drops updatedAtMs and the like). */
const toFileMatch = (match: IMatch): IMatch =>
  match.stage === "group"
    ? {
        id: match.id,
        stage: match.stage,
        group: match.group,
        matchday: match.matchday,
        home: match.home,
        away: match.away,
        result: match.result,
      }
    : {
        id: match.id,
        stage: match.stage,
        round: match.round,
        tie: match.tie,
        game: match.game,
        home: match.home,
        away: match.away,
        result: match.result,
      };

/** Tournament back to the JSON exchange format, ready to save or hand to ChatGPT. */
export const toTournamentFile = (
  tournament: ITournament,
  matches: IMatch[]
): ITournamentFile => ({
  schemaVersion: tournament.schemaVersion,
  tournament: {
    id: tournament.id,
    number: tournament.number,
    name: tournament.name,
    game: tournament.game,
    format: tournament.format,
    status: tournament.status,
    ...(tournament.champion ? { champion: tournament.champion } : {}),
  },
  players: tournament.players,
  groups: tournament.groups,
  clubs: tournament.clubs,
  matches: sortMatches(matches).map(toFileMatch),
});

/** Club catalog to paste into ChatGPT so new files reuse the same club ids. */
export const toClubCatalog = (tournaments: ITournament[]) => {
  const clubs = new Map<
    string,
    { id: string; name: string; country?: string }
  >();
  [...tournaments]
    .sort((a, b) => a.number - b.number)
    .forEach((t) =>
      t.clubs.forEach(({ id, name, country }) =>
        clubs.set(id, { id, name, country })
      )
    );
  return [...clubs.values()].sort((a, b) => a.name.localeCompare(b.name));
};
