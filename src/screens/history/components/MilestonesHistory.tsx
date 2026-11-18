import { computeMilestones, type ITournamentWithMatches } from "@/domain";

/** The latest round numbers reached and the next ones, over all tournaments. */
const MilestonesHistory = ({ all }: { all: ITournamentWithMatches[] }) => {
  const { reached, upcoming } = computeMilestones(all);
  const latest = reached.slice(-6).reverse();
  return (
    <div className="flex flex-column gap-3">
      {upcoming.slice(0, 3).map((m) => (
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
      {latest.length > 0 && (
        <div className="flex flex-column gap-2 mt-2">
          <span className="text-xs text-500 uppercase font-semibold">
            Уже досягнуто
          </span>
          {latest.map((m) => (
            <div key={m.label} className="milestone milestone--reached text-sm">
              <span aria-hidden>🎉</span>
              <span>
                <span className="font-semibold">{m.label}</span>
                <span className="text-600">
                  {" "}
                  у турнірі №{m.tournament.number}
                  {m.match.stage === "group"
                    ? `, тур ${m.match.matchday}`
                    : ", плей-офф"}
                </span>
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MilestonesHistory;
