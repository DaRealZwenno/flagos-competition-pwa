import type { Competition, CompetitionGame, CompetitionState, GamePhase, GameStatus } from "../types/competition";

const TZ = "Europe/Berlin";
export const fmtTime = (iso?: string) =>
  iso ? new Date(iso).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit", timeZone: TZ }) : "–";
export const fmtDate = (iso?: string) =>
  iso ? new Date(iso).toLocaleDateString("de-DE", { weekday: "short", day: "2-digit", month: "2-digit", year: "numeric", timeZone: TZ }) : "Datum offen";

export const stateLabel: Record<CompetitionState, string> = {
  planned: "in Planung", upcoming: "anstehend", running: "läuft", finished: "beendet",
};
export const gameStatusLabel: Record<GameStatus, string> = {
  scheduled: "geplant", running: "läuft", finished: "beendet", cancelled: "abgesagt",
};
export const phaseLabel: Record<GamePhase, string> = {
  group_stage: "Gruppenphase", semifinal: "Halbfinale", placement: "Platzierung", final: "Finale", other: "Spiel",
};

/** Runde eines Spiels: eigener Name (z. B. „Halbfinale 1“), sonst Phase */
export const roundOf = (g: CompetitionGame, groupName?: string) =>
  g.roundLabel || (g.phase === "group_stage" && groupName ? groupName : phaseLabel[g.phase]);

export const scoreText = (g: CompetitionGame) =>
  g.status === "scheduled" || g.status === "cancelled" || g.homeScore == null || g.awayScore == null
    ? "– : –" : `${g.homeScore} : ${g.awayScore}`;

export function teamName(c: Competition, id?: string) {
  return (id && c.teams.find((x) => x.id === id)?.name) || "offen";
}
