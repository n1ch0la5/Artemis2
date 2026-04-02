import { useState, useEffect, useRef, useCallback } from 'react'
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
  const [telemetry, setTelemetry] = useState(null)   // AROW data if available
  const [viewers,   setViewers]  = useState(1)
  const viewerId = useRef(Math.random().toString(36).slice(2))

  // Clock tick
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
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
    if (data) setTelemetry(data)
  }, [])

  useEffect(() => {
    pollAROW()
    const id = setInterval(pollAROW, 60_000)
    return () => clearInterval(id)
  }, [pollAROW])

  const launched  = now >= LAUNCH_MS
  const landed    = now >= SPLASHDOWN_MS
  const progress  = getMissionProgress(now)
  const phaseIdx  = getCurrentPhaseIndex(now)
  const day       = launched ? Math.floor((now - LAUNCH_MS) / 86400000) + 1 : null

  // Merge AROW data with estimates
  const dist     = telemetry?.distanceFromEarth ?? estimateDistanceFromEarth(progress)
  const toMoon   = telemetry?.distanceToMoon    ?? estimateDistanceToMoon(dist)
  const velocity = telemetry?.velocity          ?? estimateVelocity(progress)
  
  const dataAgeSecs = telemetry?.unixTimestamp
    ? Math.round((now / 1000) - telemetry.unixTimestamp)
    : null
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
      <div style={{ maxWidth: 960, margin: '0 auto', padding: '28px 20px 52px' }}>

        {/* ── Eyebrow ── */}
        <div style={{
          fontSize:      10,
          letterSpacing: '3.5px',
          color:         '#142030',
          textTransform: 'uppercase',
          textAlign:     'center',
          marginBottom:  14,
        }}>
          NASA · Artemis II
          {day && <span style={{ color: '#1E3A54' }}> · Mission Day {day}</span>}
          {launched && !landed && (
            <span style={{ color: '#1D5C38', marginLeft: 12 }}>● LIVE</span>
          )}
          {landed && (
            <span style={{ color: '#2A4060', marginLeft: 12 }}>· MISSION COMPLETE</span>
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
        <h2 style={{
          fontFamily:    "'Cormorant Garamond', serif",
          fontWeight:    300,
          fontSize:      'clamp(18px, 5.5vw, 36px)',
          textAlign:     'center',
          color:         '#808080',
          letterSpacing: '-0.5px',
          marginBottom:  28,
          lineHeight:    1,
        }}>
          Artemis II Mission Real-Time Tracker</h2>

        {/* ── Trajectory ── */}
        <div style={{ marginBottom: 28 }}>
          <MissionCanvas
            progress={progress}
            launched={launched}
            landed={landed}
          />
        </div>

        {/* ── Live stats ── */}
        <StatStrip
          now={now}
          progress={progress}
          launched={launched}
          telemetry={mergedTelemetry}
          phaseIdx={phaseIdx}
        />

        {/* ── Mission timeline ── */}
        <Timeline now={now} phaseIdx={phaseIdx} />

        {/* ── Social reactions ── */}
        <ReactionDock viewers={viewers} />

        {/* ── Footer ── */}
        <div style={{
          textAlign:     'center',
          marginTop:     36,
          fontSize:      9,
          color:         '#0C1724',
          letterSpacing: '2px',
          textTransform: 'uppercase',
          lineHeight:    1.8,
        }}>
          Artemis II · Reid Wiseman · Victor Glover · Christina Koch · Jeremy Hansen
          <br />
          April 1–10, 2026 · Free-return lunar flyby · 685,000 mi round trip
          <br />
          <span style={{ color: '#081018' }}>
            UTC {fmtUTC(now)}
          </span>
        </div>
      </div>
    </div>
  )
}
