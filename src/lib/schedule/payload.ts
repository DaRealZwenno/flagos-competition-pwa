// Aus dem Wizard den Aufruf für die Datenbankfunktion competition_create() bauen (Migration 051).
import type { PlanTemplate, PlannedGame } from "./types.ts";
import type { SeatMap } from "./draw.ts";

export interface WizardTeam {
  id: string;                 // Client-ID (UUID)
  name: string;
  city?: string;
  directoryTeamId?: string;   // Verknüpfung zum Team-Verzeichnis
}

export interface PayloadInput {
  tournamentId: string;
  name: string;
  kind: "tournament" | "matchday";
  eventId?: string;                                    // vorhandener Termin
  event?: { title: string; date: string; location: string }; // sonst neuer Termin
  template: PlanTemplate;
  plan: PlannedGame[];                                 // aus buildPlan()
  seats: SeatMap;                                      // Platz → Team-ID
  teams: WizardTeam[];
  hostId?: string;
  hostParticipates: boolean;
  seed: number;
  resultApproval?: boolean;
  newId: () => string;
}

export function buildCreatePayload(i: PayloadInput) {
  const groupId: Record<string, string> = {};
  for (const g of i.template.groups) groupId[g.name] = i.newId();
  const fieldIds = Array.from({ length: i.template.fields }, () => i.newId());
  const seatOfTeam: Record<string, string> = {};
  for (const [seat, teamId] of Object.entries(i.seats)) seatOfTeam[teamId] = seat;

  const teams = i.teams.map((t) => ({
    id: t.id, name: t.name, short_name: t.name, city: t.city ?? null,
    directory_team_id: t.directoryTeamId ?? null,
    group_id: seatOfTeam[t.id] ? groupId[seatOfTeam[t.id][0]] : null,
  }));

  return {
    tournament_id: i.tournamentId,
    name: i.name,
    kind: i.kind,
    event_id: i.eventId ?? null,
    event: i.eventId ? null : i.event,
    host_participates: i.hostParticipates,
    host_team_id: i.hostParticipates ? (i.hostId ?? i.seats["A1"] ?? null) : null,
    draw_seed: i.seed,
    result_approval: i.resultApproval ?? i.template.fields > 1,
    default_result_source: "manual",
    plan_template: i.template.id,
    groups: i.template.groups.map((g) => ({ id: groupId[g.name], name: `Gruppe ${g.name}` })),
    fields: fieldIds.map((id, n) => ({ id, name: `Feld ${n + 1}`, sort_order: n })),
    teams,
    games: i.plan.map((g, n) => ({
      id: i.newId(),
      phase: g.phase,
      group_id: g.group ? groupId[g.group] : null,
      field_id: fieldIds[g.field - 1],
      home_team_id: g.homeTeamId ?? null,
      away_team_id: g.awayTeamId ?? null,
      officials_team_id: g.officialsTeamId ?? null,
      start_date: g.startsAt,
      round_label: g.round,
      sort_order: n,
      plan_game_id: g.id,
      home_ref: g.home,
      away_ref: g.away,
      officials_ref: g.officials,
    })),
  };
}
