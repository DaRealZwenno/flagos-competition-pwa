// ============================================================
// DataService Interface (TypeScript / PWA)
// ============================================================
// Spiegelt DataServiceProtocol.swift 1:1 wider.
// Implementierungen:
//   LocalDataService     → localStorage (Offline-Fallback)
//   SupabaseDataService  → Supabase Backend (Phase 7)
// ============================================================

import type {
  TeamInfo,
  Player,
  TeamEvent,
  EventAttendance,
  EventComment,
  EventCommentReply,
  Announcement,
  Channel,
  ChannelMessage,
  PlaybookPlay,
  PracticeScript,
  Drill,
  Tournament,
} from '../types/models'

export interface DataService {

  // ── Team Info ──────────────────────────────────────────────
  fetchTeamInfo(): Promise<TeamInfo>
  saveTeamInfo(teamInfo: TeamInfo): Promise<void>

  // ── Players ────────────────────────────────────────────────
  fetchPlayers(): Promise<Player[]>
  upsertPlayer(player: Player): Promise<void>
  deletePlayer(id: string): Promise<void>

  // ── Team Events ────────────────────────────────────────────
  fetchEvents(): Promise<TeamEvent[]>
  upsertEvent(event: TeamEvent): Promise<void>
  deleteEvent(id: string): Promise<void>

  // ── Event Attendances ──────────────────────────────────────
  updateAttendance(attendance: EventAttendance, eventId: string): Promise<void>

  // ── Event Comments ─────────────────────────────────────────
  upsertComment(comment: EventComment, eventId: string): Promise<void>
  deleteComment(id: string): Promise<void>
  upsertReply(reply: EventCommentReply, commentId: string): Promise<void>
  deleteReply(id: string): Promise<void>

  // ── Announcements ──────────────────────────────────────────
  fetchAnnouncements(): Promise<Announcement[]>
  upsertAnnouncement(announcement: Announcement): Promise<void>
  deleteAnnouncement(id: string): Promise<void>

  // ── Announcement Reads ─────────────────────────────────────
  fetchAnnouncementReads(playerId: string): Promise<Set<string>>
  markAnnouncementAsRead(announcementId: string, playerId: string): Promise<void>

  // ── Channels ───────────────────────────────────────────────
  fetchChannels(): Promise<Channel[]>
  sendMessage(message: ChannelMessage, channelId: string): Promise<void>
  deleteMessage(id: string): Promise<void>

  // ── Channel Reads ──────────────────────────────────────────
  fetchChannelReads(playerId: string): Promise<Record<string, Date>>
  markChannelAsRead(channelId: string, playerId: string, at: Date): Promise<void>

  // ── Playbook ───────────────────────────────────────────────
  fetchPlaybookPlays(): Promise<PlaybookPlay[]>
  upsertPlaybookPlay(play: PlaybookPlay): Promise<void>
  deletePlaybookPlay(id: string): Promise<void>

  // ── Practice Scripts ───────────────────────────────────────
  fetchScripts(): Promise<PracticeScript[]>
  upsertScript(script: PracticeScript): Promise<void>
  deleteScript(id: string): Promise<void>

  // ── Drills ─────────────────────────────────────────────────
  fetchDrills(): Promise<Drill[]>
  upsertDrill(drill: Drill): Promise<void>
  deleteDrill(id: string): Promise<void>

  // ── Tournaments ────────────────────────────────────────────
  fetchTournaments(): Promise<Tournament[]>
  upsertTournament(tournament: Tournament): Promise<void>
  deleteTournament(id: string): Promise<void>

  // ── Current Player ─────────────────────────────────────────
  loadCurrentPlayerId(): Promise<string | null>
  saveCurrentPlayerId(id: string | null): Promise<void>
}
