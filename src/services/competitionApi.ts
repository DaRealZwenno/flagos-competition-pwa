// Zugriffsschicht für Competition-Daten – die EINZIGE Stelle mit Datenbank-Namen für Turniere.
// Seit der Umstellung (Welle 4) heißen die Tabellen competitions, competition_entries, competition_groups, competition_fields, games.
// Lesen: Besucher nur über die drei öffentlichen Funktionen (competition_public_*), Angemeldete zusätzlich aus den Tabellen (Zeilenschutz).
import { supabase } from "./supabaseClient";
import type { Competition, CompetitionState } from "../types/competition";
import { mapPublicCompetition, mapTableCompetition, mergeCompetitions } from "./competitionMapping";

/** Besucher-Weg: alle öffentlichen Turniere mit Teilnehmern und Spielen (ausgeschrieben und "live öffentlich"; sonst nur Basisinfos) */
async function fetchPublicCompetitions(): Promise<Competition[]> {
  const info = await supabase.rpc("competition_public_info");
  if (info.error) throw new Error(info.error.message);
  const rows = (info.data ?? []) as { id: string; public_live: boolean }[];
  return Promise.all(rows.map(async (r) => {
    // Ohne "live öffentlich" liefern die Funktionen nichts: nur Name und Status, noch keine Teams und Spiele
    if (!r.public_live) return mapPublicCompetition(r, [], []);
    const [en, ga] = await Promise.all([
      supabase.rpc("competition_public_entries", { p_competition: r.id }),
      supabase.rpc("competition_public_games", { p_competition: r.id }),
    ]);
    if (en.error) throw new Error(en.error.message);
    if (ga.error) throw new Error(ga.error.message);
    return mapPublicCompetition(r, en.data ?? [], ga.data ?? []);
  }));
}

/** Angemeldeten-Weg: Turniere, die der Zeilenschutz zeigt (auch Entwürfe und Turniere eigener Teams) */
async function fetchTableCompetitions(): Promise<Competition[]> {
  const { data, error } = await supabase
    .from("competitions")
    .select(`
      *,
      competition_entries (*),
      competition_groups (*, competition_group_entries (entry_id)),
      competition_fields (*),
      games (*)
    `);
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapTableCompetition);
}

/** Alle sichtbaren Competitions mit Teams, Gruppen, Feldern und Spielen (nur lesen) */
export async function fetchCompetitions(): Promise<Competition[]> {
  const { data: { session } } = await supabase.auth.getSession();
  const publicList = await fetchPublicCompetitions();
  if (!session) return publicList;
  // Angemeldet: zusätzlich die Tabellen; scheitert dieser Weg, bleibt der öffentliche Stand sichtbar
  try { return mergeCompetitions(publicList, await fetchTableCompetitions()); } catch { return publicList; }
}

/** Meldet Änderungen an Spielen/Competitions (Realtime). Gibt eine Funktion zum Abmelden zurück.
 *  Besucher bekommen darüber nichts (der Zeilenschutz gilt auch hier); für sie trägt das Nachladen alle 30 s (lib/competitions.ts). */
