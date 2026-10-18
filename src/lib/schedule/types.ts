// Vorlagen-Pläne: feste Spielpläne mit PLÄTZEN statt Teamnamen (Konzept, Abschnitt 6).
// Die Auslosung verteilt nur die Teams auf die Plätze; der Plan selbst ist geprüft und bleibt gleich.
//
// Verweise (Ref) in einem Plan:
//   seat:A1   das Team auf Platz A1 (Gruppenphase, aus der Auslosung)
//   rank:A1   Tabellenplatz 1 in Gruppe A nach der Gruppenphase
//   win:HF1   Sieger des Spiels HF1       lose:HF1   Verlierer des Spiels HF1
export type Ref = string;

export type PlanPhase = "group_stage" | "semifinal" | "placement" | "final";
export type GroupName = "A" | "B";

export interface PlanGame {
  id: string;           // z. B. "G1", "HF1", "P5", "F"
  phase: PlanPhase;
  round: string;        // Anzeige, z. B. "Gruppe A", "Halbfinale 1"
  group?: GroupName;    // nur Gruppenspiele
  slot: number;         // 1, 2, 3 … (Spiele mit gleichem Slot laufen parallel)
  field: number;        // 1-basiert
  home: Ref;            // Heimteam (im Anzeigen rechts)
  away: Ref;            // Gastteam (links)
  officials: Ref | null; // Schiedsrichter-Team; null = neutrale Officials
}

export interface PlanTemplate {
  id: string;
  name: string;
  teams: number;
  fields: number;
  groups: { name: GroupName; size: number }[];
  /** true: in der Gruppenphase spielt kein Team in zwei aufeinanderfolgenden Slots */
  noBackToBack: boolean;
  /** Kurzbeschreibung der Logik für die Auswahl im Wizard */
  summary: string[];
  games: PlanGame[];
}

export interface PlannedGame extends PlanGame {
  startsAt: string;        // ISO
  homeTeamId?: string;     // nur wenn aus der Gruppenphase bekannt
  awayTeamId?: string;
  officialsTeamId?: string;
  homeLabel: string;       // Teamname oder Platzhalter („1. Gruppe A“)
  awayLabel: string;
  officialsLabel: string;
}

export const seatId = (g: GroupName, n: number) => `${g}${n}`;
export const seatsOf = (t: PlanTemplate): string[] =>
  t.groups.flatMap((g) => Array.from({ length: g.size }, (_, i) => seatId(g.name, i + 1)));
