import { useEffect, useMemo, useRef, useState } from "react";

import { Button } from "primereact/button";
import { InputSwitch } from "primereact/inputswitch";
import { SelectButton } from "primereact/selectbutton";
import { Slider } from "primereact/slider";
import { classNames } from "primereact/utils";

import {
  computeTimeline,
  type IMatch,
  isLeagueFormat,
  type ITimelineRow,
  type ITournament,
  LEAGUE_KNOCKOUT_PER_PLAYER,
  LEAGUE_QUALIFIERS_PER_PLAYER,
  PLAYER_IDS,
  seededRandom,
  simulateResults,
} from "@/domain";
import { useWidth } from "@/hooks";
import {
  ClubLabel,
  EmptyState,
  FluentIcon,
  PlayerBadge,
  SectionCard,
} from "@/ui";
import { crestUrl, findCatalogClub } from "@/utils";

interface ITimelineTabProps {
  tournament: ITournament;
  matches: IMatch[];
}

/** Animation speed: one matchday takes this long. */
const MS_PER_MATCHDAY = 1400;
const TOP = 30;
const LEFT = 34;
const CREST = 16;

/** Slow at both ends of a matchday, so the clubs settle into their places. */
const ease = (x: number) => x * x * (3 - 2 * x);

/** Time on the chart's scale: matchday index plus the eased part between two. */
const easedTime = (t: number) => {
  const day = Math.floor(t);
  return day + ease(t - day);
};

/** A value at time t, on the straight segment between two matchdays. */
const valueAt = (values: number[], t: number) => {
  const last = values.length - 1;
  const clamped = Math.min(Math.max(t, 0), last);
  const day = Math.floor(clamped);
  if (day >= last) return values[last];
  return values[day] + (values[day + 1] - values[day]) * (clamped - day);
};

const shorten = (name: string, max: number) =>
  name.length > max ? `${name.slice(0, max - 1)}…` : name;

/**
 * The playoff places at one matchday: the first two of a group; in a league
 * the 4 best S and the 4 best V clubs (round of 16) and the next 8 of each
 * player (knockout round).
 */
const placesAt = (
  rows: ITimelineRow[],
  day: number,
  league: boolean
): { direct: Set<string>; knockout: Set<string> } => {
  if (day === 0) return { direct: new Set(), knockout: new Set() };
  if (!league) {
    return {
      direct: new Set(
        rows.filter((row) => row.positions[day] <= 2).map((row) => row.club.id)
      ),
      knockout: new Set(),
    };
  }
  const sorted = [...rows].sort((a, b) => a.positions[day] - b.positions[day]);
  const pick = (from: number, to: number) =>
    PLAYER_IDS.flatMap((owner) =>
      sorted
        .filter((row) => row.club.owner === owner)
        .slice(from, to)
        .map((row) => row.club.id)
    );
  const direct = LEAGUE_QUALIFIERS_PER_PLAYER;
  return {
    direct: new Set(pick(0, direct)),
    knockout: new Set(pick(direct, direct + LEAGUE_KNOCKOUT_PER_PLAYER)),
  };
};

const dayLabel = (day: number) => (day === 0 ? "Старт" : `М${day}`);

/**
 * How the league table (or one group) moved, matchday by matchday, as a bump
 * chart. One
 * line per club in its player's colour, the crest at the line's tip.
 * "Відтворити" animates it. Real results show the matchdays played so far;
 * the simulation fills unplayed matches with random scores (nothing is
 * stored) to preview a whole season.
 */
