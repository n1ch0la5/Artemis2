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

// ── Moon ECI positions from JPL Horizons (ICRF/J2000, geocentric, km) ────────
// Pre-computed for the Artemis II mission window at 12-hour intervals.
// Linear interpolation between entries gives sub-100 km accuracy.
const MOON_TABLE = [
  // [unixTimestamp, X, Y, Z]  — 2026-04-01 22:24 through 2026-04-10 22:24
  [1775082240, -386673.75, -54979.59,  -44203.30],  // Apr 01 22:24
  [1775125440, -378345.47, -92556.37,  -64083.63],  // Apr 02 10:24
  [1775168640, -365446.39, -129012.26, -83183.32],  // Apr 02 22:24
  [1775211840, -348189.32, -163918.57, -101280.08], // Apr 03 10:24
  [1775255040, -326831.73, -196874.60, -118168.46], // Apr 03 22:24
  [1775298240, -301670.65, -227510.47, -133661.17], // Apr 04 10:24
  [1775341440, -273037.73, -255489.22, -147590.04], // Apr 04 22:24
  [1775384640, -241294.42, -280508.29, -159806.62], // Apr 05 10:24
  [1775427840, -206827.57, -302300.48, -170182.49], // Apr 05 22:24
  [1775471040, -170045.29, -320634.43, -178609.42], // Apr 06 10:24
  [1775514240, -131373.35, -335314.90, -184999.30], // Apr 06 22:24
  [1775557440,  -91251.98, -346182.85, -189284.10], // Apr 07 10:24
  [1775600640,  -50133.00, -353115.44, -191415.77], // Apr 07 22:24
  [1775643840,   -8477.45, -356026.16, -191366.14], // Apr 08 10:24
  [1775687040,   33246.72, -354865.10, -189127.04], // Apr 08 22:24
  [1775730240,   74566.66, -349619.45, -184710.42], // Apr 09 10:24
  [1775773440,  115006.72, -340314.30, -178148.75], // Apr 09 22:24
  [1775816640,  154090.62, -327013.75, -169495.46], // Apr 10 10:24
  [1775859840,  191344.05, -309822.39, -158825.66], // Apr 10 22:24
]

function getMoonECI(unixTimestamp) {
  const t = unixTimestamp
  // Clamp to table range
  if (t <= MOON_TABLE[0][0]) return MOON_TABLE[0].slice(1)
  if (t >= MOON_TABLE[MOON_TABLE.length - 1][0]) return MOON_TABLE[MOON_TABLE.length - 1].slice(1)
  // Find bracketing entries and linearly interpolate
  for (let i = 1; i < MOON_TABLE.length; i++) {
    if (t <= MOON_TABLE[i][0]) {
      const f = (t - MOON_TABLE[i - 1][0]) / (MOON_TABLE[i][0] - MOON_TABLE[i - 1][0])
      return [
        MOON_TABLE[i - 1][1] + f * (MOON_TABLE[i][1] - MOON_TABLE[i - 1][1]),
        MOON_TABLE[i - 1][2] + f * (MOON_TABLE[i][2] - MOON_TABLE[i - 1][2]),
        MOON_TABLE[i - 1][3] + f * (MOON_TABLE[i][3] - MOON_TABLE[i - 1][3]),
      ]
    }
  }
  return MOON_TABLE[MOON_TABLE.length - 1].slice(1)
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

    // ── Timestamps ───────────────────────────────────────────────────────────
    // 5001 = MET in seconds (not always present)
    // 5010 = Unix timestamp of data (seconds since epoch, always present)
    const metSeconds   = num(raw, '5001')  // may be NaN
    const unixTs       = num(raw, '5010')  // reliable clock
    const dataTime     = raw.Parameter_2003?.Time  // "2026:092:15:58:16.125"

    // ── Distance to Moon (3D via simplified lunar ephemeris) ───────────────────
    const scKm = [x * FT_TO_KM, y * FT_TO_KM, z * FT_TO_KM]
    const moonKm = getMoonECI(unixTs || (Date.now() / 1000))
    const dxM = scKm[0] - moonKm[0]
    const dyM = scKm[1] - moonKm[1]
    const dzM = scKm[2] - moonKm[2]
    const distToMoonCenter = Math.sqrt(dxM*dxM + dyM*dyM + dzM*dzM)
    const distToMoonSurface = Math.max(0, distToMoonCenter - MOON_RADIUS_KM)
    const distToMoon = Math.round(distToMoonSurface * KM_TO_MILES)

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
