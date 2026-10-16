// Einklappbarer Bereich (Spielplan: Vorrunde / K.-o.-Phase, Tabellen: Gruppen)
import { useState, type ReactNode } from "react";

export default function Collapsible({ title, hint, defaultOpen = true, children }: {
  title: string; hint?: string; defaultOpen?: boolean; children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className="rounded-2xl border border-white/10 bg-[#0f1d31]">
      <button
        type="button" aria-expanded={open} onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-3 px-5 py-4 text-left"
      >
        <span className={`text-[#C6FF00] transition-transform ${open ? "rotate-90" : ""}`} aria-hidden>▸</span>
        <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-[#C6FF00]">{title}</h2>
        {hint && <span className="text-xs text-slate-400">{hint}</span>}
      </button>
      {open && <div className="px-5 pb-5">{children}</div>}
    </section>
  );
}
