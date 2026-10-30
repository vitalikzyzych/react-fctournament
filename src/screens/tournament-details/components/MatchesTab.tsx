import { useState } from "react";

import { SelectButton } from "primereact/selectbutton";

import {
  groupMatches,
  type IClub,
  type IMatch,
  type ITournament,
  sortMatches,
} from "@/domain";
import { useSaveResult } from "@/hooks";
import { FluentIcon, MatchRow } from "@/ui";
import { formatScore } from "@/utils";

interface IMatchesTabProps {
  tournament: ITournament;
  matches: IMatch[];
}

const MatchesTab = ({ tournament, matches }: IMatchesTabProps) => {
  const saveResult = useSaveResult(tournament, matches);
  const sorted = groupMatches(sortMatches(matches));
  const matchdays = [...new Set(sorted.map((m) => m.matchday))];
  const firstOpen =
    sorted.find((m) => m.result === null)?.matchday ?? matchdays[0] ?? 1;
  const [matchday, setMatchday] = useState<number>(firstOpen);

  // Results are entered only while the tournament is in progress.
  const editable = tournament.status === "active";
  const clubsById = new Map<string, IClub>(
    tournament.clubs.map((club) => [club.id, club])
  );
  const dayMatches = sorted.filter((m) => m.matchday === matchday);
  const played = dayMatches.filter((m) => m.result !== null).length;

  return (
    <div className="flex flex-column gap-3">
      {tournament.status === "planned" && (
        <div className="notice align-items-center">
          <FluentIcon name="Info" size={18} />
          <span>
            Турнір ще не почався. Розклад можна переглянути, а результати
            вносяться після старту.
          </span>
        </div>
      )}
      {tournament.status === "completed" && (
        <div className="notice align-items-center">
          <FluentIcon name="LockClosed" size={18} />
          <span>
            Турнір завершено, результати захищені від змін. Щоб виправити,
            розблокуйте турнір.
          </span>
        </div>
      )}

      <div className="flex flex-wrap align-items-center justify-content-between gap-2">
        <SelectButton
          value={matchday}
          onChange={(e) => e.value !== null && setMatchday(e.value)}
          options={matchdays.map((day) => ({
            label: `Тур ${day}`,
            value: day,
          }))}
          allowEmpty={false}
        />
        <span className="text-600 text-sm">
          зіграно {played} з {dayMatches.length}
        </span>
      </div>

      {tournament.groups.map((group) => {
        const groupMatches = dayMatches.filter((m) => m.group === group.id);
        if (!groupMatches.length) return null;
        return (
          <div key={group.id}>
            <div className="section-title mb-2">{group.name}</div>
            <div className="flex flex-column gap-2">
              {groupMatches.map((match) => (
                <MatchRow
                  // Remount on remote changes so the draft starts from the stored score.
                  key={`${match.id}:${formatScore(match.result)}`}
                  match={match}
                  clubsById={clubsById}
                  editable={editable}
                  onSave={(result) => saveResult(match, result)}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default MatchesTab;
