import { useMemo } from "react";

import { Button } from "primereact/button";
import { Dialog } from "primereact/dialog";
import { classNames } from "primereact/utils";

import ClubCrest from "./ClubCrest";
import FluentIcon from "./FluentIcon";
import MatchLine from "./MatchLine";
import PlayerBadge from "./PlayerBadge";

import {
  buildRecords,
  clubStrengths,
  computeForm,
  computeHeadToHead,
  describeMatch,
  emptyRecord,
  groupTable,
  type IClub,
  type IMatch,
  type IRatings,
  isLeagueFormat,
  type ITournament,
  type ITournamentWithMatches,
  OUTCOME_LABELS,
  predictMatch,
  RATING_START,
  sortMatches,
} from "@/domain";
import {
  findCatalogClub,
  formatAverage,
  formatPercent,
  formatScore,
} from "@/utils";

interface IMatchPreviewDialogProps {
  tournament: ITournament;
  matches: IMatch[];
  /** The match to preview; null keeps the dialog closed. */
  match: IMatch | null;
  all: ITournamentWithMatches[];
  ratings: IRatings;
  onHide: () => void;
}

const SHORT = { win: "В", draw: "Н", loss: "П" } as const;

/**
 * Before a match: the forecast from both clubs' goals in this tournament,
 * their rating, place, record and form side by side, and every earlier
 * meeting of the two clubs.
 */
