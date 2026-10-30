import { Tag } from "primereact/tag";

import type { TournamentStatus } from "@/domain";

export const STATUS_LABELS: Record<TournamentStatus, string> = {
  planned: "Заплановано",
  active: "Триває",
  completed: "Завершено",
};

const SEVERITY: Record<TournamentStatus, "info" | "success" | "secondary"> = {
  planned: "info",
  active: "success",
  completed: "secondary",
};

/** A running tournament gets a pulsing dot, like a live match. */
const StatusTag = ({ status }: { status: TournamentStatus }) => (
  <Tag
    value={STATUS_LABELS[status]}
    severity={SEVERITY[status]}
    icon={status === "active" ? <span className="live-dot" /> : undefined}
    rounded
  />
);

export default StatusTag;
