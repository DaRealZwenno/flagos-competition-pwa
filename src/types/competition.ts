// Darstellungsmodell der Competition-Oberfläche.
// Die Datenbank-Tabellen heißen noch tournament_* (Konzept 7.2); die Übersetzung steckt nur in
// src/services/competitionApi.ts. Seiten und Bausteine arbeiten nur mit diesen Typen.

export type GameStatus = "scheduled" | "running" | "finished" | "cancelled";
export type GamePhase = "group_stage" | "semifinal" | "placement" | "final" | "other";

export interface CompetitionTeam {
  id: string;
  name: string;
  shortName: string;
  city?: string;
}

export interface CompetitionGroup {
  id: string;
  name: string;
  teamIds: string[];
}

export interface CompetitionField {
  id: string;
  name: string;
  sortOrder: number;
}

export interface CompetitionGame {
  id: string;
  phase: GamePhase;
  groupId?: string;
  fieldId?: string;
  homeTeamId?: string;
  awayTeamId?: string;
  startsAt?: string; // ISO
  homeScore?: number;
  awayScore?: number;
  status: GameStatus;
  roundLabel?: string;
  sortOrder?: number;
}

export interface Competition {
  id: string;
  name: string;
  teams: CompetitionTeam[];
  groups: CompetitionGroup[];
  fields: CompetitionField[];
  games: CompetitionGame[];
}

export type CompetitionState = "planned" | "upcoming" | "running" | "finished";

export interface StandingRow {
  teamId: string;
  teamName: string;
  shortName: string;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  pointsFor: number;
  pointsAgainst: number;
  pointDifference: number;
  points: number;
}

export interface StandingTable {
  groupId: string | null;
  title: string;
  rows: StandingRow[];
}
