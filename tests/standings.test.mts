import { test } from "node:test";
import assert from "node:assert/strict";
import { computeStandings } from "../src/lib/standings.ts";
import type { Competition } from "../src/types/competition.ts";

const team = (id: string, name: string) => ({ id, name, shortName: name });
const game = (id: string, home: string, away: string, hs: number, as: number, status: "finished" | "scheduled" = "finished", groupId = "g1") =>
  ({ id, phase: "group_stage" as const, groupId, homeTeamId: home, awayTeamId: away, homeScore: hs, awayScore: as, status });

const base: Competition = {
  id: "c1", name: "Test",
  teams: [team("a", "Alpha"), team("b", "Beta"), team("c", "Gamma")],
  groups: [{ id: "g1", name: "Gruppe 1", teamIds: ["a", "b", "c"] }],
  fields: [],
  games: [],
};

test("Sieg 2, Unentschieden 1, Niederlage 0", () => {
  const c = { ...base, games: [game("1", "a", "b", 20, 10), game("2", "b", "c", 7, 7), game("3", "c", "a", 0, 14)] };
  const [t] = computeStandings(c);
  const r = Object.fromEntries(t.rows.map((x) => [x.teamId, x]));
  assert.equal(r.a.points, 4);
  assert.equal(r.b.points, 1);
  assert.equal(r.c.points, 1);
  assert.equal(r.a.pointDifference, 24);
  assert.deepEqual(t.rows.map((x) => x.teamId), ["a", "b", "c"]);
});

test("nur beendete Spiele mit Ergebnis zählen", () => {
  const c = { ...base, games: [game("1", "a", "b", 20, 10, "scheduled"), { ...game("2", "a", "c", 0, 0), homeScore: undefined }] };
  const [t] = computeStandings(c);
  assert.ok(t.rows.every((x) => x.played === 0 && x.points === 0));
});

test("Gleichstand: Punktdifferenz, dann erzielte Punkte, dann Name", () => {
  // Alpha und Beta haben je einen Sieg (gleiche Punkte); die Punktdifferenz entscheidet
  const c: Competition = { ...base, teams: [team("a", "Alpha"), team("b", "Beta"), team("c", "Gamma"), team("d", "Delta")],
    groups: [{ id: "g1", name: "G", teamIds: ["a", "b", "c", "d"] }],
    games: [game("1", "a", "c", 30, 0), game("2", "b", "d", 8, 7)] };
  const [t] = computeStandings(c);
  assert.deepEqual(t.rows.map((x) => x.teamId).slice(0, 2), ["a", "b"]);
  // Gleiche Punkte, gleiche Differenz, gleiche erzielte Punkte -> Name
  const c2: Competition = { ...base, teams: [team("x", "Zeta"), team("y", "Alpha"), team("z", "Omega"), team("w", "Beta")],
    groups: [{ id: "g1", name: "G", teamIds: ["x", "y", "z", "w"] }],
    games: [game("1", "x", "z", 10, 0), game("2", "y", "w", 10, 0)] };
  const [t2] = computeStandings(c2);
  assert.deepEqual(t2.rows.map((x) => x.teamId).slice(0, 2), ["y", "x"]);
});

test("ohne Gruppen: eine Gesamttabelle; K.-o.-Spiele ohne Gruppe zählen in Gruppentabellen nicht", () => {
  const noGroups: Competition = { ...base, groups: [], games: [game("1", "a", "b", 5, 0, "finished", "")] };
  assert.equal(computeStandings(noGroups).length, 1);
  assert.equal(computeStandings(noGroups)[0].rows.find((x) => x.teamId === "a")!.points, 2);
  const ko: Competition = { ...base, games: [{ ...game("1", "a", "b", 5, 0), groupId: undefined, phase: "final" }] };
  assert.ok(computeStandings(ko)[0].rows.every((x) => x.played === 0));
});
