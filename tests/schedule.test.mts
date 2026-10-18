import { test } from "node:test";
import assert from "node:assert/strict";
import { TEMPLATES, T8_1, T6_2, T6_1, findTemplate } from "../src/lib/schedule/templates.ts";
import { validateTemplate } from "../src/lib/schedule/validate.ts";
import { draw, shuffle } from "../src/lib/schedule/draw.ts";
import { buildPlan, refLabel } from "../src/lib/schedule/plan.ts";
import { seatsOf } from "../src/lib/schedule/types.ts";

test("jede Vorlage besteht alle Prüfregeln", () => {
  for (const t of TEMPLATES) {
    const failed = validateTemplate(t).filter((c) => !c.ok);
    assert.deepEqual(failed.map((c) => `${t.id}: ${c.label} ${c.detail ?? ""}`), [], `Vorlage ${t.id}`);
  }
});

test("Prüfregeln erkennen kaputte Pläne", () => {
  // zwei Spiele hintereinander für A1 → noBackToBack muss anschlagen
  const broken = structuredClone(T8_1);
  broken.games[1].slot = 2; // unverändert
  const g3 = broken.games.find((g) => g.id === "G3")!;
  g3.home = "seat:A1"; // A1 spielt Slot 1 und Slot 3 … und G5/G9 → Heim/Gast bricht
  assert.ok(validateTemplate(broken).some((c) => !c.ok));
  // Schiedsrichter spielt selbst im K.-o.-Spiel
  const ko = structuredClone(T8_1);
  ko.games.find((g) => g.id === "P3")!.officials = "lose:HF1";
  assert.ok(validateTemplate(ko).find((c) => c.id === "ko-officials-free")!.ok === false);
  // Excel-Original: Platz 3 von A1, Finale von B2 gepfiffen – beide können selbst im Spiel stehen
  const excelKo = structuredClone(T8_1);
  excelKo.games.find((g) => g.id === "P3")!.officials = "rank:A1";
  excelKo.games.find((g) => g.id === "F")!.officials = "rank:B2";
  assert.equal(validateTemplate(excelKo).find((c) => c.id === "ko-officials-free")!.ok, false);
});

test("8 Teams: Gruppenphase entspricht dem Excel-Plan (Donau Bowl II)", () => {
  // Team 1–4 = Plätze A1–A4, Team 5–8 = B1–B4; Heim, Gast, Schiedsrichter je Spiel
  const seat = (n: number) => (n <= 4 ? `A${n}` : `B${n - 4}`);
  const excel: [number, number, number][] = [
    [1, 2, 5], [6, 5, 3], [4, 3, 8], [7, 8, 2], [3, 1, 6], [8, 5, 4],
    [2, 4, 7], [6, 7, 1], [1, 4, 8], [5, 7, 2], [3, 2, 5], [8, 6, 3],
  ];
  const got = T8_1.games.filter((g) => g.phase === "group_stage").map((g) => [g.home, g.away, g.officials]);
  assert.deepEqual(got, excel.map(([h, a, o]) => [`seat:${seat(h)}`, `seat:${seat(a)}`, `seat:${seat(o)}`]));
});

test("6 Teams, 2 Felder: Gruppenphase entspricht der Final Six", () => {
  // Runde 1: Viktoria(A1)–Bedburg(A2) pfeift Darmstadt(B3); Regensburg(B1)–Munich(B2) pfeift Heidelberg(A3)
  const r = (round: number) => T6_2.games.filter((g) => g.phase === "group_stage" && g.slot === round).map((g) => [g.field, g.home, g.away, g.officials]);
  assert.deepEqual(r(1), [[1, "seat:A1", "seat:A2", "seat:B3"], [2, "seat:B1", "seat:B2", "seat:A3"]]);
  assert.deepEqual(r(2), [[1, "seat:A3", "seat:A1", "seat:B2"], [2, "seat:B3", "seat:B1", "seat:A2"]]);
  assert.deepEqual(r(3), [[1, "seat:A2", "seat:A3", "seat:B1"], [2, "seat:B2", "seat:B3", "seat:A1"]]);
  assert.equal(T6_2.games.length, 11);
});

test("6 Teams, 1 Feld hat dieselben Gruppenspiele wie 2 Felder, nur nacheinander", () => {
  const key = (g: { home: string; away: string; officials: string | null }) => `${g.home}|${g.away}|${g.officials}`;
  const a = T6_2.games.filter((g) => g.phase === "group_stage").map(key).sort();
  const b = T6_1.games.filter((g) => g.phase === "group_stage").map(key).sort();
  assert.deepEqual(a, b);
  assert.equal(T6_1.games.length, 11);
});

