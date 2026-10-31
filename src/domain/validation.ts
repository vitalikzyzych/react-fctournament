import {
  computePlayoff,
  findChampion,
  PLAYOFF_ROUNDS,
  playoffMatches,
  playoffMatchId,
  roundLegs,
} from "./playoff";
import { describeSchemaIssues, tournamentFileSchema } from "./schema";
import type { ITournament, ITournamentFile } from "./types";
import { validateFormat } from "./validateFormat";

export interface IValidationReport {
  /** Parsed file, present only when there are no errors. */
  file: ITournamentFile | null;
  errors: string[];
  warnings: string[];
}

export interface IValidationContext {
  /** Tournaments already in the database, for id clashes and the club catalog. */
  existing: ITournament[];
}

const findDuplicates = (values: string[]): string[] => {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  values.forEach((value) => {
    if (seen.has(value)) duplicates.add(value);
    seen.add(value);
  });
  return [...duplicates];
};

/** Ids, references and status/result consistency, valid for every format. */
const validateReferences = (file: ITournamentFile): string[] => {
  const errors: string[] = [];
  const groupIds = new Set(file.groups.map((group) => group.id));
  const clubsById = new Map(file.clubs.map((club) => [club.id, club]));

  findDuplicates(file.players.map((player) => player.id)).forEach((id) =>
    errors.push(`players: гравець "${id}" вказаний двічі`)
  );
  findDuplicates(file.groups.map((group) => group.id)).forEach((id) =>
    errors.push(`groups: група "${id}" вказана двічі`)
  );
  findDuplicates(file.clubs.map((club) => club.id)).forEach((id) =>
    errors.push(`clubs: клуб "${id}" вказаний двічі`)
  );
  findDuplicates(file.matches.map((match) => match.id)).forEach((id) =>
    errors.push(`matches: id матчу "${id}" повторюється`)
  );

  file.clubs.forEach((club) => {
    if (!groupIds.has(club.group)) {
      errors.push(
        `clubs: клуб "${club.id}" посилається на невідому групу "${club.group}"`
      );
    }
  });

  file.matches.forEach((match) => {
    const label = `matches: матч "${match.id}"`;
    if (match.stage === "group" && !groupIds.has(match.group)) {
      errors.push(`${label} посилається на невідому групу "${match.group}"`);
    }
    if (match.home === match.away) {
      errors.push(`${label}: клуб не може грати сам із собою`);
    }
    (match.cards ?? []).forEach((card) => {
      if (card.club !== match.home && card.club !== match.away) {
        errors.push(
          `${label}: картка гравця "${card.player}" для клубу "${card.club}", який не грає в цьому матчі`
        );
      }
    });
    [match.home, match.away].forEach((clubId) => {
      const club = clubsById.get(clubId);
      if (!club) {
        errors.push(`${label} посилається на невідомий клуб "${clubId}"`);
      } else if (match.stage === "group" && club.group !== match.group) {
        errors.push(
          `${label}: клуб "${clubId}" не належить до групи ${match.group}`
        );
      }
    });
  });

  errors.push(...validatePlayoff(file));

  const played = file.matches.filter((match) => match.result !== null).length;
  if (file.tournament.status === "completed" && played < file.matches.length) {
    errors.push(
      `Турнір має статус "completed", але ${file.matches.length - played} матч(ів) без результату`
    );
  }
  if (file.tournament.status === "planned" && played > 0) {
    errors.push('Турнір має статус "planned", але вже містить результати');
  }

  const { champion } = file.tournament;
  if (champion && !file.clubs.some((club) => club.id === champion)) {
    errors.push(
      `tournament.champion: клуб "${champion}" не бере участі в турнірі`
    );
  }

  return errors;
};

/**
 * Playoff games: fixed ids, ties within the round, the same two clubs in every
 * game of a tie (home and away may swap), and an extra game beyond the legs
 * of the round (2 in QF and SF, 1 final) only after the games before it ended
 * level on aggregate. Teams are picked by hand, so nothing ties a later round
 * to the winners of an earlier one.
 */
