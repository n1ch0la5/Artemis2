import { useEffect, useRef } from 'react'

const COLORS = [
  '#F5C842', '#FF6B6B', '#4ECDC4', '#45B7D1',
  '#96E6A1', '#DDA0DD', '#FF8C42', '#5A9AE0',
  '#FFFCE0', '#FF4757',
]

function rand(min, max) { return Math.random() * (max - min) + min }

function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

class Particle {
  constructor(x, y, color) {
    this.x = x
    this.y = y
    this.rgb = hexToRgb(color)
    const angle = rand(0, Math.PI * 2)
    const speed = rand(3, 9)
    this.vx = Math.cos(angle) * speed
    this.vy = Math.sin(angle) * speed
    this.alpha = 1
    this.decay = rand(0.008, 0.016)
    this.size = rand(2, 3.5)
    this.gravity = 0.08
  }
  update(dt) {
    this.vy += this.gravity * dt
    this.x += this.vx * dt
    this.y += this.vy * dt
    this.vx *= Math.pow(0.98, dt)
    this.vy *= Math.pow(0.98, dt)
    this.alpha -= this.decay * dt
  }
  draw(ctx) {
    const [r, g, b] = this.rgb
    ctx.globalAlpha = Math.max(0, this.alpha)
    ctx.fillStyle = `rgb(${r},${g},${b})`
    ctx.shadowBlur = 6
    ctx.shadowColor = `rgba(${r},${g},${b},0.5)`
    ctx.beginPath()
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2)
    ctx.fill()
  }
}

export default function Fireworks({ duration = 12000 }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    let particles = []
    let animId
    const startTime = performance.now()
    let lastLaunch = 0
    let lastFrame = startTime

    function resize() {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize)

    function launchBurst() {
      const w = canvas.width
      const h = canvas.height
      const cx = rand(w * 0.15, w * 0.85)
      const cy = rand(h * 0.1, h * 0.4)
      const color1 = COLORS[Math.floor(Math.random() * COLORS.length)]
      const color2 = COLORS[Math.floor(Math.random() * COLORS.length)]
      const count = Math.floor(rand(50, 90))
      for (let i = 0; i < count; i++) {
        const color = Math.random() > 0.3 ? color1 : color2
        particles.push(new Particle(cx, cy, color))
      }
    }

    function frame(now) {
      const elapsed = now - startTime
      const dt = Math.min((now - lastFrame) / 16.67, 3) // normalize to ~60fps, cap at 3x
      lastFrame = now

      ctx.clearRect(0, 0, canvas.width, canvas.height)

      if (elapsed > duration + 5000 && particles.length === 0) return

      // Launch bursts directly — no rocket travel
      if (elapsed < duration && now - lastLaunch > rand(300, 700)) {
        const batch = Math.random() > 0.5 ? 2 : 1
        for (let i = 0; i < batch; i++) launchBurst()
        lastLaunch = now
      }

      particles = particles.filter(p => {
        p.update(dt)
        if (p.alpha <= 0) return false
        p.draw(ctx)
        return true
      })

      ctx.globalAlpha = 1
      ctx.shadowBlur = 0
      animId = requestAnimationFrame(frame)
    }

    animId = requestAnimationFrame(frame)

    return () => {
      cancelAnimationFrame(animId)
      window.removeEventListener('resize', resize)
    }
  }, [duration])

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        pointerEvents: 'none',
      }}
    />
  )
}
