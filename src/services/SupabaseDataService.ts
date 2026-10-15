// ============================================================
// SupabaseDataService (TypeScript / PWA)
// ============================================================
// Implementiert DataService gegen das Supabase Backend.
// Supabase gibt snake_case zurück — wird hier in camelCase
// gemappt bevor es die App erreicht.
// ============================================================

import { supabase } from './supabaseClient'
import type { DataService } from './DataService'
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
  TournamentTeam,
  TournamentGroup,
  TournamentField,
  TournamentGame,
} from '../types/models'

// ── Hilfsfunktion: Supabase-Fehler werfen ─────────────────────

function assertNoError(error: unknown, context: string): void {
  if (error) throw new Error(`[SupabaseDataService] ${context}: ${JSON.stringify(error)}`)
}

// ============================================================
// TEAM INFO
// ============================================================

async function fetchTeamInfo(): Promise<TeamInfo> {
  const { data, error } = await supabase
    .from('team_info')
    .select('*')
    .single()
  assertNoError(error, 'fetchTeamInfo')
  return mapTeamInfo(data)
}

async function saveTeamInfo(teamInfo: TeamInfo): Promise<void> {
  const { error } = await supabase
    .from('team_info')
    .upsert(toSnakeTeamInfo(teamInfo))
  assertNoError(error, 'saveTeamInfo')
}

// ============================================================
// PLAYERS
// ============================================================

async function fetchPlayers(): Promise<Player[]> {
  const { data, error } = await supabase
    .from('players')
    .select('*')
    .order('last_name')
  assertNoError(error, 'fetchPlayers')
  return (data ?? []).map(mapPlayer)
}

async function upsertPlayer(player: Player): Promise<void> {
  const { error } = await supabase
    .from('players')
    .upsert(toSnakePlayer(player))
  assertNoError(error, 'upsertPlayer')
}

async function deletePlayer(id: string): Promise<void> {
  const { error } = await supabase
    .from('players')
    .delete()
    .eq('id', id)
  assertNoError(error, 'deletePlayer')
}

// ============================================================
// TEAM EVENTS
// ============================================================

async function fetchEvents(): Promise<TeamEvent[]> {
  const { data: events, error } = await supabase
    .from('team_events')
    .select(`
      *,
      event_attendances (*),
      event_comments (
        *,
        event_comment_replies (*)
      ),
      attachment_links (*)
    `)
    .order('date')
  assertNoError(error, 'fetchEvents')
  return (events ?? []).map(mapTeamEvent)
}

async function upsertEvent(event: TeamEvent): Promise<void> {
  const { error } = await supabase
    .from('team_events')
    .upsert({
      id:       event.id,
      title:    event.title,
      type:     event.type,
      date:     event.date,
      location: event.location,
    })
  assertNoError(error, 'upsertEvent')
}

async function deleteEvent(id: string): Promise<void> {
  const { error } = await supabase
    .from('team_events')
    .delete()
    .eq('id', id)
  assertNoError(error, 'deleteEvent')
}

// ============================================================
// EVENT ATTENDANCES
// ============================================================

async function updateAttendance(attendance: EventAttendance, eventId: string): Promise<void> {
  const { error } = await supabase
    .from('event_attendances')
    .upsert({
      id:        attendance.id,
      event_id:  eventId,
      player_id: attendance.playerId,
      status:    attendance.status,
    })
  assertNoError(error, 'updateAttendance')
}

// ============================================================
// EVENT COMMENTS
// ============================================================

async function upsertComment(comment: EventComment, eventId: string): Promise<void> {
  const { error } = await supabase
    .from('event_comments')
    .upsert({
      id:               comment.id,
      event_id:         eventId,
      author_player_id: comment.authorPlayerId ?? null,
      author_name:      comment.authorName,
      message:          comment.message,
      created_at:       comment.createdAt,
      updated_at:       comment.updatedAt ?? null,
    })
  assertNoError(error, 'upsertComment')
}

async function deleteComment(id: string): Promise<void> {
  const { error } = await supabase
    .from('event_comments')
    .delete()
    .eq('id', id)
  assertNoError(error, 'deleteComment')
}

