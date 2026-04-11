import { useState } from 'react'
import { formatElapsed, formatCountdown, formatNum, MILESTONES, LAUNCH_MS, SPLASHDOWN_MS } from '../lib/mission.js'

export default function StatStrip({ now, launched, telemetry, phaseIdx, metric, setMetric }) {
  const [showNote, setShowNote] = useState(false)
  const elapsed  = launched ? Math.min(now, SPLASHDOWN_MS) - LAUNCH_MS : 0
  const phase    = MILESTONES[Math.max(0, phaseIdx)]
  const next     = MILESTONES[Math.min(MILESTONES.length - 1, phaseIdx + 1)]

  const distMi   = telemetry?.distanceFromEarth ?? 0
  const toMoonMi = telemetry?.distanceToMoon    ?? 0
  const velMph   = telemetry?.velocity          ?? 0
  const source   = telemetry?.source            ?? 'calculated'

  const dist     = metric ? Math.round(distMi   * 1.60934) : distMi
  const toMoon   = metric ? Math.round(toMoonMi * 1.60934) : toMoonMi
  const velocity = metric ? Math.round(velMph   * 1.60934) : velMph
  const distUnit = metric ? 'km' : 'mi'
  const velUnit  = metric ? 'kph' : 'mph'

  const stats = [
    { label: 'ELAPSED',    value: launched ? formatElapsed(elapsed) : 'T-0', wide: true, nowrap: true },
    { label: 'FROM EARTH', value: launched ? `${formatNum(dist)} ${distUnit}` : '—' },
    { label: 'TO MOON',    value: launched ? `${formatNum(toMoon)} ${distUnit}` : '—', note: true },
    { label: 'VELOCITY',   value: launched ? `${formatNum(velocity)} ${velUnit}` : '—' },
    { label: 'PHASE',      value: phase.short, serif: true },
    {
      label: next.id !== phase.id ? `UNTIL ${next.short.toUpperCase()}` : 'STATUS',
      value: next.id !== phase.id ? formatCountdown(next.ms - now) : 'Complete',
      gold: true,
    },
  ]

  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <span style={{ fontSize: 11, color: metric ? '#4A6A88' : '#C4D4E8', letterSpacing: '1px', fontFamily: "'JetBrains Mono', monospace" }}>MI</span>
        <div
          onClick={() => setMetric(m => { localStorage.setItem('metric', !m); return !m })}
          style={{
            width: 36, height: 20, borderRadius: 10,
            background: metric ? '#2A6A9A' : 'rgba(255,255,255,0.1)',
            border: '1px solid rgba(255,255,255,0.15)',
            cursor: 'pointer',
            position: 'relative',
            transition: 'background .2s',
          }}
        >
          <div style={{
            position: 'absolute', top: 3, left: metric ? 18 : 3,
            width: 12, height: 12, borderRadius: '50%',
            background: metric ? '#7AC4F0' : '#4A6A88',
            transition: 'left .2s',
          }} />
        </div>
        <span style={{ fontSize: 11, color: metric ? '#C4D4E8' : '#4A6A88', letterSpacing: '1px', fontFamily: "'JetBrains Mono', monospace" }}>KM</span>
      </div>
      <div style={{ position: 'relative' }}>
        <div style={{
          position: 'relative',
          zIndex: 1,
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
          gap: '1px',
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: 12,
          overflow: 'hidden',
        }}>
          {stats.map((s, i) => (
            <div key={i} style={{
              background: '#070F1D',
              padding: '15px 14px',
              animation: 'fadeSlideUp .5s ease both',
              animationDelay: `${i * 0.07}s`,
            }}>
              <div style={{
                fontSize: 12,
                letterSpacing: '2px',
                color: '#4A6A88',
                marginBottom: 6,
                textTransform: 'uppercase',
              }}>
                {s.label}
              </div>
              <div style={{
                fontSize: s.serif ? 20 : 17,
                fontFamily: s.serif
                  ? "'Cormorant Garamond', serif"
                  : "'JetBrains Mono', monospace",
                color: s.gold ? '#F5C842' : '#C4D4E8',
                lineHeight: 1.2,
                letterSpacing: s.serif ? '0.5px' : '-0.3px',
                whiteSpace: s.nowrap ? 'nowrap' : undefined,
              }}>
                {s.value}
                {s.note && (
                  <span
                    onClick={() => setShowNote(n => !n)}
                    style={{
                      cursor: 'pointer', fontSize: 11, color: '#5A7A94',
                      marginLeft: 3, verticalAlign: 'super',
                    }}
                  >*</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {launched && (
        <div style={{
          textAlign: 'right',
          marginTop: 6,
          fontSize: 12,
          letterSpacing: '1px',
          color: '#3A5A78',
          display: 'flex',
          justifyContent: 'flex-end',
          gap: 12,
        }}>
          {source === 'live' ? (
            <>
              <span style={{ color: '#2A8A54' }}>● LIVE NASA TELEMETRY</span>
              {telemetry?.dataAgeSecs != null && (
                <span>DATA {telemetry.dataAgeSecs}s AGO</span>
              )}
            </>
          ) : (
            <span>◌ ESTIMATED — TELEMETRY UNAVAILABLE</span>
          )}
        </div>
      )}

      {showNote && (
        <div
          onClick={() => setShowNote(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 600,
            background: 'rgba(0,0,0,0.6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 20,
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: '#0A1628', border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 12, padding: '22px 26px', maxWidth: 380,
              fontSize: 13, color: '#8AA4BC', lineHeight: 1.7,
              letterSpacing: '0.3px',
              fontFamily: "'JetBrains Mono', monospace",
            }}
          >
            <div style={{ fontSize: 11, color: '#4A6A88', letterSpacing: '2px', marginBottom: 10, textTransform: 'uppercase' }}>
              Distance to Moon *
            </div>
            <p style={{ margin: '0 0 12px' }}>
              Calculated using the spacecraft's ECI position from NASA telemetry and the Moon's position from a simplified lunar ephemeris.
            </p>
            <p style={{ margin: 0 }}>
              This may differ slightly from NASA's official figure, which uses high-precision JPL ephemeris data.
            </p>
            <button
              onClick={() => setShowNote(false)}
              style={{
                marginTop: 16, background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8,
                padding: '6px 16px', cursor: 'pointer',
                color: '#5A7A94', fontSize: 12, letterSpacing: '1px',
              }}
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
