import { useState } from "react";
import AppLayout from "./layouts/AppLayout";
import DashboardPage from "./pages/DashboardPage";
import PlaceholderPage from "./pages/PlaceholderPage";
import type { AppPage } from "./types/navigation";

const pageContent: Record<
  Exclude<AppPage, "dashboard">,
  { title: string; description: string }
> = {
  "tournament-control": {
    title: "Turnierleitung",
    description:
      "Zentrale Steuerung für Check-in, Felder, Spielstatus, Rollen und operative Entscheidungen am Turniertag.",
  },
  teams: {
    title: "Teams",
    description:
      "Übersicht aller teilnehmenden Teams mit Gruppen, Logos, Kontakten und später Teamzugängen.",
  },
  schedule: {
    title: "Spielplan",
    description:
      "Spielplan für Gruppenphase, Platzierungsspiele und Finals über mehrere Felder hinweg.",
  },
  results: {
    title: "Ergebnisse",
    description:
      "Ergebniserfassung für Field Manager und Turnierleitung mit späterer Live-Aktualisierung.",
  },
  standings: {
    title: "Tabellen",
    description:
      "Gruppentabellen, Tie-Breaker, Platzierungen und automatische Fortschreibung nach Ergebnissen.",
  },
  "public-display": {
    title: "Public Display",
    description:
      "Öffentliche Anzeige für Zuschauer, Hallenbildschirm, Beamer oder Livestream-Overlay.",
  },
};

function App() {
  const [activePage, setActivePage] = useState<AppPage>("dashboard");

  const currentPage =
    activePage === "dashboard" ? (
      <DashboardPage />
    ) : (
      <PlaceholderPage
        title={pageContent[activePage].title}
        description={pageContent[activePage].description}
      />
    );

  return (
    <AppLayout activePage={activePage} onNavigate={setActivePage}>
      {currentPage}
    </AppLayout>
  );
}

export default App;