async function upsertReply(reply: EventCommentReply, commentId: string): Promise<void> {
  const { error } = await supabase
    .from('event_comment_replies')
    .upsert({
      id:               reply.id,
      comment_id:       commentId,
      author_player_id: reply.authorPlayerId ?? null,
      author_name:      reply.authorName,
      message:          reply.message,
      created_at:       reply.createdAt,
      updated_at:       reply.updatedAt ?? null,
    })
  assertNoError(error, 'upsertReply')
}

async function deleteReply(id: string): Promise<void> {
  const { error } = await supabase
    .from('event_comment_replies')
    .delete()
    .eq('id', id)
  assertNoError(error, 'deleteReply')
}

// ============================================================
// ANNOUNCEMENTS
// ============================================================

async function fetchAnnouncements(): Promise<Announcement[]> {
  const { data, error } = await supabase
    .from('announcements')
    .select(`*, attachment_links (*)`)
    .order('is_pinned', { ascending: false })
    .order('created_at', { ascending: false })
  assertNoError(error, 'fetchAnnouncements')
  return (data ?? []).map(mapAnnouncement)
}

async function upsertAnnouncement(announcement: Announcement): Promise<void> {
  const { error } = await supabase
    .from('announcements')
    .upsert({
      id:               announcement.id,
      title:            announcement.title,
      message:          announcement.message,
      category:         announcement.category,
      author_player_id: announcement.authorPlayerId ?? null,
      author_name:      announcement.authorName,
      author_role:      announcement.authorRole,
      is_pinned:        announcement.isPinned,
    })
  assertNoError(error, 'upsertAnnouncement')
}

async function deleteAnnouncement(id: string): Promise<void> {
  const { error } = await supabase
    .from('announcements')
    .delete()
    .eq('id', id)
  assertNoError(error, 'deleteAnnouncement')
}

// ============================================================
// ANNOUNCEMENT READS
// ============================================================

async function fetchAnnouncementReads(playerId: string): Promise<Set<string>> {
  const { data, error } = await supabase
    .from('announcement_reads')
    .select('announcement_id')
    .eq('player_id', playerId)
  assertNoError(error, 'fetchAnnouncementReads')
  return new Set((data ?? []).map((r: { announcement_id: string }) => r.announcement_id))
}

async function markAnnouncementAsRead(announcementId: string, playerId: string): Promise<void> {
  const { error } = await supabase
    .from('announcement_reads')
    .upsert({ player_id: playerId, announcement_id: announcementId })
  assertNoError(error, 'markAnnouncementAsRead')
}

// ============================================================
// CHANNELS
// ============================================================

async function fetchChannels(): Promise<Channel[]> {
  const { data, error } = await supabase
    .from('channels')
    .select(`*, channel_messages (*)`)
  assertNoError(error, 'fetchChannels')
  return (data ?? []).map(mapChannel)
}

async function sendMessage(message: ChannelMessage, channelId: string): Promise<void> {
  const { error } = await supabase
    .from('channel_messages')
    .insert({
      id:          message.id,
      channel_id:  channelId,
      sender_id:   message.senderId ?? null,
      sender_name: message.senderName,
      sender_role: message.senderRole,
      text:        message.text,
      sent_at:     message.sentAt,
    })
  assertNoError(error, 'sendMessage')
}

async function deleteMessage(id: string): Promise<void> {
  const { error } = await supabase
    .from('channel_messages')
    .delete()
    .eq('id', id)
  assertNoError(error, 'deleteMessage')
}

// ============================================================
// CHANNEL READS
// ============================================================

async function fetchChannelReads(playerId: string): Promise<Record<string, Date>> {
  const { data, error } = await supabase
    .from('channel_reads')
    .select('channel_id, last_read_at')
    .eq('player_id', playerId)
  assertNoError(error, 'fetchChannelReads')
  return Object.fromEntries(
    (data ?? []).map((r: { channel_id: string; last_read_at: string }) => [
      r.channel_id,
      new Date(r.last_read_at),
    ])
  )
}

async function markChannelAsRead(channelId: string, playerId: string, at: Date): Promise<void> {
  const { error } = await supabase
    .from('channel_reads')
    .upsert({ player_id: playerId, channel_id: channelId, last_read_at: at.toISOString() })
  assertNoError(error, 'markChannelAsRead')
}

// ============================================================
// PLAYBOOK
// ============================================================

