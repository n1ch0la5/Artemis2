/**
 * Netlify Function: /api/arow
 *
 * Proxies NASA AROW (Artemis Real-time Orbit Website) data to avoid CORS
 * and to normalize the response for the frontend.
 *
 * Falls back to { source: 'unavailable' } if NASA's endpoint is unreachable,
 * so the frontend can gracefully use calculated estimates.
 *
 * Cache-Control: 55s — slightly under our 60s poll interval.
 */

const NASA_AROW_URL = process.env.NASA_AROW_URL

export default async (req, context) => {
  const headers = {
    'Content-Type':  'application/json',
    'Cache-Control': 'public, max-age=55, stale-while-revalidate=10',
    'Access-Control-Allow-Origin': '*',
  }

  // If no AROW URL is configured, return unavailable immediately
  if (!NASA_AROW_URL) {
    return new Response(
      JSON.stringify({ source: 'unavailable', reason: 'NASA_AROW_URL not set' }),
      { status: 200, headers }
    )
  }

  try {
    const res = await fetch(NASA_AROW_URL, {
      signal: AbortSignal.timeout(8000), // 8s timeout
    })

    if (!res.ok) throw new Error(`AROW HTTP ${res.status}`)

    const raw = await res.json()

    // ── Normalize to our schema ──────────────────────────────────────────────
    // Adjust field names below once the actual AROW response shape is known.
    // Common fields NASA trackers expose: earthDistance, moonDistance, velocity
    const normalized = {
      source:            'arow',
      distanceFromEarth: toMiles(raw.earthDistance ?? raw.distanceFromEarth),
      distanceToMoon:    toMiles(raw.moonDistance  ?? raw.distanceToMoon),
      velocity:          toMph(raw.velocity ?? raw.speed),
      timestamp:         raw.timestamp ?? new Date().toISOString(),
    }

    return new Response(JSON.stringify(normalized), { status: 200, headers })

  } catch (err) {
    console.error('[arow proxy]', err.message)
    return new Response(
      JSON.stringify({ source: 'unavailable', reason: err.message }),
      { status: 200, headers }
    )
  }
}

// ─── Unit helpers ─────────────────────────────────────────────────────────────
// NASA data is often in km; convert to miles for consistency with the frontend.
function toMiles(km) {
  if (km == null) return null
  return Math.round(km * 0.621371)
}

function toMph(kph) {
  if (kph == null) return null
  return Math.round(kph * 0.621371)
}

export const config = {
  path: '/api/arow',
}
