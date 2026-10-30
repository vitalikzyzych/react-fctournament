import type { IconName } from "@/ui";

export interface INavItem {
  to: string;
  label: string;
  shortLabel: string;
  icon: IconName;
}

export const NAV_ITEMS: INavItem[] = [
  { to: "/", label: "Головна", shortLabel: "Головна", icon: "Home" },
  {
    to: "/tournaments",
    label: "Турніри",
    shortLabel: "Турніри",
    icon: "Trophy",
  },
  {
    to: "/history",
    label: "Історія та статистика",
    shortLabel: "Історія",
    icon: "DataHistogram",
  },
  {
    to: "/import",
    label: "Імпорт / Експорт",
    shortLabel: "Імпорт",
    icon: "ArrowImport",
  },
];
