import { Column } from "primereact/column";
import { DataTable } from "primereact/datatable";
import { classNames } from "primereact/utils";

import ClubLabel from "./ClubLabel";

import type { IStandingRow } from "@/domain";
import { formatSigned } from "@/utils";

interface IStandingsTableProps {
  rows: IStandingRow[];
  /** Club ids in a playoff place, marked next to the position. */
  qualified?: Set<string>;
}

const num = (field: keyof IStandingRow, header: string, title: string) => (
  <Column
    field={field}
    header={<span title={title}>{header}</span>}
    className="text-center w-2rem px-1"
    headerClassName="text-center px-1"
  />
);

/** Group table: points, goal difference, head-to-head (see domain/standings.ts). */
const StandingsTable = ({ rows, qualified }: IStandingsTableProps) => (
  <DataTable
    value={rows}
    dataKey="club.id"
    size="small"
    className="standings-table"
  >
    <Column
      header="#"
      body={(row: IStandingRow) => (
        <span
          className={classNames("position-chip", {
            "position-chip--leader": row.position === 1 && row.played > 0,
            "position-chip--qualified":
              row.position !== 1 && qualified?.has(row.club.id),
          })}
        >
          {row.position}
        </span>
      )}
      className="w-2rem px-1"
    />
    <Column
      header="Клуб"
      body={(row: IStandingRow) => (
        <ClubLabel
          name={row.club.name}
          clubId={row.club.id}
          owner={row.club.owner}
          country={row.club.country}
          showFlag
          pot={row.club.pot}
        />
      )}
      className="standings-table__club"
    />
    {num("played", "І", "Ігри")}
    {num("won", "В", "Виграші")}
    {num("drawn", "Н", "Нічиї")}
    {num("lost", "П", "Поразки")}
    <Column
      header={<span title="Забиті та пропущені голи">М</span>}
      body={(row: IStandingRow) => `${row.goalsFor}:${row.goalsAgainst}`}
      className="text-center px-1 white-space-nowrap"
      headerClassName="text-center px-1"
    />
    <Column
      header={<span title="Різниця голів">±</span>}
      body={(row: IStandingRow) => formatSigned(row.goalDiff)}
      className="text-center px-1"
      headerClassName="text-center px-1"
    />
    <Column
      header={<span title="Очки">О</span>}
      body={(row: IStandingRow) => <span className="points">{row.points}</span>}
      className="text-center px-1"
      headerClassName="text-center px-1"
    />
  </DataTable>
);

export default StandingsTable;
