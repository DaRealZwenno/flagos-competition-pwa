import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../services/supabaseClient'
import type { DirectoryClub } from './adminTypes'

// ── Typen ─────────────────────────────────────────────────────

interface TeamImport {
  id: string
  source: string
  source_team_name: string
  team_name: string
  city: string
  state: string
  country_code: string
  has_5v5: boolean
  has_7v7: boolean
  has_9v9: boolean
  variants_raw: string | null
  league_raw: string | null
  league_name: string | null
  division: string | null
  import_note: string | null
  team_category: 'verein' | 'hochschule' | 'schule'
  review_status: 'pending' | 'approved' | 'rejected'
  approved_team_id: string | null
  created_at: string
}

// Team-Code: CC (2) + LOC (3, ICAO) + ORG (3) — siehe TeamsPage.tsx für Kommentar
const ORG_SKIP = new Set([
  'FLAG', 'FLAGS', 'FOOTBALL', 'TACKLE', 'SENIOR', 'SENIORS',
  'JUNIOR', 'JUNIORS', 'JUGEND', 'LADIES', 'WOMEN', 'II', 'III', 'IV', 'V',
])

function suggestTeamCode(country: string, city: string, teamName: string): string {
  const cc = country.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 2)
  const parts = city.toUpperCase().split(/[^A-Z]/).filter(Boolean)
  let loc = parts.map(p => p[0] ?? '').join('')
  if (loc.length < 3 && parts.length > 0) {
    const last = parts[parts.length - 1]
    loc += last.slice(1, 1 + (3 - loc.length))
  }
  loc = loc.slice(0, 3)
  const words = teamName.trim().split(/\s+/).filter(Boolean)
  const meaningful = [...words].reverse().find(w => !ORG_SKIP.has(w.toUpperCase())) ?? words[0] ?? ''
  const org = meaningful.replace(/[^A-Za-z]/g, '').toUpperCase().slice(0, 3)
  return (cc + loc + org).padEnd(8, 'X').slice(0, 8)
}

function formatTeamCode(code: string): string {
  if (code.length !== 8) return code
  return `${code.slice(0, 2)}-${code.slice(2, 5)}-${code.slice(5)}`
}

function normalizeEV(name: string): string {
  return name.replace(/e\.?\s*v\./gi, 'e. V.')
}

// ── Approve-Form ──────────────────────────────────────────────

type TeamCategory = 'verein' | 'hochschule' | 'schule'

type ApproveForm = {
  club_id: string
  team_code: string
  short_name: string
  age_group: 'senior' | 'u19' | 'u16' | 'u13' | 'u11' | 'other'
  gender_category: 'mixed' | 'men' | 'women' | 'open' | 'other'
  sport_type: 'flag' | 'tackle' | 'both'
  team_category: TeamCategory
  league: string
  association: string
}

const AGE_GROUP_LABELS = {
  senior: 'Senior', u19: 'U19', u16: 'U16', u13: 'U13', u11: 'U11', other: 'Sonstige',
}
const GENDER_LABELS = {
  mixed: 'Mixed', men: 'Herren', women: 'Damen', open: 'Open', other: 'Sonstige',
}
const TEAM_CATEGORY_LABELS: Record<TeamCategory, string> = {
  verein: 'Verein', hochschule: 'Hochschule / Uni', schule: 'Schule',
}

const HOCHSCHULE_RE = /\b(uni|universit[äa]t|university|th|tu\b|fh\b|hs\b|hochschule|college|student)\b/i
const SCHULE_RE     = /\b(schule|gymnasium|gym\b|realschule|gesamtschule|bgs|bos|bbs|berufsschule|school)\b/i

function guessTeamCategory(name: string): TeamCategory {
  if (HOCHSCHULE_RE.test(name)) return 'hochschule'
  if (SCHULE_RE.test(name))     return 'schule'
  return 'verein'
}

// ── Komponente ────────────────────────────────────────────────

