// Umwandlung der Antwort von directory_public_teams() in das Darstellungsmodell (reine Funktion, ohne Datenbank-Zugriff, damit testbar).
import type { DirectoryTeam } from "../types/directory";

/* eslint-disable @typescript-eslint/no-explicit-any */
const opt = <T>(v: T | null | undefined): T | undefined => (v === null || v === undefined || v === "" ? undefined : v);
const str = (v: unknown): string => (typeof v === "string" ? v : "");

export function mapDirectoryTeam(r: any): DirectoryTeam {
  return {
    id: r.id,
    publicName: str(r.public_name),
    shortName: str(r.short_name) || str(r.public_name),
    teamCode: str(r.team_code),
    city: str(r.city), state: str(r.state), countryCode: str(r.country_code),
    ageGroup: str(r.age_group), genderCategory: str(r.gender_category),
    competitionLevel: opt(r.competition_level),
    league: str(r.league), association: str(r.association),
    website: opt(r.website), instagram: opt(r.instagram),
    logoUrl: opt(r.logo_url), color: opt(r.color), textColor: opt(r.text_color),
    teamCategory: opt(r.team_category),
    verified: r.verified === true,
    clubName: opt(r.club_name), clubCity: opt(r.club_city),
  };
}

export const mapDirectoryTeams = (rows: any[] | null | undefined): DirectoryTeam[] => (rows ?? []).map(mapDirectoryTeam);
/* eslint-enable @typescript-eslint/no-explicit-any */
