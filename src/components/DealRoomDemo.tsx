import { useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, animate, motion } from 'framer-motion'
import { ArrowLeft, Check, Link2, Lock, MapPin, RotateCcw, Sparkles, X } from 'lucide-react'
import { asset } from '../config'
import { brokers, formatPriceShort } from '../data/demo'
import { Avatar, EASE } from './ui'
import '../styles/deal-demo.css'

/**
 * "חדר עסקה משותף" (beta): a look-only demo in a pop-up. Scene 1 is the match, a buyer's request and a
 * property finding each other. A button moves to scene 2, the shared deal room that opens by itself:
 * the commission split agreed up front, the milestones and a private chat.
 * Nothing here is interactive beyond moving between the two scenes; it is a picture of where the product is going.
 */

const maya = brokers[0]
const yonatan = brokers[1]
const first = (name: string) => name.split(' ')[0]

// the sparks of the "match" burst: positions are worked out once
const sparks = Array.from({ length: 16 }, (_, i) => {
  const a = (i / 16) * Math.PI * 2 + (i % 2 ? 0.2 : 0)
  const d = 70 + (i % 4) * 22
  return { x: Math.round(Math.cos(a) * d), y: Math.round(Math.sin(a) * d), i }
})

/** Counts a number up inside its own text node, without re-rendering the page around it. */
function Count({ to, delay = 0.6, duration = 1.6 }: { to: number; delay?: number; duration?: number }) {
  const ref = useRef<HTMLSpanElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      el.textContent = String(to)
      return
    }
    el.textContent = '0'
    const c = animate(0, to, { delay, duration, ease: EASE, onUpdate: (v) => (el.textContent = String(Math.round(v))) })
    return () => c.stop()
  }, [to, delay, duration])
  return <span ref={ref}>{to}</span>
}

function MatchScene({ matched }: { matched: boolean }) {
  return (
    <div className={`dr-stage${matched ? ' is-matched' : ''}`}>
      <div className="dr-card dr-req">
        <span className="dr-kicker">בקשת חיפוש</span>
        <div className="dr-who">
          <Avatar src={maya.avatar} name="" size={40} ring />
          <div>
            <b>{maya.name}</b>
            <small>מתווכת, תל אביב</small>
          </div>
        </div>
        <h3>בית פרטי בהרצליה פיתוח, עד {formatPriceShort(15000000)}</h3>
        <ul className="dr-chips">
          <li>בריכה</li>
          <li>גינה</li>
          <li>חניה ל-3</li>
        </ul>
        <span className="dr-ok dr-ok-a">
          <Check /> {first(maya.name)} אישרה
        </span>
      </div>

      <div className="dr-core">
        <div className="dr-ring">
          <i className="dr-ring-glow" aria-hidden />
          <svg viewBox="0 0 120 120" aria-hidden>
            <circle className="dr-ring-bg" cx="60" cy="60" r="52" />
            <circle className="dr-ring-fg" cx="60" cy="60" r="52" />
          </svg>
          <div className="dr-pct">
            <strong className="num">
              <Count to={96} />
              <u>%</u>
            </strong>
            <span>התאמה</span>
          </div>
          <div className="dr-burst" aria-hidden>
            {sparks.map((s) => (
              <i key={s.i} style={{ '--x': `${s.x}px`, '--y': `${s.y}px`, '--n': s.i } as CSSProperties} />
            ))}
          </div>
        </div>
        <div className="dr-verdict" aria-live="polite">
          <span className="dr-checking">בודקים התאמה</span>
          <span className="dr-matched">
            <Link2 /> יש מאץ'!
          </span>
        </div>
        <small className="dr-demo-note">נתוני דמו</small>
      </div>

      <div className="dr-card dr-prop">
        <div className="dr-photo">
          <img src={asset('img/prop-02.webp')} alt="" />
          <b className="num">{formatPriceShort(14900000)}</b>
        </div>
        <span className="dr-kicker">נכס לשיתוף פעולה</span>
        <h3>וילה עם בריכה וגינה</h3>
        <p>
          <MapPin /> הרצליה פיתוח, 7 חדרים
        </p>
        <div className="dr-who">
          <Avatar src={yonatan.avatar} name="" size={36} ring />
          <div>
            <b>{yonatan.name}</b>
            <small>מתווך בתים פרטיים</small>
          </div>
        </div>
        <span className="dr-ok dr-ok-b">
          <Check /> {first(yonatan.name)} אישר
        </span>
      </div>
    </div>
  )
}

const steps = [
  { label: 'היכרות', state: 'done' },
  { label: 'ביקור, מחר ב-17:00', state: 'now' },
  { label: 'הצעה', state: 'next' },
  { label: 'חתימה', state: 'next' },
  { label: 'העמלה שולמה', state: 'next' },
] as const

const chat: { mine?: boolean; text: string }[] = [
  { text: 'היי מאיה, הלקוחה מוזמנת לביקור מחר ב-17:00?' },
  { mine: true, text: 'מעולה, אני מביאה אותה.' },
  { text: 'נהדר. החלוקה נשארת כמו שאישרנו.' },
]

