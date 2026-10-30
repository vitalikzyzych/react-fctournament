import {
  groupTable,
  type IMatch,
  isLeagueFormat,
  type ITournament,
  LEAGUE_QUALIFIERS_PER_PLAYER,
  playoffQualifiers,
} from "@/domain";
import { SectionCard, StandingsTable } from "@/ui";

interface IStandingsTabProps {
  tournament: ITournament;
  matches: IMatch[];
}

const StandingsTab = ({ tournament, matches }: IStandingsTabProps) => {
  const league = isLeagueFormat(tournament.format);
  const qualified = league
    ? new Set(playoffQualifiers(tournament, matches))
    : undefined;

  return (
    <div className="grid">
      {tournament.groups.map((group) => (
        <div
          key={group.id}
          className={
            league ? "col-12 xl:col-8 xl:col-offset-2" : "col-12 lg:col-6"
          }
        >
          <SectionCard title={group.name}>
            <StandingsTable
              rows={groupTable(tournament, matches, group.id)}
              qualified={qualified}
            />
          </SectionCard>
        </div>
      ))}
      <div className="col-12 text-sm text-600">
        Порядок у таблиці: очки, різниця голів, особисті зустрічі, забиті голи.
        {league &&
          ` Позначено місця в плей-офф: ${LEAGUE_QUALIFIERS_PER_PLAYER} найкращі клуби S і ${LEAGUE_QUALIFIERS_PER_PLAYER} найкращі клуби V.`}
      </div>
    </div>
  );
};

export default StandingsTab;
