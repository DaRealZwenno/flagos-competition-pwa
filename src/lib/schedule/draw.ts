// Auslosung: verteilt die echten Teams auf die Plätze eines Vorlagen-Plans.
// Mit gespeichertem Zufallswert (seed) ist jede Auslosung nachvollziehbar und wiederholbar.
import type { PlanTemplate } from "./types.ts";
import { seatsOf } from "./types.ts";

/** Kleiner, deterministischer Zufallsgenerator (mulberry32) */
export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffle<T>(items: T[], seed: number): T[] {
  const r = rng(seed);
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export const newSeed = () => Math.floor(Math.random() * 2 ** 31);

export interface DrawOptions {
  seed: number;
  /** Ausrichter nimmt teil: bleibt auf Platz A1 (erstes Spiel als Heimteam) */
  hostId?: string;
  hostParticipates: boolean;
}

/** Platz → Team-ID */
export type SeatMap = Record<string, string>;

export function draw(t: PlanTemplate, teamIds: string[], o: DrawOptions): SeatMap {
  if (teamIds.length !== t.teams) throw new Error(`Der Plan braucht genau ${t.teams} Teams, es sind ${teamIds.length}.`);
  if (new Set(teamIds).size !== teamIds.length) throw new Error("Ein Team kommt doppelt vor.");
  const seats = seatsOf(t);
  const map: SeatMap = {};
  let rest = teamIds;
  let free = seats;
  if (o.hostParticipates && o.hostId) {
    if (!teamIds.includes(o.hostId)) throw new Error("Der Ausrichter gehört nicht zu den Teams.");
    map[seats[0]] = o.hostId;                       // Platz A1
    rest = teamIds.filter((x) => x !== o.hostId);
    free = seats.slice(1);
  }
  const mixed = shuffle(rest, o.seed);
  free.forEach((s, i) => { map[s] = mixed[i]; });
  return map;
}
