import type { ReactNode } from "react";

import FluentIcon, { type IconName } from "./FluentIcon";

interface IStatCardProps {
  value: ReactNode;
  label: string;
  icon?: IconName;
  hint?: ReactNode;
}

/** Adapted from web-app's StatCard: a number with a short label. */
const StatCard = ({ value, label, icon, hint }: IStatCardProps) => (
  <div className="app-card p-3 h-full flex flex-column gap-2">
    <div className="flex align-items-center justify-content-between gap-2">
      <span className="text-500 text-sm font-medium">{label}</span>
      {icon && (
        <span className="stat-card__icon">
          <FluentIcon name={icon} size={18} />
        </span>
      )}
    </div>
    <div className="stat-card__value">{value}</div>
    {hint && <div className="text-xs text-500">{hint}</div>}
  </div>
);

export default StatCard;
