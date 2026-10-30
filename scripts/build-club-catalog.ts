/**
 * Builds src/constants/clubCatalog.json: club crests and countries, matched by
 * club name. Source: ESPN's public team lists per league (no API key). ESPN
 * sends no CORS headers, so the app cannot ask it directly; run this script
 * when new clubs show up and commit the result:
 *
 *   npm run club-catalog                 # rebuild
 *   npm run club-catalog -- clubs.json   # rebuild and report clubs without a crest
 *
 * clubs.json is the club list from the app (Import / Export, "Завантажити
 * clubs.json"). Clubs it cannot match get an entry in ALIASES below.
 */
import { readFileSync, writeFileSync } from "node:fs";

import { normalizeClubName } from "../src/utils/clubNames.ts";

/** ESPN league slug and the flag-icons country code of its clubs. */
const LEAGUES: [string, string | null][] = [
  ["eng.1", "gb-eng"],
  ["eng.2", "gb-eng"],
  ["esp.1", "es"],
  ["esp.2", "es"],
  ["ger.1", "de"],
  ["ger.2", "de"],
  ["ita.1", "it"],
  ["ita.2", "it"],
  ["fra.1", "fr"],
  ["fra.2", "fr"],
  ["por.1", "pt"],
  ["ned.1", "nl"],
  ["bel.1", "be"],
  ["tur.1", "tr"],
  ["sco.1", "gb-sct"],
  ["gre.1", "gr"],
  ["den.1", "dk"],
  ["sui.1", "ch"],
  ["aut.1", "at"],
  ["nor.1", "no"],
  ["swe.1", "se"],
  ["ksa.1", "sa"],
  ["usa.1", null],
  ["bra.1", "br"],
  ["arg.1", "ar"],
  ["mex.1", "mx"],
  // Last: clubs from leagues not listed above (Ukraine, Czechia, Croatia, ...).
  ["uefa.champions", null],
  ["uefa.europa", null],
  ["uefa.europa.conf", null],
];

/** Our name (as the app or ChatGPT writes it) to the ESPN display name. */
const ALIASES: Record<string, string> = {
  Inter: "Internazionale",
  Bayern: "Bayern Munich",
  Dortmund: "Borussia Dortmund",
  Leverkusen: "Bayer Leverkusen",
  Shakhtar: "Shakhtar Donetsk",
  AEK: "AEK Athens",
};

interface IEspnTeam {
  id: string;
  slug: string;
  displayName: string;
  shortDisplayName: string;
  name: string;
  location: string;
  logos?: { rel: string[] }[];
}

interface IEspnTeamsResponse {
  sports?: { leagues?: { teams?: { team: IEspnTeam }[] }[] }[];
}

interface ICatalogTeam {
  name: string;
  country: string | null;
  /** ESPN has a version drawn for dark backgrounds. */
  dark: boolean;
}

const fetchLeague = async (league: string): Promise<IEspnTeam[]> => {
  const response = await fetch(
    `https://site.api.espn.com/apis/site/v2/sports/soccer/${league}/teams`
  );
  if (!response.ok) throw new Error(`${league}: HTTP ${response.status}`);
  // Parsed JSON from ESPN; the fields used below are optional-chained.
  const data = (await response.json()) as IEspnTeamsResponse;
  return (data.sports?.[0]?.leagues?.[0]?.teams ?? []).map(
    (entry) => entry.team
  );
};

const teams = new Map<string, ICatalogTeam>();
const names = new Map<string, string>();
const clashes = new Set<string>();

const addName = (name: string, id: string) => {
  const key = normalizeClubName(name);
  if (!key) return;
  const existing = names.get(key);
  if (existing && existing !== id) {
    clashes.add(
      `"${key}": ${teams.get(existing)?.name} / ${teams.get(id)?.name}`
    );
    return;
  }
  names.set(key, id);
};

for (const [league, country] of LEAGUES) {
  let leagueTeams: IEspnTeam[];
  try {
    leagueTeams = await fetchLeague(league);
  } catch (error) {
    console.warn(`skipped ${league}: ${String(error)}`);
    continue;
  }
  for (const team of leagueTeams) {
    const known = teams.get(team.id);
    if (!known) {
      teams.set(team.id, {
        name: team.displayName,
        country,
        dark: (team.logos ?? []).some((logo) => logo.rel.includes("dark")),
      });
    } else if (!known.country && country) {
      known.country = country;
    }
    const slugName = team.slug.split(".").slice(1).join(" ").replace(/_/g, " ");
    [
      team.displayName,
      team.shortDisplayName,
      team.name,
      team.location,
      slugName,
    ].forEach((name) => addName(name, team.id));
  }
  console.log(`${league}: ${leagueTeams.length} clubs`);
}

const idByDisplayName = new Map(
  [...teams].map(([id, team]) => [normalizeClubName(team.name), id])
);
for (const [alias, target] of Object.entries(ALIASES)) {
  const id = idByDisplayName.get(normalizeClubName(target));
  if (id) names.set(normalizeClubName(alias), id);
  else console.warn(`alias "${alias}": no ESPN club "${target}"`);
}

const sortedEntries = <T>(map: Map<string, T>) =>
  Object.fromEntries([...map].sort(([a], [b]) => a.localeCompare(b)));

writeFileSync(
  "src/constants/clubCatalog.json",
  `${JSON.stringify(
    {
      source: "ESPN",
      teams: sortedEntries(teams),
      names: sortedEntries(names),
    },
    null,
    2
  )}\n`
);
console.log(`\n${teams.size} clubs, ${names.size} names`);
if (clashes.size) {
  console.log(`name clashes (first kept):\n  ${[...clashes].join("\n  ")}`);
}

const clubsFile = process.argv[2];
if (clubsFile) {
  const clubs: { id: string; name: string }[] = JSON.parse(
    readFileSync(clubsFile, "utf8")
  );
  const missing = clubs.filter(
    (club) =>
      !names.has(normalizeClubName(club.id)) &&
      !names.has(normalizeClubName(club.name))
  );
  console.log(
    `\n${clubs.length - missing.length} of ${clubs.length} clubs matched` +
      (missing.length
        ? `, missing:\n  ${missing.map((c) => `${c.name} (${c.id})`).join("\n  ")}`
        : "")
  );
}
