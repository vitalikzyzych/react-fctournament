import { Button } from "primereact/button";
import { Dropdown } from "primereact/dropdown";

import {
  findChampion,
  type IClub,
  type IMatch,
  type ITournament,
} from "@/domain";
import { useToast } from "@/providers";
import { setTournamentChampion } from "@/source/TournamentSource";
import { ChampionBadge, ClubLabel } from "@/ui";

interface IChampionPanelProps {
  tournament: ITournament;
  matches: IMatch[];
  editable: boolean;
}

interface IClubOption {
  label: string;
  value: string;
  club: IClub;
}

/**
 * The tournament champion: the winner of the final when it is decided,
 * otherwise a club picked by hand (for tournaments whose playoff was not
 * played to the end).
 */
const ChampionPanel = ({
  tournament,
  matches,
  editable,
}: IChampionPanelProps) => {
  const { show } = useToast();
  const clubOf = (id: string | null) =>
    id ? tournament.clubs.find((club) => club.id === id) : undefined;
  const finalWinner = clubOf(findChampion(matches));
  const picked = clubOf(tournament.champion);

  const pick = (clubId: string | null) =>
    setTournamentChampion(tournament.id, clubId)
      .then(() =>
        show(
          "success",
          clubId ? "Чемпіона обрано" : "Вибір чемпіона скасовано",
          clubOf(clubId)?.name
        )
      )
      .catch((error: Error) =>
        show("error", "Не вдалося зберегти чемпіона", error.message)
      );

  if (finalWinner) {
    return (
      <div className="app-card pitch p-4 flex flex-column align-items-center gap-2 text-center">
        <span className="section-title">Чемпіон турніру</span>
        <ChampionBadge club={finalWinner} className="text-lg" />
        <span className="text-500 text-sm">Переможець фіналу</span>
        {picked && picked.id !== finalWinner.id && (
          <span className="flex flex-wrap align-items-center justify-content-center gap-2 text-500 text-xs">
            Обраний вручну {picked.name} не враховується, бо фінал зіграно.
            {editable && (
              <Button
                label="Прибрати"
                text
                size="small"
                severity="secondary"
                onClick={() => pick(null)}
              />
            )}
          </span>
        )}
      </div>
    );
  }

  if (!editable && !picked) return null;

  const options: IClubOption[] = [...tournament.clubs]
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((club) => ({ label: club.name, value: club.id, club }));

  return (
    <div className="app-card pitch p-4 flex flex-column align-items-center gap-2 text-center">
      <span className="section-title">Чемпіон турніру</span>
      {picked ? (
        <>
          <ChampionBadge club={picked} className="text-lg" />
          <span className="text-500 text-sm">
            Обрано вручну. Якщо фінал буде зіграно, чемпіоном стане його
            переможець.
          </span>
        </>
      ) : (
        <span className="text-500 text-sm">
          Фінал ще не зіграно. Чемпіона можна обрати вручну.
        </span>
      )}
      {editable && (
        <Dropdown
          value={tournament.champion}
          onChange={(e) => pick(e.value ?? null)}
          options={options}
          itemTemplate={(option: IClubOption) => (
            <span className="flex align-items-center justify-content-between gap-2 w-full">
              <ClubLabel name={option.club.name} owner={option.club.owner} />
              <span className="text-500 text-xs">Гр. {option.club.group}</span>
            </span>
          )}
          valueTemplate={(option: IClubOption | null) =>
            option ? (
              <ClubLabel name={option.club.name} owner={option.club.owner} />
            ) : (
              <span className="text-500">Обрати чемпіона</span>
            )
          }
          filter
          showClear
          placeholder="Обрати чемпіона"
          aria-label="Обрати чемпіона"
          className="w-full md:w-20rem text-left"
        />
      )}
    </div>
  );
};

export default ChampionPanel;
