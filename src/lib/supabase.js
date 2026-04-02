import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
)

export default supabase

// ─── Channel names ────────────────────────────────────────────────────────────
const CHANNEL = 'artemis2-live'

// ─── Presence (viewer count) ──────────────────────────────────────────────────
/**
 * joinPresence(viewerId, onCountChange)
 * Returns a cleanup function.
 */
export function joinPresence(viewerId, onCountChange) {
  const channel = supabase.channel(CHANNEL, {
    config: { presence: { key: viewerId } },
  })

  channel
    .on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState()
      onCountChange(Object.keys(state).length)
    })
    .subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await channel.track({ online_at: new Date().toISOString() })
      }
    })

  return () => {
    channel.unsubscribe()
  }
}

// ─── Broadcast reactions ──────────────────────────────────────────────────────
/**
 * subscribeReactions(onReaction)
 * Listens for incoming emoji broadcast events.
 * Returns cleanup.
 */
export function subscribeReactions(onReaction) {
  const channel = supabase.channel(`${CHANNEL}-reactions`)

  channel
    .on('broadcast', { event: 'react' }, ({ payload }) => {
      if (payload?.emoji) onReaction(payload.emoji, payload.ts || Date.now())
    })
    .subscribe()

  return () => channel.unsubscribe()
}

/**
 * broadcastReaction(emoji)
 * Fire-and-forget: sends your emoji to every other subscriber.
 */
export async function broadcastReaction(emoji) {
  const channel = supabase.channel(`${CHANNEL}-reactions`)
  await channel.send({
    type: 'broadcast',
    event: 'react',
    payload: { emoji, ts: Date.now() },
  })
}

// ─── Persistent reaction counts (Supabase table) ─────────────────────────────
// Table schema in supabase/schema.sql

export async function fetchReactionCounts() {
  const { data, error } = await supabase
    .from('reactions')
    .select('emoji, count')
  if (error) return {}
  return Object.fromEntries(data.map(r => [r.emoji, r.count]))
}

export async function incrementReaction(emoji) {
  // Upsert: increment count or insert with count=1
  await supabase.rpc('increment_reaction', { p_emoji: emoji })
}
