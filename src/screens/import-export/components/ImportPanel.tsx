import { type ChangeEvent, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import { Button } from "primereact/button";
import { InputTextarea } from "primereact/inputtextarea";

import ImportPreview from "./ImportPreview";

import {
  type IValidationReport,
  parseJson,
  validateTournamentFile,
} from "@/domain";
import { useToast, useTournamentData } from "@/providers";
import { importTournament } from "@/source/TournamentSource";
import { FluentIcon, SectionCard } from "@/ui";

const IssueList = ({
  items,
  kind,
}: {
  items: string[];
  kind: "error" | "warning";
}) =>
  items.length ? (
    <div
      className={
        kind === "error"
          ? "notice notice--error flex-column"
          : "notice notice--warning flex-column"
      }
    >
      <div className="flex align-items-center gap-2 font-semibold mb-2">
        <FluentIcon
          name={kind === "error" ? "ErrorCircle" : "Warning"}
          size={18}
        />
        {kind === "error"
          ? `Помилки (${items.length})`
          : `Попередження (${items.length})`}
      </div>
      <ul className="m-0 pl-4 flex flex-column gap-1 text-sm">
        {items.map((item, index) => (
          <li key={index}>{item}</li>
        ))}
      </ul>
    </div>
  ) : null;

const ImportPanel = () => {
  const { tournaments } = useTournamentData();
  const { show } = useToast();
  const navigate = useNavigate();
  const fileInput = useRef<HTMLInputElement>(null);

  const [text, setText] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [report, setReport] = useState<IValidationReport | null>(null);
  const [importing, setImporting] = useState(false);

  const validate = (source: string) => {
    const parsed = parseJson(source);
    setReport(
      "error" in parsed
        ? { file: null, errors: [parsed.error], warnings: [] }
        : validateTournamentFile(parsed.value, { existing: tournaments })
    );
  };

  const onFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const content = await file.text();
    setFileName(file.name);
    setText(content);
    validate(content);
  };

  const confirmImport = async () => {
    if (!report?.file) return;
    const { tournament } = report.file;
    setImporting(true);
    try {
      await importTournament(report.file);
      show("success", "Турнір імпортовано", tournament.name);
      navigate(`/tournaments/${tournament.id}`);
    } catch (error) {
      show(
        "error",
        "Не вдалося імпортувати",
        error instanceof Error ? error.message : String(error)
      );
      setImporting(false);
    }
  };

  const reset = () => {
    setText("");
    setFileName(null);
    setReport(null);
  };

  return (
    <SectionCard title="Імпорт турніру з JSON">
      <p className="mt-0 text-600 line-height-3">
        Оберіть файл або вставте JSON (наприклад, з ChatGPT). Формат описано в{" "}
        <code>docs/json-format.md</code>, приклади лежать у{" "}
        <code>examples/</code>.
      </p>

      <input
        ref={fileInput}
        type="file"
        accept=".json,application/json"
        hidden
        onChange={onFile}
      />
      <div className="flex flex-wrap gap-2 mb-3">
        <Button
          label="Обрати файл"
          icon={<FluentIcon name="ArrowUpload" />}
          onClick={() => fileInput.current?.click()}
        />
        <Button
          label="Перевірити"
          icon={<FluentIcon name="CheckmarkCircle" />}
          outlined
          disabled={!text.trim()}
          onClick={() => validate(text)}
        />
        {(text || report) && (
          <Button label="Очистити" text severity="secondary" onClick={reset} />
        )}
        {fileName && (
          <span className="align-self-center text-600 text-sm">{fileName}</span>
        )}
      </div>

      <InputTextarea
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          setReport(null);
        }}
        rows={8}
        placeholder='{ "schemaVersion": 1, "tournament": { ... }, ... }'
        className="json-textarea mb-3"
      />

      {report && (
        <div className="flex flex-column gap-3">
          <IssueList items={report.errors} kind="error" />
          <IssueList items={report.warnings} kind="warning" />
          {report.file && (
            <>
              <div className="flex align-items-center gap-2 text-green-400 font-semibold">
                <FluentIcon name="CheckmarkCircle" size={18} /> Файл коректний
              </div>
              <ImportPreview file={report.file} />
              <div>
                <Button
                  label="Імпортувати турнір"
                  icon={<FluentIcon name="ArrowImport" />}
                  loading={importing}
                  onClick={confirmImport}
                />
              </div>
            </>
          )}
        </div>
      )}
    </SectionCard>
  );
};

export default ImportPanel;
