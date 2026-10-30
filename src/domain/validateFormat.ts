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

const LEAGUE_POTS = 4;
const LEAGUE_POT_SIZE = 10;
const LEAGUE_MATCHDAYS = 8;

/**
 * "sv-league-40": a Champions League style league phase. 40 clubs in one
 * group, 20 per player, 4 pots of 5 S + 5 V clubs. 8 matchdays, each club
 * plays once per matchday, only S vs V, never the same pair twice. Every club
 * meets 2 clubs of every pot (its own included), one at home and one away,
 * so 4 home and 4 away matches. 160 matches in total.
 */
const validateSvLeague40 = (file: ITournamentFile): string[] => {
  const errors: string[] = [];
  const matches = groupMatches(file.matches);
  const clubsById = new Map(file.clubs.map((club) => [club.id, club]));

  if (file.groups.length !== 1) {
    errors.push(`Потрібна 1 група (ліга), у файлі ${file.groups.length}`);
  }
  if (file.clubs.length !== LEAGUE_POTS * LEAGUE_POT_SIZE) {
    errors.push(`Потрібно 40 клубів, у файлі ${file.clubs.length}`);
  }
  const expected = (LEAGUE_POTS * LEAGUE_POT_SIZE * LEAGUE_MATCHDAYS) / 2;
  if (matches.length !== expected) {
    errors.push(
      `Потрібно ${expected} матчів лігового етапу, у файлі ${matches.length}`
    );
  }

  const codes = new Set<string>();
  file.clubs.forEach((club) => {
    if (!club.pot || club.pot > LEAGUE_POTS) {
      errors.push(`Клуб "${club.id}": потрібен pot від 1 до ${LEAGUE_POTS}`);
      return;
    }
    if (!club.code) {
      errors.push(`Клуб "${club.id}": потрібен code, наприклад "1S-1"`);
      return;
    }
    if (!club.code.startsWith(`${club.pot}${club.owner}-`)) {
      errors.push(
        `Клуб "${club.id}": code "${club.code}" не відповідає кошику ${club.pot} і власнику ${club.owner}`
      );
    }
    if (codes.has(club.code)) {
      errors.push(`Код "${club.code}" вказаний двічі`);
    }
    codes.add(club.code);
  });

  for (let pot = 1; pot <= LEAGUE_POTS; pot += 1) {
    const inPot = file.clubs.filter((club) => club.pot === pot);
    const s = inPot.filter((club) => club.owner === "S").length;
    const v = inPot.filter((club) => club.owner === "V").length;
    if (s !== LEAGUE_POT_SIZE / 2 || v !== LEAGUE_POT_SIZE / 2) {
      errors.push(
        `Кошик ${pot}: потрібно 5 клубів S і 5 клубів V, зараз S: ${s}, V: ${v}`
      );
    }
  }

  const pairs = new Set<string>();
  matches.forEach((match) => {
    const home = clubsById.get(match.home);
    const away = clubsById.get(match.away);
    if (home && away && home.owner === away.owner) {
      errors.push(
        `Матч "${match.id}": клуби одного гравця (${home.owner}) не грають між собою`
      );
    }
    const pair = [match.home, match.away].sort().join(":");
    if (pairs.has(pair)) {
      errors.push(
        `Матч "${match.id}": ${match.home} і ${match.away} вже грають між собою`
      );
    }
    pairs.add(pair);
  });

  const matchdays = [...new Set(matches.map((match) => match.matchday))].sort(
    (a, b) => a - b
  );
  const allDays = Array.from({ length: LEAGUE_MATCHDAYS }, (_, i) => i + 1);
  if (matchdays.join(",") !== allDays.join(",")) {
    errors.push(
      `Потрібні тури ${allDays.join(", ")}, у файлі: ${matchdays.join(", ")}`
    );
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

  // Per club and opponent pot: 2 opponents, one at home and one away.
  file.clubs.forEach((club) => {
    for (let pot = 1; pot <= LEAGUE_POTS; pot += 1) {
      let home = 0;
      let away = 0;
      matches.forEach((match) => {
        const isHome = match.home === club.id;
        if (!isHome && match.away !== club.id) return;
        const opponent = clubsById.get(isHome ? match.away : match.home);
        if (opponent?.pot !== pot) return;
        if (isHome) home += 1;
        else away += 1;
      });
      if (home !== 1 || away !== 1) {
        errors.push(
          `Клуб "${club.id}": проти кошика ${pot} потрібен 1 матч удома і 1 на виїзді, зараз удома ${home}, на виїзді ${away}`
        );
      }
    }
  });

  return errors;
};

const FORMAT_VALIDATORS: Record<
  TournamentFormat,
  (file: ITournamentFile) => string[]
> = {
  "sv-groups-4x4": validateSvGroups4x4,
  "sv-league-40": validateSvLeague40,
};

export const validateFormat = (file: ITournamentFile): string[] =>
  FORMAT_VALIDATORS[file.tournament.format](file);
