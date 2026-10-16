import CompetitionPage from "../components/CompetitionPage";
import Collapsible from "../components/Collapsible";
import { computeStandings } from "../lib/standings";
import type { Competition } from "../types/competition";

function Standings({ c }: { c: Competition }) {
  const tables = computeStandings(c);
  const anyPlayed = tables.some((t) => t.rows.some((r) => r.played > 0));
  return (
    <div className="flex flex-col gap-4">
      {!anyPlayed && <p className="text-sm text-slate-400">Noch kein Spiel beendet – die Tabelle füllt sich nach den ersten Ergebnissen.</p>}
      {tables.map((t) => (
        <Collapsible key={t.groupId ?? "gesamt"} title={t.title}>
          {t.rows.length === 0 ? <p className="text-sm text-slate-300">Keine Teams.</p> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wider text-slate-400">
                    <th className="w-8 py-2">#</th><th>Team</th>
                    <th className="text-right">Sp</th><th className="hidden text-right sm:table-cell">S</th><th className="hidden text-right sm:table-cell">U</th><th className="hidden text-right sm:table-cell">N</th>
                    <th className="hidden text-right sm:table-cell">Verhältnis</th><th className="text-right">Diff</th><th className="text-right pr-1">Pkt</th>
                  </tr>
                </thead>
                <tbody>
                  {t.rows.map((r, i) => (
                    <tr key={r.teamId} className="border-t border-white/10">
                      <td className="py-2.5 text-slate-400">{i + 1}</td>
                      <td className="font-semibold">{r.teamName}</td>
                      <td className="text-right">{r.played}</td><td className="hidden text-right sm:table-cell">{r.wins}</td><td className="hidden text-right sm:table-cell">{r.draws}</td><td className="hidden text-right sm:table-cell">{r.losses}</td>
                      <td className="hidden text-right font-mono sm:table-cell">{r.pointsFor}:{r.pointsAgainst}</td>
                      <td className="text-right font-mono">{r.pointDifference > 0 ? `+${r.pointDifference}` : r.pointDifference}</td>
                      <td className="pr-1 text-right text-base font-extrabold text-[#C6FF00]">{r.points}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Collapsible>
      ))}
      <p className="text-xs text-slate-500">Wertung: Sieg 2, Unentschieden 1, Niederlage 0. Bei Gleichstand zählen Punktdifferenz, erzielte Punkte und Name.</p>
    </div>
  );
}

export default function StandingsPage() {
  return (
    <CompetitionPage title="Tabellen" sub="Gruppentabellen aus den beendeten Spielen, rechnet sich selbst fort.">
      {(c) => <Standings c={c} />}
    </CompetitionPage>
  );
}
