import { useState } from "react";
import { Link } from "react-router";
import { refreshAuth, signOut, useAuth } from "../lib/auth";
import AdminLogin from "./AdminLogin";
import AdminLayout from "./AdminLayout";
import TeamsPage from "./TeamsPage";
import RequestsPage from "./RequestsPage";
import TeamImportsPage from "./TeamImportsPage";
import TemplatesPage from "./TemplatesPage";

type AdminPage = "teams" | "requests" | "imports" | "templates";

/** /admin – Plattform-Admins sehen den Admin-Bereich, alle anderen den Login */
export default function AdminRoute() {
  const { ready, isAdmin, email } = useAuth();
  const [adminPage, setAdminPage] = useState<AdminPage>("teams");

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#06111f]">
        <div className="text-sm text-slate-400">Lädt…</div>
      </div>
    );
  }
  // Angemeldet, aber kein Plattform-Admin: klar sagen, woran es liegt (statt noch einmal den Login zu zeigen)
  if (!isAdmin && email) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#06111f] px-4">
        <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-white/5 p-6 text-center">
          <h1 className="text-xl font-black text-white">Kein Zugriff</h1>
          <p className="mt-3 text-sm text-slate-300">
            Das Konto <b className="text-white">{email}</b> ist nicht als Plattform-Admin eingetragen.
          </p>
          <p className="mt-2 text-xs text-slate-400">Der Eintrag erfolgt in der Datenbank (Tabelle platform_admins).</p>
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            <Link to="/" className="rounded-lg border border-white/15 bg-white/5 px-3.5 py-2 text-sm font-semibold text-white hover:border-white/35">Zur App</Link>
            <button onClick={() => void signOut()} className="rounded-lg border border-white/15 px-3.5 py-2 text-sm text-slate-300 hover:border-white/35">Mit anderem Konto anmelden</button>
          </div>
        </div>
      </div>
    );
  }
  if (!isAdmin) return <AdminLogin onLogin={() => void refreshAuth()} />;

  return (
    <AdminLayout activePage={adminPage} onNavigate={setAdminPage}>
      {adminPage === "teams"    && <TeamsPage />}
      {adminPage === "imports"  && <TeamImportsPage />}
      {adminPage === "requests" && <RequestsPage />}
      {adminPage === "templates" && <TemplatesPage />}
    </AdminLayout>
  );
}
