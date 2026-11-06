// Umwandlung der Datenbank-Antworten in das Darstellungsmodell (nur reine Funktionen, ohne Datenbank-Zugriff, damit testbar).
// Zwei Wege liefern dasselbe Modell:
//  - Besucher: die drei öffentlichen Funktionen competition_public_info / _entries / _games (nur ausgeschriebene Turniere mit "live öffentlich")
//  - Angemeldete: die Tabellen competitions, competition_entries, competition_groups, competition_fields, games (Zeilenschutz bestimmt, was sichtbar ist)
import type { Competition, CompetitionGame, CompetitionStatus, CompetitionTeam, GamePhase, GameStatus } from "../types/competition";

/* eslint-disable @typescript-eslint/no-explicit-any */
const opt = <T>(v: T | null | undefined): T | undefined => (v === null || v === undefined ? undefined : v);

const STATUSES: CompetitionStatus[] = ["draft", "published", "running", "finished", "archived"];
const asStatus = (s: unknown): CompetitionStatus => (STATUSES.includes(s as CompetitionStatus) ? (s as CompetitionStatus) : "published");

/** Spiele nach Anstoß, dann Reihenfolge, dann Kennung */
export function sortGames(games: CompetitionGame[]): CompetitionGame[] {
  return [...games].sort((a, b) =>
    (a.startsAt ?? "9999").localeCompare(b.startsAt ?? "9999") ||
    (a.sortOrder ?? 1e9) - (b.sortOrder ?? 1e9) || a.id.localeCompare(b.id));
}

function mapGame(g: any): CompetitionGame {
  return {
    id: g.id, phase: g.phase as GamePhase, groupId: opt(g.group_id), fieldId: opt(g.field_id),
    homeTeamId: opt(g.home_entry_id), awayTeamId: opt(g.away_entry_id),
    startsAt: opt(g.start_date),
    homeScore: opt(g.home_score), awayScore: opt(g.away_score),
    status: g.status as GameStatus, roundLabel: opt(g.round_label), sortOrder: opt(g.sort_order),
    homeRef: opt(g.home_ref), awayRef: opt(g.away_ref), officialsRef: opt(g.officials_ref),
    officialsTeamId: opt(g.officials_entry_id),
  };
}

function mapTeam(t: any): CompetitionTeam {
  return {
    id: t.id, name: t.name, shortName: t.short_name || t.name, city: opt(t.city),
    logoUrl: opt(t.logo_url), color: opt(t.color), textColor: opt(t.text_color),
  };
}

const byName = (a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name, "de", { numeric: true });

/** Besucher-Weg: Info-Zeile, Teilnehmer-Zeilen (je Gruppenzugehörigkeit eine) und Spiel-Zeilen eines Turniers */
export function mapPublicCompetition(info: any, entries: any[], games: any[]): Competition {
  const teams = new Map<string, CompetitionTeam>();
  const groups = new Map<string, { id: string; name: string; teamIds: string[] }>();
  for (const e of entries) {
    if (!teams.has(e.id)) teams.set(e.id, mapTeam(e));
    if (e.group_id) {
      const g: { id: string; name: string; teamIds: string[] } = groups.get(e.group_id) ?? { id: e.group_id, name: e.group_name ?? "", teamIds: [] as string[] };
      if (!g.teamIds.includes(e.id)) g.teamIds.push(e.id);
      groups.set(g.id, g);
    }
  }
  const fields = new Map<string, { id: string; name: string; sortOrder: number }>();
  for (const g of games) {
    // Gruppen ohne Teilnehmer-Zeile (z. B. nur in Spielen genannt) trotzdem führen
    if (g.group_id && !groups.has(g.group_id)) groups.set(g.group_id, { id: g.group_id, name: g.group_name ?? "", teamIds: [] });
    if (g.field_id && !fields.has(g.field_id)) fields.set(g.field_id, { id: g.field_id, name: g.field_name ?? "", sortOrder: 0 });
  }
  // Die öffentliche Funktion liefert keine Feld-Reihenfolge: nach Name (Feld 1, Feld 2, Feld 10 …)
  const fieldList = [...fields.values()].sort(byName).map((f, i) => ({ ...f, sortOrder: i }));
  return {
    id: info.id, name: info.name, status: asStatus(info.status),
    teams: [...teams.values()],
    groups: [...groups.values()].sort(byName),
    fields: fieldList,
    games: sortGames(games.map(mapGame)),
  };
}

/** Angemeldeten-Weg: eine Zeile aus competitions mit eingebetteten Tabellen */
export function mapTableCompetition(r: any): Competition {
  return {
    id: r.id, name: r.name, status: asStatus(r.status),
    teams: (r.competition_entries ?? []).map(mapTeam),
    groups: (r.competition_groups ?? []).map((g: any) => ({
      id: g.id, name: g.name, teamIds: (g.competition_group_entries ?? []).map((x: any) => x.entry_id),
    })),
    fields: (r.competition_fields ?? []).map((f: any) => ({ id: f.id, name: f.name, sortOrder: f.sort_order ?? 0 }))
      .sort((a: { sortOrder: number }, b: { sortOrder: number }) => a.sortOrder - b.sortOrder),
    games: sortGames((r.games ?? []).map(mapGame)),
  };
}

/** Beide Wege zusammenführen: gleiche Kennung nur einmal, die Tabellen-Fassung (vollständiger) gewinnt */
export function mergeCompetitions(publicList: Competition[], ownList: Competition[]): Competition[] {
  const byId = new Map<string, Competition>();
  for (const c of publicList) byId.set(c.id, c);
  for (const c of ownList) byId.set(c.id, c);
  return [...byId.values()];
}
/* eslint-enable @typescript-eslint/no-explicit-any */
