import { normalizeClubName } from "./clubNames";

import catalog from "@/constants/clubCatalog.json";

/** Crest and country of a club, from the catalog built by scripts/build-club-catalog.ts. */
export interface ICatalogClub {
  espnId: string;
  /** flag-icons code ("es", "gb-eng"), when the club's league is known. */
  country: string | null;
  dark: boolean;
}

const teams: Record<string, { country: string | null; dark: boolean }> =
  catalog.teams;
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

/** Crest image, resized by ESPN's CDN; the dark variant suits the dark theme. */
export const crestUrl = (club: ICatalogClub, pixels: number): string =>
  `https://a.espncdn.com/combiner/i?img=/i/teamlogos/soccer/${
    club.dark ? "500-dark" : "500"
  }/${club.espnId}.png&w=${pixels}&h=${pixels}`;
