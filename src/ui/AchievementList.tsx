import ClubLabel from "./ClubLabel";
import PlayerBadge from "./PlayerBadge";

import {
  type AchievementType,
  FAIR_PLAY_MIN_POINTS,
  GOAL_FEST_GOALS,
  type IAchievement,
  type IClub,
  ROUT_MARGIN,
  STREAK_RUN,
  WALL_MAX_CONCEDED,
} from "@/domain";
import { formatScore } from "@/utils";

export const ACHIEVEMENT_INFO: Record<
  AchievementType,
  { emoji: string; name: string; rule: string }
> = {
  rout: {
    emoji: "💥",
    name: "Розгром",
    rule: `перемога з різницею ${ROUT_MARGIN} голів або більше`,
  },
  goalFest: {
    emoji: "🎆",
    name: "Голеада",
    rule: `${GOAL_FEST_GOALS} голів або більше в одному матчі`,
  },
  wall: {
    emoji: "🧱",
    name: "Залізобетонний захист",
    rule: `пропущено ${WALL_MAX_CONCEDED} гол або менше за матч`,
  },
  streak: {
    emoji: "🔥",
    name: "Серія",
    rule: `${STREAK_RUN} перемог поспіль`,
  },
  comeback: {
    emoji: "🔄",
    name: "Камбек",
    rule: "пара плей-офф виграна після поразки в першому матчі",
  },
  perfectDay: {
    emoji: "⭐",
    name: "Ідеальний тур",
    rule: "усі матчі туру виграв один гравець",
  },
  unbeaten: {
    emoji: "🛡️",
    name: "Без поразок",
    rule: "жодної поразки за весь груповий етап",
  },
  fairPlay: {
    emoji: "🕊️",
    name: "Чиста гра",
    rule: `менше карткових очок після групового етапу (від ${FAIR_PLAY_MIN_POINTS} у турнірі; жовта 1, червона 3)`,
  },
};

/** Achievements whose note names the match that earned them. */
const WITH_MATCH = new Set<AchievementType>([
  "rout",
  "goalFest",
  "wall",
  "streak",
  "comeback",
]);

/** "6:0 проти Інтер": the score from the club's side and the opponent. */
const matchNote = (
  { type, club, match }: IAchievement,
  clubsById: Map<string, IClub>
) => {
  if (!club || !match || !WITH_MATCH.has(type)) return null;
  const own = match.home === club.id;
  const opponent = clubsById.get(own ? match.away : match.home);
  const score = formatScore({
    home: own ? match.result.home : match.result.away,
    away: own ? match.result.away : match.result.home,
  });
  return `${score} проти ${opponent?.name ?? "суперника"}`;
};

interface IAchievementListProps {
  items: IAchievement[];
  clubsById: Map<string, IClub>;
}

/**
 * Achievements of a tournament, one tile per kind so a frequent kind does
 * not push the others out: how many S and V earned, and the latest earner.
 * The kind earned most recently comes first.
 */
const AchievementList = ({ items, clubsById }: IAchievementListProps) => {
  const latest = new Map<AchievementType, IAchievement>();
  const counts = new Map<AchievementType, { S: number; V: number }>();
  items.forEach((item) => {
    latest.set(item.type, item);
    const count = counts.get(item.type) ?? { S: 0, V: 0 };
    count[item.player] += 1;
    counts.set(item.type, count);
  });
  const kinds = [...latest.values()].sort((a, b) => b.order - a.order);

  return (
    <div className="achievement-grid">
      {kinds.map((item) => {
        const info = ACHIEVEMENT_INFO[item.type];
        const count = counts.get(item.type) ?? { S: 0, V: 0 };
        const note =
          item.type === "perfectDay"
            ? `тур ${item.matchday}`
            : matchNote(item, clubsById);
        return (
          <div
            key={item.type}
            className="achievement"
            title={`${info.name}: ${info.rule}`}
          >
            <span className="achievement__emoji" aria-hidden>
              {info.emoji}
            </span>
            <div className="flex flex-column gap-1 min-w-0 flex-1">
              <span className="flex justify-content-between align-items-center gap-2">
                <span className="font-semibold">{info.name}</span>
                <span className="achievement__count">
                  S {count.S} : {count.V} V
                </span>
              </span>
              <span className="flex align-items-center gap-2 text-sm min-w-0">
                <span className="text-500 text-xs">
                  {count.S + count.V > 1 ? "Останнє:" : ""}
                </span>
                {item.club ? (
                  <ClubLabel
                    name={item.club.name}
                    clubId={item.club.id}
                    owner={item.club.owner}
                  />
                ) : (
                  <span className="flex align-items-center gap-2">
                    <PlayerBadge player={item.player} /> {item.player}
                  </span>
                )}
              </span>
              {note && (
                <span className="text-xs text-600 white-space-nowrap overflow-hidden text-overflow-ellipsis">
                  {note}
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default AchievementList;
