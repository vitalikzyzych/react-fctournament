import {
  computeDrawStrength,
  type IRatings,
  type ITournament,
  tournamentRatingChanges,
} from "@/domain";
import { ClubLabel, MatchLine, PlayerBadge } from "@/ui";
import { formatPercent, formatSigned } from "@/utils";

interface IRatingsCardProps {
  tournament: ITournament;
  ratings: IRatings;
}

const TOP = 4;

/**
 * The tournament through the club ratings: how strong each player's draw
 * was on paper, who gained and lost the most, and the sensations.
 */
const RatingsCard = ({ tournament, ratings }: IRatingsCardProps) => {
  const strength = computeDrawStrength(tournament, ratings);
  const changes = tournamentRatingChanges(tournament, ratings);
  const clubsById = new Map(tournament.clubs.map((club) => [club.id, club]));
  const upsets = ratings.upsets
    .filter((upset) => upset.tournament.id === tournament.id)
    .slice(0, TOP);
  const groupName = (id: string) =>
    tournament.groups.find((group) => group.id === id)?.name ?? id;
  const moves = (list: typeof changes) =>
    list.map(({ club, change }) => (
      <div key={club.id} className="flex justify-content-between gap-2">
        <ClubLabel name={club.name} clubId={club.id} owner={club.owner} />
        <span className="font-semibold white-space-nowrap">
          {formatSigned(Math.round(change))}
        </span>
      </div>
    ));

  if (!changes.length) {
    return <div className="text-600">Ще немає зіграних матчів</div>;
  }
  return (
    <div className="grid">
      <div className="col-12 md:col-6 lg:col-3 flex flex-column gap-2">
        <span className="text-xs text-500 uppercase font-semibold">
          Сила жеребу
        </span>
        {strength ? (
          <>
            {(["S", "V"] as const).map((player) => (
              <div key={player} className="flex justify-content-between gap-2">
                <span className="flex align-items-center gap-2">
                  <PlayerBadge player={player} /> середній рейтинг клубів
                </span>
                <span className="font-semibold">
                  {Math.round(strength.players[player])}
                </span>
              </div>
            ))}
            {strength.groups.length > 1 && (
              <span className="text-sm text-600">
                Найсильніша: {groupName(strength.groups[0].groupId)} (
                {Math.round(strength.groups[0].rating)}), найслабша:{" "}
                {groupName(strength.groups.at(-1)?.groupId ?? "")} (
                {Math.round(strength.groups.at(-1)?.rating ?? 0)}).
              </span>
            )}
          </>
        ) : (
          <span className="text-sm text-600">
            Зʼявиться, коли клуби цього турніру матимуть рейтинг із попередніх.
          </span>
        )}
      </div>
      <div className="col-12 md:col-6 lg:col-3 flex flex-column gap-2">
        <span className="text-xs text-500 uppercase font-semibold">
          Найбільше додали
        </span>
        {moves(changes.slice(0, TOP))}
      </div>
      <div className="col-12 md:col-6 lg:col-3 flex flex-column gap-2">
        <span className="text-xs text-500 uppercase font-semibold">
          Найбільше втратили
        </span>
        {moves(changes.slice(-TOP).reverse())}
      </div>
      <div className="col-12 md:col-6 lg:col-3 flex flex-column gap-2">
        <span className="text-xs text-500 uppercase font-semibold">
          Сенсації
        </span>
        {upsets.length ? (
          upsets.map((upset) => (
            <div key={upset.match.id} className="flex flex-column gap-1">
              <MatchLine match={upset.match} clubsById={clubsById} />
              <span className="text-xs text-500">
                шанс переможця був {formatPercent(upset.chance)}
              </span>
            </div>
          ))
        ) : (
          <span className="text-sm text-600">
            Сенсацій не було: фаворити не програвали.
          </span>
        )}
      </div>
    </div>
  );
};

export default RatingsCard;
