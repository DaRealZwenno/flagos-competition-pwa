import type { AppPage } from "../types/navigation";
import { navigationItems } from "../data/navigationItems";
import { appVersion } from "../lib/pwaUpdate";

const NAV_ICONS: Record<string, string> = {
  "dashboard":          "◈",
  "competition-control": "⚑",
  "teams":              "◎",
  "schedule":           "▦",
  "results":            "✦",
  "standings":          "▲",
  "public-display":     "◉",
  "team-directory":     "⊞",
};

type AppLayoutProps = {
  children: React.ReactNode;
  activePage: AppPage;
  onNavigate: (page: AppPage) => void;
};

function AppLayout({ children, activePage, onNavigate }: AppLayoutProps) {
  return (
    <div className="flex min-h-screen bg-[#06111f] text-slate-50">

      {/* ── Left Sidebar (lg+) ── */}
      <aside className="hidden lg:flex lg:flex-col w-48 flex-shrink-0 border-r border-white/10 bg-[#080f1a]">
        {/* Logo */}
        <div className="px-5 py-6 border-b border-white/10">
          <div className="inline-flex rounded-full border border-[#C6FF00]/30 bg-[#C6FF00]/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.25em] text-[#C6FF00]">
            FlagOS
          </div>
        </div>

        {/* Nav items */}
        <nav className="flex flex-col gap-1 p-3 flex-1">
          {navigationItems.map((item) => {
            const isActive = item.id === activePage;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onNavigate(item.id)}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition ${
                  isActive
                    ? "bg-[#C6FF00]/15 text-[#C6FF00]"
                    : "text-slate-400 hover:bg-white/5 hover:text-slate-100"
                }`}
              >
                <span className="text-base w-5 text-center flex-shrink-0">
                  {NAV_ICONS[item.id] ?? "·"}
                </span>
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Active event pill */}
        <div className="m-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3">
          <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Demo-Event</p>
          <p className="mt-0.5 text-sm font-bold truncate">Donau Bowl</p>
          <p className="text-xs text-slate-400">8 Teams · 2 Felder</p>
        </div>

        {/* Version (zum Prüfen, was live ist) */}
        <p className="px-5 pb-4 text-[10px] text-slate-600" title={appVersion.buildId}>
          v{appVersion.version} · {appVersion.commit}{appVersion.dirty ? " ·dev" : ""}
        </p>
      </aside>

      {/* ── Main area ── */}
      <div className="flex flex-1 flex-col min-w-0">

        {/* Top header */}
        <header className="border-b border-white/10 px-5 py-5 sm:px-8">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-black tracking-tight sm:text-4xl">
                Competition
              </h1>
              <p className="mt-1 text-sm text-slate-400 sm:text-base">
                Your Game starts here. Zentrale Web-App für Turnier und Spieltag: Spielplan, Ergebnisse, Tabellen und Public Display.
              </p>
            </div>
            <div className="hidden sm:block flex-shrink-0 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 shadow-xl shadow-black/20">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Demo Event</p>
              <p className="mt-0.5 text-lg font-bold">Donau Bowl</p>
              <p className="text-sm text-slate-300">8 Teams · 2 Gruppen · 2 Felder</p>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 px-5 py-6 pb-24 sm:px-8 lg:pb-6">
          {children}
        </main>
      </div>

      {/* ── Bottom Tab Bar (< lg) ── */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 flex justify-center lg:hidden border-t border-white/10 bg-[#080f1a]/95 backdrop-blur-md overflow-x-auto">
        <div className="flex w-full max-w-2xl">
          {navigationItems.map((item) => {
            const isActive = item.id === activePage;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onNavigate(item.id)}
                className={`relative flex flex-col items-center gap-1 flex-1 px-2 py-3 text-center transition min-w-[4rem] ${
                  isActive ? "text-[#C6FF00]" : "text-slate-500 hover:text-slate-300"
                }`}
              >
                <span className={`text-2xl leading-none ${isActive ? "drop-shadow-[0_0_6px_#C6FF00]" : ""}`}>
                  {NAV_ICONS[item.id] ?? "·"}
                </span>
                <span className="text-[10px] font-semibold leading-tight truncate max-w-[3.5rem]">
                  {item.label}
                </span>
                {isActive && (
                  <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-6 h-0.5 rounded-full bg-[#C6FF00]" />
                )}
              </button>
            );
          })}
        </div>
      </nav>

    </div>
  );
}

export default AppLayout;
