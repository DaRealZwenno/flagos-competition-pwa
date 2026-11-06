import { test } from "node:test";
import assert from "node:assert/strict";
import { mapPublicCompetition, mapTableCompetition, mergeCompetitions } from "../src/services/competitionMapping.ts";

// Feste Beispielzeilen in der Form, wie die öffentlichen Funktionen und die Tabellen sie liefern
const info = { id: "c1", name: "Cup X", kind: "tournament", status: "published", public_live: true };
const entries = [
  { id: "e1", name: "Alpha", short_name: "ALP", club_name: "Verein 1", city: "Ulm", group_id: "g1", group_name: "A", logo_url: "https://example.invalid/a.png", color: "#112233", text_color: "white" },
  { id: "e2", name: "Beta", short_name: null, club_name: null, city: null, group_id: "g1", group_name: "A", logo_url: null, color: null, text_color: null },
  { id: "e3", name: "Gast", short_name: "GST", club_name: null, city: "Köln", group_id: null, group_name: null, logo_url: null, color: "#ABCDEF", text_color: "black" },
  // zweite Gruppenzugehörigkeit desselben Teams: Team nur einmal, Gruppe zusätzlich
  { id: "e1", name: "Alpha", short_name: "ALP", club_name: "Verein 1", city: "Ulm", group_id: "g2", group_name: "B", logo_url: "https://example.invalid/a.png", color: "#112233", text_color: "white" },
];
const games = [
  { id: "s2", phase: "final", round_label: "Finale", sort_order: 2, group_id: null, group_name: null, field_id: "f2", field_name: "Feld 10", start_date: null, home_entry_id: null, away_entry_id: null, home_score: null, away_score: null, status: "scheduled", result_status: null, kickoff_at: null, fulltime_at: null, home_ref: "rank:A1", away_ref: "win:HF1", officials_ref: "rank:A3", officials_entry_id: null },
  { id: "s1", phase: "group_stage", round_label: "Gruppe A", sort_order: 1, group_id: "g1", group_name: "A", field_id: "f1", field_name: "Feld 2", start_date: "2026-12-01T10:00:00Z", home_entry_id: "e1", away_entry_id: "e2", home_score: 14, away_score: 7, status: "finished", result_status: "confirmed", kickoff_at: null, fulltime_at: null, home_ref: null, away_ref: null, officials_ref: null, officials_entry_id: "e3" },
];

test("Besucher-Weg: Teams, Gruppen, Felder, Spiele", () => {
  const c = mapPublicCompetition(info, entries, games);
  assert.equal(c.id, "c1"); assert.equal(c.name, "Cup X"); assert.equal(c.status, "published");
  assert.deepEqual(c.teams.map((t) => t.id), ["e1", "e2", "e3"]);
  assert.equal(c.teams[0].logoUrl, "https://example.invalid/a.png"); assert.equal(c.teams[0].color, "#112233"); assert.equal(c.teams[0].textColor, "white");
  assert.equal(c.teams[1].shortName, "Beta"); // ohne Kürzel: Name
  assert.equal(c.teams[1].city, undefined); assert.equal(c.teams[1].logoUrl, undefined);
  assert.deepEqual(c.groups.map((g) => [g.id, g.teamIds]), [["g1", ["e1", "e2"]], ["g2", ["e1"]]]);
  // Felder nach Name in natürlicher Zahlenreihenfolge (Feld 2 vor Feld 10)
  assert.deepEqual(c.fields.map((f) => [f.id, f.sortOrder]), [["f1", 0], ["f2", 1]]);
});

test("Besucher-Weg: Spiele sortiert, Platzhalter und Schiedsgericht übernommen", () => {
  const c = mapPublicCompetition(info, entries, games);
  assert.deepEqual(c.games.map((g) => g.id), ["s1", "s2"]); // Spiel mit Anstoß zuerst, ohne Anstoß zuletzt
  const gs = c.games[0];
  assert.equal(gs.homeTeamId, "e1"); assert.equal(gs.awayTeamId, "e2"); assert.equal(gs.homeScore, 14); assert.equal(gs.status, "finished");
  assert.equal(gs.officialsTeamId, "e3"); assert.equal(gs.homeRef, undefined);
  const fin = c.games[1];
  assert.equal(fin.homeTeamId, undefined); assert.equal(fin.homeRef, "rank:A1"); assert.equal(fin.awayRef, "win:HF1"); assert.equal(fin.officialsRef, "rank:A3");
  assert.equal(fin.homeScore, undefined);
});

test("Besucher-Weg: Turnier ohne live-öffentlich bleibt leer, unbekannter Status wird veröffentlicht", () => {
  const c = mapPublicCompetition({ id: "c9", name: "Nur Info", status: "quatsch", public_live: false }, [], []);
  assert.deepEqual([c.teams.length, c.groups.length, c.fields.length, c.games.length], [0, 0, 0, 0]);
  assert.equal(c.status, "published");
});

test("Besucher-Weg: Gruppe, die nur in Spielen vorkommt, wird geführt", () => {
  const c = mapPublicCompetition(info, [], [games[1]]);
  assert.deepEqual(c.groups, [{ id: "g1", name: "A", teamIds: [] }]);
});

test("Angemeldeten-Weg: eingebettete Tabellen", () => {
  const row = {
    id: "c2", name: "Cup Y", status: "draft",
    competition_entries: [{ id: "e1", name: "Alpha", short_name: "ALP", city: "Ulm", logo_url: null, color: "#112233", text_color: "white" }],
    competition_groups: [{ id: "g1", name: "A", competition_group_entries: [{ entry_id: "e1" }] }],
    competition_fields: [{ id: "f2", name: "Feld 2", sort_order: 2 }, { id: "f1", name: "Feld 1", sort_order: 1 }],
    games: [games[1], games[0]],
  };
  const c = mapTableCompetition(row);
  assert.equal(c.status, "draft");
  assert.deepEqual(c.teams.map((t) => t.id), ["e1"]);
  assert.deepEqual(c.groups, [{ id: "g1", name: "A", teamIds: ["e1"] }]);
  assert.deepEqual(c.fields.map((f) => f.id), ["f1", "f2"]);
  assert.deepEqual(c.games.map((g) => g.id), ["s1", "s2"]);
  assert.equal(c.games[1].homeRef, "rank:A1");
});

test("Angemeldeten-Weg: fehlende Tabellen ergeben leere Listen", () => {
  const c = mapTableCompetition({ id: "c3", name: "Leer", status: null });
  assert.deepEqual([c.teams.length, c.groups.length, c.fields.length, c.games.length], [0, 0, 0, 0]);
  assert.equal(c.status, "published");
});

test("Zusammenführen: gleiche Kennung nur einmal, Tabellen-Fassung gewinnt", () => {
  const pub = [mapPublicCompetition(info, [], []), mapPublicCompetition({ id: "c5", name: "Nur öffentlich", status: "running", public_live: false }, [], [])];
  const own = [mapTableCompetition({ id: "c1", name: "Cup X (eigene Sicht)", status: "draft" }), mapTableCompetition({ id: "c6", name: "Entwurf", status: "draft" })];
  const m = mergeCompetitions(pub, own);
  assert.deepEqual(m.map((c) => c.id).sort(), ["c1", "c5", "c6"]);
  assert.equal(m.find((c) => c.id === "c1")?.name, "Cup X (eigene Sicht)");
});
