import { type ReactNode, useState } from "react";

import { Column } from "primereact/column";
import { DataTable } from "primereact/datatable";

import {
  computeTournamentStats,
  type ICardLeader,
  type IClubCount,
  type IClubStat,
  type IMatch,
  type IPlayedMatch,
  isLeagueFormat,
  type IStreak,
  type ITournament,
  PLAYER_IDS,
  playoffMatches,
  statMatches,
} from "@/domain";
import {
  ClubLabel,
  PlayerBadge,
  PlayerVersusCard,
  PlayoffToggle,
  SectionCard,
  StatCard,
} from "@/ui";
import { formatAverage, formatScore, formatSigned, plural } from "@/utils";

interface IStatsTabProps {
  tournament: ITournament;
  matches: IMatch[];
}

const matchesWord = (n: number) =>
  `${n} ${plural(n, ["матч", "матчі", "матчів"])}`;

/** A total with the matches it took on a small second line. */
const perMatches = (total: string, played: number) => (
  <>
    {total}
    <span className="block text-xs text-500 font-normal">
      за {matchesWord(played)}
    </span>
  </>
);

const NO_MATCHES = <div className="text-600">Ще немає зіграних матчів</div>;

const ClubList = <T extends IClubCount | IClubStat>({
  items,
  value,
  empty = NO_MATCHES,
}: {
  items: T[];
  value: (s: T) => ReactNode;
  empty?: ReactNode;
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
            <span className="font-semibold white-space-nowrap text-right">
              {value(stat)}
            </span>
          </div>
        </li>
      ))}
    </ol>
  ) : (
    empty
  );

const CardLeaders = ({ items }: { items: ICardLeader[] }) =>
  items.length ? (
    <ol className="m-0 pl-3 flex flex-column gap-2">
      {items.map((leader) => (
        <li key={`${leader.club.id}:${leader.player}`}>
          <div className="flex justify-content-between align-items-center gap-2">
            <div className="flex flex-column min-w-0">
              <span className="font-semibold white-space-nowrap overflow-hidden text-overflow-ellipsis">
                {leader.player}
              </span>
              <ClubLabel
                name={leader.club.name}
                clubId={leader.club.id}
                className="text-sm text-600"
              />
            </div>
            <span className="flex align-items-center gap-2 font-semibold white-space-nowrap">
              {leader.yellow > 0 && (
                <span className="flex align-items-center gap-1">
                  <span className="card-icon card-icon--yellow" />
                  {leader.yellow}
                </span>
              )}
              {leader.red > 0 && (
                <span className="flex align-items-center gap-1">
                  <span className="card-icon card-icon--red" />
                  {leader.red}
                </span>
              )}
            </span>
          </div>
        </li>
      ))}
    </ol>
  ) : (
    <div className="text-600">Ще немає карток</div>
  );

