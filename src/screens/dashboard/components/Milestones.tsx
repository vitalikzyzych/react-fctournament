import type { IMilestones, ITournament } from "@/domain";

interface IMilestonesProps {
  milestones: IMilestones;
  /** Milestones reached in this tournament are listed first. */
  tournament: ITournament;
}

/** The next round numbers (goals, matches, wins) and those just reached. */
const Milestones = ({ milestones, tournament }: IMilestonesProps) => {
  const reached = milestones.reached
    .filter((m) => m.tournament.id === tournament.id)
    .slice(-3)
    .reverse();
  const upcoming = milestones.upcoming.slice(0, 3);

  return (
    <div className="flex flex-column gap-3">
      {reached.map((m) => (
        <div key={m.label} className="milestone milestone--reached">
          <span aria-hidden>🎉</span>
          <span>
            <span className="font-semibold">{m.label}</span>
            <span className="text-600">
              {" "}
              {m.match.stage === "group"
                ? `у турі ${m.match.matchday}`
                : "у плей-офф"}
            </span>
          </span>
        </div>
      ))}
      {upcoming.map((m) => (
        <div key={m.id} className="flex flex-column gap-1">
          <div className="flex justify-content-between gap-2 text-sm">
            <span className="font-semibold">{m.label}</span>
            <span className="text-600 white-space-nowrap">
              ще {m.remaining}
            </span>
          </div>
          <div className="progress-bar">
            <span style={{ width: `${(m.value / m.target) * 100}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
};

export default Milestones;
