import PlayerBadge from "./PlayerBadge";

import type { PlayerRecords } from "@/domain";
import { formatPercent, formatSigned } from "@/utils";

interface IPlayerVersusCardProps {
  records: PlayerRecords;
  title?: string;
}

interface ICompareRow {
  label: string;
  s: string;
  v: string;
  /** Raw values for the mirrored bars; rows without them show numbers only. */
  bars?: [number, number];
}

const barWidth = (value: number, max: number) =>
  `${max ? (value / max) * 100 : 0}%`;

/** S against V: wins, draws, a split bar and mirrored bars per statistic. */
const PlayerVersusCard = ({ records, title }: IPlayerVersusCardProps) => {
  const { S, V } = records;
  const played = S.played;
  const share = (n: number) => (played ? `${(n / played) * 100}%` : "0%");

  const rows: ICompareRow[] = [
    { label: "Перемоги", s: `${S.won}`, v: `${V.won}`, bars: [S.won, V.won] },
    { label: "Нічиї", s: `${S.drawn}`, v: `${V.drawn}` },
    {
      label: "Забито",
      s: `${S.goalsFor}`,
      v: `${V.goalsFor}`,
      bars: [S.goalsFor, V.goalsFor],
    },
    {
      label: "Пропущено",
      s: `${S.goalsAgainst}`,
      v: `${V.goalsAgainst}`,
      bars: [S.goalsAgainst, V.goalsAgainst],
    },
    {
      label: "Різниця",
      s: formatSigned(S.goalDiff),
      v: formatSigned(V.goalDiff),
    },
    {
      label: "% перемог",
      s: formatPercent(S.winRate),
      v: formatPercent(V.winRate),
      bars: [S.winRate, V.winRate],
    },
  ];

  return (
    <div>
      {title && <div className="text-600 text-sm mb-2">{title}</div>}
      <div className="flex align-items-center justify-content-between mb-3">
        <div className="flex align-items-center gap-3">
          <PlayerBadge player="S" size="lg" />
          <span className="versus-total">{S.won}</span>
        </div>
        <div className="text-center text-500 text-xs line-height-3">
          <div>нічиїх {S.drawn}</div>
          <div>матчів {played}</div>
        </div>
        <div className="flex align-items-center gap-3">
          <span className="versus-total">{V.won}</span>
          <PlayerBadge player="V" size="lg" />
        </div>
      </div>

      <div className="versus-bar versus-bar--thick mb-4" aria-hidden>
        <span className="versus-bar__s" style={{ width: share(S.won) }} />
        <span className="versus-bar__draw" style={{ width: share(S.drawn) }} />
        <span className="versus-bar__v" style={{ width: share(V.won) }} />
      </div>

      <div className="flex flex-column gap-3 text-sm">
        {rows.map(({ label, s, v, bars }) => {
          const max = bars ? Math.max(bars[0], bars[1]) : 0;
          return (
            <div key={label}>
              <div className="flex justify-content-between align-items-baseline">
                <span className="font-bold w-4rem">{s}</span>
                <span className="text-500 text-xs font-medium">{label}</span>
                <span className="font-bold w-4rem text-right">{v}</span>
              </div>
              {bars && (
                <div className="compare-row__bars" aria-hidden>
                  <span>
                    <span
                      className="compare-row__fill is-s"
                      style={{ width: barWidth(bars[0], max) }}
                    />
                  </span>
                  <span>
                    <span
                      className="compare-row__fill is-v"
                      style={{ width: barWidth(bars[1], max) }}
                    />
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default PlayerVersusCard;
