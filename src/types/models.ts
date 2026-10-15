// ============================================================
// FlagOS — Shared Data Models (TypeScript)
// ============================================================
// Spiegelt die Swift-Modelle 1:1 wider.
// camelCase bleibt gleich — Supabase gibt snake_case zurück,
// das mapping passiert im SupabaseDataService (Phase 7).
// ============================================================

// ── Enums ─────────────────────────────────────────────────────

export type PlayerRole = 'player' | 'coach' | 'admin' | 'helper'

export type PlayerPassStatus =
  | 'not_started'
  | 'missing_documents'
  | 'submitted'
  | 'processing'
  | 'active'
  | 'expired'

export type ContactVisibility = 'coaches_only' | 'whole_team'

export type EventType = 'training' | 'game_day' | 'tournament' | 'meeting' | 'other'

export type AttendanceStatus = 'accepted' | 'declined' | 'open'

export type AnnouncementCategory =
  | 'general'
  | 'training'
  | 'game_day'
  | 'tournament'
  | 'organization'
  | 'urgent'

export type ChannelType = 'all_team' | 'offense' | 'defense' | 'coaches' | 'orga'

export type DrillCategory =
  | 'general'
  | 'routes'
  | 'passing'
  | 'defense'
  | 'blocking'
  | 'conditioning'

export type DrillDifficulty = 'beginner' | 'intermediate' | 'advanced'

export type PlaybookCategory = 'offense' | 'defense'

export type PlaybookTag =
  | 'try_play'
  | 'trick'
  | 'red_zone'
  | 'two_point'
  | 'short'
  | 'deep'
  | 'man'
  | 'zone'
  | 'blitz'
  | 'beginner'
  | 'install'

export type TournamentPhase =
  | 'group_stage'
  | 'semifinal'
  | 'placement'
  | 'final'
  | 'other'

export type TournamentGameStatus = 'scheduled' | 'running' | 'finished' | 'cancelled'

export type ScriptPlayStatus = 'open' | 'done' | 'skipped'

export type PlayHash = 'left' | 'middle' | 'right'

// ── Models ────────────────────────────────────────────────────

export interface TeamInfo {
  id: string
  teamName: string
  clubName: string
  organizationName: string
  shortDescription: string
  homeFieldName: string
  address: string
  contactName: string
  contactEmail: string
  websiteUrl: string
  instagramUrl: string
  logoName: string
  logoPath?: string
}

export interface Player {
  id: string
  authUserId?: string
  firstName: string
  lastName: string
  number?: number
  position: string
  role: PlayerRole
  email?: string
  phone?: string
  contactVisibility: ContactVisibility
  passStatus: PlayerPassStatus
  passNote?: string
  passExpirationDate?: string   // ISO date string
  passUpdatedAt?: string
  passUpdatedBy?: string
}

export interface AttachmentLink {
  id: string
  title: string
  urlString: string
}

export interface EventAttendance {
  id: string
  playerId: string
  status: AttendanceStatus
}

export interface EventCommentReply {
  id: string
  authorPlayerId?: string
  authorName: string
  message: string
  createdAt: string
  updatedAt?: string
}

export interface EventComment {
  id: string
  authorPlayerId?: string
  authorName: string
  message: string
  createdAt: string
  updatedAt?: string
  replies: EventCommentReply[]
}

export interface TeamEvent {
  id: string
  title: string
  type: EventType
  date: string              // ISO date string
  location: string
  attendees: EventAttendance[]
  comments: EventComment[]
  attachmentLinks: AttachmentLink[]
}

export interface Announcement {
  id: string
  title: string
  message: string
  category: AnnouncementCategory
  authorPlayerId?: string
  authorName: string
  authorRole: PlayerRole
  isPinned: boolean
  createdAt: string
  attachmentLinks: AttachmentLink[]
}

export interface ChannelMessage {
  id: string
  senderId?: string
  senderName: string
  senderRole: PlayerRole
  text: string
  sentAt: string
}

export interface Channel {
  id: string
  type: ChannelType
  messages: ChannelMessage[]
}

export interface PlaybookPlay {
  id: string
  name: string
  formation: string
  playcall: string
  category: PlaybookCategory
  notes: string
  imagePath?: string
  tags: PlaybookTag[]
}

export interface ScriptPlay {
  id: string
  playbookPlayId: string
  orderNumber: number
  hash?: PlayHash
  personnel?: string
  notes: string
  status: ScriptPlayStatus
}

export interface PracticeScript {
  id: string
  name: string
  date?: string
  eventId?: string
  notes: string
  plays: ScriptPlay[]
  isCompleted: boolean
  completedAt?: string
}

export interface Drill {
  id: string
  name: string
  description: string
  category: DrillCategory
  difficulty: DrillDifficulty
  positions: string[]
  imagePath?: string
  authorName: string
  createdAt: string
}

export interface TournamentTeam {
  id: string
  tournamentId: string
  name: string
  shortName: string
  clubName?: string
  city?: string
}

export interface TournamentGroup {
  id: string
  tournamentId: string
  name: string
  teamIds: string[]
}

export interface TournamentField {
  id: string
  tournamentId: string
  name: string
  sortOrder: number
}

export interface TournamentGame {
  id: string
  tournamentId: string
  phase: TournamentPhase
  groupId?: string
  fieldId?: string
  homeTeamId?: string
  awayTeamId?: string
  startDate?: string
  homeScore?: number
  awayScore?: number
  status: TournamentGameStatus
}

export interface Tournament {
  id: string
  eventId: string
  name: string
  teams: TournamentTeam[]
  groups: TournamentGroup[]
  fields: TournamentField[]
  games: TournamentGame[]
}

// ── Derived / View Models ──────────────────────────────────────

export interface TournamentStanding {
  teamId: string
  tournamentId: string
  groupId: string
  teamName: string
  shortName: string
  gamesPlayed: number
  wins: number
  draws: number
  losses: number
  pointsFor: number
  pointsAgainst: number
  pointDifference: number
  standingPoints: number
}
