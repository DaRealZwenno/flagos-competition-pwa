import CompetitionPage from "../components/CompetitionPage";
import { Card, Tag } from "../components/ui";
import Matchup from "../components/Matchup";
import { fmtTime, roundOf, scoreText } from "../lib/format";
import type { Competition, CompetitionGame } from "../types/competition";

function GameRow({ c, g }: { c: Competition; g: CompetitionGame }) {
  const groupName = c.groups.find((x) => x.id === g.groupId)?.name;
  const field = c.fields.find((f) => f.id === g.fieldId)?.name;
  return (
    <li className="flex flex-wrap items-center gap-x-4 gap-y-1 py-3">
      <span className="w-14 flex-none text-xs text-slate-400">{fmtTime(g.startsAt)}</span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-semibold"><Matchup c={c} g={g} /></span>
        <span className="text-xs text-slate-400">{[field, roundOf(g, groupName)].filter(Boolean).join(" · ")}</span>
      </span>
      <span className={`font-mono text-2xl font-extrabold ${g.status === "running" ? "text-[#C6FF00]" : ""}`}>{scoreText(g)}</span>
    </li>
  );
}

function Results({ c }: { c: Competition }) {
  const running = c.games.filter((g) => g.status === "running");
  const finished = c.games.filter((g) => g.status === "finished").reverse();
  const upcoming = c.games.filter((g) => g.status === "scheduled");
  const empty = running.length + finished.length + upcoming.length === 0;
  return (
    <div className="flex flex-col gap-4">
      {empty && <Card><p className="text-sm text-slate-300">Noch keine Spiele.</p></Card>}
      {running.length > 0 && (
        <section className="rounded-2xl border border-[#C6FF00]/50 bg-[#C6FF00]/5 p-5 shadow-[0_0_0_1px_rgba(198,255,0,0.08)]">
          <div className="mb-3 flex flex-wrap items-center gap-3">
            <span className="relative flex h-2.5 w-2.5" aria-hidden>
              <span className="absolute inline-flex h-full w-full rounded-full bg-[#C6FF00]/60 motion-safe:animate-ping" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[#C6FF00]" />
            </span>
            <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-[#C6FF00]">Läuft gerade</h2>
            <Tag tone="accent">live</Tag>
          </div>
          <ul className="divide-y divide-[#C6FF00]/15">{running.map((g) => <GameRow key={g.id} c={c} g={g} />)}</ul>
        </section>
      )}
      {upcoming.length > 0 && (
        <Card title="Als Nächstes">
          <ul className="divide-y divide-white/10">{upcoming.slice(0, 8).map((g) => <GameRow key={g.id} c={c} g={g} />)}</ul>
          {upcoming.length > 8 && <p className="mt-2 text-xs text-slate-400">und {upcoming.length - 8} weitere im Spielplan</p>}
        </Card>
      )}
      {finished.length > 0 && (
        <Card title="Beendet">
          <ul className="divide-y divide-white/10">{finished.map((g) => <GameRow key={g.id} c={c} g={g} />)}</ul>
        </Card>
      )}
    </div>
  );
}

export default function ResultsPage() {
  return (
    <CompetitionPage title="Ergebnisse" sub="Laufende und beendete Spiele mit Stand, Gast links, Heim rechts. Eingeben und freigeben kommt mit einer späteren Stufe.">
      {(c) => <Results c={c} />}
    </CompetitionPage>
  );
}
