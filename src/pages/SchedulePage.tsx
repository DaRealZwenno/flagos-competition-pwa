import { useState } from "react";
import CompetitionPage from "../components/CompetitionPage";
import { Card, Tag } from "../components/ui";
import { fmtTime, gameStatusLabel, roundOf, scoreText, teamName } from "../lib/format";
import type { Competition } from "../types/competition";

function Schedule({ c }: { c: Competition }) {
  const [field, setField] = useState("");
  const [group, setGroup] = useState("");
  const games = c.games.filter((g) => (!field || g.fieldId === field) && (!group || g.groupId === group));
  const fieldName = (id?: string) => c.fields.find((f) => f.id === id)?.name ?? "–";
  const groupName = (id?: string) => c.groups.find((x) => x.id === id)?.name;
  // Spiele mit gleicher Startzeit zusammenfassen (parallele Felder)
  const slots = new Map<string, typeof games>();
  for (const g of games) { const k = g.startsAt ?? "offen"; slots.set(k, [...(slots.get(k) ?? []), g]); }
  const sel = "rounded-xl border border-white/10 bg-[#06111f] px-4 py-2 text-sm text-slate-100 focus:border-[#C6FF00]/50 focus:outline-none";
  return (
    <>
      <div className="mb-5 flex flex-wrap gap-3">
        {c.fields.length > 1 && (
          <select value={field} onChange={(e) => setField(e.target.value)} className={sel}>
            <option value="">Alle Felder</option>
            {c.fields.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
          </select>
        )}
        {c.groups.length > 1 && (
          <select value={group} onChange={(e) => setGroup(e.target.value)} className={sel}>
            <option value="">Alle Gruppen</option>
            {c.groups.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
          </select>
        )}
      </div>
      {games.length === 0 ? (
        <Card><p className="text-sm text-slate-300">Noch keine Spiele geplant.</p></Card>
      ) : (
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
      )}
    </>
  );
}

export default function SchedulePage() {
  return (
    <CompetitionPage title="Spielplan" sub="Alle Spiele nach Zeit, Feld und Gruppe. Aktualisiert sich selbst.">
      {(c) => <Schedule c={c} />}
    </CompetitionPage>
  );
}
