import type { CardMood, ICardMood, PlayerId } from "@/domain";
import { plural } from "@/utils";

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

interface IPlayerMoodBadgeProps {
  player: PlayerId;
  mood: ICardMood;
  /** The other player's card points, for the tooltip. */
  otherPoints: number;
}

/**
 * The player's red or blue badge drawn as a face instead of the letter: the
 * further ahead in card points (yellow 1, red 3), the angrier the face.
 */
const PlayerMoodBadge = ({
  player,
  mood: { mood, points },
  otherPoints,
}: IPlayerMoodBadgeProps) => {
  const face = FACES[mood];
  const label = `${player}: ${MOOD_LABELS[mood]}. Картки: ${pointsText(points)} проти ${otherPoints} (жовта 1, червона 3)`;
  return (
    <span
      className={`player-badge player-badge--${player} player-badge--xl mood-badge mood-badge--${mood}`}
      role="img"
      title={label}
      aria-label={label}
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

export default PlayerMoodBadge;
