import ExportPanel from "./components/ExportPanel";
import ImportPanel from "./components/ImportPanel";

import { PageHeader } from "@/components";

const ImportExport = () => (
  <>
    <PageHeader title="Імпорт / Експорт" />
    <div className="grid">
      <div className="col-12 xl:col-7">
        <ImportPanel />
      </div>
      <div className="col-12 xl:col-5">
        <ExportPanel />
      </div>
    </div>
  </>
);

export default ImportExport;
