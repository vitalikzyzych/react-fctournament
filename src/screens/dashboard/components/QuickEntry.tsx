import { useMemo } from "react";

import {
  computeDiscipline,
  describeMatch,
  type IClub,
  type IMatch,
  isLeagueFormat,
  type IStoredMatch,
  type ITournament,
  latestResult,
  upcomingMatches,
} from "@/domain";
import { useMatchCards, useSaveResult } from "@/hooks";
import { EmptyState, MatchCards, MatchRow, SectionCard } from "@/ui";
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
  const { addCards, removeCard } = useMatchCards(tournament);
  const discipline = useMemo(() => computeDiscipline(matches), [matches]);
  // A pending extra game is not stored yet, so it cannot take cards.
  const isStored = (match: IMatch) => matches.some((m) => m.id === match.id);
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
              meta={describeMatch(match, isLeagueFormat(tournament.format))}
              showcase
              onSave={(result) => saveResult(match, result)}
              footer={
                <MatchCards
                  match={match}
                  clubsById={clubsById}
                  discipline={discipline}
                  editable={isStored(match)}
                  onAdd={(cards) => addCards(match, cards)}
                  onRemove={(card) => removeCard(match, card)}
                />
              }
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
