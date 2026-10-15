import { useEffect, useState } from "react";
import AppLayout from "./layouts/AppLayout";
import DashboardPage from "./pages/DashboardPage";
import PlaceholderPage from "./pages/PlaceholderPage";
import type { AppPage } from "./types/navigation";
import { supabase } from "./services/supabaseClient";
import AdminLogin from "./admin/AdminLogin";
import AdminLayout from "./admin/AdminLayout";
import TeamsPage from "./admin/TeamsPage";
import RequestsPage from "./admin/RequestsPage";
import TeamImportsPage from "./admin/TeamImportsPage";
import TeamDirectoryPublicPage from "./pages/TeamDirectoryPublicPage";
import UpdateBanner from "./components/UpdateBanner";

const pageContent: Record<
  Exclude<AppPage, "dashboard">,
  { title: string; description: string }
> = {
  "competition-control": {
    title: "Leitung",
    description:
      "Zentrale Steuerung für Check-in, Felder, Spielstatus, Rollen und operative Entscheidungen am Turnier- oder Spieltag.",
  },
  teams: {
    title: "Teams",
    description:
      "Übersicht aller teilnehmenden Teams mit Gruppen, Logos, Kontakten und später Teamzugängen.",
  },
  schedule: {
    title: "Spielplan",
    description:
      "Spielplan für Gruppenphase, Platzierungsspiele und Finals bzw. für einen Spieltag, auch über mehrere Felder hinweg.",
  },
  results: {
    title: "Ergebnisse",
    description:
      "Ergebniserfassung für Feldleitung und Turnierleitung mit späterer Live-Aktualisierung.",
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
  "team-directory": {
    title: "Team-Verzeichnis",
    description: "",
  },
};

type AdminPage = "teams" | "requests" | "imports";

function App() {
  const [activePage, setActivePage] = useState<AppPage>("dashboard");
  const [adminPage, setAdminPage] = useState<AdminPage>("teams");
  const [isAdmin, setIsAdmin] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [hash, setHash] = useState(window.location.hash);

  useEffect(() => {
    checkAuth();
    const { data: listener } = supabase.auth.onAuthStateChange(() => checkAuth());
    const onHash = () => setHash(window.location.hash);
    window.addEventListener("hashchange", onHash);
    return () => {
      listener.subscription.unsubscribe();
      window.removeEventListener("hashchange", onHash);
    };
  }, []);

  async function checkAuth() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setIsAdmin(false); setAuthChecked(true); return; }
    const { data } = await supabase.rpc("is_platform_admin");
    setIsAdmin(!!data);
    setAuthChecked(true);
  }

  if (!authChecked) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#06111f]">
        <div className="text-sm text-slate-400">Lädt…</div>
      </div>
    );
  }

  // Admin-Panel über URL-Hash #admin erreichbar
  const wantsAdmin = hash === "#admin" || isAdmin;

  if (wantsAdmin && !isAdmin) {
    return <AdminLogin onLogin={checkAuth} />;
  }

  if (isAdmin) {
    return (
      <>
        <AdminLayout activePage={adminPage} onNavigate={setAdminPage}>
          {adminPage === "teams"    && <TeamsPage />}
          {adminPage === "imports"  && <TeamImportsPage />}
          {adminPage === "requests" && <RequestsPage />}
        </AdminLayout>
        <UpdateBanner />
      </>
    );
  }

  // Normale Competition-PWA
  const currentPage =
    activePage === "dashboard" ? (
      <DashboardPage />
    ) : activePage === "team-directory" ? (
      <TeamDirectoryPublicPage />
    ) : (
      <PlaceholderPage
        title={pageContent[activePage].title}
        description={pageContent[activePage].description}
      />
    );

  return (
    <>
      <AppLayout activePage={activePage} onNavigate={setActivePage}>
        {currentPage}
      </AppLayout>
      <UpdateBanner />
    </>
  );
}

export default App;
