/**
 * Netlify Function: /api/arow
 *
 * Fetches live Orion telemetry from NASA's public GCS bucket and returns
 * normalized data for the frontend.
 *
 * Confirmed parameters (reverse-engineered from AROW Unity app, April 2026):
 *
 *   2003, 2004, 2005  →  ECI position X,Y,Z        (feet)
 *   2009, 2010, 2011  →  ECI velocity Vx,Vy,Vz     (ft/s)
 *   5001              →  Mission elapsed time       (seconds) — not always present
 *   5010              →  Unix timestamp, data clock (seconds since epoch)
 *   5007, 5008, 5009  →  Thermal sensors            (°F, probably)
 *
 * Parameters 2012–2015 appear to be an attitude quaternion (unit norm ~1).
 * Parameters 2101–2103 are very small values, possibly angular acceleration.
 * Parameters 5002–5006 may be orbital element rates.
 *
 * The GCS object is overwritten in-place; no generation param needed for latest.
 */

const GCS_URL = 'https://storage.googleapis.com/p-2-cen1/October/1/October_105_1.txt'

const EARTH_RADIUS_KM = 6_371
const MOON_RADIUS_KM  = 1_737
const KM_TO_MILES     = 0.621371
const FT_TO_KM        = 0.0003048   // position params are in feet
const FTS_TO_MPH      = 0.681818    // velocity params are in ft/s

// ── Simplified lunar ephemeris (good to ~1°, ~2000 km) ───────────────────────
function getMoonECI(unixTimestamp) {
  const JD = unixTimestamp / 86400 + 2440587.5
  const T  = (JD - 2451545.0) / 36525
  const rad = d => d * Math.PI / 180

  const L0 = 218.3165 + 481267.8813 * T
  const M  = 134.9634 + 477198.8676 * T
  const F  = 93.2721  + 483202.0175 * T
  const D  = 297.8502 + 445267.1115 * T
  const Ms = 357.5291 + 35999.0503  * T

  const Mr = rad(M), Dr = rad(D), Fr = rad(F), Msr = rad(Ms)

  const lon = L0
    + 6.289 * Math.sin(Mr)
    - 1.274 * Math.sin(2*Dr - Mr)
    + 0.658 * Math.sin(2*Dr)
    + 0.214 * Math.sin(2*Mr)
    - 0.186 * Math.sin(Msr)
    - 0.114 * Math.sin(2*Fr)

  const lat = 5.128 * Math.sin(Fr)
    + 0.281 * Math.sin(Mr + Fr)
    - 0.278 * Math.sin(Fr - Mr)
    - 0.173 * Math.sin(2*Dr - Fr)

  const dist = 385001
    - 20905 * Math.cos(Mr)
    - 3699  * Math.cos(2*Dr - Mr)
    - 2956  * Math.cos(2*Dr)

  const lonR = rad(lon), latR = rad(lat)
  const eps  = rad(23.4393 - 0.0130 * T)

  const xE = dist * Math.cos(latR) * Math.cos(lonR)
  const yE = dist * Math.cos(latR) * Math.sin(lonR)
  const zE = dist * Math.sin(latR)

  return [xE, yE * Math.cos(eps) - zE * Math.sin(eps), yE * Math.sin(eps) + zE * Math.cos(eps)]
}

export default async (req, context) => {
  const headers = {
    'Content-Type':  'application/json',
    'Cache-Control': 'public, max-age=55, stale-while-revalidate=10',
    'Access-Control-Allow-Origin': '*',
  }

  try {
    const res = await fetch(GCS_URL, {
      signal: AbortSignal.timeout(8_000),
    })
    if (!res.ok) throw new Error(`GCS ${res.status}`)

    const raw = await res.json()

    // ── Position (feet, ECI) ─────────────────────────────────────────────────
    const x = num(raw, '2003')
    const y = num(raw, '2004')
    const z = num(raw, '2005')
    if (isNaN(x)) throw new Error('Position params missing')

    const distCenterKm  = Math.sqrt(x*x + y*y + z*z) * FT_TO_KM
    const distSurfaceKm = Math.max(0, distCenterKm - EARTH_RADIUS_KM)
    const distFromEarth = Math.round(distSurfaceKm * KM_TO_MILES)

    // ── Velocity (ft/s, ECI) ─────────────────────────────────────────────────
    const vx = num(raw, '2009')
    const vy = num(raw, '2010')
    const vz = num(raw, '2011')
    if (isNaN(vx)) throw new Error('Velocity params missing')

    const velocity = Math.round(Math.sqrt(vx*vx + vy*vy + vz*vz) * FTS_TO_MPH)

    // ── Distance to Moon (3D via simplified lunar ephemeris) ───────────────────
    const scKm = [x * FT_TO_KM, y * FT_TO_KM, z * FT_TO_KM]
    const moonKm = getMoonECI(unixTs || (Date.now() / 1000))
    const dxM = scKm[0] - moonKm[0]
    const dyM = scKm[1] - moonKm[1]
    const dzM = scKm[2] - moonKm[2]
    const distToMoonCenter = Math.sqrt(dxM*dxM + dyM*dyM + dzM*dzM)
    const distToMoonSurface = Math.max(0, distToMoonCenter - MOON_RADIUS_KM)
    const distToMoon = Math.round(distToMoonSurface * KM_TO_MILES)

    // ── Timestamps ───────────────────────────────────────────────────────────
    // 5001 = MET in seconds (not always present)
    // 5010 = Unix timestamp of data (seconds since epoch, always present)
    const metSeconds   = num(raw, '5001')  // may be NaN
    const unixTs       = num(raw, '5010')  // reliable clock
    const dataTime     = raw.Parameter_2003?.Time  // "2026:092:15:58:16.125"

    // ── Attitude quaternion (2012, 2013, 2014, 2015) ─────────────────────────
    // Included raw — useful for future 3D orientation visualisation
    const qx = num(raw, '2012')
    const qy = num(raw, '2013')
    const qz = num(raw, '2014')
    const qw = num(raw, '2015')

    return new Response(JSON.stringify({
      source:            'live',
      distanceFromEarth: distFromEarth,            // miles from surface
      distanceToMoon:    distToMoon,                // miles (estimated)
      velocity,                                     // mph
      metSeconds:        isNaN(metSeconds) ? null : Math.round(metSeconds),
      unixTimestamp:     isNaN(unixTs)    ? null : unixTs,
      dataTimestamp:     dataTime,                  // "year:doy:HH:MM:SS.sss"
      attitude:          [qx, qy, qz, qw],          // unit quaternion
      _pos_km:           [x*FT_TO_KM, y*FT_TO_KM, z*FT_TO_KM],
      _vel_fts:          [vx, vy, vz],
    }), { status: 200, headers })

  } catch (err) {
    console.error('[arow]', err.message)
    return new Response(
      JSON.stringify({ source: 'unavailable', reason: err.message }),
      { status: 200, headers }
    )
  }
}

function num(data, id) {
  return parseFloat(data[`Parameter_${id}`]?.Value)
}

export const config = { path: '/api/arow' }
