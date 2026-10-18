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
    homeRef: g.home_ref ?? undefined, awayRef: g.away_ref ?? undefined, officialsRef: g.officials_ref ?? undefined,
    officialsTeamId: g.officials_team_id ?? undefined,
  }));
  games.sort((a, b) =>
    (a.startsAt ?? "9999").localeCompare(b.startsAt ?? "9999") ||
    (a.sortOrder ?? 1e9) - (b.sortOrder ?? 1e9) || a.id.localeCompare(b.id));
  return {
    id: r.id, name: r.name, status: r.status ?? "published",
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

// ── Anlegen (Wizard) ──────────────────────────────────────────────────────────

export interface OpenEvent { id: string; title: string; type: string; date: string; location: string }

/** Kalender-Termine (Turnier/Spieltag) ohne Competition, ab 30 Tage zurück */
export async function fetchOpenEvents(): Promise<OpenEvent[]> {
  const since = new Date(Date.now() - 30 * 86_400_000).toISOString();
  const [ev, tn] = await Promise.all([
    supabase.from("team_events").select("id,title,type,date,location").in("type", ["game_day", "tournament"]).gte("date", since).order("date"),
    supabase.from("tournaments").select("event_id"),
  ]);
  if (ev.error) throw new Error(ev.error.message);
  const used = new Set((tn.data ?? []).map((x: { event_id: string }) => x.event_id));
  return (ev.data ?? []).filter((e: OpenEvent) => !used.has(e.id));
}

export interface DirectoryTeamLite { id: string; name: string; city: string; state: string; code: string }

/** Freigegebene Teams aus dem Team-Verzeichnis (zum Auswählen) */
export async function fetchDirectoryTeams(): Promise<DirectoryTeamLite[]> {
  const { data, error } = await supabase
    .from("directory_teams").select("id,public_name,city,state,team_code").eq("review_status", "approved").order("public_name");
  if (error) throw new Error(error.message);
  return (data ?? []).map((t: { id: string; public_name: string; city: string; state: string; team_code: string }) =>
    ({ id: t.id, name: t.public_name, city: t.city, state: t.state, code: t.team_code }));
}

const ERRORS: Record<string, string> = {
  competition_forbidden: "Dir fehlt das Recht, eine Competition anzulegen (nötig: Plattform-Admin oder App-Rolle Admin, Coach oder Turnierleiter).",
  not_authenticated: "Bitte zuerst anmelden.",
  competition_event_has_competition: "Zu diesem Termin gibt es schon eine Competition.",
  competition_event_not_found: "Der gewählte Termin existiert nicht mehr.",
  competition_missing_name: "Bitte einen Namen eintragen.",
  competition_missing_event_date: "Bitte ein Datum für den Termin eintragen.",
  competition_too_large: "Der Plan ist zu groß.",
};
const errorText = (m: string) => Object.entries(ERRORS).find(([k]) => m.includes(k))?.[1] ?? m;

/** Legt Termin, Competition (Entwurf), Teams, Gruppen, Felder und Spiele in einem Schritt an */
export async function createCompetition(payload: Record<string, unknown>): Promise<string> {
  const { data, error } = await supabase.rpc("competition_create", { p: payload });
  if (error) throw new Error(errorText(error.message));
  return data as string;
}

/** Entwurf veröffentlichen (Leitung/Ersteller); false = keine Berechtigung */
export async function publishCompetition(id: string): Promise<boolean> {
  const { data, error } = await supabase.from("tournaments").update({ status: "published" }).eq("id", id).select("id");
  if (error) throw new Error(error.message);
  return (data ?? []).length === 1;
}
