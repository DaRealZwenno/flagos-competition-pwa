// Service-Worker-Updates: sichtbarer Hinweis „Update verfügbar“ statt stillem Neuladen (mitten im Spiel).
// Übernommen aus FlagOS Broadcast (ohne Overlay-Sonderfall).
//
// Wann wird nach einer neuen Version gesucht?
//  · beim Öffnen der App (Browser-Standard)
//  · wenn die App wieder in den Vordergrund kommt
//  · alle 30 Minuten, solange die App offen ist
//  · von Hand: Einstellungen → App-Version → „Nach Updates suchen“
// Eingespielt wird eine neue Version erst nach „Neu laden“ – nie automatisch während einer Veranstaltung.
import { useSyncExternalStore } from "react";
import { registerSW } from "virtual:pwa-register";

const CHECK_EVERY_MS = 30 * 60 * 1000;
const MIN_GAP_MS = 60 * 1000; // nicht öfter als einmal pro Minute nachsehen

let needRefresh = false;
let registration: ServiceWorkerRegistration | undefined;
let lastCheck = 0;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export function initPwaUpdates() {
  // registerSW nur für die Erkennung („Update verfügbar“). Eingespielt wird über applyUpdate (unten).
  registerSW({
    immediate: true,
    onNeedRefresh() {
      needRefresh = true;
      emit();
    },
    onRegisteredSW(_url, r) {
      registration = r;
      if (!r) return;
      window.setInterval(() => void quietCheck(), CHECK_EVERY_MS);
      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible") void quietCheck();
      });
    },
  });
}

let running: Promise<void> | null = null;
/** registration.update() – nie parallel */
function runUpdate(): Promise<void> {
  if (!registration) return Promise.resolve();
  if (!running) {
    lastCheck = Date.now();
    running = registration.update().then(() => undefined).finally(() => { running = null; });
  }
  return running;
}

async function quietCheck() {
  if (!registration || !navigator.onLine || Date.now() - lastCheck < MIN_GAP_MS) return;
  try { await runUpdate(); } catch { /* offline o. Ä. – nächstes Mal */ }
}

export type CheckResult = "update" | "current" | "offline" | "unavailable";

/** Von Hand nach einer neuen Version suchen (Einstellungen) */
export async function checkForUpdate(): Promise<CheckResult> {
  if (needRefresh) return "update";
  if (!registration) return "unavailable"; // z. B. npm run dev (kein Service Worker)
  if (!navigator.onLine) return "offline";
  try {
    await runUpdate();
  } catch {
    return "offline";
  }
  // Neue Version wird ggf. noch installiert → kurz abwarten, bis sie bereitsteht
  const installing = registration.installing;
  if (installing) {
    await new Promise<void>((resolve) => {
      const done = () => resolve();
      const t = window.setTimeout(done, 15000);
      installing.addEventListener("statechange", () => {
        if (installing.state === "installed" || installing.state === "redundant") { clearTimeout(t); window.setTimeout(done, 300); }
      });
    });
  }
  return needRefresh || registration.waiting ? "update" : "current";
}

export type LiveVersion = { buildId: string; commit: string; builtAt?: string; version?: string };

/** Was liegt gerade auf dem Server? (version.json, schreibt der Build) */
export async function fetchLiveVersion(): Promise<LiveVersion | null> {
  try {
    const r = await fetch("/version.json", { cache: "no-store" });
    if (!r.ok) return null;
    const j = (await r.json()) as LiveVersion;
    return j && typeof j.buildId === "string" && typeof j.commit === "string" ? j : null;
  } catch {
    return null;
  }
}

export const appVersion = __APP_VERSION__;
/**
 * Neue Version einspielen: wartende Version aktivieren, dann neu laden.
 *
 * Nicht über updateSW(true) von vite-plugin-pwa: das lädt erst neu, wenn die neue Version die Seite übernimmt
 * (controllerchange). Beim ersten Start einer frisch installierten App ist die Seite aber noch gar nicht vom
 * Service Worker gesteuert – dann kommt dieses Signal nie und „Neu laden“ bewirkt nichts (so passiert in der
 * Safari-Web-App von FlagOS Events, 25.10.2026). Deshalb: neu laden, sobald die neue Version aktiv ist ODER die Seite
 * übernimmt; spätestens nach 4 Sekunden. Ist keine Version (mehr) wartend, sofort neu laden.
 */
export function applyUpdate() {
  let done = false;
  const reload = () => { if (!done) { done = true; window.location.reload(); } };
  const waiting = registration?.waiting;
  if (!waiting) { reload(); return; }
  navigator.serviceWorker?.addEventListener("controllerchange", reload);
  waiting.addEventListener("statechange", () => { if (waiting.state === "activated") reload(); });
  waiting.postMessage({ type: "SKIP_WAITING" });
  window.setTimeout(reload, 4000);
}
/** Hinweis unten wegklicken – das Update bleibt offen (Zahl am Zahnrad, Einstellungen → App-Version) */
let bannerHidden = false;
export const dismissUpdate = () => { bannerHidden = true; emit(); };

const subscribe = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l); }; };
export const useUpdateAvailable = () => useSyncExternalStore(subscribe, () => needRefresh, () => needRefresh);
export const useUpdateBanner = () => useSyncExternalStore(subscribe, () => needRefresh && !bannerHidden, () => false);
