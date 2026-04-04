import { formatElapsed, formatCountdown, formatNum, MILESTONES } from '../lib/mission.js'

export default function StatStrip({ now, launched, telemetry, phaseIdx, metric, setMetric }) {
  const elapsed  = launched ? now - (new Date('2026-04-01T22:24:00Z').getTime()) : 0
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
    { label: 'TO MOON',    value: launched ? `${formatNum(toMoon)} ${distUnit}` : '—' },
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
      <div style={{
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
            </div>
          </div>
        ))}
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
    </div>
  )
}
