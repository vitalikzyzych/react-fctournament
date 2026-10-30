import type { CSSProperties, ReactNode } from "react";

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
  /** League formats: winner of the league table. */
  leagueWinner?: IClub | null;
  actions?: ReactNode;
}

/** Dots drawn per side at most, so a long league stays readable. */
const MAX_GOAL_DOTS = 300;

const frac = (n: number) => n - Math.floor(n);

/**
 * Stable positions near one goal, as CSS variables in penalty-area units:
 * `--dx` from the goal line (1 is the edge of the box), `--dy` from the
 * middle (0.5 is the side of the box). Most dots land inside the box, the
 * rest just around it. The R2 sequence keeps them evenly spread and in place
 * when another goal is added.
 */
const goalDots = (count: number) =>
  Array.from({ length: Math.min(count, MAX_GOAL_DOTS) }, (_, i) => {
    const u = frac(0.5 + (i + 1) * 0.7548777);
    const v = frac(0.5 + (i + 1) * 0.5698403);
    const dx = 0.06 + u ** 1.4 * 1.3;
    const dy = (v - 0.5) * (1.25 - dx * 0.35);
    return {
      "--dx": dx.toFixed(3),
      "--dy": dy.toFixed(3),
    } as CSSProperties;
  });

const penaltyArea = (side: "s" | "v") => (
  <div className={`pitch-goal pitch-goal--${side}`}>
    <span className="pitch-goal__box" />
    <span className="pitch-goal__six" />
    <span className="pitch-goal__arc" />
  </div>
);

/**
 * Scoreboard header: S and V match wins on a pitch-like card, with the
 * tournament name, status and progress. Behind it, every goal is a dot in
 * and around the penalty area of the player who conceded it: V's goals in
 * blue by S's net on the left, S's goals in red by V's net on the right. Used by the dashboard and the tournament
 * page.
 */
const TournamentHero = ({
  tournament,
  players,
  playedMatches,
  totalMatches,
  champion,
  leagueWinner,
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
      <div className="hero__goals" aria-hidden>
        {penaltyArea("s")}
        {penaltyArea("v")}
        {goalDots(players.V.goalsFor).map((style, i) => (
          <span key={`v${i}`} className="goal-dot goal-dot--v" style={style} />
        ))}
        {goalDots(players.S.goalsFor).map((style, i) => (
          <span key={`s${i}`} className="goal-dot goal-dot--s" style={style} />
        ))}
      </div>
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
        <div className="text-center min-w-0">
          <div className="hero__score">
            {players.S.won}
            <span className="hero__score-sep">:</span>
            {players.V.won}
          </div>
          <div className="text-500 text-xs mt-2 line-height-3">
            <div>перемог у матчах</div>
            <div>нічиїх {players.S.drawn}</div>
            <div>
              голів {players.S.goalsFor}:{players.V.goalsFor}
            </div>
          </div>
          {(champion || leagueWinner) && (
            <div className="mt-3 flex flex-column align-items-center gap-2">
              {leagueWinner && <ChampionBadge club={leagueWinner} league />}
              {champion && <ChampionBadge club={champion} />}
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
