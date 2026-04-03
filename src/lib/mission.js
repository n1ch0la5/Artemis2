// ─── MISSION CONSTANTS ────────────────────────────────────────────────────────

export const LAUNCH_MS     = new Date('2026-04-01T22:24:00Z').getTime()
export const SPLASHDOWN_MS = new Date('2026-04-10T22:24:00Z').getTime()
export const MISSION_MS    = SPLASHDOWN_MS - LAUNCH_MS

export const MILESTONES = [
  { id: 'launch',   label: 'Launch',           short: 'Launch',   ms: new Date('2026-04-01T22:24:00Z').getTime() },
  { id: 'orbit',    label: 'Earth Orbit',       short: 'Orbit',    ms: new Date('2026-04-02T00:30:00Z').getTime() },
  { id: 'tli',      label: 'Trans-Lunar Inj.',  short: 'TLI',      ms: new Date('2026-04-02T21:00:00Z').getTime() },
  { id: 'cruise',   label: 'Outbound Coast',    short: 'Coast',    ms: new Date('2026-04-03T02:00:00Z').getTime() },
  { id: 'approach', label: 'Lunar Approach',    short: 'Approach', ms: new Date('2026-04-05T20:00:00Z').getTime() },
  { id: 'flyby',    label: 'Closest Approach',  short: 'Flyby',    ms: new Date('2026-04-06T22:00:00Z').getTime() },
  { id: 'return',   label: 'Return Leg',        short: 'Return',   ms: new Date('2026-04-07T06:00:00Z').getTime() },
  { id: 'reentry',  label: 'Reentry',           short: 'Reentry',  ms: new Date('2026-04-10T18:00:00Z').getTime() },
  { id: 'splash',   label: 'Splashdown',        short: 'Splash',   ms: new Date('2026-04-10T22:24:00Z').getTime() },
]

// ─── TRAJECTORY MATH ─────────────────────────────────────────────────────────
// SVG viewBox: 0 0 1000 260
// Earth centre:  (105, 130)
// Moon centre:   (895, 130)
// Moon-loop arc radius (from Moon centre): 42px  →  ~18 px above Moon surface

export const EARTH = { x: 105, y: 130, r: 38 }
export const MOON  = { x: 895, y: 130, r: 24 }
const LOOP_R = 42

// Outbound cubic bezier  (Earth → start of Moon loop, above centreline)
const OB = [
  { x: 105, y: 130 },
  { x: 310, y: 16  },
  { x: 680, y: 16  },
  { x: 919, y: 96  }, // = MOON + LOOP_R at -55°
]

// Return cubic bezier  (end of Moon loop → Earth, below centreline)
const RET = [
  { x: 919, y: 164 }, // = MOON + LOOP_R at +55°
  { x: 680, y: 244 },
  { x: 310, y: 244 },
  { x: 105, y: 130 },
]

function cbez(p0, p1, p2, p3, t) {
  const m = 1 - t
  return {
    x: m**3*p0.x + 3*m**2*t*p1.x + 3*m*t**2*p2.x + t**3*p3.x,
    y: m**3*p0.y + 3*m**2*t*p1.y + 3*m*t**2*p2.y + t**3*p3.y,
  }
}

/**
 * getTrajectoryPoint(t)
 * t ∈ [0, 1]  (0 = launch, 1 = splashdown)
 * Returns { x, y } in SVG space.
 */
export function getTrajectoryPoint(t) {
  // First ~4 % = Earth parking orbit (tight ellipse)
  if (t <= 0.04) {
    const a = -Math.PI / 2 + (t / 0.04) * 2.5 * Math.PI
    return { x: EARTH.x + 52 * Math.cos(a), y: EARTH.y + 30 * Math.sin(a) }
  }

  const u = (t - 0.04) / 0.96

  // Outbound arc
  if (u < 0.56) {
    return cbez(OB[0], OB[1], OB[2], OB[3], u / 0.56)
  }

  // Moon loop (far-side pass): sweep -55° → +55°
  if (u < 0.68) {
    const a = (-55 + ((u - 0.56) / 0.12) * 110) * (Math.PI / 180)
    return { x: MOON.x + LOOP_R * Math.cos(a), y: MOON.y + LOOP_R * Math.sin(a) }
  }

  // Return arc
  return cbez(RET[0], RET[1], RET[2], RET[3], (u - 0.68) / 0.32)
}

