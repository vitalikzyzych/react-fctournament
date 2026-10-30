import { useState } from "react";

import { Button } from "primereact/button";
import { confirmDialog } from "primereact/confirmdialog";
import { Dropdown } from "primereact/dropdown";

import {
  canPair,
  clubOrigin,
  gameLabel,
  type IClub,
  type IPlayoffTie,
  isLeagueFormat,
  type ITournament,
  newTieGames,
  pendingReplay,
  PLAYOFF_ROUNDS,
  roundLegs,
} from "@/domain";
import { useSaveResult } from "@/hooks";
import { useToast } from "@/providers";
import {
  createPlayoffGames,
  deletePlayoffMatches,
  setPlayoffTeams,
} from "@/source/TournamentSource";
import { ChampionBadge, ClubLabel, FluentIcon, MatchRow } from "@/ui";
import { formatScore } from "@/utils";

interface IPlayoffTieCardProps {
  tournament: ITournament;
  tie: IPlayoffTie;
  clubsById: Map<string, IClub>;
  editable: boolean;
  /** Clubs already in another tie of the same round. */
  taken: Set<string>;
}

interface IClubOption {
  label: string;
  value: string;
  club: IClub;
}

/**
 * One tie of the bracket. Both clubs are picked by hand; the legs are created
 * as soon as both are chosen (two in QF and SF, home then away; one final).
 * The aggregate decides; a level aggregate adds an extra game. A wrongly
 * picked club can be changed in every game of the tie. The parent remounts
 * the card (via `key`) when the stored teams change, so the pickers start
 * from them.
 */
