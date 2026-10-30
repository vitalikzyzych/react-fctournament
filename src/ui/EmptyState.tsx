import type { ReactNode } from "react";

import FluentIcon, { type IconName } from "./FluentIcon";

interface IEmptyStateProps {
  icon?: IconName;
  title: string;
  children?: ReactNode;
}

const EmptyState = ({
  icon = "SportSoccer",
  title,
  children,
}: IEmptyStateProps) => (
  <div className="flex flex-column align-items-center text-center gap-2 py-6 px-3 text-600">
    <FluentIcon name={icon} size={40} />
    <div className="text-lg font-semibold text-800">{title}</div>
    {children}
  </div>
);

export default EmptyState;
