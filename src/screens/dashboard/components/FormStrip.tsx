import {
  currentStreaks,
  type IClub,
  type IMatch,
  PLAYER_IDS,
  recentDuels,
} from "@/domain";
import { PlayerBadge } from "@/ui";
import { formatScore, plural } from "@/utils";

interface IFormStripProps {
  clubs: IClub[];
  matches: IMatch[];
}

const matchesWord = (n: number) =>
  `${n} ${plural(n, ["матч", "матчі", "матчів"])}`;

/**
 * The last ten S against V matches as coloured squares (who won, oldest on
 * the left) and the streak running now.
 */
const FormStrip = ({ clubs, matches }: IFormStripProps) => {
  const duels = recentDuels(clubs, matches);
  const streaks = currentStreaks(clubs, matches);
  const clubsById = new Map(clubs.map((club) => [club.id, club]));
  if (!duels.length) {
    return <div className="text-600">Ще немає зіграних матчів</div>;
  }

  // Wins in a row, and the unbeaten run when it is longer than the wins.
  const lines = PLAYER_IDS.flatMap((id) => {
    const { wins, unbeaten } = streaks[id];
    return [
      ...(wins >= 2
        ? [{ id, key: "wins", text: `виграє ${matchesWord(wins)} поспіль` }]
        : []),
      ...(unbeaten >= 2 && unbeaten > wins
        ? [
            {
              id,
              key: "unbeaten",
              text: `не програє ${matchesWord(unbeaten)} поспіль`,
            },
          ]
        : []),
    ];
  });

  return (
    <div className="flex flex-column gap-3">
      <div className="duel-strip" aria-label="Останні матчі S проти V">
        {duels.map(({ match, winner }) => (
          <span
            key={match.id}
            className={`duel-strip__cell duel-strip__cell--${winner ?? "draw"}`}
            title={`${clubsById.get(match.home)?.name ?? match.home} ${formatScore(match.result)} ${clubsById.get(match.away)?.name ?? match.away}`}
          >
            {winner ?? "Н"}
          </span>
        ))}
      </div>
      <div className="flex flex-column gap-2 text-sm">
        {lines.length ? (
          lines.map(({ id, key, text }) => (
            <span
              key={`${id}:${key}`}
              className="flex align-items-center gap-2"
            >
              <PlayerBadge player={id} />
              <span>
                <span className="font-semibold">{id}</span> {text}
              </span>
            </span>
          ))
        ) : (
          <span className="text-600">Зараз ніхто не має серії</span>
        )}
      </div>
    </div>
  );
};

export default FormStrip;
