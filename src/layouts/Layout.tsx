// Grundlayout: schmale Seitenleiste mit Icons (Desktop/Tablet) bzw. Kopfleiste (schmal) – wie Broadcast und Stadium
import { Link, NavLink, Outlet } from "react-router";
import { useUpdateAvailable } from "../lib/pwaUpdate";
import { useAuth } from "../lib/auth";

const NAV = [
  { to: "/", label: "Dashboard", title: "Dashboard", end: true, icon: "M4 4h7v7H4zM13 4h7v4h-7zM13 11h7v9h-7zM4 14h7v6H4z" },
  { to: "/leitung", label: "Leitung", title: "Leitung", end: false, icon: "M5 21V4m0 0h11l-2 4 2 4H5" },
  { to: "/teams", label: "Teams", title: "Teams", end: false, icon: "M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm-6 9a6 6 0 0 1 12 0m1.5-9a2.5 2.5 0 1 0 0-5M17 14.5a5 5 0 0 1 4 5" },
  { to: "/spielplan", label: "Spielplan", title: "Spielplan", end: false, icon: "M7 3v3m10-3v3M4 9h16M5 5h14a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Zm3 8h3v3H8z" },
  { to: "/ergebnisse", label: "Ergebnisse", title: "Ergebnisse", end: false, icon: "M4 6h16v12H4zM12 6v12M7 10h2m6 0h2M7 14h2m6 0h2" },
  { to: "/tabellen", label: "Tabellen", title: "Tabellen", end: false, icon: "M4 20V11m5 9V4m5 16v-7m5 7V8" },
  { to: "/display", label: "Display", title: "Public Display", end: false, icon: "M3 5h18v11H3zM8 20h8m-4-4v4" },
  { to: "/verzeichnis", label: "Verzeichnis", title: "Team-Verzeichnis", end: false, icon: "M6 3h12v18H6zM9 7h6M9 11h6M9 15h4" },
];

function Icon({ d }: { d: string }) {
  return <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d={d} /></svg>;
}

const GEAR = "M12 15.2a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4Z M19.4 13.5a7.6 7.6 0 0 0 0-3l2-1.6-2-3.4-2.4 1a7.5 7.5 0 0 0-2.6-1.5L14 2.5h-4l-.4 2.5A7.5 7.5 0 0 0 7 6.5l-2.4-1-2 3.4 2 1.6a7.6 7.6 0 0 0 0 3l-2 1.6 2 3.4 2.4-1a7.5 7.5 0 0 0 2.6 1.5l.4 2.5h4l.4-2.5a7.5 7.5 0 0 0 2.6-1.5l2.4 1 2-3.4z";
const PERSON = "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-7 8a7 7 0 0 1 14 0";
const SHIELD = "M12 3 4.5 6v5.5c0 4.4 3 8.2 7.5 9.5 4.5-1.3 7.5-5.1 7.5-9.5V6z";

const link = ({ isActive }: { isActive: boolean }) =>
  `flex flex-col items-center gap-1 rounded-xl px-1 py-2 text-[11px] font-semibold ${isActive ? "bg-white/5 text-[#C6FF00]" : "text-slate-400 hover:bg-white/5 hover:text-slate-100"}`;

export default function Layout() {
  const update = useUpdateAvailable();
  const { email, isAdmin } = useAuth();
  const mobileNav = [
    ...NAV.map((n) => ({ to: n.to, label: n.title, end: n.end })),
    ...(isAdmin ? [{ to: "/admin", label: "Admin", end: false }] : []),
    { to: "/konto", label: email ? "Konto" : "Anmelden", end: false },
    { to: "/einstellungen", label: update ? "Einstellungen ●" : "Einstellungen", end: false },
  ];
  return (
    <div className="min-h-screen md:pl-[88px]">
      <aside style={{ top: "var(--tb)" }} className="fixed bottom-0 left-0 z-40 hidden w-[88px] flex-col overflow-y-auto border-r border-white/10 bg-[#081426] md:flex">
        {/* Logo = Startseite (wie Broadcast: Trennstrich darunter) */}
        <Link to="/" className="group flex flex-col items-center gap-1 border-b border-white/10 px-2 py-3" title="FlagOS Competition – zur Startseite" aria-label="FlagOS Competition – zur Startseite">
          <img src="/icons/flagos-icon.svg" alt="" className="h-9 w-9 flex-none rounded-xl" />
          <span className="text-[11px] font-black leading-none tracking-wide group-hover:text-[#C6FF00]">COMP</span>
        </Link>
        <nav className="flex flex-col gap-1 p-2">
          {NAV.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.end} className={link} title={n.title}><Icon d={n.icon} />{n.label}</NavLink>
          ))}
        </nav>
        <div className="mt-auto flex flex-col gap-1 p-2">
          {isAdmin && <NavLink to="/admin" className={link} title="Admin-Bereich"><Icon d={SHIELD} />Admin</NavLink>}
          <NavLink to="/konto" className={link} title={email ? `Konto · ${email}` : "Anmelden"}>
            {email
              ? <span className="grid h-6 w-6 place-items-center rounded-full bg-[#C6FF00] text-xs font-black text-[#06111f]">{(email[0] || "?").toUpperCase()}</span>
              : <Icon d={PERSON} />}
            {email ? "Konto" : "Anmelden"}
          </NavLink>
          <NavLink to="/einstellungen" className={link} title="Einstellungen">
            <span className="relative"><Icon d={GEAR} />{update && <span className="absolute -right-1.5 -top-1 grid h-4 w-4 place-items-center rounded-full bg-[#C6FF00] text-[10px] font-black text-[#06111f]">1</span>}</span>
            Einstellungen
          </NavLink>
        </div>
      </aside>
      <header style={{ top: "var(--tb)" }} className="sticky z-40 flex items-center gap-2 border-b border-white/10 bg-[#081426]/95 px-3 py-2 backdrop-blur md:hidden">
        <Link to="/" aria-label="Zur Startseite"><img src="/icons/flagos-icon.svg" alt="" className="h-7 w-7" /></Link>
        <nav className="flex flex-1 gap-1 overflow-x-auto">
          {mobileNav.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.end}
              className={({ isActive }) => `whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-semibold ${isActive ? "bg-white/10 text-[#C6FF00]" : "text-slate-300"}`}>{n.label}</NavLink>
          ))}
        </nav>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6 md:px-8 md:py-8">
        <Outlet />
      </main>
    </div>
  );
}
