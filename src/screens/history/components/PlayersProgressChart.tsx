import { useRef, useState } from "react";

import { SelectButton } from "primereact/selectbutton";
import { classNames } from "primereact/utils";

import { type IPlayerProgress, PLAYER_IDS, type PlayerId } from "@/domain";
import { useWidth } from "@/hooks";
import { ClubLabel, PlayerBadge } from "@/ui";

type Metric = "won" | "points" | "goalsFor" | "titles";

const METRICS: { label: string; value: Metric }[] = [
  { label: "Перемоги", value: "won" },
  { label: "Очки", value: "points" },
  { label: "Голи", value: "goalsFor" },
  { label: "Титули", value: "titles" },
];

const HEIGHT = 240;
const TOP = 16;
const BOTTOM = 28;
const LEFT = 36;
const RIGHT = 56;

const valueOf = (point: IPlayerProgress, player: PlayerId, metric: Metric) =>
  metric === "titles" ? point.titles[player] : point.totals[player][metric];

/** Round step for about four grid lines up to `max`. */
const gridStep = (max: number) => {
  const raw = Math.max(1, max / 4);
  const power = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 5, 10].find((m) => m * power >= raw) ?? 10;
  return step * power;
};

/**
 * S and V running totals tournament after tournament (wins, points, goals
 * or titles), one line per player. Hover or tap a tournament for its numbers.
 */
const PlayersProgressChart = ({
  progress,
}: {
  progress: IPlayerProgress[];
}) => {
  const [metric, setMetric] = useState<Metric>("won");
  const [active, setActive] = useState<number | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const width = useWidth(boxRef);

  const last = progress.length - 1;
  const max = Math.max(
    1,
    ...progress.flatMap((point) =>
      PLAYER_IDS.map((player) => valueOf(point, player, metric))
    )
  );
  const step = gridStep(max);
  const top = Math.ceil(max / step) * step;
  const plotWidth = Math.max(0, width - LEFT - RIGHT);
  const x = (index: number) =>
    LEFT + (last > 0 ? (index * plotWidth) / last : plotWidth / 2);
  const y = (value: number) =>
    TOP + (HEIGHT - TOP - BOTTOM) * (1 - value / top);
  const ticks = Array.from({ length: top / step + 1 }, (_, i) => i * step);
  // Every tournament number fits on a wide screen; on a phone every n-th.
  const labelEvery = Math.max(1, Math.ceil((progress.length * 32) / plotWidth));

  const shown = active ?? last;
  const point = progress[shown];
  const pickAt = (clientX: number) => {
    const box = boxRef.current?.getBoundingClientRect();
    if (!box || last < 0) return;
    const index = Math.round(((clientX - box.left - LEFT) / plotWidth) * last);
    setActive(Math.min(Math.max(index, 0), last));
  };

  return (
    <div className="flex flex-column gap-3">
      <div className="flex flex-wrap align-items-center justify-content-between gap-2">
        <SelectButton
          value={metric}
          onChange={(e) => e.value && setMetric(e.value)}
          options={METRICS}
          allowEmpty={false}
          aria-label="Показник"
        />
        <span className="flex align-items-center gap-2 text-sm text-600">
          <PlayerBadge player="S" /> S
          <PlayerBadge player="V" /> V<span>разом після кожного турніру</span>
        </span>
      </div>

      <div ref={boxRef} className="progress-chart">
        {width > 0 && (
          <svg
            width={width}
            height={HEIGHT}
            role="img"
            aria-label={`${METRICS.find((m) => m.value === metric)?.label} S і V після кожного турніру`}
            onMouseMove={(e) => pickAt(e.clientX)}
            onMouseLeave={() => setActive(null)}
            onClick={(e) => pickAt(e.clientX)}
          >
            {ticks.map((tick) => (
              <g key={tick}>
                <line
                  x1={LEFT}
                  x2={LEFT + plotWidth}
                  y1={y(tick)}
                  y2={y(tick)}
                  className="timeline-grid"
                />
                <text
                  x={LEFT - 8}
                  y={y(tick)}
                  textAnchor="end"
                  dominantBaseline="central"
                  className="timeline-axis"
                >
                  {tick}
                </text>
              </g>
            ))}
            {progress.map(
              (p, index) =>
                (index % labelEvery === 0 || index === last) && (
                  <text
                    key={p.summary.tournament.id}
                    x={x(index)}
                    y={HEIGHT - 8}
                    textAnchor="middle"
                    className={classNames("timeline-axis", {
                      "timeline-axis--current": index === shown,
                    })}
                  >
                    №{p.summary.tournament.number}
                  </text>
                )
            )}
            <line
              x1={x(shown)}
              x2={x(shown)}
              y1={TOP}
              y2={HEIGHT - BOTTOM}
              className="progress-crosshair"
            />
            {PLAYER_IDS.map((player) => (
              <g key={player}>
                <path
                  d={`M${progress
                    .map((p, i) => `${x(i)},${y(valueOf(p, player, metric))}`)
                    .join("L")}`}
                  className={`timeline-line timeline-line--${player}`}
                />
                {progress.map((p, i) => (
                  <circle
                    key={p.summary.tournament.id}
                    cx={x(i)}
                    cy={y(valueOf(p, player, metric))}
                    r={i === shown ? 5 : 3.5}
                    className={`progress-dot progress-dot--${player}`}
                  />
                ))}
                <text
                  x={x(last) + 10}
                  y={y(valueOf(progress[last], player, metric))}
                  dominantBaseline="central"
                  className="progress-end-label"
                >
                  {player} {valueOf(progress[last], player, metric)}
                </text>
              </g>
            ))}
          </svg>
        )}
      </div>

      {point && (
        <div className="progress-detail text-sm">
          <div className="font-semibold mb-1">
            <span className="text-500">№{point.summary.tournament.number}</span>{" "}
            {point.summary.tournament.name}
          </div>
          <div className="flex flex-wrap align-items-center gap-3 text-600">
            {PLAYER_IDS.map((player) => (
              <span
                key={player}
                className="inline-flex align-items-center gap-2"
              >
                <PlayerBadge player={player} />
                {metric === "titles"
                  ? `${point.titles[player]} разом`
                  : `${point.summary.players[player][metric]} у турнірі, ${point.totals[player][metric]} разом`}
              </span>
            ))}
            {point.summary.champion && (
              <span className="inline-flex align-items-center gap-2">
                Чемпіон:
                <ClubLabel
                  name={point.summary.champion.name}
                  clubId={point.summary.champion.id}
                  owner={point.summary.champion.owner}
                />
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default PlayersProgressChart;