async function fetchPlaybookPlays(): Promise<PlaybookPlay[]> {
  const { data, error } = await supabase
    .from('playbook_plays')
    .select(`*, playbook_play_tags (tag)`)
    .order('name')
  assertNoError(error, 'fetchPlaybookPlays')
  return (data ?? []).map(mapPlaybookPlay)
}

async function upsertPlaybookPlay(play: PlaybookPlay): Promise<void> {
  const { error: playError } = await supabase
    .from('playbook_plays')
    .upsert({
      id:        play.id,
      name:      play.name,
      formation: play.formation,
      playcall:  play.playcall,
      category:  play.category,
      notes:     play.notes,
      image_path: play.imagePath ?? null,
    })
  assertNoError(playError, 'upsertPlaybookPlay')

  // Tags: erst löschen, dann neu einfügen
  await supabase.from('playbook_play_tags').delete().eq('play_id', play.id)
  if (play.tags.length > 0) {
    const { error: tagError } = await supabase
      .from('playbook_play_tags')
      .insert(play.tags.map(tag => ({ play_id: play.id, tag })))
    assertNoError(tagError, 'upsertPlaybookPlay (tags)')
  }
}

async function deletePlaybookPlay(id: string): Promise<void> {
  const { error } = await supabase
    .from('playbook_plays')
    .delete()
    .eq('id', id)
  assertNoError(error, 'deletePlaybookPlay')
}

// ============================================================
// PRACTICE SCRIPTS
// ============================================================

async function fetchScripts(): Promise<PracticeScript[]> {
  const { data, error } = await supabase
    .from('practice_scripts')
    .select(`*, script_plays (*)`)
    .order('name')
  assertNoError(error, 'fetchScripts')
  return (data ?? []).map(mapScript)
}

async function upsertScript(script: PracticeScript): Promise<void> {
  const { error } = await supabase
    .from('practice_scripts')
    .upsert({
      id:           script.id,
      name:         script.name,
      date:         script.date ?? null,
      event_id:     script.eventId ?? null,
      notes:        script.notes,
      is_completed: script.isCompleted,
      completed_at: script.completedAt ?? null,
    })
  assertNoError(error, 'upsertScript')

  // Script Plays: löschen und neu einfügen
  await supabase.from('script_plays').delete().eq('script_id', script.id)
  if (script.plays.length > 0) {
    const { error: playsError } = await supabase
      .from('script_plays')
      .insert(script.plays.map(p => ({
        id:               p.id,
        script_id:        script.id,
        playbook_play_id: p.playbookPlayId,
        order_number:     p.orderNumber,
        hash:             p.hash ?? null,
        personnel:        p.personnel ?? null,
        notes:            p.notes,
        status:           p.status,
      })))
    assertNoError(playsError, 'upsertScript (plays)')
  }
}

async function deleteScript(id: string): Promise<void> {
  const { error } = await supabase
    .from('practice_scripts')
    .delete()
    .eq('id', id)
  assertNoError(error, 'deleteScript')
}

// ============================================================
// DRILLS
// ============================================================

async function fetchDrills(): Promise<Drill[]> {
  const { data, error } = await supabase
    .from('drills')
    .select(`*, drill_positions (position)`)
    .order('name')
  assertNoError(error, 'fetchDrills')
  return (data ?? []).map(mapDrill)
}

async function upsertDrill(drill: Drill): Promise<void> {
  const { error } = await supabase
    .from('drills')
    .upsert({
      id:          drill.id,
      name:        drill.name,
      description: drill.description,
      category:    drill.category,
      difficulty:  drill.difficulty,
      image_path:  drill.imagePath ?? null,
      author_name: drill.authorName,
      created_at:  drill.createdAt,
    })
  assertNoError(error, 'upsertDrill')

  await supabase.from('drill_positions').delete().eq('drill_id', drill.id)
  if (drill.positions.length > 0) {
    const { error: posError } = await supabase
      .from('drill_positions')
      .insert(drill.positions.map(p => ({ drill_id: drill.id, position: p })))
    assertNoError(posError, 'upsertDrill (positions)')
  }
}

async function deleteDrill(id: string): Promise<void> {
  const { error } = await supabase
    .from('drills')
    .delete()
    .eq('id', id)
  assertNoError(error, 'deleteDrill')
}

// ============================================================
// TOURNAMENTS
// ============================================================

