import { gameLabel, type IClub, type IEarlierGames } from "@/domain";
import { ClubLabel } from "@/ui";
import { formatScore } from "@/utils";

interface IEarlierGamesProps {
  earlier: IEarlierGames;
  /** Clubs of the game being entered, to read the aggregate from. */
  home: string;
  away: string;
  clubsById: Map<string, IClub>;
}

/**
 * How the tie stands before this game: the first leg for a second leg, every
 * leg (and the aggregate) for an extra game.
 */
const EarlierGames = ({
  earlier,
  home,
  away,
  clubsById,
}: IEarlierGamesProps) => {
  const club = (id: string, end = false) => (
    <ClubLabel
      name={clubsById.get(id)?.name ?? id}
      clubId={id}
      badgePosition={end ? "end" : "start"}
    />
  );

  return (
    <div className="earlier-games">
      {earlier.games.map((game) => (
        <div key={game.id} className="earlier-games__row">
          <span className="earlier-games__label">
            {gameLabel(game) ?? "Перший матч"}
          </span>
          {club(game.home)}
          <span className="score-chip">{formatScore(game.result)}</span>
          {club(game.away, true)}
        </div>
      ))}
      {earlier.games.length > 1 && (
        <div className="earlier-games__row">
          <span className="earlier-games__label">За сумою</span>
          {club(home)}
          <span className="score-chip">{formatScore(earlier.aggregate)}</span>
          {club(away, true)}
        </div>
      )}
    </div>
  );
};

export default EarlierGames;
