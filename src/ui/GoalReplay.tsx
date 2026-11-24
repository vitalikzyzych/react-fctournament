import { type CSSProperties, useEffect, useMemo, useState } from "react";

import { seededRandom } from "@/domain";
import { useSettings } from "@/providers";

/** Dots drawn per side at most, so a long league stays readable. */
export const MAX_GOAL_DOTS = 300;

/** Time between two shots of the player with more goals. */
const BEAT_MS = 1_000;
/** Pause before the first beat, so the page settles first. A shot lasts
 * 1.6 s (.goal-shot in main.css), longer than a beat. */
const FIRST_BEAT_MS = 1_200;

const frac = (n: number) => n - Math.floor(n);

/**
 * Stable positions near one goal, as CSS variables in penalty-area units:
 * `--dx` from the goal line (1 is the edge of the box), `--dy` from the
 * middle (0.5 is the side of the box). Most dots land inside the box, the
 * rest just around it. The R2 sequence keeps them evenly spread and in place
 * when another goal is added.
 */
export const goalDots = (count: number) =>
  Array.from({ length: Math.min(count, MAX_GOAL_DOTS) }, (_, i) => {
    const u = frac(0.5 + (i + 1) * 0.7548777);
    const v = frac(0.5 + (i + 1) * 0.5698403);
    const dx = 0.06 + u ** 1.4 * 1.3;
    const dy = (v - 0.5) * (1.25 - dx * 0.35);
    return {
      "--dx": dx.toFixed(3),
      "--dy": dy.toFixed(3),
    } as CSSProperties;
  });

/** "s" shots go into V's net on the right, "v" shots into S's on the left. */
type Side = "s" | "v";

/**
 * A player's shots: the goal dots in a shuffled order. Each ball starts on
 * its dot and flies into the net. A fixed seed keeps the order steady
 * between renders.
 */
const shotStyles = (side: Side, goals: number): CSSProperties[] => {
  const random = seededRandom(goals * 7919 + (side === "s" ? 1 : 2));
  const styles = goalDots(goals);
  for (let i = styles.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [styles[i], styles[j]] = [styles[j], styles[i]];
  }
  return styles;
};

const prefersStill = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

interface IGoalReplayProps {
  /** Goals scored by S's clubs and by V's clubs. */
  goals: { S: number; V: number };
}

/** Shots per side kept on screen: a shot (1.6 s) outlasts one interval. */
const LIVE_SHOTS = 2;

/**
 * Shots on the hero pitch: a ball leaves one of the goal dots and flies into
 * the conceding player's net with a flash. Both players start together; the
 * one with more goals shoots every BEAT_MS, the other at a longer interval in
 * proportion (13 against 10 goals: every 1 s against every 1.3 s), so the
 * fewer the goals, the bigger the gap. Nothing moves when the system asks for
 * reduced motion or the animation is switched off in the settings.
 */
const GoalReplay = ({ goals }: IGoalReplayProps) => {
  const { goalAnimation } = useSettings().settings;
  const shots = useMemo(
    () => ({ s: shotStyles("s", goals.S), v: shotStyles("v", goals.V) }),
    [goals.S, goals.V]
  );
  // Shots fired so far by each side.
  const [fired, setFired] = useState({ s: 0, v: 0 });

  useEffect(() => {
    if ((!goals.S && !goals.V) || !goalAnimation || prefersStill()) return;
    const most = Math.max(goals.S, goals.V);
    const timers: number[] = [];
    (
      [
        ["s", goals.S],
        ["v", goals.V],
      ] as const
    ).forEach(([side, own]) => {
      if (!own) return;
      const shoot = () => setFired((f) => ({ ...f, [side]: f[side] + 1 }));
      timers.push(
        window.setTimeout(() => {
          shoot();
          timers.push(window.setInterval(shoot, (BEAT_MS * most) / own));
        }, FIRST_BEAT_MS)
      );
    });
    return () =>
      timers.forEach((id) => {
        window.clearTimeout(id);
        window.clearInterval(id);
      });
  }, [goals.S, goals.V, goalAnimation]);

  if (!goalAnimation) return null;
  return (
    <>
      {(["s", "v"] as const).flatMap((side) => {
        const list = shots[side];
        const count = fired[side];
        if (!list.length) return [];
        return Array.from(
          { length: Math.min(count, LIVE_SHOTS) },
          (_, k) => count - Math.min(count, LIVE_SHOTS) + k
        ).map((n) => (
          // A new key per shot restarts the animation.
          <span key={`${side}:${n}`} aria-hidden>
            <span
              className={`goal-shot goal-shot--${side}`}
              style={list[n % list.length]}
            />
            <span className={`goal-flash goal-flash--${side}`} />
          </span>
        ));
      })}
    </>
  );
};

export default GoalReplay;
