import { useMemo, useState } from "react";

import { SelectButton } from "primereact/selectbutton";

import {
  computeCategories,
  type ICategoryRow,
  type IClub,
  type ITournamentWithMatches,
} from "@/domain";
import { CountryFlag, type FlagCode, PlayerBadge, resolveFlag } from "@/ui";
import { findCatalogClub, formatAverage } from "@/utils";

type View = "stages" | "countries" | "pots";

/** Country rows with fewer matches than this on either side are left out. */
const MIN_COUNTRY_MATCHES = 3;
const MAX_COUNTRIES = 12;

const flagOf = (club: IClub): FlagCode | null =>
  resolveFlag(club.country, findCatalogClub(club.id, club.name)?.country);

const pointsPerMatch = (points: number, played: number) =>
  played ? points / played : 0;

/**
 * S against V split by stage, by the country of the player's own clubs and
 * by league pot. Each row compares points per match.
 */
const CategoriesCard = ({
  all,
  includePlayoff,
}: {
  all: ITournamentWithMatches[];
  includePlayoff: boolean;
}) => {
  const [view, setView] = useState<View>("stages");
  const categories = useMemo(
    () =>
      computeCategories(
        all,
        (club) => flagOf(club) ?? undefined,
        includePlayoff
      ),
    [all, includePlayoff]
  );
  // A readable name per flag code, from the tournament files.
  const countryNames = useMemo(() => {
    const names = new Map<string, string>();
    all.forEach(({ tournament }) =>
      tournament.clubs.forEach((club) => {
        const flag = flagOf(club);
        if (flag && club.country && !names.has(flag)) {
          names.set(flag, club.country);
        }
      })
    );
    return names;
  }, [all]);

  const views: { label: string; value: View }[] = [
    { label: "Етапи", value: "stages" },
    { label: "Країни", value: "countries" },
  ];
  if (categories.pots.length) views.push({ label: "Кошики", value: "pots" });
  const rows: ICategoryRow[] =
    view === "countries"
      ? categories.countries
          .filter(
            (row) =>
              row.records.S.played >= MIN_COUNTRY_MATCHES &&
              row.records.V.played >= MIN_COUNTRY_MATCHES
          )
          .slice(0, MAX_COUNTRIES)
      : categories[view];

  return (
    <div className="flex flex-column gap-3">
      <SelectButton
        value={view}
        options={views}
        allowEmpty={false}
        onChange={(e) => setView(e.value)}
        className="align-self-start"
      />
      {rows.length ? (
        <div className="categories">
          <span />
          <span className="categories__head">
            <PlayerBadge player="S" /> очок за матч
          </span>
          <span />
          <span className="categories__head justify-content-end">
            очок за матч <PlayerBadge player="V" />
          </span>
          {rows.map((row) => {
            const { S, V } = row.records;
            const s = pointsPerMatch(S.points, S.played);
            const v = pointsPerMatch(V.points, V.played);
            const total = s + v || 1;
            const flag =
              view === "countries" ? resolveFlag(undefined, row.key) : null;
            return [
              <span key={`${row.key}l`} className="categories__label">
                {flag && <CountryFlag code={flag} />}
                {view === "countries"
                  ? (countryNames.get(row.key) ?? row.key.toUpperCase())
                  : row.label}
              </span>,
              <span key={`${row.key}s`} className="categories__value">
                <b className={s > v ? "text-color" : "text-600"}>
                  {formatAverage(s)}
                </b>
                <span className="text-xs text-500">
                  {S.won}-{S.drawn}-{S.lost}
                </span>
              </span>,
              <span key={`${row.key}b`} className="versus-bar">
                {/* Computed widths: the two points-per-match values. */}
                <span
                  className="versus-bar__s"
                  style={{ width: `${(s / total) * 100}%` }}
                />
                <span
                  className="versus-bar__v"
                  style={{ width: `${(v / total) * 100}%` }}
                />
              </span>,
              <span
                key={`${row.key}v`}
                className="categories__value categories__value--end"
              >
                <span className="text-xs text-500">
                  {V.won}-{V.drawn}-{V.lost}
                </span>
                <b className={v > s ? "text-color" : "text-600"}>
                  {formatAverage(v)}
                </b>
              </span>,
            ];
          })}
        </div>
      ) : (
        <div className="text-600">Ще замало матчів для порівняння</div>
      )}
      <span className="text-sm text-600">
        {view === "stages" &&
          "Матчі S проти V на кожному етапі. Під числом: перемоги, нічиї, поразки."}
        {view === "countries" &&
          `Кожен гравець зі своїми клубами цієї країни, тож ліворуч і праворуч різні матчі. Країни, де в кожного щонайменше ${MIN_COUNTRY_MATCHES} матчі.`}
        {view === "pots" &&
          "Кожен гравець зі своїми клубами цього кошика ліги."}
      </span>
    </div>
  );
};

export default CategoriesCard;
