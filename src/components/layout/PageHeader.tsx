import type { ReactNode } from "react";

interface IPageHeaderProps {
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
}

const PageHeader = ({ title, subtitle, actions }: IPageHeaderProps) => (
  <header className="flex flex-column md:flex-row md:align-items-center justify-content-between gap-3 mb-4">
    <div className="min-w-0">
      <h1 className="page-title text-3xl md:text-4xl">{title}</h1>
      {subtitle && <div className="text-500 mt-2">{subtitle}</div>}
    </div>
    {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
  </header>
);

export default PageHeader;
