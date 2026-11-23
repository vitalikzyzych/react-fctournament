import { useMemo } from "react";

import {
  computeSessions,
  type ISession,
  type ITournamentWithMatches,
  PLAYER_IDS,
  summarizeSessions,
} from "@/domain";
import { PlayerBadge } from "@/ui";
import { formatAverage, formatDay, formatDuration, plural } from "@/utils";

const LAST = 8;

const SessionRow = ({ session }: { session: ISession }) => (
  <div className="flex align-items-center justify-content-between gap-2 text-sm">
    <span className="flex flex-column">
      <span>{formatDay(session.start)}</span>
      <span className="text-xs text-500">
        {session.matches.length}{" "}
        {plural(session.matches.length, ["матч", "матчі", "матчів"])}
        {session.matches.length > 1 &&
          `, ${formatDuration(session.end - session.start)}`}
        , голи {session.goals.S}:{session.goals.V}
      </span>
    </span>
    <span className="flex align-items-center gap-2 font-semibold white-space-nowrap">
      <PlayerBadge player="S" /> {session.wins.S} : {session.wins.V}{" "}
      <PlayerBadge player="V" />
    </span>
  </div>
);

/**
 * Playing sessions: results entered with breaks of under three hours make
 * one evening. Who won more evenings, the best one of each player, the
 * longest, and the latest ones.
 */
const SessionsCard = ({ all }: { all: ITournamentWithMatches[] }) => {
  const sessions = useMemo(() => computeSessions(all), [all]);
  const summary = useMemo(() => summarizeSessions(sessions), [sessions]);

  if (!sessions.length) {
    return (
      <div className="text-600">
        Вечори зʼявляться, щойно будуть результати з датою. Дата записується
        сама, коли результат вносять у застосунку; в імпортованих турнірах її
        немає.
      </div>
    );
  }
  return (
    <div className="grid">
      <div className="col-12 lg:col-5 flex flex-column gap-3">
        <div className="flex align-items-center gap-3 flex-wrap">
          <PlayerBadge player="S" size="md" />
          <span className="recap__score">
            {summary.won.S}:{summary.won.V}
          </span>
          <PlayerBadge player="V" size="md" />
          <span className="font-semibold">виграні вечори</span>
        </div>
        <span className="text-sm text-600">
          Усього {summary.count}{" "}
          {plural(summary.count, ["вечір", "вечори", "вечорів"])}, унічию{" "}
          {summary.level}, у середньому {formatAverage(summary.avgMatches)}{" "}
          матчу за вечір.
        </span>
        {PLAYER_IDS.map((player) => {
          const best = summary.best[player];
          return (
            best && (
              <div key={player} className="flex flex-column gap-1">
                <span className="text-xs text-500 uppercase font-semibold">
                  Найкращий вечір {player}
                </span>
                <SessionRow session={best} />
              </div>
            )
          );
        })}
        {summary.longest && (
          <div className="flex flex-column gap-1">
            <span className="text-xs text-500 uppercase font-semibold">
              Найдовший вечір
            </span>
            <SessionRow session={summary.longest} />
          </div>
        )}
      </div>
      <div className="col-12 lg:col-7 flex flex-column gap-2">
        <span className="text-xs text-500 uppercase font-semibold">
          Останні вечори
        </span>
        {[...sessions]
          .reverse()
          .slice(0, LAST)
          .map((session) => (
            <SessionRow key={session.start} session={session} />
          ))}
      </div>
    </div>
  );
};

export default SessionsCard;
