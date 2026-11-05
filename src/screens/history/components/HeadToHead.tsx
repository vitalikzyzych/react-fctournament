import { useMemo, useState } from "react";

import { Button } from "primereact/button";
import { Dropdown } from "primereact/dropdown";

import {
  buildClubNames,
  computeHeadToHead,
  type IHeadToHead,
  type ITournamentWithMatches,
  listRivalries,
} from "@/domain";
import { ClubLabel, EmptyState, SectionCard } from "@/ui";
import { formatScore } from "@/utils";

const HeadToHeadResult = ({
  h2h,
  names,
}: {
  h2h: IHeadToHead;
  names: Map<string, string>;
}) => {
  if (!h2h.matches.length) {
    return <EmptyState title="Ці клуби ще не грали між собою" />;
  }
  const name = (id: string) => names.get(id) ?? id;
  return (
    <div>
      <div className="flex align-items-center justify-content-center gap-3 mb-1 text-center">
        <span className="font-semibold flex-1 text-right">
          {name(h2h.clubA)}
        </span>
        <span className="versus-total white-space-nowrap">
          {h2h.winsA} : {h2h.winsB}
        </span>
        <span className="font-semibold flex-1 text-left">
          {name(h2h.clubB)}
        </span>
      </div>
      <div className="text-center text-sm text-600 mb-3">
        нічиїх: {h2h.draws} · голи {h2h.goalsA}:{h2h.goalsB} · турнірів:{" "}
        {h2h.tournamentCount}
      </div>
      <div className="flex flex-column gap-2">
        {h2h.matches.map(({ tournament, match }) => {
          const home = tournament.clubs.find((c) => c.id === match.home);
          const away = tournament.clubs.find((c) => c.id === match.away);
          return (
            <div
              key={`${tournament.id}-${match.id}`}
              className="flex align-items-center justify-content-between gap-2 match-row-lite"
            >
              <span className="text-500 text-sm w-3rem">
                №{tournament.number}
              </span>
              <ClubLabel
                name={name(match.home)}
                clubId={match.home}
                owner={home?.owner}
                className="flex-1"
              />
              <span className="score-chip">{formatScore(match.result)}</span>
              <ClubLabel
                name={name(match.away)}
                clubId={match.away}
                owner={away?.owner}
                badgePosition="end"
                className="flex-1 justify-content-end"
              />
            </div>
          );
        })}
      </div>
    </div>
  );
};

const clubOption = (option: { value: string; label: string }) => (
  <ClubLabel name={option.label} clubId={option.value} />
);

const HeadToHead = ({
  all,
  includePlayoff,
}: {
  all: ITournamentWithMatches[];
  includePlayoff: boolean;
}) => {
  const names = useMemo(
    () => buildClubNames(all.map((t) => t.tournament)),
    [all]
  );
  const rivalries = useMemo(
    () => listRivalries(all, includePlayoff),
    [all, includePlayoff]
  );
  const options = [...names.entries()]
    .map(([value, label]) => ({ value, label }))
    .sort((a, b) => a.label.localeCompare(b.label));

  const [clubA, setClubA] = useState<string | null>(null);
  const [clubB, setClubB] = useState<string | null>(null);
  const h2h =
    clubA && clubB && clubA !== clubB
      ? computeHeadToHead(all, clubA, clubB, includePlayoff)
      : null;

  return (
    <div className="grid">
      <div className="col-12 lg:col-7">
        <SectionCard title="Особисті зустрічі клубів">
          <div className="flex flex-column md:flex-row gap-2 mb-3">
            <Dropdown
              value={clubA}
              onChange={(e) => setClubA(e.value)}
              options={options}
              filter
              itemTemplate={clubOption}
              placeholder="Перший клуб"
              className="flex-1"
            />
            <Dropdown
              value={clubB}
              onChange={(e) => setClubB(e.value)}
              options={options.filter((o) => o.value !== clubA)}
              filter
              itemTemplate={clubOption}
              placeholder="Другий клуб"
              className="flex-1"
            />
          </div>
          {h2h ? (
            <HeadToHeadResult h2h={h2h} names={names} />
          ) : (
            <div className="text-600">
              Оберіть два клуби або пару зі списку суперництв.
            </div>
          )}
        </SectionCard>
      </div>
      <div className="col-12 lg:col-5">
        <SectionCard title="Зустрічалися в кількох турнірах">
          {rivalries.length ? (
            <div className="flex flex-column gap-1">
              {rivalries.map((r) => (
                <Button
                  key={`${r.clubA}|${r.clubB}`}
                  text
                  severity="secondary"
                  className="flex justify-content-between gap-2 p-2 text-left w-full text-color"
                  onClick={() => {
                    setClubA(r.clubA);
                    setClubB(r.clubB);
                  }}
                >
                  <span className="min-w-0">
                    {names.get(r.clubA)} : {names.get(r.clubB)}
                  </span>
                  <span className="font-semibold white-space-nowrap">
                    {r.winsA}-{r.draws}-{r.winsB}
                  </span>
                </Button>
              ))}
            </div>
          ) : (
            <div className="text-600">
              Зʼявиться, коли ті самі клуби зустрінуться у двох і більше
              турнірах.
            </div>
          )}
        </SectionCard>
      </div>
    </div>
  );
};

export default HeadToHead;
