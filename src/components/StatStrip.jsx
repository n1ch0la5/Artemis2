import { formatElapsed, formatCountdown, formatNum, MILESTONES } from '../lib/mission.js'

export default function StatStrip({ now, progress, launched, telemetry, phaseIdx }) {
  const elapsed  = launched ? now - (new Date('2026-04-01T22:24:00Z').getTime()) : 0
  const phase    = MILESTONES[Math.max(0, phaseIdx)]
  const next     = MILESTONES[Math.min(MILESTONES.length - 1, phaseIdx + 1)]

  const dist     = telemetry?.distanceFromEarth ?? 0
  const toMoon   = telemetry?.distanceToMoon    ?? 0
  const velocity = telemetry?.velocity          ?? 0
  const source   = telemetry?.source            ?? 'calculated'

  const stats = [
    {
      label: 'ELAPSED',
      value: launched ? formatElapsed(elapsed) : 'T-0',
      wide:  true,
    },
    {
      label: 'FROM EARTH',
      value: launched ? `${formatNum(dist)} mi` : '—',
    },
    {
      label: 'TO MOON',
      value: launched ? `${formatNum(toMoon)} mi` : '—',
    },
    {
      label: 'VELOCITY',
      value: launched ? `${formatNum(velocity)} mph` : '—',
    },
    {
      label: 'PHASE',
      value: phase.short,
      serif: true,
    },
    {
      label: next.id !== phase.id ? `UNTIL ${next.short.toUpperCase()}` : 'STATUS',
      value: next.id !== phase.id ? formatCountdown(next.ms - now) : 'Complete',
      gold:  true,
    },
  ]

  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
        gap: '1px',
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.04)',
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
              fontSize: 8.5,
              letterSpacing: '2px',
              color: '#182438',
              marginBottom: 6,
              textTransform: 'uppercase',
            }}>
              {s.label}
            </div>
            <div style={{
              fontSize: s.serif ? 17 : 13,
              fontFamily: s.serif
                ? "'Cormorant Garamond', serif"
                : "'JetBrains Mono', monospace",
              fontWeight: s.serif ? 400 : 400,
              color: s.gold ? '#F5C842' : '#B8CCE0',
              lineHeight: 1.2,
              letterSpacing: s.serif ? '0.5px' : '-0.3px',
            }}>
              {s.value}
            </div>
          </div>
        ))}
      </div>

      {/* Data source badge */}
      {launched && (
        <div style={{
          textAlign: 'right',
          marginTop: 6,
          fontSize: 8.5,
          color: '#0F1E30',
          letterSpacing: '1px',
        }}>
          {source === 'arow'
            ? '● LIVE NASA AROW DATA'
            : '◌ ESTIMATED VALUES — AROW UNAVAILABLE'}
        </div>
      )}
    </div>
  )
}