function RoomScene() {
  return (
    <div className="dr-room">
      <div className="dr-panel">
        <div className="dr-room-head">
          <span className="dr-pair">
            <Avatar src={maya.avatar} name="" size={46} ring />
            <Avatar src={yonatan.avatar} name="" size={46} ring />
          </span>
          <div>
            <span className="dr-open">
              <i aria-hidden /> נפתח אוטומטית
            </span>
            <h3>חדר העסקה</h3>
            <p>וילה עם בריכה וגינה, הרצליה פיתוח</p>
          </div>
        </div>

        <div className="dr-split-box">
          <div className="dr-split-top">
            <span>חלוקת עמלה</span>
            <small>נקבעה מראש, בהסכמת שניהם</small>
          </div>
          <div className="dr-split" aria-label="חלוקת עמלה 75% ו-25%">
            <i className="dr-seg-a">
              <b className="num">75%</b>
            </i>
            <i className="dr-seg-b">
              <b className="num">25%</b>
            </i>
          </div>
          <div className="dr-approve">
            <span style={{ '--d': '1.5s' } as CSSProperties}>
              <Check /> {first(maya.name)} אישרה
            </span>
            <span style={{ '--d': '1.9s' } as CSSProperties}>
              <Check /> {first(yonatan.name)} אישר
            </span>
          </div>
        </div>

        <ol className="dr-steps-list">
          {steps.map((s, i) => (
            <li key={s.label} className={`is-${s.state}`} style={{ '--d': `${0.5 + i * 0.22}s` } as CSSProperties}>
              <i>{s.state === 'done' ? <Check /> : i + 1}</i>
              <span>{s.label}</span>
            </li>
          ))}
        </ol>
      </div>

      <div className="dr-chat">
        <div className="dr-chat-head">
          <Lock /> צ'אט פרטי בין שניכם
        </div>
        <div className="dr-bubbles">
          {chat.map((m, i) => (
            <motion.div
              key={m.text}
              className={`dr-bubble${m.mine ? ' is-mine' : ''}`}
              initial={{ opacity: 0, y: 14, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.5, ease: EASE, delay: 1.1 + i * 1.0 }}
            >
              <Avatar src={(m.mine ? maya : yonatan).avatar} name="" size={28} />
              <span className="dr-msg">{m.text}</span>
            </motion.div>
          ))}
          <motion.div
            className="dr-typing"
            aria-hidden
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 4.3, duration: 0.4 }}
          >
            <i />
            <i />
            <i />
          </motion.div>
        </div>
        <div className="dr-input" aria-disabled>
          הדמו לצפייה בלבד
        </div>
      </div>
    </div>
  )
}

export default function DealRoomDemo({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [scene, setScene] = useState<'match' | 'room'>('match')
  const [matched, setMatched] = useState(false)
  const [run, setRun] = useState(0)
  const panel = useRef<HTMLDivElement>(null)
  const reduced = useMemo(() => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches, [])

  useEffect(() => {
    if (open) {
      setScene('match')
      setRun((r) => r + 1)
    }
  }, [open])

  // the match plays by itself; the button to the deal room wakes up when it lands
  useEffect(() => {
    if (!open || scene !== 'match') return
    setMatched(false)
    const t = window.setTimeout(() => setMatched(true), reduced ? 50 : 3300)
    return () => window.clearTimeout(t)
  }, [open, scene, run, reduced])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    panel.current?.focus()
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [open, onClose])

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="dr-scrim"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          onMouseDown={(e) => e.target === e.currentTarget && onClose()}
        >
          <motion.div
            ref={panel}
            className="dr"
            role="dialog"
            aria-modal="true"
            aria-label="חדר עסקה משותף, דמו"
            tabIndex={-1}
            initial={{ opacity: 0, y: 40, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.98 }}
            transition={{ duration: 0.45, ease: EASE }}
          >
            <i className="dr-aura" aria-hidden />

            <header className="dr-head">
              <div className="dr-title">
                <h2>חדר עסקה משותף</h2>
                <span className="dr-badges">
                  <b>גרסת בטא</b>
                  <em>דמו לצפייה בלבד</em>
                </span>
              </div>
              <ol className="dr-pills" aria-label="שלבי הדמו">
                <li>
                  <button className={scene === 'match' ? 'is-on' : ''} onClick={() => (setScene('match'), setRun((r) => r + 1))}>
                    <i>1</i> המאץ'
                  </button>
                </li>
                <li>
                  <button className={scene === 'room' ? 'is-on' : ''} disabled={!matched && scene === 'match'} onClick={() => setScene('room')}>
                    <i>2</i> חדר העסקה
                  </button>
                </li>
              </ol>
              <button className="dr-x" onClick={onClose} aria-label="סגירה">
                <X />
              </button>
            </header>

            <div className="dr-body">
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={scene === 'match' ? `match-${run}` : 'room'}
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3, ease: EASE }}
                >
                  {scene === 'match' ? <MatchScene matched={matched} /> : <RoomScene />}
                </motion.div>
              </AnimatePresence>
            </div>

            <footer className="dr-foot">
              <p>
                <Sparkles /> שני מתווכים מאשרים התאמה, והחדר נפתח לבד.
              </p>
              <div className="dr-actions">
                {scene === 'match' ? (
                  <>
                    <button className="btn btn-sm dr-ghost" onClick={() => setRun((r) => r + 1)} aria-label="הפעלה חוזרת">
                      <RotateCcw />
                    </button>
                    <button className={`btn btn-gold btn-lg dr-go${matched ? ' is-ready' : ''}`} disabled={!matched} onClick={() => setScene('room')}>
                      {matched ? 'למעבר לחדר העסקה' : 'בודקים התאמה'}
                      <ArrowLeft />
                    </button>
                  </>
                ) : (
                  <>
                    <button className="btn btn-sm dr-ghost dr-ghost-text" onClick={() => (setScene('match'), setRun((r) => r + 1))}>
                      חזרה למאץ'
                    </button>
                    <button className="btn btn-gold btn-lg dr-go is-ready" onClick={onClose}>
                      סגירה
                    </button>
                  </>
                )}
              </div>
            </footer>

            <div className="dr-note">
              <Lock /> גרסת בטא. הדמו לצפייה בלבד, בלי כניסה ובלי נתונים אמיתיים.
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  )
}
