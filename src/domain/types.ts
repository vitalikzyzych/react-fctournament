export const SCHEMA_VERSION = 1;

export type PlayerId = "S" | "V";
export const PLAYER_IDS: PlayerId[] = ["S", "V"];

export type TournamentStatus = "planned" | "active" | "completed";

/**
 * Tournament formats the app knows how to validate. Each format adds its own
 * structural rules on top of the generic checks (see validateFormat.ts).
 */
export type TournamentFormat = "sv-groups-4x4" | "sv-league-40";
export const TOURNAMENT_FORMATS: TournamentFormat[] = [
  "sv-groups-4x4",
  "sv-league-40",
];

/** Group stage, then a playoff (quarter-finals, semi-finals, final). */
export type MatchStage = "group" | "playoff";

/** Playoff rounds in order: 4 quarter-final ties, 2 semi-final ties, 1 final. */
export type PlayoffRound = "QF" | "SF" | "F";

export interface IPlayer {
  id: PlayerId;
  name: string;
}

export interface IGroup {
  id: string;
  name: string;
}

/** A club as it took part in one tournament. Ownership is per tournament. */
export interface IClub {
  id: string;
  name: string;
  country?: string;
  owner: PlayerId;
  group: string;
  /** League formats: the pot (1 to 4) the club was drawn from. */
  pot?: number;
  /** League formats: pot, owner and number in the pot, "1S-1", "3V-2". */
  code?: string;
}

/** Final score. `null` on a match means it is not played yet; 0:0 is a result. */
export interface IScore {
  home: number;
  away: number;
}

export interface IGroupMatch {
  id: string;
  stage: "group";
  group: string;
  matchday: number;
  home: string;
  away: string;
  result: IScore | null;
}

/**
 * One game of a playoff tie. A tie is the pair of clubs in one slot of a round
 * (`round` + `tie`). A drawn game is replayed: the next game of the same tie
 * (`game` 2, 3, ...) between the same clubs, until one of them wins.
 * Teams are picked by hand, so a later round does not depend on earlier ones.
 */
export interface IPlayoffMatch {
  id: string;
  stage: "playoff";
  round: PlayoffRound;
  tie: number;
  game: number;
  home: string;
  away: string;
  result: IScore | null;
}

export type IMatch = IGroupMatch | IPlayoffMatch;

export interface ITournamentInfo {
  id: string;
  number: number;
  name: string;
  game: string;
  format: TournamentFormat;
  status: TournamentStatus;
  /**
   * Champion picked by hand (club id), for a tournament whose final was not
   * played. The winner of a decided final always takes precedence.
   */
  champion?: string | null;
}

/** Tournament document as stored in Firestore (matches live in a subcollection). */
export interface ITournament extends ITournamentInfo {
  champion: string | null;
  schemaVersion: number;
  players: IPlayer[];
  groups: IGroup[];
  clubs: IClub[];
}

/** Match as read from Firestore, with the time of the last result change. */
export type IStoredMatch = IMatch & { updatedAtMs: number | null };

/** The JSON exchange format, version 1. See docs/json-format.md. */
export interface ITournamentFile {
  schemaVersion: number;
  tournament: ITournamentInfo;
  players: IPlayer[];
  groups: IGroup[];
  clubs: IClub[];
  matches: IMatch[];
}

/** A tournament together with its matches, the unit most calculations work on. */
export interface ITournamentWithMatches {
  tournament: ITournament;
  matches: IMatch[];
}
