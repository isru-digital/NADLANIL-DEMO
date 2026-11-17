import { useEffect, useRef, useState } from 'react'
import type { ReactElement } from 'react'
import { Check, Handshake } from 'lucide-react'
import { COMMUNITY_NAME } from '../config/community'
import { IconAsk, IconBrokers, IconBuyer, IconDeal, IconHome, IconRefer } from './KhIcons'
import '../styles/kehila-hub.css'

/**
 * "כל העסקאות שלך עוברות כאן": the community's mark in the middle, six worlds around it, and small lights that flow
 * from each world into the mark. Short sample messages pop up next to the worlds. Plain SVG and CSS: the lights are
 * moved by one requestAnimationFrame loop that runs only while the section is on screen, and a visitor who asked for
 * less motion gets a still picture.
 */
type Icon = (p: { className?: string }) => ReactElement
type Node = { label: string; icon: Icon; notes: string[] }

/** clockwise from the top. The notes are samples: no person, no office, no real deal. */
const NODES: Node[] = [
  { label: 'נכסים', icon: IconHome, notes: ['נכס חדש שותף בחיפה', 'דירת 4 חדרים עלתה בנתניה', 'בית פרטי שותף בעפולה'] },
  { label: 'קונים', icon: IconBuyer, notes: ['נמצא קונה ל-4 חדרים', 'קונה חדש מחפש בבאר שבע', 'זוג צעיר מחפש בחדרה'] },
  { label: 'שיתופי פעולה', icon: IconDeal, notes: ['נסגרה עסקה ברמת גן', 'שיתוף פעולה חדש באשדוד', 'נסגרה עסקה בפתח תקווה'] },
  { label: 'מתווך בעיר אחרת', icon: IconRefer, notes: ['הפניה התקבלה', 'הפניה חדשה מנתניה', 'הפניה לירושלים'] },
  { label: 'מתווכים', icon: IconBrokers, notes: ['מתווך חדש הצטרף מאשדוד', 'מתווכת מחדרה הצטרפה', 'שלושה מתווכים הצטרפו היום'] },
  { label: 'ידע ושאלות', icon: IconAsk, notes: ['שאלה חדשה על מס שבח', 'טיפ חדש על הסכם שיתוף', 'נוספה תשובה לשאלה שלך'] },
]

/* ------------------------------------------------------------------ geometry, in a 600 by 600 box */
const C = 300
const R = 228 // 38% of the box: the same ratio the nodes use in CSS
const angleOf = (i: number) => ((-90 + i * 60) * Math.PI) / 180
type Pt = { x: number; y: number }
/** each world's path into the mark: a clear, soft curve, all bent the same way, so the flow reads as one living swirl */
const CURVES = NODES.map((_, i) => {
  const a = angleOf(i)
  const p0 = { x: C + R * Math.cos(a), y: C + R * Math.sin(a) }
  const p2 = { x: C + 34 * Math.cos(a), y: C + 34 * Math.sin(a) }
  const mx = (p0.x + p2.x) / 2
  const my = (p0.y + p2.y) / 2
  const dx = p2.x - p0.x
  const dy = p2.y - p0.y
  const k = 0.44
  const p1 = { x: mx - dy * k, y: my + dx * k }
  return { p0, p1, p2, d: `M${p0.x.toFixed(1)} ${p0.y.toFixed(1)}Q${p1.x.toFixed(1)} ${p1.y.toFixed(1)} ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}` }
})
const at = (i: number, t: number): Pt => {
  const { p0, p1, p2 } = CURVES[i]
  const u = 1 - t
  return { x: u * u * p0.x + 2 * u * t * p1.x + t * t * p2.x, y: u * u * p0.y + 2 * u * t * p1.y + t * t * p2.y }
}

/** the top three worlds show their note above the circle on a phone, the bottom three below it */
const bandOf = (n: number) => (n === 0 || n === 1 || n === 5 ? 'top' : 'bottom')

type Pill = { id: number; n: number; text: string; out?: boolean }
const rand = (a: number, b: number) => a + Math.random() * (b - a)