async function fetchTournaments(): Promise<Tournament[]> {
  const { data, error } = await supabase
    .from('tournaments')
    .select(`
      *,
      tournament_teams (*),
      tournament_groups (
        *,
        tournament_group_teams (team_id)
      ),
      tournament_fields (*),
      tournament_games (*)
    `)
    .order('name')
  assertNoError(error, 'fetchTournaments')
  return (data ?? []).map(mapTournament)
}

async function upsertTournament(tournament: Tournament): Promise<void> {
  const { error } = await supabase
    .from('tournaments')
    .upsert({ id: tournament.id, event_id: tournament.eventId, name: tournament.name })
  assertNoError(error, 'upsertTournament')
}

async function deleteTournament(id: string): Promise<void> {
  const { error } = await supabase
    .from('tournaments')
    .delete()
    .eq('id', id)
  assertNoError(error, 'deleteTournament')
}

// ============================================================
// CURRENT PLAYER
// ============================================================

async function loadCurrentPlayerId(): Promise<string | null> {
  return localStorage.getItem('flagos_current_player_id')
}

async function saveCurrentPlayerId(id: string | null): Promise<void> {
  if (id) localStorage.setItem('flagos_current_player_id', id)
  else localStorage.removeItem('flagos_current_player_id')
}

// ============================================================
// EXPORT — DataService Objekt
// ============================================================

export const SupabaseDataService: DataService = {
  fetchTeamInfo,
  saveTeamInfo,
  fetchPlayers,
  upsertPlayer,
  deletePlayer,
  fetchEvents,
  upsertEvent,
  deleteEvent,
  updateAttendance,
  upsertComment,
  deleteComment,
  upsertReply,
  deleteReply,
  fetchAnnouncements,
  upsertAnnouncement,
  deleteAnnouncement,
  fetchAnnouncementReads,
  markAnnouncementAsRead,
  fetchChannels,
  sendMessage,
  deleteMessage,
  fetchChannelReads,
  markChannelAsRead,
  fetchPlaybookPlays,
  upsertPlaybookPlay,
  deletePlaybookPlay,
  fetchScripts,
  upsertScript,
  deleteScript,
  fetchDrills,
  upsertDrill,
  deleteDrill,
  fetchTournaments,
  upsertTournament,
  deleteTournament,
  loadCurrentPlayerId,
  saveCurrentPlayerId,
}

