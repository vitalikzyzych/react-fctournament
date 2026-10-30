import { Button } from "primereact/button";

import { SCHEMA_VERSION, toClubCatalog, toTournamentFile } from "@/domain";
import { useToast, useTournamentData } from "@/providers";
import { FluentIcon, SectionCard, StatusTag } from "@/ui";
import { downloadJson } from "@/utils";

const today = () => new Date().toISOString().slice(0, 10);

const ExportPanel = () => {
  const { all, tournaments } = useTournamentData();
  const { show } = useToast();

  const exportAll = () =>
    downloadJson(`fc-tournaments-backup-${today()}.json`, {
      schemaVersion: SCHEMA_VERSION,
      exportedAt: new Date().toISOString(),
      tournaments: all.map(({ tournament, matches }) =>
        toTournamentFile(tournament, matches)
      ),
    });

  const copyClubs = async () => {
    try {
      await navigator.clipboard.writeText(
        JSON.stringify(toClubCatalog(tournaments), null, 2)
      );
      show("success", "Список клубів скопійовано");
    } catch {
      show(
        "error",
        "Не вдалося скопіювати",
        "Скористайтеся завантаженням файлу"
      );
    }
  };

  return (
    <div className="flex flex-column gap-3">
      <SectionCard title="Експорт">
        {all.length === 0 ? (
          <div className="text-600">Ще немає турнірів для експорту.</div>
        ) : (
          <div className="flex flex-column gap-2">
            {all.map(({ tournament, matches }) => (
              <div
                key={tournament.id}
                className="flex align-items-center justify-content-between gap-2 match-row-lite"
              >
                <div className="min-w-0">
                  <div className="font-semibold">{tournament.name}</div>
                  <div className="text-500 text-sm">{tournament.id}.json</div>
                </div>
                <div className="flex align-items-center gap-2">
                  <StatusTag status={tournament.status} />
                  <Button
                    icon={<FluentIcon name="ArrowDownload" />}
                    text
                    aria-label={`Експорт ${tournament.name}`}
                    onClick={() =>
                      downloadJson(
                        `${tournament.id}.json`,
                        toTournamentFile(tournament, matches)
                      )
                    }
                  />
                </div>
              </div>
            ))}
          </div>
        )}
        <div className="flex flex-wrap gap-2 mt-3">
          <Button
            label="Резервна копія всіх турнірів"
            icon={<FluentIcon name="ArrowDownload" />}
            outlined
            disabled={all.length === 0}
            onClick={exportAll}
          />
        </div>
      </SectionCard>

      <SectionCard title="Для ChatGPT">
        <p className="mt-0 text-600 line-height-3">
          Список усіх відомих клубів з їхніми id. Передайте його ChatGPT разом з
          описом формату, щоб у нових файлах клуби мали ті самі id і їхня
          історія не розділялася.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button
            label="Скопіювати список клубів"
            icon={<FluentIcon name="Copy" />}
            outlined
            disabled={tournaments.length === 0}
            onClick={copyClubs}
          />
          <Button
            label="Завантажити clubs.json"
            icon={<FluentIcon name="ArrowDownload" />}
            text
            disabled={tournaments.length === 0}
            onClick={() =>
              downloadJson("clubs.json", toClubCatalog(tournaments))
            }
          />
        </div>
      </SectionCard>
    </div>
  );
};

export default ExportPanel;
