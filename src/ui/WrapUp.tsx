import { useMemo, useState } from "react";

import { Button } from "primereact/button";
import { classNames } from "primereact/utils";

import ChampionBadge from "./ChampionBadge";
import ClubLabel from "./ClubLabel";
import FluentIcon from "./FluentIcon";
import MatchLine from "./MatchLine";
import PlayerBadge from "./PlayerBadge";

import {
  computeWrapUp,
  type IMatch,
  type IRatings,
  type ITournament,
} from "@/domain";
import { useToast } from "@/providers";
import { drawWrapUpImage, shareImage } from "@/utils";

interface IWrapUpProps {
  tournament: ITournament;
  matches: IMatch[];
  ratings: IRatings;
}

/**
 * The tournament in one card: the champion, who won more matches, and an
 * award per tile, with a picture to share.
 */
const WrapUp = ({ tournament, matches, ratings }: IWrapUpProps) => {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const wrap = useMemo(
    () => computeWrapUp(tournament, matches, ratings),
    [tournament, matches, ratings]
  );
  const clubsById = useMemo(
    () => new Map(tournament.clubs.map((club) => [club.id, club])),
    [tournament.clubs]
  );
  const { S, V } = wrap.players;

  const share = async () => {
    setBusy(true);
    try {
      const blob = await drawWrapUpImage(wrap, tournament, clubsById);
      if (!blob) throw new Error("canvas");
      const outcome = await shareImage(
        blob,
        `${tournament.id}-pidsumky.png`,
        `${tournament.name}: підсумки`
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
        <div className="flex align-items-center gap-2 flex-wrap">
          {wrap.champion && <ChampionBadge club={wrap.champion} />}
          {wrap.leagueWinner && (
            <ChampionBadge club={wrap.leagueWinner} league />
          )}
          {wrap.finalist && (
            <span className="flex align-items-center gap-2 text-sm text-600">
              у фіналі обіграв
              <ClubLabel
                name={wrap.finalist.name}
                clubId={wrap.finalist.id}
                owner={wrap.finalist.owner}
              />
            </span>
          )}
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
      <div className="flex align-items-center gap-3 flex-wrap">
        <PlayerBadge player="S" size="md" />
        <span className="recap__score">
          {S.won}:{V.won}
        </span>
        <PlayerBadge player="V" size="md" />
        <span className="font-semibold">
          {wrap.winner
            ? `За перемогами турнір виграв ${wrap.winner}`
            : "За перемогами нічия"}
        </span>
        <span className="text-sm text-600">
          нічиїх {S.drawn}, голів {S.goalsFor}:{V.goalsFor}, матчів{" "}
          {wrap.playedMatches}
        </span>
      </div>
      <div className="wrap-up__awards">
        {wrap.awards.map((award) => (
          <div
            key={award.id}
            className={classNames("wrap-up__award", {
              "wrap-up__award--match": award.match,
            })}
          >
            <span className="text-xs text-500 uppercase font-semibold">
              {award.title}
            </span>
            {award.match ? (
              <MatchLine match={award.match} clubsById={clubsById} />
            ) : award.club ? (
              <ClubLabel
                name={award.club.name}
                clubId={award.club.id}
                owner={award.club.owner}
                bold
              />
            ) : (
              award.player && (
                <span className="flex align-items-center gap-2 font-semibold">
                  <PlayerBadge player={award.player} /> Гравець {award.player}
                </span>
              )
            )}
            {award.value && (
              <span className="text-sm text-600">{award.value}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default WrapUp;
