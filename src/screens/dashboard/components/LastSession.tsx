import type { ISession } from "@/domain";
import { PlayerBadge } from "@/ui";
import { formatDay, formatDuration, plural } from "@/utils";

/** The latest playing session: when, how long, who won more matches. */
const LastSession = ({ session }: { session: ISession }) => {
  const { wins, draws, goals, matches } = session;
  const verdict =
    wins.S === wins.V
      ? "Вечір завершився внічию"
      : `Вечір за ${wins.S > wins.V ? "S" : "V"}`;
  return (
    <div className="flex flex-column gap-3">
      <div className="flex align-items-center gap-3 flex-wrap">
        <PlayerBadge player="S" size="md" />
        <span className="recap__score">
          {wins.S}:{wins.V}
        </span>
        <PlayerBadge player="V" size="md" />
        <span className="font-semibold">{verdict}</span>
      </div>
      <div className="text-sm text-600">
        {formatDay(session.start)}: {matches.length}{" "}
        {plural(matches.length, ["матч", "матчі", "матчів"])}
        {matches.length > 1 &&
          ` за ${formatDuration(session.end - session.start)}`}
        , нічиїх {draws}, голів {goals.S}:{goals.V}.
      </div>
    </div>
  );
};

export default LastSession;