const MatchPreviewDialog = ({
  tournament,
  matches,
  match,
  all,
  ratings,
  onHide,
}: IMatchPreviewDialogProps) => {
  const league = isLeagueFormat(tournament.format);
  const clubsById = useMemo(
    () => new Map<string, IClub>(tournament.clubs.map((c) => [c.id, c])),
    [tournament.clubs]
  );
  const data = useMemo(() => {
    if (!match) return null;
    const prediction = predictMatch(
      clubStrengths(matches),
      match.home,
      match.away
    );
    const records = buildRecords([match.home, match.away], matches);
    const form = computeForm(sortMatches(matches));
    const meetings = computeHeadToHead(all, match.home, match.away);
    const side = (id: string) => {
      const club = clubsById.get(id);
      const row = club
        ? groupTable(tournament, matches, club.group).find(
            (r) => r.club.id === id
          )
        : undefined;
      return {
        id,
        club,
        record: records.get(id) ?? emptyRecord(),
        position: row && row.played > 0 ? row.position : null,
        rating: Math.round(ratings.byClub.get(id)?.rating ?? RATING_START),
        form: [...(form.get(id) ?? [])].reverse(),
      };
    };
    return {
      prediction,
      meetings,
      home: side(match.home),
      away: side(match.away),
    };
  }, [match, matches, all, ratings, tournament, clubsById]);

  const rows = data
    ? [
        {
          label: "Рейтинг",
          home: data.home.rating,
          away: data.away.rating,
        },
        {
          label: league ? "Місце в лізі" : "Місце в групі",
          home: data.home.position ?? "–",
          away: data.away.position ?? "–",
        },
        {
          label: "В-Н-П у турнірі",
          home: `${data.home.record.won}-${data.home.record.drawn}-${data.home.record.lost}`,
          away: `${data.away.record.won}-${data.away.record.drawn}-${data.away.record.lost}`,
        },
        {
          label: "Голи у турнірі",
          home: `${data.home.record.goalsFor}:${data.home.record.goalsAgainst}`,
          away: `${data.away.record.goalsFor}:${data.away.record.goalsAgainst}`,
        },
        {
          label: "Очікувані голи",
          home: formatAverage(data.prediction.goals.home),
          away: formatAverage(data.prediction.goals.away),
        },
      ]
    : [];

  return (
    <Dialog
      visible={match !== null}
      onHide={onHide}
      showHeader={false}
      dismissableMask
      className="w-full mx-3 dialog-wide"
      contentClassName="border-round-xl p-4 relative"
    >
      {match && data && (
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
          <h2 className="m-0 mb-1 text-xl font-bold pr-5">Перед матчем</h2>
          <div className="text-500 text-sm mb-3">
            {describeMatch(match, league)}
          </div>

          <div className="preview__clubs mb-3">
            {[data.home, data.away].map((side, index) => (
              <div
                key={side.id}
                className={classNames("preview__club", {
                  "preview__club--end": index === 1,
                })}
              >
                <ClubCrest
                  club={findCatalogClub(side.id, side.club?.name ?? side.id)}
                  name={side.club?.name ?? side.id}
                  size="lg"
                />
                <span className="font-bold text-center">
                  {side.club?.name ?? side.id}
                </span>
                {side.club && <PlayerBadge player={side.club.owner} />}
              </div>
            ))}
          </div>

          <div
            className="flex flex-column gap-2 mb-4"
            title="Прогноз за голами обох клубів у цьому турнірі: забиті й пропущені за матч, з поправкою на середній рівень турніру."
          >
            <div className="flex justify-content-between text-sm font-semibold">
              <span>{formatPercent(data.prediction.home)}</span>
              <span className="text-500">
                нічия {formatPercent(data.prediction.draw)}
              </span>
              <span>{formatPercent(data.prediction.away)}</span>
            </div>
            <span className="versus-bar versus-bar--thick">
              <span
                className={
                  data.home.club?.owner === "V"
                    ? "versus-bar__v"
                    : "versus-bar__s"
                }
                // Computed widths: the three outcome chances.
                style={{ width: `${data.prediction.home * 100}%` }}
              />
              <span
                className="versus-bar__draw"
                style={{ width: `${data.prediction.draw * 100}%` }}
              />
              <span
                className={
                  data.away.club?.owner === "S"
                    ? "versus-bar__s"
                    : "versus-bar__v"
                }
                style={{ width: `${data.prediction.away * 100}%` }}
              />
            </span>
            <div className="text-sm text-600 text-center">
              Найімовірніший рахунок{" "}
              <b className="text-color">{formatScore(data.prediction.score)}</b>
            </div>
          </div>

          <div className="preview__table mb-4">
            {rows.map((row) => [
              <span key={`${row.label}h`} className="font-semibold">
                {row.home}
              </span>,
              <span key={row.label} className="text-500 text-sm text-center">
                {row.label}
              </span>,
              <span key={`${row.label}a`} className="font-semibold text-right">
                {row.away}
              </span>,
            ])}
            <span className="form-chips">
              {data.home.form.map(({ match: played, outcome }) => (
                <span
                  key={played.id}
                  className={`form-chip form-chip--${outcome}`}
                  title={OUTCOME_LABELS[outcome]}
                >
                  {SHORT[outcome]}
                </span>
              ))}
            </span>
            <span className="text-500 text-sm text-center">Форма</span>
            <span className="form-chips justify-content-end">
              {data.away.form.map(({ match: played, outcome }) => (
                <span
                  key={played.id}
                  className={`form-chip form-chip--${outcome}`}
                  title={OUTCOME_LABELS[outcome]}
                >
                  {SHORT[outcome]}
                </span>
              ))}
            </span>
          </div>

          <h3 className="section-title m-0 mb-2">Зустрічі цих клубів</h3>
          {data.meetings.matches.length ? (
            <div className="flex flex-column gap-2">
              <div className="text-sm text-600">
                Перемоги {data.meetings.winsA}:{data.meetings.winsB}, нічиїх{" "}
                {data.meetings.draws}, голи {data.meetings.goalsA}:
                {data.meetings.goalsB}
              </div>
              {[...data.meetings.matches]
                .reverse()
                .slice(0, 6)
                .map(({ tournament: played, match: meeting }) => (
                  <div
                    key={`${played.id}:${meeting.id}`}
                    className="flex flex-column gap-1"
                  >
                    <span className="text-xs text-500">
                      №{played.number} {played.name},{" "}
                      {describeMatch(meeting, isLeagueFormat(played.format))}
                    </span>
                    <MatchLine
                      match={meeting}
                      clubsById={
                        new Map(played.clubs.map((club) => [club.id, club]))
                      }
                    />
                  </div>
                ))}
            </div>
          ) : (
            <div className="text-600">Ці клуби ще не зустрічалися.</div>
          )}
        </>
      )}
    </Dialog>
  );
};

export default MatchPreviewDialog;
