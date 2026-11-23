import { useMemo, useState } from "react";

import { Column } from "primereact/column";
import { DataTable } from "primereact/datatable";
import { Dropdown } from "primereact/dropdown";
import { InputText } from "primereact/inputtext";
import { SelectButton } from "primereact/selectbutton";

import ClubHistoryDialog from "./ClubHistoryDialog";

import {
  computeClubHistories,
  computeMedals,
  type IClubHistory,
  type IRecord,
  type ITournamentWithMatches,
} from "@/domain";
import { useRatings } from "@/hooks";
import { ClubLabel, SectionCard } from "@/ui";
import { formatAverage, formatPercent, formatSigned } from "@/utils";

type View = "total" | "average";

const VIEWS: { label: string; value: View }[] = [
  { label: "Усього", value: "total" },
  { label: "За матч", value: "average" },
];

/** Averages of a handful of matches say little, so they can be left out. */
const MIN_PLAYED = [1, 5, 10, 20].map((n) => ({
  label: `від ${n} ${n === 1 ? "матчу" : "матчів"}`,
  value: n,
}));

/** Per-match numbers of a club, for the "За матч" view. */
interface IAverage {
  /** Shares of wins, draws and losses, 0 to 1. */
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDiff: number;
  points: number;
}

interface IClubRow extends IClubHistory {
  average: IAverage;
  /** Elo rating over every tournament, whatever the playoff switch says. */
  rating: number;
  gold: number;
  silver: number;
  bronze: number;
}

const averageOf = (record: IRecord): IAverage => {
  const per = (n: number) => (record.played ? n / record.played : 0);
  return {
    won: per(record.won),
    drawn: per(record.drawn),
    lost: per(record.lost),
    goalsFor: per(record.goalsFor),
    goalsAgainst: per(record.goalsAgainst),
    goalDiff: per(record.goalDiff),
    points: per(record.points),
  };
};

const signedAverage = (n: number) =>
  n > 0 ? `+${formatAverage(n)}` : formatAverage(n);

