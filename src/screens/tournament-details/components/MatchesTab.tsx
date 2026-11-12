import { useMemo, useState } from "react";

import { Checkbox } from "primereact/checkbox";
import { Dropdown } from "primereact/dropdown";
import { SelectButton } from "primereact/selectbutton";

import {
  computeDiscipline,
  groupMatches,
  type IClub,
  type IMatch,
  type ITournament,
  sortMatches,
} from "@/domain";
import { useMatchCards, useSaveResult } from "@/hooks";
import { ClubLabel, EmptyState, FluentIcon, MatchCards, MatchRow } from "@/ui";
import { formatScore } from "@/utils";

interface IMatchesTabProps {
  tournament: ITournament;
  matches: IMatch[];
}

/** Matchday filter value for every matchday at once. */
const ALL_DAYS = 0;

const MatchesTab = ({ tournament, matches }: IMatchesTabProps) => {
  const saveResult = useSaveResult(tournament, matches);
  const { addCards, removeCard } = useMatchCards(tournament);
  const discipline = useMemo(() => computeDiscipline(matches), [matches]);
  const sorted = groupMatches(sortMatches(matches));
  const matchdays = [...new Set(sorted.map((m) => m.matchday))];
  const firstOpen =
    sorted.find((m) => m.result === null)?.matchday ?? matchdays[0] ?? 1;
  const [matchday, setMatchday] = useState<number>(firstOpen);
  const [clubId, setClubId] = useState<string | null>(null);
  const [openOnly, setOpenOnly] = useState(false);

  // Results are entered only while the tournament is in progress.
  const editable = tournament.status === "active";
  const clubsById = new Map<string, IClub>(
    tournament.clubs.map((club) => [club.id, club])
  );
  const clubOptions = [...tournament.clubs].sort((a, b) =>
    a.name.localeCompare(b.name)
  );
  const shownMatches = sorted.filter(
    (m) =>
      (matchday === ALL_DAYS || m.matchday === matchday) &&
      (!clubId || m.home === clubId || m.away === clubId) &&
      (!openOnly || m.result === null)
  );
  const counted = sorted.filter(
    (m) =>
      (matchday === ALL_DAYS || m.matchday === matchday) &&
      (!clubId || m.home === clubId || m.away === clubId)
  );
  const played = counted.filter((m) => m.result !== null).length;

  const pickClub = (id: string | null) => {
    setClubId(id);
    // A club's matches are easiest to follow over the whole schedule.
    if (id) setMatchday(ALL_DAYS);
  };

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
          options={[
            ...matchdays.map((day) => ({ label: `Тур ${day}`, value: day })),
            { label: "Усі", value: ALL_DAYS },
          ]}
          allowEmpty={false}
        />
        <span className="text-600 text-sm">
          зіграно {played} з {counted.length}
        </span>
      </div>

      <div className="flex flex-wrap align-items-center gap-3">
        <Dropdown
          value={clubId}
          onChange={(e) => pickClub(e.value ?? null)}
          options={clubOptions}
          optionValue="id"
          optionLabel="name"
          itemTemplate={(club: IClub) => (
            <ClubLabel name={club.name} clubId={club.id} owner={club.owner} />
          )}
          valueTemplate={(club: IClub | null) =>
            club ? (
              <ClubLabel name={club.name} clubId={club.id} owner={club.owner} />
            ) : (
              <span className="text-500">Усі клуби</span>
            )
          }
          filter
          showClear
          placeholder="Усі клуби"
          aria-label="Клуб"
          className="w-full md:w-20rem"
        />
        <label className="inline-flex align-items-center gap-2 cursor-pointer text-sm">
          <Checkbox
            checked={openOnly}
            onChange={(e) => setOpenOnly(e.checked ?? false)}
          />
          Лише незіграні
        </label>
      </div>

      {shownMatches.length === 0 && (
        <EmptyState
          icon="CheckmarkCircle"
          title={
            openOnly && counted.length
              ? "Усі ці матчі зіграно"
              : "Немає матчів за цим фільтром"
          }
        />
      )}

      {tournament.groups.map((group) => {
        const groupMatches = shownMatches.filter((m) => m.group === group.id);
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
                  meta={
                    matchday === ALL_DAYS ? `Тур ${match.matchday}` : undefined
                  }
                  onSave={(result) => saveResult(match, result)}
                  footer={
                    <MatchCards
                      match={match}
                      clubsById={clubsById}
                      discipline={discipline}
                      editable={editable}
                      onAdd={(cards) => addCards(match, cards)}
                      onRemove={(card) => removeCard(match, card)}
                    />
                  }
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