const StatsTab = ({ tournament, matches }: IStatsTabProps) => {
  const [includePlayoff, setIncludePlayoff] = useState(true);
  const hasPlayoff = playoffMatches(matches).length > 0;
  const stats = computeTournamentStats(
    tournament.clubs,
    statMatches(matches, includePlayoff)
  );
  const clubsById = new Map(tournament.clubs.map((club) => [club.id, club]));
  const league = isLeagueFormat(tournament.format);

  const matchLine = (match: IPlayedMatch) => {
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

  const matchList = (list: IPlayedMatch[], empty: ReactNode = NO_MATCHES) =>
    list.length ? (
      <div className="flex flex-column gap-2">{list.map(matchLine)}</div>
    ) : (
      empty
    );

  const streak = (s: IStreak) => (
    <>
      {matchesWord(s.count)}
      {s.ongoing && (
        <span className="block text-xs text-500 font-normal">триває</span>
      )}
    </>
  );

  return (
    <div className="grid">
      {hasPlayoff && (
        <div className="col-12 flex justify-content-end">
          <PlayoffToggle
            checked={includePlayoff}
            onChange={setIncludePlayoff}
          />
        </div>
      )}
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
      <div className="col-6 md:col-4">
        <StatCard label="Перемог господарів" value={stats.homeWins} />
      </div>
      <div className="col-6 md:col-4">
        <StatCard label="Перемог гостей" value={stats.awayWins} />
      </div>
      <div className="col-12 md:col-4">
        <StatCard label="Матчів 0:0" value={stats.goallessDraws} />
      </div>

      <div className="col-12 lg:col-6">
        <SectionCard title="S проти V" className="h-full">
          <PlayerVersusCard records={stats.players} />
        </SectionCard>
      </div>
      <div className="col-12 lg:col-6">
        <SectionCard title="Найбільші перемоги" className="h-full">
          {matchList(
            stats.biggestWins,
            <div className="text-600">Ще немає перемог</div>
          )}
        </SectionCard>
      </div>
      <div className="col-12 md:col-6">
        <SectionCard title="Найбільше голів у матчі" className="h-full">
          {matchList(stats.highestScoring)}
        </SectionCard>
      </div>
      <div className="col-12 md:col-6">
        <SectionCard title="Найменше голів у матчі" className="h-full">
          {matchList(stats.lowestScoring)}
        </SectionCard>
      </div>
      <div className="col-12 md:col-6">
        <SectionCard title="Найкраща атака" className="h-full">
          <ClubList
            items={stats.topAttack}
            value={(s) => perMatches(`${s.goalsFor} гол.`, s.played)}
          />
        </SectionCard>
      </div>
      <div className="col-12 md:col-6">
        <SectionCard title="Найгірша атака" className="h-full">
          <ClubList
            items={stats.worstAttack}
            value={(s) => perMatches(`${s.goalsFor} гол.`, s.played)}
          />
        </SectionCard>
      </div>
      <div className="col-12 md:col-6">
        <SectionCard title="Найкращий захист" className="h-full">
          <ClubList
            items={stats.bestDefence}
            value={(s) => perMatches(`${s.goalsAgainst} проп.`, s.played)}
          />
        </SectionCard>
      </div>
      <div className="col-12 md:col-6">
        <SectionCard title="Найгірший захист" className="h-full">
          <ClubList
            items={stats.worstDefence}
            value={(s) => perMatches(`${s.goalsAgainst} проп.`, s.played)}
          />
        </SectionCard>
      </div>
      <div className="col-12 lg:col-4">
        <SectionCard title="Сухі матчі" className="h-full">
          <ClubList
            items={stats.cleanSheets}
            value={(s) => matchesWord(s.count)}
            empty={<div className="text-600">Ще немає сухих матчів</div>}
          />
        </SectionCard>
      </div>
      <div className="col-12 lg:col-4">
        <SectionCard title="Перемоги поспіль" className="h-full">
          <ClubList
            items={stats.winStreaks}
            value={streak}
            empty={
              <div className="text-600">Ще ніхто не виграв двічі поспіль</div>
            }
          />
        </SectionCard>
      </div>
      <div className="col-12 lg:col-4">
        <SectionCard title="Без поразок поспіль" className="h-full">
          <ClubList
            items={stats.unbeatenStreaks}
            value={streak}
            empty={<div className="text-600">Ще немає серій без поразок</div>}
          />
        </SectionCard>
      </div>
      <div className="col-12">
        <SectionCard title="Найбільше карток">
          <div className="grid">
            {PLAYER_IDS.map((id) => (
              <div key={id} className="col-12 md:col-6 flex flex-column gap-3">
                <div className="flex align-items-center gap-3">
                  <PlayerBadge player={id} />
                  <span className="flex align-items-center gap-2 font-semibold">
                    <span className="card-icon card-icon--yellow" />
                    {stats.playerCards[id].yellow}
                  </span>
                  <span className="flex align-items-center gap-2 font-semibold">
                    <span className="card-icon card-icon--red" />
                    {stats.playerCards[id].red}
                  </span>
                </div>
                <CardLeaders items={stats.cardLeaders[id]} />
              </div>
            ))}
          </div>
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
              field={league ? "club.pot" : "club.group"}
              header={league ? "Кош." : "Гр."}
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
