import { TabPanel, TabView } from "primereact/tabview";

import ClubsHistory from "./components/ClubsHistory";
import HeadToHead from "./components/HeadToHead";
import PlayersHistory from "./components/PlayersHistory";

import { PageHeader } from "@/components";
import { useTournamentData } from "@/providers";
import { EmptyState, SectionCard } from "@/ui";

const History = () => {
  const { all } = useTournamentData();

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
        <TabView>
          <TabPanel header="S проти V">
            <PlayersHistory all={all} />
          </TabPanel>
          <TabPanel header="Клуби">
            <ClubsHistory all={all} />
          </TabPanel>
          <TabPanel header="Особисті зустрічі">
            <HeadToHead all={all} />
          </TabPanel>
        </TabView>
      )}
    </>
  );
};

export default History;
