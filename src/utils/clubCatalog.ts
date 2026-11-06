import { normalizeClubName } from "./clubNames";

import catalog from "@/constants/clubCatalog.json";

/** Crest and country of a club, from the catalog built by scripts/build-club-catalog.ts. */
export interface ICatalogClub {
  espnId: string;
  /** flag-icons code ("es", "gb-eng"), when the club's league is known. */
  country: string | null;
  dark: boolean;
  /** National team: ESPN's lowercase abbreviation ("arg"), for its image. */
  nation?: string;
}

const teams: Record<
  string,
  { country: string | null; dark: boolean; nation?: string }
> = catalog.teams;
const names: Record<string, string> = catalog.names;
const cache = new Map<string, ICatalogClub | null>();

/** Looks the club up by id ("atletico-madrid"), then by name ("Atlético Madrid"). */
export const findCatalogClub = (
  clubId: string | undefined,
  name: string
): ICatalogClub | null => {
  const cacheKey = `${clubId ?? ""}|${name}`;
  const cached = cache.get(cacheKey);
  if (cached !== undefined) return cached;

  const espnId =
    (clubId && names[normalizeClubName(clubId)]) ||
    names[normalizeClubName(name)];
  const team = espnId ? teams[espnId] : undefined;
  const found = espnId && team ? { espnId, ...team } : null;
  cache.set(cacheKey, found);
  return found;
};

/**
 * Crest image, resized by ESPN's CDN; the dark variant suits the dark theme.
 * National teams have theirs under "countries", by abbreviation.
 */
export const crestUrl = (club: ICatalogClub, pixels: number): string => {
  const size = club.dark ? "500-dark" : "500";
  const path = club.nation
    ? `countries/${size}/${club.nation}`
    : `soccer/${size}/${club.espnId}`;
  return `https://a.espncdn.com/combiner/i?img=/i/teamlogos/${path}.png&w=${pixels}&h=${pixels}`;
};
