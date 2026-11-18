import { useState } from "react";

import { Button } from "primereact/button";
import { classNames } from "primereact/utils";

import ClubLabel from "./ClubLabel";
import PlayerBadge from "./PlayerBadge";

import {
  ACHIEVEMENT_TYPES,
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

/** Who earned it: the club, or the player for a player's achievement. */
const Earner = ({ item }: { item: IAchievement }) =>
  item.club ? (
    <ClubLabel
      name={item.club.name}
      clubId={item.club.id}
      owner={item.club.owner}
    />
  ) : (
    <span className="flex align-items-center gap-2">
      <PlayerBadge player={item.player} /> {item.player}
    </span>
  );

/**
 * Achievements of a tournament, one tile per kind so a frequent kind does
 * not push the others out: how many S and V earned, and the latest earner.
 * "Усі" opens every achievement of that kind under the tile, newest first.
 * Kinds nobody has earned yet follow, greyed out, with their rule.
 * The kind earned most recently comes first.
 */
const AchievementList = ({ items, clubsById }: IAchievementListProps) => {
  const [open, setOpen] = useState<Set<AchievementType>>(new Set());
  const byType = new Map<AchievementType, IAchievement[]>();
  items.forEach((item) =>
    byType.set(item.type, [...(byType.get(item.type) ?? []), item])
  );
  const kinds = [...byType.entries()]
    .map(([type, list]) => ({ type, list: [...list].reverse() }))
    .sort((a, b) => b.list[0].order - a.list[0].order);
  // Kinds nobody has earned yet, greyed out after the earned ones.
  const missing = ACHIEVEMENT_TYPES.filter((type) => !byType.has(type));

  const toggle = (type: AchievementType) =>
    setOpen((current) => {
      const next = new Set(current);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  const noteOf = (item: IAchievement) =>
    item.type === "perfectDay"
      ? `тур ${item.matchday}`
      : matchNote(item, clubsById);

  return (
    <div className="achievement-grid">
      {kinds.map(({ type, list }) => {
        const info = ACHIEVEMENT_INFO[type];
        const [latest] = list;
        const count = {
          S: list.filter((a) => a.player === "S").length,
          V: list.filter((a) => a.player === "V").length,
        };
        const expanded = open.has(type);
        const note = noteOf(latest);
        return (
          <div
            key={type}
            className={classNames("achievement", {
              "achievement--open": expanded,
            })}
          >
            <div className="flex align-items-center gap-3 min-w-0">
              <span
                className="achievement__emoji"
                aria-hidden
                title={`${info.name}: ${info.rule}`}
              >
                {info.emoji}
              </span>
              <div className="flex flex-column gap-1 min-w-0 flex-1">
                <span className="flex justify-content-between align-items-center gap-2">
                  <span className="font-semibold" title={info.rule}>
                    {info.name}
                  </span>
                  <span className="achievement__count">
                    S {count.S} : {count.V} V
                  </span>
                </span>
                {!expanded && (
                  <>
                    <span className="flex align-items-center gap-2 text-sm min-w-0">
                      {list.length > 1 && (
                        <span className="text-500 text-xs">Останнє:</span>
                      )}
                      <Earner item={latest} />
                    </span>
                    {note && (
                      <span className="text-xs text-600 white-space-nowrap overflow-hidden text-overflow-ellipsis">
                        {note}
                      </span>
                    )}
                  </>
                )}
                {expanded && (
                  <span className="text-xs text-600">{info.rule}</span>
                )}
              </div>
            </div>
            {expanded && (
              <ol className="achievement__list">
                {list.map((item, index) => {
                  const itemNote = noteOf(item);
                  return (
                    <li
                      key={`${item.club?.id ?? item.player}:${item.order}:${index}`}
                    >
                      <Earner item={item} />
                      {itemNote && (
                        <span className="text-xs text-600 white-space-nowrap">
                          {itemNote}
                        </span>
                      )}
                    </li>
                  );
                })}
              </ol>
            )}
            {list.length > 1 && (
              <Button
                label={expanded ? "Згорнути" : `Показати всі ${list.length}`}
                size="small"
                text
                className="achievement__toggle"
                aria-expanded={expanded}
                onClick={() => toggle(type)}
              />
            )}
          </div>
        );
      })}
      {missing.map((type) => {
        const info = ACHIEVEMENT_INFO[type];
        return (
          <div key={type} className="achievement achievement--none">
            <div className="flex align-items-center gap-3 min-w-0">
              <span className="achievement__emoji" aria-hidden>
                {info.emoji}
              </span>
              <div className="flex flex-column gap-1 min-w-0 flex-1">
                <span className="flex justify-content-between align-items-center gap-2">
                  <span className="font-semibold">{info.name}</span>
                  <span className="achievement__count">S 0 : 0 V</span>
                </span>
                <span className="text-xs text-600">{info.rule}</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default AchievementList;
