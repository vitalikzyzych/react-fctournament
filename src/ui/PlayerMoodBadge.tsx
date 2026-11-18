import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

import { classNames } from "primereact/utils";

import {
  CARD_MOODS,
  type CardMood,
  type ICardMood,
  MOOD_STEPS,
  type PlayerId,
} from "@/domain";
import { formatAverage, plural } from "@/utils";

export const MOOD_LABELS: Record<CardMood, string> = {
  angel: "янгол",
  happy: "у чудовому настрої",
  polite: "ввічливий",
  neutral: "спокійний",
  displeased: "невдоволений",
  annoyed: "роздратований",
  angry: "сердитий",
  furious: "у люті",
};

interface IFace {
  /** "dot" eyes, or "smile" for closed happy arcs. */
  eyes: "dot" | "smile";
  mouth: string;
  /** A filled mouth: open laugh or gritted teeth. */
  open?: boolean;
  brows?: string;
  halo?: boolean;
  teeth?: boolean;
}

/** Eyes, brows and mouth of each mood, in a 64 by 64 box. */
const FACES: Record<CardMood, IFace> = {
  angel: { eyes: "smile", mouth: "M19 38 Q32 52 45 38", halo: true },
  happy: { eyes: "smile", mouth: "M18 37 Q32 56 46 37 Z", open: true },
  polite: { eyes: "dot", mouth: "M20 39 Q32 49 44 39" },
  neutral: { eyes: "dot", mouth: "M22 43 Q32 45 42 43" },
  displeased: { eyes: "dot", mouth: "M22 45 Q32 40 42 45" },
  annoyed: {
    eyes: "dot",
    mouth: "M21 47 Q32 39 43 47",
    brows: "M16 20 L27 22 M48 20 L37 22",
  },
  angry: {
    eyes: "dot",
    mouth: "M20 48 Q32 36 44 48",
    brows: "M14 16 L28 23 M50 16 L36 23",
  },
  furious: {
    eyes: "dot",
    mouth: "M19 40 H45 V49 H19 Z",
    open: true,
    teeth: true,
    brows: "M12 13 L29 23 M52 13 L35 23",
  },
};

const pointsText = (n: number) => `${n} ${plural(n, ["очко", "очки", "очок"])}`;

/** Lower bound of a mood in card points per match; the angel starts at 0. */
const moodFrom = (mood: CardMood) =>
  MOOD_STEPS.find(([, step]) => step === mood)?.[0] ?? 0;

/** Where the furious segment of the scale ends, for the marker only. */
const SCALE_END = 2;

/** Marker position on the scale, 0 to 1: equal room for every mood. */
const scalePosition = (mood: CardMood, rate: number) => {
  const index = CARD_MOODS.indexOf(mood);
  const from = moodFrom(mood);
  const next = CARD_MOODS[index + 1];
  const to = next ? moodFrom(next) : SCALE_END;
  const within = Math.min(Math.max((rate - from) / (to - from), 0), 1);
  return (index + within) / CARD_MOODS.length;
};

/** The face of a mood, drawn over the player's red or blue circle. */
const MoodFace = ({
  player,
  mood,
  size,
  className,
}: {
  player: PlayerId;
  mood: CardMood;
  size: "md" | "xl";
  className?: string;
}) => {
  const face = FACES[mood];
  return (
    <span
      className={classNames(
        "player-badge",
        `player-badge--${player}`,
        `player-badge--${size}`,
        "mood-badge",
        `mood-badge--${mood}`,
        className
      )}
    >
      <svg viewBox="0 0 64 64" aria-hidden>
        {face.halo && (
          <ellipse
            cx="32"
            cy="9"
            rx="13"
            ry="3.5"
            className="mood-badge__halo"
          />
        )}
        {face.brows && <path d={face.brows} />}
        {face.eyes === "dot" ? (
          <>
            <circle cx="22" cy="29" r="3.5" className="mood-badge__fill" />
            <circle cx="42" cy="29" r="3.5" className="mood-badge__fill" />
          </>
        ) : (
          <path d="M17 30 Q22 24 27 30 M37 30 Q42 24 47 30" />
        )}
        <path d={face.mouth} className={face.open ? "mood-badge__fill" : ""} />
        {face.teeth && (
          <path
            d="M19 44.5 H45 M25.5 40 V49 M32 40 V49 M38.5 40 V49"
            className="mood-badge__teeth"
          />
        )}
      </svg>
    </span>
  );
};

