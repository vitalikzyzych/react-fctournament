import { Column } from "primereact/column";
import { DataTable } from "primereact/datatable";
import { classNames } from "primereact/utils";

import ClubLabel from "./ClubLabel";

import {
  type IClub,
  type IFormEntry,
  type IStandingRow,
  OUTCOME_LABELS,
} from "@/domain";
import { formatChance, formatScore, formatSigned } from "@/utils";

interface IStandingsTableProps {
  rows: IStandingRow[];
  /** Club ids in a playoff place, marked next to the position. */
  qualified?: Set<string>;
  /** League: club ids in a knockout-round place, marked more softly. */
  knockout?: Set<string>;
  /** Makes rows clickable, for example to open the club's matches. */
  onClubClick?: (club: IClub) => void;
  /** Last results per club id (computeForm); adds the form column. */
  form?: Map<string, IFormEntry[]>;
  /** Playoff chance per club id (computePlayoffChances); adds a column. */
  chances?: Map<string, number> | null;
  /** Tooltip of the chance column. */
  chanceTitle?: string;
}

const FORM_LETTERS = { win: "В", draw: "Н", loss: "П" };

const formTitle = (clubId: string, { match, outcome }: IFormEntry) => {
  const own = match.home === clubId;
  const score = formatScore({
    home: own ? match.result.home : match.result.away,
    away: own ? match.result.away : match.result.home,
  });
  const day = match.stage === "group" ? `Тур ${match.matchday}: ` : "";
  return `${day}${OUTCOME_LABELS[outcome]} ${score}`;
};

const num = (field: keyof IStandingRow, header: string, title: string) => (
  <Column
    field={field}
    header={<span title={title}>{header}</span>}
    className="text-center w-2rem px-1"
    headerClassName="text-center px-1"
  />
);

/** Group table: points, goal difference, head-to-head (see domain/standings.ts). */
const StandingsTable = ({
  rows,
  qualified,
  knockout,
  onClubClick,
  form,
  chances,
  chanceTitle = "Шанс вийти в плей-офф",
}: IStandingsTableProps) => (
  // A container: narrow tables (phones, half-width group cards) drop the
  // wide columns, see .standings-wrap in main.css.
  <div className="standings-wrap">
    <DataTable
      value={rows}
      dataKey="club.id"
      size="small"
      className="standings-table"
      onRowClick={
        onClubClick
          ? (e) => {
              const row = rows[e.index];
              if (row) onClubClick(row.club);
            }
          : undefined
      }
      rowClassName={() => (onClubClick ? "cursor-pointer" : "")}
    >
      <Column
        header="#"
        body={(row: IStandingRow) => (
          <span
            className={classNames("position-chip", {
              "position-chip--leader": row.position === 1 && row.played > 0,
              "position-chip--qualified":
                row.position !== 1 && qualified?.has(row.club.id),
              "position-chip--knockout": knockout?.has(row.club.id),
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
        // On a phone the chance column takes the place of the goals.
        className={classNames("text-center px-1 white-space-nowrap", {
          "standings-table__wide": chances,
        })}
        headerClassName={classNames("text-center px-1", {
          "standings-table__wide": chances,
        })}
      />
      <Column
        header={<span title="Різниця голів">±</span>}
        body={(row: IStandingRow) => formatSigned(row.goalDiff)}
        className="text-center px-1"
        headerClassName="text-center px-1"
      />
      <Column
        header={<span title="Очки">О</span>}
        body={(row: IStandingRow) => (
          <span className="points">{row.points}</span>
        )}
        className="text-center px-1"
        headerClassName="text-center px-1"
      />
      {form && (
        <Column
          header="Форма"
          body={(row: IStandingRow) => (
            <span className="form-chips">
              {(form.get(row.club.id) ?? []).map((entry) => (
                <span
                  key={entry.match.id}
                  className={`form-chip form-chip--${entry.outcome}`}
                  title={formTitle(row.club.id, entry)}
                >
                  {FORM_LETTERS[entry.outcome]}
                </span>
              ))}
            </span>
          )}
          className="standings-table__wide px-1"
          headerClassName="standings-table__wide px-1"
        />
      )}
      {chances && (
        <Column
          header={<span title={chanceTitle}>Шанс</span>}
          body={(row: IStandingRow) => {
            const chance = chances.get(row.club.id) ?? 0;
            return (
              <span
                className={classNames("chance", {
                  "chance--high": chance >= 0.5,
                })}
              >
                {formatChance(chance)}
              </span>
            );
          }}
          className="text-right px-1 white-space-nowrap"
          headerClassName="text-right px-1"
        />
      )}
    </DataTable>
  </div>
);

export default StandingsTable;
