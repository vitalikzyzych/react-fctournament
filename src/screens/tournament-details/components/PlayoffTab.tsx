import { useMemo, useState } from "react";

import { Button } from "primereact/button";

import ChampionPanel from "./ChampionPanel";
import PlayoffDrawDialog from "./PlayoffDrawDialog";
import PlayoffTieCard from "./PlayoffTieCard";

import {
  computeDiscipline,
  computePlayoff,
  type IClub,
  type IMatch,
  type ITournament,
  PLAYOFF_ROUNDS,
  type PlayoffRound,
} from "@/domain";
import { FluentIcon } from "@/ui";

interface IPlayoffTabProps {
  tournament: ITournament;
  matches: IMatch[];
}

/**
 * Quarter-finals, semi-finals and final, each tie filled in by hand. Nothing
 * advances automatically: which clubs go through is decided by the players.
 */
const PlayoffTab = ({ tournament, matches }: IPlayoffTabProps) => {
  const ties = computePlayoff(matches);
  // The playoff and the champion are edited only while the tournament is in
  // progress.
  const editable = tournament.status === "active";
  const clubsById = new Map<string, IClub>(
    tournament.clubs.map((club) => [club.id, club])
  );
  const started = ties.some((tie) => tie.games.length > 0);
  const [drawRound, setDrawRound] = useState<PlayoffRound | null>(null);
  const discipline = useMemo(() => computeDiscipline(matches), [matches]);

  // The semi-final draw needs every quarter-final decided.
  const quarterWinners = ties
    .filter((tie) => tie.round === "QF")
    .map((tie) => (tie.winner ? clubsById.get(tie.winner) : undefined));
  const semiClubs = quarterWinners.every((club) => club !== undefined)
    ? quarterWinners.filter((club) => club !== undefined)
    : null;

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
            Оберіть клуби для кожної пари вручну або проведіть жеребкування. У
            1/4 і 1/2 фіналу пара грає два матчі: перший удома в першого клубу,
            другий удома в другого. Переможець визначається за сумою голів.
            Фінал складається з одного матчу. Якщо сума рівна або фінал
            завершився нічиєю, грається перегравання.
          </span>
        </div>
      )}
      <ChampionPanel
        tournament={tournament}
        matches={matches}
        editable={editable}
      />

      {PLAYOFF_ROUNDS.map((round) => {
        const roundTies = ties.filter((tie) => tie.round === round.id);
        // A draw is offered until the first game of the round is played.
        const canDraw =
          editable &&
          round.id !== "F" &&
          roundTies.every((tie) => tie.games.every((g) => g.result === null));
        const drawReady = round.id === "QF" || semiClubs !== null;
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
                      : "Стане доступним, коли завершаться всі пари 1/4 фіналу"
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
                fixedClubs={round.id === "SF" ? (semiClubs ?? []) : undefined}
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
