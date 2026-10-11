import type { AppPage } from "../types/navigation";

export const navigationItems: { id: AppPage; label: string }[] = [
  { id: "dashboard", label: "Dashboard" },
  { id: "tournament-control", label: "Turnierleitung" },
  { id: "teams", label: "Teams" },
  { id: "schedule", label: "Spielplan" },
  { id: "results", label: "Ergebnisse" },
  { id: "standings", label: "Tabellen" },
  { id: "public-display", label: "Public Display" },
  { id: "team-directory", label: "Team-Verzeichnis" },
];