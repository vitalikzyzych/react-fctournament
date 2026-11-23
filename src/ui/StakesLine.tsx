import ClubLabel from "./ClubLabel";

import type { IClub, IStakes } from "@/domain";
import { formatChance } from "@/utils";

interface IStakesLineProps {
  stakes: { home: IStakes; away: IStakes };
  home: IClub | undefined;
  away: IClub | undefined;
  /** What the chance is of: a playoff place, or a direct one in a league. */
  goal: string;
}

/**
 * What the next match means: each club's chance of a playoff place after a
 * win, a draw and a loss.
 */
const StakesLine = ({ stakes, home, away, goal }: IStakesLineProps) => {
  const sides = [
    { club: home, values: stakes.home },
    { club: away, values: stakes.away },
  ];
  return (
    <div
      className="stakes"
      title="Симуляція решти групового етапу після перемоги, нічиєї та поразки в цьому матчі (1:0, 1:1, 0:1)."
    >
      <span className="text-500 text-xs font-semibold">
        Що на кону: шанс {goal}
      </span>
      <div className="stakes__grid">
        <span />
        <span className="stakes__head">перемога</span>
        <span className="stakes__head">нічия</span>
        <span className="stakes__head">поразка</span>
        {sides.map(({ club, values }, index) => [
          <span key={`club${index}`} className="min-w-0 flex">
            {club && (
              <ClubLabel name={club.name} clubId={club.id} owner={club.owner} />
            )}
          </span>,
          <span
            key={`win${index}`}
            className="stakes__value stakes__value--win"
          >
            {formatChance(values.win)}
          </span>,
          <span key={`draw${index}`} className="stakes__value">
            {formatChance(values.draw)}
          </span>,
          <span
            key={`loss${index}`}
            className="stakes__value stakes__value--loss"
          >
            {formatChance(values.loss)}
          </span>,
        ])}
      </div>
    </div>
  );
};

export default StakesLine;
