import { useMemo, useState } from "react";

import { Column } from "primereact/column";
import { DataTable } from "primereact/datatable";
import { InputText } from "primereact/inputtext";

import ClubHistoryDialog from "./ClubHistoryDialog";

import {
  computeClubHistories,
  type IClubHistory,
  type ITournamentWithMatches,
} from "@/domain";
import { ClubLabel, SectionCard } from "@/ui";
import { formatSigned } from "@/utils";

const ClubsHistory = ({ all }: { all: ITournamentWithMatches[] }) => {
  const histories = useMemo(() => computeClubHistories(all), [all]);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<IClubHistory | null>(null);

  const visible = histories.filter((h) =>
    h.name.toLowerCase().includes(search.trim().toLowerCase())
  );

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
      <DataTable
        value={visible}
        dataKey="clubId"
        size="small"
        scrollable
        selectionMode="single"
        onRowClick={(e) => setSelected(visible[e.index] ?? null)}
        rowClassName={() => "cursor-pointer"}
        emptyMessage="Клубів не знайдено"
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
          body={(h: IClubHistory) => h.entries.length}
          className="text-center"
        />
        <Column
          header="За S"
          body={(h: IClubHistory) => h.timesByPlayer.S}
          className="text-center"
        />
        <Column
          header="За V"
          body={(h: IClubHistory) => h.timesByPlayer.V}
          className="text-center"
        />
        <Column
          field="titles"
          header={<span title="Титули: виграні фінали">Тит.</span>}
          sortable
          className="text-center"
        />
        <Column
          field="total.played"
          header="І"
          sortable
          className="text-center"
        />
        <Column field="total.won" header="В" sortable className="text-center" />
        <Column
          field="total.drawn"
          header="Н"
          sortable
          className="text-center"
        />
        <Column
          field="total.lost"
          header="П"
          sortable
          className="text-center"
        />
        <Column
          header="М"
          body={(h: IClubHistory) =>
            `${h.total.goalsFor}:${h.total.goalsAgainst}`
          }
          className="text-center white-space-nowrap"
        />
        <Column
          field="total.goalDiff"
          header="±"
          sortable
          body={(h: IClubHistory) => formatSigned(h.total.goalDiff)}
          className="text-center"
        />
        <Column
          field="total.points"
          header="О"
          sortable
          className="text-center font-bold"
        />
      </DataTable>
      <div className="text-sm text-600 mt-2">
        Натисніть на клуб, щоб побачити його виступи по турнірах.
      </div>
      <ClubHistoryDialog history={selected} onHide={() => setSelected(null)} />
    </SectionCard>
  );
};

export default ClubsHistory;
