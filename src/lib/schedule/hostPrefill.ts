// Gastgeber-Team als erstes Team vorbelegen: Wer als Admin eines Teams eine Veranstaltung anlegt, nimmt meist selbst teil.
// Reine Funktion (ohne Datenbank-Zugriff), damit testbar. Die Person kann das Team im Assistenten wieder entfernen.

export interface PrefillTeam { id: string; name: string; city?: string }

export interface PrefillInput {
  hostParticipates: boolean;
  mode: "new" | "existing";
  hostTeamId?: string;          // gewähltes Gastgeber-Team einer neuen Veranstaltung
  eventHostTeamId?: string;     // Gastgeber-Team der gewählten vorhandenen Veranstaltung
  hostTeams: PrefillTeam[];     // Teams, in denen die Person Termine anlegen darf (immer mit Namen)
  directory: PrefillTeam[];     // öffentliches Teamverzeichnis (nur gelistete Teams)
}

/** Das Team, das vorbelegt werden soll, oder null (Ausrichter nimmt nicht teil, Gastgeber unbekannt oder ohne Namen) */
export function hostTeamPrefill(i: PrefillInput): PrefillTeam | null {
  if (!i.hostParticipates) return null;
  const id = i.mode === "existing" ? i.eventHostTeamId : i.hostTeamId;
  if (!id) return null;
  // Verzeichnis zuerst (hat die Stadt), sonst die eigene Teamliste (auch ungelistete Teams)
  return i.directory.find((t) => t.id === id) ?? i.hostTeams.find((t) => t.id === id) ?? null;
}
