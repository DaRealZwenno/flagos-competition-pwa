// Hinweis „Update verfügbar“
import { applyUpdate, dismissUpdate, useUpdateBanner } from "../lib/pwaUpdate";

export default function UpdateBanner() {
  const show = useUpdateBanner();
  if (!show) return null;
  return (
    <div role="status" data-testid="update-banner"
      className="fixed inset-x-0 bottom-3 z-[100] mx-auto flex w-fit max-w-[calc(100vw-1.5rem)] items-center gap-3 rounded-full border border-[#C6FF00]/50 bg-[#0f1d31] py-2 pl-4 pr-2 text-sm text-slate-100 shadow-2xl">
      <span className="h-2 w-2 flex-none rounded-full bg-[#C6FF00]" />
      <span>Update verfügbar</span>
      <button type="button" onClick={applyUpdate} className="rounded-full bg-[#C6FF00] px-3 py-1 text-xs font-bold text-[#06111f] hover:brightness-110">Neu laden</button>
      <button type="button" onClick={dismissUpdate} className="rounded-full px-2 py-1 text-xs text-slate-400 hover:text-slate-100" title="Später – bleibt als Zahl am Zahnrad gemerkt" aria-label="Später">✕</button>
    </div>
  );
}
