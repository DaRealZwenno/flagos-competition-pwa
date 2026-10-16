import { useState } from "react";
import CompetitionPage from "../components/CompetitionPage";
import { Card, Tag } from "../components/ui";
import ViewToggle, { type ViewMode } from "../components/ViewToggle";
import type { Competition } from "../types/competition";

function Teams({ c }: { c: Competition }) {
  const [view, setView] = useState<ViewMode>("list");
  if (c.teams.length === 0) return <Card><p className="text-sm text-slate-300">Noch keine Teams.</p></Card>;
  const groupOf = (id: string) => c.groups.find((g) => g.teamIds.includes(id))?.name;
  const games = (id: string) => c.games.filter((g) => g.homeTeamId === id || g.awayTeamId === id).length;
  const teams = [...c.teams].sort((a, b) => a.name.localeCompare(b.name, "de"));
  return (
    <>
      <div className="mb-4 flex items-center justify-between gap-3">
        <p className="text-sm text-slate-400">{teams.length} Teams, alphabetisch</p>
        <ViewToggle value={view} onChange={setView} />
      </div>
      {view === "list" ? (
        <ul className="flex flex-col gap-3">
          {teams.map((t) => (
            <li key={t.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-2xl border border-white/10 bg-[#0f1d31] px-5 py-3.5">
              <span className="min-w-0 flex-1">
                <span className="font-semibold">{t.name}</span>
                {t.city && <span className="ml-3 text-xs text-slate-400">{t.city}</span>}
              </span>
              {groupOf(t.id) && <Tag tone="accent">{groupOf(t.id)}</Tag>}
              <span className="w-20 text-right text-xs text-slate-400">{games(t.id)} Spiele</span>
            </li>
          ))}
        </ul>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {teams.map((t) => (
            <Card key={t.id}>
              <p className="font-semibold">{t.name}</p>
              {t.city && <p className="text-xs text-slate-400">{t.city}</p>}
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {groupOf(t.id) && <Tag tone="accent">{groupOf(t.id)}</Tag>}
                <span className="text-xs text-slate-400">{games(t.id)} Spiele</span>
              </div>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}

export default function TeamsPage() {
  return (
    <CompetitionPage title="Teams" sub="Teilnehmende Teams mit Gruppe. Check-in und Kontakte kommen später.">
      {(c) => <Teams c={c} />}
    </CompetitionPage>
  );
}
