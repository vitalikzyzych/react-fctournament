import { computeScoreGrid, type IMatch, SCORE_GRID_MAX } from "@/domain";
import { formatPercent, plural } from "@/utils";

const goalsLabel = (n: number) => (n === SCORE_GRID_MAX ? `${n}+` : `${n}`);

/**
 * How often each score happened, the winner's goals down the side and the
 * loser's along the top (2:1 and 1:2 count together). Darker is more often.
 */
const ScoreGrid = ({ matches }: { matches: IMatch[] }) => {
  const grid = computeScoreGrid(matches);
  if (!grid.total) {
    return <div className="text-600">Ще немає зіграних матчів</div>;
  }
  const size = SCORE_GRID_MAX + 1;
  const ranked = grid.counts
    .flatMap((row, high) => row.map((count, low) => ({ high, low, count })))
    .filter((cell) => cell.count > 0)
    .sort((a, b) => b.count - a.count);
  const top = ranked[0];

  return (
    <div className="flex flex-column gap-3">
      <div className="score-grid" role="table" aria-label="Частота рахунків">
        <span className="score-grid__corner" />
        {Array.from({ length: size }, (_, low) => (
          <span key={low} className="score-grid__axis">
            {goalsLabel(low)}
          </span>
        ))}
        {grid.counts.map((row, high) => [
          <span key={`h${high}`} className="score-grid__axis">
            {goalsLabel(high)}
          </span>,
          ...row.map((count, low) => {
            const score = `${goalsLabel(high)}:${goalsLabel(low)}`;
            if (low > high) {
              return <span key={score} className="score-grid__cell--off" />;
            }
            return (
              <span
                key={score}
                className="score-grid__cell"
                style={{
                  // Computed shade: the share of the most frequent score.
                  opacity: count ? 0.25 + 0.75 * (count / grid.max) : 1,
                }}
                data-empty={count === 0 || undefined}
                title={`${score}: ${count} ${plural(count, ["матч", "матчі", "матчів"])}`}
              >
                {count || ""}
              </span>
            );
          }),
        ])}
      </div>
      {top && (
        <div className="text-sm text-600">
          Найчастіше:{" "}
          <span className="font-semibold text-color">
            {goalsLabel(top.high)}:{goalsLabel(top.low)}
          </span>{" "}
          ({formatPercent(top.count / grid.total)} матчів). Рядки: голи
          переможця, стовпці: голи суперника.
        </div>
      )}
    </div>
  );
};

export default ScoreGrid;
