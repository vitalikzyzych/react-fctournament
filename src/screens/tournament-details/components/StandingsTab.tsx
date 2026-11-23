import { useMemo, useState } from "react";

import { Button } from "primereact/button";
import { Dropdown } from "primereact/dropdown";

import {
  CHANCE_RUNS,
  computeForm,
  computeNextMatches,
  groupMatches,
  groupTable,
  type IClub,
  type IMatch,
  type IScore,
  isLeagueFormat,
  type ITournament,
  LEAGUE_KNOCKOUT_PER_PLAYER,
  LEAGUE_QUALIFIERS_PER_PLAYER,
  leagueKnockoutClubs,
  playoffQualifiers,
  sortMatches,
} from "@/domain";
import { usePlayoffChances } from "@/hooks";
import {
  ClubMatchesDialog,
  FluentIcon,
  MatchRow,
  SectionCard,
  StandingsTable,
} from "@/ui";
import { formatScore } from "@/utils";

interface IStandingsTabProps {
  tournament: ITournament;
  matches: IMatch[];
}

const StandingsTab = ({ tournament, matches }: IStandingsTabProps) => {
  const league = isLeagueFormat(tournament.format);
  const [selected, setSelected] = useState<IClub | null>(null);
  // "What if": scores tried out for open matches. Nothing of it is stored.
  const [whatIf, setWhatIf] = useState(false);
  const [tried, setTried] = useState<Map<string, IScore>>(new Map());
  const [day, setDay] = useState<number | null>(null);

  const open = useMemo(
    () => groupMatches(sortMatches(matches)).filter((m) => m.result === null),
    [matches]
  );
  const openDays = [...new Set(open.map((m) => m.matchday))];
  const shownDay = day !== null && openDays.includes(day) ? day : openDays[0];
  const canTry = tournament.status === "active" && open.length > 0;
  const trying = whatIf && canTry;

  const shown = useMemo(
    () =>
      trying && tried.size
        ? matches.map((match) => {
            const result = match.result === null ? tried.get(match.id) : null;
            return result ? { ...match, result } : match;
          })
        : matches,
    [matches, tried, trying]
  );
  const clubsById = new Map<string, IClub>(
    tournament.clubs.map((club) => [club.id, club])
  );
  const qualified = league
    ? new Set(playoffQualifiers(tournament, shown))
    : undefined;
  const knockout = league
    ? new Set(leagueKnockoutClubs(tournament, shown))
    : undefined;
  const chances = usePlayoffChances(tournament, shown);
  const groupMatchesOf = (groupId: string) =>
    groupMatches(shown).filter((match) => match.group === groupId);
  const tryScore = (matchId: string, result: IScore | null) =>
    setTried((current) => {
      const next = new Map(current);
      if (result) next.set(matchId, result);
      else next.delete(matchId);
      return next;
    });

  return (
    <div className="grid">
      {canTry && (
        <div className="col-12 flex align-items-center gap-2 flex-wrap">
          <Button
            label="Що якщо"
            icon={<FluentIcon name="DataLine" />}
            size="small"
            outlined={!trying}
            onClick={() => setWhatIf(!whatIf)}
          />
          {trying && (
            <>
              {openDays.length > 1 && (
                <Dropdown
                  value={shownDay}
                  options={openDays.map((d) => ({
                    label: `Тур ${d}`,
                    value: d,
                  }))}
                  onChange={(e) => setDay(e.value)}
                  className="p-inputtext-sm"
                />
              )}
              <Button
                label="Скинути"
                size="small"
                text
                disabled={!tried.size}
                onClick={() => setTried(new Map())}
              />
            </>
          )}
        </div>
      )}
      {trying && (
        <div className="col-12">
          <div className="notice align-items-center">
            <FluentIcon name="Info" size={18} />
            <span>
              Введіть рахунок незіграного матчу й натисніть ✓: таблиця та шанси
              покажуть, що буде після такого результату. Це лише прогноз, нічого
              не зберігається.
            </span>
          </div>
        </div>
      )}
      {tournament.groups.map((group) => {
        const toTry = open.filter(
          (m) => m.group === group.id && m.matchday === shownDay
        );
        return (
          <div
            key={group.id}
            className={
              league ? "col-12 xl:col-10 xl:col-offset-1" : "col-12 lg:col-6"
            }
          >
            <SectionCard title={group.name}>
              <StandingsTable
                rows={groupTable(tournament, shown, group.id)}
                qualified={qualified}
                knockout={knockout}
                onClubClick={setSelected}
                form={computeForm(groupMatchesOf(group.id))}
                next={
                  tournament.status === "active"
                    ? computeNextMatches(groupMatchesOf(group.id))
                    : undefined
                }
                chances={chances}
                chanceTitle={
                  league ? "Шанс вийти в 1/8 фіналу напряму" : undefined
                }
              />
              {trying && toTry.length > 0 && (
                <div className="flex flex-column gap-2 mt-3">
                  <span className="text-500 text-xs font-semibold">
                    Що якщо · тур {shownDay}
                  </span>
                  {toTry.map((match) => {
                    const result = tried.get(match.id) ?? null;
                    return (
                      <MatchRow
                        // Remount so the draft starts from the tried score.
                        key={`${match.id}:${formatScore(result)}`}
                        match={{ ...match, result }}
                        clubsById={clubsById}
                        editable
                        onSave={(score) => tryScore(match.id, score)}
                      />
                    );
                  })}
                </div>
              )}
            </SectionCard>
          </div>
        );
      })}
      <div className="col-12 text-sm text-600">
        Порядок у таблиці: очки, різниця голів, особисті зустрічі, забиті голи.
        Натисніть на клуб, щоб побачити всі його матчі.
        {league &&
          ` Бірюзова рамка: ${LEAGUE_QUALIFIERS_PER_PLAYER} найкращі клуби S і ${LEAGUE_QUALIFIERS_PER_PLAYER} найкращі клуби V, вони виходять в 1/8 фіналу напряму. Сіра рамка: наступні ${LEAGUE_KNOCKOUT_PER_PLAYER} клубів кожного гравця, вони грають стикові матчі.`}
        {chances &&
          ` Шанс: у скількох із ${CHANCE_RUNS} симуляцій решти матчів клуб ${league ? "виходить в 1/8 фіналу напряму" : "виходить у плей-офф"}. Рахунок кожного матчу залежить від сили клубів: забиті й пропущені голи за матч у цьому турнірі.`}
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
