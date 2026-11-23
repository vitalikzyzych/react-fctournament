import { matchWinner, other, ownersOf } from "./insights";
import { computePlayoff, roundName } from "./playoff";
import type { IRatedMatch } from "./ratings";
import { playedChronologically } from "./sessions";
import type { IPlayedMatch } from "./standings";
import {
  type IMatch,
  type ITournament,
  PLAYER_IDS,
  type PlayerId,
} from "./types";

export type FeedKind =
  "lead" | "record" | "streak" | "unbeaten" | "through" | "champion" | "upset";

export interface IFeedEvent {
  /** Stable within a tournament: match id and kind. */
  id: string;
  kind: FeedKind;
  /** The match that caused the event. */
  match: IPlayedMatch;
  /** The club or the player the event is about, for the crest or badge. */
  club?: string;
  player?: PlayerId;
  title: string;
  detail?: string;
  /** Runs: the first match of the run, which ends with `match`. */
  since?: IPlayedMatch;
}

/** Results needed before a "tournament record" means anything. */
const RECORD_MIN_MATCHES = 8;
/** S against V matches needed before a change of the lead is news. */
const LEAD_MIN_MATCHES = 4;
/** Wins in a row worth an event, for a club and for a player. */
const CLUB_RUNS = [3, 5, 7, 10];
const PLAYER_RUNS = [4, 6, 8, 10, 15, 20];
/** Matches in a row without a loss worth an event, for a player. */
const UNBEATEN_RUNS = [5, 10, 15, 20, 25, 30, 40, 50];

const score = (match: IPlayedMatch) =>
  `${match.result.home}:${match.result.away}`;

/**
 * What happened in a tournament, told match by match in the order the
 * results came in: the lead in wins changing hands, winning and unbeaten
 * runs, tournament records, sensations (from the club ratings, when given),
 * decided playoff ties and the champion. Group leaders and finished groups
 * are left out at the user's request (2026-11-23). Oldest first.
 */
