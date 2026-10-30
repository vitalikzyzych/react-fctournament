import { classNames } from "primereact/utils";

import PlayerBadge from "./PlayerBadge";

import type { PlayerId } from "@/domain";

interface IClubLabelProps {
  name: string;
  owner?: PlayerId;
  /** "end" puts the badge after the name, for the away side of a match. */
  badgePosition?: "start" | "end";
  bold?: boolean;
  className?: string;
}

const ClubLabel = ({
  name,
  owner,
  badgePosition = "start",
  bold,
  className,
}: IClubLabelProps) => (
  <span
    className={classNames(
      "inline-flex align-items-center gap-2 min-w-0",
      { "flex-row-reverse": badgePosition === "end", "font-semibold": bold },
      className
    )}
  >
    {owner && <PlayerBadge player={owner} />}
    <span className="white-space-nowrap overflow-hidden text-overflow-ellipsis">
      {name}
    </span>
  </span>
);

export default ClubLabel;
