import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../services/supabaseClient'
import type { DirectoryClub, DirectoryTeam } from './adminTypes'

// ── Hilfsfunktionen ───────────────────────────────────────────

function formatTeamCode(code: string): string {
  if (code.length !== 8) return code
  return `${code.slice(0, 2)}-${code.slice(2, 5)}-${code.slice(5)}`
}

function normalizeEV(name: string): string {
  return name.replace(/e\.?\s*v\./gi, 'e. V.')
}

function clubDisplayName(team: DirectoryTeam): string {
  const name = team.club?.legal_name || team.club?.name || ''
  return normalizeEV(name) || '–'
}

// Team-Code-Format: CC (2) + LOC (3, ICAO-Stil) + ORG (3) = 8 Zeichen
// Beispiel: DE + NUL + SPA = DENULSPA für "Neu-Ulm Spartans Senior Flag"
//
// LOC: identisch zu iOS TeamInfo.generateCode() — Initialen aller Stadtteile, bei < 3 mit
//      weiteren Buchstaben des letzten Worts auffüllen (Neu-Ulm → N+U → +L → NUL)
//
// ORG: letztes bedeutungsvolles Wort aus dem vollen public_name (erste 3 Buchstaben).
//      Abweichend von iOS, weil iOS kurze Teamnamen ohne Stadtpräfix bekommt,
//      die PWA aber den vollen Scraping-Namen ("Erding Bulls Flag") verarbeitet.
//      Generische Suffixe werden übersprungen: FLAG, FOOTBALL, SENIOR/S, JUNIOR/S, JUGEND,
//      LADIES, WOMEN, II, III, IV, V
const ORG_SKIP = new Set([
  'FLAG', 'FLAGS', 'FOOTBALL', 'TACKLE', 'SENIOR', 'SENIORS',
  'JUNIOR', 'JUNIORS', 'JUGEND', 'LADIES', 'WOMEN', 'II', 'III', 'IV', 'V',
])

function suggestTeamCode(country: string, city: string, publicName: string): string {
  const cc = country.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 2)

  // LOC: ICAO-Stil
  const parts = city.toUpperCase().split(/[^A-Z]/).filter(Boolean)
  let loc = parts.map(p => p[0] ?? '').join('')
  if (loc.length < 3 && parts.length > 0) {
    const last = parts[parts.length - 1]
    loc += last.slice(1, 1 + (3 - loc.length))
  }
  loc = loc.slice(0, 3)

  // ORG: letztes bedeutungsvolles Wort
  const words = publicName.trim().split(/\s+/).filter(Boolean)
  const meaningful = [...words].reverse().find(w => !ORG_SKIP.has(w.toUpperCase())) ?? words[0] ?? ''
  const org = meaningful.replace(/[^A-Za-z]/g, '').toUpperCase().slice(0, 3)

  return (cc + loc + org).padEnd(8, 'X').slice(0, 8)
}

// ── Labels ────────────────────────────────────────────────────

const AGE_GROUP_LABELS: Record<DirectoryTeam['age_group'], string> = {
  senior: 'Senior', u19: 'U19', u16: 'U16', u13: 'U13', u11: 'U11', other: 'Sonstige',
}
const GENDER_LABELS: Record<DirectoryTeam['gender_category'], string> = {
  mixed: 'Mixed', men: 'Herren', women: 'Damen', open: 'Open', other: 'Sonstige',
}
const FLAGOS_LABELS: Record<DirectoryTeam['flagos_status'], string> = {
  none: '–', testing: '🟡', active: '🟢',
}
const VERIFIED_LABELS: Record<DirectoryTeam['verification_status'], string> = {
  unverified: '–', pending: '⏳', verified: '✅',
}
const REVIEW_LABELS: Record<DirectoryTeam['review_status'], string> = {
  pending: '⏳ Ausstehend', approved: '✅ Freigegeben', rejected: '❌ Abgelehnt',
}
const REVIEW_COLORS: Record<DirectoryTeam['review_status'], string> = {
  pending: 'text-yellow-400', approved: 'text-green-400', rejected: 'text-red-400',
}

