import {
  computeGoalsPerMatch,
  GOAL_FEST_GOALS,
  GOALS_CHART_MAX,
  type IClub,
  type IMatch,
} from "@/domain";
import { MatchLine } from "@/ui";
import { formatPercent, plural } from "@/utils";

const matchesWord = (n: number) =>
  `${n} ${plural(n, ["матч", "матчі", "матчів"])}`;

/**
 * How many matches ended with 0, 1, 2 ... goals in total, as columns, with
 * the goal-fest totals marked, and the match with the most goals.
 */
const GoalsPerMatch = ({
  clubs,
  matches,
}: {
  clubs: IClub[];
  matches: IMatch[];
}) => {
  const { counts, total, most } = computeGoalsPerMatch(matches);
  if (!total) return <div className="text-600">Ще немає зіграних матчів</div>;
  const max = Math.max(...counts);
  const fests = counts
    .slice(GOAL_FEST_GOALS)
    .reduce((sum, count) => sum + count, 0);
  const clubsById = new Map(clubs.map((club) => [club.id, club]));

  return (
    <div className="flex flex-column gap-3">
      <div className="goals-chart" role="img" aria-label="Голів у матчі">
        {counts.map((count, goals) => (
          <div
            key={goals}
            className="goals-chart__col"
            title={`${goals === GOALS_CHART_MAX ? `${goals}+` : goals} голів: ${matchesWord(count)}`}
          >
            <span className="goals-chart__count">{count || ""}</span>
            <span
              className={
                goals >= GOAL_FEST_GOALS
                  ? "goals-chart__bar goals-chart__bar--fest"
                  : "goals-chart__bar"
              }
              // Computed height: share of the most common total.
              style={{ height: `${max ? (count / max) * 100 : 0}%` }}
            />
            <span className="goals-chart__label">
              {goals === GOALS_CHART_MAX ? `${goals}+` : goals}
            </span>
          </div>
        ))}
      </div>
      <div className="text-sm text-600">
        Голів у матчі разом. {GOAL_FEST_GOALS} і більше (голеада):{" "}
        <span className="font-semibold text-color">{matchesWord(fests)}</span> (
        {formatPercent(fests / total)}).
      </div>
      {most && (
        <div className="flex flex-column gap-2">
          <span className="text-xs text-500 uppercase font-semibold">
            Найбільше голів
          </span>
          <MatchLine match={most} clubsById={clubsById} />
        </div>
      )}
    </div>
  );
};

export default GoalsPerMatch;
