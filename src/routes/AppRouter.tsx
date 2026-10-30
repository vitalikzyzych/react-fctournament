import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";

import { ProgressSpinner } from "primereact/progressspinner";

import { AppLayout } from "@/components";

const Dashboard = lazy(() => import("@/screens/dashboard"));
const Tournaments = lazy(() => import("@/screens/tournaments"));
const TournamentDetails = lazy(() => import("@/screens/tournament-details"));
const History = lazy(() => import("@/screens/history"));
const ImportExport = lazy(() => import("@/screens/import-export"));

const ScreenFallback = () => (
  <div className="flex justify-content-center py-8">
    <ProgressSpinner
      style={{ width: "3rem", height: "3rem" }}
      strokeWidth="4"
    />
  </div>
);

const AppRouter = () => (
  <Suspense fallback={<ScreenFallback />}>
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<Dashboard />} />
        <Route path="tournaments" element={<Tournaments />} />
        <Route path="tournaments/:id" element={<TournamentDetails />} />
        <Route path="history" element={<History />} />
        <Route path="import" element={<ImportExport />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  </Suspense>
);

export default AppRouter;
