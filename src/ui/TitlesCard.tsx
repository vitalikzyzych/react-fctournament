import ChampionBadge from "./ChampionBadge";
import PlayerBadge from "./PlayerBadge";
import { STATUS_LABELS } from "./StatusTag";

import { countsAsTitle, type ITournamentSummary } from "@/domain";
import { plural } from "@/utils";

interface ITitlesCardProps {
  /** One entry per tournament, oldest first (see summarizeTournaments). */
  summaries: ITournamentSummary[];
  /** Show the champion of every tournament under the count. */
  showList?: boolean;
}

/**
 * Tournaments won by S and by V, from each completed tournament's champion
 * (final winner, or the club picked by hand), with the list of champions.
 * Tournaments in progress are listed but never counted.
 */
const TitlesCard = ({ summaries, showList = true }: ITitlesCardProps) => {
  const completed = summaries.filter((s) => countsAsTitle(s.tournament));
  const titles = { S: 0, V: 0 };
  completed.forEach(({ champion }) => {
    if (champion) titles[champion.owner] += 1;
  });
  const decided = titles.S + titles.V;
  const withoutChampion = completed.length - decided;
  const inProgress = summaries.filter(
    (s) => s.tournament.status === "active"
  ).length;
  const share = (n: number) => `${decided ? (n / decided) * 100 : 0}%`;

  return (
    <div>
      <div className="flex align-items-center justify-content-between mb-3">
        <div className="flex align-items-center gap-3">
          <PlayerBadge player="S" size="lg" />
          <span className="text-5xl font-bold">{titles.S}</span>
        </div>
        <div className="text-center text-500 text-sm">
          <div>
            завершено: {completed.length}{" "}
            {plural(completed.length, ["турнір", "турніри", "турнірів"])}
          </div>
          {withoutChampion > 0 && <div>без чемпіона: {withoutChampion}</div>}
          {inProgress > 0 && <div>триває: {inProgress}</div>}
        </div>
        <div className="flex align-items-center gap-3">
          <span className="text-5xl font-bold">{titles.V}</span>
          <PlayerBadge player="V" size="lg" />
        </div>
      </div>

      <div className="versus-bar mb-3" aria-hidden>
        <span className="versus-bar__s" style={{ width: share(titles.S) }} />
        <span className="versus-bar__v" style={{ width: share(titles.V) }} />
      </div>

      {showList && summaries.length > 0 && (
        <div className="flex flex-column gap-2">
          {summaries.map(({ tournament, champion }) => (
            <div
              key={tournament.id}
              className="flex align-items-center justify-content-between gap-2 min-w-0"
            >
              <span className="min-w-0 white-space-nowrap overflow-hidden text-overflow-ellipsis">
                <span className="text-500">№{tournament.number}</span>{" "}
                {tournament.name}
              </span>
              {!countsAsTitle(tournament) ? (
                <span className="text-500 text-sm white-space-nowrap">
                  {STATUS_LABELS[tournament.status]}
                </span>
              ) : champion ? (
                <ChampionBadge club={champion} />
              ) : (
                <span className="text-500 text-sm white-space-nowrap">
                  Не визначено
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TitlesCard;
