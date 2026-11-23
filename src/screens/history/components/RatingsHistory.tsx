import { useMemo, useState } from "react";

import { Column } from "primereact/column";
import { DataTable } from "primereact/datatable";
import { InputText } from "primereact/inputtext";

import {
  describeMatch,
  type IClubRating,
  type IRatings,
  isLeagueFormat,
  RATING_START,
} from "@/domain";
import { ClubLabel, MatchLine, SectionCard } from "@/ui";
import { formatPercent, formatSigned } from "@/utils";

interface IRow extends IClubRating {
  place: number;
}

const UPSETS = 10;

/**
 * Club ratings over every tournament (Elo): the ranking, and the wins the
 * ratings expected least.
 */
const RatingsHistory = ({ ratings }: { ratings: IRatings }) => {
  const [search, setSearch] = useState("");
  const rows = useMemo<IRow[]>(
    () => ratings.clubs.map((club, index) => ({ ...club, place: index + 1 })),
    [ratings]
  );
  const visible = rows.filter((row) =>
    row.name.toLowerCase().includes(search.trim().toLowerCase())
  );
  const upsets = ratings.upsets.slice(0, UPSETS);

  return (
    <div className="grid">
      <div className="col-12 lg:col-7">
        <SectionCard
          title="Рейтинг клубів"
          action={
            <InputText
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Пошук клубу"
              className="w-10rem md:w-14rem"
            />
          }
        >
          <DataTable
            value={visible}
            dataKey="clubId"
            size="small"
            scrollable
            paginator={visible.length > 25}
            rows={25}
            emptyMessage="Клубів не знайдено"
          >
            <Column field="place" header="#" className="w-2rem" />
            <Column
              field="name"
              header="Клуб"
              sortable
              body={(row: IRow) => (
                <ClubLabel
                  name={row.name}
                  clubId={row.clubId}
                  country={row.country}
                  showFlag
                />
              )}
            />
            <Column
              field="rating"
              header="Рейтинг"
              sortable
              body={(row: IRow) => Math.round(row.rating)}
              className="text-center font-bold"
            />
            <Column
              field="lastChange"
              header={
                <span title="Зміна за останній турнір клубу">Останній</span>
              }
              sortable
              body={(row: IRow) => (
                <span
                  className={
                    row.lastChange >= 0.5
                      ? "rating-up"
                      : row.lastChange <= -0.5
                        ? "rating-down"
                        : "text-500"
                  }
                >
                  {formatSigned(Math.round(row.lastChange))}
                </span>
              )}
              className="text-center"
            />
            <Column
              field="peak"
              header={<span title="Найвищий рейтинг клубу">Пік</span>}
              sortable
              body={(row: IRow) => Math.round(row.peak)}
              className="text-center"
            />
            <Column
              field="played"
              header="І"
              sortable
              className="text-center"
            />
          </DataTable>
          <div className="text-sm text-600 mt-2">
            Кожен клуб починає з {RATING_START}. Після матчу переможець забирає
            очки в переможеного: більше за перемогу над сильнішим і за велику
            різницю голів. Рейтинг клубу переходить із турніру в турнір, хоч би
            за кого з гравців він грав.
          </div>
        </SectionCard>
      </div>
      <div className="col-12 lg:col-5">
        <SectionCard title="Найбільші сенсації">
          {upsets.length ? (
            <div className="flex flex-column gap-3">
              {upsets.map((upset) => (
                <div
                  key={`${upset.tournament.id}:${upset.match.id}`}
                  className="flex flex-column gap-1"
                >
                  <span className="text-xs text-500">
                    №{upset.tournament.number} {upset.tournament.name},{" "}
                    {describeMatch(
                      upset.match,
                      isLeagueFormat(upset.tournament.format)
                    )}
                  </span>
                  <MatchLine
                    match={upset.match}
                    clubsById={
                      new Map(
                        upset.tournament.clubs.map((club) => [club.id, club])
                      )
                    }
                  />
                  <span className="text-xs text-500">
                    шанс переможця був {formatPercent(upset.chance)}, різниця
                    рейтингів {Math.round(upset.gap)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-600">
              Сенсації зʼявляться, коли слабший за рейтингом клуб обіграє значно
              сильнішого.
            </div>
          )}
        </SectionCard>
      </div>
    </div>
  );
};

export default RatingsHistory;
