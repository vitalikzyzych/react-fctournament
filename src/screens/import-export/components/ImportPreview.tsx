import {
  FORMAT_INFO,
  groupMatches,
  type IClub,
  type ITournamentFile,
} from "@/domain";
import { ClubLabel, FluentIcon, StatusTag } from "@/ui";
import { findCatalogClub } from "@/utils";

const ImportPreview = ({ file }: { file: ITournamentFile }) => {
  const played = file.matches.filter((m) => m.result !== null).length;
  const groupStage = groupMatches(file.matches);
  const playoffGames = file.matches.length - groupStage.length;
  const matchdays = new Set(groupStage.map((m) => m.matchday)).size;
  const withoutCrest = file.clubs.filter(
    (club) => !findCatalogClub(club.id, club.name)
  );
  const format = FORMAT_INFO[file.tournament.format];
  // A league is listed by pot, other formats by group.
  const sections: { id: string; name: string; clubs: IClub[] }[] = format.league
    ? [...new Set(file.clubs.map((club) => club.pot ?? 0))]
        .sort((a, b) => a - b)
        .map((pot) => ({
          id: `pot-${pot}`,
          name: `Кошик ${pot}`,
          clubs: file.clubs
            .filter((club) => (club.pot ?? 0) === pot)
            .sort(
              (a, b) =>
                a.owner.localeCompare(b.owner) ||
                (a.code ?? "").localeCompare(b.code ?? "", undefined, {
                  numeric: true,
                })
            ),
        }))
    : file.groups.map((group) => ({
        id: group.id,
        name: group.name,
        clubs: file.clubs.filter((club) => club.group === group.id),
      }));

  return (
    <div className="flex flex-column gap-3">
      <div className="flex flex-wrap align-items-center gap-2">
        <span className="text-xl font-bold">{file.tournament.name}</span>
        <StatusTag status={file.tournament.status} />
      </div>
      <div className="text-600 text-sm">
        id: <code>{file.tournament.id}</code> · № {file.tournament.number} ·{" "}
        {file.tournament.game} · формат {file.tournament.format} ({format.name})
      </div>
      <div className="flex flex-wrap gap-3 text-sm">
        <span>
          Клубів: <b>{file.clubs.length}</b>
        </span>
        {!format.league && (
          <span>
            Груп: <b>{file.groups.length}</b>
          </span>
        )}
        <span>
          Турів: <b>{matchdays}</b>
        </span>
        <span>
          {format.league ? "Матчів ліги" : "Матчів у групах"}:{" "}
          <b>{groupStage.length}</b>
        </span>
        {playoffGames > 0 && (
          <span>
            Матчів плей-офф: <b>{playoffGames}</b>
          </span>
        )}
        <span>
          З результатом: <b>{played}</b>
        </span>
      </div>
      {withoutCrest.length > 0 && (
        <div className="notice align-items-center text-sm">
          <FluentIcon name="Info" size={18} />
          <span>
            Немає логотипа для:{" "}
            {withoutCrest.map((club) => club.name).join(", ")}. Їх буде показано
            з першою літерою назви, поки каталог клубів не оновлять (npm run
            club-catalog).
          </span>
        </div>
      )}
      <div className="grid">
        {sections.map((section) => (
          <div key={section.id} className="col-12 sm:col-6">
            <div className="match-row-lite p-3 h-full">
              <div className="font-semibold mb-2">{section.name}</div>
              <div className="flex flex-column gap-1">
                {section.clubs.map((club) => (
                  <span
                    key={club.id}
                    className="flex align-items-center justify-content-between gap-2"
                  >
                    <ClubLabel
                      name={club.name}
                      clubId={club.id}
                      owner={club.owner}
                      country={club.country}
                      showFlag
                    />
                    {club.code && (
                      <span className="text-500 text-xs">{club.code}</span>
                    )}
                  </span>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ImportPreview;
