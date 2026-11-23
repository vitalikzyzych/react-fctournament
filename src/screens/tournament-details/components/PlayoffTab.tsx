import { useMemo, useState } from "react";

import { Button } from "primereact/button";

import ChampionPanel from "./ChampionPanel";
import PlayoffDrawDialog from "./PlayoffDrawDialog";
import PlayoffTieCard from "./PlayoffTieCard";

import {
  computeDiscipline,
  computePlayoff,
  groupMatches,
  type IClub,
  type IMatch,
  type IPlayoffTie,
  isLeagueFormat,
  type ITournament,
  leagueKnockoutClubs,
  playoffQualifiers,
  type PlayoffRound,
  playoffRounds,
  tieKey,
} from "@/domain";
import { useTieChances } from "@/hooks";
import { FluentIcon } from "@/ui";

interface IPlayoffTabProps {
  tournament: ITournament;
  matches: IMatch[];
}

/**
 * The playoff rounds of the format (a league adds the knockout round and the
 * round of 16), each tie filled in by hand or by a draw. Nothing advances
 * automatically: which clubs go through is decided by the players.
 */
const PlayoffTab = ({ tournament, matches }: IPlayoffTabProps) => {
  const league = isLeagueFormat(tournament.format);
  const rounds = playoffRounds(league);
  const ties = computePlayoff(matches, league);
  // The playoff and the champion are edited only while the tournament is in
  // progress.
  const editable = tournament.status === "active";
  const clubsById = new Map<string, IClub>(
    tournament.clubs.map((club) => [club.id, club])
  );
  const started = ties.some((tie) => tie.games.length > 0);
  const [drawRound, setDrawRound] = useState<PlayoffRound | null>(null);
  const discipline = useMemo(() => computeDiscipline(matches), [matches]);
  const tieChances = useTieChances(tournament, matches);

  const clubsOf = (ids: string[]) =>
    ids.map((id) => clubsById.get(id)).filter((club) => club !== undefined);
  // Winners of a round once every tie of it is decided, otherwise null.
  const winnersOf = (round: PlayoffRound): IClub[] | null => {
    const roundTies: IPlayoffTie[] = ties.filter((t) => t.round === round);
    return roundTies.every((tie) => tie.winner)
      ? clubsOf(roundTies.map((tie) => tie.winner ?? ""))
      : null;
  };
  // A league's knockout clubs come from the final table.
  const leagueDone =
    league && groupMatches(matches).every((m) => m.result !== null);

  /**
   * Clubs of a round's draw: null while they are not known yet, undefined
   * for the group quarter-finals (picked in the dialog).
   */
  const drawClubs = (
    round: PlayoffRound
  ): { clubs?: IClub[]; direct?: IClub[] } | null => {
    if (!league && round === "QF") return {};
    if (round === "KO") {
      return leagueDone
        ? { clubs: clubsOf(leagueKnockoutClubs(tournament, matches)) }
        : null;
    }
    const previous = rounds[rounds.findIndex((r) => r.id === round) - 1];
    const winners = previous ? winnersOf(previous.id) : null;
    if (!winners) return null;
    if (round === "R16") {
      return leagueDone
        ? {
            clubs: winners,
            direct: clubsOf(playoffQualifiers(tournament, matches)),
          }
        : null;
    }
    return { clubs: winners };
  };

  return (
    <div className="flex flex-column gap-4">
      {tournament.status === "planned" && (
        <div className="notice align-items-center">
          <FluentIcon name="Info" size={18} />
          <span>
            Турнір ще не почався. Розклад можна переглянути, а результати
            вносяться після старту.
          </span>
        </div>
      )}
      {tournament.status === "completed" && (
        <div className="notice align-items-center">
          <FluentIcon name="LockClosed" size={18} />
          <span>
            Турнір завершено, плей-офф захищений від змін. Щоб виправити,
            розблокуйте турнір.
          </span>
        </div>
      )}
      {editable && !started && (
        <div className="notice align-items-center">
          <FluentIcon name="Info" size={18} />
          <span>
            {league &&
              "Після ліги 4 найкращі клуби S і 4 найкращі клуби V виходять в 1/8 фіналу напряму. Наступні 8 клубів S і 8 клубів V грають стикові матчі, їх переможці доповнюють 1/8 фіналу. "}
            Оберіть клуби для кожної пари вручну або проведіть жеребкування.{" "}
            {league ? "До 1/2 фіналу включно" : "У 1/4 і 1/2 фіналу"} пара грає
            два матчі: перший удома в першого клубу, другий удома в другого.
            Переможець визначається за сумою голів. Фінал складається з одного
            матчу. Якщо сума рівна або фінал завершився нічиєю, грається
            перегравання.
          </span>
        </div>
      )}
      <ChampionPanel
        tournament={tournament}
        matches={matches}
        editable={editable}
      />

      {rounds.map((round) => {
        const roundTies = ties.filter((tie) => tie.round === round.id);
        // A draw is offered until the first game of the round is played.
        const canDraw =
          editable &&
          round.id !== "F" &&
          roundTies.every((tie) => tie.games.every((g) => g.result === null));
        const drawSource = drawClubs(round.id);
        const drawReady = drawSource !== null;
        const previous = rounds[rounds.findIndex((r) => r.id === round.id) - 1];
        return (
          <section key={round.id}>
            <div className="flex align-items-center justify-content-between gap-2 mb-2">
              <h2 className="section-title m-0">{round.name}</h2>
              {canDraw && (
                <Button
                  label="Жеребкування"
                  icon={<FluentIcon name="ArrowShuffle" />}
                  size="small"
                  outlined
                  disabled={!drawReady}
                  tooltip={
                    drawReady
                      ? undefined
                      : round.id === "KO" || !previous
                        ? "Стане доступним, коли зіграно всі матчі ліги"
                        : `Стане доступним, коли завершаться всі пари раунду ${previous.name}${round.id === "R16" && !leagueDone ? " і всі матчі ліги" : ""}`
                  }
                  tooltipOptions={{ position: "top", showOnDisabled: true }}
                  onClick={() => setDrawRound(round.id)}
                />
              )}
            </div>
            {drawRound === round.id && (
              <PlayoffDrawDialog
                tournament={tournament}
                matches={matches}
                round={round}
                ties={roundTies}
                fixedClubs={drawSource?.clubs}
                direct={drawSource?.direct}
                onHide={() => setDrawRound(null)}
              />
            )}
            <div className="grid">
              {roundTies.map((tie) => {
                const taken = new Set(
                  roundTies
                    .filter((other) => other.tie !== tie.tie)
                    .flatMap((other) => [other.home, other.away])
                    .filter((id) => id !== null)
                );
                return (
                  <div
                    key={tie.tie}
                    className={
                      round.ties > 1
                        ? "col-12 xl:col-6"
                        : "col-12 xl:col-6 xl:col-offset-3"
                    }
                  >
                    <PlayoffTieCard
                      // Remount when the stored teams change (remote edits).
                      key={`${tie.home}:${tie.away}`}
                      tournament={tournament}
                      tie={tie}
                      clubsById={clubsById}
                      editable={editable}
                      taken={taken}
                      discipline={discipline}
                      chance={tieChances.get(tieKey(tie))}
                    />
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
};

export default PlayoffTab;