const PlayoffTieCard = ({
  tournament,
  tie,
  clubsById,
  editable,
  taken,
}: IPlayoffTieCardProps) => {
  const { show } = useToast();
  const saveResult = useSaveResult(tournament, tie.games);
  const [editing, setEditing] = useState(false);
  const [home, setHome] = useState<string | null>(tie.home);
  const [away, setAway] = useState<string | null>(tie.away);

  const isEmpty = tie.games.length === 0;
  const legs = roundLegs(tie.round);
  const strict = PLAYOFF_ROUNDS.find((r) => r.id === tie.round)?.strictPairing;
  const league = isLeagueFormat(tournament.format);
  const anyPlayed = tie.games.some((game) => game.result !== null);
  const showPickers = editable && (isEmpty || editing);
  const replay = editable ? pendingReplay(tie) : null;
  const winner = tie.winner ? clubsById.get(tie.winner) : undefined;
  const nameOf = (id: string) => clubsById.get(id)?.name ?? id;
  const fail = (summary: string) => (error: Error) =>
    show("error", summary, error.message);

  const options: IClubOption[] = [...tournament.clubs]
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((club) => ({ label: club.name, value: club.id, club }));

  const pick = (side: "home" | "away", value: string | null) => {
    const nextHome = side === "home" ? value : home;
    const nextAway = side === "away" ? value : away;
    setHome(nextHome);
    setAway(nextAway);
    // A new tie gets its legs as soon as both clubs are chosen.
    if (isEmpty && nextHome && nextAway && nextHome !== nextAway) {
      createPlayoffGames(
        tournament.id,
        newTieGames(tie.round, tie.tie, nextHome, nextAway)
      ).catch(fail("Не вдалося створити пару"));
    }
  };

  const saveTeams = () => {
    if (!home || !away) return;
    setEditing(false);
    setPlayoffTeams(tournament.id, tie.games, home, away)
      .then(() =>
        show("success", "Пару змінено", `${nameOf(home)} : ${nameOf(away)}`)
      )
      .catch(fail("Не вдалося змінити пару"));
  };

  const cancelEdit = () => {
    setEditing(false);
    setHome(tie.home);
    setAway(tie.away);
  };

  const removeTie = () =>
    confirmDialog({
      header: "Видалити пару?",
      message: "Пару і всі її матчі буде видалено. Клуби можна обрати знову.",
      acceptLabel: "Видалити",
      rejectLabel: "Скасувати",
      acceptClassName: "p-button-danger",
      accept: () =>
        deletePlayoffMatches(
          tournament.id,
          tie.games.map((game) => game.id)
        ).catch(fail("Не вдалося видалити пару")),
    });

  const picker = (side: "home" | "away") => {
    const value = side === "home" ? home : away;
    const other = side === "home" ? away : home;
    const otherClub = other ? clubsById.get(other) : undefined;
    return (
      <Dropdown
        value={value}
        onChange={(e) => pick(side, e.value)}
        options={options}
        optionDisabled={(option: IClubOption) =>
          taken.has(option.value) ||
          !canPair(tie.round, otherClub, option.club, league)
        }
        itemTemplate={(option: IClubOption) => (
          <span className="flex align-items-center justify-content-between gap-2 w-full">
            <ClubLabel
              name={option.club.name}
              clubId={option.club.id}
              owner={option.club.owner}
              country={option.club.country}
              showFlag
            />
            <span className="text-500 text-xs">{clubOrigin(option.club)}</span>
          </span>
        )}
        valueTemplate={(option: IClubOption | null) =>
          option ? (
            <ClubLabel
              name={option.club.name}
              clubId={option.club.id}
              owner={option.club.owner}
            />
          ) : (
            <span className="text-500">
              {side === "home" ? "Перший клуб" : "Другий клуб"}
            </span>
          )
        }
        filter
        placeholder={side === "home" ? "Перший клуб" : "Другий клуб"}
        aria-label={side === "home" ? "Перший клуб" : "Другий клуб"}
        className="flex-1 min-w-0"
      />
    );
  };

  return (
    <div className="app-card p-3 h-full flex flex-column gap-3">
      <div className="flex align-items-center justify-content-between gap-2">
        <span className="section-title">Пара {tie.tie}</span>
        <div className="flex align-items-center gap-2 min-w-0">
          {winner &&
            (tie.round === "F" ? (
              <ChampionBadge club={winner} />
            ) : (
              <span className="flex align-items-center gap-2 text-sm min-w-0">
                <span className="text-500">Далі:</span>
                <ClubLabel
                  name={winner.name}
                  clubId={winner.id}
                  owner={winner.owner}
                  bold
                />
              </span>
            ))}
          {editable && !isEmpty && !editing && (
            <Button
              icon={<FluentIcon name="Edit" size={18} />}
              rounded
              text
              severity="secondary"
              aria-label="Змінити клуби пари"
              tooltip="Змінити клуби"
              tooltipOptions={{ position: "top" }}
              onClick={() => setEditing(true)}
            />
          )}
        </div>
      </div>

      {showPickers && (
        <div className="flex flex-column gap-2">
          <div className="flex flex-column md:flex-row md:align-items-center gap-2">
            {picker("home")}
            <Button
              icon={<FluentIcon name="ArrowSwap" size={18} />}
              rounded
              text
              severity="secondary"
              disabled={!home && !away}
              aria-label="Поміняти клуби місцями"
              tooltip="Поміняти місцями"
              tooltipOptions={{ position: "top" }}
              className="align-self-center"
              onClick={() => {
                setHome(away);
                setAway(home);
              }}
            />
            {picker("away")}
          </div>
          {strict && (
            <div className="text-500 text-xs">
              {league
                ? "Суперник: клуб іншого гравця."
                : "Суперник: клуб іншого гравця з іншої групи."}
            </div>
          )}
          {isEmpty ? (
            <div className="text-500 text-xs">
              {legs > 1
                ? "Два матчі зʼявляться, щойно обрано обидва клуби: перший удома в першого клубу, другий удома в другого."
                : "Матч зʼявиться, щойно обрано обидва клуби."}
            </div>
          ) : (
            <div className="flex flex-wrap justify-content-between gap-2">
              <Button
                label="Видалити пару"
                icon={<FluentIcon name="Delete" />}
                text
                severity="danger"
                size="small"
                onClick={removeTie}
              />
              <div className="flex gap-2">
                <Button
                  label="Скасувати"
                  text
                  severity="secondary"
                  size="small"
                  onClick={cancelEdit}
                />
                <Button
                  label="Зберегти"
                  size="small"
                  disabled={
                    !home ||
                    !away ||
                    home === away ||
                    (home === tie.home && away === tie.away)
                  }
                  onClick={saveTeams}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {isEmpty && !editable && (
        <div className="text-500 text-sm">Пару не визначено</div>
      )}

      {tie.games.map((game) => (
        <MatchRow
          // Remount on remote changes so the draft starts from the stored score.
          key={`${game.id}:${game.home}:${game.away}:${formatScore(game.result)}`}
          match={game}
          clubsById={clubsById}
          editable={editable && !editing}
          meta={gameLabel(game) ?? undefined}
          onSave={(result) => saveResult(game, result)}
        />
      ))}

      {legs > 1 && anyPlayed && tie.home && tie.away && (
        <div className="flex align-items-center justify-content-between gap-2 text-sm">
          <span className="text-500">За сумою матчів</span>
          <span className="flex align-items-center gap-2 min-w-0">
            <ClubLabel
              name={nameOf(tie.home)}
              clubId={tie.home}
              owner={clubsById.get(tie.home)?.owner}
            />
            <span className="font-bold white-space-nowrap">
              {formatScore(tie.aggregate)}
            </span>
            <ClubLabel
              name={nameOf(tie.away)}
              clubId={tie.away}
              owner={clubsById.get(tie.away)?.owner}
              badgePosition="end"
            />
          </span>
        </div>
      )}

      {replay && !editing && (
        <>
          <div className="flex align-items-center gap-2 text-xs text-500">
            <FluentIcon name="ArrowRepeatAll" size={16} />
            {legs > 1
              ? "Сума рівна, потрібне перегравання"
              : "Нічия, потрібне перегравання"}
          </div>
          <MatchRow
            key={replay.id}
            match={replay}
            clubsById={clubsById}
            editable
            meta={gameLabel(replay) ?? undefined}
            onSave={(result) => saveResult(replay, result)}
          />
        </>
      )}
    </div>
  );
};

export default PlayoffTieCard;
