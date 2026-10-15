import { useEffect, useState } from 'react'
import { supabase } from '../services/supabaseClient'
import type { JoinRequest } from './adminTypes'

const STATUS_LABEL: Record<JoinRequest['status'], string> = {
  pending: 'Offen',
  approved: 'Genehmigt',
  rejected: 'Abgelehnt',
}

const STATUS_COLOR: Record<JoinRequest['status'], string> = {
  pending: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20',
  approved: 'text-green-400 bg-green-400/10 border-green-400/20',
  rejected: 'text-red-400 bg-red-400/10 border-red-400/20',
}

export default function RequestsPage() {
  const [requests, setRequests] = useState<JoinRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<JoinRequest['status'] | 'all'>('pending')
  const [acting, setActing] = useState<string | null>(null)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const { data } = await supabase
      .from('team_join_requests')
      .select('id, team_code, applicant_name, applicant_email, status, created_at, reviewed_at')
      .order('created_at', { ascending: false })
    setRequests(data ?? [])
    setLoading(false)
  }

  async function approve(id: string) {
    setActing(id)
    await supabase.rpc('approve_join_request', { p_request_id: id })
    setActing(null)
    load()
  }

  async function reject(id: string) {
    setActing(id)
    await supabase.rpc('reject_join_request', { p_request_id: id })
    setActing(null)
    load()
  }

  const filtered = filter === 'all' ? requests : requests.filter(r => r.status === filter)
  const pendingCount = requests.filter(r => r.status === 'pending').length

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-black">Registrierungsanfragen</h1>
        <p className="mt-1 text-sm text-slate-400">
          {pendingCount > 0
            ? <span className="text-yellow-400 font-medium">{pendingCount} offen</span>
            : 'Keine offenen Anfragen'}
          {' '}· {requests.length} gesamt
        </p>
      </div>

      {/* Filter */}
      <div className="mb-4 flex gap-2">
        {(['pending', 'approved', 'rejected', 'all'] as const).map(s => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition ${
              filter === s
                ? 'bg-[#C6FF00]/20 text-[#C6FF00]'
                : 'bg-white/5 text-slate-400 hover:bg-white/10'
            }`}
          >
            {s === 'all' ? 'Alle' : STATUS_LABEL[s]}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-sm text-slate-400">Lädt…</p>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-slate-400">Keine Anfragen in dieser Kategorie.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map(req => (
            <div key={req.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-bold">{req.team_code}</span>
                    <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${STATUS_COLOR[req.status]}`}>
                      {STATUS_LABEL[req.status]}
                    </span>
                  </div>
                  <div className="mt-1 text-base font-semibold">{req.applicant_name}</div>
                  <div className="text-sm text-slate-400">{req.applicant_email}</div>
                  <div className="mt-2 text-xs text-slate-500">
                    Eingegangen: {new Date(req.created_at).toLocaleDateString('de-DE')}
                    {req.reviewed_at && ` · Bearbeitet: ${new Date(req.reviewed_at).toLocaleDateString('de-DE')}`}
                  </div>
                </div>

                {req.status === 'pending' && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => approve(req.id)}
                      disabled={acting === req.id}
                      className="rounded-xl bg-green-500/20 px-4 py-2 text-sm font-medium text-green-400 hover:bg-green-500/30 disabled:opacity-50"
                    >
                      Genehmigen
                    </button>
                    <button
                      onClick={() => reject(req.id)}
                      disabled={acting === req.id}
                      className="rounded-xl bg-red-500/20 px-4 py-2 text-sm font-medium text-red-400 hover:bg-red-500/30 disabled:opacity-50"
                    >
                      Ablehnen
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
