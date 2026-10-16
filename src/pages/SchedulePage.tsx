import { useState } from "react";
import CompetitionPage from "../components/CompetitionPage";
import Collapsible from "../components/Collapsible";
import { Card, Tag, selectCls } from "../components/ui";
import { fmtTime, gameStatusLabel, roundOf, scoreText, teamName } from "../lib/format";
import type { Competition, CompetitionGame } from "../types/competition";

/** Abschnitte des Spielplans: Vorrunde, K.-o.-Phase, übrige Spiele */
const SECTIONS: { title: string; phases: CompetitionGame["phase"][] }[] = [
  { title: "Vorrunde", phases: ["group_stage"] },
  { title: "K.-o.-Phase", phases: ["semifinal", "placement", "final"] },
  { title: "Weitere Spiele", phases: ["other"] },
];

function GameList({ c, games }: { c: Competition; games: CompetitionGame[] }) {
  const fieldName = (id?: string) => c.fields.find((f) => f.id === id)?.name ?? "–";
  const groupName = (id?: string) => c.groups.find((x) => x.id === id)?.name;
  // Spiele mit gleicher Startzeit zusammenfassen (parallele Felder)
  const slots = new Map<string, CompetitionGame[]>();
  for (const g of games) { const k = g.startsAt ?? "offen"; slots.set(k, [...(slots.get(k) ?? []), g]); }
  return (
    <div className="flex flex-col gap-3">
      {[...slots.entries()].map(([k, list]) => (
        <Card key={k} title={k === "offen" ? "Zeit offen" : fmtTime(k)}>
          <ul className="divide-y divide-white/10">
            {list.map((g) => (
              <li key={g.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-2.5 text-sm">
                <span className="w-24 flex-none text-xs text-slate-400">{fieldName(g.fieldId)}</span>
                <span className="w-32 flex-none text-xs text-slate-400">{roundOf(g, groupName(g.groupId))}</span>
                <span className="min-w-0 flex-1 truncate font-semibold">{teamName(c, g.homeTeamId)} <span className="font-normal text-slate-500">gegen</span> {teamName(c, g.awayTeamId)}</span>
                <span className="font-mono text-slate-200">{scoreText(g)}</span>
                <Tag tone={g.status === "running" ? "accent" : g.status === "finished" ? "ok" : g.status === "cancelled" ? "warn" : "muted"}>{gameStatusLabel[g.status]}</Tag>
              </li>
            ))}
          </ul>
        </Card>
      ))}
    </div>
  );
}

function Schedule({ c }: { c: Competition }) {
  const [field, setField] = useState("");
  const [group, setGroup] = useState("");
  const games = c.games.filter((g) => (!field || g.fieldId === field) && (!group || g.groupId === group));
  const sections = SECTIONS.map((s) => ({ ...s, games: games.filter((g) => s.phases.includes(g.phase)) })).filter((s) => s.games.length > 0);
  return (
    <>
      <div className="mb-5 flex flex-wrap gap-3">
        {c.fields.length > 1 && (
          <select value={field} onChange={(e) => setField(e.target.value)} className={selectCls}>
            <option value="">Alle Felder</option>
            {c.fields.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
          </select>
        )}
        {c.groups.length > 1 && (
          <select value={group} onChange={(e) => setGroup(e.target.value)} className={selectCls}>
            <option value="">Alle Gruppen</option>
            {c.groups.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
          </select>
        )}
      </div>
      {sections.length === 0 ? (
        <Card><p className="text-sm text-slate-300">Noch keine Spiele geplant.</p></Card>
      ) : (
        <div className="flex flex-col gap-4">
          {sections.map((s) => (
            <Collapsible key={s.title} title={s.title} hint={`${s.games.length} ${s.games.length === 1 ? "Spiel" : "Spiele"}`}>
              <GameList c={c} games={s.games} />
            </Collapsible>
          ))}
        </div>
      )}
    </>
  );
}

export default function SchedulePage() {
  return (
    <CompetitionPage title="Spielplan" sub="Alle Spiele nach Zeit, Feld und Gruppe, gegliedert in Vorrunde und K.-o.-Phase. Aktualisiert sich selbst.">
      {(c) => <Schedule c={c} />}
    </CompetitionPage>
  );
}
