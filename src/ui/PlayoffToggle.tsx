import { useId } from "react";

import { Checkbox } from "primereact/checkbox";

interface IPlayoffToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
}

/** "З плей-офф" switch for statistics: off counts the group stage only. */
const PlayoffToggle = ({ checked, onChange }: IPlayoffToggleProps) => {
  const inputId = useId();
  return (
    <label
      htmlFor={inputId}
      className="inline-flex align-items-center gap-2 cursor-pointer text-sm"
    >
      <Checkbox
        inputId={inputId}
        checked={checked}
        onChange={(e) => onChange(e.checked ?? false)}
      />
      Враховувати плей-офф
    </label>
  );
};

export default PlayoffToggle;
