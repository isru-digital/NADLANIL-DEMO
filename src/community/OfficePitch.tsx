import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Building2, UserRound } from 'lucide-react'
import { PLATFORM_NAME } from '../config'
import { OFFICE_PAGE, UPGRADE_LABEL } from '../config/community'
import { OFFICE_FEE } from '../config/office'
import '../styles/office-pitch.css'

/**
 * The way from the community's page to the office (Itzik, 14.11.2026: this block has to pull people in, and sell
 * 0% to the office and 100% to the broker, with a little motion). When the block comes into view the commission
 * moves: it starts split in half, the way it is in many offices (his own figure: "לרוב 50%"), and slides until the
 * office has 0% and the broker 100%. The fee is on the block too, so nothing is hidden.
 */
const START = 50
const DURATION = 1700

export default function OfficePitch() {
  const box = useRef<HTMLElement>(null)
  const still = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  // the broker's share of the commission, in percent
  const [share, setShare] = useState(still ? 100 : START)
  const [done, setDone] = useState(still)

  useEffect(() => {
    if (still || !box.current) return
    let raf = 0
    let timer = 0
    const run = () => {
      const t0 = performance.now()
      const tick = (now: number) => {
        const t = Math.min(1, (now - t0) / DURATION)
        // slow start, quick middle, soft landing
        const eased = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
        setShare(Math.round(START + (100 - START) * eased))
        if (t < 1) raf = requestAnimationFrame(tick)
        else setDone(true)
      }
      raf = requestAnimationFrame(tick)
    }
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return
        io.disconnect()
        // a short beat on the half-and-half picture before it moves
        timer = window.setTimeout(run, 450)
      },
      { threshold: 0.45 },
    )
    io.observe(box.current)
    return () => {
      io.disconnect()
      cancelAnimationFrame(raf)
      window.clearTimeout(timer)
    }
  }, [still])

  return (
    <section ref={box} className={`kp${done ? ' is-done' : ''}`} data-share={share} aria-label={`המשרד ${PLATFORM_NAME}: 0% עמלה למשרד, 100% עמלה למתווך`}>
      <i className="kp-glow" aria-hidden />
      <i className="kp-grid" aria-hidden />

      <div className="kp-copy">
        <small>רוצים יותר מהקהילה?</small>
        <h2>
          במשרד <bdi dir="ltr">{PLATFORM_NAME}</bdi> <span>כל העמלה נשארת אצלכם</span>
        </h2>
        <p>משרד תיווך ארצי. דף נחיתה, פולדר דיגיטלי וכל הכלים המתקדמים כלולים.</p>
        <div className="kp-cta">
          <Link to={OFFICE_PAGE} className="kp-btn" data-act="office-pitch">
            <span>{UPGRADE_LABEL}</span>
            <ArrowLeft />
          </Link>
          <em>דמי חבר: {OFFICE_FEE}</em>
        </div>
      </div>

      {/* the numbers move for the eye; a screen reader gets the result in the block's label */}
      <div className="kp-split" aria-hidden>
        <div className="kp-nums">
          <div className="kp-num is-office">
            <i>
              <Building2 />
            </i>
            <b className="num">{100 - share}%</b>
            <span>עמלה למשרד</span>
          </div>
          <div className="kp-num is-broker">
            <i>
              <UserRound />
            </i>
            <b className="num">{share}%</b>
            <span>עמלה למתווך</span>
          </div>
        </div>
        <div className="kp-bar">
          <i style={{ width: `${share}%` }} />
          <u style={{ insetInlineEnd: `${share}%` }} />
        </div>
        <p className="kp-note">במשרדים רבים חלק מהעמלה, לרוב 50%, נשאר במשרד. כאן המשרד מקבל 0%.</p>
      </div>
    </section>
  )
}
