// Gemeinsamer Zustand: alle sichtbaren Competitions, Auswahl, automatische Aktualisierung.
// Aktualisierung: Realtime (sofort) + Nachladen alle 30 s als Rückfall + beim Zurückkehren in die App.
import { useSyncExternalStore } from "react";
import type { Competition } from "../types/competition";
import { competitionStart, fetchCompetitions, subscribeCompetitionChanges } from "../services/competitionApi";

export type CompetitionsState = {
  status: "loading" | "ready" | "error";
  competitions: Competition[];
  selectedId: string | null;
  error?: string;
  updatedAt?: number;
};

const SELECTED_KEY = "flagos-competition-selected";
const readSelected = () => { try { return localStorage.getItem(SELECTED_KEY); } catch { return null; } };

let state: CompetitionsState = { status: "loading", competitions: [], selectedId: readSelected() };
const listeners = new Set<() => void>();
const set = (patch: Partial<CompetitionsState>) => { state = { ...state, ...patch }; listeners.forEach((l) => l()); };

/** Standardauswahl: laufende, sonst nächste anstehende, sonst zuletzt gespielte Competition */
function pickDefault(list: Competition[]): string | null {
  if (list.length === 0) return null;
  const now = Date.now();
  const startOf = (c: Competition) => Date.parse(competitionStart(c) ?? "") || 0;
  const running = list.find((c) => c.games.some((g) => g.status === "running"));
  if (running) return running.id;
  const upcoming = list.filter((c) => startOf(c) >= now - 12 * 3600e3).sort((a, b) => startOf(a) - startOf(b))[0];
  if (upcoming) return upcoming.id;
  return [...list].sort((a, b) => startOf(b) - startOf(a))[0].id;
}

let loading = false;
export async function reloadCompetitions() {
  if (loading) return;
  loading = true;
  try {
    const competitions = (await fetchCompetitions()).sort((a, b) =>
      (competitionStart(a) ?? "9999").localeCompare(competitionStart(b) ?? "9999") || a.name.localeCompare(b.name, "de"));
    const keep = state.selectedId && competitions.some((c) => c.id === state.selectedId) ? state.selectedId : pickDefault(competitions);
    set({ status: "ready", competitions, selectedId: keep, error: undefined, updatedAt: Date.now() });
  } catch (e) {
    // zuletzt geladener Stand bleibt sichtbar
    set({ status: state.competitions.length > 0 ? "ready" : "error", error: e instanceof Error ? e.message : "Unbekannter Fehler" });
  } finally {
    loading = false;
  }
}

export function selectCompetition(id: string) {
  try { localStorage.setItem(SELECTED_KEY, id); } catch { /* Speicher nicht verfügbar */ }
  set({ selectedId: id });
}

let started = false;
export function startCompetitions() {
  if (started) return;
  started = true;
  void reloadCompetitions();
  let timer: number | undefined;
  const debounced = () => { window.clearTimeout(timer); timer = window.setTimeout(() => void reloadCompetitions(), 500); };
  subscribeCompetitionChanges(debounced);
  window.setInterval(() => { if (document.visibilityState === "visible") void reloadCompetitions(); }, 30_000);
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") void reloadCompetitions(); });
}

const subscribe = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l); }; };
export const useCompetitions = () => useSyncExternalStore(subscribe, () => state, () => state);

export function useSelectedCompetition(): Competition | undefined {
  const s = useCompetitions();
  return s.competitions.find((c) => c.id === s.selectedId);
}
