import {
  computeStandings,
  groupMatches,
  type IMatch,
  type ITournament,
} from "@/domain";
import { SectionCard, StandingsTable } from "@/ui";

interface IStandingsTabProps {
  tournament: ITournament;
  matches: IMatch[];
}

const StandingsTab = ({ tournament, matches }: IStandingsTabProps) => (
  <div className="grid">
    {tournament.groups.map((group) => (
      <div key={group.id} className="col-12 lg:col-6">
        <SectionCard title={group.name}>
          <StandingsTable
            rows={computeStandings(
              tournament.clubs.filter((club) => club.group === group.id),
              groupMatches(matches).filter((match) => match.group === group.id)
            )}
          />
        </SectionCard>
      </div>
    ))}
    <div className="col-12 text-sm text-600">
      Порядок у таблиці: очки, різниця голів, особисті зустрічі, забиті голи.
    </div>
  </div>
);

export default StandingsTab;
