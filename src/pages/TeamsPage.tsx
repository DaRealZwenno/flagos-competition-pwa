import CompetitionPage from "../components/CompetitionPage";
import { Card, Tag } from "../components/ui";
import type { Competition } from "../types/competition";

function Teams({ c }: { c: Competition }) {
  if (c.teams.length === 0) return <Card><p className="text-sm text-slate-300">Noch keine Teams.</p></Card>;
  const groupOf = (id: string) => c.groups.find((g) => g.teamIds.includes(id))?.name;
  const games = (id: string) => c.games.filter((g) => g.homeTeamId === id || g.awayTeamId === id).length;
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {[...c.teams].sort((a, b) => a.name.localeCompare(b.name, "de")).map((t) => (
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
  );
}

export default function TeamsPage() {
  return (
    <CompetitionPage title="Teams" sub="Teilnehmende Teams mit Gruppe. Check-in und Kontakte kommen später.">
      {(c) => <Teams c={c} />}
    </CompetitionPage>
  );
}
