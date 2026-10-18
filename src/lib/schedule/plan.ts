// Aus Vorlage + Auslosung + Startzeit den konkreten Spielplan bauen.
import type { PlanGame, PlanTemplate, PlannedGame, Ref } from "./types.ts";
import type { SeatMap } from "./draw.ts";

/** Anzeigetext eines Verweises ohne Auslosung, z. B. „Platz A1“, „1. Gruppe A“, „Sieger HF 1“ */
export function refLabel(ref: Ref | null): string {
  if (ref === null) return "Team Officials";
  const [kind, v] = ref.split(":");
  if (kind === "seat") return `Platz ${v}`;
  if (kind === "rank") return `${v.slice(1)}. Gruppe ${v[0]}`;
  const g = v.replace(/^([A-Z]+)(\d*)$/, (_m, a: string, b: string) => (b ? `${a} ${b}` : a));
  if (kind === "win") return `Sieger ${g}`;
  if (kind === "lose") return `Verlierer ${g}`;
  return ref;
}

export interface BuildOptions {
  startsAt: string;          // ISO, Beginn des ersten Slots
  slotMinutes: number;       // Standard 30 (einstellbar)
  seats?: SeatMap;           // aus der Auslosung
  teamNames?: Record<string, string>; // Team-ID → Name
}

export function buildPlan(t: PlanTemplate, o: BuildOptions): PlannedGame[] {
  const start = Date.parse(o.startsAt);
  const resolve = (ref: Ref | null): { id?: string; label: string } => {
    if (ref !== null && ref.startsWith("seat:") && o.seats) {
      const id = o.seats[ref.slice(5)];
      return { id, label: (id && o.teamNames?.[id]) || refLabel(ref) };
    }
    return { label: refLabel(ref) };
  };
  return t.games.map((g: PlanGame) => {
    const home = resolve(g.home), away = resolve(g.away), off = resolve(g.officials);
    return {
      ...g,
      startsAt: new Date(start + (g.slot - 1) * o.slotMinutes * 60_000).toISOString(),
      homeTeamId: home.id, awayTeamId: away.id, officialsTeamId: off.id,
      homeLabel: home.label, awayLabel: away.label, officialsLabel: off.label,
    };
  });
}
