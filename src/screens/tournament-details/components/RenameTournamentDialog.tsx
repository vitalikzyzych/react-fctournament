import { useState } from "react";

import { Button } from "primereact/button";
import { Dialog } from "primereact/dialog";
import { InputText } from "primereact/inputtext";

import type { ITournament } from "@/domain";
import { useToast } from "@/providers";
import { setTournamentName } from "@/source/TournamentSource";
import { FluentIcon } from "@/ui";

/** Same limit as the import schema and firestore.rules. */
const MAX_NAME_LENGTH = 80;

interface IRenameTournamentDialogProps {
  tournament: ITournament;
  onHide: () => void;
}

/** Changes the tournament's title. Mount it only while open. */
const RenameTournamentDialog = ({
  tournament,
  onHide,
}: IRenameTournamentDialogProps) => {
  const { show } = useToast();
  const [name, setName] = useState(tournament.name);
  const trimmed = name.trim();
  const canSave = trimmed.length > 0 && trimmed !== tournament.name;

  const save = () => {
    if (!canSave) return;
    onHide();
    setTournamentName(tournament.id, trimmed)
      .then(() => show("success", "Назву змінено", trimmed))
      .catch((error: Error) =>
        show("error", "Не вдалося змінити назву", error.message)
      );
  };

  return (
    <Dialog
      visible
      onHide={onHide}
      showHeader={false}
      dismissableMask
      className="w-full mx-3 md:w-30rem"
      contentClassName="border-round-xl p-4 relative"
    >
      <Button
        icon={<FluentIcon name="Dismiss" size={20} />}
        rounded
        text
        severity="secondary"
        onClick={onHide}
        aria-label="Закрити"
        className="absolute top-0 right-0 mt-2 mr-2"
      />
      <h2 className="m-0 mb-3 text-xl font-bold pr-5">Назва турніру</h2>
      <InputText
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") save();
        }}
        maxLength={MAX_NAME_LENGTH}
        autoFocus
        aria-label="Назва турніру"
        className="w-full"
      />
      <div className="text-500 text-xs mt-2">
        Номер, id і матчі не змінюються. {trimmed.length} з {MAX_NAME_LENGTH}{" "}
        символів.
      </div>
      <div className="flex justify-content-end gap-2 mt-3">
        <Button label="Скасувати" text severity="secondary" onClick={onHide} />
        <Button
          label="Зберегти"
          icon={<FluentIcon name="Checkmark" />}
          disabled={!canSave}
          onClick={save}
        />
      </div>
    </Dialog>
  );
};

export default RenameTournamentDialog;
