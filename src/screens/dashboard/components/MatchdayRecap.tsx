import { useState } from "react";

import { Button } from "primereact/button";

import type { IClub, IMatchdayRecap, ITournament } from "@/domain";
import { useToast } from "@/providers";
import { FluentIcon, MatchLine, PlayerBadge } from "@/ui";
import { drawMatchdayImage, plural, shareImage } from "@/utils";

interface IMatchdayRecapProps {
  recap: IMatchdayRecap;
  tournament: ITournament;
  clubsById: Map<string, IClub>;
}

/** "Тур 5: S 3, V 1" with goals, cards and the biggest win, plus sharing. */
const MatchdayRecap = ({
  recap,
  tournament,
  clubsById,
}: IMatchdayRecapProps) => {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const { wins, draws, goals, cards, biggest } = recap;
  const leader =
    wins.S === wins.V
      ? "Тур завершився внічию"
      : `Тур за ${wins.S > wins.V ? "S" : "V"}`;

  const share = async () => {
    setBusy(true);
    try {
      const blob = await drawMatchdayImage(recap, tournament, clubsById);
      if (!blob) throw new Error("canvas");
      const outcome = await shareImage(
        blob,
        `${tournament.id}-tur-${recap.matchday}.png`,
        `${tournament.name}, тур ${recap.matchday}`
      );
      if (outcome === "downloaded") {
        toast.show("success", "Картинку збережено", "Її можна надіслати в чат");
      }
    } catch {
      toast.show("error", "Не вдалося створити картинку");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-column gap-3">
      <div className="flex align-items-center justify-content-between gap-3 flex-wrap">
        <div className="flex align-items-center gap-3">
          <PlayerBadge player="S" size="md" />
          <span className="recap__score">
            {wins.S}:{wins.V}
          </span>
          <PlayerBadge player="V" size="md" />
          <span className="font-semibold">{leader}</span>
        </div>
        <Button
          label="Поділитися"
          icon={<FluentIcon name="Share" />}
          size="small"
          outlined
          loading={busy}
          onClick={share}
        />
      </div>
      <div className="text-sm text-600">
        Нічиїх {draws}, голів {goals.S}:{goals.V}
        {cards.yellow + cards.red > 0 &&
          `, ${cards.yellow} ${plural(cards.yellow, ["жовта", "жовті", "жовтих"])} і ${cards.red} ${plural(cards.red, ["червона", "червоні", "червоних"])}`}
        .
      </div>
      {biggest && (
        <div className="flex flex-column gap-2">
          <span className="text-xs text-500 uppercase font-semibold">
            Найбільша перемога туру
          </span>
          <MatchLine match={biggest} clubsById={clubsById} />
        </div>
      )}
    </div>
  );
};

export default MatchdayRecap;
