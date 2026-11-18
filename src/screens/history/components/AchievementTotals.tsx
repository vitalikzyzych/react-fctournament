import {
  ACHIEVEMENT_TYPES,
  achievementTotal,
  countAchievements,
  type ITournamentWithMatches,
  PLAYER_IDS,
} from "@/domain";
import { ACHIEVEMENT_INFO, PlayerBadge } from "@/ui";

/** How many of each achievement S and V earned over all tournaments. */
const AchievementTotals = ({ all }: { all: ITournamentWithMatches[] }) => {
  const totals = countAchievements(all);
  return (
    <div className="flex flex-column gap-2">
      <div className="achievement-row achievement-row--head">
        <span />
        {PLAYER_IDS.map((id) => (
          <span key={id} className="flex justify-content-center">
            <PlayerBadge player={id} />
          </span>
        ))}
      </div>
      {ACHIEVEMENT_TYPES.map((type) => {
        const info = ACHIEVEMENT_INFO[type];
        const { S, V } = totals[type];
        return (
          <div
            key={type}
            className="achievement-row"
            title={`${info.name}: ${info.rule}`}
          >
            <span className="flex align-items-center gap-2 min-w-0">
              <span aria-hidden>{info.emoji}</span>
              <span className="white-space-nowrap overflow-hidden text-overflow-ellipsis">
                {info.name}
              </span>
            </span>
            <span className={S > V ? "font-bold" : "text-600"}>{S}</span>
            <span className={V > S ? "font-bold" : "text-600"}>{V}</span>
          </div>
        );
      })}
      <div className="achievement-row achievement-row--total">
        <span>Разом</span>
        {PLAYER_IDS.map((id) => (
          <span key={id}>{achievementTotal(totals, id)}</span>
        ))}
      </div>
    </div>
  );
};

export default AchievementTotals;
