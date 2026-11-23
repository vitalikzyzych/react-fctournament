import type { IScore } from "@/domain";

/** Ukrainian plural: plural(5, ["матч", "матчі", "матчів"]) gives "матчів". */
export const plural = (
  n: number,
  [one, few, many]: [string, string, string]
): string => {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
  return many;
};

export const formatPercent = (share: number): string =>
  `${Math.round(share * 100)}%`;

export const formatScore = (score: IScore | null): string =>
  score ? `${score.home}:${score.away}` : "–:–";

/** "<1%" and ">99%" at the ends: a simulation proves nothing for sure. */
export const formatChance = (chance: number): string => {
  if (chance < 0.005) return "<1%";
  if (chance > 0.995) return ">99%";
  return `${Math.round(chance * 100)}%`;
};

export const formatSigned = (n: number): string =>
  n > 0 ? `+${n}` : String(n);

export const formatAverage = (n: number): string =>
  n.toFixed(2).replace(".", ",");

const sameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

/** "21:40" for today, otherwise "12.03 21:40". */
export const formatMatchTime = (ms: number): string => {
  const date = new Date(ms);
  const time = date.toLocaleTimeString("uk-UA", {
    hour: "2-digit",
    minute: "2-digit",
  });
  if (sameDay(date, new Date())) return time;
  const day = date.toLocaleDateString("uk-UA", {
    day: "2-digit",
    month: "2-digit",
  });
  return `${day} ${time}`;
};

/** "12 березня 2026": the day of a session. */
export const formatDay = (ms: number): string =>
  new Date(ms).toLocaleDateString("uk-UA", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

/** "2 год 15 хв" or "45 хв". */
export const formatDuration = (ms: number): string => {
  const minutes = Math.round(ms / 60000);
  const hours = Math.floor(minutes / 60);
  return hours ? `${hours} год ${minutes % 60} хв` : `${minutes} хв`;
};
