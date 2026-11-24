import { useMemo, useState } from "react";

import { Button } from "primereact/button";

import EarlierGames from "./EarlierGames";

import {
  computeDiscipline,
  describeMatch,
  earlierTieGames,
  type IClub,
  type IMatch,
  isLeagueFormat,
  type IStoredMatch,
  type ITournament,
  latestResult,
  playoffMatches,
  tieKey,
  upcomingMatches,
} from "@/domain";
import {
  useMatchCards,
  useRatings,
  useSaveResult,
  useStakes,
  useTieChances,
} from "@/hooks";
import { useSettings, useTournamentData } from "@/providers";
import {
  EmptyState,
  MatchCards,
  MatchPreviewDialog,
  MatchRow,
  SectionCard,
  StakesLine,
  TieChance,
} from "@/ui";
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
  const tieChances = useTieChances(tournament, matches);
  // A pending extra game is not stored yet, so it cannot take cards.
  const isStored = (match: IMatch) => matches.some((m) => m.id === match.id);
  const clubsById = new Map<string, IClub>(
    tournament.clubs.map((club) => [club.id, club])
  );
  const latest = latestResult(matches);
  const upcoming = upcomingMatches(matches);
  const league = isLeagueFormat(tournament.format);
  // What the next match means, while it is a group match.
  const next = upcoming[0];
  const stakes = useStakes(tournament, matches, next);
  const { all } = useTournamentData();
  const ratings = useRatings();
  const { settings } = useSettings();
  const [preview, setPreview] = useState<IMatch | null>(null);

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
        {entries.map(({ label, match }) => {
          const earlier = earlierTieGames(match, matches);
          const chance =
            match.stage === "playoff"
              ? tieChances.get(tieKey(match))
              : undefined;
          // The tie's own order: the home club of its first game comes first.
          const first =
            match.stage === "playoff"
              ? playoffMatches(matches).find(
                  (m) =>
                    m.round === match.round &&
                    m.tie === match.tie &&
                    m.game === 1
                )
              : undefined;
          return (
            <div key={label} className="flex flex-column gap-2">
              <div className="flex align-items-center justify-content-between gap-2">
                <span className="text-500 text-xs font-semibold">{label}</span>
                {match.result === null && (
                  <Button
                    label="Перед матчем"
                    size="small"
                    text
                    className="py-0"
                    onClick={() => setPreview(match)}
                  />
                )}
              </div>
              {earlier && (
                <EarlierGames
                  earlier={earlier}
                  home={match.home}
                  away={match.away}
                  clubsById={clubsById}
                />
              )}
              {chance && first && (
                <TieChance
                  chance={chance}
                  home={clubsById.get(first.home)}
                  away={clubsById.get(first.away)}
                />
              )}
              {stakes && match.id === next?.id && (
                <StakesLine
                  stakes={stakes}
                  home={clubsById.get(match.home)}
                  away={clubsById.get(match.away)}
                  goal={
                    league ? "вийти в 1/8 фіналу напряму" : "вийти в плей-офф"
                  }
                />
              )}
              <MatchRow
                // Remount on any stored change so the draft starts from it.
                key={`${match.id}:${match.home}:${match.away}:${formatScore(match.result)}`}
                match={match}
                clubsById={clubsById}
                editable
                meta={describeMatch(match, league)}
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
          );
        })}
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
      <MatchPreviewDialog
        tournament={tournament}
        matches={matches}
        match={preview}
        all={all}
        ratings={ratings}
        forecast={settings.showChances}
        onHide={() => setPreview(null)}
      />
    </SectionCard>
  );
};

export default QuickEntry;
