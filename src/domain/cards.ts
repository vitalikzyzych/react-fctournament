import { computePlayoff, pendingReplay, PLAYOFF_ROUND_IDS } from "./playoff";
import type { ICard, IMatch } from "./types";

/**
 * Why a footballer misses a match:
 * - "red": a red card in the club's previous match;
 * - "two-yellows-match": two yellows in the previous match (sent off);
 * - "two-yellows": his second yellow of the tournament;
 * - "yellow-after-ban": a yellow after he has already served a ban.
 */
export type SuspensionReason =
  "red" | "two-yellows-match" | "two-yellows" | "yellow-after-ban";

export const SUSPENSION_REASONS: Record<SuspensionReason, string> = {
  red: "червона картка",
  "two-yellows-match": "2 жовті в одному матчі",
  "two-yellows": "2 жовті картки",
  "yellow-after-ban": "жовта після дискваліфікації",
};

export interface ISuspension {
  club: string;
  /** The name as typed on the footballer's first card. */
  player: string;
  reason: SuspensionReason;
}

export interface IDiscipline {
  /** Footballers who miss a match, by match id. */
  suspensions: Map<string, ISuspension[]>;
  /** Names already used on cards, by club id, for suggestions. */
  playersByClub: Map<string, string[]>;
}

export const MAX_PLAYER_NAME = 40;
/** Cards per match at most (also checked by firestore.rules). */
export const MAX_MATCH_CARDS = 30;
export const CARD_ID_PATTERN = /^[a-z0-9]{1,20}$/;

/** Random id for a new card, unique enough within one match. */
export const newCardId = (): string =>
  Math.random().toString(36).slice(2, 10) || "c0";

/** "  Vinícius " and "vinícius" are the same footballer. */
export const playerKey = (name: string): string =>
  name.trim().replace(/\s+/g, " ").toLowerCase();

export const matchCards = (match: IMatch): ICard[] => match.cards ?? [];

/**
 * The club's matches in play order: group matches by matchday, then the
 * playoff round by round, game by game. Includes the extra game a level tie
 * is waiting for, which is not stored yet.
 */
const clubMatches = (matches: IMatch[], clubId: string): IMatch[] => {
  const extra = computePlayoff(matches)
    .map(pendingReplay)
    .filter((game) => game !== null);
  const rank = (match: IMatch) =>
    match.stage === "group"
      ? [0, match.matchday, 0]
      : [1, PLAYOFF_ROUND_IDS.indexOf(match.round), match.game];
  return [...matches, ...extra]
    .filter((match) => match.home === clubId || match.away === clubId)
    .sort((a, b) => {
      const [x, y] = [rank(a), rank(b)];
      return x[0] - y[0] || x[1] - y[1] || x[2] - y[2];
    });
};

interface IPlayerState {
  name: string;
  yellows: number;
  banned: boolean;
}

/**
 * Bans from cards, per tournament. A footballer misses his club's next match
 * after a red card or two yellows in one match, after his second yellow of
 * the tournament, and after every yellow once he has served a ban. Cards
 * count as soon as they are entered, played result or not.
 */
export const computeDiscipline = (matches: IMatch[]): IDiscipline => {
  const suspensions = new Map<string, ISuspension[]>();
  const playersByClub = new Map<string, string[]>();
  const clubIds = new Set(matches.flatMap((m) => [m.home, m.away]));

  clubIds.forEach((clubId) => {
    const players = new Map<string, IPlayerState>();
    let due: ISuspension[] = [];

    clubMatches(matches, clubId).forEach((match) => {
      if (due.length) {
        suspensions.set(match.id, [
          ...(suspensions.get(match.id) ?? []),
          ...due,
        ]);
      }
      due = [];

      const own = matchCards(match).filter((card) => card.club === clubId);
      const byPlayer = new Map<string, ICard[]>();
      own.forEach((card) => {
        const key = playerKey(card.player);
        byPlayer.set(key, [...(byPlayer.get(key) ?? []), card]);
      });

      byPlayer.forEach((cards, key) => {
        const state = players.get(key) ?? {
          name: "",
          yellows: 0,
          banned: false,
        };
        state.name = state.name || cards[0].player.trim();
        const yellows = cards.filter((c) => c.type === "yellow").length;
        let reason: SuspensionReason | null = null;
        if (cards.some((c) => c.type === "red")) reason = "red";
        else if (yellows >= 2) reason = "two-yellows-match";
        else if (yellows === 1) {
          state.yellows += 1;
          if (state.banned) reason = "yellow-after-ban";
          else if (state.yellows >= 2) reason = "two-yellows";
        }
        if (reason) {
          state.banned = true;
          due.push({ club: clubId, player: state.name, reason });
        }
        players.set(key, state);
      });
    });

    playersByClub.set(
      clubId,
      [...players.values()]
        .map((p) => p.name)
        .sort((a, b) => a.localeCompare(b))
    );
  });

  return { suspensions, playersByClub };
};
