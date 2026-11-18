import { useRef, useState } from "react";

import { classNames } from "primereact/utils";

import PlayerBadge from "./PlayerBadge";

import { PLAYER_IDS, type PlayerId } from "@/domain";
import { useWidth } from "@/hooks";

export interface IDuelPoint {
  label: string;
  values: Record<PlayerId, number>;
}

interface IDuelLineChartProps {
  points: IDuelPoint[];
  /** Name of the measure, for the screen reader and the detail line. */
  measure: string;
  height?: number;
}

const TOP = 14;
const BOTTOM = 26;
const LEFT = 34;
const RIGHT = 44;
const LABEL_GAP = 14;

/** Round step for about four grid lines up to `max`. */
const gridStep = (max: number) => {
  const raw = Math.max(1, max / 4);
  const power = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 5, 10].find((m) => m * power >= raw) ?? 10;
  return step * power;
};

/**
 * Two lines, S in red and V in blue, over a row of steps (matchdays,
 * rounds). Hover or tap a step for both values.
 */
const DuelLineChart = ({
  points,
  measure,
  height = 200,
}: IDuelLineChartProps) => {
  const [active, setActive] = useState<number | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const width = useWidth(boxRef);

  const last = points.length - 1;
  const max = Math.max(
    1,
    ...points.flatMap((p) => PLAYER_IDS.map((id) => p.values[id]))
  );
  const step = gridStep(max);
  const top = Math.ceil(max / step) * step;
  const plotWidth = Math.max(0, width - LEFT - RIGHT);
  const x = (i: number) =>
    LEFT + (last > 0 ? (i * plotWidth) / last : plotWidth / 2);
  const y = (v: number) => TOP + (height - TOP - BOTTOM) * (1 - v / top);
  const ticks = Array.from({ length: top / step + 1 }, (_, i) => i * step);
  const labelEvery = Math.max(1, Math.ceil((points.length * 36) / plotWidth));
  // End labels at least LABEL_GAP apart, the higher value on top.
  const endY = (id: PlayerId) => {
    if (last < 0) return 0;
    const own = y(points[last].values[id]);
    const otherId = id === "S" ? "V" : "S";
    const rival = y(points[last].values[otherId]);
    if (Math.abs(own - rival) >= LABEL_GAP) return own;
    const middle = (own + rival) / 2;
    const above = own < rival || (own === rival && id === "S");
    return middle + (above ? -LABEL_GAP / 2 : LABEL_GAP / 2);
  };
  const shown = active ?? last;
  const point = points[shown];

  const pickAt = (clientX: number) => {
    const box = boxRef.current?.getBoundingClientRect();
    if (!box || last < 0) return;
    const index = Math.round(((clientX - box.left - LEFT) / plotWidth) * last);
    setActive(Math.min(Math.max(index, 0), last));
  };

  return (
    <div className="flex flex-column gap-2">
      <div ref={boxRef} className="progress-chart">
        {width > 0 && (
          <svg
            width={width}
            height={height}
            role="img"
            aria-label={`${measure} S і V`}
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
            {points.map(
              (p, i) =>
                (i % labelEvery === 0 || i === last) && (
                  <text
                    key={p.label}
                    x={x(i)}
                    y={height - 8}
                    textAnchor="middle"
                    className={classNames("timeline-axis", {
                      "timeline-axis--current": i === shown,
                    })}
                  >
                    {p.label}
                  </text>
                )
            )}
            <line
              x1={x(shown)}
              x2={x(shown)}
              y1={TOP}
              y2={height - BOTTOM}
              className="progress-crosshair"
            />
            {PLAYER_IDS.map((id) => (
              <g key={id}>
                <path
                  d={`M${points.map((p, i) => `${x(i)},${y(p.values[id])}`).join("L")}`}
                  className={`timeline-line timeline-line--${id}`}
                />
                {points.map((p, i) => (
                  <circle
                    key={p.label}
                    cx={x(i)}
                    cy={y(p.values[id])}
                    r={i === shown ? 5 : 3.5}
                    className={`progress-dot progress-dot--${id}`}
                  />
                ))}
                {last >= 0 && (
                  <text
                    x={x(last) + 10}
                    y={endY(id)}
                    dominantBaseline="central"
                    className="progress-end-label"
                  >
                    {id} {points[last].values[id]}
                  </text>
                )}
              </g>
            ))}
          </svg>
        )}
      </div>
      {point && (
        <div className="flex flex-wrap align-items-center gap-3 text-sm text-600">
          <span className="font-semibold text-color">{point.label}</span>
          {PLAYER_IDS.map((id) => (
            <span key={id} className="inline-flex align-items-center gap-2">
              <PlayerBadge player={id} />
              {point.values[id]}
            </span>
          ))}
          <span>{measure}</span>
        </div>
      )}
    </div>
  );
};

export default DuelLineChart;
