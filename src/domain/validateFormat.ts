import { groupMatches } from "./playoff";
import type { ITournamentFile, TournamentFormat } from "./types";

/**
 * "sv-groups-4x4": 16 clubs, 8 per player, 4 groups of 2 S + 2 V clubs.
 * Only S vs V matches, every pair home and away, 4 matchdays, each club plays
 * once per matchday. 8 matches per group, 32 in total.
 */
const validateSvGroups4x4 = (file: ITournamentFile): string[] => {
  const errors: string[] = [];
  // The playoff is free-form (teams picked by hand), so only the group stage
  // has format rules.
  const matches = groupMatches(file.matches);
  const ownerOf = new Map(file.clubs.map((club) => [club.id, club.owner]));

  if (file.groups.length !== 4)
    errors.push(`Потрібно 4 групи, у файлі ${file.groups.length}`);
  if (file.clubs.length !== 16)
    errors.push(`Потрібно 16 клубів, у файлі ${file.clubs.length}`);
  if (matches.length !== 32) {
    errors.push(`Потрібно 32 матчі групового етапу, у файлі ${matches.length}`);
  }

  file.groups.forEach((group) => {
    const clubs = file.clubs.filter((club) => club.group === group.id);
    const s = clubs.filter((club) => club.owner === "S").length;
    const v = clubs.filter((club) => club.owner === "V").length;
    if (clubs.length !== 4 || s !== 2 || v !== 2) {
      errors.push(
        `Група ${group.id}: потрібно 2 клуби S і 2 клуби V, зараз S: ${s}, V: ${v}`
      );
    }

    const inGroup = matches.filter((match) => match.group === group.id);
    const pairs = new Set<string>();
    inGroup.forEach((match) => {
      if (ownerOf.get(match.home) === ownerOf.get(match.away)) {
        errors.push(
          `Матч "${match.id}": клуби одного гравця (${ownerOf.get(match.home)}) не грають між собою`
        );
      }
      const pair = `${match.home}>${match.away}`;
      if (pairs.has(pair)) {
        errors.push(
          `Матч "${match.id}": пара ${match.home} (вдома) проти ${match.away} повторюється`
        );
      }
      pairs.add(pair);
    });
    if (inGroup.length !== 8) {
      errors.push(
        `Група ${group.id}: потрібно 8 матчів, зараз ${inGroup.length}`
      );
    }
  });

  const matchdays = [...new Set(matches.map((match) => match.matchday))].sort(
    (a, b) => a - b
  );
  if (matchdays.join(",") !== "1,2,3,4") {
    errors.push(`Потрібні тури 1, 2, 3, 4, у файлі: ${matchdays.join(", ")}`);
  }

  matchdays.forEach((matchday) => {
    const counts = new Map<string, number>();
    matches
      .filter((match) => match.matchday === matchday)
      .forEach((match) =>
        [match.home, match.away].forEach((id) =>
          counts.set(id, (counts.get(id) ?? 0) + 1)
        )
      );
    file.clubs.forEach((club) => {
      const count = counts.get(club.id) ?? 0;
      if (count !== 1) {
        errors.push(
          `Тур ${matchday}: клуб "${club.id}" грає ${count} раз(и), має грати 1`
        );
      }
    });
  });

  return errors;
};

const FORMAT_VALIDATORS: Record<
  TournamentFormat,
  (file: ITournamentFile) => string[]
> = {
  "sv-groups-4x4": validateSvGroups4x4,
};

export const validateFormat = (file: ITournamentFile): string[] =>
  FORMAT_VALIDATORS[file.tournament.format](file);