export function subscribeCompetitionChanges(onChange: () => void): () => void {
  const channel = supabase
    .channel("competition:changes")
    .on("postgres_changes", { event: "*", schema: "public", table: "games" }, onChange)
    .on("postgres_changes", { event: "*", schema: "public", table: "competitions" }, onChange)
    .on("postgres_changes", { event: "*", schema: "public", table: "competition_entries" }, onChange)
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

export interface OpenEvent { id: string; title: string; date: string; location: string; hostTeamId?: string }

/** Veranstaltungen (Turnier/Spieltag) ohne Competition, ab 30 Tage zurück. Der Zeilenschutz zeigt nur Veranstaltungen, die das Konto sehen darf;
 *  ob es dafür auch eine Competition anlegen darf, prüft competition_create (Fehler competition_forbidden). */
export async function fetchOpenEvents(): Promise<OpenEvent[]> {
  const since = new Date(Date.now() - 30 * 86_400_000).toISOString();
  const [ev, co] = await Promise.all([
    supabase.from("events").select("id,name,starts_at,location,host_team_id").is("archived_at", null).gte("starts_at", since).order("starts_at"),
    supabase.from("competitions").select("event_id"),
  ]);
  if (ev.error) throw new Error(ev.error.message);
  const used = new Set((co.data ?? []).map((x: { event_id: string | null }) => x.event_id));
  return (ev.data ?? [])
    .filter((e: { id: string }) => !used.has(e.id))
    .map((e: { id: string; name: string; starts_at: string; location: string | null; host_team_id: string | null }) =>
      ({ id: e.id, title: e.name, date: e.starts_at, location: e.location ?? "", hostTeamId: e.host_team_id ?? undefined }));
}

export interface HostTeam { id: string; name: string; code: string }

/** Teams, in denen das Konto Termine anlegen darf (Recht calendar.write): nur dort kann es als Gastgeber eine neue Veranstaltung anlegen.
 *  Gelesen werden die Teams, die der Zeilenschutz zeigt; das Recht je Team kommt aus my_permissions(). */
export async function fetchMyHostTeams(): Promise<HostTeam[]> {
  const { data, error } = await supabase.from("teams").select("id,public_name,team_code").is("archived_at", null).order("public_name").limit(100);
  if (error) throw new Error(error.message);
  const rows = (data ?? []) as { id: string; public_name: string; team_code: string }[];
  const may = await Promise.all(rows.map(async (t) => {
    const r = await supabase.rpc("my_permissions", { p_team: t.id });
    return !r.error && ((r.data ?? []) as string[]).includes("calendar.write");
  }));
  return rows.filter((_, i) => may[i]).map((t) => ({ id: t.id, name: t.public_name, code: t.team_code }));
}

const ERRORS: Record<string, string> = {
  competition_forbidden: "Dir fehlt das Recht dafür: Man braucht das Recht „Termine verwalten“ im Gastgeber-Team (z. B. Coach, Head Coach, Team-Admin) oder die Verwaltung der gewählten Veranstaltung.",
  competition_host_team_required: "Du verwaltest mehrere Teams. Bitte wähle das Gastgeber-Team.",
  not_authenticated: "Bitte zuerst anmelden.",
  competition_event_has_competition: "Zu dieser Veranstaltung gibt es schon eine Competition.",
  competition_event_not_found: "Die gewählte Veranstaltung existiert nicht mehr.",
  competition_missing_name: "Bitte einen Namen eintragen.",
  competition_missing_id: "Es fehlt die Kennung der Competition (interner Fehler, bitte neu starten).",
  competition_invalid_kind: "Die Art muss Turnier oder Spieltag sein.",
  competition_missing_event_date: "Bitte ein Datum für den Termin eintragen.",
  competition_too_large: "Der Plan ist zu groß.",
  no_workspace: "Das Gastgeber-Team hat noch keinen Arbeitsbereich. Bitte an den Support wenden.",
};
const errorText = (m: string) => Object.entries(ERRORS).find(([k]) => m.includes(k))?.[1] ?? m;

/** Legt Termin, Competition (Entwurf), Teams, Gruppen, Felder und Spiele in einem Schritt an */
export async function createCompetition(payload: Record<string, unknown>): Promise<string> {
  const { data, error } = await supabase.rpc("competition_create", { p: payload });
  if (error) throw new Error(errorText(error.message));
  return data as string;
}

/** Entwurf veröffentlichen (Turnierleitung/Ersteller); false = keine Berechtigung */
export async function publishCompetition(id: string): Promise<boolean> {
  const { data, error } = await supabase.from("competitions").update({ status: "published" }).eq("id", id).select("id");
  if (error) throw new Error(error.message);
  return (data ?? []).length === 1;
}
