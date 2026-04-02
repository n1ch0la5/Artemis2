import { useState, useEffect, useRef, useCallback } from 'react'
import { formatNum } from '../lib/mission.js'
import {
  fetchReactionCounts,
  incrementReaction,
  broadcastReaction,
  subscribeReactions,
} from '../lib/supabase.js'

const EMOJIS = ['👀', '🚀', '🌕', '❤️', '🙌', '✨']

export default function ReactionDock({ viewers }) {
  const [counts,   setCounts]   = useState({})
  const [floaters, setFloaters] = useState([])
  const [ticker,   setTicker]   = useState(0)   // reactions in last 60s
  const recentTs = useRef([])                    // timestamps of recent reactions

  // Load persisted counts on mount
  useEffect(() => {
    fetchReactionCounts().then(data => setCounts(data))
  }, [])

  // Subscribe to live broadcasts from other users
  useEffect(() => {
    const unsub = subscribeReactions((emoji, ts) => {
      // Update local counts
      setCounts(prev => ({ ...prev, [emoji]: (prev[emoji] || 0) + 1 }))
      // Spawn a floater
      spawnFloat(emoji)
      // Track for ticker
      recentTs.current.push(ts)
    })
    return unsub
  }, [])

  // Ticker: count reactions in the last 60 seconds
  useEffect(() => {
    const id = setInterval(() => {
      const cutoff = Date.now() - 60_000
      recentTs.current = recentTs.current.filter(ts => ts > cutoff)
      setTicker(recentTs.current.length)
    }, 3000)
    return () => clearInterval(id)
  }, [])

  const spawnFloat = useCallback((emoji) => {
    const id = Date.now() + Math.random()
    setFloaters(f => [...f, { id, emoji, x: 15 + Math.random() * 70 }])
    setTimeout(() => setFloaters(f => f.filter(e => e.id !== id)), 2600)
  }, [])

  const handleReact = async (emoji) => {
    // Optimistic local update
    setCounts(prev => ({ ...prev, [emoji]: (prev[emoji] || 0) + 1 }))
    spawnFloat(emoji)
    recentTs.current.push(Date.now())

    // Persist + broadcast (fire-and-forget)
    try {
      await Promise.all([
        incrementReaction(emoji),
        broadcastReaction(emoji),
      ])
    } catch (err) {
      console.warn('reaction error', err)
    }
  }

  const total = Object.values(counts).reduce((a, b) => a + b, 0)

  return (
    <>
      {/* Floating emoji bursts */}
      {floaters.map(e => (
        <div key={e.id} style={{
          position:     'fixed',
          bottom:       80,
          left:         `${e.x}%`,
          fontSize:     26,
          lineHeight:   1,
          animation:    'reactionRise 2.6s ease-out forwards',
          pointerEvents: 'none',
          zIndex:       300,
        }}>
          {e.emoji}
        </div>
      ))}

      <div style={{
        background:   '#070F1D',
        border:       '1px solid rgba(255,255,255,0.04)',
        borderRadius: 14,
        padding:      '18px 20px 16px',
      }}>
        {/* Presence row */}
        <div style={{
          display:        'flex',
          justifyContent: 'space-between',
          alignItems:     'center',
          marginBottom:   16,
          flexWrap:       'wrap',
          gap:            8,
        }}>
          <div style={{ fontSize: 11, color: '#1E3050', letterSpacing: '1px' }}>
            <span style={{ color: '#1D6A40' }}>●</span>{' '}
            <span style={{ color: '#2A4060' }}>
              {formatNum(viewers)}
            </span>{' '}
            watching now
          </div>
          {ticker > 0 && (
            <div style={{
              fontSize:      10,
              color:         '#1A2E44',
              letterSpacing: '0.5px',
              animation:     'fadeSlideUp .3s ease',
            }}>
              {ticker} reacted in the last minute
            </div>
          )}
        </div>

        {/* Emoji buttons */}
        <div style={{
          display:        'flex',
          gap:            8,
          flexWrap:       'wrap',
          justifyContent: 'center',
        }}>
          {EMOJIS.map(emoji => (
            <button
              key={emoji}
              onClick={() => handleReact(emoji)}
              style={{
                background:   'rgba(255,255,255,0.03)',
                border:       '1px solid rgba(255,255,255,0.05)',
                borderRadius: 10,
                padding:      '10px 14px',
                cursor:       'pointer',
                color:        'white',
                display:      'flex',
                flexDirection:'column',
                alignItems:   'center',
                gap:          4,
                minWidth:     56,
                transition:   'transform .1s ease, background .1s ease',
              }}
              onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.12)'}
              onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
              onMouseDown ={e => e.currentTarget.style.transform = 'scale(.88)'}
              onMouseUp   ={e => e.currentTarget.style.transform = 'scale(1)'}
            >
              <span style={{ fontSize: 22, lineHeight: 1 }}>{emoji}</span>
              <span style={{
                fontSize:      10,
                color:         '#1A2E44',
                fontFamily:    "'JetBrains Mono', monospace",
                minHeight:     12,
              }}>
                {counts[emoji] > 0 ? formatNum(counts[emoji]) : ''}
              </span>
            </button>
          ))}
        </div>

        {total > 0 && (
          <div style={{
            textAlign:     'center',
            marginTop:     14,
            fontSize:      9.5,
            color:         '#111E2E',
            letterSpacing: '1px',
          }}>
            {formatNum(total)} total reactions worldwide
          </div>
        )}
      </div>
    </>
  )
}
