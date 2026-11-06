import { useEffect, useState } from "react";
import { fetchDirectoryTeams } from "../services/directoryApi";
import type { DirectoryTeam } from "../types/directory";
import { PageTitle, selectCls } from "../components/ui";
import ViewToggle, { type ViewMode } from "../components/ViewToggle";
import { formatTeamCode } from "../lib/teamCode";


const AGE_GROUPS = [
  { value: "", label: "Alle Altersklassen" },
  { value: "senior", label: "Senior" },
  { value: "u19", label: "U19" },
  { value: "u16", label: "U16" },
  { value: "u13", label: "U13" },
  { value: "u11", label: "U11" },
];

const GENDER_CATEGORIES = [
  { value: "", label: "Alle Kategorien" },
  { value: "mixed", label: "Mixed" },
  { value: "men", label: "Herren" },
  { value: "women", label: "Damen" },
  { value: "open", label: "Open" },
];

function TeamCard({ team, listMode = false }: { team: DirectoryTeam; listMode?: boolean }) {
  const genderLabel: Record<string, string> = {
    mixed: "Mixed", men: "Herren", women: "Damen", open: "Open", other: "Sonstige",
  };
  const ageLabel: Record<string, string> = {
    senior: "Senior", u19: "U19", u16: "U16", u13: "U13", u11: "U11", other: "Sonstige",
  };

  const logo = team.logoUrl ? (
    <img src={team.logoUrl} alt="" className="w-12 h-12 rounded-xl object-contain bg-white/5 flex-shrink-0" />
  ) : (
    <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center flex-shrink-0">
      <span className="text-lg">🏈</span>
    </div>
  );

  const badges = (
    <div className="flex flex-wrap gap-2">
      <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-xs text-slate-300">
        {ageLabel[team.ageGroup] ?? team.ageGroup}
      </span>
      <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-xs text-slate-300">
        {genderLabel[team.genderCategory] ?? team.genderCategory}
      </span>
      {team.league && (
        <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-xs text-slate-300">
          {team.league}
        </span>
      )}
    </div>
  );

  const links = (team.website || team.instagram) ? (
    <div className="flex gap-3">
      {team.website && (
        <a href={team.website} target="_blank" rel="noopener noreferrer"
          className="text-xs text-[#C6FF00]/70 hover:text-[#C6FF00] transition">
          Website ↗
        </a>
      )}
      {team.instagram && (
        <a href={`https://instagram.com/${team.instagram.replace("@", "")}`}
          target="_blank" rel="noopener noreferrer"
          className="text-xs text-[#C6FF00]/70 hover:text-[#C6FF00] transition">
          Instagram ↗
        </a>
      )}
    </div>
  ) : null;

  if (listMode) {
    return (
      <div className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-4 hover:border-[#C6FF00]/30 hover:bg-white/[0.07] transition">
        {logo}
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-3 flex-wrap">
            <p className="font-mono text-xs text-[#C6FF00] tracking-widest">{formatTeamCode(team.teamCode)}</p>
            <h3 className="font-bold text-slate-50 truncate">{team.publicName}</h3>
            <p className="text-sm text-slate-400">{team.city}{team.state ? `, ${team.state}` : ""}</p>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            {badges}
            {links}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 hover:border-[#C6FF00]/30 hover:bg-white/[0.07] transition">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="font-mono text-xs text-[#C6FF00] tracking-widest mb-1">{formatTeamCode(team.teamCode)}</p>
          <h3 className="font-bold text-slate-50 truncate">{team.publicName}</h3>
          <p className="text-sm text-slate-400 mt-0.5">{team.city}{team.state ? `, ${team.state}` : ""}</p>
        </div>
        {logo}
      </div>
      <div className="mt-4">{badges}</div>
      {links && <div className="mt-3">{links}</div>}
    </div>
  );
}

function TeamDirectoryPublicPage() {
  const [teams, setTeams] = useState<DirectoryTeam[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [search, setSearch] = useState("");
  const [filterState, setFilterState] = useState("");
  const [filterAge, setFilterAge] = useState("");
  const [filterGender, setFilterGender] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("list");

  useEffect(() => {
    let cancelled = false;
    fetchDirectoryTeams()
      .then((list) => { if (!cancelled) setTeams(list); })
      .catch(() => { if (!cancelled) setLoadError(true); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const hasFilter = !!(search || filterState || filterAge || filterGender);
  const states = Array.from(new Set(teams.map(t => t.state).filter(Boolean))).sort();

  const filtered = teams.filter(t => {
    const q = search.toLowerCase();
    const matchSearch = !q ||
      t.publicName.toLowerCase().includes(q) ||
      t.teamCode.toLowerCase().includes(q) ||
      formatTeamCode(t.teamCode).toLowerCase().includes(q) ||
      t.city.toLowerCase().includes(q);
    const matchState = !filterState || t.state === filterState;
    const matchAge = !filterAge || t.ageGroup === filterAge;
    const matchGender = !filterGender || t.genderCategory === filterGender;
    return matchSearch && matchState && matchAge && matchGender;
  });

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <PageTitle
          title="Team-Verzeichnis"
          sub={loading ? "Lädt…" : `Flag Football Teams in Deutschland · ${teams.length} Teams · ${filtered.length} angezeigt`}
        />

        <ViewToggle value={viewMode} onChange={setViewMode} />
      </div>

      {/* Filter-Bar: Suche über die ganze Breite, darunter die Filter; der Zurücksetzen-Platz bleibt immer reserviert */}
      <div className="mb-6 flex flex-col gap-3">
        <input
          type="search"
          placeholder="Team, Code oder Stadt suchen…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:border-[#C6FF00]/50 focus:outline-none"
        />
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={filterState}
            onChange={e => setFilterState(e.target.value)}
            className={selectCls}
          >
            <option value="">Alle Bundesländer</option>
            {states.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <select
            value={filterAge}
            onChange={e => setFilterAge(e.target.value)}
            className={selectCls}
          >
            {AGE_GROUPS.map(g => <option key={g.value} value={g.value}>{g.label}</option>)}
          </select>
          <select
            value={filterGender}
            onChange={e => setFilterGender(e.target.value)}
            className={selectCls}
          >
            {GENDER_CATEGORIES.map(g => <option key={g.value} value={g.value}>{g.label}</option>)}
          </select>
          <button
            onClick={() => { setSearch(""); setFilterState(""); setFilterAge(""); setFilterGender(""); }}
            disabled={!hasFilter}
            tabIndex={hasFilter ? 0 : -1}
            aria-hidden={!hasFilter}
            className={`rounded-xl border border-white/10 px-4 py-2.5 text-sm text-slate-400 transition hover:text-slate-100 ${hasFilter ? "" : "invisible"}`}
          >
            Filter zurücksetzen
          </button>
        </div>
      </div>

      {/* Team Grid */}
      {loading ? (
        <div className="py-16 text-center text-slate-500">Teams werden geladen…</div>
      ) : loadError ? (
        <div className="py-16 text-center text-amber-300">Das Team-Verzeichnis konnte nicht geladen werden. Bitte später erneut versuchen.</div>
      ) : filtered.length === 0 ? (
        <div className="py-16 text-center text-slate-500">
          Keine Teams gefunden.
        </div>
      ) : viewMode === "list" ? (
        <div className="flex flex-col gap-3">
          {filtered.map(team => <TeamCard key={team.id} team={team} listMode />)}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {filtered.map(team => <TeamCard key={team.id} team={team} />)}
        </div>
      )}
    </div>
  );
}

export default TeamDirectoryPublicPage;
