// Die Vorlagen-Pläne. Vorbilder (von Sven geliefert, 16.10.2026):
//   · 8 Teams, 1 Feld   – Excel „NUS Turnierplan (8 Mannschaften)“ (Donau Bowl II)
//   · 6 Teams, 2 Felder – Final Six 2026 (LeagueSphere, Spieltag 919)
//   · 6 Teams, 1 Feld   – nach demselben Muster abgeleitet (BITTE PRÜFEN)
// Plätze: A1…A4 / B1…B4 (8 Teams) bzw. A1…A3 / B1…B3 (6 Teams). Platz A1 ist der Ausrichter.
import type { PlanGame, PlanTemplate } from "./types.ts";

const seat = (s: string) => `seat:${s}`;
const rank = (s: string) => `rank:${s}`;
const win = (g: string) => `win:${g}`;
const lose = (g: string) => `lose:${g}`;

function grp(id: string, slot: number, field: number, group: "A" | "B", home: string, away: string, off: string): PlanGame {
  return { id, phase: "group_stage", round: `Gruppe ${group}`, group, slot, field, home: seat(home), away: seat(away), officials: seat(off) };
}
function ko(id: string, phase: PlanGame["phase"], round: string, slot: number, field: number, home: string, away: string, off: string | null): PlanGame {
  return { id, phase, round, slot, field, home, away, officials: off };
}

// ── 8 Teams, 1 Feld (Excel) ───────────────────────────────────────────────
// Gruppen wechseln sich ab (A, B, A, B …) → kein Team spielt zweimal direkt hintereinander.
// Schiedsrichter: je Spiel ein spielfreies Team der anderen Gruppe, gleichmäßig verteilt.
// K.-o.: HF 1A–2B und 1B–2A, dann Platz 7, 5, 3 und Finale. Im Excel standen für Platz 3 und das Finale
// feste Ränge (A1, B2) als Schiedsrichter, die selbst spielen können; hier pfeifen Halbfinal-Sieger bzw. ein
// Team, das sicher nicht spielt.
export const T8_1: PlanTemplate = {
  id: "t8-f1", name: "8 Teams · 2 Gruppen · 1 Feld", teams: 8, fields: 1,
  groups: [{ name: "A", size: 4 }, { name: "B", size: 4 }],
  noBackToBack: true,
  summary: [
    "8 Teams in 2 Gruppen à 4, ein Feld, ein Spiel pro Slot.",
    "Die Gruppen wechseln sich ab (A, B, A, B …): kein Team spielt zweimal direkt hintereinander.",
    "Heim und Gast sind ausgeglichen; der Ausrichter (Platz A1) hat das erste Spiel als Heimteam.",
    "Jedes Spiel hat ein spielfreies Team der anderen Gruppe als Schiedsrichter, gleichmäßig verteilt.",
    "Danach Halbfinale (1. A gegen 2. B, 1. B gegen 2. A), Spiele um Platz 7, 5, 3 und das Finale.",
  ],
  games: [
    grp("G1", 1, 1, "A", "A1", "A2", "B1"),
    grp("G2", 2, 1, "B", "B2", "B1", "A3"),
    grp("G3", 3, 1, "A", "A4", "A3", "B4"),
    grp("G4", 4, 1, "B", "B3", "B4", "A2"),
    grp("G5", 5, 1, "A", "A3", "A1", "B2"),
    grp("G6", 6, 1, "B", "B4", "B1", "A4"),
    grp("G7", 7, 1, "A", "A2", "A4", "B3"),
    grp("G8", 8, 1, "B", "B2", "B3", "A1"),
    grp("G9", 9, 1, "A", "A1", "A4", "B4"),
    grp("G10", 10, 1, "B", "B1", "B3", "A2"),
    grp("G11", 11, 1, "A", "A3", "A2", "B1"),
    grp("G12", 12, 1, "B", "B4", "B2", "A3"),
    ko("HF1", "semifinal", "Halbfinale 1", 13, 1, rank("A1"), rank("B2"), rank("B3")),
    ko("HF2", "semifinal", "Halbfinale 2", 14, 1, rank("B1"), rank("A2"), rank("A4")),
    ko("P7", "placement", "Platz 7", 15, 1, rank("A4"), rank("B4"), lose("HF1")),
    ko("P5", "placement", "Platz 5", 16, 1, rank("A3"), rank("B3"), lose("HF2")),
    ko("P3", "placement", "Platz 3", 17, 1, lose("HF1"), lose("HF2"), win("HF1")),
    ko("F", "final", "Finale", 18, 1, win("HF1"), win("HF2"), rank("A3")),
  ],
};

