import { useState } from "react";

import { classNames } from "primereact/utils";

import { crestUrl, type ICatalogClub } from "@/utils";

interface IClubCrestProps {
  club: ICatalogClub | null;
  name: string;
  size?: "sm" | "lg";
}

const PIXELS = { sm: 40, lg: 96 };

/**
 * Club crest from the catalog. Without one (unknown club, or the image fails
 * to load) a neutral circle with the first letter keeps lists aligned.
 */
const ClubCrest = ({ club, name, size = "sm" }: IClubCrestProps) => {
  const [failed, setFailed] = useState(false);
  const className = classNames("club-crest", `club-crest--${size}`);

  if (!club || failed) {
    return (
      <span className={classNames(className, "club-crest--empty")} aria-hidden>
        {name.charAt(0).toUpperCase()}
      </span>
    );
  }
  return (
    <img
      src={crestUrl(club, PIXELS[size])}
      alt=""
      loading="lazy"
      className={className}
      onError={() => setFailed(true)}
    />
  );
};

export default ClubCrest;
