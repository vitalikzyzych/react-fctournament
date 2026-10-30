import { Button } from "primereact/button";
import { Column } from "primereact/column";
import { DataTable } from "primereact/datatable";
import { Dialog } from "primereact/dialog";

import {
  type IClubHistory,
  type IClubHistoryEntry,
  isLeagueFormat,
  roundName,
} from "@/domain";
import {
  ClubCrest,
  CountryFlag,
  FluentIcon,
  PlayerBadge,
  resolveFlag,
} from "@/ui";
import { findCatalogClub, formatSigned } from "@/utils";

interface IClubHistoryDialogProps {
  history: IClubHistory | null;
  onHide: () => void;
}

/** Modal pattern from web-app: no header, title in the body, absolute close button. */
const ClubHistoryDialog = ({ history, onHide }: IClubHistoryDialogProps) => {
  const catalogClub = history
    ? findCatalogClub(history.clubId, history.name)
    : null;
  const flag = history
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
        </>
      )}
    </Dialog>
  );
};

export default ClubHistoryDialog;
