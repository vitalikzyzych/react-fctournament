import { classNames } from "primereact/utils";

import ClubLabel from "./ClubLabel";

import type {
  IClub,
  IPlayoffRoundInfo,
  IPlayoffTie,
  ITieChance,
} from "@/domain";
import { tieKey } from "@/domain";
import { formatChance } from "@/utils";

interface IBracketProps {
  rounds: IPlayoffRoundInfo[];
  ties: IPlayoffTie[];
  clubsById: Map<string, IClub>;
  /** Chances of the open ties, by tieKey. */
  chances?: Map<string, ITieChance>;
}

/**
 * The whole playoff at a glance: a column per round, a box per tie with
 * both clubs, the score of every game and the aggregate. Ties are filled in
 * by hand, so the columns are not joined by lines: a semi-final need not
 * hold the winners of the two quarter-finals next to it.
 */
const Bracket = ({ rounds, ties, clubsById, chances }: IBracketProps) => (
  <div className="bracket">
    {rounds.map((round) => (
      <div key={round.id} className="bracket__round">
        <span className="bracket__title">{round.name}</span>
        <div className="bracket__ties">
          {ties
            .filter((tie) => tie.round === round.id)
            .map((tie) => {
              const chance = chances?.get(tieKey(tie));
              const sides = [
                {
                  id: tie.home,
                  total: tie.aggregate.home,
                  chance: chance?.home,
                },
                {
                  id: tie.away,
                  total: tie.aggregate.away,
                  chance: chance?.away,
                },
              ];
              const played = tie.games.some((game) => game.result !== null);
              return (
                <div key={tie.tie} className="bracket__tie">
                  {sides.map(({ id, total, chance: share }, index) => {
                    const club = id ? clubsById.get(id) : undefined;
                    if (!id) {
                      return (
                        <div
                          key={index}
                          className="bracket__club bracket__club--empty"
                        >
                          Пара {tie.tie}: клуб не обрано
                        </div>
                      );
                    }
                    return (
                      <div
                        key={index}
                        className={classNames("bracket__club", {
                          "bracket__club--winner": tie.winner === id,
                          "bracket__club--loser":
                            tie.winner !== null && tie.winner !== id,
                        })}
                      >
                        <ClubLabel
                          name={club?.name ?? id}
                          clubId={id}
                          owner={club?.owner}
                          className="flex-1"
                        />
                        {share !== undefined && (
                          <span className="bracket__chance">
                            {formatChance(share)}
                          </span>
                        )}
                        {tie.games.length > 1 &&
                          tie.games.map((game) => (
                            <span key={game.id} className="bracket__game">
                              {game.result
                                ? game.home === id
                                  ? game.result.home
                                  : game.result.away
                                : "–"}
                            </span>
                          ))}
                        <span className="bracket__total">
                          {played ? total : "–"}
                        </span>
                      </div>
                    );
                  })}
                </div>
              );
            })}
        </div>
      </div>
    ))}
  </div>
);

export default Bracket;
