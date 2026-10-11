import { useEffect, useState } from 'react'
import { supabase } from '../services/supabaseClient'
import './adminTheme.css'

type AdminPage = 'teams' | 'requests' | 'imports'

type Props = {
  children: React.ReactNode
  activePage: AdminPage
  onNavigate: (page: AdminPage) => void
}

const nav: { id: AdminPage; label: string }[] = [
  { id: 'teams',    label: 'Team-Verzeichnis' },
  { id: 'imports',  label: 'Team-Importe' },
  { id: 'requests', label: 'Registrierungsanfragen' },
]

export default function AdminLayout({ children, activePage, onNavigate }: Props) {
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    return (localStorage.getItem('flagos-admin-theme') as 'dark' | 'light') ?? 'dark'
  })

  useEffect(() => {
    localStorage.setItem('flagos-admin-theme', theme)
  }, [theme])

  function toggleTheme() {
    setTheme(t => t === 'dark' ? 'light' : 'dark')
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    window.location.href = window.location.origin
  }

  return (
    <div
      className="flex min-h-screen bg-[#06111f] text-slate-50"
      data-admin-theme={theme}
    >
      {/* Sidebar — bleibt immer dunkel */}
      <aside className="flex w-56 flex-col border-r border-white/10 bg-white/[0.03] px-4 py-6">
        <div className="mb-8">
          <div className="mb-1 text-xs font-semibold uppercase tracking-[0.25em] text-[#C6FF00]">FlagOS</div>
          <div className="text-lg font-black">Admin-Panel</div>
        </div>

        <nav className="flex flex-1 flex-col gap-2">
          {nav.map(item => (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`rounded-xl px-3 py-2.5 text-left text-sm font-medium transition ${
                activePage === item.id
                  ? 'bg-[#C6FF00] text-[#06111f] font-semibold'
                  : 'text-slate-300 hover:bg-white/5 hover:text-white'
              }`}
            >
              {item.label}
            </button>
          ))}
        </nav>

        {/* Theme Toggle + Logout */}
        <div className="flex flex-col gap-3 pt-4 border-t border-white/10">
          {/* Pill Toggle */}
          <div className="flex rounded-xl bg-white/[0.06] p-1 gap-1">
            <button
              onClick={() => setTheme('dark')}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-medium transition ${
                theme === 'dark'
                  ? 'bg-[#C6FF00] text-[#06111f]'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
              Dark
            </button>
            <button
              onClick={() => setTheme('light')}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-medium transition ${
                theme === 'light'
                  ? 'bg-[#C6FF00] text-[#06111f]'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
              Light
            </button>
          </div>
          <button
            onClick={handleLogout}
            className="rounded-xl px-3 py-2 text-left text-xs font-medium text-slate-500 transition hover:bg-white/5 hover:text-slate-300"
          >
            Ausloggen
          </button>
        </div>
      </aside>

      {/* Content */}
      <main className="flex-1 overflow-auto p-8">{children}</main>
    </div>
  )
}
