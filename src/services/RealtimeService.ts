// ============================================================
// RealtimeService (TypeScript / PWA)
// ============================================================
// Spiegelt RealtimeService.swift 1:1 wider.
//
// Subscriptions:
//   - channel_messages  → Chat live
//   - tournament_games  → Spielstand live
//   - event_attendances → Zu-/Absagen live
//
// Verwendung:
//   const rt = new RealtimeService()
//   rt.subscribeAll({ onNewMessage, onGamesChanged, onAttendancesChanged })
//   // beim Unmount:
//   rt.unsubscribeAll()
// ============================================================

import { supabase } from './supabaseClient'
import { SupabaseDataService } from './SupabaseDataService'
import type { ChannelMessage, TeamEvent, Tournament } from '../types/models'
import type { RealtimeChannel } from '@supabase/supabase-js'

// ── Callback-Typen ────────────────────────────────────────────

export interface RealtimeCallbacks {
  onNewMessage?: (message: ChannelMessage, channelId: string) => void
  onGamesChanged?: (tournaments: Tournament[]) => void
  onAttendancesChanged?: (events: TeamEvent[]) => void
}

// ── Service ───────────────────────────────────────────────────

export class RealtimeService {
  private channels: RealtimeChannel[] = []

  subscribeAll(callbacks: RealtimeCallbacks): void {
    this.subscribeToMessages(callbacks.onNewMessage)
    this.subscribeToGames(callbacks.onGamesChanged)
    this.subscribeToAttendances(callbacks.onAttendancesChanged)
  }

  unsubscribeAll(): void {
    this.channels.forEach(ch => supabase.removeChannel(ch))
    this.channels = []
  }

  // ── Channel Messages (Chat) ─────────────────────────────────

  private subscribeToMessages(
    onNewMessage?: (message: ChannelMessage, channelId: string) => void
  ): void {
    const channel = supabase
      .channel('public:channel_messages')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'channel_messages' },
        (payload) => {
          if (!onNewMessage) return
          const r = payload.new as Record<string, unknown>
          const message: ChannelMessage = {
            id:         r.id as string,
            senderId:   r.sender_id as string | undefined,
            senderName: r.sender_name as string,
            senderRole: r.sender_role as ChannelMessage['senderRole'],
            text:       r.text as string,
            sentAt:     r.sent_at as string,
          }
          onNewMessage(message, r.channel_id as string)
        }
      )
      .subscribe()

    this.channels.push(channel)
  }

  // ── Tournament Games (Live-Spielstand) ──────────────────────

  private subscribeToGames(
    onGamesChanged?: (tournaments: Tournament[]) => void
  ): void {
    const channel = supabase
      .channel('public:tournament_games')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tournament_games' },
        async () => {
          if (!onGamesChanged) return
          try {
            const tournaments = await SupabaseDataService.fetchTournaments()
            onGamesChanged(tournaments)
          } catch (err) {
            console.error('[Realtime] Fehler beim Nachladen der Tournaments:', err)
          }
        }
      )
      .subscribe()

    this.channels.push(channel)
  }

  // ── Event Attendances (Zu-/Absagen) ─────────────────────────

  private subscribeToAttendances(
    onAttendancesChanged?: (events: TeamEvent[]) => void
  ): void {
    const channel = supabase
      .channel('public:event_attendances')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'event_attendances' },
        async () => {
          if (!onAttendancesChanged) return
          try {
            const events = await SupabaseDataService.fetchEvents()
            onAttendancesChanged(events)
          } catch (err) {
            console.error('[Realtime] Fehler beim Nachladen der Events:', err)
          }
        }
      )
      .subscribe()

    this.channels.push(channel)
  }
}
