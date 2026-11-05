import { useState } from "react";

import { TabPanel, TabView } from "primereact/tabview";

import ClubsHistory from "./components/ClubsHistory";
import HeadToHead from "./components/HeadToHead";
import PlayersHistory from "./components/PlayersHistory";

import { PageHeader } from "@/components";
import { playoffMatches } from "@/domain";
import { useTournamentData } from "@/providers";
import { EmptyState, PlayoffToggle, SectionCard } from "@/ui";

const History = () => {
  const { all } = useTournamentData();
  const [includePlayoff, setIncludePlayoff] = useState(true);
  const hasPlayoff = all.some((t) => playoffMatches(t.matches).length > 0);

  return (
    <>
      <PageHeader title="Історія та статистика" subtitle="Усі турніри разом" />
      {all.length === 0 ? (
        <SectionCard>
          <EmptyState
            icon="DataHistogram"
            title="Статистика зʼявиться після першого турніру"
          />
        </SectionCard>
      ) : (
        <>
          {hasPlayoff && (
            <div className="flex justify-content-end mb-3">
              <PlayoffToggle
                checked={includePlayoff}
                onChange={setIncludePlayoff}
              />
            </div>
          )}
          <TabView>
            <TabPanel header="S проти V">
              <PlayersHistory all={all} includePlayoff={includePlayoff} />
            </TabPanel>
            <TabPanel header="Клуби">
              <ClubsHistory all={all} includePlayoff={includePlayoff} />
            </TabPanel>
            <TabPanel header="Особисті зустрічі">
              <HeadToHead all={all} includePlayoff={includePlayoff} />
            </TabPanel>
          </TabView>
        </>
      )}
    </>
  );
};

export default History;