interface IPlayerMoodBadgeProps {
  player: PlayerId;
  mood: ICardMood;
  /** Played matches, for the explanation. */
  played: number;
}

/**
 * The player's red or blue badge drawn as a face instead of the letter: the
 * more card points per match (yellow 1, red 3), the angrier the face.
 * Hovering (or tapping, on a phone) opens a card with the numbers and the
 * whole scale of faces, the player's place marked on it.
 */
const PlayerMoodBadge = ({ player, mood, played }: IPlayerMoodBadgeProps) => {
  const [tip, setTip] = useState<{ x: number; y: number } | null>(null);
  const label = `${player}: ${MOOD_LABELS[mood.mood]}. Картки: ${pointsText(mood.points)} за ${played} ${plural(played, ["матч", "матчі", "матчів"])}, ${formatAverage(mood.rate)} за матч`;

  // The card is fixed to the screen: it closes on scroll and, on a phone,
  // when something else is tapped.
  useEffect(() => {
    if (!tip) return;
    const close = () => setTip(null);
    const closeOutside = (e: Event) => {
      if (!(e.target instanceof Element && e.target.closest(".mood-badge"))) {
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

  const open = (target: HTMLElement) => {
    const box = target.getBoundingClientRect();
    const half = Math.min(window.innerWidth / 2 - 8, 184);
    setTip({
      x: Math.min(
        Math.max(box.left + box.width / 2, half + 8),
        window.innerWidth - half - 8
      ),
      y: box.bottom + 10,
    });
  };

  const position = scalePosition(mood.mood, mood.rate);
  const shown = CARD_MOODS.indexOf(mood.mood);

  return (
    <>
      <span
        role="img"
        aria-label={label}
        className="mood-badge__hit"
        onPointerEnter={(e) => {
          if (e.pointerType === "mouse") open(e.currentTarget);
        }}
        onPointerLeave={(e) => {
          if (e.pointerType === "mouse") setTip(null);
        }}
        onClick={(e) => open(e.currentTarget)}
      >
        <MoodFace player={player} mood={mood.mood} size="xl" />
      </span>
      {tip &&
        createPortal(
          <div
            className="mood-tip"
            role="tooltip"
            style={{ left: tip.x, top: tip.y }}
          >
            <div className="font-semibold">
              {player}: {MOOD_LABELS[mood.mood]}
            </div>
            <div className="text-sm text-600 mt-1">
              {played
                ? `${pointsText(mood.points)} за ${played} ${plural(played, ["матч", "матчі", "матчів"])}: ${formatAverage(mood.rate)} за матч`
                : "Ще немає зіграних матчів"}
            </div>
            <div className="mood-tip__faces">
              {CARD_MOODS.map((item, index) => (
                <MoodFace
                  key={item}
                  player={player}
                  mood={item}
                  size="md"
                  className={classNames("mood-badge--mini", {
                    "mood-badge--current": index === shown,
                  })}
                />
              ))}
            </div>
            <div className="mood-tip__bar">
              <span
                className="mood-tip__marker"
                style={{ left: `${position * 100}%` }}
              />
            </div>
            <div className="mood-tip__ticks">
              {CARD_MOODS.map((item) => (
                <span key={item}>
                  {moodFrom(item) ? formatAverage(moodFrom(item)) : "0"}
                </span>
              ))}
            </div>
            <div className="text-xs text-500 mt-2">
              Очки за картки на матч: жовта 1, червона 3. Число під обличчям:
              звідки воно починається.
            </div>
          </div>,
          document.body
        )}
    </>
  );
};

export default PlayerMoodBadge;
