import { ConfirmDialog } from "primereact/confirmdialog";

import { FirebaseSetupNotice } from "@/components";
import { IS_FIREBASE_CONFIGURED } from "@/constants/env";
import { ToastProvider, TournamentDataProvider } from "@/providers";
import AppRouter from "@/routes/AppRouter";

const App = () => {
  if (!IS_FIREBASE_CONFIGURED) return <FirebaseSetupNotice />;

  return (
    <ToastProvider>
      <TournamentDataProvider>
        <ConfirmDialog />
        <AppRouter />
      </TournamentDataProvider>
    </ToastProvider>
  );
};

export default App;
