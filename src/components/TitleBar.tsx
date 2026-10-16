// Eigene Titelleiste der installierten App: „FlagOS Competition“ mittig.
// Nur sichtbar, wenn Chrome/Edge die Titelleiste der App überlässt (Window Controls Overlay).
// Die Fensterknöpfe sowie ⋯ und das Erweiterungs-Symbol gehören dem Browser und bleiben rechts.
import { useTitleBarOverlay } from "../lib/windowControls";

export default function TitleBar() {
  const visible = useTitleBarOverlay();
  if (!visible) return null;
  return (
    <div className="app-drag fixed inset-x-0 top-0 z-[60] flex items-center justify-center bg-[#081426] text-xs" style={{ height: "var(--tb)" }} data-testid="title-bar">
      <span className="truncate px-40 font-semibold tracking-wide text-slate-300">
        <b className="font-display text-sm font-extrabold uppercase tracking-[0.12em] text-slate-100">FlagOS Competition</b>
      </span>
    </div>
  );
}
