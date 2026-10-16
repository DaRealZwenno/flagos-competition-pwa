import { useNavigate } from "react-router";
import StatCard from "../components/StatCard";
import { Card, PageTitle, Tag } from "../components/ui";
import { reloadCompetitions, selectCompetition, useCompetitions, useSelectedCompetition } from "../lib/competitions";
import { competitionStart, competitionState } from "../services/competitionApi";
import { fmtDate, stateLabel } from "../lib/format";
import { Button } from "../components/ui";

function DashboardPage() {
  const { status, competitions, selectedId, error } = useCompetitions();
  const selected = useSelectedCompetition();
  const navigate = useNavigate();
  const stats = selected ? [
    { label: "Teams", value: String(selected.teams.length) },
    { label: "Gruppen", value: String(selected.groups.length) },
    { label: "Felder", value: String(selected.fields.length) },
    { label: "Spiele", value: String(selected.games.length) },
  ] : [];
  const played = selected?.games.filter((g) => g.status === "finished").length ?? 0;

  return (
    <>
      <PageTitle title="Dashboard" sub="Alle Competitions auf einen Blick: Turniere und Spieltage. Wähle eine aus, dann zeigen Spielplan, Ergebnisse und Tabellen sie an." />

      {status === "loading" && <p className="text-sm text-slate-400">Lädt …</p>}
      {status === "error" && (
        <Card title="Daten nicht erreichbar" actions={<Button size="sm" onClick={() => void reloadCompetitions()}>Erneut versuchen</Button>}>
          <p className="text-sm text-slate-300">Die Daten konnten nicht geladen werden{error ? ` (${error})` : ""}.</p>
        </Card>
      )}
      {status === "ready" && competitions.length === 0 && (
        <Card><p className="text-sm text-slate-300">Es gibt noch keine Competition. Sobald ein Turnier oder Spieltag angelegt und freigegeben ist, erscheint er hier.</p></Card>
      )}

      {competitions.length > 0 && (
        <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {competitions.map((c) => {
            const st = competitionState(c);
            const on = c.id === selectedId;
            return (
              <button
                key={c.id} type="button"
                onClick={() => { selectCompetition(c.id); navigate("/spielplan"); }}
                className={`rounded-2xl border p-5 text-left transition ${on ? "border-[#C6FF00]/60 bg-[#C6FF00]/5" : "border-white/10 bg-[#0f1d31] hover:border-white/30"}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="font-semibold">{c.name}</p>
                  <Tag tone={st === "running" ? "accent" : st === "finished" ? "ok" : "muted"}>{stateLabel[st]}</Tag>
                </div>
                <p className="mt-1 text-xs text-slate-400">{fmtDate(competitionStart(c))}</p>
                <p className="mt-3 text-xs text-slate-400">{c.teams.length} Teams · {c.games.length} Spiele · {c.games.filter((g) => g.status === "finished").length} beendet</p>
              </button>
            );
          })}
        </div>
      )}

      {selected && (
        <>
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-[#C6FF00]">{selected.name}</p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {stats.map((item) => <StatCard key={item.label} label={item.label} value={item.value} />)}
          </div>
          <Card className="mt-6" title="Fortschritt">
            <p className="text-sm text-slate-300">{played} von {selected.games.length} Spielen beendet.</p>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
              <div className="h-full rounded-full bg-[#C6FF00]" style={{ width: `${selected.games.length ? Math.round((played / selected.games.length) * 100) : 0}%` }} />
            </div>
          </Card>
        </>
      )}
    </>
  );
}

export default DashboardPage;
