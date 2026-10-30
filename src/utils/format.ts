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

export const formatSigned = (n: number): string =>
  n > 0 ? `+${n}` : String(n);

export const formatAverage = (n: number): string =>
  n.toFixed(2).replace(".", ",");
