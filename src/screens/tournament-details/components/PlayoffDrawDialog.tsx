import { useMemo, useState } from "react";

import { Button } from "primereact/button";
import { Checkbox } from "primereact/checkbox";
import { Dialog } from "primereact/dialog";

import {
  clubOrigin,
  drawCandidates,
  groupTable,
  type IClub,
  type IMatch,
  type IPlayoffRoundInfo,
  type IPlayoffTie,
  isLeagueFormat,
  type ITournament,
  pickDraw,
  type PlayerId,
  type PlayoffDraw,
  playoffQualifiers,
} from "@/domain";
import { useToast } from "@/providers";
import { applyPlayoffDraw } from "@/source/TournamentSource";
import { ClubLabel, FluentIcon, PlayerBadge } from "@/ui";
import { plural } from "@/utils";

interface IPlayoffDrawDialogProps {
  tournament: ITournament;
  matches: IMatch[];
  round: IPlayoffRoundInfo;
  /** The round's tie slots, in order. */
  ties: IPlayoffTie[];
  /**
   * Clubs of the semi-final draw (the quarter-final winners). Without it the
   * players pick the clubs from the whole tournament.
   */
  fixedClubs?: IClub[];
  onHide: () => void;
}

const PLAYERS: PlayerId[] = ["S", "V"];

/**
 * Draw for a playoff round. Quarter-finals: pick four clubs of each player,
 * then every pair is S against V from another group. Semi-finals: the four
 * winners, kept apart by player and group as far as possible. The result is
 * shown first and saved only when approved. Mount it only while open.
 */
