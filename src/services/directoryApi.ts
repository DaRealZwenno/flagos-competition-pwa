// Zugriff auf das öffentliche Teamverzeichnis: Besucher und Angemeldete lesen über die Funktion directory_public_teams()
// (freigegebene, nicht archivierte Teams, ohne E-Mail-Adressen). Die alten Verzeichnis-Tabellen sind nicht mehr lesbar.
import { supabase } from "./supabaseClient";
import type { DirectoryTeam } from "../types/directory";
import { mapDirectoryTeams } from "./directoryMapping";

export async function fetchDirectoryTeams(): Promise<DirectoryTeam[]> {
  const { data, error } = await supabase.rpc("directory_public_teams");
  if (error) throw new Error(error.message);
  return mapDirectoryTeams(data);
}
