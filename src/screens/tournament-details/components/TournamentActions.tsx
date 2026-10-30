import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { Button } from "primereact/button";
import { confirmDialog } from "primereact/confirmdialog";

import RenameTournamentDialog from "./RenameTournamentDialog";

import { type IMatch, type ITournament, toTournamentFile } from "@/domain";
import { useToast, useTournamentData } from "@/providers";
import {
  deleteTournament,
  setTournamentStatus,
} from "@/source/TournamentSource";
import { CodeConfirmDialog, FluentIcon } from "@/ui";
import { downloadJson } from "@/utils";

interface ITournamentActionsProps {
  tournament: ITournament;
  matches: IMatch[];
}

const TournamentActions = ({
  tournament,
  matches,
}: ITournamentActionsProps) => {
  const { show } = useToast();
  const navigate = useNavigate();
  const unplayed = matches.filter((m) => m.result === null).length;
  const [isCompleteOpen, setCompleteOpen] = useState(false);
  const [isRenameOpen, setRenameOpen] = useState(false);
  // One tournament is played at a time: a planned one starts only when no
  // other tournament is in progress.
  const { tournaments } = useTournamentData();
  const otherActive = tournaments.find(
    (t) => t.status === "active" && t.id !== tournament.id
  );

  const changeStatus = (status: ITournament["status"], message: string) =>
    setTournamentStatus(tournament.id, status)
      .then(() => show("success", message))
      .catch((error: Error) =>
        show("error", "Не вдалося змінити статус", error.message)
      );

  const start = () =>
    confirmDialog({
      header: "Почати турнір?",
      message:
        "Турнір стане поточним: зʼявиться на головній, і можна буде вносити результати.",
      acceptLabel: "Почати",
      rejectLabel: "Скасувати",
      accept: () => changeStatus("active", "Турнір розпочато"),
    });

  const unlock = () =>
    confirmDialog({
      header: "Розблокувати турнір?",
      message: otherActive
        ? `Турнір знову стане активним, і результати можна буде редагувати. Зараз триває "${otherActive.name}", тож активних турнірів буде два, доки цей не завершити знову.`
        : "Турнір знову стане активним, і результати можна буде редагувати.",
      acceptLabel: "Розблокувати",
      rejectLabel: "Скасувати",
      accept: () => changeStatus("active", "Турнір розблоковано"),
    });

  const remove = () =>
    confirmDialog({
      header: "Видалити турнір?",
      message: `"${tournament.name}" і всі його матчі буде видалено назавжди. Спершу можна зберегти експорт JSON.`,
      acceptLabel: "Видалити",
      rejectLabel: "Скасувати",
      acceptClassName: "p-button-danger",
      accept: () => {
        navigate("/tournaments");
        deleteTournament(
          tournament.id,
          matches.map((m) => m.id)
        )
          .then(() => show("success", "Турнір видалено"))
          .catch((error: Error) =>
            show("error", "Не вдалося видалити", error.message)
          );
      },
    });

  return (
    <>
      {tournament.status === "planned" && (
        <Button
          label="Почати турнір"
          icon={<FluentIcon name="Play" />}
          disabled={otherActive !== undefined}
          tooltip={
            otherActive
              ? `Спершу завершіть поточний турнір "${otherActive.name}"`
              : undefined
          }
          tooltipOptions={{ position: "bottom", showOnDisabled: true }}
          onClick={start}
        />
      )}
      {tournament.status === "active" && (
        <Button
          label="Завершити"
          icon={<FluentIcon name="LockClosed" />}
          onClick={() => setCompleteOpen(true)}
        />
      )}
      {tournament.status === "completed" && (
        <Button
          label="Розблокувати"
          icon={<FluentIcon name="LockOpen" />}
          outlined
          onClick={unlock}
        />
      )}
      <Button
        label="Експорт JSON"
        icon={<FluentIcon name="ArrowDownload" />}
        outlined
        onClick={() =>
          downloadJson(
            `${tournament.id}.json`,
            toTournamentFile(tournament, matches)
          )
        }
      />
      <Button
        icon={<FluentIcon name="Edit" />}
        severity="secondary"
        text
        aria-label="Змінити назву"
        tooltip="Змінити назву"
        tooltipOptions={{ position: "bottom" }}
        onClick={() => setRenameOpen(true)}
      />
      {tournament.status !== "completed" && (
        <Button
          icon={<FluentIcon name="Delete" />}
          severity="danger"
          text
          aria-label="Видалити турнір"
          tooltip="Видалити турнір"
          tooltipOptions={{ position: "bottom" }}
          onClick={remove}
        />
      )}
      {isRenameOpen && (
        <RenameTournamentDialog
          tournament={tournament}
          onHide={() => setRenameOpen(false)}
        />
      )}
      {isCompleteOpen && (
        <CodeConfirmDialog
          title="Завершити турнір?"
          message={
            <>
              {unplayed > 0 && (
                <p className="mt-0 font-semibold">
                  Ще {unplayed} матч(ів) без результату.
                </p>
              )}
              <p className="m-0">
                Після завершення результати не можна змінювати, доки турнір не
                розблокують.
              </p>
            </>
          }
          confirmLabel="Завершити турнір"
          onConfirm={() => changeStatus("completed", "Турнір завершено")}
          onHide={() => setCompleteOpen(false)}
        />
      )}
    </>
  );
};

export default TournamentActions;
