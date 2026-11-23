import { useMemo } from "react";

import {
  computeMedals,
  computeRecordBook,
  describeMatch,
  isLeagueFormat,
  type ITournamentMatch,
  type ITournamentWithMatches,
  PLAYER_IDS,
} from "@/domain";
import { ClubLabel, MatchLine, PlayerBadge, SectionCard } from "@/ui";

const MatchList = ({ items }: { items: ITournamentMatch[] }) =>
  items.length ? (
    <div className="flex flex-column gap-3">
      {items.map(({ tournament, match }) => (
        <div
          key={`${tournament.id}:${match.id}`}
          className="flex flex-column gap-1"
        >
          <span className="text-xs text-500">
            №{tournament.number} {tournament.name},{" "}
            {describeMatch(match, isLeagueFormat(tournament.format))}
          </span>
          <MatchLine
            match={match}
            clubsById={new Map(tournament.clubs.map((club) => [club.id, club]))}
          />
        </div>
      ))}
    </div>
  ) : (
    <div className="text-600">Ще немає зіграних матчів</div>
  );

/**
 * The best of everything over all tournaments, the medals of each player
 * and of the clubs, and the five biggest wins and goal fests.
 */
const RecordBook = ({
  all,
  includePlayoff,
}: {
  all: ITournamentWithMatches[];
  includePlayoff: boolean;
}) => {
  const book = useMemo(
    () => computeRecordBook(all, includePlayoff),
    [all, includePlayoff]
  );
  const medals = useMemo(() => computeMedals(all), [all]);
  const medalCount = medals.clubs.length;

  return (
    <div className="grid">
      <div className="col-12 lg:col-7">
        <SectionCard title="Книга рекордів" className="h-full">
          {book.records.length ? (
            <div className="record-book">
              {book.records.map((record) => (
                <div key={record.id} className="record-book__row">
                  <span className="text-xs text-500 uppercase font-semibold">
                    {record.label}
                  </span>
                  <div className="flex align-items-center justify-content-between gap-2 flex-wrap">
                    {record.club ? (
                      <ClubLabel
                        name={record.club.name}
                        clubId={record.club.id}
                        owner={record.club.owner}
                        bold
                      />
                    ) : record.player ? (
                      <span className="flex align-items-center gap-2 font-semibold">
                        <PlayerBadge player={record.player} /> Гравець{" "}
                        {record.player}
                      </span>
                    ) : (
                      <span className="font-semibold">
                        {record.tournament.name}
                      </span>
                    )}
                    <span className="font-semibold white-space-nowrap">
                      {record.value}
                    </span>
                  </div>
                  <span className="text-xs text-500">
                    №{record.tournament.number} {record.tournament.name}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-600">Ще немає зіграних матчів</div>
          )}
        </SectionCard>
      </div>
      <div className="col-12 lg:col-5">
        <SectionCard title="Медалі" className="h-full">
          <div className="flex flex-column gap-3">
            {PLAYER_IDS.map((player) => (
              <div key={player} className="flex align-items-center gap-3">
                <PlayerBadge player={player} size="md" />
                {(["gold", "silver", "bronze"] as const).map((medal) => (
                  <span key={medal} className="flex align-items-center gap-1">
                    <span className={`medal medal--${medal}`} />
                    <b>{medals.players[player][medal]}</b>
                  </span>
                ))}
              </div>
            ))}
            {medalCount ? (
              <div className="flex flex-column gap-2">
                {medals.clubs.slice(0, 12).map((row) => (
                  <div
                    key={row.clubId}
                    className="flex align-items-center justify-content-between gap-2"
                  >
                    <ClubLabel
                      name={row.name}
                      clubId={row.clubId}
                      country={row.country}
                      showFlag
                    />
                    <span className="flex align-items-center gap-2 white-space-nowrap">
                      {(["gold", "silver", "bronze"] as const).map(
                        (medal) =>
                          row[medal] > 0 && (
                            <span
                              key={medal}
                              className="flex align-items-center gap-1"
                            >
                              <span className={`medal medal--${medal}`} />
                              {row[medal]}
                            </span>
                          )
                      )}
                    </span>
                  </div>
                ))}
              </div>
            ) : null}
            <span className="text-sm text-600">
              Завершені турніри: золото чемпіону, срібло другому фіналісту,
              бронза обом клубам, що програли в півфіналі.
            </span>
          </div>
        </SectionCard>
      </div>
      <div className="col-12 lg:col-6">
        <SectionCard title="Найбільші перемоги в історії" className="h-full">
          <MatchList items={book.biggestWins} />
        </SectionCard>
      </div>
      <div className="col-12 lg:col-6">
        <SectionCard
          title="Найрезультативніші матчі в історії"
          className="h-full"
        >
          <MatchList items={book.highestScoring} />
        </SectionCard>
      </div>
    </div>
  );
};

export default RecordBook;
