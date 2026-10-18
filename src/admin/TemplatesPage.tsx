import { useState } from 'react'
import { TEMPLATES } from '../lib/schedule/templates'
import { validateTemplate } from '../lib/schedule/validate'
import { buildPlan, refLabel } from '../lib/schedule/plan'
import type { PlanTemplate } from '../lib/schedule/types'

const time = (iso: string) => new Date(iso).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' })

function TemplateCard({ t, slotMinutes }: { t: PlanTemplate; slotMinutes: number }) {
  const [open, setOpen] = useState(false)
  const checks = validateTemplate(t)
  const failed = checks.filter(c => !c.ok).length
  // Beispielplan ab 09:00 (nur zur Ansicht, Zeiten ohne Zeitzone)
  const plan = buildPlan(t, { startsAt: '2000-01-01T09:00:00.000Z', slotMinutes })
  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-lg font-bold">{t.name}</h2>
        <span className="rounded-full border border-white/10 px-2.5 py-0.5 text-xs text-slate-400">{t.teams} Teams · {t.fields} {t.fields === 1 ? 'Feld' : 'Felder'} · {t.games.length} Spiele</span>
        <span className={`rounded-full border px-2.5 py-0.5 text-xs ${failed === 0 ? 'border-green-400/20 bg-green-400/10 text-green-400' : 'border-red-400/20 bg-red-400/10 text-red-400'}`}>
          {failed === 0 ? `alle ${checks.length} Prüfungen bestanden` : `${failed} Prüfung(en) nicht bestanden`}
        </span>
      </div>
      <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-slate-300">
        {t.summary.map(s => <li key={s}>{s}</li>)}
      </ul>

      <button onClick={() => setOpen(!open)} className="mt-4 rounded-xl border border-white/10 px-3.5 py-2 text-sm text-slate-300 transition hover:bg-white/5">
        {open ? 'Plan und Prüfungen ausblenden' : 'Plan und Prüfungen anzeigen'}
      </button>

      {open && (
        <div className="mt-4 grid gap-5 lg:grid-cols-[2fr_1fr]">
          <div className="overflow-x-auto rounded-2xl border border-white/10">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wider text-slate-400">
                  <th className="px-3 py-2">Slot</th><th className="px-3 py-2">Zeit</th><th className="px-3 py-2">Feld</th>
                  <th className="px-3 py-2">Runde</th><th className="px-3 py-2">Gast vs. Heim</th><th className="px-3 py-2">Schiedsrichter</th>
                </tr>
              </thead>
              <tbody>
                {plan.map(g => (
                  <tr key={g.id} className="border-t border-white/5">
                    <td className="px-3 py-2 text-slate-400">{g.slot}</td>
                    <td className="px-3 py-2 text-slate-400">{time(g.startsAt)}</td>
                    <td className="px-3 py-2 text-slate-400">{g.field}</td>
                    <td className="px-3 py-2 text-slate-300">{g.round}</td>
                    <td className="px-3 py-2 font-medium">{refLabel(g.away)} <span className="text-slate-500">vs.</span> {refLabel(g.home)}</td>
                    <td className="px-3 py-2 text-slate-400">{g.officialsLabel}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <ul className="space-y-1.5 text-sm">
            {checks.map(c => (
              <li key={c.id} className="flex gap-2">
                <span className={c.ok ? 'text-green-400' : 'text-red-400'}>{c.ok ? '✓' : '✗'}</span>
                <span className="text-slate-300">{c.label}{c.detail ? <span className="text-slate-500"> ({c.detail})</span> : null}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}

export default function TemplatesPage() {
  const [slotMinutes, setSlotMinutes] = useState(30)
  return (
    <div>
      <h1 className="text-2xl font-black">Spielplan-Vorlagen</h1>
      <p className="mt-1 max-w-3xl text-sm text-slate-400">
        Hinterlegte Spielpläne zum Ansehen. Beim Anlegen einer Competition wird nur ausgelost, welches Team auf welchem Platz sitzt;
        der Plan selbst bleibt gleich. Plätze: A1 ist der Ausrichter (erstes Spiel als Heimteam). Anzeige: Gast links, Heim rechts.
        Jede Vorlage besteht automatisch eine Reihe von Prüfungen.
      </p>
      <label className="mt-4 flex items-center gap-3 text-sm text-slate-300">
        Slotlänge für die Vorschau
        <select value={slotMinutes} onChange={e => setSlotMinutes(Number(e.target.value))}
          className="rounded-xl border border-white/10 bg-[#06111f] px-3 py-2 text-sm text-slate-100">
          {[20, 25, 30, 40, 50, 60, 70].map(m => <option key={m} value={m}>{m} Minuten</option>)}
        </select>
      </label>
      <div className="mt-5 flex flex-col gap-4">
        {TEMPLATES.map(t => <TemplateCard key={t.id} t={t} slotMinutes={slotMinutes} />)}
      </div>
    </div>
  )
}
