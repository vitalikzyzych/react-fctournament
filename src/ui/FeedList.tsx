import { useState } from "react";

import { Button } from "primereact/button";

import ClubCrest from "./ClubCrest";
import FluentIcon, { type IconName } from "./FluentIcon";

import {
  type FeedKind,
  type IClub,
  type IFeedEvent,
  playedAtMs,
} from "@/domain";
import { findCatalogClub, formatMatchTime, formatTimeRange } from "@/utils";

interface IFeedListProps {
  /** Newest first. */
  events: IFeedEvent[];
  clubsById: Map<string, IClub>;
  limit?: number;
}

const ICONS: Record<FeedKind, IconName> = {
  lead: "ArrowSwap",
  record: "Ribbon",
  streak: "DataHistogram",
  unbeaten: "DataLine",
  through: "ChevronRight",
  champion: "Trophy",
  upset: "Warning",
};

/** The tournament's story: one line per event, the newest on top. */
const FeedList = ({ events, clubsById, limit = 6 }: IFeedListProps) => {
  const [expanded, setExpanded] = useState(false);
  if (!events.length) {
    return (
      <div className="text-600">
        Події зʼявляться після перших результатів: нові лідери, серії, рекорди й
        сенсації.
      </div>
    );
  }
  const visible = expanded ? events : events.slice(0, limit);
  return (
    <div className="flex flex-column gap-2">
      <ul className="feed">
        {visible.map((event) => {
          const club = event.club ? clubsById.get(event.club) : undefined;
          const owner = event.player ?? club?.owner;
          const at = playedAtMs(event.match);
          // A run shows its whole period, from its first match to this one.
          const from = event.since ? playedAtMs(event.since) : null;
          return (
            <li key={`${event.id}:${event.title}`} className="feed__item">
              <span
                className={`feed__icon ${owner ? `feed__icon--${owner}` : ""}`}
              >
                <FluentIcon name={ICONS[event.kind]} size={16} />
              </span>
              <div className="flex flex-column min-w-0 flex-1">
                <span className="feed__title">
                  {club && (
                    <ClubCrest
                      club={findCatalogClub(club.id, club.name)}
                      name={club.name}
                    />
                  )}
                  <span>{event.title}</span>
                </span>
                {event.detail && (
                  <span className="text-sm text-600">{event.detail}</span>
                )}
              </div>
              {at !== null && (
                <span className="text-xs text-500 white-space-nowrap">
                  {from !== null && from !== at
                    ? formatTimeRange(from, at)
                    : formatMatchTime(at)}
                </span>
              )}
            </li>
          );
        })}
      </ul>
      {events.length > limit && (
        <Button
          label={expanded ? "Згорнути" : `Показати всі ${events.length}`}
          size="small"
          text
          className="align-self-start"
          onClick={() => setExpanded(!expanded)}
        />
      )}
    </div>
  );
};

export default FeedList;