export default function KhHub() {
  const root = useRef<HTMLElement>(null)
  const dotsLayer = useRef<SVGGElement>(null)
  const core = useRef<HTMLDivElement>(null)
  const [still] = useState(() => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)
  const [awake, setAwake] = useState(false)
  const [pills, setPills] = useState<Pill[]>([])

  useEffect(() => {
    const el = root.current
    const layer = dotsLayer.current
    if (!el || !layer) return
    const svgNs = 'http://www.w3.org/2000/svg'
    type Dot = { g: SVGGElement; n: number; t0: number; dur: number }
    let dots: Dot[] = []
    const pool: SVGGElement[] = []
    let raf = 0
    let running = false
    let nextAt: number[] = []
    let nextPill = 0
    let lastPulse = 0
    let pillId = 0
    let born = 0
    const noteTurn = NODES.map(() => 0)
    const timers = new Set<number>()
    const later = (fn: () => void, ms: number) => {
      const t = window.setTimeout(() => {
        timers.delete(t)
        fn()
      }, ms)
      timers.add(t)
    }

    const makeDot = () => {
      const g = pool.pop() ?? (document.createElementNS(svgNs, 'g') as SVGGElement)
      if (!g.firstChild) {
        const glow = document.createElementNS(svgNs, 'circle')
        glow.setAttribute('r', '9')
        glow.setAttribute('class', 'khh-dot-glow')
        const dot = document.createElementNS(svgNs, 'circle')
        dot.setAttribute('r', '3.4')
        dot.setAttribute('class', 'khh-dot')
        g.append(glow, dot)
      }
      layer.appendChild(g)
      return g
    }

    const pulse = (now: number) => {
      if (now - lastPulse < 160 || !core.current) return
      lastPulse = now
      core.current.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.065)' }, { transform: 'scale(1)' }], { duration: 460, easing: 'cubic-bezier(.2,.8,.3,1)' })
      el.querySelector('.khh-halo')?.animate([{ opacity: 0.75 }, { opacity: 1 }, { opacity: 0.75 }], { duration: 520, easing: 'ease-out' })
    }

    // the notes on screen: kept here, handed to React as a copy. One per band at a time, so two never meet.
    let live: Pill[] = []
    const publish = () => setPills([...live])
    const spawnPill = () => {
      const used = new Set(live.map((p) => bandOf(p.n)))
      const free = NODES.map((_, i) => i).filter((i) => !used.has(bandOf(i)))
      if (!free.length) return
      const n = free[Math.floor(Math.random() * free.length)]
      const text = NODES[n].notes[noteTurn[n]++ % NODES[n].notes.length]
      const id = ++pillId
      live = [...live, { id, n, text }]
      publish()
      later(() => {
        live = live.map((p) => (p.id === id ? { ...p, out: true } : p))
        publish()
      }, 2700)
      later(() => {
        live = live.filter((p) => p.id !== id)
        publish()
      }, 3000)
    }

    const frame = (now: number) => {
      // new lights: every world on its own uneven beat, now and then two close together
      for (let n = 0; n < NODES.length; n++) {
        if (now < nextAt[n]) continue
        const g = makeDot()
        g.setAttribute('class', ++born % 3 === 0 ? 'is-gold' : '')
        dots.push({ g, n, t0: now, dur: rand(1500, 2300) })
        nextAt[n] = now + (Math.random() < 0.18 ? rand(170, 380) : rand(900, 2900))
      }
      if (now >= nextPill) {
        spawnPill()
        nextPill = now + rand(1300, 2400)
      }
      // move the lights: they speed up as they near the mark, and fade into it
      dots = dots.filter((d) => {
        const t = (now - d.t0) / d.dur
        if (t >= 1) {
          d.g.remove()
          pool.push(d.g)
          pulse(now)
          return false
        }
        const e = t * t * (1.6 - 0.6 * t)
        const p = at(d.n, Math.min(1, e))
        const op = t < 0.12 ? t / 0.12 : t > 0.86 ? (1 - t) / 0.14 : 1
        d.g.setAttribute('transform', `translate(${p.x.toFixed(1)} ${p.y.toFixed(1)})`)
        d.g.setAttribute('opacity', op.toFixed(2))
        return true
      })
      raf = requestAnimationFrame(frame)
    }

    const start = () => {
      if (running) return
      running = true
      const now = performance.now()
      nextAt = NODES.map((_, i) => now + 300 + i * 180 + rand(0, 900))
      nextPill = now + 900
      raf = requestAnimationFrame(frame)
    }
    const stop = () => {
      if (!running) return
      running = false
      cancelAnimationFrame(raf)
      dots.forEach((d) => d.g.remove())
      dots = []
      timers.forEach((t) => clearTimeout(t))
      timers.clear()
      live = []
      publish()
    }

    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setAwake(true)
          if (!still) start()
        } else stop()
      },
      { threshold: 0.2 },
    )
    io.observe(el)
    return () => {
      io.disconnect()
      stop()
      timers.forEach((t) => clearTimeout(t))
    }
  }, [still])

  // the still picture: a few lights on their way, and two notes that stay
  const shown: Pill[] = still
    ? [
        { id: -1, n: 0, text: NODES[0].notes[0] },
        { id: -2, n: 2, text: NODES[2].notes[0] },
      ]
    : pills

  return (
    <section ref={root} className={`khh${awake ? ' is-awake' : ''}${still ? ' is-still' : ''}`} aria-labelledby="khh-title" data-hub>
      <div className="jo-in khh-in">
        <header className="khh-head">
          <span className="khh-kicker">הכול במקום אחד</span>
          <h2 id="khh-title">כל העסקאות שלך עוברות כאן</h2>
          <p>נכסים, קונים, שיתופי פעולה והפניות מכל הארץ נפגשים ב{COMMUNITY_NAME}.</p>
        </header>

        <div className="khh-stage">
          <div className="khh-ring" role="img" aria-label={`${NODES.map((n) => n.label).join(', ')}: הכול מתחבר אל ${COMMUNITY_NAME}`}>
            <svg className="khh-svg" viewBox="0 0 600 600" aria-hidden="true" focusable="false">
              <defs>
                <radialGradient id="khh-glow" cx="50%" cy="50%" r="50%">
                  <stop offset="0" stopColor="#5eead4" stopOpacity="0.55" />
                  <stop offset="0.45" stopColor="#34d399" stopOpacity="0.18" />
                  <stop offset="1" stopColor="#34d399" stopOpacity="0" />
                </radialGradient>
                {/* each line: mint where it leaves its world, gold as it reaches the mark */}
                {CURVES.map((c, i) => (
                  <linearGradient key={i} id={`khh-line-${i}`} gradientUnits="userSpaceOnUse" x1={c.p0.x} y1={c.p0.y} x2={c.p2.x} y2={c.p2.y}>
                    <stop offset="0" stopColor="#2fcf93" stopOpacity="0.75" />
                    <stop offset="0.55" stopColor="#5fd9a8" stopOpacity="0.6" />
                    <stop offset="1" stopColor="#e0a43a" stopOpacity="0.75" />
                  </linearGradient>
                ))}
              </defs>
              <circle className="khh-halo" cx={C} cy={C} r="170" fill="url(#khh-glow)" />
              <circle className="khh-orbit" cx={C} cy={C} r={R} />
              <circle className="khh-orbit is-inner" cx={C} cy={C} r="140" />
              {CURVES.map((c, i) => (
                <g key={i}>
                  <path className="khh-line is-glow" d={c.d} stroke={`url(#khh-line-${i})`} />
                  <path className="khh-line" d={c.d} stroke={`url(#khh-line-${i})`} />
                </g>
              ))}
              <circle className="khh-dash" cx={C} cy={C} r="96" />
              <g ref={dotsLayer} className="khh-dots">
                {still &&
                  CURVES.flatMap((_, i) =>
                    [0.38, 0.72].map((t) => {
                      const p = at(i, t + (i % 2) * 0.08)
                      return (
                        <g key={`${i}-${t}`} className={t > 0.5 && i % 2 ? 'is-gold' : undefined} transform={`translate(${p.x.toFixed(1)} ${p.y.toFixed(1)})`}>
                          <circle r="9" className="khh-dot-glow" />
                          <circle r="3.4" className="khh-dot" />
                        </g>
                      )
                    }),
                  )}
              </g>
            </svg>

            <div className="khh-core" ref={core}>
              <span className="khh-core-mark cb-mark">
                <Handshake />
              </span>
            </div>

            {NODES.map((n, i) => (
              <div key={n.label} className={`khh-node is-${i}${shown.some((p) => p.n === i && !p.out) ? ' is-live' : ''}`} style={{ ['--i' as string]: i, left: `${(50 + 38 * Math.cos(angleOf(i))).toFixed(2)}%`, top: `${(50 + 38 * Math.sin(angleOf(i))).toFixed(2)}%` }} data-node={i}>
                <span className="khh-node-disc">
                  <n.icon />
                </span>
                <span className="khh-node-label">{n.label}</span>
              </div>
            ))}

            <div className="khh-pills" aria-hidden="true">
              {shown.map((p) => (
                <span key={p.id} className={`khh-pill is-${p.n} is-${bandOf(p.n)}${p.out ? ' is-out' : ''}`} data-pill={p.n}>
                  <i>
                    <Check />
                  </i>
                  {p.text}
                </span>
              ))}
            </div>
          </div>
        </div>
        <small className="khh-note">ההודעות שבתמונה הן דוגמה</small>
      </div>
    </section>
  )
}
