import type { TournamentFormat } from "./types";

export interface IFormatInfo {
  /** Short Ukrainian description for the import preview. */
  name: string;
  /**
   * One league table instead of groups. The league winner is a champion of
   * its own next to the playoff champion, and playoff pairs ignore groups.
   */
  league: boolean;
}

export const FORMAT_INFO: Record<TournamentFormat, IFormatInfo> = {
  "sv-groups-4x4": { name: "4 групи по 4 клуби", league: false },
  "sv-league-40": { name: "ліга на 40 клубів, 8 турів", league: true },
};

export const isLeagueFormat = (format: TournamentFormat): boolean =>
  FORMAT_INFO[format].league;
