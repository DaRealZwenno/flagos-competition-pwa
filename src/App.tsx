import { useEffect } from "react";
import { BrowserRouter, Navigate, Route, Routes, useNavigate } from "react-router";
import Layout from "./layouts/Layout";
import DashboardPage from "./pages/DashboardPage";
import PlaceholderPage from "./pages/PlaceholderPage";
import TeamDirectoryPublicPage from "./pages/TeamDirectoryPublicPage";
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
    path: "teams",
    title: "Teams",
    description:
      "Übersicht aller teilnehmenden Teams mit Gruppen, Logos, Kontakten und später Teamzugängen.",
  },
  {
    path: "spielplan",
    title: "Spielplan",
    description:
      "Spielplan für Gruppenphase, Platzierungsspiele und Finals bzw. für einen Spieltag, auch über mehrere Felder hinweg.",
  },
  {
    path: "ergebnisse",
    title: "Ergebnisse",
    description:
      "Ergebniserfassung für Feldleitung und Turnierleitung mit späterer Live-Aktualisierung.",
  },
  {
    path: "tabellen",
    title: "Tabellen",
    description:
      "Gruppentabellen, Tie-Breaker, Platzierungen und automatische Fortschreibung nach Ergebnissen.",
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
