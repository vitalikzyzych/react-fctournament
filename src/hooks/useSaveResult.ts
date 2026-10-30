import { confirmDialog } from "primereact/confirmdialog";

import {
  computePlayoff,
  type IMatch,
  type IScore,
  type ITournament,
  staleExtraGames,
} from "@/domain";
import { useToast } from "@/providers";
import {
  createPlayoffGames,
  saveMatchResult,
  savePlayoffResult,
} from "@/source/TournamentSource";
import { formatScore, plural } from "@/utils";

/**
 * Saving a score, shared by the matches tab, the playoff ties and the
 * dashboard. `matches` are the stored matches the edited one belongs to (a
 * playoff tie's games are enough). Three cases:
 * - group match: the result is updated;
 * - stored playoff game: the result is updated, and extra games that a
 *   corrected or cleared score makes meaningless are removed after a
 *   confirmation;
 * - pending extra game (not stored yet): it is created with its result.
 * The toast shows at once; saving does not wait for the server.
 */
export const useSaveResult = (tournament: ITournament, matches: IMatch[]) => {
  const { show } = useToast();
  const nameOf = (id: string) =>
    tournament.clubs.find((club) => club.id === id)?.name ?? id;
  const fail = (error: Error) =>
    show("error", "Не вдалося зберегти", error.message);
  const notify = (match: IMatch, result: IScore | null) =>
    show(
      "success",
      result ? "Результат збережено" : "Результат очищено",
      `${nameOf(match.home)} ${formatScore(result)} ${nameOf(match.away)}`
    );

  return (match: IMatch, result: IScore | null) => {
    if (match.stage === "group") {
      notify(match, result);
      saveMatchResult(tournament.id, match.id, result).catch(fail);
      return;
    }

    if (!matches.some((stored) => stored.id === match.id)) {
      if (!result) return;
      notify(match, result);
      createPlayoffGames(tournament.id, [{ ...match, result }]).catch(fail);
      return;
    }

    const tie = computePlayoff(matches).find(
      (t) => t.round === match.round && t.tie === match.tie
    );
    const stale = tie ? staleExtraGames(tie, match.id, result) : [];
    const persist = () => {
      notify(match, result);
      savePlayoffResult(
        tournament.id,
        match.id,
        result,
        stale.map((game) => game.id)
      ).catch(fail);
    };
    if (!stale.length) {
      persist();
      return;
    }
    confirmDialog({
      header: "Видалити перегравання?",
      message: `Після цієї зміни перегравання не потрібне. ${stale.length} ${plural(stale.length, ["наступний матч буде видалено", "наступні матчі буде видалено", "наступних матчів буде видалено"])}.`,
      acceptLabel: "Зберегти й видалити",
      rejectLabel: "Скасувати",
      accept: persist,
    });
  };
};
