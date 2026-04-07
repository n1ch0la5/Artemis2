// ─── MISSION CONSTANTS ────────────────────────────────────────────────────────

export const LAUNCH_MS     = new Date('2026-04-01T22:24:00Z').getTime()
export const SPLASHDOWN_MS = new Date('2026-04-11T00:07:00Z').getTime()
export const MISSION_MS    = SPLASHDOWN_MS - LAUNCH_MS

export const MILESTONES = [
  { id: 'launch',   label: 'Launch',           short: 'Launch',   ms: new Date('2026-04-01T22:24:00Z').getTime() },
  { id: 'orbit',    label: 'Earth Orbit',       short: 'Orbit',    ms: new Date('2026-04-02T00:30:00Z').getTime() },
  { id: 'tli',      label: 'Trans-Lunar Inj.',  short: 'TLI',      ms: new Date('2026-04-02T21:00:00Z').getTime() },
  { id: 'cruise',   label: 'Outbound Coast',    short: 'Coast',    ms: new Date('2026-04-03T02:00:00Z').getTime() },
  { id: 'approach', label: 'Lunar Approach',    short: 'Approach', ms: new Date('2026-04-05T20:00:00Z').getTime() },
  { id: 'flyby',    label: 'Closest Approach',  short: 'Flyby',    ms: new Date('2026-04-06T22:00:00Z').getTime() },
  { id: 'return',   label: 'Return Leg',        short: 'Return',   ms: new Date('2026-04-07T06:00:00Z').getTime() },
  { id: 'reentry',  label: 'Reentry',           short: 'Reentry',  ms: new Date('2026-04-10T23:53:00Z').getTime() },
  { id: 'splash',   label: 'Splashdown',        short: 'Splash',   ms: new Date('2026-04-11T00:07:00Z').getTime() },
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
// Loop sweep uses ±70°; control-point tangents match the arc tangent at the junction
// so the curve is C1-continuous (no visible kink).
const LOOP_DEG = 70
const LOOP_RAD = LOOP_DEG * Math.PI / 180
const OB = [
  { x: 105, y: 130 },
  { x: 310, y: 16  },
  { x: 672, y: 5   },
  { x: Math.round(MOON.x + LOOP_R * Math.cos(-LOOP_RAD)), y: Math.round(MOON.y + LOOP_R * Math.sin(-LOOP_RAD)) },
]

// Return cubic bezier  (end of Moon loop → Earth, below centreline)
const RET = [
  { x: Math.round(MOON.x + LOOP_R * Math.cos(LOOP_RAD)), y: Math.round(MOON.y + LOOP_R * Math.sin(LOOP_RAD)) },
  { x: 672, y: 255 },
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

  // Moon loop (far-side pass): sweep -70° → +70°
  if (u < 0.68) {
    const a = -LOOP_RAD + ((u - 0.56) / 0.12) * 2 * LOOP_RAD
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

/**
 * Convert distance-from-Earth (miles) + time progress into a trajectory t value.
 * Binary-searches for the t whose getTrajectoryPoint(t).x matches the desired
 * x-position derived from the distance fraction, so the dot visually tracks
 * the correct position along the curved bezier path.
 */
const MAX_DIST = 244_000  // approximate max distance at lunar flyby (miles)
const FLYBY_TIME = (MILESTONES.find(m => m.id === 'flyby').ms - LAUNCH_MS) / MISSION_MS
export function distanceToTrajectoryT(distMiles, timeProgress) {
  const frac = Math.min(1, Math.max(0, distMiles / MAX_DIST))

  // Use flyby milestone time to determine leg (not a hardcoded threshold)
  const pastFlyby = timeProgress > FLYBY_TIME

  if (!pastFlyby) {
    // Outbound + moon loop: map distance fraction to t in [0.04, 0.70]
    const targetX = EARTH.x + frac * (MOON.x - EARTH.x)
    // Binary search for t that gives us this x
    let lo = 0.04, hi = 0.70
    for (let i = 0; i < 20; i++) {
      const mid = (lo + hi) / 2
      const pt = getTrajectoryPoint(mid)
      if (pt.x < targetX) lo = mid; else hi = mid
    }
    return (lo + hi) / 2
  } else {
    // Return: map distance fraction (decreasing) to t in [0.68, 1.0]
    const targetX = EARTH.x + frac * (MOON.x - EARTH.x)
    // On return leg, x decreases as t increases
    let lo = 0.68, hi = 1.0
    for (let i = 0; i < 20; i++) {
      const mid = (lo + hi) / 2
      const pt = getTrajectoryPoint(mid)
      if (pt.x > targetX) lo = mid; else hi = mid
    }
    return (lo + hi) / 2
  }
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

// ── Moon distance from JPL Horizons (km, centre-to-centre) ───────────────────
// Pre-computed for the Artemis II window; linearly interpolated.
const MOON_DIST_TABLE = [
  // [unixMs, distKm]  — 2026-04-01 22:24 through 2026-04-10 22:24 (12h steps)
  [1775082240000, 393056], [1775125440000, 394739], [1775168640000, 396377],
  [1775211840000, 397948], [1775255040000, 399428], [1775298240000, 400789],
  [1775341440000, 402004], [1775384640000, 403046], [1775427840000, 403888],
  [1775471040000, 404504], [1775514240000, 404870], [1775557440000, 404967],
  [1775600640000, 404776], [1775643840000, 404286], [1775687040000, 403489],
  [1775730240000, 402383], [1775773440000, 400971], [1775816640000, 399263],
  [1775859840000, 397276],
]
function earthMoonDistanceMi(now = Date.now()) {
  const t = typeof now === 'number' && now < 1e12 ? now : (now || Date.now())
  const ms = t > 1e12 ? t : t * 1000 // handle both ms and s
  if (ms <= MOON_DIST_TABLE[0][0]) return MOON_DIST_TABLE[0][1] * 0.621371
  if (ms >= MOON_DIST_TABLE[MOON_DIST_TABLE.length - 1][0]) return MOON_DIST_TABLE[MOON_DIST_TABLE.length - 1][1] * 0.621371
  for (let i = 1; i < MOON_DIST_TABLE.length; i++) {
    if (ms <= MOON_DIST_TABLE[i][0]) {
      const f = (ms - MOON_DIST_TABLE[i - 1][0]) / (MOON_DIST_TABLE[i][0] - MOON_DIST_TABLE[i - 1][0])
      const d = MOON_DIST_TABLE[i - 1][1] + f * (MOON_DIST_TABLE[i][1] - MOON_DIST_TABLE[i - 1][1])
      return d * 0.621371
    }
  }
  return MOON_DIST_TABLE[MOON_DIST_TABLE.length - 1][1] * 0.621371
}

const EARTH_R_MI = 3959  // Earth radius in miles
const MOON_R_MI  = 1080  // Moon radius in miles

export function estimateDistanceToMoon(distFromEarth, t, now) {
  // Use trajectory geometry + law of cosines for a proper 3D estimate.
  // The SVG trajectory captures the angular offset of the free-return path.
  const clampedT = Math.max(0.04, Math.min(1, t || 0))
  const pt = getTrajectoryPoint(clampedT)

  // Angle between Earth→spacecraft and Earth→Moon directions (from SVG path)
  const dx   = pt.x - EARTH.x
  const dy   = pt.y - EARTH.y
  const mDx  = MOON.x - EARTH.x      // 790
  const mDy  = MOON.y - EARTH.y      // 0
  const magSC   = Math.sqrt(dx*dx + dy*dy)
  const magMoon = Math.sqrt(mDx*mDx + mDy*mDy)
  const cosTheta = magSC > 0 ? (dx*mDx + dy*mDy) / (magSC * magMoon) : 1

  // Distances from Earth centre (miles)
  const dSE = distFromEarth + EARTH_R_MI
  const dEM = earthMoonDistanceMi(now) + EARTH_R_MI  // centre-to-centre

  // Law of cosines:  SM² = SE² + EM² − 2·SE·EM·cos(θ)
  const sm2 = dSE*dSE + dEM*dEM - 2*dSE*dEM*cosTheta
  const distToCenter = Math.sqrt(Math.max(0, sm2))
  return Math.max(0, Math.round(distToCenter - MOON_R_MI))
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