const PlayoffDrawDialog = ({
  tournament,
  matches,
  round,
  ties,
  fixedClubs,
  onHide,
}: IPlayoffDrawDialogProps) => {
  const { show } = useToast();
  const league = isLeagueFormat(tournament.format);
  // Table position of every club, to help pick the qualified ones.
  const positions = useMemo(
    () =>
      new Map(
        tournament.groups.flatMap((g) =>
          groupTable(tournament, matches, g.id).map((row): [string, number] => [
            row.club.id,
            row.position,
          ])
        )
      ),
    [tournament, matches]
  );

  // Starts from the clubs already in the round's ties, otherwise from the
  // suggested qualifiers (first two of every group, or the 4 best S and V
  // clubs of a league).
  const [selected, setSelected] = useState<string[]>(() => {
    if (fixedClubs) return fixedClubs.map((club) => club.id);
    const picked = ties
      .flatMap((tie) => [tie.home, tie.away])
      .filter((id) => id !== null);
    return picked.length ? picked : playoffQualifiers(tournament, matches);
  });
  const [draw, setDraw] = useState<PlayoffDraw | null>(null);

  const perPlayer = round.ties;
  const clubs = fixedClubs ?? tournament.clubs;
  const selectedClubs = clubs.filter((club) => selected.includes(club.id));
  const countOf = (player: PlayerId) =>
    selectedClubs.filter((club) => club.owner === player).length;
  const selectionReady = fixedClubs
    ? true
    : PLAYERS.every((player) => countOf(player) === perPlayer);

  // At most 105 pairings of 8 clubs, cheap enough for every render.
  const { draws, conflicts } = drawCandidates(round.id, selectedClubs, league);

  const pairRule = league
    ? "У кожній парі клуб S грає з клубом V."
    : "У кожній парі клуб S грає з клубом V з іншої групи.";

  const replaces = ties.some((tie) => tie.games.length > 0);

  const toggle = (clubId: string, checked: boolean) => {
    setDraw(null);
    setSelected((current) =>
      checked ? [...current, clubId] : current.filter((id) => id !== clubId)
    );
  };

  const runDraw = () => setDraw(pickDraw(draws));

  const approve = () => {
    if (!draw) return;
    onHide();
    applyPlayoffDraw(
      tournament.id,
      ties,
      draw.map(([first, second]) => [first.id, second.id])
    )
      .then(() =>
        show("success", "Жеребкування збережено", `${round.name}: пари готові`)
      )
      .catch((error: Error) =>
        show("error", "Не вдалося зберегти жеребкування", error.message)
      );
  };

  const clubLine = (club: IClub, withPosition = true) => (
    <span className="flex align-items-center justify-content-between gap-2 w-full min-w-0">
      <ClubLabel
        name={club.name}
        clubId={club.id}
        owner={club.owner}
        country={club.country}
        showFlag
      />
      <span className="text-500 text-xs white-space-nowrap">
        {league ? clubOrigin(club) : `Гр. ${club.group}`}
        {withPosition &&
          positions.has(club.id) &&
          `, ${positions.get(club.id)} місце`}
      </span>
    </span>
  );

  const picker = (player: PlayerId) => {
    const own = clubs
      .filter((club) => club.owner === player)
      .sort(
        (a, b) =>
          (league ? 0 : a.group.localeCompare(b.group)) ||
          (positions.get(a.id) ?? 0) - (positions.get(b.id) ?? 0)
      );
    const full = countOf(player) >= perPlayer;
    return (
      <div key={player} className="col-12 md:col-6">
        <div className="flex align-items-center justify-content-between mb-2">
          <PlayerBadge player={player} />
          <span
            className={
              countOf(player) === perPlayer
                ? "text-primary text-sm font-bold"
                : "text-500 text-sm"
            }
          >
            {countOf(player)} з {perPlayer}
          </span>
        </div>
        <div className="flex flex-column gap-2">
          {own.map((club) => {
            const checked = selected.includes(club.id);
            const inputId = `draw-${club.id}`;
            return (
              <label
                key={club.id}
                htmlFor={inputId}
                className="flex align-items-center gap-2 cursor-pointer"
              >
                <Checkbox
                  inputId={inputId}
                  checked={checked}
                  disabled={!checked && full}
                  onChange={(e) => toggle(club.id, e.checked ?? false)}
                />
                {clubLine(club)}
              </label>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <Dialog
      visible
      onHide={onHide}
      showHeader={false}
      dismissableMask
      className="w-full mx-3 dialog-wide"
      contentClassName="border-round-xl p-4 relative"
    >
      <Button
        icon={<FluentIcon name="Dismiss" size={20} />}
        rounded
        text
        severity="secondary"
        onClick={onHide}
        aria-label="Закрити"
        className="absolute top-0 right-0 mt-2 mr-2"
      />
      <h2 className="m-0 mb-1 text-xl font-bold pr-5">
        Жеребкування: {round.name}
      </h2>
      <p className="m-0 mb-3 text-600 text-sm">
        {round.strictPairing
          ? `Оберіть по ${perPlayer} клуби кожного гравця. ${pairRule}`
          : league
            ? "Переможці 1/4 фіналу. Пари розводяться так, щоб клуби одного гравця не грали між собою, якщо це можливо."
            : "Переможці 1/4 фіналу. Пари розводяться так, щоб клуби одного гравця чи однієї групи не грали між собою, якщо це можливо."}
      </p>

      {fixedClubs ? (
        <div className="flex flex-column gap-2 mb-3">
          {fixedClubs.map((club) => (
            <div key={club.id}>{clubLine(club)}</div>
          ))}
        </div>
      ) : (
        <div className="grid mb-2">{PLAYERS.map(picker)}</div>
      )}

      {!selectionReady && (
        <div className="notice notice--warning align-items-center mb-3">
          <FluentIcon name="Warning" size={18} />
          <span>
            Для жеребкування потрібно рівно {perPlayer} клуби S і {perPlayer}{" "}
            клуби V. Зараз обрано S: {countOf("S")}, V: {countOf("V")}.
          </span>
        </div>
      )}

      {selectionReady && draws.length === 0 && (
        <div className="notice notice--error align-items-center mb-3">
          <FluentIcon name="ErrorCircle" size={18} />
          <span>
            З цими клубами не скласти пари за правилом. {pairRule} Змініть
            вибір.
          </span>
        </div>
      )}

      {draw && (
        <div className="flex flex-column gap-2 mb-3">
          <div className="section-title">Результат</div>
          {draw.map(([first, second], index) => (
            <div
              key={`${first.id}:${second.id}`}
              className="app-card p-2 flex flex-column md:flex-row md:align-items-center gap-2"
            >
              <span className="text-500 text-xs white-space-nowrap w-4rem">
                Пара {ties[index]?.tie ?? index + 1}
              </span>
              <div className="flex-1 min-w-0">{clubLine(first, false)}</div>
              <span className="text-500 text-sm align-self-center">проти</span>
              <div className="flex-1 min-w-0">{clubLine(second, false)}</div>
            </div>
          ))}
          <div className="text-500 text-xs">
            {round.legs > 1 ? "Перший матч удома в першого клубу пари. " : ""}
            Можливих варіантів: {draws.length}.
          </div>
          {conflicts > 0 && (
            <div className="notice notice--warning align-items-center">
              <FluentIcon name="Warning" size={18} />
              <span>
                Розвести всіх не вийде: у жеребкуванні {conflicts}{" "}
                {plural(conflicts, ["збіг", "збіги", "збігів"])}{" "}
                {league ? "гравця" : "гравця чи групи"}, менше неможливо.
              </span>
            </div>
          )}
          {replaces && (
            <div className="notice notice--warning align-items-center">
              <FluentIcon name="Warning" size={18} />
              <span>Уже обрані пари цього раунду буде замінено.</span>
            </div>
          )}
        </div>
      )}

      <div className="flex flex-wrap justify-content-end gap-2">
        <Button label="Скасувати" text severity="secondary" onClick={onHide} />
        {draw ? (
          <>
            <Button
              label="Ще раз"
              icon={<FluentIcon name="ArrowShuffle" />}
              severity="secondary"
              outlined
              onClick={runDraw}
            />
            <Button
              label="Підтвердити"
              icon={<FluentIcon name="Checkmark" />}
              onClick={approve}
            />
          </>
        ) : (
          <Button
            label="Провести жеребкування"
            icon={<FluentIcon name="ArrowShuffle" />}
            disabled={!selectionReady || draws.length === 0}
            onClick={runDraw}
          />
        )}
      </div>
    </Dialog>
  );
};

export default PlayoffDrawDialog;
