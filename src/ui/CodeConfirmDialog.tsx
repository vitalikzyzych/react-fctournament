import { type ReactNode, useState } from "react";

import { Button } from "primereact/button";
import { Dialog } from "primereact/dialog";
import { InputText } from "primereact/inputtext";

import FluentIcon from "./FluentIcon";

interface ICodeConfirmDialogProps {
  title: string;
  message: ReactNode;
  confirmLabel: string;
  severity?: "danger";
  onConfirm: () => void;
  onHide: () => void;
}

const randomCode = () => String(1000 + Math.floor(Math.random() * 9000));

/**
 * Confirmation for actions that should not happen by an accidental click:
 * the button unlocks only after the user types the random 4-digit code shown.
 * Mount it only while open, so every opening gets a new code.
 * Modal pattern from web-app: no header, title in the body, absolute close button.
 */
const CodeConfirmDialog = ({
  title,
  message,
  confirmLabel,
  severity,
  onConfirm,
  onHide,
}: ICodeConfirmDialogProps) => {
  const [code] = useState(randomCode);
  const [value, setValue] = useState("");
  const matches = value === code;

  const confirm = () => {
    if (!matches) return;
    onConfirm();
    onHide();
  };

  return (
    <Dialog
      visible
      onHide={onHide}
      showHeader={false}
      // Let the code input take focus instead of the close button.
      focusOnShow={false}
      dismissableMask
      className="w-full md:w-28rem mx-3"
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
      <h2 className="m-0 mb-2 text-xl font-bold pr-5">{title}</h2>
      <div className="text-700 line-height-3 mb-4">{message}</div>

      <div className="text-600 text-sm mb-2">Щоб підтвердити, введіть код:</div>
      <div className="confirm-code mb-3" aria-label={`Код ${code}`}>
        {code}
      </div>
      <InputText
        value={value}
        onChange={(e) =>
          setValue(e.target.value.replace(/\D/g, "").slice(0, 4))
        }
        onKeyDown={(e) => e.key === "Enter" && confirm()}
        inputMode="numeric"
        maxLength={4}
        autoFocus
        placeholder="0000"
        aria-label="Код підтвердження"
        className={
          value.length === 4 && !matches
            ? "confirm-code-input w-full p-invalid"
            : "confirm-code-input w-full"
        }
      />
      {value.length === 4 && !matches && (
        <small className="block text-red-400 mt-1">Код не збігається</small>
      )}

      <div className="flex justify-content-end gap-2 mt-4">
        <Button label="Скасувати" text severity="secondary" onClick={onHide} />
        <Button
          label={confirmLabel}
          severity={severity}
          disabled={!matches}
          onClick={confirm}
        />
      </div>
    </Dialog>
  );
};

export default CodeConfirmDialog;
