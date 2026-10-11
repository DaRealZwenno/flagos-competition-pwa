export interface DirectoryClub {
  id: string
  name: string
  legal_name: string
  city: string
  state: string
  country: string
  website: string | null
  contact_email: string | null
  verified_status: string
  created_at: string
  updated_at: string
}

export interface DirectoryOrgUnit {
  id: string
  club_id: string
  name: string
  type: 'department' | 'section' | 'brand' | 'teamGroup'
  created_at: string
  updated_at: string
}

export interface DirectoryTeam {
  id: string
  club_id: string
  org_unit_id: string | null
  public_name: string
  short_name: string
  team_code: string
  city: string
  state: string
  country: string
  age_group: 'senior' | 'u19' | 'u16' | 'u13' | 'u11' | 'other'
  gender_category: 'mixed' | 'men' | 'women' | 'open' | 'other'
  sport_type: 'flag' | 'tackle' | 'both'
  competition_level: string | null
  website: string | null
  instagram: string | null
  contact_email: string | null
  verification_status: 'unverified' | 'pending' | 'verified'
  flagos_status: 'none' | 'testing' | 'active'
  review_status: 'pending' | 'approved' | 'rejected'
  logo_url: string | null
  league: string
  association: string
  created_at: string
  updated_at: string
  club?: DirectoryClub
  org_unit?: DirectoryOrgUnit
}

export interface JoinRequest {
  id: string
  team_code: string
  applicant_name: string
  applicant_email: string
  status: 'pending' | 'approved' | 'rejected'
  created_at: string
  reviewed_at: string | null
}

// Legacy – bleibt für Kompatibilität
export interface TeamDirectoryEntry {
  id: string
  created_at: string
  team_code: string
  team_name: string
  club_name: string
  city: string
  state: string
  country_code: string
  league: string
  association: string
  logo_url: string | null
  is_flagos_team: boolean
  is_verified: boolean
}
