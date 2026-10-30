import { Column } from "primereact/column";
import { DataTable } from "primereact/datatable";

import {
  computeTournamentStats,
  type IClubStat,
  type IMatch,
  type IPlayedMatch,
  type ITournament,
} from "@/domain";
import { ClubLabel, PlayerVersusCard, SectionCard, StatCard } from "@/ui";
import { formatAverage, formatScore, formatSigned } from "@/utils";

interface IStatsTabProps {
  tournament: ITournament;
  matches: IMatch[];
}

const ClubList = ({
  items,
  value,
}: {
  items: IClubStat[];
  value: (s: IClubStat) => string;
}) =>
  items.length ? (
    <ol className="m-0 pl-3 flex flex-column gap-2">
      {items.map((stat) => (
        <li key={stat.club.id}>
          <div className="flex justify-content-between gap-2">
            <ClubLabel
              name={stat.club.name}
              clubId={stat.club.id}
              owner={stat.club.owner}
              country={stat.club.country}
              showFlag
            />
            <span className="font-semibold white-space-nowrap">
              {value(stat)}
            </span>
          </div>
        </li>
      ))}
    </ol>
  ) : (
    <div className="text-600">Ще немає зіграних матчів</div>
  );

const StatsTab = ({ tournament, matches }: IStatsTabProps) => {
  const stats = computeTournamentStats(tournament.clubs, matches);
  const clubsById = new Map(tournament.clubs.map((club) => [club.id, club]));

  const bigWin = (match: IPlayedMatch) => {
    const home = clubsById.get(match.home);
    const away = clubsById.get(match.away);
    return (
      <div key={match.id} className="big-win">
        <ClubLabel
          name={home?.name ?? match.home}
          clubId={match.home}
          owner={home?.owner}
        />
        <span className="score-chip">{formatScore(match.result)}</span>
        <ClubLabel
          name={away?.name ?? match.away}
          clubId={match.away}
          owner={away?.owner}
          badgePosition="end"
        />
      </div>
    );
  };

  return (
    <div className="grid">
      <div className="col-6 md:col-3">
        <StatCard
          label="Зіграно"
          value={`${stats.playedMatches} / ${stats.totalMatches}`}
        />
      </div>
      <div className="col-6 md:col-3">
        <StatCard label="Голів" value={stats.totalGoals} />
      </div>
      <div className="col-6 md:col-3">
        <StatCard label="Голів за матч" value={formatAverage(stats.avgGoals)} />
      </div>
      <div className="col-6 md:col-3">
        <StatCard label="Нічиїх" value={stats.draws} />
      </div>

      <div className="col-12 lg:col-6">
        <SectionCard title="S проти V" className="h-full">
          <PlayerVersusCard records={stats.players} />
        </SectionCard>
      </div>
      <div className="col-12 lg:col-6">
        <SectionCard title="Найбільші перемоги" className="h-full">
          {stats.biggestWins.length ? (
            <div className="flex flex-column gap-2">
              {stats.biggestWins.map(bigWin)}
            </div>
          ) : (
            <div className="text-600">Ще немає перемог</div>
          )}
        </SectionCard>
      </div>
      <div className="col-12 md:col-6">
        <SectionCard title="Найкраща атака">
          <ClubList
            items={stats.topAttack}
            value={(s) => `${s.goalsFor} гол.`}
          />
        </SectionCard>
      </div>
      <div className="col-12 md:col-6">
        <SectionCard title="Найкращий захист">
          <ClubList
            items={stats.bestDefence}
            value={(s) => `${s.goalsAgainst} проп.`}
          />
        </SectionCard>
      </div>

      <div className="col-12">
        <SectionCard title="Усі клуби">
          <DataTable
            value={stats.clubs}
            dataKey="club.id"
            size="small"
            sortField="points"
            sortOrder={-1}
            scrollable
            className="standings-table"
          >
            <Column
              header="Клуб"
              field="club.name"
              sortable
              body={(s: IClubStat) => (
                <ClubLabel
                  name={s.club.name}
                  clubId={s.club.id}
                  owner={s.club.owner}
                  country={s.club.country}
                  showFlag
                />
              )}
            />
            <Column
              field="club.group"
              header="Гр."
              sortable
              className="text-center"
            />
            <Column
              field="played"
              header="І"
              sortable
              className="text-center"
            />
            <Column field="won" header="В" sortable className="text-center" />
            <Column field="drawn" header="Н" sortable className="text-center" />
            <Column field="lost" header="П" sortable className="text-center" />
            <Column
              field="goalsFor"
              header="Заб."
              sortable
              className="text-center"
            />
            <Column
              field="goalsAgainst"
              header="Проп."
              sortable
              className="text-center"
            />
            <Column
              field="goalDiff"
              header="±"
              sortable
              className="text-center"
              body={(s: IClubStat) => formatSigned(s.goalDiff)}
            />
            <Column
              field="points"
              header="О"
              sortable
              className="text-center font-bold"
            />
          </DataTable>
        </SectionCard>
      </div>
    </div>
  );
};

export default StatsTab;
