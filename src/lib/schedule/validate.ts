// Prüfregeln für Vorlagen-Pläne. Jede Vorlage muss alle bestehen (Tests und Anzeige in der Vorlagenbibliothek).
import type { PlanGame, PlanTemplate, Ref } from "./types.ts";
import { seatsOf } from "./types.ts";

export interface Check { id: string; label: string; ok: boolean; detail?: string }

const isSeat = (r: Ref | null): r is string => !!r && r.startsWith("seat:");
const seatOf = (r: Ref) => r.slice(5);

/** Identität eines Verweises für ein bestimmtes Ergebnis der Halbfinals (Sieger = Heim oder Gast) */
function identity(t: PlanTemplate, ref: Ref, home: Record<string, boolean>): string {
  const [kind, v] = ref.split(":");
  if (kind === "seat" || kind === "rank") return ref;
  const g = t.games.find((x) => x.id === v)!;
  const a = identity(t, g.home, home), b = identity(t, g.away, home);
  const winner = home[g.id] ? a : b;
  return kind === "win" ? winner : winner === a ? b : a;
}

export function validateTemplate(t: PlanTemplate): Check[] {
  const checks: Check[] = [];
  const add = (id: string, label: string, ok: boolean, detail?: string) => checks.push({ id, label, ok, detail });
  const group = t.games.filter((g) => g.phase === "group_stage");
  const ko = t.games.filter((g) => g.phase !== "group_stage");
  const seats = seatsOf(t);

  // Aufbau
  add("fields", "Nie mehr parallele Spiele als Felder",
    [...new Set(t.games.map((g) => g.slot))].every((s) => t.games.filter((g) => g.slot === s).length <= t.fields));
  add("field-clash", "Kein Feld ist im selben Slot doppelt belegt",
    t.games.every((g) => t.games.filter((x) => x.slot === g.slot && x.field === g.field).length === 1));
  add("ids", "Spiel-Kennungen sind eindeutig", new Set(t.games.map((g) => g.id)).size === t.games.length);
  add("slots", "Slots sind lückenlos nummeriert",
    [...new Set(t.games.map((g) => g.slot))].sort((a, b) => a - b).every((s, i) => s === i + 1));

  // Jeder gegen jeden in der Gruppe, genau einmal
  const pairKey = (a: string, b: string) => [a, b].sort().join("-");
  const allPairsOk = t.groups.every((gr) => {
    const gs = seats.filter((s) => s[0] === gr.name);
    const expected = new Set<string>();
    for (const x of gs) for (const y of gs) if (x < y) expected.add(pairKey(x, y));
    const got = group.filter((g) => g.group === gr.name).map((g) => pairKey(seatOf(g.home), seatOf(g.away)));
    return got.length === expected.size && new Set(got).size === got.length && got.every((k) => expected.has(k));
  });
  add("round-robin", "Jedes Team spielt in der Gruppe genau einmal gegen jedes andere", allPairsOk);

  // Heim/Gast ausgeglichen (Unterschied höchstens 1)
  const diff = (s: string) =>
    group.filter((g) => seatOf(g.home) === s).length - group.filter((g) => seatOf(g.away) === s).length;
  add("home-away", "Heim und Gast sind je Team ausgeglichen (Unterschied höchstens 1)", seats.every((s) => Math.abs(diff(s)) <= 1));

  // Ausrichter: erstes Spiel als Heimteam
  const first = [...group].sort((a, b) => a.slot - b.slot || a.field - b.field)[0];
  add("host-first", "Ausrichter (Platz A1) hat das erste Spiel als Heimteam", !!first && seatOf(first.home) === "A1");

  // Kein Team in zwei Slots hintereinander (Gruppenphase)
  if (t.noBackToBack) {
    const bad = seats.filter((s) => {
      const slots = group.filter((g) => seatOf(g.home) === s || seatOf(g.away) === s).map((g) => g.slot).sort((a, b) => a - b);
      return slots.some((x, i) => i > 0 && x - slots[i - 1] === 1);
    });
    add("no-back-to-back", "Kein Team spielt in der Gruppenphase zweimal direkt hintereinander", bad.length === 0, bad.join(", "));
  }

  // Schiedsrichter in der Gruppenphase: aus der anderen Gruppe, nicht im selben Slot im Einsatz, gleichmäßig
  const playsInSlot = (s: string, slot: number) =>
    group.some((g) => g.slot === slot && (seatOf(g.home) === s || seatOf(g.away) === s));
  add("officials-other-group", "Gruppenspiele werden von einem Team der anderen Gruppe gepfiffen",
    group.every((g) => isSeat(g.officials) && seatOf(g.officials)[0] !== g.group));
  add("officials-free", "Das pfeifende Team spielt im selben Slot nicht selbst",
    group.every((g) => isSeat(g.officials) && !playsInSlot(seatOf(g.officials), g.slot)));
  const counts = seats.map((s) => group.filter((g) => g.officials === `seat:${s}`).length);
  add("officials-balanced", "Pfeifen ist gleichmäßig verteilt (Unterschied höchstens 1)",
    Math.max(...counts) - Math.min(...counts) <= 1, counts.join("/"));

  // K.-o.: Schiedsrichter pfeift nie ein Spiel, in dem sein Team selbst spielt – für alle Halbfinal-Ausgänge
  const hf = ko.filter((g) => g.phase === "semifinal").map((g) => g.id);
  let koOk = true; let koDetail = "";
  for (let mask = 0; mask < 2 ** hf.length; mask++) {
    const home: Record<string, boolean> = {};
    hf.forEach((id, i) => { home[id] = (mask >> i & 1) === 1; });
    for (const g of ko as PlanGame[]) {
      if (g.officials === null) continue;
      const o = identity(t, g.officials, home);
      if (o === identity(t, g.home, home) || o === identity(t, g.away, home)) { koOk = false; koDetail = `${g.id} (Ausgang ${mask})`; }
    }
  }
  add("ko-officials-free", "K.-o.-Schiedsrichter spielt nie im selben Spiel (für jeden Halbfinal-Ausgang)", koOk, koDetail);

  // K.-o.: Verweise zeigen nur auf frühere Spiele
  const slotOf = (id: string) => t.games.find((g) => g.id === id)!.slot;
  add("ko-order", "Siegerverweise zeigen nur auf frühere Spiele",
    ko.every((g) => [g.home, g.away, g.officials].every((r) => !r || !/^(win|lose):/.test(r) || slotOf(r.split(":")[1]) < g.slot)));
  return checks;
}
