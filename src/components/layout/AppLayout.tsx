import { NavLink, Outlet } from "react-router-dom";

import { ProgressSpinner } from "primereact/progressspinner";

import { NAV_ITEMS } from "./navigation";

import { useTournamentData } from "@/providers";
import { FluentIcon, PlayerBadge } from "@/ui";

/** Sidebar from 768px, bottom navigation on phones. */
const AppLayout = () => {
  const { loading, error } = useTournamentData();

  return (
    <div className="min-h-screen">
      <aside className="app-sidebar hidden md:flex flex-column p-3 gap-1">
        <div className="flex align-items-center gap-3 px-2 py-3 mb-3">
          <span className="app-brand__badges">
            <PlayerBadge player="S" size="md" />
            <PlayerBadge player="V" size="md" />
          </span>
          <div>
            <div className="app-brand__name">FC Турніри</div>
            <div className="text-xs text-500">S проти V</div>
          </div>
        </div>
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/"}
            className="nav-link"
          >
            <FluentIcon name={item.icon} size={20} />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </aside>

      <main className="app-main">
        {error && (
          <div className="notice notice--error mb-3">
            <FluentIcon name="ErrorCircle" size={20} />
            <span>Не вдалося завантажити дані: {error}</span>
          </div>
        )}
        {loading ? (
          <div className="flex justify-content-center py-8">
            <ProgressSpinner
              style={{ width: "3rem", height: "3rem" }}
              strokeWidth="4"
            />
          </div>
        ) : (
          <Outlet />
        )}
      </main>

      <nav className="app-bottom-nav flex md:hidden">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/"}
            className="nav-link"
          >
            <FluentIcon name={item.icon} size={22} />
            <span>{item.shortLabel}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
};

export default AppLayout;
