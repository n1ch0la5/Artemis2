import { useState, useEffect, useRef, useCallback } from 'react'
import { formatNum } from '../lib/mission.js'
import {
  fetchReactionCounts,
  incrementReaction,
  broadcastReaction,
  subscribeReactions,
} from '../lib/supabase.js'

const EMOJIS = ['👀', '🚀', '🌕', '❤️', '🙌', '✨']

// Purrple Cat music sync — wall-clock offset keeps everyone at the same position.
const PURPLE_CAT_VIDEO_ID   = 'ZF7-JqMM21A'
const PURPLE_CAT_TRACK_SECS = 1642           // 27:22
const PURPLE_CAT_EPOCH_MS   = 1735689600000  // 2025-01-01T00:00:00Z — shared virtual start
const PURPLE_CAT_LINK       = 'https://www.youtube.com/@PurrpleCat'

export default function ReactionDock({ viewers }) {
  const [counts,   setCounts]   = useState({})
  const [floaters, setFloaters] = useState([])
  const [ticker,   setTicker]   = useState(0)   // reactions in last 60s
  const [musicOn,   setMusicOn]   = useState(false)
  const [rockyShoutBurst, setRockyShoutBurst] = useState(0)
  const playerRef = useRef(null)
  const recentTs = useRef([])                    // timestamps of recent reactions
  const showRockyShout = rockyShoutBurst > 0

  // Load YouTube IFrame API once and create a persistent DOM node for the player
  useEffect(() => {
    if (!document.getElementById('yt-music-host')) {
      const host = document.createElement('div')
      host.id = 'yt-music-host'
      Object.assign(host.style, { position: 'fixed', width: '1px', height: '1px', opacity: '0', pointerEvents: 'none', bottom: '0', left: '0' })
      document.body.appendChild(host)
    }
    if (!window.YT) {
      const tag = document.createElement('script')
      tag.src = 'https://www.youtube.com/iframe_api'
      document.head.appendChild(tag)
    }
  }, [])

  const handleMusicToggle = useCallback(() => {
    if (musicOn) {
      playerRef.current?.destroy()
      playerRef.current = null
      // Re-create the host div since destroy removes it
      const old = document.getElementById('yt-music-host')
      if (old) old.remove()
      const host = document.createElement('div')
      host.id = 'yt-music-host'
      Object.assign(host.style, { position: 'fixed', width: '1px', height: '1px', opacity: '0', pointerEvents: 'none', bottom: '0', left: '0' })
      document.body.appendChild(host)
      setMusicOn(false)
    } else {
      const offset = Math.floor(((Date.now() - PURPLE_CAT_EPOCH_MS) / 1000) % PURPLE_CAT_TRACK_SECS)
      const create = () => {
        playerRef.current = new window.YT.Player('yt-music-host', {
          height: '1', width: '1',
          videoId: PURPLE_CAT_VIDEO_ID,
          playerVars: { autoplay: 1, start: offset, loop: 1, playlist: PURPLE_CAT_VIDEO_ID, controls: 0, rel: 0, modestbranding: 1, playsinline: 1 },
          events: {
            onReady: (e) => e.target.playVideo(),
          },
        })
      }
      if (window.YT?.Player) create()
      else window.onYouTubeIframeAPIReady = create
      setMusicOn(true)
    }
  }, [musicOn])

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

  useEffect(() => {
    if (!rockyShoutBurst) return undefined

    const timeoutId = window.setTimeout(() => setRockyShoutBurst(0), 2500)
    return () => window.clearTimeout(timeoutId)
  }, [rockyShoutBurst])

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
          <div style={{ fontSize: 13, color: '#4A6A88', letterSpacing: '1px' }}>
            <span style={{ color: '#2AAA64' }}>●</span>{' '}
            <span style={{ color: '#2A4060' }}>
              {formatNum(viewers)}
            </span>{' '}
            watching now
          </div>
          {ticker > 0 && (
            <div style={{
              fontSize:      12,
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
                fontSize:      12,
                color:         '#4A6A88',
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
            fontSize:      12,
            color:         '#4A6A88',
            letterSpacing: '1px',
          }}>
            {formatNum(total)} total reactions worldwide
          </div>
        )}

        {/* Music toggle */}
        <div style={{
          marginTop:  16,
          paddingTop: 14,
          borderTop:  '1px solid rgba(255,255,255,0.04)',
          display:    'flex',
          alignItems: 'center',
          gap:        10,
        }}>
          <span style={{ fontSize: 16, lineHeight: 1 }}>♫</span>
          <div style={{ flex: 1 }}>
            <a
              href={PURPLE_CAT_LINK}
              target="_blank"
              rel="noreferrer"
              style={{
                fontSize:       13,
                color:          musicOn ? '#2AAA64' : '#4A6A88',
                textDecoration: 'none',
                letterSpacing:  '0.5px',
                transition:     'color .2s ease',
              }}
            >
              Purrple Cat
            </a>
            <span style={{ fontSize: 11, color: '#1A2E44', marginLeft: 6 }}>
              · lo-fi beats
            </span>
          </div>
          {musicOn && (
            <span style={{
              display:      'inline-block',
              width:        7,
              height:       7,
              borderRadius: '50%',
              background:   '#2AAA64',
              marginRight:  4,
              flexShrink:   0,
            }} />
          )}
          <button
            onClick={handleMusicToggle}
            style={{
              background:   musicOn ? 'rgba(42,170,100,0.1)' : 'rgba(255,255,255,0.03)',
              border:       `1px solid ${musicOn ? 'rgba(42,170,100,0.25)' : 'rgba(255,255,255,0.05)'}`,
              borderRadius: 8,
              padding:      '6px 12px',
              cursor:       'pointer',
              color:        musicOn ? '#2AAA64' : '#4A6A88',
              fontSize:     12,
              letterSpacing:'0.5px',
              transition:   'transform .1s ease, background .2s ease, color .2s ease',
              whiteSpace:   'nowrap',
            }}
            onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.06)'}
            onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
            onMouseDown ={e => e.currentTarget.style.transform = 'scale(.92)'}
            onMouseUp   ={e => e.currentTarget.style.transform = 'scale(1)'}
          >
            {musicOn ? '■ Stop' : '▶ Listen'}
          </button>
        </div>
      </div>

      <div
        style={{
          position: 'fixed',
          right: 'max(16px, env(safe-area-inset-right))',
          bottom: 'max(14px, env(safe-area-inset-bottom))',
          width: 'clamp(38px, 5.2vw, 50px)',
          aspectRatio: '200 / 201',
          zIndex: 220,
          pointerEvents: 'none',
        }}
      >
        {showRockyShout && (
          <div
            key={rockyShoutBurst}
            aria-hidden="true"
            style={{
              position: 'absolute',
              left: '50%',
              top: -30,
              pointerEvents: 'none',
              zIndex: 3,
            }}
          >
            {[
              { id: 'first', delay: '0s', x: '-8px', tilt: '-7deg' },
              { id: 'second', delay: '0.56s', x: '12px', tilt: '5deg' },
            ].map(shout => (
              <span
                key={shout.id}
                style={{
                  '--shout-x': shout.x,
                  '--shout-tilt': shout.tilt,
                  position: 'absolute',
                  left: '50%',
                  top: 0,
                  animation: 'rockyShoutRise 1.6s linear both',
                  animationDelay: shout.delay,
                  fontFamily: "'Comic Sans MS', 'Chalkboard SE', 'Marker Felt', cursive",
                  fontSize: 'clamp(10px, 1.3vw, 14px)',
                  lineHeight: 0.95,
                  color: '#F7FFF3',
                  textAlign: 'center',
                  textShadow: '0 0 10px rgba(210,255,224,0.28), 0 2px 0 rgba(22,36,22,0.95), 2px 2px 0 rgba(22,36,22,0.9), -2px 2px 0 rgba(22,36,22,0.9)',
                  whiteSpace: 'nowrap',
                }}
              >
                AMAZE!
              </span>
            ))}
          </div>
        )}

        <button
          type="button"
          onClick={() => setRockyShoutBurst(prev => prev + 1)}
          aria-label="Wake Rocky"
          style={{
            position: 'relative',
            width: '100%',
            height: '100%',
            border: 'none',
            background: 'transparent',
            padding: 0,
            cursor: 'pointer',
            overflow: 'visible',
            pointerEvents: 'auto',
            transform: 'translateY(-4%)',
            transition: 'transform .18s ease',
            WebkitTapHighlightColor: 'transparent',
          }}
          onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-7%) scale(1.03)'}
          onMouseLeave={e => e.currentTarget.style.transform = 'translateY(-4%) scale(1)'}
          onMouseDown={e => e.currentTarget.style.transform = 'translateY(-1%) scale(0.97)'}
          onMouseUp={e => e.currentTarget.style.transform = 'translateY(-7%) scale(1.03)'}
        >
          <span
            aria-hidden="true"
            style={{
              position: 'absolute',
              inset: '2% -18% -10%',
              borderRadius: '50%',
              background: 'radial-gradient(circle at 50% 42%, rgba(224,231,255,0.82) 0%, rgba(129,140,248,0.74) 20%, rgba(99,102,241,0.54) 46%, rgba(30,27,75,0.28) 66%, rgba(30,27,75,0) 84%)',
              filter: 'blur(14px)',
              opacity: 1,
              animation: 'rockyGlowPulse 5.2s ease-in-out infinite',
            }}
          />
          <span
            aria-hidden="true"
            style={{
              position: 'absolute',
              left: '50%',
              top: '18%',
              width: '78%',
              height: '38%',
              transform: 'translateX(-50%)',
              borderRadius: '50%',
              background: 'radial-gradient(circle at 50% 46%, rgba(224,231,255,0.5) 0%, rgba(129,140,248,0.28) 50%, rgba(129,140,248,0) 76%)',
              filter: 'blur(9px)',
              opacity: 0.45,
            }}
          />
          <span
            aria-hidden="true"
            style={{
              position: 'absolute',
              left: '50%',
              bottom: '8%',
              width: '84%',
              height: '20%',
              transform: 'translateX(-50%)',
              borderRadius: '50%',
              background: 'radial-gradient(ellipse at center, rgba(224,231,255,0.16) 0%, rgba(99,102,241,0.18) 34%, rgba(30,27,75,0) 76%)',
              filter: 'blur(8px)',
              opacity: 0.5,
            }}
          />
          <span
            style={{
              position: 'absolute',
              inset: 0,
              display: 'block',
              animation: 'rockyIdleDance 13.8s ease-in-out infinite',
              transformOrigin: '50% 100%',
            }}
          >
            <img
              src="/rocky.png"
              alt="Rocky hiding in the corner of the screen"
              draggable="false"
              style={{
                position: 'relative',
                zIndex: 1,
                display: 'block',
                width: '100%',
                height: '100%',
                objectFit: 'contain',
                filter: 'drop-shadow(0 4px 7px rgba(0,0,0,0.44))',
                userSelect: 'none',
              }}
            />
          </span>
        </button>
      </div>

    </>
  )
}
