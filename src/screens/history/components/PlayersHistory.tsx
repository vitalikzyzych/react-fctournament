import { Column } from "primereact/column";
import { DataTable } from "primereact/datatable";

import {
  computeAllTimePlayers,
  type ITournamentSummary,
  type ITournamentWithMatches,
  summarizeTournaments,
} from "@/domain";
import {
  ClubLabel,
  PlayerBadge,
  PlayerVersusCard,
  SectionCard,
  StatCard,
  TitlesCard,
} from "@/ui";
import { formatAverage, formatPercent } from "@/utils";

const PlayersHistory = ({ all }: { all: ITournamentWithMatches[] }) => {
  const totals = computeAllTimePlayers(all);
  const summaries = summarizeTournaments(all);
  const totalGoals = summaries.reduce((sum, s) => sum + s.totalGoals, 0);

  return (
    <div className="grid">
      <div className="col-6 md:col-3">
        <StatCard icon="History" label="Турнірів" value={all.length} />
      </div>
      <div className="col-6 md:col-3">
        <StatCard
          icon="SportSoccer"
          label="Матчів зіграно"
          value={totals.S.played}
        />
      </div>
      <div className="col-6 md:col-3">
        <StatCard icon="DataHistogram" label="Голів" value={totalGoals} />
      </div>
      <div className="col-6 md:col-3">
        <StatCard
          icon="Trophy"
          label="Голів за матч"
          value={formatAverage(
            totals.S.played ? totalGoals / totals.S.played : 0
          )}
        />
      </div>

      <div className="col-12">
        <SectionCard title="Хто виграв турніри">
          <TitlesCard summaries={summaries} />
        </SectionCard>
      </div>

      <div className="col-12 lg:col-5">
        <SectionCard title="S проти V за всю історію" className="h-full">
          <PlayerVersusCard records={totals} />
        </SectionCard>
      </div>
      <div className="col-12 lg:col-7">
        <SectionCard title="По турнірах" className="h-full">
          <DataTable
            value={summaries}
            dataKey="tournament.id"
            size="small"
            scrollable
          >
            <Column
              header="Турнір"
              body={(s: ITournamentSummary) => (
                <span className="white-space-nowrap">
                  <span className="text-500">№{s.tournament.number}</span>{" "}
                  {s.tournament.name}
                </span>
              )}
            />
            <Column
              header={<PlayerBadge player="S" />}
              body={(s: ITournamentSummary) => s.players.S.won}
              className="text-center font-bold"
            />
            <Column
              header="Н"
              body={(s: ITournamentSummary) => s.players.S.drawn}
              className="text-center"
            />
            <Column
              header={<PlayerBadge player="V" />}
              body={(s: ITournamentSummary) => s.players.V.won}
              className="text-center font-bold"
            />
            <Column
              header="Голи S:V"
              body={(s: ITournamentSummary) =>
                `${s.players.S.goalsFor}:${s.players.V.goalsFor}`
              }
              className="text-center white-space-nowrap"
            />
            <Column
              header="% S"
              body={(s: ITournamentSummary) =>
                formatPercent(s.players.S.winRate)
              }
              className="text-center"
            />
            <Column
              header="Чемпіон"
              body={(s: ITournamentSummary) =>
                s.champion ? (
                  <ClubLabel name={s.champion.name} owner={s.champion.owner} />
                ) : (
                  <span className="text-500">–</span>
                )
              }
              className="white-space-nowrap"
            />
            <Column
              header="Матчі"
              body={(s: ITournamentSummary) =>
                `${s.playedMatches}/${s.totalMatches}`
              }
              className="text-center"
            />
          </DataTable>
        </SectionCard>
      </div>
    </div>
  );
};

export default PlayersHistory;
