import ClubLabel from "./ClubLabel";

import type { IClub, ITieChance } from "@/domain";
import { formatChance } from "@/utils";

interface ITieChanceProps {
  chance: ITieChance;
  /** The tie's clubs in its own order (home in game 1 first). */
  home: IClub | undefined;
  away: IClub | undefined;
}

/**
 * Each club's chance to go through a playoff tie, as a split bar in the
 * players' colours with both percentages.
 */
const TieChance = ({ chance, home, away }: ITieChanceProps) => (
  <div
    className="tie-chance"
    title="Симуляція решти матчів пари (5000 разів): голи кожного клубу за матч у цьому турнірі, забиті й пропущені, від групового етапу до останнього матчу. Уже зіграні матчі пари враховано з їхнім рахунком."
  >
    <div className="flex align-items-center justify-content-between gap-2 text-xs">
      <span className="text-500 font-semibold">Шанс пройти далі</span>
    </div>
    <div className="tie-chance__row">
      <span className="tie-chance__side min-w-0">
        {home && (
          <ClubLabel name={home.name} clubId={home.id} owner={home.owner} />
        )}
        <span className="tie-chance__value">{formatChance(chance.home)}</span>
      </span>
      <span className="versus-bar tie-chance__bar">
        <span
          className={home?.owner === "V" ? "versus-bar__v" : "versus-bar__s"}
          // Computed width: the share of the first club.
          style={{ width: `${chance.home * 100}%` }}
        />
        <span
          className={away?.owner === "S" ? "versus-bar__s" : "versus-bar__v"}
          style={{ width: `${chance.away * 100}%` }}
        />
      </span>
      <span className="tie-chance__side tie-chance__side--end min-w-0">
        <span className="tie-chance__value">{formatChance(chance.away)}</span>
        {away && (
          <ClubLabel
            name={away.name}
            clubId={away.id}
            owner={away.owner}
            badgePosition="end"
          />
        )}
      </span>
    </div>
  </div>
);

export default TieChance;
