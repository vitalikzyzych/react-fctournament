import type { ReactNode } from "react";

import {
  computeTournamentStats,
  type IClub,
  type IMatch,
  playoffComebacks,
  roundName,
} from "@/domain";
import { ClubLabel, MatchLine } from "@/ui";
import { formatAverage, plural } from "@/utils";

interface IRecordsCardProps {
  clubs: IClub[];
  matches: IMatch[];
}

const matchesWord = (n: number) =>
  `${n} ${plural(n, ["матч", "матчі", "матчів"])}`;

/** The best of each kind in the tournament, one line each. */
const RecordsCard = ({ clubs, matches }: IRecordsCardProps) => {
  const stats = computeTournamentStats(clubs, matches);
  const clubsById = new Map(clubs.map((club) => [club.id, club]));
  const club = (c: IClub) => (
    <ClubLabel name={c.name} clubId={c.id} owner={c.owner} />
  );
  // Best defence over at least three matches, per match.
  const defence = stats.clubs
    .filter((s) => s.played >= 3)
    .sort(
      (a, b) =>
        a.goalsAgainst / a.played - b.goalsAgainst / b.played ||
        b.played - a.played
    )[0];
  const comeback = playoffComebacks(matches).at(-1);

  const rows: { label: string; content: ReactNode }[] = [];
  const [biggest] = stats.biggestWins;
  if (biggest) {
    rows.push({
      label: "Найбільша перемога",
      content: <MatchLine match={biggest} clubsById={clubsById} />,
    });
  }
  const [highest] = stats.highestScoring;
  if (highest && highest.id !== biggest?.id) {
    rows.push({
      label: "Найрезультативніший матч",
      content: <MatchLine match={highest} clubsById={clubsById} />,
    });
  }
  const [wins] = stats.winStreaks;
  if (wins && wins.count >= 2) {
    rows.push({
      label: "Найдовша серія перемог",
      content: (
        <div className="flex justify-content-between gap-2">
          {club(wins.club)}
          <span className="font-semibold white-space-nowrap">
            {matchesWord(wins.count)}
            {wins.ongoing && " (триває)"}
          </span>
        </div>
      ),
    });
  }
  const [unbeaten] = stats.unbeatenStreaks;
  if (unbeaten && unbeaten.count >= 3) {
    rows.push({
      label: "Найдовша серія без поразок",
      content: (
        <div className="flex justify-content-between gap-2">
          {club(unbeaten.club)}
          <span className="font-semibold white-space-nowrap">
            {matchesWord(unbeaten.count)}
            {unbeaten.ongoing && " (триває)"}
          </span>
        </div>
      ),
    });
  }
  if (defence) {
    rows.push({
      label: "Найкращий захист",
      content: (
        <div className="flex justify-content-between gap-2">
          {club(defence.club)}
          <span className="font-semibold white-space-nowrap">
            {formatAverage(defence.goalsAgainst / defence.played)} проп. за матч
          </span>
        </div>
      ),
    });
  }
  if (comeback) {
    const winner = clubsById.get(comeback.winner);
    const loser = clubsById.get(comeback.loser);
    if (winner && loser) {
      rows.push({
        label: `Камбек, ${roundName(comeback.round)}`,
        content: (
          <div className="flex align-items-center gap-2 flex-wrap">
            {club(winner)}
            <span className="text-600 text-sm">
              програв перший матч і пройшов
            </span>
            {club(loser)}
          </div>
        ),
      });
    }
  }

  if (!rows.length) {
    return <div className="text-600">Ще немає зіграних матчів</div>;
  }
  return (
    <div className="flex flex-column gap-3">
      {rows.map((row) => (
        <div key={row.label} className="flex flex-column gap-1">
          <span className="text-xs text-500 uppercase font-semibold">
            {row.label}
          </span>
          {row.content}
        </div>
      ))}
    </div>
  );
};

export default RecordsCard;
