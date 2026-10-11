import { useState } from 'react'
import { supabase } from '../services/supabaseClient'

type Props = { onLogin: () => void }

export default function AdminLogin({ onLogin }: Props) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { error: authError } = await supabase.auth.signInWithPassword({ email, password })
    if (authError) {
      setError('Ungültige Zugangsdaten.')
      setLoading(false)
      return
    }

    const { data, error: roleError } = await supabase.rpc('is_platform_admin')
    if (roleError || !data) {
      await supabase.auth.signOut()
      setError('Kein Zugriff. Nur System-Admins dürfen sich hier einloggen.')
      setLoading(false)
      return
    }

    onLogin()
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#06111f] px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mb-4 inline-flex rounded-full border border-[#C6FF00]/30 bg-[#C6FF00]/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.25em] text-[#C6FF00]">
            FlagOS
          </div>
          <h1 className="text-2xl font-black text-white">Admin-Panel</h1>
          <p className="mt-2 text-sm text-slate-400">Nur für System-Admins</p>
        </div>

        <form onSubmit={handleSubmit} className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <div className="mb-4">
            <label className="mb-1.5 block text-sm font-medium text-slate-300">E-Mail</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-slate-500 outline-none focus:border-[#C6FF00]/50 focus:ring-1 focus:ring-[#C6FF00]/30"
              placeholder="admin@flagos.de"
            />
          </div>

          <div className="mb-6">
            <label className="mb-1.5 block text-sm font-medium text-slate-300">Passwort</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-slate-500 outline-none focus:border-[#C6FF00]/50 focus:ring-1 focus:ring-[#C6FF00]/30"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <p className="mb-4 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-2.5 text-sm text-red-400">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-[#C6FF00] py-2.5 text-sm font-bold text-black transition hover:bg-[#d4ff33] disabled:opacity-50"
          >
            {loading ? 'Wird geprüft…' : 'Einloggen'}
          </button>
        </form>
      </div>
    </div>
  )
}
