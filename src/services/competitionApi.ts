// Zugriffsschicht für Competition-Daten – die EINZIGE Stelle mit Datenbank-Tabellennamen.
// Die Tabellen heißen noch tournament_* (Konzept 7.2); wird später umbenannt, ändert sich nur diese Datei.
// Lesen für Fremde: Row-Level-Security zeigt nur freigegebene Competitions (Migration 049).
import { supabase } from "./supabaseClient";
import type { Competition, CompetitionGame, CompetitionState } from "../types/competition";

/* eslint-disable @typescript-eslint/no-explicit-any */
function mapCompetition(r: any): Competition {
  const games: CompetitionGame[] = (r.tournament_games ?? []).map((g: any) => ({
    id: g.id, phase: g.phase, groupId: g.group_id ?? undefined, fieldId: g.field_id ?? undefined,
    homeTeamId: g.home_team_id ?? undefined, awayTeamId: g.away_team_id ?? undefined,
    startsAt: g.start_date ?? undefined,
    homeScore: g.home_score ?? undefined, awayScore: g.away_score ?? undefined,
    status: g.status, roundLabel: g.round_label ?? undefined, sortOrder: g.sort_order ?? undefined,
  }));
  games.sort((a, b) =>
    (a.startsAt ?? "9999").localeCompare(b.startsAt ?? "9999") ||
    (a.sortOrder ?? 1e9) - (b.sortOrder ?? 1e9) || a.id.localeCompare(b.id));
  return {
    id: r.id, name: r.name,
    teams: (r.tournament_teams ?? []).map((t: any) => ({ id: t.id, name: t.name, shortName: t.short_name || t.name, city: t.city ?? undefined })),
    groups: (r.tournament_groups ?? []).map((g: any) => ({
      id: g.id, name: g.name, teamIds: (g.tournament_group_teams ?? []).map((x: any) => x.team_id),
    })),
    fields: (r.tournament_fields ?? []).map((f: any) => ({ id: f.id, name: f.name, sortOrder: f.sort_order ?? 0 }))
      .sort((a: { sortOrder: number }, b: { sortOrder: number }) => a.sortOrder - b.sortOrder),
    games,
  };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

/** Alle sichtbaren Competitions mit Teams, Gruppen, Feldern und Spielen (nur lesen) */
export async function fetchCompetitions(): Promise<Competition[]> {
  const { data, error } = await supabase
    .from("tournaments")
    .select(`
      *,
      tournament_teams (*),
      tournament_groups (*, tournament_group_teams (team_id)),
      tournament_fields (*),
      tournament_games (*)
    `);
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapCompetition);
}

/** Meldet Änderungen an Spielen/Competitions (Realtime). Gibt eine Funktion zum Abmelden zurück. */
export function subscribeCompetitionChanges(onChange: () => void): () => void {
  const channel = supabase
    .channel("competition:changes")
    .on("postgres_changes", { event: "*", schema: "public", table: "tournament_games" }, onChange)
    .on("postgres_changes", { event: "*", schema: "public", table: "tournaments" }, onChange)
    .on("postgres_changes", { event: "*", schema: "public", table: "tournament_teams" }, onChange)
    .subscribe();
  return () => { void supabase.removeChannel(channel); };
}

/** Gesamtzustand einer Competition aus ihren Spielen */
export function competitionState(c: Competition): CompetitionState {
  const active = c.games.filter((g) => g.status !== "cancelled");
  if (active.length === 0) return "planned";
  if (active.some((g) => g.status === "running")) return "running";
  if (active.every((g) => g.status === "finished")) return "finished";
  if (active.some((g) => g.status === "finished")) return "running";
  return "upcoming";
}

/** Frühester Spielbeginn (für Datumsanzeige und Sortierung) */
export function competitionStart(c: Competition): string | undefined {
  return c.games.map((g) => g.startsAt).filter((x): x is string => !!x).sort()[0];
}
