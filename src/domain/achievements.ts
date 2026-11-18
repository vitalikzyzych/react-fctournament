import {
  matchWinner,
  ownersOf,
  playedInOrder,
  playerCardPoints,
  playoffComebacks,
} from "./insights";
import { groupMatches } from "./playoff";
import type { IPlayedMatch } from "./standings";
import {
  type IClub,
  type IMatch,
  type ITournament,
  type ITournamentWithMatches,
  type PlayerId,
} from "./types";

export type AchievementType =
  | "rout"
  | "goalFest"
  | "wall"
  | "streak"
  | "comeback"
  | "perfectDay"
  | "unbeaten"
  | "fairPlay";

export const ACHIEVEMENT_TYPES: AchievementType[] = [
  "rout",
  "goalFest",
  "wall",
  "streak",
  "comeback",
  "perfectDay",
  "unbeaten",
  "fairPlay",
];

/** Win margin of a rout. */
export const ROUT_MARGIN = 5;
/** Goals in one match for a goal fest. */
export const GOAL_FEST_GOALS = 10;
/** Goals conceded in a match at most for the wall (scores here run high). */
export const WALL_MAX_CONCEDED = 1;
/** Wins in a row of one club. */
export const STREAK_RUN = 5;
/** Card points in the tournament before fair play counts. */
export const FAIR_PLAY_MIN_POINTS = 3;

export interface IAchievement {
  type: AchievementType;
  player: PlayerId;
  /** The club that earned it; absent for a player's achievement. */
  club?: IClub;
  /** The match that completed it. */
  match?: IPlayedMatch;
  matchday?: number;
  /** Position in play order, to list the newest first. */
  order: number;
}

/**
 * Achievements of one tournament, in play order:
 * - rout: a win by ROUT_MARGIN or more;
 * - goalFest: GOAL_FEST_GOALS or more goals in a match (the winner, or both
 *   clubs of a draw);
 * - wall: a match with WALL_MAX_CONCEDED goals or fewer conceded;
 * - streak: STREAK_RUN wins in a row of one club;
 * - comeback: a playoff tie won after losing its first game;
 * - perfectDay: one player wins every match of a complete matchday;
 * - unbeaten: a club without a loss in the whole group stage (once it is over);
 * - fairPlay: the player with fewer card points after the group stage, once
 *   the tournament has FAIR_PLAY_MIN_POINTS or more.
 */
export const computeAchievements = (
  tournament: ITournament,
  matches: IMatch[]
): IAchievement[] => {
  const owners = ownersOf(tournament.clubs);
  const clubsById = new Map(tournament.clubs.map((club) => [club.id, club]));
  const played = playedInOrder(matches);
  const orderOf = new Map(played.map((match, index) => [match.id, index]));
  const list: IAchievement[] = [];

  const add = (
    type: AchievementType,
    clubId: string,
    match: IPlayedMatch | undefined
  ) => {
    const club = clubsById.get(clubId);
    if (!club) return;
    list.push({
      type,
      player: club.owner,
      club,
      match,
      order: match ? (orderOf.get(match.id) ?? 0) : played.length,
    });
  };

  // Single matches: routs and goal fests.
  played.forEach((match) => {
    const { home, away } = match.result;
    const winnerClub =
      home > away ? match.home : away > home ? match.away : null;
    if (winnerClub && Math.abs(home - away) >= ROUT_MARGIN) {
      add("rout", winnerClub, match);
    }
    if (home + away >= GOAL_FEST_GOALS) {
      (winnerClub ? [winnerClub] : [match.home, match.away]).forEach((id) =>
        add("goalFest", id, match)
      );
    }
  });

  // Each club: matches with few goals conceded, and wins in a row.
  tournament.clubs.forEach((club) => {
    let wins = 0;
    played
      .filter((m) => m.home === club.id || m.away === club.id)
      .forEach((match) => {
        const own = match.home === club.id;
        const scored = own ? match.result.home : match.result.away;
        const conceded = own ? match.result.away : match.result.home;
        wins = scored > conceded ? wins + 1 : 0;
        if (conceded <= WALL_MAX_CONCEDED) add("wall", club.id, match);
        if (wins === STREAK_RUN) add("streak", club.id, match);
      });
  });

  playoffComebacks(matches).forEach((comeback) => {
    const decider = played
      .filter(
        (m) =>
          m.stage === "playoff" &&
          m.round === comeback.round &&
          m.tie === comeback.tie
      )
      .at(-1);
    add("comeback", comeback.winner, decider);
  });

  // Complete matchdays won entirely by one player.
  const group = groupMatches(matches);
  const playedGroup = played.filter((m) => m.stage === "group");
  const matchdayOf = (match: IMatch) =>
    match.stage === "group" ? match.matchday : 0;
  const days = [...new Set(group.map(matchdayOf))];
  days.forEach((day) => {
    const all = group.filter((m) => m.matchday === day);
    const own = playedGroup.filter((m) => matchdayOf(m) === day);
    if (own.length < 2 || own.length !== all.length) return;
    const winners = new Set(own.map((match) => matchWinner(match, owners)));
    const [winner] = [...winners];
    if (winners.size !== 1 || !winner) return;
    const last = own.at(-1);
    list.push({
      type: "perfectDay",
      player: winner,
      matchday: day,
      match: last,
      order: last ? (orderOf.get(last.id) ?? 0) : 0,
    });
  });

  // Once the group stage is over.
  if (group.length > 0 && playedGroup.length === group.length) {
    const lastGroup = playedGroup.at(-1);
    tournament.clubs.forEach((club) => {
      const own = playedGroup.filter(
        (m) => m.home === club.id || m.away === club.id
      );
      const lost = own.some((m) =>
        m.home === club.id
          ? m.result.home < m.result.away
          : m.result.away < m.result.home
      );
      if (own.length >= 3 && !lost) add("unbeaten", club.id, lastGroup);
    });
    const points = playerCardPoints(tournament.clubs, group);
    if (points.S + points.V >= FAIR_PLAY_MIN_POINTS && points.S !== points.V) {
      list.push({
        type: "fairPlay",
        player: points.S < points.V ? "S" : "V",
        match: lastGroup,
        order: lastGroup ? (orderOf.get(lastGroup.id) ?? 0) : played.length,
      });
    }
  }

  return list.sort((a, b) => a.order - b.order);
};

export type AchievementTotals = Record<
  AchievementType,
  Record<PlayerId, number>
>;

/** How many of each achievement S and V earned over the tournaments. */
export const countAchievements = (
  list: ITournamentWithMatches[]
): AchievementTotals => {
  const none = () => ({ S: 0, V: 0 });
  const totals: AchievementTotals = {
    rout: none(),
    goalFest: none(),
    wall: none(),
    streak: none(),
    comeback: none(),
    perfectDay: none(),
    unbeaten: none(),
    fairPlay: none(),
  };
  list.forEach(({ tournament, matches }) =>
    computeAchievements(tournament, matches).forEach((achievement) => {
      totals[achievement.type][achievement.player] += 1;
    })
  );
  return totals;
};

export const achievementTotal = (
  totals: AchievementTotals,
  player: PlayerId
): number =>
  ACHIEVEMENT_TYPES.reduce((sum, type) => sum + totals[type][player], 0);
