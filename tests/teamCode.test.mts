import { test } from "node:test";
import assert from "node:assert/strict";
import { suggestTeamCode, normalizeTeamCode, isValidTeamCode, formatTeamCode } from "../src/lib/teamCode.ts";
import { sortCountries } from "../src/lib/countryList.ts";

test("Vorschlag: Neu-Ulm Spartans → GERNULSPA", () => {
  assert.equal(suggestTeamCode("GER", "Neu-Ulm", "Neu-Ulm Spartans Senior Flag"), "GERNULSPA");
});

test("Vorschlag: generische Suffixe werden übersprungen, Land kommt aus dem IOC-Code", () => {
  assert.equal(suggestTeamCode("AUT", "Wien", "Vienna Lions Flag"), "AUTWIELIO");
  assert.equal(suggestTeamCode("SUI", "Zürich", "Zurich Ravens"), "SUIZURRAV");
});

test("Vorschlag: Umlaute werden zu Grundbuchstaben, ß zu SS", () => {
  assert.equal(suggestTeamCode("GER", "München", "München Rangers"), "GERMUNRAN");
  assert.equal(suggestTeamCode("GER", "Füssen", "Eagles"), "GERFUSEAG");
  assert.equal(suggestTeamCode("GER", "Weißenburg", "Wolves"), "GERWEIWOL");
});

test("Vorschlag: zu kurze Teile werden je Block mit X aufgefüllt (immer 9 Zeichen)", () => {
  assert.equal(suggestTeamCode("GER", "Ulm", "Ox"), "GERULMOXX");
  assert.equal(suggestTeamCode("GER", "", "Lions"), "GERXXXLIO");
  assert.equal(suggestTeamCode("", "Ulm", "Ox").length, 9);
});

test("Eingabe vereinheitlichen und prüfen", () => {
  assert.equal(normalizeTeamCode(" ger-nul spa "), "GERNULSPA");
  assert.ok(isValidTeamCode("GERNULSPA"));
  assert.ok(isValidTeamCode("GERNULSP2"));
  assert.ok(!isValidTeamCode("DENULSPA"));   // altes Format
  assert.ok(!isValidTeamCode("GER-NUL-SPA"));
  assert.ok(!isValidTeamCode("GERNULSPAX"));
});

test("Anzeige: 9 Zeichen mit Bindestrichen, alles andere unverändert", () => {
  assert.equal(formatTeamCode("GERNULSPA"), "GER-NUL-SPA");
  assert.equal(formatTeamCode("DENULSPA"), "DENULSPA");
  assert.equal(formatTeamCode(""), "");
});

test("Länderliste: DE, AT, CH zuerst, Rest alphabetisch nach deutschem Namen", () => {
  const list = [
    { iso2: "US", ioc_code: "USA", ioc_member: true, name_de: "Vereinigte Staaten", name_en: "United States" },
    { iso2: "CH", ioc_code: "SUI", ioc_member: true, name_de: "Schweiz", name_en: "Switzerland" },
    { iso2: "FR", ioc_code: "FRA", ioc_member: true, name_de: "Frankreich", name_en: "France" },
    { iso2: "DE", ioc_code: "GER", ioc_member: true, name_de: "Deutschland", name_en: "Germany" },
    { iso2: "AT", ioc_code: "AUT", ioc_member: true, name_de: "Österreich", name_en: "Austria" },
  ];
  assert.deepEqual(sortCountries(list).map(c => c.iso2), ["DE", "AT", "CH", "FR", "US"]);
});
