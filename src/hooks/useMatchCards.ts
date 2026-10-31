import { useCallback } from "react";

import type { ICard, IMatch, ITournament } from "@/domain";
import { useToast } from "@/providers";
import { addMatchCards, removeMatchCard } from "@/source/TournamentSource";

/** Adding and removing cards of a stored match, with a toast on failure. */
export const useMatchCards = (tournament: ITournament) => {
  const { show } = useToast();
  const fail = useCallback(
    (summary: string) => (error: Error) =>
      show("error", summary, error.message),
    [show]
  );

  const addCards = useCallback(
    (match: IMatch, cards: ICard[]) =>
      addMatchCards(tournament.id, match.id, cards).catch(
        fail("Не вдалося додати картки")
      ),
    [tournament.id, fail]
  );

  const removeCard = useCallback(
    (match: IMatch, card: ICard) =>
      removeMatchCard(tournament.id, match.id, card).catch(
        fail("Не вдалося видалити картку")
      ),
    [tournament.id, fail]
  );

  return { addCards, removeCard };
};