const validatePlayoff = (file: ITournamentFile): string[] => {
  const errors: string[] = [];
  const games = playoffMatches(file.matches);

  games.forEach((game) => {
    const expectedId = playoffMatchId(game.round, game.tie, game.game);
    if (game.id !== expectedId) {
      errors.push(
        `matches: матч плей-офф "${game.id}" має мати id "${expectedId}" (раунд, пара, номер гри)`
      );
    }
    const ties = PLAYOFF_ROUNDS.find((r) => r.id === game.round)?.ties ?? 0;
    if (game.tie > ties) {
      errors.push(
        `matches: матч "${game.id}": у раунді ${game.round} лише ${ties} пар(и)`
      );
    }
  });

  computePlayoff(games).forEach((tie) => {
    if (!tie.games.length) return;
    const label = `Плей-офф ${tie.round}${tie.tie}`;
    tie.games.forEach((game, index) => {
      if (game.game !== index + 1) {
        errors.push(`${label}: ігри мають іти по порядку 1, 2, 3, ...`);
      }
      const sameClubs =
        (game.home === tie.home && game.away === tie.away) ||
        (game.home === tie.away && game.away === tie.home);
      if (!sameClubs) {
        errors.push(`${label}: у всіх іграх пари мають грати ті самі клуби`);
      }
      if (game.game <= roundLegs(tie.round)) return;
      const before = computePlayoff(tie.games.slice(0, index)).find(
        (t) => t.round === tie.round && t.tie === tie.tie
      );
      const level =
        before !== undefined &&
        before.games.every((g) => g.result !== null) &&
        before.aggregate.home === before.aggregate.away;
      if (!level) {
        errors.push(
          `${label}: перегравання (гра ${game.game}) можливе лише після рівного рахунку за сумою попередніх ігор`
        );
      }
    });
  });

  PLAYOFF_ROUNDS.forEach(({ id }) => {
    const clubs = computePlayoff(games)
      .filter((tie) => tie.round === id)
      .flatMap((tie) => [tie.home, tie.away])
      .filter((club) => club !== null);
    findDuplicates(clubs).forEach((club) =>
      errors.push(`Плей-офф ${id}: клуб "${club}" у двох парах одного раунду`)
    );
  });

  return [...new Set(errors)];
};

/** Things that are allowed but worth a second look before importing. */
const collectWarnings = (
  file: ITournamentFile,
  existing: ITournament[]
): string[] => {
  const warnings: string[] = [];

  const finalWinner = findChampion(file.matches);
  const { champion } = file.tournament;
  if (champion && finalWinner && champion !== finalWinner) {
    warnings.push(
      `tournament.champion "${champion}" не збігається з переможцем фіналу "${finalWinner}". Чемпіоном буде переможець фіналу`
    );
  }

  if (existing.some((t) => t.number === file.tournament.number)) {
    warnings.push(`Турнір з номером ${file.tournament.number} вже існує`);
  }
  if (
    file.tournament.status === "active" &&
    existing.some((t) => t.status === "active")
  ) {
    warnings.push("Вже є активний турнір. Після імпорту активних буде два");
  }

  // Club catalog built from earlier tournaments: latest known name per id.
  const knownNames = new Map<string, string>();
  [...existing]
    .sort((a, b) => a.number - b.number)
    .forEach((t) =>
      t.clubs.forEach((club) => knownNames.set(club.id, club.name))
    );

  if (knownNames.size > 0) {
    const idsByName = new Map<string, string>();
    knownNames.forEach((clubName, id) =>
      idsByName.set(clubName.toLowerCase(), id)
    );

    file.clubs.forEach((club) => {
      const knownName = knownNames.get(club.id);
      const knownIdForName = idsByName.get(club.name.toLowerCase());
      if (knownName === undefined && knownIdForName) {
        warnings.push(
          `Клуб "${club.name}" має id "${club.id}", а в попередніх турнірах "${knownIdForName}". Історія клубу розділиться`
        );
      } else if (knownName === undefined) {
        warnings.push(`Новий клуб: "${club.name}" (${club.id})`);
      } else if (knownName !== club.name) {
        warnings.push(
          `Клуб "${club.id}" раніше називався "${knownName}", тепер "${club.name}"`
        );
      }
    });
  }

  return warnings;
};

export const validateTournamentFile = (
  raw: unknown,
  context: IValidationContext
): IValidationReport => {
  const parsed = tournamentFileSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      file: null,
      errors: describeSchemaIssues(parsed.error),
      warnings: [],
    };
  }

  const file: ITournamentFile = parsed.data;
  const errors = validateReferences(file);
  // Format rules assume the references are sound, so run them only then.
  if (errors.length === 0) errors.push(...validateFormat(file));

  if (context.existing.some((t) => t.id === file.tournament.id)) {
    errors.push(
      `Турнір з id "${file.tournament.id}" вже існує. Змініть tournament.id`
    );
  }

  const warnings = collectWarnings(file, context.existing);
  return { file: errors.length === 0 ? file : null, errors, warnings };
};

/** JSON.parse with a Ukrainian error message instead of an exception. */
export const parseJson = (
  text: string
): { value: unknown } | { error: string } => {
  try {
    return { value: JSON.parse(text) };
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    return { error: `Файл не є коректним JSON: ${detail}` };
  }
};
