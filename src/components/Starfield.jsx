import { useEffect, useRef } from 'react'

const STAR_COUNT    = 200
const TWINKLE_ODDS  = 0.0004  // chance per frame a star starts twinkling
const SHOOT_ODDS    = 0.0008  // chance per frame a shooting star spawns

function randBetween(a, b) { return a + Math.random() * (b - a) }

function makeStars(w, h) {
  return Array.from({ length: STAR_COUNT }, () => ({
    x:       Math.random() * w,
    y:       Math.random() * h,
    r:       randBetween(0.4, 1.6),
    base:    randBetween(0.1, 0.55),  // base opacity
    opacity: 0,
    // twinkle state
    twinkling: false,
    twinkleT:  0,
    twinkleDur: 0,
  }))
}

export default function Starfield() {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx    = canvas.getContext('2d')
    let   animId
    let   w, h, stars
    const shooters = []

    function resize() {
      w = canvas.width  = window.innerWidth
      h = canvas.height = window.innerHeight
      stars = makeStars(w, h)
    }

    function spawnShooter() {
      // Start from a random point in the upper half, travel diagonally
      const angle = randBetween(Math.PI * 0.1, Math.PI * 0.45) // shallow downward angle
      shooters.push({
        x:     randBetween(0, w * 0.9),
        y:     randBetween(0, h * 0.4),
        vx:    Math.cos(angle) * randBetween(6, 12),
        vy:    Math.sin(angle) * randBetween(2, 5),
        len:   randBetween(60, 130),
        life:  1,   // 0–1, fades out
        decay: randBetween(0.018, 0.03),
      })
    }

    function draw() {
      ctx.clearRect(0, 0, w, h)

      // ── Stars ──
      for (const s of stars) {
        // start a twinkle randomly
        if (!s.twinkling && Math.random() < TWINKLE_ODDS) {
          s.twinkling  = true
          s.twinkleT   = 0
          s.twinkleDur = randBetween(300, 600)
        }

        if (s.twinkling) {
          const t  = s.twinkleT / s.twinkleDur
          // sine pulse: bright in the middle
          s.opacity   = s.base * (0.6 + 0.4 * Math.abs(Math.sin(Math.PI * t)))
          s.twinkleT += 1
          if (s.twinkleT >= s.twinkleDur) {
            s.twinkling = false
            s.opacity   = s.base
          }
        } else {
          s.opacity = s.base
        }

        ctx.beginPath()
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(210, 230, 255, ${s.opacity})`
        ctx.fill()
      }

      // ── Shooting stars ──
      if (Math.random() < SHOOT_ODDS) spawnShooter()

      for (let i = shooters.length - 1; i >= 0; i--) {
        const s = shooters[i]
        const tailX = s.x - Math.cos(Math.atan2(s.vy, s.vx)) * s.len * s.life
        const tailY = s.y - Math.sin(Math.atan2(s.vy, s.vx)) * s.len * s.life

        const grad = ctx.createLinearGradient(tailX, tailY, s.x, s.y)
        grad.addColorStop(0, `rgba(200, 225, 255, 0)`)
        grad.addColorStop(1, `rgba(220, 240, 255, ${s.life * 0.75})`)

        ctx.beginPath()
        ctx.moveTo(tailX, tailY)
        ctx.lineTo(s.x, s.y)
        ctx.strokeStyle = grad
        ctx.lineWidth   = 1.2
        ctx.stroke()

        s.x    += s.vx
        s.y    += s.vy
        s.life -= s.decay

        if (s.life <= 0 || s.x > w + 50 || s.y > h + 50) {
          shooters.splice(i, 1)
        }
      }

      animId = requestAnimationFrame(draw)
    }

    resize()
    window.addEventListener('resize', resize)
    draw()

    return () => {
      cancelAnimationFrame(animId)
      window.removeEventListener('resize', resize)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        inset:    0,
        width:    '100%',
        height:   '100%',
        pointerEvents: 'none',
        zIndex:   0,
      }}
    />
  )
}
