/**
 * Club name matching shared by the app and scripts/build-club-catalog.ts.
 * Keep this file free of imports: the script runs it directly with Node.
 */

/** Words that only say "club" and differ between sources (FC, CF, AC, SSC, ...). */
const NOISE = new Set([
  "fc",
  "cf",
  "afc",
  "sc",
  "ac",
  "as",
  "ssc",
  "ss",
  "cd",
  "sl",
  "rc",
  "ud",
  "sv",
  "fk",
  "sk",
  "cp",
  "club",
  "calcio",
  "futbol",
]);

/** "Atlético Madrid", "atletico-madrid", "Club Atlético de Madrid" side by side. */
export const normalizeClubName = (value: string): string => {
  const words = value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/ß/g, "ss")
    .replace(/ı/g, "i")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean);
  const meaningful = words.filter((word) => !NOISE.has(word));
  return (meaningful.length ? meaningful : words).join(" ");
};