const TimelineTab = ({ tournament, matches }: ITimelineTabProps) => {
  const league = isLeagueFormat(tournament.format);
  const [groupId, setGroupId] = useState(tournament.groups[0]?.id ?? "L");
  const hasResults = matches.some(
    (m) => m.stage === "group" && m.result !== null
  );
  const [simulate, setSimulate] = useState(!hasResults);
  const [seed, setSeed] = useState(1);
  // null follows the latest matchday; a number is a moment picked or played.
  const [time, setTime] = useState<number | null>(null);
  const [playing, setPlaying] = useState(false);
  const [hovered, setHovered] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const startRef = useRef(0);
  const boxRef = useRef<HTMLDivElement>(null);
  const width = useWidth(boxRef);

  const data = useMemo(
    () => (simulate ? simulateResults(matches, seededRandom(seed)) : matches),
    [simulate, seed, matches]
  );
  const timeline = useMemo(
    () => computeTimeline(tournament, data, groupId),
    [tournament, data, groupId]
  );
  const end = timeline.lastPlayed;
  const shown = Math.min(Math.max(time ?? end, 0), end);
  // Real results: only the matchdays played. Simulation: the whole season.
  const axisDays = simulate ? timeline.matchdays : end;

  useEffect(() => {
    if (!playing) return;
    let frame = 0;
    const started = performance.now();
    const from = startRef.current;
    const step = (now: number) => {
      const next = from + (now - started) / MS_PER_MATCHDAY;
      if (next >= end) {
        setTime(null);
        setPlaying(false);
        return;
      }
      setTime(next);
      frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [playing, end]);

  const play = () => {
    startRef.current = shown >= end ? 0 : shown;
    setTime(startRef.current);
    setPlaying(true);
  };

  const reroll = () => {
    setSeed((current) => current + 1);
    startRef.current = 0;
    setTime(0);
    setPlaying(true);
  };

  const toggleSimulation = (on: boolean) => {
    setPlaying(false);
    setTime(null);
    setSimulate(on);
  };

  const pickGroup = (id: string) => {
    setPlaying(false);
    setTime(null);
    setSelected(null);
    setGroupId(id);
  };

  const focus = hovered ?? selected;
  const focusRow = timeline.rows.find((row) => row.club.id === focus);
  const day = Math.round(shown);
  const places = placesAt(timeline.rows, day, league);
  // A group of 4 gets taller rows than a league of 40.
  const rowHeight = timeline.rows.length <= 8 ? 40 : 22;

  const narrow = width < 640;
  const right = narrow ? 104 : 190;
  const plotWidth = Math.max(0, width - LEFT - right);
  const plotRight = LEFT + plotWidth;
  const height = TOP + timeline.rows.length * rowHeight + 8;
  const x = (t: number) => LEFT + (axisDays ? (t * plotWidth) / axisDays : 0);
  const y = (position: number) => TOP + (position - 0.5) * rowHeight;
  const eased = easedTime(shown);

  const path = (row: ITimelineRow) => {
    const points: string[] = [];
    for (let d = 0; d <= Math.min(Math.floor(shown), axisDays); d += 1) {
      points.push(`${x(d)},${y(row.positions[d])}`);
    }
    if (eased > Math.floor(shown)) {
      points.push(`${x(eased)},${y(valueAt(row.positions, eased))}`);
    }
    return `M${points.join("L")}`;
  };

  // The focused club is drawn last, on top of the others.
  const ordered = [...timeline.rows].sort(
    (a, b) => Number(a.club.id === focus) - Number(b.club.id === focus)
  );

  return (
    <SectionCard title="Динаміка таблиці">
      <div className="flex flex-column gap-3">
        <div className="flex align-items-center gap-3">
          <Button
            icon={<FluentIcon name={playing ? "Pause" : "Play"} size={20} />}
            rounded
            aria-label={playing ? "Пауза" : "Відтворити"}
            tooltip={playing ? "Пауза" : "Відтворити"}
            tooltipOptions={{ position: "top" }}
            disabled={end === 0}
            onClick={playing ? () => setPlaying(false) : play}
          />
          <Slider
            value={shown}
            min={0}
            max={Math.max(end, 1)}
            step={0.01}
            disabled={end === 0}
            className="flex-1"
            aria-label="Тур"
            onChange={(e) => {
              if (typeof e.value !== "number") return;
              setPlaying(false);
              setTime(e.value);
            }}
          />
          <span className="text-sm font-semibold white-space-nowrap">
            {day === 0 ? "Старт" : `М${day} з ${axisDays}`}
          </span>
        </div>

        <div className="flex flex-wrap align-items-center gap-3 text-sm">
          {tournament.groups.length > 1 && (
            <SelectButton
              value={groupId}
              onChange={(e) => e.value && pickGroup(e.value)}
              options={tournament.groups.map((group) => ({
                label: group.name,
                value: group.id,
              }))}
              allowEmpty={false}
              aria-label="Група"
            />
          )}
          <label className="inline-flex align-items-center gap-2 cursor-pointer">
            <InputSwitch
              checked={simulate}
              onChange={(e) => toggleSimulation(e.value)}
            />
            Симуляція
          </label>
          {simulate && (
            <Button
              label="Ще раз"
              icon={<FluentIcon name="ArrowShuffle" />}
              size="small"
              outlined
              onClick={reroll}
            />
          )}
          <span className="flex align-items-center gap-2 text-600">
            <PlayerBadge player="S" /> клуби S
            <PlayerBadge player="V" /> клуби V
            {league ? (
              <>
                <span className="timeline-legend-dot" /> 1/8 фіналу
                <span className="timeline-legend-dot timeline-legend-dot--knockout" />{" "}
                стикові матчі
              </>
            ) : (
              <>
                <span className="timeline-legend-dot" /> місце в плей-офф
              </>
            )}
          </span>
        </div>

        {simulate && (
          <div className="notice notice--warning text-sm">
            Несправжні результати: незіграні матчі отримали випадковий рахунок,
            щоб показати, як могла б рухатися таблиця. Нічого не зберігається.
          </div>
        )}

        <div className="timeline-focus text-sm">
          {focusRow ? (
            <div className="flex flex-wrap align-items-center gap-2">
              <ClubLabel
                name={focusRow.club.name}
                clubId={focusRow.club.id}
                owner={focusRow.club.owner}
                bold
              />
              <span className="text-600">
                {focusRow.positions
                  .slice(0, end + 1)
                  .map((p, d) => `${dayLabel(d)}: ${p}`)
                  .join(" · ")}
                {end > 0 && `, очок ${focusRow.points[end]}`}
              </span>
            </div>
          ) : (
            <span className="text-600">
              Наведіть або натисніть на лінію чи клуб, щоб виділити його.
            </span>
          )}
        </div>

        <div ref={boxRef} className="timeline-chart">
          {end === 0 && !simulate ? (
            <EmptyState icon="DataLine" title="Ще немає зіграних турів">
              <p className="m-0 text-sm">
                Увімкніть симуляцію, щоб подивитися, як це виглядатиме.
              </p>
            </EmptyState>
          ) : (
            width > 0 && (
              <svg
                width={width}
                height={height}
                role="img"
                aria-label={`Місця клубів після кожного туру, ${dayLabel(day)}`}
                className={classNames({ "timeline--focus": focus })}
                onClick={() => setSelected(null)}
              >
                {timeline.rows.map((_, index) => (
                  <g key={index}>
                    <line
                      x1={LEFT}
                      x2={plotRight}
                      y1={y(index + 1)}
                      y2={y(index + 1)}
                      className="timeline-grid"
                    />
                    <text
                      x={LEFT - 8}
                      y={y(index + 1)}
                      textAnchor="end"
                      dominantBaseline="central"
                      className="timeline-axis"
                    >
                      {index + 1}
                    </text>
                  </g>
                ))}
                {Array.from({ length: axisDays + 1 }, (_, d) => (
                  <g key={d}>
                    <line
                      x1={x(d)}
                      x2={x(d)}
                      y1={TOP - 6}
                      y2={height - 8}
                      className="timeline-grid"
                    />
                    <text
                      x={x(d)}
                      y={TOP - 14}
                      textAnchor="middle"
                      className={classNames("timeline-axis", {
                        "timeline-axis--current": d === day,
                      })}
                    >
                      {dayLabel(d)}
                    </text>
                  </g>
                ))}

                {ordered.map((row) => {
                  const { club } = row;
                  const tipY = y(valueAt(row.positions, eased));
                  const tipX = x(eased);
                  const catalogClub = findCatalogClub(club.id, club.name);
                  const isFocus = club.id === focus;
                  return (
                    <g
                      key={club.id}
                      className={classNames("timeline-row", {
                        "is-focus": isFocus,
                      })}
                      onMouseEnter={() => setHovered(club.id)}
                      onMouseLeave={() => setHovered(null)}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelected((current) =>
                          current === club.id ? null : club.id
                        );
                      }}
                    >
                      <path d={path(row)} className="timeline-hit" />
                      <path
                        d={path(row)}
                        className={`timeline-line timeline-line--${club.owner}`}
                      />
                      <circle
                        cx={tipX}
                        cy={tipY}
                        r={CREST / 2 + 2}
                        className={`timeline-crest-ring timeline-crest-ring--${club.owner}`}
                      />
                      {catalogClub ? (
                        <image
                          href={crestUrl(catalogClub, 40)}
                          x={tipX - CREST / 2}
                          y={tipY - CREST / 2}
                          width={CREST}
                          height={CREST}
                        />
                      ) : (
                        <text
                          x={tipX}
                          y={tipY}
                          textAnchor="middle"
                          dominantBaseline="central"
                          className="timeline-axis"
                        >
                          {club.name.charAt(0)}
                        </text>
                      )}
                      {/* Names keep one row each, at the place of the
                          nearest matchday, and slide there (CSS transition),
                          so they never overlap while the lines move. */}
                      <g
                        className="timeline-label"
                        style={{
                          transform: `translateY(${y(row.positions[day])}px)`,
                        }}
                      >
                        {places.direct.has(club.id) && (
                          <circle
                            cx={plotRight + 18}
                            cy={0}
                            r={3}
                            className="timeline-qualified"
                          />
                        )}
                        {places.knockout.has(club.id) && (
                          <circle
                            cx={plotRight + 18}
                            cy={0}
                            r={2.5}
                            className="timeline-knockout"
                          />
                        )}
                        <text
                          x={plotRight + 26}
                          dominantBaseline="central"
                          className="timeline-name"
                        >
                          {shorten(club.name, narrow ? 8 : 18)}
                        </text>
                        <text
                          x={width - 4}
                          textAnchor="end"
                          dominantBaseline="central"
                          className="timeline-points"
                        >
                          {row.points[day]}
                        </text>
                      </g>
                    </g>
                  );
                })}
              </svg>
            )
          )}
        </div>
      </div>
    </SectionCard>
  );
};

export default TimelineTab;
