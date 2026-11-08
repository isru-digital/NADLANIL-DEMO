import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { Link2, Sparkles } from 'lucide-react'
import { asset } from '../config'
import { brokers, formatPriceShort } from '../data/demo'
import { Avatar } from './ui'
import '../styles/open-panels.css'

/**
 * Three photo panels side by side; one is open at a time (hover, tap or keyboard). The open panel
 * is wide and shows a title, a line of text and a small piece of the product; the others shrink to
 * thin strips with only their name. On a phone the strip turns into a vertical stack.
 *
 * Used on both home pages, so the two looks tell the same story.
 */

type Panel = {
  id: string
  label: string
  title: string
  text: string
  image: string
  position: string
  beta?: boolean
  mock: ReactNode
}

const panels: Panel[] = [
  {
    id: 'request',
    label: 'קהילה',
    title: 'פה כל הודעה שווה יותר.',
    text: 'ההודעה שלך נשמרת, מגיעה ישר למתווכים הרלוונטיים ועובדת בשבילך עד שיש התאמה.',
    image: 'img/prop-01.webp',
    position: '35% 50%',
    mock: (
      <div className="op-card">
        <span className="op-kicker">בקשת חיפוש שמורה</span>
        <strong>5 חדרים בתל אביב, עד {formatPriceShort(9500000)}</strong>
        <ul className="op-chips">
          <li>מחסן</li>
          <li>חניה בטאבו</li>
          <li>נוף לים</li>
        </ul>
        <div className="op-alert">
          <span className="op-spark">
            <Sparkles />
          </span>
          <div>
            <b>נמצאה התאמה</b>
            <small>פנטהאוז 5 חדרים עם נוף לים</small>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: 'match',
    label: 'שת"פ',
    title: 'מאץ\' ושת"פ בחדר אחד',
    text: 'שני מתווכים מאשרים התאמה, ונפתח להם חדר עם צ\'אט פרטי וחלוקת עמלה שנקבעה מראש.',
    image: 'img/skyline.webp',
    position: '55% 50%',
    beta: true,
    mock: (
      <div className="op-card">
        <div className="op-pair">
          <Avatar src={brokers[0].avatar} name="" size={44} ring />
          <span className="op-match">
            <Link2 />
            יש מאץ'
          </span>
          <Avatar src={brokers[2].avatar} name="" size={44} ring />
        </div>
        <ol className="op-steps">
          <li className="is-done">היכרות</li>
          <li className="is-done">ביקור</li>
          <li>הצעה</li>
          <li>חתימה</li>
        </ol>
        <div className="op-split">
          <span>
            חלוקת עמלה <b className="num">75% / 25%</b>
          </span>
          <small>נקבעה מראש, בהסכמת שניהם</small>
        </div>
      </div>
    ),
  },
  {
    id: 'wallet',
    label: '100%',
    title: '100% עמלה אצלך',
    text: 'אין עמלה למערכת. ארנק העמלות מראה כמה נכנס החודש וכמה עוד בצנרת.',
    image: 'img/win-01.webp',
    position: '30% 50%',
    beta: true,
    mock: (
      <div className="op-card">
        <span className="op-kicker">נטו בכיס החודש</span>
        <strong className="op-big num">₪48,200</strong>
        <div className="op-bars" aria-hidden>
          {[34, 52, 41, 68, 58, 86].map((h, i) => (
            <i key={i} style={{ height: `${h}%` }} />
          ))}
        </div>
        <small className="op-foot">בצנרת: ₪132,000 · נתוני דמו</small>
      </div>
    ),
  },
]

export default function OpenPanels() {
  const [open, setOpen] = useState(0)
  const rootRef = useRef<HTMLDivElement>(null)
  const touched = useRef(false)

  const choose = (i: number, byUser = true) => {
    if (byUser) touched.current = true
    setOpen(i)
  }

  // a gentle tour on wide screens until the visitor takes over; it only runs while the strip is on screen
  useEffect(() => {
    const el = rootRef.current
    if (!el) return
    const calm =
      window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
      window.matchMedia('(max-width: 980px), (hover: none) and (pointer: coarse)').matches
    if (calm) return
    let timer = 0
    const tick = () => {
      if (touched.current) return stop()
      setOpen((v) => (v + 1) % panels.length)
    }
    const start = () => {
      stop()
      timer = window.setInterval(tick, 5200)
    }
    const stop = () => window.clearInterval(timer)
    const io = new IntersectionObserver(([e]) => (e.isIntersecting && !touched.current ? start() : stop()), { threshold: 0.45 })
    io.observe(el)
    return () => {
      io.disconnect()
      stop()
    }
  }, [])

  return (
    <div className="op" ref={rootRef}>
      {panels.map((p, i) => {
        const isOpen = i === open
        return (
          <article
            key={p.id}
            className={`op-panel${isOpen ? ' is-open' : ''}`}
            onMouseEnter={() => choose(i)}
          >
            <div className="op-bg" aria-hidden>
              <img src={asset(p.image)} alt="" style={{ objectPosition: p.position }} loading="lazy" decoding="async" />
            </div>
            <i className="op-shade" aria-hidden />

            <span className="op-label" aria-hidden>
              <b className="num">{String(i + 1).padStart(2, '0')}</b>
              {p.label}
            </span>

            <button
              type="button"
              className="op-hit"
              aria-expanded={isOpen}
              aria-controls={`op-body-${p.id}`}
              onClick={() => choose(i)}
              onFocus={() => choose(i)}
            >
              <span className="sr-only">{p.title}</span>
            </button>

            <div className="op-body" id={`op-body-${p.id}`} aria-hidden={!isOpen}>
              {p.beta && <span className="op-beta">גרסת בטא</span>}
              <h3>{p.title}</h3>
              <p>{p.text}</p>
              <div className="op-mock">{p.mock}</div>
            </div>
          </article>
        )
      })}
    </div>
  )
}
