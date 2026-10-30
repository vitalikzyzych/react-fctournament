import { classNames } from "primereact/utils";

import ClubLabel from "./ClubLabel";
import FluentIcon from "./FluentIcon";

import type { IClub } from "@/domain";

interface IChampionBadgeProps {
  club: IClub;
  className?: string;
}

/** Gold pill with a trophy: the club that won the playoff final. */
const ChampionBadge = ({ club, className }: IChampionBadgeProps) => (
  <span
    className={classNames("champion-badge", className)}
    title="Чемпіон турніру"
  >
    <FluentIcon name="Trophy" size={16} />
    <ClubLabel name={club.name} clubId={club.id} owner={club.owner} bold />
  </span>
);

export default ChampionBadge;
