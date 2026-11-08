import { useMemo } from "react";

import { Button } from "primereact/button";
import { Dialog } from "primereact/dialog";

import ClubCrest from "./ClubCrest";
import FluentIcon from "./FluentIcon";
import MatchCards from "./MatchCards";
import MatchRow from "./MatchRow";
import PlayerBadge from "./PlayerBadge";

import {
  computeDiscipline,
  describeMatch,
  groupTable,
  type IClub,
  type IMatch,
  isLeagueFormat,
  type ITournament,
  matchOutcome,
  OUTCOME_LABELS,
  sortMatches,
} from "@/domain";
import { findCatalogClub, formatSigned, plural } from "@/utils";

interface IClubMatchesDialogProps {
  tournament: ITournament;
  matches: IMatch[];
  /** The club to show; null keeps the dialog closed. */
  club: IClub | null;
  onHide: () => void;
}

/**
 * One club in one tournament: its place and record, then every match it has
 * (group or league, then playoff), played or not, with cards. Read-only;
 * results are entered on the matches tab.
 */
const ClubMatchesDialog = ({
  tournament,
  matches,
  club,
  onHide,
}: IClubMatchesDialogProps) => {
  const league = isLeagueFormat(tournament.format);
  const clubsById = useMemo(
    () => new Map(tournament.clubs.map((c) => [c.id, c])),
    [tournament.clubs]
  );
  const discipline = useMemo(() => computeDiscipline(matches), [matches]);

  const row = club
    ? groupTable(tournament, matches, club.group).find(
        (r) => r.club.id === club.id
      )
    : undefined;
  const own = club
    ? sortMatches(matches).filter(
        (m) => m.home === club.id || m.away === club.id
      )
    : [];
  const played = own.filter((m) => m.result !== null).length;

  return (
    <Dialog
      visible={club !== null}
      onHide={onHide}
      showHeader={false}
      dismissableMask
      className="w-full mx-3 dialog-wide"
      contentClassName="border-round-xl p-4 relative"
    >
      {club && (
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
            <ClubCrest
              club={findCatalogClub(club.id, club.name)}
              name={club.name}
              size="lg"
            />
            <div className="min-w-0">
              <h2 className="m-0 mb-1 text-xl font-bold">{club.name}</h2>
              <div className="flex flex-wrap align-items-center gap-2 text-600 text-sm">
                <PlayerBadge player={club.owner} />
                <span>
                  {league && club.pot
                    ? `Кошик ${club.pot}`
                    : `Група ${club.group}`}
                  {row && row.played > 0 && `, ${row.position} місце`}
                </span>
              </div>
            </div>
          </div>

          {row && (
            <div className="flex flex-wrap gap-3 mb-4 text-sm">
              <span>
                <span className="text-500">В-Н-П </span>
                <b>
                  {row.won}-{row.drawn}-{row.lost}
                </b>
              </span>
              <span>
                <span className="text-500">М </span>
                <b>
                  {row.goalsFor}:{row.goalsAgainst} (
                  {formatSigned(row.goalDiff)})
                </b>
              </span>
              <span>
                <span className="text-500">О </span>
                <b>{row.points}</b>
              </span>
              <span className="text-500">
                {league ? "у лізі" : "у групі"}, плей-офф не враховано
              </span>
            </div>
          )}

          <div className="flex align-items-baseline gap-2 mb-2">
            <h3 className="section-title m-0">Матчі</h3>
            <span className="text-500 text-xs">
              зіграно {played} з {own.length}{" "}
              {plural(own.length, ["матчу", "матчів", "матчів"])}
            </span>
          </div>
          <div className="flex flex-column gap-2">
            {own.map((match) => {
              const result = matchOutcome(match, club.id);
              return (
                <MatchRow
                  key={match.id}
                  match={match}
                  clubsById={clubsById}
                  editable={false}
                  meta={`${describeMatch(match, league)} · ${
                    result ? OUTCOME_LABELS[result] : "не зіграно"
                  }`}
                  footer={
                    <MatchCards
                      match={match}
                      clubsById={clubsById}
                      discipline={discipline}
                      editable={false}
                    />
                  }
                />
              );
            })}
          </div>
        </>
      )}
    </Dialog>
  );
};

export default ClubMatchesDialog;
