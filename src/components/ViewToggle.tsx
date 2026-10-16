// Umschalter „Liste | Kacheln“ (Liste ist Standard) – gleich im Team-Verzeichnis und bei den Teams
export type ViewMode = "list" | "grid";

export default function ViewToggle({ value, onChange }: { value: ViewMode; onChange: (v: ViewMode) => void }) {
  const cls = (on: boolean) =>
    `rounded-lg px-3 py-1.5 text-xs font-semibold transition ${on ? "bg-[#C6FF00] text-[#06111f]" : "text-slate-400 hover:text-slate-100"}`;
  return (
    <div className="flex flex-shrink-0 items-center gap-1 rounded-xl border border-white/10 bg-white/5 p-1">
      <button type="button" onClick={() => onChange("list")} title="Liste" className={cls(value === "list")}>☰ Liste</button>
      <button type="button" onClick={() => onChange("grid")} title="Kacheln" className={cls(value === "grid")}>⊞ Kacheln</button>
    </div>
  );
}