export const computeFeed = (
  tournament: ITournament,
  matches: IMatch[],
  rated: IRatedMatch[] = []
): IFeedEvent[] => {
  const owners = ownersOf(tournament.clubs);
  const names = new Map(tournament.clubs.map((club) => [club.id, club.name]));
  const nameOf = (id: string) => names.get(id) ?? id;
  const ratedById = new Map(
    rated
      .filter((r) => r.tournament.id === tournament.id)
      .map((r) => [r.match.id, r])
  );
  const events: IFeedEvent[] = [];
  const sofar: IPlayedMatch[] = [];
  const wins = { S: 0, V: 0 };
  let duels = 0;
  let leading: PlayerId | null = null;
  const unbeaten = { S: 0, V: 0 };
  let playerRun: { player: PlayerId | null; count: number } = {
    player: null,
    count: 0,
  };
  const clubRuns = new Map<string, number>();
  // The first match of each run going on, to tell when it began.
  const clubRunStart = new Map<string, IPlayedMatch>();
  let playerRunStart: IPlayedMatch | undefined;
  const unbeatenStart: Partial<Record<PlayerId, IPlayedMatch>> = {};
  let maxMargin = 0;
  let maxGoals = 0;
  const decided = new Set<string>();
  const seen = new Set<string>();

  playedChronologically(matches).forEach((match) => {
    sofar.push(match);
    seen.add(match.id);
    const add = (
      kind: FeedKind,
      event: Omit<IFeedEvent, "id" | "kind" | "match">
    ) => events.push({ id: `${match.id}:${kind}`, kind, match, ...event });
    const { home, away } = match.result;
    const winnerClub =
      home > away ? match.home : away > home ? match.away : null;
    const loserClub = winnerClub === match.home ? match.away : match.home;

    // Sensation: a win against a much higher rated club.
    const rating = ratedById.get(match.id);
    if (rating && winnerClub) {
      const chance =
        winnerClub === match.home
          ? rating.expectedHome
          : 1 - rating.expectedHome;
      if (chance <= 0.35) {
        add("upset", {
          club: winnerClub,
          title: `Сенсація: ${nameOf(winnerClub)} обіграв ${nameOf(loserClub)}`,
          detail: `${score(match)}, шанс на перемогу був ${Math.round(chance * 100)}%`,
        });
      }
    }

    // Tournament records.
    const margin = Math.abs(home - away);
    const goals = home + away;
    if (sofar.length > RECORD_MIN_MATCHES) {
      if (margin > maxMargin && winnerClub) {
        add("record", {
          club: winnerClub,
          title: "Найбільша перемога турніру",
          detail: `${nameOf(match.home)} ${score(match)} ${nameOf(match.away)}`,
        });
      }
      if (goals > maxGoals) {
        add("record", {
          title: `Найрезультативніший матч турніру: ${goals} голів`,
          detail: `${nameOf(match.home)} ${score(match)} ${nameOf(match.away)}`,
        });
      }
    }
    maxMargin = Math.max(maxMargin, margin);
    maxGoals = Math.max(maxGoals, goals);

    // Winning runs of clubs.
    [match.home, match.away].forEach((clubId) => {
      const run = clubId === winnerClub ? (clubRuns.get(clubId) ?? 0) + 1 : 0;
      clubRuns.set(clubId, run);
      if (run === 1) clubRunStart.set(clubId, match);
      if (CLUB_RUNS.includes(run)) {
        add("streak", {
          club: clubId,
          since: clubRunStart.get(clubId),
          title: `${nameOf(clubId)}: ${run} ${run < 5 ? "перемоги" : "перемог"} поспіль`,
        });
      }
    });

    // S against V: the lead in wins and winning runs of a player.
    const homeOwner = owners.get(match.home);
    const awayOwner = owners.get(match.away);
    if (homeOwner && awayOwner && homeOwner !== awayOwner) {
      const winner = matchWinner(match, owners);
      if (winner) wins[winner] += 1;
      duels += 1;
      // News only when the lead changes hands, not on every level score.
      const ahead: PlayerId | null =
        wins.S === wins.V ? null : wins.S > wins.V ? "S" : "V";
      if (ahead && ahead !== leading) {
        if (leading && duels >= LEAD_MIN_MATCHES) {
          add("lead", {
            player: ahead,
            title: `${ahead} перехопив лідерство за перемогами: ${wins.S}:${wins.V}`,
          });
        }
        leading = ahead;
      }
      playerRun =
        winner && winner === playerRun.player
          ? { player: winner, count: playerRun.count + 1 }
          : { player: winner, count: winner ? 1 : 0 };
      if (playerRun.count === 1) playerRunStart = match;
      PLAYER_IDS.forEach((player) => {
        unbeaten[player] = winner === other(player) ? 0 : unbeaten[player] + 1;
        const run = unbeaten[player];
        if (run === 1) unbeatenStart[player] = match;
        // A run of wins only is told by the event below.
        const allWins = playerRun.player === player && playerRun.count === run;
        if (UNBEATEN_RUNS.includes(run) && !allWins) {
          add("unbeaten", {
            player,
            since: unbeatenStart[player],
            title: `${player} не програє ${run} матчів поспіль`,
          });
        }
      });
      if (winner && PLAYER_RUNS.includes(playerRun.count)) {
        add("streak", {
          player: winner,
          since: playerRunStart,
          title: `${winner} виграв ${playerRun.count} ${playerRun.count < 5 ? "матчі" : "матчів"} поспіль`,
          detail: `${other(winner)} без перемог від початку серії`,
        });
      }
    }

    if (match.stage !== "playoff") return;

    // A playoff game that decides its tie. The tie's games not reached yet
    // count as unplayed, so a first leg alone decides nothing.
    const games = matches
      .filter(
        (m) =>
          m.stage === "playoff" &&
          m.round === match.round &&
          m.tie === match.tie
      )
      .map((m) => (seen.has(m.id) ? m : { ...m, result: null }));
    const tie = computePlayoff(games).find(
      (t) => t.round === match.round && t.tie === match.tie
    );
    const key = `${match.round}${match.tie}`;
    if (!tie?.winner || decided.has(key)) return;
    decided.add(key);
    const loser = tie.winner === tie.home ? tie.away : tie.home;
    const total =
      tie.winner === tie.home
        ? `${tie.aggregate.home}:${tie.aggregate.away}`
        : `${tie.aggregate.away}:${tie.aggregate.home}`;
    if (match.round === "F") {
      add("champion", {
        club: tie.winner,
        title: `${nameOf(tie.winner)} виграв турнір`,
        detail: `Фінал: ${total} проти ${loser ? nameOf(loser) : ""}`,
      });
      return;
    }
    add("through", {
      club: tie.winner,
      title: `${nameOf(tie.winner)} пройшов далі`,
      detail: `${roundName(match.round)}: ${total} за сумою проти ${loser ? nameOf(loser) : ""}`,
    });
  });
  return events;
};