/**
 * buildSVGPath(fromT, toT, steps?)
 * Returns an SVG path `d` string along the trajectory.
 */
export function buildSVGPath(fromT, toT, steps = 220) {
  const pts = []
  for (let i = 0; i <= steps; i++) {
    const p = getTrajectoryPoint(fromT + (i / steps) * (toT - fromT))
    pts.push(`${i === 0 ? 'M' : 'L'}${p.x.toFixed(2)},${p.y.toFixed(2)}`)
  }
  return pts.join(' ')
}

// Pre-built full ghost path (0 → 1)
export const FULL_PATH = buildSVGPath(0.04, 1)

// ─── MISSION PROGRESS ────────────────────────────────────────────────────────

export function getMissionProgress(now = Date.now()) {
  return Math.max(0, Math.min(1, (now - LAUNCH_MS) / MISSION_MS))
}

export function getCurrentPhaseIndex(now = Date.now()) {
  return MILESTONES.reduce((acc, m, i) => (m.ms <= now ? i : acc), -1)
}

// ─── ESTIMATED TELEMETRY (fallback when AROW unavailable) ────────────────────
// These are physics-informed approximations, not NASA-certified values.

export function estimateDistanceFromEarth(t) {
  // miles
  if (!t || t <= 0.04) return Math.round((t / 0.04) * 800)
  const u = (t - 0.04) / 0.96
  if (u < 0.62)  return Math.round(800  + (u / 0.62) * 243200)
  if (u < 0.68)  return 244000
  return Math.round(244000 * (1 - (u - 0.68) / 0.32))
}

export function estimateDistanceToMoon(distFromEarth) {
  return Math.max(4112, Math.round(Math.abs(244000 - distFromEarth)))
}

export function estimateVelocity(t) {
  // mph — rough curve through known mission phases
  const knots = [
    [0.00, 17400], [0.04, 17400], [0.08, 24800],
    [0.12,  8000], [0.20,  3900], [0.50,  2200],
    [0.62,  1450], [0.68,  1200],
    [0.90, 14000], [1.00, 25000],
  ]
  for (let i = 1; i < knots.length; i++) {
    if (t <= knots[i][0]) {
      const s = (t - knots[i-1][0]) / (knots[i][0] - knots[i-1][0])
      return Math.round(knots[i-1][1] + (knots[i][1] - knots[i-1][1]) * s)
    }
  }
  return 25000
}

// ─── FORMATTING HELPERS ───────────────────────────────────────────────────────

export function pad(n) { return String(n).padStart(2, '0') }

export function formatElapsed(ms) {
  const s  = Math.floor(ms / 1000)
  const d  = Math.floor(s / 86400)
  const h  = Math.floor((s % 86400) / 3600)
  const m  = Math.floor((s % 3600) / 60)
  const sc = s % 60
  return `${d}d ${pad(h)}h ${pad(m)}m ${pad(sc)}s`
}

export function formatCountdown(ms) {
  if (ms <= 0) return 'Now'
  const s = Math.floor(ms / 1000)
  const d = Math.floor(s / 86400)
  const h = Math.floor((s % 86400) / 3600)
  const m = Math.floor((s % 3600) / 60)
  if (d > 0) return `${d}d ${pad(h)}h`
  return `${pad(h)}:${pad(m)}:${pad(s % 60)}`
}

export function formatNum(n) { return n.toLocaleString() }
