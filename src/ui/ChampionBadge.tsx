import { classNames } from "primereact/utils";

import ClubLabel from "./ClubLabel";
import FluentIcon from "./FluentIcon";

import type { IClub } from "@/domain";

interface IChampionBadgeProps {
  club: IClub;
  /** The league table winner (silver) instead of the playoff champion (gold). */
  league?: boolean;
  className?: string;
}

/** Gold pill with a trophy: the club that won the playoff final. */
const ChampionBadge = ({ club, league, className }: IChampionBadgeProps) => (
  <span
    className={classNames(
      "champion-badge",
      { "champion-badge--league": league },
      className
    )}
    title={league ? "Переможець ліги" : "Чемпіон турніру"}
  >
    <FluentIcon name={league ? "Ribbon" : "Trophy"} size={16} />
    <ClubLabel name={club.name} clubId={club.id} owner={club.owner} bold />
  </span>
);

export default ChampionBadge;
