import { useState } from "react";

import { Button } from "primereact/button";

import ClubLabel from "./ClubLabel";
import PlayerBadge from "./PlayerBadge";

import { type ITitleRace, TITLE_RUNS } from "@/domain";
import { formatChance } from "@/utils";

interface ITitleRaceProps {
  race: ITitleRace;
  /** Clubs shown before "Показати всі". */
  limit?: number;
}

/**
 * Who wins the tournament: the split between S and V, then the likeliest
 * champions with a bar each.
 */
const TitleRace = ({ race, limit = 6 }: ITitleRaceProps) => {
  const [expanded, setExpanded] = useState(false);
  const top = race.clubs[0]?.chance ?? 1;
  const visible = expanded ? race.clubs : race.clubs.slice(0, limit);
  return (
    <div
      className="flex flex-column gap-3"
      title={`Симуляція решти турніру (${TITLE_RUNS} разів): незіграні матчі групового етапу, потім плей-офф. Сила клубу: забиті й пропущені голи за матч у цьому турнірі. Пари, яких ще немає, складаються жеребом.`}
    >
      <div className="flex align-items-center gap-2">
        <PlayerBadge player="S" size="md" />
        <span className="title-race__share">
          {formatChance(race.players.S)}
        </span>
        <span className="versus-bar versus-bar--thick flex-1">
          <span
            className="versus-bar__s"
            // Computed width: the share of S.
            style={{ width: `${race.players.S * 100}%` }}
          />
          <span
            className="versus-bar__v"
            style={{ width: `${race.players.V * 100}%` }}
          />
        </span>
        <span className="title-race__share">
          {formatChance(race.players.V)}
        </span>
        <PlayerBadge player="V" size="md" />
      </div>
      <div className="flex flex-column gap-2">
        {visible.map(({ club, chance }) => (
          <div key={club.id} className="title-race__row">
            <ClubLabel name={club.name} clubId={club.id} owner={club.owner} />
            <span className="title-race__track">
              <span
                className={`title-race__fill title-race__fill--${club.owner}`}
                // Computed width: against the favourite.
                style={{ width: `${(chance / top) * 100}%` }}
              />
            </span>
            <span className="font-semibold text-right">
              {formatChance(chance)}
            </span>
          </div>
        ))}
      </div>
      {race.clubs.length > limit && (
        <Button
          label={
            expanded ? "Згорнути" : `Показати всі ${race.clubs.length} клубів`
          }
          size="small"
          text
          className="align-self-start"
          onClick={() => setExpanded(!expanded)}
        />
      )}
    </div>
  );
};

export default TitleRace;
