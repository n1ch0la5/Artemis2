import { useState, useEffect, useRef, useCallback } from 'react'
import { formatNum } from '../lib/mission.js'
import {
  ARCHIVE_DATE_LABEL,
  ARCHIVED_PEAK_VIEWERS,
  ARCHIVED_REACTION_COUNTS,
  ARCHIVED_TOTAL_REACTIONS,
} from '../lib/archiveStats.js'

const EMOJIS = ['👀', '🚀', '🌕', '❤️', '🙌', '✨']

// Purrple Cat music — playlist of videos that rotate/repeat endlessly.
const PURPLE_CAT_VIDEOS = [
  { id: 'ZF7-JqMM21A', secs: 1642 },   // 27:22
  { id: '-RQe1kGs-V0', secs: 3606 },    // ~60:06
]
const PURPLE_CAT_EPOCH_MS   = 1735689600000  // 2025-01-01T00:00:00Z — shared virtual start
const PURPLE_CAT_LINK       = 'https://www.youtube.com/@PurrpleCat'

export default function ReactionDock() {
  const [musicOn,   setMusicOn]   = useState(false)
  const [rockyShoutBurst, setRockyShoutBurst] = useState(0)
  const playerRef = useRef(null)
  const videoIdx  = useRef(0)                    // current index in PURPLE_CAT_VIDEOS
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
      // Figure out where we are in the combined playlist based on wall-clock time
      const totalSecs = PURPLE_CAT_VIDEOS.reduce((s, v) => s + v.secs, 0)
      let elapsed = Math.floor(((Date.now() - PURPLE_CAT_EPOCH_MS) / 1000) % totalSecs)
      let startIdx = 0
      for (let i = 0; i < PURPLE_CAT_VIDEOS.length; i++) {
        if (elapsed < PURPLE_CAT_VIDEOS[i].secs) { startIdx = i; break }
        elapsed -= PURPLE_CAT_VIDEOS[i].secs
      }
      videoIdx.current = startIdx
      const create = () => {
        playerRef.current = new window.YT.Player('yt-music-host', {
          height: '1', width: '1',
          videoId: PURPLE_CAT_VIDEOS[videoIdx.current].id,
          playerVars: { autoplay: 1, start: elapsed, controls: 0, rel: 0, modestbranding: 1, playsinline: 1 },
          events: {
            onReady: (e) => e.target.playVideo(),
            onStateChange: (e) => {
              if (e.data === window.YT.PlayerState.ENDED) {
                videoIdx.current = (videoIdx.current + 1) % PURPLE_CAT_VIDEOS.length
                e.target.loadVideoById(PURPLE_CAT_VIDEOS[videoIdx.current].id)
              }
            },
          },
        })
      }
      if (window.YT?.Player) create()
      else window.onYouTubeIframeAPIReady = create
      setMusicOn(true)
    }
  }, [musicOn])

  useEffect(() => {
    if (!rockyShoutBurst) return undefined

    const timeoutId = window.setTimeout(() => setRockyShoutBurst(0), 2500)
    return () => window.clearTimeout(timeoutId)
  }, [rockyShoutBurst])

  return (
    <>
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
          <div style={{
            fontSize:      13,
            color:         '#6D8CAB',
            letterSpacing: '1px',
          }}>
            Peak live viewers: {formatNum(ARCHIVED_PEAK_VIEWERS)}
          </div>
          <div style={{ fontSize: 12, color: '#4A6A88', letterSpacing: '0.5px' }}>
            <span style={{ color: '#F5C842' }}>◌</span>{' '}
            archived social stats
          </div>
        </div>

        <div style={{
          marginBottom:   16,
          borderRadius:   12,
          border:         '1px solid rgba(90,154,224,0.08)',
          background:     'rgba(255,255,255,0.02)',
          padding:        '12px 14px',
          textAlign:      'center',
          fontSize:       12,
          color:          '#6D8CAB',
          letterSpacing:  '0.4px',
          lineHeight:     1.7,
        }}>
          Archived after splashdown on {ARCHIVE_DATE_LABEL}. Emoji totals and viewer counts are frozen.
        </div>

        {/* Emoji buttons */}
        <div style={{
          display:        'flex',
          gap:            8,
          flexWrap:       'wrap',
          justifyContent: 'center',
        }}>
          {EMOJIS.map(emoji => (
            <div
              key={emoji}
              style={{
                background:   'rgba(255,255,255,0.03)',
                border:       '1px solid rgba(255,255,255,0.05)',
                borderRadius: 10,
                padding:      '10px 14px',
                color:        'white',
                display:      'flex',
                flexDirection:'column',
                alignItems:   'center',
                gap:          4,
                minWidth:     56,
                cursor:       'default',
              }}
            >
              <span style={{ fontSize: 22, lineHeight: 1 }}>{emoji}</span>
              <span style={{
                fontSize:      12,
                color:         '#4A6A88',
                fontFamily:    "'JetBrains Mono', monospace",
                minHeight:     12,
              }}>
                {formatNum(ARCHIVED_REACTION_COUNTS[emoji] || 0)}
              </span>
            </div>
          ))}
        </div>

        <div style={{
          textAlign:     'center',
          marginTop:     14,
          fontSize:      12,
          color:         '#4A6A88',
          letterSpacing: '1px',
        }}>
          {formatNum(ARCHIVED_TOTAL_REACTIONS)} total reactions worldwide
        </div>

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
