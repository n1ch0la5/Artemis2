import { useState, useEffect, useRef, useCallback } from 'react'
import Starfield     from './components/Starfield.jsx'
import MissionCanvas from './components/MissionCanvas.jsx'
import StatStrip     from './components/StatStrip.jsx'
import Timeline      from './components/Timeline.jsx'
import ReactionDock  from './components/ReactionDock.jsx'
import {
  LAUNCH_MS,
  SPLASHDOWN_MS,
  getMissionProgress,
  getCurrentPhaseIndex,
  estimateDistanceFromEarth,
  estimateDistanceToMoon,
  estimateVelocity,
  distanceToTrajectoryT,
} from './lib/mission.js'
import { joinPresence } from './lib/supabase.js'

// ─── NASA AROW polling ────────────────────────────────────────────────────────
async function fetchAROW() {
  try {
    const res = await fetch('/api/arow')
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function pad(n) { return String(n).padStart(2, '0') }
function fmtUTC(ms) {
  const d = new Date(ms)
  return `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())} UTC`
}

export default function App() {
  const [now,       setNow]      = useState(Date.now())
  const [telemetry, setTelemetry] = useState(() => {
    try { return JSON.parse(localStorage.getItem('arow_cache')) } catch { return null }
  })
  const [viewers,   setViewers]  = useState(1)
  const [metric,    setMetric]   = useState(() => localStorage.getItem('metric') === 'true')
  const [updateReady, setUpdateReady] = useState(false)
  const viewerId = useRef(Math.random().toString(36).slice(2))

  // Clock tick
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

  // Check for new deploys (every 5 min)
  useEffect(() => {
    let initialHash = null
    const check = async () => {
      try {
        const res = await fetch('/', { cache: 'no-cache' })
        const html = await res.text()
        const hash = html.match(/assets\/index[.-]([a-f0-9]+)\.js/)?.[1]
        if (!hash) return
        if (!initialHash) { initialHash = hash; return }
        if (hash !== initialHash) setUpdateReady(true)
      } catch {}
    }
    const id = setInterval(check, 300_000)
    check()
    return () => clearInterval(id)
  }, [])

  // Supabase presence
  useEffect(() => {
    const cleanup = joinPresence(viewerId.current, setViewers)
    return cleanup
  }, [])

  // AROW polling (every 60s)
  const pollAROW = useCallback(async () => {
    const data = await fetchAROW()
    if (data && data.source !== 'unavailable') {
      setTelemetry(prev => {
        // Only update if incoming data is newer (NASA GCS can serve out-of-order)
        if (prev?.unixTimestamp && data.unixTimestamp < prev.unixTimestamp) return prev
        try { localStorage.setItem('arow_cache', JSON.stringify(data)) } catch {}
        return data
      })
    }
  }, [])

  useEffect(() => {
    pollAROW()
    const id = setInterval(pollAROW, 120_000)
    return () => clearInterval(id)
  }, [pollAROW])

  const launched  = now >= LAUNCH_MS
  const landed    = now >= SPLASHDOWN_MS
  const progress  = getMissionProgress(now)
  const phaseIdx  = getCurrentPhaseIndex(now)
  const day       = launched ? Math.floor((now - LAUNCH_MS) / 86400000) + 1 : null

  // Merge AROW data with estimates
  const dist     = telemetry?.distanceFromEarth ?? estimateDistanceFromEarth(progress)
  const toMoon   = telemetry?.distanceToMoon    ?? estimateDistanceToMoon(dist, progress, now)
  const velocity = telemetry?.velocity          ?? estimateVelocity(progress)
  const dataAgeSecs = telemetry?.unixTimestamp
    ? Math.round((now / 1000) - telemetry.unixTimestamp)
    : null
  // Use real distance to position the ship on the trajectory when live data is available
  const shipProgress = telemetry?.source === 'live'
    ? distanceToTrajectoryT(dist, progress)
    : progress
  const mergedTelemetry = {
    distanceFromEarth: dist,
    distanceToMoon:    toMoon,
    velocity,
    source:     telemetry?.source ?? 'calculated',
    dataAgeSecs,
  }

  return (
    <div style={{
      background:  '#060B18',
      minHeight:   '100vh',
      color:       '#D8E4F0',
      fontFamily:  "'JetBrains Mono', 'Courier New', monospace",
      overflowX:   'hidden',
    }}>
      <Starfield />

      {updateReady && (
        <div
          onClick={() => window.location.reload()}
          style={{
            position: 'fixed', bottom: 20, left: '50%', transform: 'translateX(-50%)',
            zIndex: 500, cursor: 'pointer',
            background: 'rgba(10,20,40,0.9)', border: '1px solid rgba(90,154,224,0.3)',
            borderRadius: 10, padding: '10px 20px',
            fontSize: 12, color: '#5A9AE0', letterSpacing: '1px',
            fontFamily: "'JetBrains Mono', monospace",
            animation: 'fadeSlideUp .4s ease',
          }}
        >
          Update available — tap to refresh
        </div>
      )}
      <div style={{ position: 'relative', zIndex: 1, maxWidth: 960, margin: '0 auto', padding: '28px 20px 52px' }}>

        {/* ── Eyebrow ── */}
        <div style={{
          fontSize:      13,
          letterSpacing: '3.5px',
          color:         '#5A7A94',
          textTransform: 'uppercase',
          textAlign:     'center',
          marginBottom:  14,
        }}>
          NASA · Artemis II
          {day && <span style={{ color: '#5A8AAA' }}> · Mission Day {day}</span>}
          {launched && !landed && (
            <span style={{ color: '#2AAA64', marginLeft: 12 }}>● LIVE</span>
          )}
          {landed && (
            <span style={{ color: '#5A8AAA', marginLeft: 12 }}>· MISSION COMPLETE</span>
          )}
        </div>

        {/* ── Hero heading ── */}
        <h1 style={{
          fontFamily:    "'Cormorant Garamond', serif",
          fontWeight:    300,
          fontSize:      'clamp(26px, 5.5vw, 50px)',
          textAlign:     'center',
          color:         '#EBF2FA',
          letterSpacing: '-0.5px',
          marginBottom:  28,
          lineHeight:    1,
        }}>
          Where is{' '}
          <em style={{ fontStyle: 'italic', fontWeight: 400 }}>Orion</em>{' '}
          right now?
        </h1>

        {/* ── Trajectory ── */}
        <div style={{ marginBottom: 28 }}>
          <MissionCanvas
            progress={shipProgress}
            launched={launched}
            landed={landed}
          />
          <div style={{
            textAlign: 'center', fontSize: 10, color: '#2A3A50',
            marginTop: 6, letterSpacing: '1px',
          }}>
            Simplified trajectory — actual path is a free-return flyby, not a lunar orbit
          </div>
        </div>

        {/* ── Live stats ── */}
        <StatStrip
          now={now}
          progress={progress}
          launched={launched}
          telemetry={mergedTelemetry}
          phaseIdx={phaseIdx}
          metric={metric}
          setMetric={setMetric}
        />

        {/* ── Mission timeline ── */}
        <Timeline now={now} phaseIdx={phaseIdx} />

        {/* ── Social reactions ── */}
        <ReactionDock viewers={viewers} />

        {/* ── Ad ── */}
        <div style={{ textAlign: 'center', marginTop: 24, marginBottom: 8 }}>
          <a
            href="https://d4a3d62wwwzcay82gfo5g153qb.hop.clickbank.net/?&traffic_source=artemis2&traffic_type=organic"
            target="_blank"
            rel="noopener noreferrer sponsored"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 12,
              opacity: 0.7, transition: 'opacity .2s',
              textDecoration: 'none',
            }}
            onMouseEnter={e => e.currentTarget.style.opacity = '1'}
            onMouseLeave={e => e.currentTarget.style.opacity = '0.7'}
          >
            <img
              src="/derila-ergo-1x-pillow.avif"
              alt="Sponsored"
              style={{ height: 40, borderRadius: 6 }}
            />
            <span style={{
              fontSize: 13, color: '#4A6A88', letterSpacing: '0.5px',
              fontFamily: "'JetBrains Mono', monospace",
            }}>
              Sleep like you're in zero gravity · Derila Pillow · #Ad
            </span>
          </a>
        </div>

        {/* ── Footer ── */}
        <div style={{
          textAlign:     'center',
          marginTop:     36,
          fontSize:      12,
          color:         '#4A6A80',
          letterSpacing: '2px',
          textTransform: 'uppercase',
          lineHeight:    1.8,
        }}>
          Artemis II · Reid Wiseman · Victor Glover · Christina Koch · Jeremy Hansen
          <br />
          April 1–10, 2026 · Free-return lunar flyby · 685,000 mi round trip
          <br />
          <span style={{ color: '#3A5A70' }}>
            UTC {fmtUTC(now)}
          </span>
          <br />
          <span style={{ color: '#3A5A70', letterSpacing: '1.5px', fontSize: 11 }}>
            Not affiliated with or endorsed by NASA
          </span>
        </div>
      </div>
    </div>
  )
}