const ClubsHistory = ({
  all,
  includePlayoff,
}: {
  all: ITournamentWithMatches[];
  includePlayoff: boolean;
}) => {
  const ratings = useRatings();
  const histories = useMemo<IClubRow[]>(() => {
    const medals = new Map(
      computeMedals(all).clubs.map((row) => [row.clubId, row])
    );
    return computeClubHistories(all, includePlayoff).map((history) => {
      const medal = medals.get(history.clubId);
      return {
        ...history,
        average: averageOf(history.total),
        rating: Math.round(ratings.byClub.get(history.clubId)?.rating ?? 0),
        gold: medal?.gold ?? 0,
        silver: medal?.silver ?? 0,
        bronze: medal?.bronze ?? 0,
      };
    });
  }, [all, includePlayoff, ratings]);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<IClubHistory | null>(null);
  const [view, setView] = useState<View>("total");
  const [minPlayed, setMinPlayed] = useState(5);
  const average = view === "average";

  const visible = histories.filter(
    (h) =>
      h.name.toLowerCase().includes(search.trim().toLowerCase()) &&
      (!average || h.total.played >= minPlayed)
  );

  const totalColumns = [
    <Column
      key="won"
      field="total.won"
      header="В"
      sortable
      className="text-center"
    />,
    <Column
      key="drawn"
      field="total.drawn"
      header="Н"
      sortable
      className="text-center"
    />,
    <Column
      key="lost"
      field="total.lost"
      header="П"
      sortable
      className="text-center"
    />,
    <Column
      key="goals"
      header="М"
      body={(h: IClubRow) => `${h.total.goalsFor}:${h.total.goalsAgainst}`}
      className="text-center white-space-nowrap"
    />,
    <Column
      key="diff"
      field="total.goalDiff"
      header="±"
      sortable
      body={(h: IClubRow) => formatSigned(h.total.goalDiff)}
      className="text-center"
    />,
    <Column
      key="points"
      field="total.points"
      header="О"
      sortable
      className="text-center font-bold"
    />,
  ];

  const share = (
    key: "won" | "drawn" | "lost",
    header: string,
    title: string
  ) => (
    <Column
      key={key}
      field={`average.${key}`}
      header={<span title={title}>{header}</span>}
      sortable
      body={(h: IClubRow) => formatPercent(h.average[key])}
      className="text-center"
    />
  );

  const averageColumns = [
    share("won", "В %", "Частка виграних матчів"),
    share("drawn", "Н %", "Частка нічиїх"),
    share("lost", "П %", "Частка програних матчів"),
    <Column
      key="goalsFor"
      field="average.goalsFor"
      header={<span title="Забиті голи за матч">Заб.</span>}
      sortable
      body={(h: IClubRow) => formatAverage(h.average.goalsFor)}
      className="text-center"
    />,
    <Column
      key="goalsAgainst"
      field="average.goalsAgainst"
      header={<span title="Пропущені голи за матч">Проп.</span>}
      sortable
      body={(h: IClubRow) => formatAverage(h.average.goalsAgainst)}
      className="text-center"
    />,
    <Column
      key="diff"
      field="average.goalDiff"
      header={<span title="Різниця голів за матч">±</span>}
      sortable
      body={(h: IClubRow) => signedAverage(h.average.goalDiff)}
      className="text-center"
    />,
    <Column
      key="points"
      field="average.points"
      header={<span title="Очки за матч">О</span>}
      sortable
      body={(h: IClubRow) => formatAverage(h.average.points)}
      className="text-center font-bold"
    />,
  ];

  return (
    <SectionCard
      title="Клуби в усіх турнірах"
      action={
        <InputText
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Пошук клубу"
          className="w-10rem md:w-14rem"
        />
      }
    >
      <div className="flex flex-wrap align-items-center gap-2 mb-3">
        <SelectButton
          value={view}
          onChange={(e) => e.value && setView(e.value)}
          options={VIEWS}
          allowEmpty={false}
          aria-label="Показники"
        />
        {average && (
          <Dropdown
            value={minPlayed}
            onChange={(e) => setMinPlayed(e.value)}
            options={MIN_PLAYED}
            aria-label="Мінімум матчів"
          />
        )}
      </div>
      <DataTable
        // A fresh sort per view: per match starts with the best points.
        key={view}
        sortField={average ? "average.points" : undefined}
        sortOrder={average ? -1 : undefined}
        value={visible}
        dataKey="clubId"
        size="small"
        scrollable
        selectionMode="single"
        // The row index counts in the sorted order, so find the club by id.
        onRowClick={(e) =>
          setSelected(visible.find((h) => h.clubId === e.data.clubId) ?? null)
        }
        rowClassName={() => "cursor-pointer"}
        emptyMessage={
          average
            ? "Немає клубів з такою кількістю матчів"
            : "Клубів не знайдено"
        }
      >
        <Column
          field="name"
          header="Клуб"
          sortable
          body={(h: IClubHistory) => (
            <ClubLabel
              name={h.name}
              clubId={h.clubId}
              country={h.country}
              showFlag
            />
          )}
        />
        <Column
          header="Турн."
          body={(h: IClubRow) => h.entries.length}
          className="text-center"
        />
        <Column
          header="За S"
          body={(h: IClubRow) => h.timesByPlayer.S}
          className="text-center"
        />
        <Column
          header="За V"
          body={(h: IClubRow) => h.timesByPlayer.V}
          className="text-center"
        />
        <Column
          field="rating"
          header={<span title="Рейтинг клубу за всі турніри">Рейт.</span>}
          sortable
          body={(h: IClubRow) => h.rating || "–"}
          className="text-center"
        />
        <Column
          field="gold"
          header={
            <span title="Медалі завершених турнірів: чемпіон, фіналіст, півфіналіст">
              Медалі
            </span>
          }
          sortable
          body={(h: IClubRow) =>
            h.gold + h.silver + h.bronze ? (
              <span className="inline-flex align-items-center gap-2 white-space-nowrap">
                {(["gold", "silver", "bronze"] as const).map(
                  (medal) =>
                    h[medal] > 0 && (
                      <span
                        key={medal}
                        className="inline-flex align-items-center gap-1"
                      >
                        <span className={`medal medal--${medal}`} />
                        {h[medal]}
                      </span>
                    )
                )}
              </span>
            ) : (
              <span className="text-500">–</span>
            )
          }
          className="text-center"
        />
        <Column
          field="total.played"
          header="І"
          sortable
          className="text-center"
        />
        {average ? averageColumns : totalColumns}
      </DataTable>
      <div className="text-sm text-600 mt-2">
        Натисніть на клуб, щоб побачити його виступи по турнірах.
        {average &&
          " За матч: частка результатів, голи й очки в середньому за один матч."}
      </div>
      <ClubHistoryDialog history={selected} onHide={() => setSelected(null)} />
    </SectionCard>
  );
};

export default ClubsHistory;
