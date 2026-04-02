import { MILESTONES } from '../lib/mission.js'

export default function Timeline({ now, phaseIdx }) {
  const progressPct = phaseIdx <= 0 ? 0
    : (phaseIdx / (MILESTONES.length - 1)) * 100

  return (
    <div style={{ marginBottom: 28, overflowX: 'auto', paddingBottom: 4 }}>
      <div style={{ position: 'relative', display: 'flex', minWidth: 560, alignItems: 'flex-start' }}>

        {/* Track */}
        <div style={{
          position: 'absolute', top: 14, left: '5%', right: '5%',
          height: 1, background: 'rgba(255,255,255,0.1)',
        }} />

        {/* Completed portion */}
        <div style={{
          position: 'absolute', top: 14, left: '5%',
          width: `${progressPct * 0.9}%`,
          height: 1,
          background: 'rgba(245,200,66,0.5)',
          transition: 'width 1s linear',
        }} />

        {MILESTONES.map((m, i) => {
          const done   = m.ms <= now
          const active = i === phaseIdx
          return (
            <div key={m.id} style={{
              flex: 1, display: 'flex', flexDirection: 'column',
              alignItems: 'center', gap: 7, position: 'relative',
            }}>
              <div style={{
                width: 28, height: 28, borderRadius: '50%',
                background: active ? 'rgba(245,200,66,0.15)'
                  : done   ? 'rgba(255,255,255,0.07)'
                  : '#070F1D',
                border: `1.5px solid ${
                  active ? '#F5C842'
                  : done  ? 'rgba(255,255,255,0.25)'
                  : 'rgba(255,255,255,0.12)'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                zIndex: 1,
                boxShadow: active ? '0 0 12px rgba(245,200,66,0.25)' : 'none',
                transition: 'all .4s ease',
              }}>
                {active && (
                  <div style={{
                    width: 7, height: 7, borderRadius: '50%',
                    background: '#F5C842',
                    animation: 'orbitPulse 2s ease-in-out infinite',
                  }} />
                )}
                {done && !active && (
                  <div style={{
                    width: 5, height: 5, borderRadius: '50%',
                    background: 'rgba(255,255,255,0.5)',
                  }} />
                )}
              </div>

              <div style={{
                fontSize: 12,
                letterSpacing: '1px',
                color: active ? '#F5C842'
                  : done   ? '#5A7A9A'
                  : '#364A60',
                textTransform: 'uppercase',
                textAlign: 'center',
                lineHeight: 1.3,
                transition: 'color .4s ease',
              }}>
                {m.short}
              </div>
            </div>
          )
        })}
      </div>

      <div style={{
        textAlign: 'center', marginTop: 14,
        fontSize: 14, color: '#4A6A88',
        fontFamily: "'JetBrains Mono', monospace",
        letterSpacing: '0.5px',
      }}>
        {MILESTONES[Math.max(0, phaseIdx)]?.label}
      </div>
    </div>
  )
}
