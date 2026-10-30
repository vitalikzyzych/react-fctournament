import { classNames } from "primereact/utils";

import type { PlayerId } from "@/domain";

interface IPlayerBadgeProps {
  player: PlayerId;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

/** Round badge with the player letter: S is red, V is blue. */
const PlayerBadge = ({ player, size = "sm", className }: IPlayerBadgeProps) => (
  <span
    className={classNames(
      "player-badge",
      `player-badge--${player}`,
      `player-badge--${size}`,
      className
    )}
    title={`Гравець ${player}`}
  >
    {player}
  </span>
);

export default PlayerBadge;
