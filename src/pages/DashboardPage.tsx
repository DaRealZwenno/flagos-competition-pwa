import { useState } from "react";
import { Link } from "react-router";
import StatCard from "../components/StatCard";
import { Card, PageTitle, Tag } from "../components/ui";
import { reloadCompetitions, selectCompetition, useCompetitions, useSelectedCompetition } from "../lib/competitions";
import { canCreateCompetition, useAuth } from "../lib/auth";
import { competitionStart, competitionState, publishCompetition } from "../services/competitionApi";
import { fmtDate, stateLabel } from "../lib/format";
import { Button } from "../components/ui";

function DashboardPage() {
  const { status, competitions, selectedId, error } = useCompetitions();
  const selected = useSelectedCompetition();
  const auth = useAuth();
  const [publishing, setPublishing] = useState(false);
  const [publishError, setPublishError] = useState("");
  const publish = async () => {
    if (!selected) return;
    setPublishing(true); setPublishError("");
    try {
      const ok = await publishCompetition(selected.id);
      if (!ok) setPublishError("Dir fehlt das Recht, diese Competition zu veröffentlichen.");
      await reloadCompetitions();
    } catch (e) {
      setPublishError(e instanceof Error ? e.message : "Veröffentlichen fehlgeschlagen.");
    } finally {
      setPublishing(false);
    }
  };
  const stats = selected ? [
    { label: "Teams", value: String(selected.teams.length) },
    { label: "Gruppen", value: String(selected.groups.length) },
    { label: "Felder", value: String(selected.fields.length) },
    { label: "Spiele", value: String(selected.games.length) },
  ] : [];
  const played = selected?.games.filter((g) => g.status === "finished").length ?? 0;

  return (
    <>
      {canCreateCompetition(auth) && (
        <div className="mb-4 flex justify-end">
          <Link to="/neu" className="inline-flex items-center rounded-lg border border-[#C6FF00] bg-[#C6FF00] px-3.5 py-2 text-sm font-semibold text-[#06111f] hover:brightness-110">+ Competition anlegen</Link>
        </div>
      )}
      <PageTitle title="Dashboard" sub="Alle Competitions auf einen Blick: Turniere und Spieltage. Wähle eine aus: Kennzahlen und Fortschritt darunter gelten für sie, ebenso Spielplan, Ergebnisse und Tabellen." />

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
              <div
                key={c.id}
                className={`flex flex-col rounded-2xl border p-6 transition ${on ? "border-[#C6FF00]/60 bg-[#C6FF00]/5" : "border-white/10 bg-[#0f1d31] hover:border-white/30"}`}
              >
                {/* Klick wählt aus und bleibt auf dem Dashboard */}
                <button type="button" onClick={() => selectCompetition(c.id)} aria-pressed={on} className="block w-full select-none text-left [-webkit-tap-highlight-color:transparent]">
                  <span className="flex items-start justify-between gap-2">
                    <span className="text-lg font-semibold">{c.name}</span>
                    <Tag tone={c.status === "draft" ? "warn" : st === "running" ? "accent" : st === "finished" ? "ok" : "muted"}>{c.status === "draft" ? "Entwurf" : stateLabel[st]}</Tag>
                  </span>
                  <span className="mt-1 block text-sm text-slate-400">{fmtDate(competitionStart(c))}</span>
                  <span className="mt-4 block text-sm text-slate-400">{c.teams.length} Teams · {c.games.length} Spiele · {c.games.filter((g) => g.status === "finished").length} beendet</span>
                </button>
                <Link
                  to="/spielplan" onClick={() => selectCompetition(c.id)}
                  className="mt-5 inline-flex w-fit items-center rounded-lg border border-white/15 bg-white/5 px-3.5 py-2 text-sm font-semibold hover:border-white/35"
                >
                  Zum Spielplan →
                </Link>
              </div>
            );
          })}
        </div>
      )}

      {selected && (
        <>
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-[#C6FF00]">{selected.name}</p>
          {selected.status === "draft" && (
            <Card className="mb-4" title="Entwurf" actions={<Button variant="primary" size="sm" onClick={() => void publish()} disabled={publishing}>{publishing ? "Wird veröffentlicht …" : "Veröffentlichen"}</Button>}>
              <p className="text-sm text-slate-300">Diese Competition ist noch nicht öffentlich: Nur du und die Leitung sehen sie. Mit „Veröffentlichen“ sehen sie alle (Spielplan, Ergebnisse, Tabellen).</p>
              {publishError && <p className="mt-2 text-sm text-red-300">{publishError}</p>}
            </Card>
          )}
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
