import { useEffect } from "react";
import { BrowserRouter, Navigate, Route, Routes, useNavigate } from "react-router";
import Layout from "./layouts/Layout";
import DashboardPage from "./pages/DashboardPage";
import PlaceholderPage from "./pages/PlaceholderPage";
import TeamDirectoryPublicPage from "./pages/TeamDirectoryPublicPage";
import SchedulePage from "./pages/SchedulePage";
import ResultsPage from "./pages/ResultsPage";
import StandingsPage from "./pages/StandingsPage";
import TeamsPage from "./pages/TeamsPage";
import NewCompetitionPage from "./pages/NewCompetitionPage";
import AccountPage from "./pages/AccountPage";
import SettingsPage from "./pages/SettingsPage";
import AdminRoute from "./admin/AdminRoute";
import UpdateBanner from "./components/UpdateBanner";
import TitleBar from "./components/TitleBar";

const modules = [
  {
    path: "leitung",
    title: "Leitung",
    description:
      "Zentrale Steuerung für Check-in, Felder, Spielstatus, Rollen und operative Entscheidungen am Turnier- oder Spieltag.",
  },
  {
    path: "display",
    title: "Public Display",
    description:
      "Öffentliche Anzeige für Zuschauer, Hallenbildschirm, Beamer oder Livestream-Overlay.",
  },
];

/** Alter Einstieg `/#admin` → `/admin` */
function LegacyAdminHash() {
  const navigate = useNavigate();
  useEffect(() => {
    if (window.location.hash === "#admin") navigate("/admin", { replace: true });
  }, [navigate]);
  return null;
}

export default function App() {
  return (
    <BrowserRouter>
      <LegacyAdminHash />
      <TitleBar />
      <Routes>
        <Route path="admin" element={<AdminRoute />} />
        <Route element={<Layout />}>
          <Route index element={<DashboardPage />} />
          {modules.map((m) => (
            <Route key={m.path} path={m.path} element={<PlaceholderPage title={m.title} description={m.description} />} />
          ))}
          <Route path="teams" element={<TeamsPage />} />
          <Route path="spielplan" element={<SchedulePage />} />
          <Route path="ergebnisse" element={<ResultsPage />} />
          <Route path="tabellen" element={<StandingsPage />} />
          <Route path="neu" element={<NewCompetitionPage />} />
          <Route path="verzeichnis" element={<TeamDirectoryPublicPage />} />
          <Route path="konto" element={<AccountPage />} />
          <Route path="einstellungen" element={<SettingsPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <UpdateBanner />
    </BrowserRouter>
  );
}
