import ClubLabel from "./ClubLabel";

import type { IClub, IPlayedMatch } from "@/domain";
import { formatScore } from "@/utils";

interface IMatchLineProps {
  match: IPlayedMatch;
  clubsById: Map<string, IClub>;
}

/** Home club, score, away club on one line, for lists of notable matches. */
const MatchLine = ({ match, clubsById }: IMatchLineProps) => {
  const home = clubsById.get(match.home);
  const away = clubsById.get(match.away);
  return (
    <div className="big-win">
      <ClubLabel
        name={home?.name ?? match.home}
        clubId={match.home}
        owner={home?.owner}
      />
      <span className="score-chip">{formatScore(match.result)}</span>
      <ClubLabel
        name={away?.name ?? match.away}
        clubId={match.away}
        owner={away?.owner}
        badgePosition="end"
      />
    </div>
  );
};

export default MatchLine;
