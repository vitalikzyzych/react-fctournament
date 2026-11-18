import { type MouseEvent, type PointerEvent, useEffect, useState } from "react";
import { createPortal } from "react-dom";

import ClubLabel from "./ClubLabel";

import {
  type IClub,
  type IFormEntry,
  type IGroupMatch,
  type IMatch,
  type MatchOutcome,
  OUTCOME_LABELS,
} from "@/domain";
import { formatScore } from "@/utils";

interface IFormChipsProps {
  clubId: string;
  /** Results, oldest first (computeForm). Shown newest first. */
  form: IFormEntry[];
  /** Next unplayed match, shown as "?" before the results. */
  next?: IGroupMatch;
  clubsById: Map<string, IClub>;
}

const FORM_LETTERS = { win: "В", draw: "Н", loss: "П" };

interface IOpenTip {
  match: IMatch;
  outcome: MatchOutcome | null;
  /** Centre and top of the chip, in viewport pixels. */
  x: number;
  y: number;
}

/** Half the card's width plus a margin, to keep it inside the screen. */
const EDGE = 180;

/**
 * Form chips of one club: "?" for the next match, then В/Н/П newest first.
 * Hovering (or tapping, on a phone) a chip shows a small card of the match.
 */
const FormChips = ({ clubId, form, next, clubsById }: IFormChipsProps) => {
  const [tip, setTip] = useState<IOpenTip | null>(null);

  // The card is fixed to the screen, so it closes when the page scrolls,
  // and on a phone when something else is tapped.
  useEffect(() => {
    if (!tip) return;
    const close = () => setTip(null);
    const closeOutside = (e: Event) => {
      if (!(e.target instanceof Element && e.target.closest(".form-chip"))) {
        close();
      }
    };
    window.addEventListener("scroll", close, true);
    document.addEventListener("pointerdown", closeOutside);
    return () => {
      window.removeEventListener("scroll", close, true);
      document.removeEventListener("pointerdown", closeOutside);
    };
  }, [tip]);

  const open = (
    target: HTMLElement,
    match: IMatch,
    outcome: MatchOutcome | null
  ) => {
    const box = target.getBoundingClientRect();
    const x = Math.min(
      Math.max(box.left + box.width / 2, EDGE),
      window.innerWidth - EDGE
    );
    setTip({ match, outcome, x, y: box.top });
  };

  const chipProps = (match: IMatch, outcome: MatchOutcome | null) => ({
    // Hover with a mouse only; a touch screen opens the card on a tap.
    onPointerEnter: (e: PointerEvent<HTMLElement>) => {
      if (e.pointerType === "mouse") open(e.currentTarget, match, outcome);
    },
    onPointerLeave: (e: PointerEvent<HTMLElement>) => {
      if (e.pointerType === "mouse") setTip(null);
    },
    // Also keeps the row click (club dialog) away.
    onClick: (e: MouseEvent<HTMLElement>) => {
      e.stopPropagation();
      open(e.currentTarget, match, outcome);
    },
  });

  const club = (id: string) => {
    const found = clubsById.get(id);
    return (
      <ClubLabel
        name={found?.name ?? id}
        clubId={id}
        owner={found?.owner}
        className="form-tip__club"
      />
    );
  };

  return (
    <span className="form-chips">
      {next && (
        <span className="form-chip form-chip--next" {...chipProps(next, null)}>
          ?
        </span>
      )}
      {[...form].reverse().map(({ match, outcome }) => (
        <span
          key={match.id}
          className={`form-chip form-chip--${outcome}`}
          {...chipProps(match, outcome)}
        >
          {FORM_LETTERS[outcome]}
        </span>
      ))}
      {tip &&
        createPortal(
          <div
            className="form-tip"
            role="tooltip"
            style={{ left: tip.x, top: tip.y }}
          >
            <div className="form-tip__title">
              {tip.match.stage === "group" && `Тур ${tip.match.matchday}`}
              {tip.outcome
                ? `, ${OUTCOME_LABELS[tip.outcome]}`
                : ", наступний матч"}
              {tip.match.away === clubId && " (у гостях)"}
            </div>
            <div className="form-tip__match">
              {club(tip.match.home)}
              <span className="form-tip__score">
                {tip.match.result ? formatScore(tip.match.result) : "–"}
              </span>
              {club(tip.match.away)}
            </div>
          </div>,
          document.body
        )}
    </span>
  );
};

export default FormChips;
