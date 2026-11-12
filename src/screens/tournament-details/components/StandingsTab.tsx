import { useState } from "react";

import {
  CHANCE_RUNS,
  computeForm,
  groupMatches,
  groupTable,
  type IClub,
  type IMatch,
  isLeagueFormat,
  type ITournament,
  LEAGUE_KNOCKOUT_PER_PLAYER,
  LEAGUE_QUALIFIERS_PER_PLAYER,
  leagueKnockoutClubs,
  playoffQualifiers,
} from "@/domain";
import { usePlayoffChances } from "@/hooks";
import { ClubMatchesDialog, SectionCard, StandingsTable } from "@/ui";

interface IStandingsTabProps {
  tournament: ITournament;
  matches: IMatch[];
}

const StandingsTab = ({ tournament, matches }: IStandingsTabProps) => {
  const league = isLeagueFormat(tournament.format);
  const [selected, setSelected] = useState<IClub | null>(null);
  const qualified = league
    ? new Set(playoffQualifiers(tournament, matches))
    : undefined;
  const knockout = league
    ? new Set(leagueKnockoutClubs(tournament, matches))
    : undefined;
  const chances = usePlayoffChances(tournament, matches);

  return (
    <div className="grid">
      {tournament.groups.map((group) => (
        <div
          key={group.id}
          className={
            league ? "col-12 xl:col-10 xl:col-offset-1" : "col-12 lg:col-6"
          }
        >
          <SectionCard title={group.name}>
            <StandingsTable
              rows={groupTable(tournament, matches, group.id)}
              qualified={qualified}
              knockout={knockout}
              onClubClick={setSelected}
              form={computeForm(
                groupMatches(matches).filter((m) => m.group === group.id)
              )}
              chances={chances}
              chanceTitle={
                league ? "Шанс вийти в 1/8 фіналу напряму" : undefined
              }
            />
          </SectionCard>
        </div>
      ))}
      <div className="col-12 text-sm text-600">
        Порядок у таблиці: очки, різниця голів, особисті зустрічі, забиті голи.
        Натисніть на клуб, щоб побачити всі його матчі.
        {league &&
          ` Бірюзова рамка: ${LEAGUE_QUALIFIERS_PER_PLAYER} найкращі клуби S і ${LEAGUE_QUALIFIERS_PER_PLAYER} найкращі клуби V, вони виходять в 1/8 фіналу напряму. Сіра рамка: наступні ${LEAGUE_KNOCKOUT_PER_PLAYER} клубів кожного гравця, вони грають стикові матчі.`}
        {chances &&
          ` Шанс: у скількох із ${CHANCE_RUNS} симуляцій решти матчів (випадковий рахунок, клуби рівні за силою) клуб ${league ? "виходить в 1/8 фіналу напряму" : "виходить у плей-офф"}.`}
      </div>
      <ClubMatchesDialog
        tournament={tournament}
        matches={matches}
        club={selected}
        onHide={() => setSelected(null)}
      />
    </div>
  );
};

export default StandingsTab;
