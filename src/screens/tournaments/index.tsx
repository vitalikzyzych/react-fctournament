import { Link } from "react-router-dom";

import { Button } from "primereact/button";

import { PageHeader } from "@/components";
import {
  type ITournamentWithMatches,
  summarizeTournament,
  type TournamentStatus,
} from "@/domain";
import { useTournamentData } from "@/providers";
import {
  ChampionBadge,
  EmptyState,
  FluentIcon,
  PlayerBadge,
  SectionCard,
  StatusTag,
} from "@/ui";
import { plural } from "@/utils";

const SECTIONS: { status: TournamentStatus; title: string }[] = [
  { status: "active", title: "Поточні" },
  { status: "planned", title: "Заплановані" },
  { status: "completed", title: "Архів" },
];

const TournamentCard = ({ item }: { item: ITournamentWithMatches }) => {
  const summary = summarizeTournament(item);
  const { tournament } = item;
  const progress = summary.totalMatches
    ? Math.round((summary.playedMatches / summary.totalMatches) * 100)
    : 0;

  return (
    <Link to={`/tournaments/${tournament.id}`} className="block h-full">
      <div className="app-card app-card--link pitch p-3 md:p-4 h-full">
        <div className="flex align-items-start justify-content-between gap-2 mb-3">
          <div className="min-w-0">
            <div className="text-500 text-xs font-semibold mb-1">
              № {tournament.number}
            </div>
            <div className="font-bold text-lg">{tournament.name}</div>
          </div>
          <StatusTag status={tournament.status} />
        </div>

        <div className="flex align-items-center justify-content-center gap-3 my-3">
          <PlayerBadge player="S" size="lg" />
          <span className="versus-total">
            {summary.players.S.won}
            <span className="hero__score-sep">:</span>
            {summary.players.V.won}
          </span>
          <PlayerBadge player="V" size="lg" />
        </div>
        <div className="text-center text-xs text-500 mb-3">
          нічиїх {summary.players.S.drawn} · голів {summary.totalGoals}
        </div>
        {summary.champion && (
          <div className="flex justify-content-center mb-3">
            <ChampionBadge club={summary.champion} />
          </div>
        )}

        <div className="progress-bar mb-2">
          <span style={{ width: `${progress}%` }} />
        </div>
        <div className="text-xs text-500">
          {summary.playedMatches} з {summary.totalMatches}{" "}
          {plural(summary.totalMatches, ["матчу", "матчів", "матчів"])} зіграно
        </div>
      </div>
    </Link>
  );
};

const Tournaments = () => {
  const { all } = useTournamentData();

  return (
    <>
      <PageHeader
        title="Турніри"
        subtitle={`${all.length} ${plural(all.length, ["турнір", "турніри", "турнірів"])}`}
        actions={
          <Link to="/import">
            <Button
              label="Імпорт турніру"
              icon={<FluentIcon name="ArrowImport" />}
              outlined
            />
          </Link>
        }
      />

      {all.length === 0 && (
        <SectionCard>
          <EmptyState icon="Trophy" title="Турнірів ще немає">
            <p className="m-0">Імпортуйте турнір з JSON на сторінці імпорту.</p>
          </EmptyState>
        </SectionCard>
      )}

      {SECTIONS.map(({ status, title }) => {
        const items = all.filter((item) => item.tournament.status === status);
        // The planned section stays visible as the place for future tournaments.
        const showEmpty = status === "planned" && all.length > 0;
        if (!items.length && !showEmpty) return null;
        return (
          <div key={status} className="mb-4">
            <h2 className="section-title mb-3">{title}</h2>
            {status === "planned" && (
              <p className="mt-0 mb-3 text-500 text-sm line-height-3">
                Майбутні турніри: розклад уже видно, результати вносяться після
                старту. Почати можна, коли немає поточного турніру. Щоб додати,
                імпортуйте JSON зі статусом <code>planned</code>.
              </p>
            )}
            <div className="grid">
              {items.map((item) => (
                <div
                  key={item.tournament.id}
                  className="col-12 md:col-6 xl:col-4"
                >
                  <TournamentCard item={item} />
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </>
  );
};

export default Tournaments;
