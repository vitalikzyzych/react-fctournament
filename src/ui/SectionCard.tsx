import type { ReactNode } from "react";

import { classNames } from "primereact/utils";

interface ISectionCardProps {
  title?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}

const SectionCard = ({
  title,
  action,
  children,
  className,
}: ISectionCardProps) => (
  <section className={classNames("app-card p-3 md:p-4", className)}>
    {(title || action) && (
      <div className="flex align-items-center justify-content-between gap-2 mb-3">
        {title && <h2 className="section-title">{title}</h2>}
        {action}
      </div>
    )}
    {children}
  </section>
);

export default SectionCard;
