import type { ReactNode } from "react";

import ChampionBadge from "./ChampionBadge";
import PlayerBadge from "./PlayerBadge";
import StatusTag from "./StatusTag";

import type { IClub, ITournament, PlayerId, PlayerRecords } from "@/domain";
import { plural } from "@/utils";

interface ITournamentHeroProps {
  tournament: ITournament;
  players: PlayerRecords;
  playedMatches: number;
  totalMatches: number;
  /** Winner of the playoff final, once it is decided. */
  champion?: IClub | null;
  actions?: ReactNode;
}

/**
 * Scoreboard header: S and V match wins on a pitch-like card, with the
 * tournament name, status and progress. Used by the dashboard and the
 * tournament page.
 */
const TournamentHero = ({
  tournament,
  players,
  playedMatches,
  totalMatches,
  champion,
  actions,
}: ITournamentHeroProps) => {
  const progress = totalMatches ? (playedMatches / totalMatches) * 100 : 0;
  const nameOf = (id: PlayerId) =>
    tournament.players.find((p) => p.id === id)?.name ?? id;

  // The badge already shows the letter; a real name is shown under it.
  const side = (id: PlayerId) => (
    <div className="flex flex-column align-items-center gap-2 text-center">
      <PlayerBadge player={id} size="xl" />
      {nameOf(id) !== id && (
        <span className="hero__side-label">{nameOf(id)}</span>
      )}
    </div>
  );

  return (
    <section className="app-card pitch hero p-3 md:p-5 mb-4">
      <div className="hero__info min-w-0">
        <div className="flex flex-wrap align-items-center gap-2 mb-2 text-500 text-sm">
          <StatusTag status={tournament.status} />
          <span>
            № {tournament.number} · {tournament.game}
          </span>
        </div>
        <h1 className="hero__title">{tournament.name}</h1>
      </div>
      {actions && <div className="hero__actions">{actions}</div>}

      <div className="hero__board flex align-items-center justify-content-center gap-4 md:gap-8">
        {side("S")}
        <div className="text-center">
          <div className="hero__score">
            {players.S.won}
            <span className="hero__score-sep">:</span>
            {players.V.won}
          </div>
          <div className="text-500 text-xs mt-2 line-height-3">
            <div>перемог у матчах</div>
            <div>нічиїх {players.S.drawn}</div>
          </div>
          {champion && (
            <div className="mt-3">
              <ChampionBadge club={champion} />
            </div>
          )}
        </div>
        {side("V")}
      </div>

      <div className="hero__progress">
        <div className="flex justify-content-between text-xs text-500 mb-2">
          <span>Прогрес турніру</span>
          <span>
            {playedMatches} з {totalMatches}{" "}
            {plural(totalMatches, ["матчу", "матчів", "матчів"])}
          </span>
        </div>
        <div className="progress-bar">
          <span style={{ width: `${progress}%` }} />
        </div>
      </div>
    </section>
  );
};

export default TournamentHero;
