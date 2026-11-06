import { classNames } from "primereact/utils";

import ClubCrest from "./ClubCrest";
import CountryFlag, { resolveFlag } from "./CountryFlag";
import PlayerBadge from "./PlayerBadge";

import type { PlayerId } from "@/domain";
import { findCatalogClub } from "@/utils";

interface IClubLabelProps {
  name: string;
  /** Club id, for the crest lookup; the name is tried when it is missing. */
  clubId?: string;
  owner?: PlayerId;
  /** Country from the tournament file; the catalog's country is the fallback. */
  country?: string;
  /** Flag after the name, for tables and lists (not for match rows). */
  showFlag?: boolean;
  /** League formats: the club's pot, shown as a small "К1" label. */
  pot?: number;
  /** "end" puts the badge after the name, for the away side of a match. */
  badgePosition?: "start" | "end";
  bold?: boolean;
  className?: string;
}

/** Player badge, crest, name and (optionally) the country flag. */
const ClubLabel = ({
  name,
  clubId,
  owner,
  country,
  showFlag,
  pot,
  badgePosition = "start",
  bold,
  className,
}: IClubLabelProps) => {
  const catalogClub = findCatalogClub(clubId, name);
  // A national team's crest is already its flag.
  const flag =
    showFlag && !catalogClub?.nation
      ? resolveFlag(country, catalogClub?.country)
      : null;

  return (
    <span
      className={classNames(
        "inline-flex align-items-center gap-2 min-w-0",
        { "flex-row-reverse": badgePosition === "end", "font-semibold": bold },
        className
      )}
    >
      {owner && <PlayerBadge player={owner} />}
      <ClubCrest club={catalogClub} name={name} />
      <span className="white-space-nowrap overflow-hidden text-overflow-ellipsis">
        {name}
      </span>
      {flag && <CountryFlag code={flag} title={country} />}
      {pot && (
        <span className="pot-tag" title={`Кошик ${pot}`}>
          К{pot}
        </span>
      )}
    </span>
  );
};

export default ClubLabel;
