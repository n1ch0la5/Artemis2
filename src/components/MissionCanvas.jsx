import { useMemo } from 'react'
import {
  EARTH, MOON,
  FULL_PATH,
  buildSVGPath,
  getTrajectoryPoint,
} from '../lib/mission.js'

// Deterministic star field (golden-ratio spread)
const STARS = Array.from({ length: 200 }, (_, i) => ({
  cx:    ((i * 137.508)        % 100).toFixed(3),
  cy:    ((i * 97.331 + 11)   % 100).toFixed(3),
  r:     i % 11 === 0 ? 1.4 : i % 5 === 0 ? 0.9 : 0.5,
  o:     (0.12 + (i % 7) * 0.09).toFixed(2),
  dur:   (2.4  + (i % 6) * 0.55).toFixed(1),
  delay: ((i * 0.37) % 5).toFixed(1),
}))

export default function MissionCanvas({ progress, launched, landed }) {
  // Split the path into: completed (gold) + future (ghost).
  // progress ∈ [0,1].  The orbit segment occupies 0–0.04 of t,
  // so we clamp the trail to start from 0.04.
  const trailEnd   = 0.04 + progress * 0.96
  const trailPath  = useMemo(
    () => launched ? buildSVGPath(0.04, trailEnd, 160) : null,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [Math.round(progress * 500)] // rebuild every 0.2% of progress
  )
  const futurePath = useMemo(
    () => buildSVGPath(trailEnd, 1, 160),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [Math.round(progress * 500)]
  )

  const dot = getTrajectoryPoint(launched ? 0.04 + progress * 0.96 : 0.04)

  return (
    <div style={{ position: 'relative', userSelect: 'none' }}>
      <svg
        viewBox="0 0 1000 260"
        style={{ width: '100%', height: 'auto', display: 'block', overflow: 'visible' }}
        aria-label="Orion trajectory diagram — Earth on the left, Moon on the right"
      >
        <defs>
          {/* Earth gradient */}
          <radialGradient id="earthGrad" cx="38%" cy="35%">
            <stop offset="0%"   stopColor="#5A9AE0" />
            <stop offset="50%"  stopColor="#1C52B4" />
            <stop offset="100%" stopColor="#0A234E" />
          </radialGradient>

          {/* Earth atmosphere */}
          <radialGradient id="earthAtmo" cx="50%" cy="50%">
            <stop offset="55%" stopColor="transparent" />
            <stop offset="100%" stopColor="rgba(74,136,216,0.2)" />
          </radialGradient>

          {/* Moon gradient */}
          <radialGradient id="moonGrad" cx="40%" cy="38%">
            <stop offset="0%"   stopColor="#D8E2EE" />
            <stop offset="100%" stopColor="#7A8EA8" />
          </radialGradient>

          {/* Orion glow filter */}
          <filter id="orionGlow" x="-150%" y="-150%" width="400%" height="400%">
            <feGaussianBlur stdDeviation="6" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Soft planet glow */}
          <filter id="planetGlow" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Trail gradient: brighter near Orion */}
          <linearGradient id="trailGrad" gradientUnits="userSpaceOnUse"
            x1={EARTH.x} y1={EARTH.y} x2={dot.x} y2={dot.y}>
            <stop offset="0%"   stopColor="#C8870A" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#F5C842" stopOpacity="0.85" />
          </linearGradient>
        </defs>

        {/* ── Stars ── */}
        {STARS.map((s, i) => (
          <circle
            key={i}
            cx={`${s.cx}%`} cy={`${s.cy}%`}
            r={s.r} fill="white"
            style={{
              '--star-opacity': s.o,
              opacity: s.o,
              animation: `twinkle ${s.dur}s ease-in-out infinite`,
              animationDelay: `${s.delay}s`,
            }}
          />
        ))}

        {/* ── Future path (ghost, ahead of Orion) ── */}
        <path
          d={futurePath || FULL_PATH}
          fill="none"
          stroke="rgba(255,255,255,0.07)"
          strokeWidth="1.2"
          strokeDasharray="5,7"
          style={{ animation: 'pathDash 8s linear infinite' }}
        />

        {/* ── Completed trail (gold, behind Orion) ── */}
        {trailPath && (
          <path
            d={trailPath}
            fill="none"
            stroke="url(#trailGrad)"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
        )}

        {/* ── Earth ── */}
        <circle cx={EARTH.x} cy={EARTH.y} r="68" fill="url(#earthAtmo)" />
        <circle cx={EARTH.x} cy={EARTH.y} r="52" fill="none"
          stroke="rgba(74,136,216,0.1)" strokeWidth="10" />
        <circle cx={EARTH.x} cy={EARTH.y} r={EARTH.r} fill="url(#earthGrad)"
          filter="url(#planetGlow)" />
        <circle cx={EARTH.x} cy={EARTH.y} r={EARTH.r} fill="none"
          stroke="rgba(90,154,224,0.3)" strokeWidth="1" />

        {/* ── Moon ── */}
        <circle cx={MOON.x} cy={MOON.y} r={MOON.r} fill="url(#moonGrad)"
          filter="url(#planetGlow)" />
        <circle cx={MOON.x} cy={MOON.y} r={MOON.r} fill="none"
          stroke="rgba(200,210,226,0.2)" strokeWidth="1" />

        {/* ── Body labels ── */}
        <text x={EARTH.x} y="240" textAnchor="middle"
          fill="#1A2E48" fontSize="10" letterSpacing="2.5"
          fontFamily="'JetBrains Mono', monospace">EARTH</text>
        <text x={MOON.x} y="240" textAnchor="middle"
          fill="#1A2E48" fontSize="10" letterSpacing="2.5"
          fontFamily="'JetBrains Mono', monospace">MOON</text>

        {/* ── Direction labels ── */}
        <text x="500" y="10" textAnchor="middle"
          fill="rgba(255,255,255,0.05)" fontSize="9" letterSpacing="3"
          fontFamily="'JetBrains Mono', monospace">OUTBOUND</text>
        <text x="500" y="258" textAnchor="middle"
          fill="rgba(255,255,255,0.05)" fontSize="9" letterSpacing="3"
          fontFamily="'JetBrains Mono', monospace">RETURN</text>

        {/* ── Orion spacecraft ── */}
        {launched && !landed && (
          <g transform={`translate(${dot.x}, ${dot.y})`} filter="url(#orionGlow)">
            {/* Breathing halo */}
            <circle cx="0" cy="0" r="7" fill="rgba(245,200,66,0.12)"
              style={{ animation: 'orbitBreath 2.4s ease-in-out infinite' }} />
            {/* Outer glow ring */}
            <circle cx="0" cy="0" r="7" fill="none"
              stroke="rgba(245,200,66,0.3)" strokeWidth="1"
              style={{ animation: 'orbitPulse 2.4s ease-in-out infinite' }} />
            {/* Main dot */}
            <circle cx="0" cy="0" r="4.5" fill="#F5C842" />
            {/* Hot centre */}
            <circle cx="0" cy="0" r="2" fill="#FFFCE0" />
          </g>
        )}

        {/* ── Splashdown marker ── */}
        {landed && (
          <text x={EARTH.x} y={EARTH.y + 6} textAnchor="middle"
            dominantBaseline="middle" fontSize="20">🌊</text>
        )}
      </svg>

      {/* Floating "ORION" label — positioned proportionally over the dot */}
      {launched && !landed && (
        <div style={{
          position:    'absolute',
          left:        `${(dot.x / 1000) * 100}%`,
          top:         `${(dot.y / 260) * 100}%`,
          transform:   'translate(-50%, -230%)',
          fontSize:    9,
          letterSpacing: '2.5px',
          color:       '#F5C842',
          pointerEvents: 'none',
          whiteSpace:  'nowrap',
          opacity:     0.75,
          fontFamily:  "'JetBrains Mono', monospace",
        }}>
          ORION
        </div>
      )}
    </div>
  )
}
