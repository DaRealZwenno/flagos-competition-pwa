// Rahmen für alle Seiten, die eine Competition anzeigen: Titel, Auswahl, Lade-/Fehler-/Leerzustand.
import type { ReactNode } from "react";
import { selectCompetition, reloadCompetitions, useCompetitions } from "../lib/competitions";
import type { Competition } from "../types/competition";
import { competitionState, competitionStart } from "../services/competitionApi";
import { fmtDate, stateLabel } from "../lib/format";
import { Button, Card, PageTitle } from "./ui";

export function CompetitionPicker() {
  const { competitions, selectedId } = useCompetitions();
  if (competitions.length < 2) return null;
  return (
    <label className="mb-5 flex flex-wrap items-center gap-3 text-xs font-semibold text-slate-400">
      Competition
      <select
        value={selectedId ?? ""}
        onChange={(e) => selectCompetition(e.target.value)}
        className="rounded-xl border border-white/10 bg-[#06111f] px-4 py-2 text-sm text-slate-100 focus:border-[#C6FF00]/50 focus:outline-none"
      >
        {competitions.map((c) => (
          <option key={c.id} value={c.id}>{c.name} · {fmtDate(competitionStart(c))} · {stateLabel[competitionState(c)]}</option>
        ))}
      </select>
    </label>
  );
}

export default function CompetitionPage({ title, sub, children }: {
  title: string; sub: string; children: (c: Competition) => ReactNode;
}) {
  const { status, competitions, selectedId, error } = useCompetitions();
  const c = competitions.find((x) => x.id === selectedId);
  return (
    <>
      <PageTitle title={title} sub={sub} />
      {status === "loading" && <p className="text-sm text-slate-400">Lädt …</p>}
      {status === "error" && (
        <Card title="Daten nicht erreichbar" actions={<Button size="sm" onClick={() => void reloadCompetitions()}>Erneut versuchen</Button>}>
          <p className="text-sm text-slate-300">Die Daten konnten nicht geladen werden{error ? ` (${error})` : ""}. Bitte Verbindung prüfen.</p>
        </Card>
      )}
      {status === "ready" && error && c && (
        <p className="mb-4 rounded-lg border border-amber-400/40 bg-amber-400/10 px-3 py-2 text-xs text-amber-300">Aktualisierung gerade nicht möglich – dies ist der zuletzt geladene Stand.</p>
      )}
      {status === "ready" && !c && (
        <Card><p className="text-sm text-slate-300">Es gibt noch keine Competition. Sobald ein Turnier oder Spieltag angelegt und freigegeben ist, erscheint er hier.</p></Card>
      )}
      {c && (<><CompetitionPicker />{children(c)}</>)}
    </>
  );
}
