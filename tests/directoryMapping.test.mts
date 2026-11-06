import { test } from "node:test";
import assert from "node:assert/strict";
import { mapDirectoryTeam, mapDirectoryTeams } from "../src/services/directoryMapping.ts";

// Zeilen in der Form, wie directory_public_teams() sie liefert
const full = {
  id: "t1", public_name: "Ulm Falcons", short_name: "ULM", team_code: "DBAYULM01", city: "Ulm", state: "Baden-Württemberg", country_code: "DE",
  age_group: "senior", gender_category: "mixed", competition_level: "Liga 1", league: "GFL Flag", association: "AFVD",
  website: "https://example.invalid", instagram: "@falcons", logo_url: "https://example.invalid/l.png", color: "#112233", text_color: "white",
  team_category: "verein", verified: true, club_name: "SV Ulm", club_city: "Ulm",
};
const sparse = {
  id: "t2", public_name: "Freie Truppe", short_name: null, team_code: "DXXXFRE01", city: null, state: null, country_code: "DE",
  age_group: "other", gender_category: "open", competition_level: null, league: null, association: null,
  website: "", instagram: null, logo_url: null, color: null, text_color: null, team_category: "privat", verified: false, club_name: null, club_city: null,
};

test("Verzeichnis: vollständige Zeile wird übernommen", () => {
  const t = mapDirectoryTeam(full);
  assert.equal(t.publicName, "Ulm Falcons"); assert.equal(t.shortName, "ULM"); assert.equal(t.teamCode, "DBAYULM01");
  assert.equal(t.state, "Baden-Württemberg"); assert.equal(t.ageGroup, "senior"); assert.equal(t.genderCategory, "mixed");
  assert.equal(t.logoUrl, "https://example.invalid/l.png"); assert.equal(t.color, "#112233"); assert.equal(t.textColor, "white");
  assert.equal(t.verified, true); assert.equal(t.clubName, "SV Ulm"); assert.equal(t.clubCity, "Ulm"); assert.equal(t.competitionLevel, "Liga 1");
});

test("Verzeichnis: fehlende Angaben werden leer, nie null; Kürzel fällt auf den Namen zurück", () => {
  const t = mapDirectoryTeam(sparse);
  assert.equal(t.shortName, "Freie Truppe");
  assert.equal(t.city, ""); assert.equal(t.state, ""); assert.equal(t.league, ""); assert.equal(t.association, "");
  assert.equal(t.website, undefined);           // leerer Text zählt als nicht vorhanden
  assert.equal(t.logoUrl, undefined); assert.equal(t.clubName, undefined);
  assert.equal(t.verified, false);
});

test("Verzeichnis: Liste, auch ohne Antwort", () => {
  assert.deepEqual(mapDirectoryTeams([full, sparse]).map((t) => t.id), ["t1", "t2"]);
  assert.deepEqual(mapDirectoryTeams(null), []);
});