export default function TeamImportsPage() {
  const [imports, setImports] = useState<TeamImport[]>([])
  const [clubs, setClubs] = useState<DirectoryClub[]>([])
  const [loading, setLoading] = useState(true)

  // Sortierung
  const [sortKey, setSortKey] = useState<SortKey>('state')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('asc') }
  }

  function getSortValue(i: TeamImport, key: SortKey): string { // eslint-disable-line
    switch (key) {
      case 'team':     return i.team_name
      case 'city':     return i.city
      case 'state':    return i.state
      case 'country':  return i.country_code
      case 'league':   return i.league_raw ?? ''
      case 'variants': return i.variants_raw ?? ''
      case 'note':     return i.import_note ?? ''
      case 'status':   return i.review_status
      default:         return ''
    }
  }

  // Filter
  const [filterStatus, setFilterStatus] = useState<'pending' | 'approved' | 'rejected' | ''>('pending')
  const [search, setSearch] = useState('')

  // Approve-Modal
  const [approving, setApproving] = useState<TeamImport | null>(null)
  const [form, setForm] = useState<ApproveForm | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  // Neuer-Verein-Mini-Modal
  const [showNewClub, setShowNewClub] = useState(false)
  const [newClubName, setNewClubName] = useState('')
  const [newClubLegal, setNewClubLegal] = useState('')
  const [creatingClub, setCreatingClub] = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const [{ data: imp }, { data: cl }] = await Promise.all([
      supabase.from('team_directory_imports').select('*').order('state').order('team_name'),
      supabase.from('directory_clubs').select('*').order('name'),
    ])
    setImports(imp ?? [])
    setClubs(cl ?? [])
    setLoading(false)
  }

  const displayed = useMemo(() => {
    let result = imports.filter(i => {
      const q = search.toLowerCase()
      const matchSearch = !q || (
        i.team_name.toLowerCase().includes(q) ||
        i.city.toLowerCase().includes(q) ||
        i.state.toLowerCase().includes(q) ||
        (i.league_raw ?? '').toLowerCase().includes(q)
      )
      return matchSearch && (!filterStatus || i.review_status === filterStatus)
    })
    result = [...result].sort((a, b) => {
      const av = getSortValue(a, sortKey).toLowerCase()
      const bv = getSortValue(b, sortKey).toLowerCase()
      return sortDir === 'asc' ? av.localeCompare(bv, 'de') : bv.localeCompare(av, 'de')
    })
    return result
  }, [imports, search, filterStatus, sortKey, sortDir])

  const counts = useMemo(() => ({
    pending:  imports.filter(i => i.review_status === 'pending').length,
    approved: imports.filter(i => i.review_status === 'approved').length,
    rejected: imports.filter(i => i.review_status === 'rejected').length,
  }), [imports])

  function openApprove(imp: TeamImport) {
    const suggested = suggestTeamCode(imp.country_code, imp.city, imp.team_name)
    setApproving(imp)
    setForm({
      club_id: '',
      team_code: suggested,
      short_name: '',
      age_group: 'senior',
      gender_category: 'mixed',
      sport_type: 'flag',
      team_category: guessTeamCategory(imp.team_name),
      league: imp.league_name ?? imp.league_raw ?? '',
      association: '',
    })
    setSaveError(null)
  }

  async function confirmApprove() {
    if (!approving || !form) return
    if (!form.club_id) { setSaveError('Bitte einen Verein auswählen.'); return }
    if (!form.team_code || form.team_code.length !== 8) { setSaveError('Team-Code muss genau 8 Zeichen haben.'); return }

    setSaving(true); setSaveError(null)

    // 1. Eintrag in directory_teams anlegen
    const { data: newTeam, error: teamErr } = await supabase
      .from('directory_teams')
      .insert({
        club_id: form.club_id,
        public_name: approving.team_name,
        short_name: form.short_name || approving.team_name.split(' ').pop() || '',
        team_code: form.team_code.toUpperCase().replace(/[-\s]/g, ''),
        city: approving.city,
        state: approving.state,
        country: approving.country_code,
        age_group: form.age_group,
        gender_category: form.gender_category,
        sport_type: form.sport_type,
        team_category: form.team_category,
        league: form.league,
        association: form.association,
        review_status: 'approved',
        verification_status: 'unverified',
        flagos_status: 'none',
      })
      .select('id')
      .single()

    if (teamErr || !newTeam) {
      setSaveError(teamErr?.message ?? 'Fehler beim Anlegen des Teams.')
      setSaving(false)
      return
    }

    // 2. Import als approved markieren + approved_team_id setzen
    await supabase
      .from('team_directory_imports')
      .update({ review_status: 'approved', approved_team_id: newTeam.id })
      .eq('id', approving.id)

    setSaving(false)
    setApproving(null)
    setForm(null)
    load()
  }

  async function rejectImport(id: string) {
    await supabase.from('team_directory_imports').update({ review_status: 'rejected' }).eq('id', id)
    load()
  }

  async function resetImport(id: string) {
    await supabase.from('team_directory_imports').update({ review_status: 'pending', approved_team_id: null }).eq('id', id)
    load()
  }

  async function createClub() {
    if (!newClubName.trim() || !form || !approving) return
    setCreatingClub(true)
    const { data, error: err } = await supabase
      .from('directory_clubs')
      .insert({
        name: normalizeEV(newClubName.trim()),
        legal_name: normalizeEV(newClubLegal.trim() || newClubName.trim()),
        city: approving.city,
        state: approving.state,
        country: approving.country_code,
      })
      .select()
      .single()
    setCreatingClub(false)
    if (err || !data) return
    await load()
    setForm(f => f ? { ...f, club_id: data.id } : f)
    setShowNewClub(false)
    setNewClubName(''); setNewClubLegal('')
  }

  const selectedClub = clubs.find(c => c.id === form?.club_id)

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl font-black">Team-Importe</h1>
        <p className="mt-1 text-sm text-slate-400">
          Teams aus externen Quellen prüfen und ins Verzeichnis übernehmen
        </p>
      </div>

      {/* Status-Kacheln */}
      <div className="mb-6 flex gap-3">
        {([['pending', '⏳ Ausstehend', 'yellow'], ['approved', '✅ Freigegeben', 'green'], ['rejected', '❌ Abgelehnt', 'red']] as const).map(([status, label, color]) => (
          <button
            key={status}
            onClick={() => setFilterStatus(f => f === status ? '' : status)}
            className={`flex-1 rounded-xl border p-3 text-left transition ${
              filterStatus === status
                ? color === 'yellow' ? 'border-yellow-500/40 bg-yellow-500/10'
                  : color === 'green' ? 'border-green-500/40 bg-green-500/10'
                  : 'border-red-500/40 bg-red-500/10'
                : 'border-white/10 bg-white/[0.03] hover:bg-white/[0.06]'
            }`}
          >
            <div className={`text-2xl font-black ${
              color === 'yellow' ? 'text-yellow-400' : color === 'green' ? 'text-green-400' : 'text-red-400'
            }`}>{counts[status]}</div>
            <div className="mt-0.5 text-xs text-slate-400">{label}</div>
          </button>
        ))}
      </div>

      {/* Suche */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="Team, Stadt oder Liga suchen…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white placeholder-slate-500 outline-none focus:border-[#C6FF00]/50"
        />
      </div>

      {/* Tabelle */}
      {loading ? (
        <p className="text-sm text-slate-400">Lädt…</p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-white/10">
          <table className="w-full text-sm">
            <thead className="border-b border-white/10 bg-white/[0.04] text-xs uppercase tracking-wider text-slate-400">
              <tr>
                <Th label="Team"       sk="team"     sortKey={sortKey} dir={sortDir} onSort={toggleSort} />
                <Th label="Stadt"      sk="city"     sortKey={sortKey} dir={sortDir} onSort={toggleSort} />
                <Th label="Bundesland" sk="state"    sortKey={sortKey} dir={sortDir} onSort={toggleSort} />
                <Th label="Land"       sk="country"  sortKey={sortKey} dir={sortDir} onSort={toggleSort} />
                <Th label="Liga"       sk="league"   sortKey={sortKey} dir={sortDir} onSort={toggleSort} />
                <Th label="Varianten"  sk="variants" sortKey={sortKey} dir={sortDir} onSort={toggleSort} />
                <Th label="Hinweis"    sk="note"     sortKey={sortKey} dir={sortDir} onSort={toggleSort} />
                <Th label="Status"     sk="status"   sortKey={sortKey} dir={sortDir} onSort={toggleSort} />
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {displayed.map(imp => (
                <tr key={imp.id} className={`hover:bg-white/[0.02] ${imp.import_note ? 'bg-yellow-500/[0.03]' : ''}`}>
                  <td className="px-4 py-3 font-medium">{imp.team_name}</td>
                  <td className="px-4 py-3 text-slate-300">{imp.city || <span className="text-slate-600">–</span>}</td>
                  <td className="px-4 py-3 text-xs text-slate-400">{imp.state || <span className="text-slate-600">–</span>}</td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-400">{imp.country_code}</td>
                  <td className="px-4 py-3 text-xs text-slate-400">{imp.league_raw || '–'}</td>
                  <td className="px-4 py-3 text-xs text-slate-400">{imp.variants_raw || '5er'}</td>
                  <td className="px-4 py-3 max-w-48">
                    <div className="flex flex-col gap-1">
                      {imp.team_category !== 'verein' && (
                        <span className={`w-fit rounded-full px-2 py-0.5 text-xs font-semibold ${
                          imp.team_category === 'hochschule'
                            ? 'bg-blue-500/15 text-blue-400'
                            : 'bg-purple-500/15 text-purple-400'
                        }`}>
                          {imp.team_category === 'hochschule' ? '🎓 Hochschule' : '🏫 Schule'}
                        </span>
                      )}
                      {imp.import_note && (
                        <span className="text-xs text-yellow-400/80">{imp.import_note}</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs whitespace-nowrap">
                    {imp.review_status === 'pending'  && <span className="text-yellow-400">⏳ Ausstehend</span>}
                    {imp.review_status === 'approved' && <span className="text-green-400">✅ Freigegeben</span>}
                    {imp.review_status === 'rejected' && <span className="text-red-400">❌ Abgelehnt</span>}
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    {imp.review_status === 'pending' && (
                      <>
                        <button onClick={() => openApprove(imp)} className="mr-3 rounded-lg bg-green-600/20 px-2.5 py-1 text-xs font-medium text-green-400 hover:bg-green-600/30">
                          Freigeben
                        </button>
                        <button onClick={() => rejectImport(imp.id)} className="text-xs text-red-500 hover:text-red-400">
                          Ablehnen
                        </button>
                      </>
                    )}
                    {imp.review_status !== 'pending' && (
                      <button onClick={() => resetImport(imp.id)} className="text-xs text-slate-600 hover:text-slate-400">
                        Zurücksetzen
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {displayed.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-sm text-slate-500">
                    Keine Einträge gefunden.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Freigabe-Modal */}
      {approving && form && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl border border-white/10 bg-[#0b1b2f] p-6">
            <h2 className="mb-1 text-lg font-bold">Team freigeben</h2>
            <p className="mb-4 text-sm text-slate-400">{approving.team_name} · {approving.city}{approving.state ? `, ${approving.state}` : ''}</p>

            <div className="grid grid-cols-2 gap-3">
              {/* Verein */}
              <div className="col-span-2">
                <label className="mb-1 block text-xs font-medium text-slate-400">Verein *</label>
                <div className="flex gap-2">
                  <select
                    value={form.club_id}
                    onChange={e => setForm(f => f ? { ...f, club_id: e.target.value } : f)}
                    className={`${input} flex-1`}
                  >
                    <option value="">— Verein auswählen —</option>
                    {clubs.map(c => (
                      <option key={c.id} value={c.id}>{normalizeEV(c.legal_name || c.name)}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => setShowNewClub(true)}
                    className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-300 hover:bg-white/10 whitespace-nowrap"
                  >
                    + Neu
                  </button>
                </div>
                {selectedClub && (
                  <p className="mt-1 text-xs text-slate-500">
                    {normalizeEV(selectedClub.legal_name || selectedClub.name)}
                    {selectedClub.city ? ` · ${selectedClub.city}` : ''}
                  </p>
                )}
              </div>

              {/* Team-Code */}
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-400">Team-Code *</label>
                <input
                  type="text"
                  value={form.team_code}
                  onChange={e => setForm(f => f ? { ...f, team_code: e.target.value.toUpperCase().replace(/[-\s]/g, '') } : f)}
                  maxLength={8}
                  className={`${input} font-mono uppercase`}
                  placeholder="DENULSPA"
                />
                {form.team_code.length === 8 && (
                  <p className="mt-1 text-xs text-slate-500">→ {formatTeamCode(form.team_code)}</p>
                )}
              </div>

              {/* Kurzname */}
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-400">Kurzname</label>
                <input
                  type="text"
                  value={form.short_name}
                  onChange={e => setForm(f => f ? { ...f, short_name: e.target.value } : f)}
                  placeholder={approving.team_name.split(' ').pop()}
                  className={input}
                />
              </div>

              {/* Altersklasse */}
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-400">Altersklasse</label>
                <select
                  value={form.age_group}
                  onChange={e => setForm(f => f ? { ...f, age_group: e.target.value as ApproveForm['age_group'] } : f)}
                  className={input}
                >
                  {(Object.entries(AGE_GROUP_LABELS) as [ApproveForm['age_group'], string][]).map(([v, l]) => (
                    <option key={v} value={v}>{l}</option>
                  ))}
                </select>
              </div>

              {/* Kategorie */}
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-400">Kategorie</label>
                <select
                  value={form.gender_category}
                  onChange={e => setForm(f => f ? { ...f, gender_category: e.target.value as ApproveForm['gender_category'] } : f)}
                  className={input}
                >
                  {(Object.entries(GENDER_LABELS) as [ApproveForm['gender_category'], string][]).map(([v, l]) => (
                    <option key={v} value={v}>{l}</option>
                  ))}
                </select>
              </div>

              {/* Team-Kategorie */}
              <div className="col-span-2">
                <label className="mb-1 block text-xs font-medium text-slate-400">Kategorie</label>
                <div className="flex gap-2">
                  {(Object.entries(TEAM_CATEGORY_LABELS) as [TeamCategory, string][]).map(([v, l]) => {
                    const active = form.team_category === v
                    return (
                      <button
                        key={v}
                        type="button"
                        onClick={() => setForm(f => f ? { ...f, team_category: v } : f)}
                        className={`flex-1 rounded-xl border px-3 py-2 text-sm font-semibold transition ${
                          active
                            ? 'border-[#C6FF00]/60 bg-[#C6FF00]/15 text-[#C6FF00]'
                            : 'border-white/10 bg-white/5 text-slate-400 hover:text-slate-100'
                        }`}
                      >
                        {l}
                        {active && guessTeamCategory(approving.team_name) === v && (
                          <span className="ml-1.5 text-xs opacity-60">· Auto</span>
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Liga */}
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-400">Liga</label>
                <input
                  type="text"
                  value={form.league}
                  onChange={e => setForm(f => f ? { ...f, league: e.target.value } : f)}
                  className={input}
                />
              </div>

              {/* Verband */}
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-400">Verband</label>
                <input
                  type="text"
                  value={form.association}
                  onChange={e => setForm(f => f ? { ...f, association: e.target.value } : f)}
                  className={input}
                />
              </div>
            </div>

            {approving.import_note && (
              <div className="mt-3 rounded-xl border border-yellow-500/20 bg-yellow-500/5 px-3 py-2 text-xs text-yellow-400">
                ⚠ {approving.import_note}
              </div>
            )}

            {saveError && <p className="mt-3 text-sm text-red-400">{saveError}</p>}

            <div className="mt-5 flex justify-end gap-3">
              <button
                onClick={() => { setApproving(null); setForm(null) }}
                className="rounded-xl px-4 py-2 text-sm text-slate-400 hover:text-white"
              >
                Abbrechen
              </button>
              <button
                onClick={confirmApprove}
                disabled={saving}
                className="rounded-xl bg-green-600 px-4 py-2 text-sm font-bold text-white hover:bg-green-500 disabled:opacity-50"
              >
                {saving ? 'Wird gespeichert…' : '✅ Freigeben & ins Verzeichnis'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Neuer-Verein-Modal */}
      {showNewClub && approving && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 px-4">
          <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#0b1b2f] p-6">
            <h3 className="mb-4 text-base font-bold">Neuer Verein anlegen</h3>
            <div className="flex flex-col gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-400">Anzeigename *</label>
                <input
                  type="text"
                  value={newClubName}
                  onChange={e => setNewClubName(e.target.value)}
                  placeholder={`z.B. ${approving.team_name}`}
                  className={input}
                  autoFocus
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-400">Vollständiger Name (mit e. V. falls zutreffend)</label>
                <input
                  type="text"
                  value={newClubLegal}
                  onChange={e => setNewClubLegal(e.target.value)}
                  placeholder="z.B. TSV 1880 Neu-Ulm e. V."
                  className={input}
                />
              </div>
            </div>
            <div className="mt-4 flex justify-end gap-3">
              <button
                onClick={() => { setShowNewClub(false); setNewClubName(''); setNewClubLegal('') }}
                className="rounded-xl px-4 py-2 text-sm text-slate-400 hover:text-white"
              >
                Abbrechen
              </button>
              <button
                onClick={createClub}
                disabled={creatingClub || !newClubName.trim()}
                className="rounded-xl bg-[#C6FF00] px-4 py-2 text-sm font-bold text-black hover:bg-[#d4ff33] disabled:opacity-50"
              >
                {creatingClub ? 'Erstellt…' : 'Anlegen'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const input = "w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-[#C6FF00]/50"

type SortKey = 'team' | 'city' | 'state' | 'country' | 'league' | 'variants' | 'note' | 'status'

function Th({ label, sk, sortKey, dir, onSort }: {
  label: string
  sk: SortKey
  sortKey: SortKey
  dir: 'asc' | 'desc'
  onSort: (k: SortKey) => void
}) {
  const active = sortKey === sk
  return (
    <th
      className={`cursor-pointer select-none px-4 py-3 text-left tracking-wider transition hover:text-white ${active ? 'text-[#C6FF00]' : ''}`}
      onClick={() => onSort(sk)}
    >
      {label}{active ? (dir === 'asc' ? ' ↑' : ' ↓') : ''}
    </th>
  )
}
