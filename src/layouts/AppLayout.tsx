import type { AppPage } from "../types/navigation";
import { navigationItems } from "../data/navigationItems";

type AppLayoutProps = {
  children: React.ReactNode;
  activePage: AppPage;
  onNavigate: (page: AppPage) => void;
};

function AppLayout({ children, activePage, onNavigate }: AppLayoutProps) {
  return (
    <main className="min-h-screen bg-[#06111f] text-slate-50">
      <section className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-5 py-6 sm:px-8 lg:px-10">
        <header className="flex flex-col gap-4 border-b border-white/10 pb-6 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="mb-3 inline-flex rounded-full border border-[#C6FF00]/30 bg-[#C6FF00]/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.25em] text-[#C6FF00]">
              FlagOS PWA
            </div>

            <h1 className="text-3xl font-black tracking-tight sm:text-5xl">
              Tournament Control
            </h1>

            <p className="mt-3 max-w-2xl text-base text-slate-300 sm:text-lg">
              Your Game starts here. Zentrale Web-App für Turnierleitung,
              Teams, Field Manager und Public Display.
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 px-5 py-4 shadow-2xl shadow-black/20">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
              Demo Event
            </p>
            <p className="mt-1 text-xl font-bold">Donau Bowl</p>
            <p className="text-sm text-slate-300">
              8 Teams · 2 Gruppen · 2 Felder
            </p>
          </div>
        </header>

        <section className="grid flex-1 gap-6 py-8 lg:grid-cols-[1.2fr_0.8fr]">
          {children}

          <aside className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 shadow-2xl shadow-black/20 sm:p-8">
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-slate-400">
              Navigation
            </p>

            <nav className="mt-5 grid gap-3">
              {navigationItems.map((item) => {
                const isActive = item.id === activePage;

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => onNavigate(item.id)}
                    className={`flex items-center justify-between rounded-2xl border px-5 py-4 text-left font-semibold transition ${
                      isActive
                        ? "border-[#C6FF00]/70 bg-[#C6FF00]/15 text-[#C6FF00]"
                        : "border-white/10 bg-[#0b1b2f] text-slate-100 hover:border-[#C6FF00]/60 hover:bg-[#102642]"
                    }`}
                  >
                    <span>{item.label}</span>
                    <span>{isActive ? "●" : "→"}</span>
                  </button>
                );
              })}
            </nav>

            <div className="mt-8 rounded-2xl bg-slate-950/50 p-5">
              <p className="text-sm font-semibold text-slate-300">
                Aktives Modul
              </p>
              <p className="mt-2 text-sm text-slate-400">
                Die Navigation läuft aktuell lokal per React-State. Später
                ersetzen wir das bei Bedarf durch echtes Routing.
              </p>
            </div>
          </aside>
        </section>
      </section>
    </main>
  );
}

export default AppLayout;