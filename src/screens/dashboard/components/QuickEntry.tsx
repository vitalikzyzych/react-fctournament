import {
  describeMatch,
  type IClub,
  type IMatch,
  type IStoredMatch,
  type ITournament,
  latestResult,
  upcomingMatches,
} from "@/domain";
import { useSaveResult } from "@/hooks";
import { EmptyState, MatchRow, SectionCard } from "@/ui";
import { formatScore } from "@/utils";

interface IQuickEntryProps {
  tournament: ITournament;
  matches: IStoredMatch[];
}

interface IEntry {
  label: string;
  match: IMatch;
}

/**
 * Score entry on the dashboard for the active tournament: the result entered
 * last (to fix a typo) and the next match to play. Before the first result it
 * shows the next two. Saving the next match makes it the latest one, and the
 * match after it moves up.
 */
const QuickEntry = ({ tournament, matches }: IQuickEntryProps) => {
  const saveResult = useSaveResult(tournament, matches);
  const clubsById = new Map<string, IClub>(
    tournament.clubs.map((club) => [club.id, club])
  );
  const latest = latestResult(matches);
  const upcoming = upcomingMatches(matches);

  const entries: IEntry[] = latest
    ? [
        { label: "Останній матч", match: latest },
        ...upcoming
          .slice(0, 1)
          .map((match) => ({ label: "Наступний матч", match })),
      ]
    : upcoming.slice(0, 2).map((match, index) => ({
        label: index === 0 ? "Наступний матч" : "Після нього",
        match,
      }));

  return (
    <SectionCard title="Матчі зараз">
      <div className="flex flex-column gap-3">
        {entries.map(({ label, match }) => (
          <div key={label} className="flex flex-column gap-2">
            <span className="text-500 text-xs font-semibold">{label}</span>
            <MatchRow
              // Remount on any stored change so the draft starts from it.
              key={`${match.id}:${match.home}:${match.away}:${formatScore(match.result)}`}
              match={match}
              clubsById={clubsById}
              editable
              meta={describeMatch(match)}
              onSave={(result) => saveResult(match, result)}
            />
          </div>
        ))}
        {latest && !upcoming.length && (
          <EmptyState
            icon="CheckmarkCircle"
            title="Усі заплановані матчі зіграно"
          >
            <p className="m-0 text-sm">
              Нові матчі плей-офф зʼявляться, щойно на сторінці турніру оберуть
              клуби для пар.
            </p>
          </EmptyState>
        )}
      </div>
    </SectionCard>
  );
};

export default QuickEntry;