// ── 6 Teams, 2 Felder (Final Six 2026) ────────────────────────────────────
// Je Runde ein Spiel pro Gruppe parallel; das dritte Team der Gruppe hat spielfrei und pfeift in der anderen Gruppe.
// Bei 3er-Gruppen spielt zwangsläufig ein Team in zwei Runden hintereinander.
export const T6_2: PlanTemplate = {
  id: "t6-f2", name: "6 Teams · 2 Gruppen · 2 Felder (Final Six)", teams: 6, fields: 2,
  groups: [{ name: "A", size: 3 }, { name: "B", size: 3 }],
  noBackToBack: false,
  summary: [
    "6 Teams in 2 Gruppen à 3, zwei Felder (Gruppe A auf Feld 1, Gruppe B auf Feld 2), 11 Spiele.",
    "Pro Runde spielt je ein Spiel pro Gruppe gleichzeitig; das dritte Team der Gruppe hat spielfrei und pfeift das Spiel der anderen Gruppe.",
    "Danach Halbfinale (1. A gegen 2. B, 1. B gegen 2. A), dann Platz 3 und Platz 5 gleichzeitig, zuletzt das Finale.",
    "Halbfinale: die Dritten der Gruppen pfeifen; Platz 3 und 5: die Halbfinal-Sieger; Finale: neutrale Officials.",
  ],
  games: [
    grp("G1", 1, 1, "A", "A1", "A2", "B3"), grp("G2", 1, 2, "B", "B1", "B2", "A3"),
    grp("G3", 2, 1, "A", "A3", "A1", "B2"), grp("G4", 2, 2, "B", "B3", "B1", "A2"),
    grp("G5", 3, 1, "A", "A2", "A3", "B1"), grp("G6", 3, 2, "B", "B2", "B3", "A1"),
    ko("HF1", "semifinal", "Halbfinale 1", 4, 1, rank("A1"), rank("B2"), rank("B3")),
    ko("HF2", "semifinal", "Halbfinale 2", 4, 2, rank("B1"), rank("A2"), rank("A3")),
    ko("P3", "placement", "Platz 3", 5, 1, lose("HF1"), lose("HF2"), win("HF1")),
    ko("P5", "placement", "Platz 5", 5, 2, rank("A3"), rank("B3"), win("HF2")),
    ko("F", "final", "Finale", 6, 1, win("HF1"), win("HF2"), null),
  ],
};

// ── 6 Teams, 1 Feld (abgeleitet) ──────────────────────────────────────────
// Gleiche Spiele und Schiedsrichter wie die Final Six, aber nacheinander auf einem Feld:
// die Gruppen wechseln sich ab (A, B, A, B, A, B). Damit spielt kein Team zweimal direkt hintereinander.
export const T6_1: PlanTemplate = {
  id: "t6-f1", name: "6 Teams · 2 Gruppen · 1 Feld", teams: 6, fields: 1,
  groups: [{ name: "A", size: 3 }, { name: "B", size: 3 }],
  noBackToBack: true,
  summary: [
    "6 Teams in 2 Gruppen à 3, ein Feld, 11 Spiele nacheinander.",
    "Die Gruppen wechseln sich ab (A, B, A, B, A, B): kein Team spielt in der Gruppenphase zweimal direkt hintereinander.",
    "In jedem Spiel pfeift das spielfreie Team der anderen Gruppe; jedes Team pfeift genau einmal.",
    "Danach Halbfinale (1. A gegen 2. B, 1. B gegen 2. A), Platz 5, Platz 3 und das Finale.",
  ],
  games: [
    grp("G1", 1, 1, "A", "A1", "A2", "B3"), grp("G2", 2, 1, "B", "B1", "B2", "A3"),
    grp("G3", 3, 1, "A", "A3", "A1", "B2"), grp("G4", 4, 1, "B", "B3", "B1", "A2"),
    grp("G5", 5, 1, "A", "A2", "A3", "B1"), grp("G6", 6, 1, "B", "B2", "B3", "A1"),
    ko("HF1", "semifinal", "Halbfinale 1", 7, 1, rank("A1"), rank("B2"), rank("B3")),
    ko("HF2", "semifinal", "Halbfinale 2", 8, 1, rank("B1"), rank("A2"), rank("A3")),
    ko("P5", "placement", "Platz 5", 9, 1, rank("A3"), rank("B3"), win("HF2")),
    ko("P3", "placement", "Platz 3", 10, 1, lose("HF1"), lose("HF2"), win("HF1")),
    ko("F", "final", "Finale", 11, 1, win("HF1"), win("HF2"), null),
  ],
};

export const TEMPLATES: PlanTemplate[] = [T8_1, T6_2, T6_1];

export const findTemplate = (teams: number, fields: number) =>
  TEMPLATES.find((t) => t.teams === teams && t.fields === fields);
