import { Link, useParams } from "react-router-dom";

import { Button } from "primereact/button";
import { TabPanel, TabView } from "primereact/tabview";

import MatchesTab from "./components/MatchesTab";
import PlayoffTab from "./components/PlayoffTab";
import StandingsTab from "./components/StandingsTab";
import StatsTab from "./components/StatsTab";
import TournamentActions from "./components/TournamentActions";

import {
  computeTournamentStats,
  findChampionClub,
  findLeagueWinner,
  isLeagueFormat,
} from "@/domain";
import { useTournamentData } from "@/providers";
import { EmptyState, FluentIcon, SectionCard, TournamentHero } from "@/ui";

const TournamentDetails = () => {
  const { id } = useParams<{ id: string }>();
  const { all } = useTournamentData();
  const item = all.find((t) => t.tournament.id === id);

  if (!item) {
    return (
      <SectionCard>
        <EmptyState icon="Warning" title="Турнір не знайдено">
          <Link to="/tournaments">
            <Button
              label="До списку турнірів"
              icon={<FluentIcon name="ArrowLeft" />}
              text
            />
          </Link>
        </EmptyState>
      </SectionCard>
    );
  }

  const { tournament, matches } = item;
  const stats = computeTournamentStats(tournament.clubs, matches);

  return (
    <>
      <Link
        to="/tournaments"
        className="inline-flex align-items-center gap-1 text-500 text-sm mb-3 hover:text-primary"
      >
        <FluentIcon name="ArrowLeft" /> Турніри
      </Link>
      <TournamentHero
        tournament={tournament}
        players={stats.players}
        playedMatches={stats.playedMatches}
        totalMatches={stats.totalMatches}
        champion={findChampionClub(tournament, matches)}
        leagueWinner={findLeagueWinner(tournament, matches)}
        actions={
          <TournamentActions tournament={tournament} matches={matches} />
        }
      />

      <TabView className="tournament-tabs">
        <TabPanel header="Матчі">
          <MatchesTab tournament={tournament} matches={matches} />
        </TabPanel>
        <TabPanel
          header={isLeagueFormat(tournament.format) ? "Таблиця" : "Групи"}
        >
          <StandingsTab tournament={tournament} matches={matches} />
        </TabPanel>
        <TabPanel header="Плей-офф">
          <PlayoffTab tournament={tournament} matches={matches} />
        </TabPanel>
        <TabPanel header="Статистика">
          <StatsTab tournament={tournament} matches={matches} />
        </TabPanel>
      </TabView>
    </>
  );
};

export default TournamentDetails;
