import { useState } from "react";
import { refreshAuth, useAuth } from "../lib/auth";
import AdminLogin from "./AdminLogin";
import AdminLayout from "./AdminLayout";
import TeamsPage from "./TeamsPage";
import RequestsPage from "./RequestsPage";
import TeamImportsPage from "./TeamImportsPage";
import TemplatesPage from "./TemplatesPage";

type AdminPage = "teams" | "requests" | "imports" | "templates";

/** /admin – Plattform-Admins sehen den Admin-Bereich, alle anderen den Login */
export default function AdminRoute() {
  const { ready, isAdmin } = useAuth();
  const [adminPage, setAdminPage] = useState<AdminPage>("teams");

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#06111f]">
        <div className="text-sm text-slate-400">Lädt…</div>
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
