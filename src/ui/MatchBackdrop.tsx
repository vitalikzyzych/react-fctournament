import { useState } from "react";

import { classNames } from "primereact/utils";

import { flagUrl, resolveFlag } from "./CountryFlag";

import type { IClub } from "@/domain";
import { crestUrl, findCatalogClub } from "@/utils";

interface IBackdropSideProps {
  club: IClub | undefined;
  side: "home" | "away";
}

const CREST_PIXELS = 240;

/**
 * Flag wash and a large crest on one edge; a crest that fails is dropped. A
 * national team's crest is its flag, so with a flag wash it is left out.
 */
const BackdropSide = ({ club, side }: IBackdropSideProps) => {
  const [crestFailed, setCrestFailed] = useState(false);
  if (!club) return null;
  const catalogClub = findCatalogClub(club.id, club.name);
  const flag = resolveFlag(club.country, catalogClub?.country);
  return (
    <div className={classNames("match-backdrop__side", `is-${side}`)}>
      {flag && (
        <img src={flagUrl(flag)} alt="" className="match-backdrop__flag" />
      )}
      {catalogClub && !crestFailed && !(flag && catalogClub.nation) && (
        <img
          src={crestUrl(catalogClub, CREST_PIXELS)}
          alt=""
          loading="lazy"
          className="match-backdrop__crest"
          onError={() => setCrestFailed(true)}
        />
      )}
    </div>
  );
};

interface IMatchBackdropProps {
  home: IClub | undefined;
  away: IClub | undefined;
}

/**
 * Decoration behind a featured match row: the home club's flag and crest on
 * the left edge, the away club's on the right, large and faded.
 */
const MatchBackdrop = ({ home, away }: IMatchBackdropProps) => (
  <div className="match-backdrop" aria-hidden>
    <BackdropSide club={home} side="home" />
    <BackdropSide club={away} side="away" />
  </div>
);

export default MatchBackdrop;
