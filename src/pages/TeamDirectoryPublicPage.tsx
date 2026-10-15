import { useEffect, useState } from "react";
import { supabase } from "../services/supabaseClient";
import type { DirectoryTeam } from "../admin/adminTypes";

type ViewMode = "grid" | "list";

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

  const logo = team.logo_url ? (
    <img src={team.logo_url} alt="" className="w-12 h-12 rounded-xl object-contain bg-white/5 flex-shrink-0" />
  ) : (
    <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center flex-shrink-0">
      <span className="text-lg">🏈</span>
    </div>
  );

  const badges = (
    <div className="flex flex-wrap gap-2">
      <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-xs text-slate-300">
        {ageLabel[team.age_group] ?? team.age_group}
      </span>
      <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-xs text-slate-300">
        {genderLabel[team.gender_category] ?? team.gender_category}
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
            <p className="font-mono text-xs text-[#C6FF00] tracking-widest">{team.team_code}</p>
            <h3 className="font-bold text-slate-50 truncate">{team.public_name}</h3>
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
          <p className="font-mono text-xs text-[#C6FF00] tracking-widest mb-1">{team.team_code}</p>
          <h3 className="font-bold text-slate-50 truncate">{team.public_name}</h3>
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
  const [search, setSearch] = useState("");
  const [filterState, setFilterState] = useState("");
  const [filterAge, setFilterAge] = useState("");
  const [filterGender, setFilterGender] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("directory_teams")
        .select("*, club:directory_clubs(*)")
        .eq("review_status", "approved")
        .order("public_name");
      if (cancelled) return;
      setTeams(data ?? []);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  const states = Array.from(new Set(teams.map(t => t.state).filter(Boolean))).sort();

  const filtered = teams.filter(t => {
    const q = search.toLowerCase();
    const matchSearch = !q ||
      t.public_name.toLowerCase().includes(q) ||
      t.team_code.toLowerCase().includes(q) ||
      t.city.toLowerCase().includes(q);
    const matchState = !filterState || t.state === filterState;
    const matchAge = !filterAge || t.age_group === filterAge;
    const matchGender = !filterGender || t.gender_category === filterGender;
    return matchSearch && matchState && matchAge && matchGender;
  });

  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 shadow-2xl shadow-black/20 sm:p-8">
      {/* Header */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[#C6FF00]">
            Team-Verzeichnis
          </p>
          <h2 className="mt-2 text-2xl font-black sm:text-4xl">
            Flag Football Teams in Deutschland.
          </h2>
          <p className="mt-2 text-slate-300">
            {loading ? "Lädt…" : `${teams.length} Teams · ${filtered.length} angezeigt`}
          </p>
        </div>

        {/* View Toggle */}
        <div className="flex flex-shrink-0 items-center gap-1 rounded-xl border border-white/10 bg-white/5 p-1">
          <button
            onClick={() => setViewMode("grid")}
            title="Kacheln"
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${viewMode === "grid" ? "bg-[#C6FF00] text-[#06111f]" : "text-slate-400 hover:text-slate-100"}`}
          >
            ⊞ Kacheln
          </button>
          <button
            onClick={() => setViewMode("list")}
            title="Liste"
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${viewMode === "list" ? "bg-[#C6FF00] text-[#06111f]" : "text-slate-400 hover:text-slate-100"}`}
          >
            ☰ Liste
          </button>
        </div>
      </div>

      {/* Filter-Bar */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <input
          type="search"
          placeholder="Team, Code oder Stadt suchen…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="flex-1 min-w-48 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:border-[#C6FF00]/50 focus:outline-none"
        />
        <select
          value={filterState}
          onChange={e => setFilterState(e.target.value)}
          className="rounded-xl border border-white/10 bg-[#06111f] px-4 py-2.5 text-sm text-slate-100 focus:border-[#C6FF00]/50 focus:outline-none"
        >
          <option value="">Alle Bundesländer</option>
          {states.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select
          value={filterAge}
          onChange={e => setFilterAge(e.target.value)}
          className="rounded-xl border border-white/10 bg-[#06111f] px-4 py-2.5 text-sm text-slate-100 focus:border-[#C6FF00]/50 focus:outline-none"
        >
          {AGE_GROUPS.map(g => <option key={g.value} value={g.value}>{g.label}</option>)}
        </select>
        <select
          value={filterGender}
          onChange={e => setFilterGender(e.target.value)}
          className="rounded-xl border border-white/10 bg-[#06111f] px-4 py-2.5 text-sm text-slate-100 focus:border-[#C6FF00]/50 focus:outline-none"
        >
          {GENDER_CATEGORIES.map(g => <option key={g.value} value={g.value}>{g.label}</option>)}
        </select>
        {(search || filterState || filterAge || filterGender) && (
          <button
            onClick={() => { setSearch(""); setFilterState(""); setFilterAge(""); setFilterGender(""); }}
            className="rounded-xl border border-white/10 px-4 py-2.5 text-sm text-slate-400 hover:text-slate-100 transition"
          >
            Filter zurücksetzen
          </button>
        )}
      </div>

      {/* Team Grid */}
      {loading ? (
        <div className="py-16 text-center text-slate-500">Teams werden geladen…</div>
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