// ============================================================
// MAPPER — snake_case (Supabase) → camelCase (App)
// ============================================================

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapTeamInfo(r: any): TeamInfo {
  return {
    id: r.id, teamName: r.team_name, clubName: r.club_name,
    organizationName: r.organization_name, shortDescription: r.short_description,
    homeFieldName: r.home_field_name, address: r.address,
    contactName: r.contact_name, contactEmail: r.contact_email,
    websiteUrl: r.website_url, instagramUrl: r.instagram_url,
    logoName: r.logo_name, logoPath: r.logo_path,
  }
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toSnakeTeamInfo(t: TeamInfo): Record<string, unknown> {
  return {
    id: t.id, team_name: t.teamName, club_name: t.clubName,
    organization_name: t.organizationName, short_description: t.shortDescription,
    home_field_name: t.homeFieldName, address: t.address,
    contact_name: t.contactName, contact_email: t.contactEmail,
    website_url: t.websiteUrl, instagram_url: t.instagramUrl,
    logo_name: t.logoName, logo_path: t.logoPath,
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapPlayer(r: any): Player {
  return {
    id: r.id, authUserId: r.auth_user_id,
    firstName: r.first_name, lastName: r.last_name,
    number: r.number, position: r.position, role: r.role,
    email: r.email, phone: r.phone,
    contactVisibility: r.contact_visibility,
    passStatus: r.pass_status, passNote: r.pass_note,
    passExpirationDate: r.pass_expiration_date,
    passUpdatedAt: r.pass_updated_at, passUpdatedBy: r.pass_updated_by,
  }
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toSnakePlayer(p: Player): Record<string, unknown> {
  return {
    id: p.id, auth_user_id: p.authUserId ?? null,
    first_name: p.firstName, last_name: p.lastName,
    number: p.number ?? null, position: p.position, role: p.role,
    email: p.email ?? null, phone: p.phone ?? null,
    contact_visibility: p.contactVisibility,
    pass_status: p.passStatus, pass_note: p.passNote ?? null,
    pass_expiration_date: p.passExpirationDate ?? null,
    pass_updated_at: p.passUpdatedAt ?? null,
    pass_updated_by: p.passUpdatedBy ?? null,
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapTeamEvent(r: any): TeamEvent {
  return {
    id: r.id, title: r.title, type: r.type,
    date: r.date, location: r.location,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    attendees: (r.event_attendances ?? []).map((a: any) => ({
      id: a.id, playerId: a.player_id, status: a.status,
    })),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    comments: (r.event_comments ?? []).map((c: any) => ({
      id: c.id, authorPlayerId: c.author_player_id,
      authorName: c.author_name, message: c.message,
      createdAt: c.created_at, updatedAt: c.updated_at,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      replies: (c.event_comment_replies ?? []).map((rep: any) => ({
        id: rep.id, authorPlayerId: rep.author_player_id,
        authorName: rep.author_name, message: rep.message,
        createdAt: rep.created_at, updatedAt: rep.updated_at,
      })),
    })),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    attachmentLinks: (r.attachment_links ?? []).map((l: any) => ({
      id: l.id, title: l.title, urlString: l.url,
    })),
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapAnnouncement(r: any): Announcement {
  return {
    id: r.id, title: r.title, message: r.message,
    category: r.category, authorPlayerId: r.author_player_id,
    authorName: r.author_name, authorRole: r.author_role,
    isPinned: r.is_pinned, createdAt: r.created_at,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    attachmentLinks: (r.attachment_links ?? []).map((l: any) => ({
      id: l.id, title: l.title, urlString: l.url,
    })),
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapChannel(r: any): Channel {
  return {
    id: r.id, type: r.type,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    messages: (r.channel_messages ?? []).map((m: any) => ({
      id: m.id, senderId: m.sender_id, senderName: m.sender_name,
      senderRole: m.sender_role, text: m.text, sentAt: m.sent_at,
    })),
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapPlaybookPlay(r: any): PlaybookPlay {
  return {
    id: r.id, name: r.name, formation: r.formation,
    playcall: r.playcall, category: r.category,
    notes: r.notes, imagePath: r.image_path,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    tags: (r.playbook_play_tags ?? []).map((t: any) => t.tag),
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapScript(r: any): PracticeScript {
  return {
    id: r.id, name: r.name, date: r.date,
    eventId: r.event_id, notes: r.notes,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    plays: (r.script_plays ?? []).sort((a: any, b: any) => a.order_number - b.order_number)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((p: any) => ({
        id: p.id, playbookPlayId: p.playbook_play_id,
        orderNumber: p.order_number, hash: p.hash,
        personnel: p.personnel, notes: p.notes, status: p.status,
      })),
    isCompleted: r.is_completed, completedAt: r.completed_at,
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapDrill(r: any): Drill {
  return {
    id: r.id, name: r.name, description: r.description,
    category: r.category, difficulty: r.difficulty,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    positions: (r.drill_positions ?? []).map((p: any) => p.position),
    imagePath: r.image_path, authorName: r.author_name, createdAt: r.created_at,
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapTournament(r: any): Tournament {
  return {
    id: r.id, eventId: r.event_id, name: r.name,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    teams: (r.tournament_teams ?? []).map((t: any): TournamentTeam => ({
      id: t.id, tournamentId: t.tournament_id, name: t.name,
      shortName: t.short_name, clubName: t.club_name, city: t.city,
    })),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    groups: (r.tournament_groups ?? []).map((g: any): TournamentGroup => ({
      id: g.id, tournamentId: g.tournament_id, name: g.name,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      teamIds: (g.tournament_group_teams ?? []).map((gt: any) => gt.team_id),
    })),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    fields: (r.tournament_fields ?? []).sort((a: any, b: any) => a.sort_order - b.sort_order)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((f: any): TournamentField => ({
        id: f.id, tournamentId: f.tournament_id,
        name: f.name, sortOrder: f.sort_order,
      })),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    games: (r.tournament_games ?? []).map((g: any): TournamentGame => ({
      id: g.id, tournamentId: g.tournament_id, phase: g.phase,
      groupId: g.group_id, fieldId: g.field_id,
      homeTeamId: g.home_team_id, awayTeamId: g.away_team_id,
      startDate: g.start_date, homeScore: g.home_score,
      awayScore: g.away_score, status: g.status,
    })),
  }
}
