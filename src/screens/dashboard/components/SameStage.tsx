import type { ISameStage } from "@/domain";
import { PlayerBadge } from "@/ui";
import { plural } from "@/utils";

/**
 * S and V wins after the same number of matches in this and in earlier
 * tournaments, a bar per tournament.
 */
const SameStage = ({ stage }: { stage: ISameStage }) => (
  <div className="flex flex-column gap-3">
    <span className="text-sm text-600">
      Перемоги після {stage.played}{" "}
      {plural(stage.played, ["матчу", "матчів", "матчів"])} у кожному турнірі
    </span>
    {stage.rows.map(({ tournament, records }, index) => {
      const { S, V } = records;
      const total = S.won + V.won + S.drawn || 1;
      return (
        <div key={tournament.id} className="flex flex-column gap-1">
          <div className="flex align-items-center justify-content-between gap-2 text-sm">
            <span className={index === 0 ? "font-bold" : "text-600"}>
              №{tournament.number} {tournament.name}
              {index === 0 && " (зараз)"}
            </span>
            <span className="flex align-items-center gap-2 font-semibold white-space-nowrap">
              <PlayerBadge player="S" /> {S.won} : {V.won}{" "}
              <PlayerBadge player="V" />
            </span>
          </div>
          <span className="versus-bar">
            {/* Computed widths: wins of S, draws, wins of V. */}
            <span
              className="versus-bar__s"
              style={{ width: `${(S.won / total) * 100}%` }}
            />
            <span
              className="versus-bar__draw"
              style={{ width: `${(S.drawn / total) * 100}%` }}
            />
            <span
              className="versus-bar__v"
              style={{ width: `${(V.won / total) * 100}%` }}
            />
          </span>
        </div>
      );
    })}
  </div>
);

export default SameStage;