// ── Sortierung ────────────────────────────────────────────────

type SortKey = 'team' | 'club' | 'city' | 'state' | 'country' | 'league' | 'flagos' | 'verified' | 'review' | 'created'
type SortDir = 'asc' | 'desc'

function getSortValue(team: DirectoryTeam, key: SortKey): string {
  switch (key) {
    case 'team':     return team.public_name
    case 'club':     return team.club?.legal_name || team.club?.name || ''
    case 'city':     return team.city
    case 'state':    return team.state
    case 'country':  return team.country
    case 'league':   return team.league
    case 'flagos':   return team.flagos_status
    case 'verified': return team.verification_status
    case 'review':   return team.review_status
    case 'created':  return team.created_at
    default:         return ''
  }
}

// ── Form-Typ ──────────────────────────────────────────────────

type TeamForm = {
  club_id: string
  public_name: string
  short_name: string
  team_code: string
  city: string
  state: string
  country: string
  league: string
  association: string
  logo_url: string
  age_group: DirectoryTeam['age_group']
  gender_category: DirectoryTeam['gender_category']
  sport_type: DirectoryTeam['sport_type']
  verification_status: DirectoryTeam['verification_status']
  flagos_status: DirectoryTeam['flagos_status']
  website: string
  instagram: string
  contact_email: string
}

const EMPTY_FORM: TeamForm = {
  club_id: '', public_name: '', short_name: '', team_code: '', city: '', state: '',
  country: 'DE', league: '', association: '', logo_url: '',
  age_group: 'senior', gender_category: 'mixed', sport_type: 'flag',
  verification_status: 'unverified', flagos_status: 'none',
  website: '', instagram: '', contact_email: '',
}

// ── Komponente ────────────────────────────────────────────────

