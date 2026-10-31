import { type KeyboardEvent, type ReactNode, useState } from "react";

import { Button } from "primereact/button";
import { InputText } from "primereact/inputtext";
import { classNames } from "primereact/utils";

import ClubLabel from "./ClubLabel";
import FluentIcon from "./FluentIcon";

import { type IClub, type IMatch, type IScore, MAX_GOALS } from "@/domain";

interface IMatchRowProps {
  match: IMatch;
  clubsById: Map<string, IClub>;
  /** False for completed tournaments: the score is shown read-only. */
  editable: boolean;
  onSave?: (result: IScore | null) => void;
  /** Small "Група A · Тур 2" line above the clubs, for mixed lists. */
  meta?: string;
  /** Full-width line under the clubs (cards, missing players). */
  footer?: ReactNode;
}

const toDraft = (result: IScore | null) => ({
  home: result ? String(result.home) : "",
  away: result ? String(result.away) : "",
});

const parseGoals = (value: string): number | null => {
  if (!/^\d{1,2}$/.test(value)) return null;
  const goals = Number(value);
  return goals <= MAX_GOALS ? goals : null;
};

/**
 * One fixture with score entry. Two lines on phones (club and score per line),
 * one line on wider screens. The parent remounts the row (via `key`) when the
 * stored result changes, so the draft always starts from the latest value.
 */
const MatchRow = ({
  match,
  clubsById,
  editable,
  onSave,
  meta,
  footer,
}: IMatchRowProps) => {
  const [draft, setDraft] = useState(() => toDraft(match.result));
  const home = clubsById.get(match.home);
  const away = clubsById.get(match.away);

  const homeGoals = parseGoals(draft.home);
  const awayGoals = parseGoals(draft.away);
  const isValid = homeGoals !== null && awayGoals !== null;
  const isDirty =
    draft.home !== toDraft(match.result).home ||
    draft.away !== toDraft(match.result).away;
  const canSave = editable && isValid && isDirty;

  const save = () => {
    if (canSave) onSave?.({ home: homeGoals, away: awayGoals });
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") save();
    if (event.key === "Escape") setDraft(toDraft(match.result));
  };

  const scoreInput = (side: "home" | "away") => (
    <InputText
      value={draft[side]}
      onChange={(e) =>
        setDraft({
          ...draft,
          [side]: e.target.value.replace(/\D/g, "").slice(0, 2),
        })
      }
      onKeyDown={onKeyDown}
      onFocus={(e) => e.target.select()}
      inputMode="numeric"
      maxLength={2}
      aria-label={side === "home" ? "Голи господарів" : "Голи гостей"}
      className={classNames("score-input", `match-row__${side}-score`, {
        "p-invalid": draft[side] !== "" && parseGoals(draft[side]) === null,
      })}
    />
  );

  const scoreText = (side: "home" | "away") => {
    const other = side === "home" ? "away" : "home";
    return (
      <span
        className={classNames("score-text", `match-row__${side}-score`, {
          "score-text--played": match.result !== null,
          "score-text--win":
            match.result !== null && match.result[side] > match.result[other],
        })}
      >
        {match.result ? match.result[side] : "–"}
      </span>
    );
  };

  return (
    <div
      className={classNames("match-row", {
        "match-row--dirty": isDirty,
        "match-row--readonly": !editable,
      })}
    >
      {meta && <div className="match-row__meta">{meta}</div>}
      <ClubLabel
        name={home?.name ?? match.home}
        clubId={match.home}
        owner={home?.owner}
        pot={home?.pot}
        className="match-row__home"
        bold={!!match.result && match.result.home > match.result.away}
      />
      {editable ? scoreInput("home") : scoreText("home")}
      <span className="match-row__sep text-500">:</span>
      {editable ? scoreInput("away") : scoreText("away")}
      <ClubLabel
        name={away?.name ?? match.away}
        clubId={match.away}
        owner={away?.owner}
        pot={away?.pot}
        className="match-row__away"
        bold={!!match.result && match.result.away > match.result.home}
      />
      {editable && (
        <div className="match-row__actions flex gap-1">
          <Button
            icon={<FluentIcon name="Checkmark" size={18} />}
            rounded
            text={!canSave}
            disabled={!canSave}
            onClick={save}
            aria-label="Зберегти результат"
            tooltip="Зберегти"
            tooltipOptions={{ position: "top", showOnDisabled: false }}
          />
          <Button
            icon={<FluentIcon name="Dismiss" size={18} />}
            rounded
            text
            severity="secondary"
            disabled={match.result === null && !isDirty}
            onClick={() => {
              if (isDirty && match.result !== null) {
                setDraft(toDraft(match.result));
              } else if (match.result !== null) {
                onSave?.(null);
              } else {
                setDraft(toDraft(null));
              }
            }}
            aria-label={
              isDirty && match.result !== null
                ? "Скасувати зміни"
                : "Очистити результат"
            }
            tooltip={
              isDirty && match.result !== null ? "Скасувати зміни" : "Очистити"
            }
            tooltipOptions={{ position: "top" }}
          />
        </div>
      )}
      {footer && <div className="match-row__footer">{footer}</div>}
    </div>
  );
};

export default MatchRow;
