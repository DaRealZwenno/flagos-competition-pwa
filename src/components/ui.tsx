// Kleine UI-Bausteine im FlagOS-Look (wie Broadcast: #06111F, Akzent #C6FF00)
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from "react";

export function Card({ title, hint, children, className = "", actions }: {
  title?: ReactNode; hint?: ReactNode; children: ReactNode; className?: string; actions?: ReactNode;
}) {
  return (
    <section className={`rounded-2xl border border-white/10 bg-[#0f1d31] p-5 ${className}`}>
      {(title || actions) && (
        <div className="mb-4 flex flex-wrap items-center gap-3">
          {title && <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-[#C6FF00]">{title}</h2>}
          {hint && <span className="text-xs text-slate-400">{hint}</span>}
          {actions && <div className="ml-auto flex flex-wrap gap-2">{actions}</div>}
        </div>
      )}
      {children}
    </section>
  );
}

type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "ghost" | "default" | "danger" | "live"; size?: "sm" | "md" | "lg" };
export function Button({ variant = "default", size = "md", className = "", ...p }: BtnProps) {
  const v = {
    primary: "bg-[#C6FF00] text-[#06111f] border-[#C6FF00] hover:brightness-110",
    ghost: "bg-transparent border-white/15 text-slate-200 hover:border-white/35",
    default: "bg-white/5 border-white/15 text-slate-100 hover:border-white/35",
    danger: "bg-transparent border-white/15 text-slate-300 hover:border-red-400 hover:text-red-300",
    live: "bg-red-500 border-red-500 text-white hover:brightness-110",
  }[variant];
  const s = size === "sm" ? "px-2.5 py-1.5 text-xs" : size === "lg" ? "px-5 py-3 text-base" : "px-3.5 py-2 text-sm";
  return <button type="button" className={`inline-flex items-center justify-center gap-1.5 rounded-lg border font-semibold whitespace-nowrap transition disabled:cursor-default disabled:opacity-40 ${v} ${s} ${className}`} {...p} />;
}

export function Field({ label, children, className = "" }: { label: string; children: ReactNode; className?: string }) {
  return <label className={`flex flex-col gap-1.5 text-xs font-semibold text-slate-400 ${className}`}>{label}{children}</label>;
}

export const inputCls =
  "w-full rounded-lg border border-white/15 bg-[#07101d] px-3 py-2 text-sm font-medium text-slate-50 outline-none focus:border-[#C6FF00] focus:ring-2 focus:ring-[#C6FF00]/15";

export function TextInput(p: InputHTMLAttributes<HTMLInputElement>) {
  return <input type="text" {...p} className={`${inputCls} ${p.className || ""}`} />;
}

export function Tag({ children, tone = "muted" }: { children: ReactNode; tone?: "muted" | "accent" | "ok" | "warn" | "error" }) {
  const t = {
    muted: "border-white/15 text-slate-400",
    accent: "border-[#C6FF00]/40 text-[#C6FF00] bg-[#C6FF00]/10",
    ok: "border-emerald-400/40 text-emerald-300 bg-emerald-400/10",
    warn: "border-amber-400/40 text-amber-300 bg-amber-400/10",
    error: "border-red-400/50 text-red-300 bg-red-400/10",
  }[tone];
  return <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.15em] ${t}`}>{children}</span>;
}

export function PageTitle({ title, sub }: { title: string; sub?: ReactNode }) {
  return (
    <header className="mb-6">
      <h1 className="font-display text-3xl font-extrabold uppercase tracking-wide">{title}</h1>
      {sub && <p className="mt-1 max-w-3xl text-sm text-slate-400">{sub}</p>}
    </header>
  );
}

/** Kleiner Dialog (statt Browser-confirm, damit Inhalte gestaltet werden können) */
export function Dialog({ title, children, onClose, actions, wide = false }: { title: string; children: ReactNode; onClose: () => void; actions?: ReactNode; wide?: boolean }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4 backdrop-blur-sm" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
      onKeyDown={(e) => { if (e.key === "Escape") onClose(); }}>
      <div role="dialog" aria-modal="true" aria-label={title} className={`max-h-[90vh] w-full overflow-y-auto rounded-2xl border border-white/15 bg-[#0f1d31] p-6 shadow-2xl ${wide ? "max-w-3xl" : "max-w-lg"}`}>
        <h2 className="font-display text-2xl font-extrabold uppercase tracking-wide">{title}</h2>
        <div className="mt-3 text-sm text-slate-300">{children}</div>
        {actions && <div className="mt-6 flex flex-wrap justify-end gap-2">{actions}</div>}
      </div>
    </div>
  );
}

/** Auswahlfeld (Dropdown) – einheitlich in Verzeichnis, Competition-Auswahl und Filtern */
export const selectCls =
  "rounded-xl border border-white/10 bg-[#06111f] px-4 py-2.5 text-sm text-slate-100 focus:border-[#C6FF00]/50 focus:outline-none";