export default function TeamsPage() {
  const [teams, setTeams] = useState<DirectoryTeam[]>([])
  const [clubs, setClubs] = useState<DirectoryClub[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<DirectoryTeam | null>(null)
  const [form, setForm] = useState<TeamForm>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Suche & Filter
  const [search, setSearch] = useState('')
  const [filterState, setFilterState] = useState('')
  const [filterCountry, setFilterCountry] = useState('')
  const [filterLeague, setFilterLeague] = useState('')
  const [filterFlagos, setFilterFlagos] = useState('')
  const [filterReview, setFilterReview] = useState('')

  // Sortierung
  const [sortKey, setSortKey] = useState<SortKey>('state')
  const [sortDir, setSortDir] = useState<SortDir>('asc')

  // Neuer Verein
  const [showNewClubModal, setShowNewClubModal] = useState(false)
  const [newClubName, setNewClubName] = useState('')
  const [newClubLegal, setNewClubLegal] = useState('')
  const [creatingClub, setCreatingClub] = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const [{ data: teamsData }, { data: clubsData }] = await Promise.all([
      supabase
        .from('directory_teams')
        .select('*, club:directory_clubs(*), org_unit:directory_org_units(*)')
        .order('state').order('public_name'),
      supabase.from('directory_clubs').select('*').order('name'),
    ])
    setTeams(teamsData ?? [])
    setClubs(clubsData ?? [])
    setLoading(false)
  }

  // Filteroptionen aus vorhandenen Daten
  const availableStates    = useMemo(() => [...new Set(teams.map(t => t.state).filter(Boolean))].sort(), [teams])
  const availableCountries = useMemo(() => [...new Set(teams.map(t => t.country).filter(Boolean))].sort(), [teams])
  const availableLeagues   = useMemo(() => [...new Set(teams.map(t => t.league).filter(Boolean))].sort(), [teams])

  // Gefiltert + sortiert
  const displayed = useMemo(() => {
    let result = teams.filter(t => {
      const q = search.toLowerCase()
      const matchSearch = !q || (
        t.public_name.toLowerCase().includes(q) ||
        t.city.toLowerCase().includes(q) ||
        t.team_code.toLowerCase().includes(q) ||
        formatTeamCode(t.team_code).toLowerCase().includes(q) ||
        (t.club?.name ?? '').toLowerCase().includes(q) ||
        (t.club?.legal_name ?? '').toLowerCase().includes(q)
      )
      return (
        matchSearch &&
        (!filterState   || t.state   === filterState) &&
        (!filterCountry || t.country === filterCountry) &&
        (!filterLeague  || t.league  === filterLeague) &&
        (!filterFlagos  || t.flagos_status === filterFlagos) &&
        (!filterReview  || t.review_status === filterReview)
      )
    })
    result = [...result].sort((a, b) => {
      const av = getSortValue(a, sortKey).toLowerCase()
      const bv = getSortValue(b, sortKey).toLowerCase()
      return sortDir === 'asc' ? av.localeCompare(bv, 'de') : bv.localeCompare(av, 'de')
    })
    return result
  }, [teams, search, filterState, filterCountry, filterLeague, filterFlagos, filterReview, sortKey, sortDir])

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('asc') }
  }

  function updateForm(patch: Partial<TeamForm>) {
    setForm(prev => {
      const next = { ...prev, ...patch }
      const isNew = !editing?.id
      if (isNew && (patch.city || patch.public_name || patch.country)) {
        const suggested = suggestTeamCode(next.country, next.city, next.public_name)
        if (!prev.team_code || prev.team_code === suggestTeamCode(prev.country, prev.city, prev.public_name)) {
          next.team_code = suggested
        }
      }
      return next
    })
  }

  function openNew() {
    setEditing({ id: '' } as unknown as DirectoryTeam)
    setForm(EMPTY_FORM)
    setError(null)
  }

  function openEdit(team: DirectoryTeam) {
    setEditing(team)
    setForm({
      club_id: team.club_id,
      public_name: team.public_name,
      short_name: team.short_name,
      team_code: team.team_code,
      city: team.city,
      state: team.state,
      country: team.country,
      league: team.league,
      association: team.association,
      logo_url: team.logo_url ?? '',
      age_group: team.age_group,
      gender_category: team.gender_category,
      sport_type: team.sport_type,
      verification_status: team.verification_status,
      flagos_status: team.flagos_status,
      website: team.website ?? '',
      instagram: team.instagram ?? '',
      contact_email: team.contact_email ?? '',
    })
    setError(null)
  }

  async function createClub() {
    if (!newClubName.trim()) return
    setCreatingClub(true)
    const { data, error: err } = await supabase
      .from('directory_clubs')
      .insert({
        name: normalizeEV(newClubName.trim()),
        legal_name: normalizeEV(newClubLegal.trim() || newClubName.trim()),
        city: form.city, state: form.state, country: form.country,
      })
      .select().single()
    setCreatingClub(false)
    if (err || !data) return
    await load()
    setForm(f => ({ ...f, club_id: data.id }))
    setShowNewClubModal(false)
    setNewClubName(''); setNewClubLegal('')
  }

  async function save() {
    if (!form.club_id) { setError('Bitte einen Verein auswählen.'); return }
    setSaving(true); setError(null)
    const isNew = !editing?.id
    const payload = {
      club_id: form.club_id,
      public_name: form.public_name,
      short_name: form.short_name,
      team_code: form.team_code.toUpperCase().replace(/[-\s]/g, ''),
      city: form.city, state: form.state, country: form.country,
      league: form.league, association: form.association,
      logo_url: form.logo_url || null,
      age_group: form.age_group, gender_category: form.gender_category, sport_type: form.sport_type,
      verification_status: form.verification_status, flagos_status: form.flagos_status,
      website: form.website || null, instagram: form.instagram || null,
      contact_email: form.contact_email || null,
    }
    const { error: err } = isNew
      ? await supabase.from('directory_teams').insert(payload)
      : await supabase.from('directory_teams').update(payload).eq('id', editing!.id)
    if (err) { setError(err.message); setSaving(false); return }
    setEditing(null); setSaving(false); load()
  }

  async function deleteTeam(id: string) {
    if (!confirm('Team wirklich löschen?')) return
    await supabase.from('directory_teams').delete().eq('id', id)
    load()
  }

  async function approveTeam(id: string) {
    await supabase.from('directory_teams').update({ review_status: 'approved' }).eq('id', id)
    // Wenn wir gerade im Edit-Modal sind, Editing-State aktualisieren
    setEditing(prev => prev?.id === id ? { ...prev, review_status: 'approved' } : prev)
    load()
  }

  async function rejectTeam(id: string) {
    await supabase.from('directory_teams').update({ review_status: 'rejected' }).eq('id', id)
    setEditing(prev => prev?.id === id ? { ...prev, review_status: 'rejected' } : prev)
    load()
  }

  const selectedClub = clubs.find(c => c.id === form.club_id)
  const activeFilters = [filterState, filterCountry, filterLeague, filterFlagos, filterReview].filter(Boolean).length

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black">Team-Verzeichnis</h1>
          <p className="mt-1 text-sm text-slate-400">
            {displayed.length} von {teams.length} Teams · {clubs.length} Vereine
          </p>
        </div>
        <button onClick={openNew} className="rounded-xl bg-[#C6FF00] px-4 py-2 text-sm font-bold text-black hover:bg-[#d4ff33]">
          + Neues Team
        </button>
      </div>

      {/* Suche + Filter */}
      <div className="mb-4 flex flex-wrap gap-2">
        <input
          type="text"
          placeholder="Suchen…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="min-w-48 flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white placeholder-slate-500 outline-none focus:border-[#C6FF00]/50"
        />
        <FilterSelect value={filterState}   onChange={setFilterState}   placeholder="Bundesland">
          {availableStates.map(s => <option key={s} value={s}>{s}</option>)}
        </FilterSelect>
        <FilterSelect value={filterCountry} onChange={setFilterCountry} placeholder="Land">
          {availableCountries.map(c => <option key={c} value={c}>{c}</option>)}
        </FilterSelect>
        <FilterSelect value={filterLeague}  onChange={setFilterLeague}  placeholder="Liga">
          {availableLeagues.map(l => <option key={l} value={l}>{l}</option>)}
        </FilterSelect>
        <FilterSelect value={filterFlagos}  onChange={setFilterFlagos}  placeholder="FlagOS">
          <option value="active">🟢 Aktiv</option>
          <option value="testing">🟡 Testphase</option>
          <option value="none">– Nicht aktiv</option>
        </FilterSelect>
        <FilterSelect value={filterReview} onChange={setFilterReview} placeholder="Review">
          <option value="pending">⏳ Ausstehend</option>
          <option value="approved">✅ Freigegeben</option>
          <option value="rejected">❌ Abgelehnt</option>
        </FilterSelect>
        {activeFilters > 0 && (
          <button
            onClick={() => { setFilterState(''); setFilterCountry(''); setFilterLeague(''); setFilterFlagos(''); setFilterReview('') }}
            className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-400 hover:bg-red-500/20"
          >
            Filter löschen ({activeFilters})
          </button>
        )}
      </div>

      {/* Tabelle */}
      {loading ? (
        <p className="text-sm text-slate-400">Lädt…</p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-white/10">
          <table className="w-full text-sm">
            <thead className="border-b border-white/10 bg-white/[0.04] text-xs text-slate-400">
              <tr>
                <Th label="Code"       sortKey="team"    current={sortKey} dir={sortDir} onSort={toggleSort} />
                <Th label="Team"       sortKey="team"    current={sortKey} dir={sortDir} onSort={toggleSort} />
                <Th label="Verein"     sortKey="club"    current={sortKey} dir={sortDir} onSort={toggleSort} />
                <Th label="Stadt"      sortKey="city"    current={sortKey} dir={sortDir} onSort={toggleSort} />
                <Th label="Bundesland" sortKey="state"   current={sortKey} dir={sortDir} onSort={toggleSort} />
                <Th label="Land"       sortKey="country" current={sortKey} dir={sortDir} onSort={toggleSort} />
                <Th label="Liga"       sortKey="league"  current={sortKey} dir={sortDir} onSort={toggleSort} />
                <Th label="FlagOS"     sortKey="flagos"   current={sortKey} dir={sortDir} onSort={toggleSort} align="center" />
                <Th label="Status"     sortKey="verified" current={sortKey} dir={sortDir} onSort={toggleSort} align="center" />
                <Th label="Review"     sortKey="review"   current={sortKey} dir={sortDir} onSort={toggleSort} align="center" />
                <Th label="Erstellt"   sortKey="created"  current={sortKey} dir={sortDir} onSort={toggleSort} />
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {displayed.map(team => (
                <tr key={team.id} className="hover:bg-white/[0.02]">
                  <td className="px-4 py-3 font-mono text-xs text-slate-400 whitespace-nowrap">{formatTeamCode(team.team_code)}</td>
                  <td className="px-4 py-3 font-medium whitespace-nowrap">{team.public_name}</td>
                  <td className="px-4 py-3 text-xs text-slate-400 whitespace-nowrap">{clubDisplayName(team)}</td>
                  <td className="px-4 py-3 text-slate-300 whitespace-nowrap">{team.city || '–'}</td>
                  <td className="px-4 py-3 text-slate-300 whitespace-nowrap">{team.state || '–'}</td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-400">{team.country}</td>
                  <td className="px-4 py-3 text-xs text-slate-400">{team.league || '–'}</td>
                  <td className="px-4 py-3 text-center text-sm">{FLAGOS_LABELS[team.flagos_status]}</td>
                  <td className="px-4 py-3 text-center text-sm">{VERIFIED_LABELS[team.verification_status]}</td>
                  <td className={`px-4 py-3 text-center text-xs whitespace-nowrap ${REVIEW_COLORS[team.review_status]}`}>
                    {REVIEW_LABELS[team.review_status]}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">
                    {team.created_at ? new Date(team.created_at).toLocaleDateString('de-DE') : '–'}
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <button onClick={() => openEdit(team)} className="mr-3 text-xs text-slate-400 hover:text-white">Bearbeiten</button>
                    <button onClick={() => deleteTeam(team.id)} className="text-xs text-red-500 hover:text-red-400">Löschen</button>
                  </td>
                </tr>
              ))}
              {displayed.length === 0 && (
                <tr>
                  <td colSpan={12} className="px-4 py-8 text-center text-sm text-slate-500">Keine Teams gefunden.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Team-Modal */}
      {editing !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <div className="w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl border border-white/10 bg-[#0b1b2f] p-6">
            <h2 className="mb-4 text-lg font-bold">{editing.id ? 'Team bearbeiten' : 'Neues Team'}</h2>

            <div className="grid grid-cols-2 gap-3">
              {/* Verein */}
              <div className="col-span-2">
                <label className="mb-1 block text-xs font-medium text-slate-400">Verein *</label>
                <div className="flex gap-2">
                  <select value={form.club_id} onChange={e => setForm(f => ({ ...f, club_id: e.target.value }))} className={`${input} flex-1`}>
                    <option value="">— Verein auswählen —</option>
                    {clubs.map(c => <option key={c.id} value={c.id}>{normalizeEV(c.legal_name || c.name)}</option>)}
                  </select>
                  <button type="button" onClick={() => setShowNewClubModal(true)} className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-300 hover:bg-white/10 whitespace-nowrap">
                    + Neuer Verein
                  </button>
                </div>
                {selectedClub && (
                  <p className="mt-1 text-xs text-slate-500">{normalizeEV(selectedClub.legal_name || selectedClub.name)}{selectedClub.city ? ` · ${selectedClub.city}` : ''}</p>
                )}
              </div>

              <Field label="Öffentlicher Teamname *" colSpan={2}>
                <input type="text" value={form.public_name} onChange={e => updateForm({ public_name: e.target.value })} placeholder="z.B. Neu-Ulm Spartans Senior Flag" className={input} />
              </Field>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-400">
                  Team-Code {!editing.id && <span className="text-slate-500">(wird vorgeschlagen)</span>}
                </label>
                <input type="text" value={form.team_code} onChange={e => setForm(f => ({ ...f, team_code: e.target.value }))} placeholder="DENULSPA" className={`${input} font-mono uppercase`} maxLength={8} />
                {form.team_code.length === 8 && <p className="mt-1 text-xs text-slate-500">→ {formatTeamCode(form.team_code)}</p>}
              </div>
              <Field label="Kurzname" colSpan={1}>
                <input type="text" value={form.short_name} onChange={e => setForm(f => ({ ...f, short_name: e.target.value }))} placeholder="z.B. Spartans" className={input} />
              </Field>

              <Field label="Stadt" colSpan={1}>
                <input type="text" value={form.city} onChange={e => updateForm({ city: e.target.value })} className={input} />
              </Field>
              <Field label="Bundesland" colSpan={1}>
                <input type="text" value={form.state} onChange={e => setForm(f => ({ ...f, state: e.target.value }))} className={input} />
              </Field>
              <Field label="Land" colSpan={1}>
                <select value={form.country} onChange={e => updateForm({ country: e.target.value })} className={input}>
                  <option value="DE">Deutschland (DE)</option>
                  <option value="AT">Österreich (AT)</option>
                  <option value="CH">Schweiz (CH)</option>
                  <option value="US">USA (US)</option>
                  <option value="GB">Großbritannien (GB)</option>
                  <option value="FR">Frankreich (FR)</option>
                </select>
              </Field>

              <Field label="Altersklasse" colSpan={1}>
                <select value={form.age_group} onChange={e => setForm(f => ({ ...f, age_group: e.target.value as DirectoryTeam['age_group'] }))} className={input}>
                  {(Object.entries(AGE_GROUP_LABELS) as [DirectoryTeam['age_group'], string][]).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </Field>
              <Field label="Kategorie" colSpan={1}>
                <select value={form.gender_category} onChange={e => setForm(f => ({ ...f, gender_category: e.target.value as DirectoryTeam['gender_category'] }))} className={input}>
                  {(Object.entries(GENDER_LABELS) as [DirectoryTeam['gender_category'], string][]).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </Field>

              <Field label="Liga" colSpan={1}>
                <input type="text" value={form.league} onChange={e => setForm(f => ({ ...f, league: e.target.value }))} className={input} />
              </Field>
              <Field label="Verband" colSpan={1}>
                <input type="text" value={form.association} onChange={e => setForm(f => ({ ...f, association: e.target.value }))} className={input} />
              </Field>

              <Field label="FlagOS-Status" colSpan={1}>
                <select value={form.flagos_status} onChange={e => setForm(f => ({ ...f, flagos_status: e.target.value as DirectoryTeam['flagos_status'] }))} className={input}>
                  <option value="none">Nicht aktiv</option>
                  <option value="testing">In Testphase 🟡</option>
                  <option value="active">Aktiv 🟢</option>
                </select>
              </Field>
              <Field label="Verifikation" colSpan={1}>
                <select value={form.verification_status} onChange={e => setForm(f => ({ ...f, verification_status: e.target.value as DirectoryTeam['verification_status'] }))} className={input}>
                  <option value="unverified">Nicht verifiziert</option>
                  <option value="pending">Ausstehend ⏳</option>
                  <option value="verified">Verifiziert ✅</option>
                </select>
              </Field>

              <Field label="Logo-URL (optional)" colSpan={2}>
                <input type="text" value={form.logo_url} onChange={e => setForm(f => ({ ...f, logo_url: e.target.value }))} className={input} />
              </Field>
              <Field label="Website (optional)" colSpan={1}>
                <input type="text" value={form.website} onChange={e => setForm(f => ({ ...f, website: e.target.value }))} className={input} />
              </Field>
              <Field label="Instagram (optional)" colSpan={1}>
                <input type="text" value={form.instagram} onChange={e => setForm(f => ({ ...f, instagram: e.target.value }))} className={input} />
              </Field>
            </div>

            {error && <p className="mt-3 text-sm text-red-400">{error}</p>}

            {/* Review-Status (nur bei bestehendem Team) */}
            {editing?.id && (
              <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.03] p-3">
                <p className="mb-2 text-xs font-medium text-slate-400">Review-Status</p>
                <div className="flex items-center gap-2">
                  <span className={`flex-1 text-sm font-medium ${REVIEW_COLORS[editing.review_status ?? 'pending']}`}>
                    {REVIEW_LABELS[editing.review_status ?? 'pending']}
                  </span>
                  {editing.review_status !== 'approved' && (
                    <button
                      onClick={async () => { await approveTeam(editing.id) }}
                      className="rounded-xl bg-green-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-green-500"
                    >
                      ✅ Freigeben
                    </button>
                  )}
                  {editing.review_status !== 'rejected' && (
                    <button
                      onClick={async () => { await rejectTeam(editing.id) }}
                      className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs text-red-400 hover:bg-red-500/20"
                    >
                      ❌ Ablehnen
                    </button>
                  )}
                </div>
              </div>
            )}

            <div className="mt-5 flex justify-end gap-3">
              <button onClick={() => setEditing(null)} className="rounded-xl px-4 py-2 text-sm text-slate-400 hover:text-white">Abbrechen</button>
              <button onClick={save} disabled={saving} className="rounded-xl bg-[#C6FF00] px-4 py-2 text-sm font-bold text-black hover:bg-[#d4ff33] disabled:opacity-50">
                {saving ? 'Speichert…' : 'Speichern'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Neuer-Verein-Modal */}
      {showNewClubModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 px-4">
          <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#0b1b2f] p-6">
            <h3 className="mb-4 text-base font-bold">Neuer Verein anlegen</h3>
            <div className="flex flex-col gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-400">Anzeigename *</label>
                <input type="text" value={newClubName} onChange={e => setNewClubName(e.target.value)} placeholder="z.B. TSV 1880 Neu-Ulm" className={input} autoFocus />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-400">Vollständiger Name (mit e. V. falls zutreffend)</label>
                <input type="text" value={newClubLegal} onChange={e => setNewClubLegal(e.target.value)} placeholder="z.B. TSV 1880 Neu-Ulm e. V." className={input} />
              </div>
            </div>
            <div className="mt-4 flex justify-end gap-3">
              <button onClick={() => { setShowNewClubModal(false); setNewClubName(''); setNewClubLegal('') }} className="rounded-xl px-4 py-2 text-sm text-slate-400 hover:text-white">Abbrechen</button>
              <button onClick={createClub} disabled={creatingClub || !newClubName.trim()} className="rounded-xl bg-[#C6FF00] px-4 py-2 text-sm font-bold text-black hover:bg-[#d4ff33] disabled:opacity-50">
                {creatingClub ? 'Erstellt…' : 'Anlegen'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Hilfkomponenten ───────────────────────────────────────────

const input = "w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-[#C6FF00]/50"

function Field({ label, colSpan, children }: { label: string; colSpan: 1 | 2; children: React.ReactNode }) {
  return (
    <div className={colSpan === 2 ? 'col-span-2' : ''}>
      <label className="mb-1 block text-xs font-medium text-slate-400">{label}</label>
      {children}
    </div>
  )
}

function FilterSelect({ value, onChange, placeholder, children }: {
  value: string
  onChange: (v: string) => void
  placeholder: string
  children: React.ReactNode
}) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className={`rounded-xl border px-3 py-2 text-sm outline-none transition ${
        value
          ? 'border-[#C6FF00]/40 bg-[#C6FF00]/10 text-[#C6FF00]'
          : 'border-white/10 bg-white/5 text-slate-400'
      }`}
    >
      <option value="">{placeholder}</option>
      {children}
    </select>
  )
}

function Th({ label, sortKey, current, dir, onSort, align = 'left' }: {
  label: string
  sortKey: SortKey
  current: SortKey
  dir: SortDir
  onSort: (k: SortKey) => void
  align?: 'left' | 'center'
}) {
  const active = current === sortKey
  return (
    <th
      className={`cursor-pointer select-none px-4 py-3 uppercase tracking-wider transition hover:text-white ${align === 'center' ? 'text-center' : 'text-left'} ${active ? 'text-[#C6FF00]' : ''}`}
      onClick={() => onSort(sortKey)}
    >
      {label}{active ? (dir === 'asc' ? ' ↑' : ' ↓') : ''}
    </th>
  )
}
