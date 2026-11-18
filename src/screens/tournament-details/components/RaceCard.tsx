import { useState } from "react";

import { SelectButton } from "primereact/selectbutton";

import { computeRace, type IMatch, type ITournament } from "@/domain";
import { DuelLineChart, EmptyState } from "@/ui";

type Measure = "won" | "points" | "goalsFor";

const MEASURES: { label: string; value: Measure; text: string }[] = [
  { label: "Перемоги", value: "won", text: "перемог" },
  { label: "Очки", value: "points", text: "очок" },
  { label: "Голи", value: "goalsFor", text: "голів" },
];

/** S and V wins, points or goals after every matchday and playoff round. */
const RaceCard = ({
  tournament,
  matches,
}: {
  tournament: ITournament;
  matches: IMatch[];
}) => {
  const [measure, setMeasure] = useState<Measure>("won");
  const race = computeRace(tournament, matches);
  if (race.length < 2) {
    return (
      <EmptyState icon="DataLine" title="Графік зʼявиться після другого туру" />
    );
  }
  return (
    <div className="flex flex-column gap-3">
      <SelectButton
        value={measure}
        onChange={(e) => e.value && setMeasure(e.value)}
        options={MEASURES}
        optionLabel="label"
        optionValue="value"
        allowEmpty={false}
        aria-label="Показник"
      />
      <DuelLineChart
        points={race.map((point) => ({
          label: point.label,
          values: {
            S: point.records.S[measure],
            V: point.records.V[measure],
          },
        }))}
        measure={`${MEASURES.find((m) => m.value === measure)?.text} разом`}
      />
    </div>
  );
};

export default RaceCard;
