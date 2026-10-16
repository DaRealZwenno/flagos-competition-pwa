// Tabellen aus den Spielen berechnen – Voreinstellung „FlagOS-Standard“ (Konzept, Abschnitt 5):
// Sieg 2, Unentschieden 1, Niederlage 0; bei Gleichstand Punktdifferenz, erzielte Punkte, Name.
// Gleiche Regeln wie die View tournament_standings und die iOS-App. Die View ist für Fremde nicht
// lesbar, deshalb rechnet die Oberfläche selbst. Gezählt werden beendete Spiele mit Ergebnis.
import type { Competition, CompetitionGame, StandingRow, StandingTable } from "../types/competition";

export const RULES = { win: 2, draw: 1, loss: 0 } as const;

const counts = (g: CompetitionGame) =>
  g.status === "finished" && g.homeTeamId && g.awayTeamId && g.homeScore != null && g.awayScore != null;

function emptyRow(teamId: string, name: string, shortName: string): StandingRow {
  return { teamId, teamName: name, shortName, played: 0, wins: 0, draws: 0, losses: 0, pointsFor: 0, pointsAgainst: 0, pointDifference: 0, points: 0 };
}

function table(teamIds: string[], games: CompetitionGame[], c: Competition): StandingRow[] {
  const rows = new Map<string, StandingRow>();
  for (const id of teamIds) {
    const t = c.teams.find((x) => x.id === id);
    if (t) rows.set(id, emptyRow(id, t.name, t.shortName || t.name));
  }
  const add = (id: string, pf: number, pa: number) => {
    const r = rows.get(id);
    if (!r) return;
    r.played += 1; r.pointsFor += pf; r.pointsAgainst += pa;
    if (pf > pa) { r.wins += 1; r.points += RULES.win; }
    else if (pf === pa) { r.draws += 1; r.points += RULES.draw; }
    else { r.losses += 1; r.points += RULES.loss; }
  };
  for (const g of games) {
    if (!counts(g)) continue;
    add(g.homeTeamId!, g.homeScore!, g.awayScore!);
    add(g.awayTeamId!, g.awayScore!, g.homeScore!);
  }
  const list = [...rows.values()];
  for (const r of list) r.pointDifference = r.pointsFor - r.pointsAgainst;
  return list.sort((a, b) =>
    b.points - a.points || b.pointDifference - a.pointDifference || b.pointsFor - a.pointsFor || a.teamName.localeCompare(b.teamName, "de"));
}

/** Eine Tabelle je Gruppe (nur Gruppenspiele). Ohne Gruppen: eine Gesamttabelle über alle Spiele. */
export function computeStandings(c: Competition): StandingTable[] {
  if (c.groups.length === 0) {
    return [{ groupId: null, title: "Tabelle", rows: table(c.teams.map((t) => t.id), c.games, c) }];
  }
  return c.groups.map((g) => ({
    groupId: g.id,
    title: g.name,
    rows: table(g.teamIds, c.games.filter((x) => x.groupId === g.id), c),
  }));
}
