import {
  computePotPerformance,
  type IMatch,
  type IPotClub,
  type ITournament,
} from "@/domain";
import { ClubLabel } from "@/ui";
import { formatAverage, plural } from "@/utils";

const placesWord = (n: number) =>
  `${n} ${plural(n, ["місце", "місця", "місць"])}`;

/** League pots: points per match and average place, plus the surprise. */
const PotsCard = ({
  tournament,
  matches,
}: {
  tournament: ITournament;
  matches: IMatch[];
}) => {
  const performance = computePotPerformance(tournament, matches);
  if (!performance) {
    return <div className="text-600">Ще немає зіграних матчів</div>;
  }
  const { pots, surprise, disappointment } = performance;
  const best = Math.max(
    ...pots.map((p) => (p.played ? p.points / p.played : 0))
  );

  const standout = (title: string, club: IPotClub, better: boolean) => (
    <div className="flex flex-column gap-1">
      <span className="text-xs text-500 uppercase font-semibold">{title}</span>
      <div className="flex justify-content-between align-items-center gap-2">
        <ClubLabel
          name={club.club.name}
          clubId={club.club.id}
          owner={club.club.owner}
          pot={club.club.pot}
        />
        <span
          className="text-sm text-right"
          title={`На ${placesWord(Math.round(club.gap))} ${better ? "вище" : "нижче"} за середину кошика`}
        >
          <span className="font-semibold">{club.position}-е місце</span>
          <span className="text-600">
            , кошик К{club.club.pot} зазвичай {club.potPlaces[0]} до{" "}
            {club.potPlaces[1]}
          </span>
        </span>
      </div>
    </div>
  );

  return (
    <div className="flex flex-column gap-4">
      <div className="flex flex-column gap-2">
        {pots.map((pot) => {
          const ppm = pot.played ? pot.points / pot.played : 0;
          return (
            <div key={pot.pot} className="pot-row">
              <span className="pot-tag">К{pot.pot}</span>
              <div className="progress-bar">
                <span style={{ width: `${best ? (ppm / best) * 100 : 0}%` }} />
              </div>
              <span className="text-sm white-space-nowrap">
                <span className="font-semibold">{formatAverage(ppm)}</span>{" "}
                <span className="text-600">очка за матч</span>
              </span>
              <span className="text-sm text-600 white-space-nowrap">
                сер. місце {Math.round(pot.avgPosition)}
              </span>
            </div>
          );
        })}
      </div>
      {surprise && standout("Відкриття ліги", surprise, true)}
      {disappointment && standout("Розчарування ліги", disappointment, false)}
    </div>
  );
};

export default PotsCard;