test("Auslosung: jede Mannschaft genau einmal, Ausrichter bleibt auf A1", () => {
  const ids = ["host", "t2", "t3", "t4", "t5", "t6", "t7", "t8"];
  for (let seed = 1; seed <= 50; seed++) {
    const m = draw(T8_1, ids, { seed, hostId: "host", hostParticipates: true });
    assert.equal(m["A1"], "host");
    assert.deepEqual(Object.values(m).sort(), [...ids].sort());
    assert.deepEqual(Object.keys(m).sort(), seatsOf(T8_1).sort());
  }
});

test("Auslosung: gleicher Zufallswert = gleiche Verteilung, anderer Wert mischt anders", () => {
  const ids = ["a", "b", "c", "d", "e", "f", "g", "h"];
  const o = { hostParticipates: false } as const;
  assert.deepEqual(draw(T8_1, ids, { ...o, seed: 42 }), draw(T8_1, ids, { ...o, seed: 42 }));
  const variants = new Set(Array.from({ length: 30 }, (_, i) => JSON.stringify(draw(T8_1, ids, { ...o, seed: i + 1 }))));
  assert.ok(variants.size > 20);
  assert.equal(shuffle([1, 2, 3, 4], 7).length, 4);
});

test("Auslosung ohne teilnehmenden Ausrichter: Final Six mischt alle Teams", () => {
  const ids = ["a", "b", "c", "d", "e", "f"];
  const seen = new Set<string>();
  for (let seed = 1; seed <= 200; seed++) seen.add(draw(T6_2, ids, { seed, hostId: "a", hostParticipates: false })["A1"]);
  assert.equal(seen.size, 6, "jedes Team kann auf Platz A1 landen");
});

test("Auslosung: falsche Anzahl und fremder Ausrichter werden abgelehnt", () => {
  assert.throws(() => draw(T8_1, ["a", "b"], { seed: 1, hostParticipates: false }));
  assert.throws(() => draw(T6_2, ["a", "b", "c", "d", "e", "e"], { seed: 1, hostParticipates: false }));
  assert.throws(() => draw(T6_2, ["a", "b", "c", "d", "e", "f"], { seed: 1, hostId: "zz", hostParticipates: true }));
});

test("Plan: 30-Minuten-Slots, Teams aus der Auslosung, Platzhalter im K.-o.", () => {
  const ids = ["host", "t2", "t3", "t4", "t5", "t6", "t7", "t8"];
  const seats = draw(T8_1, ids, { seed: 3, hostId: "host", hostParticipates: true });
  const names = Object.fromEntries(ids.map((i) => [i, i.toUpperCase()]));
  const plan = buildPlan(T8_1, { startsAt: "2027-02-06T08:00:00.000Z", slotMinutes: 30, seats, teamNames: names });
  assert.equal(plan[0].startsAt, "2027-02-06T08:00:00.000Z");
  assert.equal(plan[1].startsAt, "2027-02-06T08:30:00.000Z");
  assert.equal(plan[17].startsAt, "2027-02-06T16:30:00.000Z");
  assert.equal(plan[0].homeTeamId, "host");           // erstes Spiel: Ausrichter als Heimteam
  assert.equal(plan[0].homeLabel, "HOST");
  const hf1 = plan.find((g) => g.id === "HF1")!;
  assert.equal(hf1.homeTeamId, undefined);
  assert.equal(hf1.homeLabel, "1. Gruppe A");
  assert.equal(hf1.awayLabel, "2. Gruppe B");
  const p3 = plan.find((g) => g.id === "P3")!;
  assert.equal(p3.homeLabel, "Verlierer HF 1");
});

test("Plan: Slotlänge ist einstellbar, Teams 6/2 laufen parallel", () => {
  const plan = buildPlan(T6_2, { startsAt: "2027-02-06T10:00:00.000Z", slotMinutes: 70 });
  assert.equal(plan[0].startsAt, plan[1].startsAt);
  assert.equal(plan[2].startsAt, "2027-02-06T11:10:00.000Z");
  assert.equal(plan.at(-1)!.officialsLabel, "Team Officials");
});

test("Vorlage nach Teams und Feldern finden", () => {
  assert.equal(findTemplate(8, 1), T8_1);
  assert.equal(findTemplate(6, 2), T6_2);
  assert.equal(findTemplate(6, 1), T6_1);
  assert.equal(findTemplate(7, 1), undefined);
  assert.equal(refLabel("rank:B3"), "3. Gruppe B");
});
