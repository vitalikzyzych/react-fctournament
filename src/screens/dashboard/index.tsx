import { useMemo } from "react";
import { Link } from "react-router-dom";

import { Button } from "primereact/button";

import QuickEntry from "./components/QuickEntry";

import { PageHeader } from "@/components";
import {
  computeAllTimePlayers,
  computeStandings,
  computeTournamentStats,
  describeMatch,
  findChampionClub,
  groupMatches,
  type IClub,
  type IMatch,
  isPlayed,
  playoffMatches,
  sortMatches,
  summarizeTournaments,
} from "@/domain";
import { pickCurrentTournament, useTournamentData } from "@/providers";
import {
  EmptyState,
  FluentIcon,
  MatchRow,
  PlayerVersusCard,
  SectionCard,
  StandingsTable,
  StatCard,
  TitlesCard,
  TournamentHero,
} from "@/ui";
import { formatAverage } from "@/utils";

const Dashboard = () => {
  const { all, matchesByTournament } = useTournamentData();
  const current = pickCurrentTournament(all);
  const allTime = useMemo(() => computeAllTimePlayers(all), [all]);
  const summaries = useMemo(() => summarizeTournaments(all), [all]);

  if (!current) {
    return (
      <>
        <PageHeader title="Головна" />
        <SectionCard>
          <EmptyState icon="Trophy" title="Ще немає жодного турніру">
            <p className="m-0">Імпортуйте перший турнір з JSON-файлу.</p>
            <Link to="/import">
              <Button
                label="До імпорту"
                icon={<FluentIcon name="ArrowImport" />}
                className="mt-2"
              />
            </Link>
          </EmptyState>
        </SectionCard>
      </>
    );
  }

  const { tournament, matches } = current;
  const clubsById = new Map<string, IClub>(
    tournament.clubs.map((club) => [club.id, club])
  );
  const stats = computeTournamentStats(tournament.clubs, matches);
  const stored = matchesByTournament.get(tournament.id) ?? [];

  const recent = stored
    .filter(isPlayed)
    .sort((a, b) => (b.updatedAtMs ?? 0) - (a.updatedAtMs ?? 0))
    .slice(0, 6);
  // The next group matchday; once the group stage is over, the open playoff games.
  const groupStage = groupMatches(sortMatches(matches));
  const nextMatchday = groupStage.find((m) => m.result === null)?.matchday;
  const upcoming: IMatch[] = nextMatchday
    ? groupStage.filter((m) => m.result === null && m.matchday === nextMatchday)
    : sortMatches(playoffMatches(matches)).filter((m) => m.result === null);

  return (
    <>
      <TournamentHero
        tournament={tournament}
        players={stats.players}
        playedMatches={stats.playedMatches}
        totalMatches={stats.totalMatches}
        champion={findChampionClub(tournament, matches)}
        actions={
          <Link to={`/tournaments/${tournament.id}`}>
            <Button
              label={
                tournament.status === "active"
                  ? "Внести результати"
                  : "Відкрити турнір"
              }
              icon={<FluentIcon name="ChevronRight" />}
              iconPos="right"
            />
          </Link>
        }
      />

      <div className="grid">
        {tournament.status === "active" && (
          <div className="col-12">
            <QuickEntry tournament={tournament} matches={stored} />
          </div>
        )}

        <div className="col-6 md:col-3">
          <StatCard
            icon="SportSoccer"
            label="Залишилось матчів"
            value={stats.totalMatches - stats.playedMatches}
          />
        </div>
        <div className="col-6 md:col-3">
          <StatCard icon="Trophy" label="Голів" value={stats.totalGoals} />
        </div>
        <div className="col-6 md:col-3">
          <StatCard
            icon="DataHistogram"
            label="Голів за матч"
            value={formatAverage(stats.avgGoals)}
          />
        </div>
        <div className="col-6 md:col-3">
          <StatCard icon="History" label="Нічиїх" value={stats.draws} />
        </div>

        <div className="col-12">
          <SectionCard
            title="Хто виграв турніри"
            action={
              <Link to="/history" className="text-primary text-sm font-medium">
                Усі чемпіони
              </Link>
            }
          >
            <TitlesCard summaries={summaries} showList={false} />
          </SectionCard>
        </div>

        <div className="col-12 lg:col-6">
          <SectionCard title="S проти V у цьому турнірі" className="h-full">
            <PlayerVersusCard records={stats.players} />
          </SectionCard>
        </div>
        <div className="col-12 lg:col-6">
          <SectionCard
            title="S проти V за всю історію"
            className="h-full"
            action={
              <Link to="/history" className="text-primary text-sm font-medium">
                Детальніше
              </Link>
            }
          >
            <PlayerVersusCard records={allTime} />
          </SectionCard>
        </div>

        <div className="col-12 lg:col-6">
          <SectionCard
            title={
              nextMatchday
                ? `Наступні матчі · тур ${nextMatchday}`
                : "Наступні матчі"
            }
          >
            {upcoming.length ? (
              <div className="flex flex-column gap-2">
                {upcoming.map((match) => (
                  <MatchRow
                    key={match.id}
                    match={match}
                    clubsById={clubsById}
                    editable={false}
                    meta={
                      match.stage === "group"
                        ? `Група ${match.group}`
                        : describeMatch(match)
                    }
                  />
                ))}
              </div>
            ) : (
              <EmptyState icon="CheckmarkCircle" title="Усі матчі зіграно" />
            )}
          </SectionCard>
        </div>
        <div className="col-12 lg:col-6">
          <SectionCard title="Останні результати">
            {recent.length ? (
              <div className="flex flex-column gap-2">
                {recent.map((match) => (
                  <MatchRow
                    key={match.id}
                    match={match}
                    clubsById={clubsById}
                    editable={false}
                    meta={describeMatch(match)}
                  />
                ))}
              </div>
            ) : (
              <EmptyState title="Ще немає результатів" />
            )}
          </SectionCard>
        </div>

        {tournament.groups.map((group) => (
          <div key={group.id} className="col-12 md:col-6">
            <SectionCard title={group.name}>
              <StandingsTable
                rows={computeStandings(
                  tournament.clubs.filter((club) => club.group === group.id),
                  groupStage.filter((match) => match.group === group.id)
                )}
              />
            </SectionCard>
          </div>
        ))}
      </div>
    </>
  );
};

export default Dashboard;
