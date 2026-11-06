import { Button } from "primereact/button";
import { Column } from "primereact/column";
import { DataTable } from "primereact/datatable";
import { Dialog } from "primereact/dialog";

import {
  describeMatch,
  type IClub,
  type IClubHistory,
  type IClubHistoryEntry,
  type IMatch,
  isLeagueFormat,
  roundName,
} from "@/domain";
import {
  ClubCrest,
  CountryFlag,
  FluentIcon,
  MatchRow,
  PlayerBadge,
  resolveFlag,
} from "@/ui";
import { findCatalogClub, formatSigned, plural } from "@/utils";

interface IClubHistoryDialogProps {
  history: IClubHistory | null;
  onHide: () => void;
}

/** Win, draw or loss from the club's side; nothing while not played. */
const outcome = (match: IMatch, clubId: string): string | null => {
  if (!match.result) return null;
  const own = match.home === clubId ? match.result.home : match.result.away;
  const other = match.home === clubId ? match.result.away : match.result.home;
  if (own > other) return "перемога";
  return own === other ? "нічия" : "поразка";
};

/** Every match of the club in one tournament, read-only. */
const TournamentMatches = ({
  entry,
  clubId,
}: {
  entry: IClubHistoryEntry;
  clubId: string;
}) => {
  const { tournament, matches } = entry;
  const clubsById = new Map<string, IClub>(
    tournament.clubs.map((club) => [club.id, club])
  );
  const league = isLeagueFormat(tournament.format);
  return (
    <div>
      <div className="flex align-items-baseline gap-2 mb-2">
        <span className="font-semibold">
          №{tournament.number} {tournament.name}
        </span>
        <span className="text-500 text-xs">
          {matches.length} {plural(matches.length, ["матч", "матчі", "матчів"])}
        </span>
      </div>
      <div className="flex flex-column gap-2">
        {matches.map((match) => {
          const result = outcome(match, clubId);
          return (
            <MatchRow
              key={match.id}
              match={match}
              clubsById={clubsById}
              editable={false}
              meta={`${describeMatch(match, league)} · ${result ?? "не зіграно"}`}
            />
          );
        })}
      </div>
    </div>
  );
};

/**
 * Modal pattern from web-app: no header, title in the body, absolute close
 * button. The club's record per tournament, then all its matches, newest
 * tournament first.
 */
const ClubHistoryDialog = ({ history, onHide }: IClubHistoryDialogProps) => {
  const catalogClub = history
    ? findCatalogClub(history.clubId, history.name)
    : null;
  // A national team's crest is already its flag.
  const flag =
    history && !catalogClub?.nation
      ? resolveFlag(history.country, catalogClub?.country)
      : null;

  return (
    <Dialog
      visible={history !== null}
      onHide={onHide}
      showHeader={false}
      dismissableMask
      className="w-full mx-3 dialog-wide"
      contentClassName="border-round-xl p-4 relative"
    >
      {history && (
        <>
          <Button
            icon={<FluentIcon name="Dismiss" size={20} />}
            rounded
            text
            severity="secondary"
            onClick={onHide}
            aria-label="Закрити"
            className="absolute top-0 right-0 mt-2 mr-2"
          />
          <div className="flex align-items-center gap-3 mb-3 pr-5">
            <ClubCrest club={catalogClub} name={history.name} size="lg" />
            <div className="min-w-0">
              <h2 className="m-0 mb-1 text-xl font-bold">{history.name}</h2>
              <div className="flex flex-wrap align-items-center gap-2 text-600 text-sm">
                {flag && <CountryFlag code={flag} title={history.country} />}
                {history.country && <span>{history.country} ·</span>}
                <span>
                  за S: {history.timesByPlayer.S}, за V:{" "}
                  {history.timesByPlayer.V}
                  {history.titles > 0 && `, титулів: ${history.titles}`}
                </span>
              </div>
            </div>
          </div>
          <DataTable
            value={history.entries}
            dataKey="tournament.id"
            size="small"
            scrollable
          >
            <Column
              header="Турнір"
              body={(e: IClubHistoryEntry) => `№${e.tournament.number}`}
            />
            <Column
              header="Гравець"
              body={(e: IClubHistoryEntry) => (
                <PlayerBadge player={e.club.owner} />
              )}
            />
            <Column
              header="Група"
              body={(e: IClubHistoryEntry) =>
                isLeagueFormat(e.tournament.format)
                  ? `Ліга, ${e.position} місце`
                  : `${e.club.group}, ${e.position} місце`
              }
            />
            <Column
              header="Плей-офф"
              body={(e: IClubHistoryEntry) =>
                e.playoff ? (
                  <span
                    className={
                      e.playoff === "champion"
                        ? "text-yellow-300 font-bold"
                        : undefined
                    }
                  >
                    {e.playoff === "champion"
                      ? "Чемпіон"
                      : roundName(e.playoff)}
                  </span>
                ) : (
                  <span className="text-500">–</span>
                )
              }
              className="white-space-nowrap"
            />
            <Column
              header="В-Н-П"
              body={(e: IClubHistoryEntry) =>
                `${e.record.won}-${e.record.drawn}-${e.record.lost}`
              }
              className="white-space-nowrap"
            />
            <Column
              header="М"
              body={(e: IClubHistoryEntry) =>
                `${e.record.goalsFor}:${e.record.goalsAgainst} (${formatSigned(e.record.goalDiff)})`
              }
              className="white-space-nowrap"
            />
            <Column
              header="О"
              body={(e: IClubHistoryEntry) => e.record.points}
              className="font-bold"
            />
          </DataTable>

          <h3 className="section-title mt-4 mb-3">Усі матчі</h3>
          <div className="flex flex-column gap-4">
            {[...history.entries].reverse().map((entry) => (
              <TournamentMatches
                key={entry.tournament.id}
                entry={entry}
                clubId={history.clubId}
              />
            ))}
          </div>
        </>
      )}
    </Dialog>
  );
};

export default ClubHistoryDialog;
