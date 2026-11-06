// Teamverzeichnis (öffentlich): Zeile aus der Datenbankfunktion directory_public_teams() – ohne E-Mail-Adressen.
// Gilt für Besucher und Angemeldete; die alten Verzeichnis-Tabellen sind nicht mehr lesbar.

export type AgeGroup = "senior" | "u19" | "u16" | "u13" | "u11" | "other";
export type GenderCategory = "mixed" | "men" | "women" | "open" | "other";

export interface DirectoryTeam {
  id: string;
  publicName: string;
  shortName: string;
  teamCode: string;
  city: string;
  state: string;
  countryCode: string;
  ageGroup: string;
  genderCategory: string;
  competitionLevel?: string;
  league: string;
  association: string;
  website?: string;
  instagram?: string;
  logoUrl?: string;
  color?: string;
  textColor?: string;
  teamCategory?: string;
  verified: boolean;
  clubName?: string;
  clubCity?: string;
}
