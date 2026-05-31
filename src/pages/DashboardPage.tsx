import StatCard from "../components/StatCard";

const tournamentStats = [
  { label: "Teams", value: "8" },
  { label: "Gruppen", value: "2" },
  { label: "Felder", value: "2" },
  { label: "Spiele", value: "24" },
];

function DashboardPage() {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 shadow-2xl shadow-black/20 sm:p-8">
      <div className="mb-8">
        <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[#C6FF00]">
          Dashboard
        </p>

        <h2 className="mt-3 text-2xl font-black sm:text-4xl">
          Turnierstatus auf einen Blick.
        </h2>

        <p className="mt-3 max-w-2xl text-slate-300">
          Grundlage für Spielplan, Ergebniserfassung, Tabellen und öffentliche
          Anzeigen. Aktuell noch mit lokalen Dummy-Daten.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {tournamentStats.map((item) => (
          <StatCard key={item.label} label={item.label} value={item.value} />
        ))}
      </div>

      <div className="mt-8 rounded-2xl border border-[#C6FF00]/20 bg-[#C6FF00]/10 p-5">
        <p className="text-sm font-bold uppercase tracking-[0.2em] text-[#C6FF00]">
          MVP-Fokus
        </p>
        <p className="mt-2 text-slate-100">
          Erst stabile Struktur, dann Navigation, danach Dummy-Daten für Teams,
          Gruppen, Spielplan und Tabellen.
        </p>
      </div>
    </div>
  );
}

export default DashboardPage;