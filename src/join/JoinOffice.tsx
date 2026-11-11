import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { animate, motion } from 'framer-motion'
import { ArrowLeft, BadgeCheck, Building2, Calculator, Check, Gem, LoaderCircle, Lock, Plus, ShieldCheck, Sparkles, Users, Wallet, X } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { PLATFORM_NAME } from '../config'
import { BackButton, DemoTag, EASE, Logo, Modal, Reveal } from '../components/ui'
import { useAgent } from '../agent/useAgent'
import { useMember } from '../config/member'
import { COMMIT_TBD, OFFICE_FEE, OFFICE_MIN_MONTHS, OFFICE_NAME, OFFICE_PRICE, OFFICE_YEAR, shekel } from '../config/office'
import '../styles/join-green.css'

/** A number that glides to its new value, so the calculator feels alive. */
function useGlide(value: number) {
  const [shown, setShown] = useState(value)
  const from = useRef(value)
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setShown(value)
      from.current = value
      return
    }
    const c = animate(from.current, value, { duration: 0.5, ease: EASE, onUpdate: (v) => setShown(v), onComplete: () => (from.current = value) })
    return () => c.stop()
  }, [value])
  return shown
}

const gains: { icon: LucideIcon; title: string; text: string }[] = [
  { icon: BadgeCheck, title: 'דף אישי שמופיע בגוגל', text: 'הסוכן שלנו: דף מרשים בשם שלך, שנבנה כדי שיחפשו אותך ויגיעו אליך.' },
  { icon: Building2, title: 'שם ומותג של משרד ארצי', text: 'מציגים את עצמכם כחלק ממשרד תיווך בפריסה ארצית.' },
  { icon: ShieldCheck, title: 'צוות מאחורי הקלעים', text: 'אנשי מקצוע מהתחום שמלווים, מנהלים ומפקחים.' },
  { icon: Wallet, title: '0% עמלה למשרד', text: 'המשרד לא לוקח אחוז מהעסקה. 100% מהעמלה נשארת אצלכם.' },
  { icon: Gem, title: 'כלים חדשים לפני כולם', text: 'חדר עסקה משותף, בקשה בוערת, ארנק עמלות ועוד, בעדיפות.' },
  { icon: Users, title: 'קהילה ארצית ושת"פים', text: 'מתווכים מכל הארץ, במקום אחד, וכל העבודה ביחד.' },
]

const rows: { what: string; community: boolean; office: boolean }[] = [
  { what: 'קהילת מתווכים ארצית ופיד שת"פים', community: true, office: true },
  { what: 'CRM למתווך ופולדר דיגיטלי', community: true, office: true },
  { what: 'דף נחיתה אישי לפי תבנית', community: true, office: true },
  { what: 'שמאים ועורכי דין דרך המערכת', community: true, office: true },
  { what: 'הסוכן שלנו: דף אישי מרשים שמופיע בגוגל', community: false, office: true },
  { what: 'שם ומותג של משרד תיווך ארצי', community: false, office: true },
  { what: 'ליווי וניהול מקצועי של צוות המשרד', community: false, office: true },
  { what: 'עדיפות לכלי הבטא החדשים', community: false, office: true },
]

const faq = [
  { q: 'כמה זה עולה?', a: `${OFFICE_FEE}, מחיר קבוע. המשרד לא לוקח אחוז מהעמלה, ו-100% נשארים אצלכם.` },
  { q: 'האם לוקחים אחוז מהעמלה?', a: 'לא. 0% עמלה למשרד, והעמלה כולה נשארת אצלכם.' },
  { q: 'מתי אפשר להתחיל?', a: 'מיד אחרי ההצטרפות נפתח האזור "הסוכן שלנו", שהוא חלק מהמשרד. עונים על 15 שאלות קלילות, ואנחנו בונים את הדף.' },
  { q: 'אפשר להתחיל בקהילה ולעבור למשרד אחר כך?', a: 'כן. מצטרפים לקהילה בחינם, ועוברים למשרד בכל שלב.' },
  { q: 'צריך רישיון מתווך?', a: 'כן. מעלים אותו בשאלון, והצוות בודק אותו.' },
]

const same = ['שם ומותג של משרד תיווך ארצי', 'צוות מקצועי מאחורי הקלעים', 'קהילת מתווכים ושת"פים בכל הארץ', 'CRM ופולדר דיגיטלי']
const more = ['הסוכן שלנו: דף אישי שמופיע בגוגל', 'כלי בטא לפני כולם', '0% עמלה למשרד, 100% למתווך', 'הטבות חברים אצל שמאים ועורכי דין']

/** Money paid over the years: the office that takes a share climbs steeply, the fixed fee climbs slowly; the space between is what stays. */
function MarathonChart({ perYearToday, perYearOurs, years }: { perYearToday: number; perYearOurs: number; years: number }) {
  const W = 640
  const H = 290
  const padX = 34
  const padTop = 40
  const padBottom = 38
  const maxY = Math.max(perYearToday * years, perYearOurs * years, 1)
  // time runs from right to left, the way Hebrew reads
  const x = (i: number) => W - padX - (i / years) * (W - 2 * padX)
  const y = (v: number) => H - padBottom - (v / maxY) * (H - padTop - padBottom)
  const pts = (per: number) => Array.from({ length: years + 1 }, (_, i) => [x(i), y(per * i)] as const)
  const line = (a: (readonly [number, number])[]) => a.map(([px, py], i) => `${i ? 'L' : 'M'}${px.toFixed(1)} ${py.toFixed(1)}`).join(' ')
  const red = pts(perYearToday)
  const green = pts(perYearOurs)
  const area = `${line(red)} ${[...green]
    .reverse()
    .map(([px, py]) => `L${px.toFixed(1)} ${py.toFixed(1)}`)
    .join(' ')} Z`
  const endRed = red[red.length - 1]
  const endGreen = green[green.length - 1]
  const ticks = years <= 6 ? 1 : 2
  return (
    <svg className="jo-chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`הוצאה מצטברת ל-${years} שנים: במשרד שלכם ${shekel(perYearToday * years)}, אצלנו ${shekel(perYearOurs * years)}`} key={`${years}-${Math.round(perYearToday)}`}>
      {[0, 0.25, 0.5, 0.75, 1].map((t) => (
        <line key={t} className="jo-grid-line" x1={padX} x2={W - padX} y1={y(maxY * t)} y2={y(maxY * t)} />
      ))}
      <path className="jo-area" d={area} />
      <path className="jo-line is-red" d={line(red)} pathLength={1} />
      <path className="jo-line is-green" d={line(green)} pathLength={1} />
      <circle className="jo-dot is-red" cx={endRed[0]} cy={endRed[1]} r={6} />
      <circle className="jo-dot is-green" cx={endGreen[0]} cy={endGreen[1]} r={6} />
      <text className="jo-end is-red" x={endRed[0] + 10} y={endRed[1] - 10} textAnchor="start">
        {shekel(perYearToday * years)}
      </text>
      <text className="jo-end is-green" x={endGreen[0] + 10} y={endGreen[1] + 38} textAnchor="start">
        {shekel(perYearOurs * years)}
      </text>
      {Array.from({ length: years + 1 }, (_, i) => i)
        .filter((i) => i % ticks === 0 || i === years)
        .map((i) => (
          <text key={i} className="jo-tick" x={x(i)} y={H - 12} textAnchor="middle">
            {i === 0 ? 'היום' : `שנה ${i}`}
          </text>
        ))}
    </svg>
  )
}

export default function JoinOffice() {
  const navigate = useNavigate()
  const { stage, patch } = useAgent()
  const { isOffice, setMember } = useMember()
  const joined = isOffice

  // the calculator: what the broker paid the office, what the same deals would cost here, and the difference; then the long run
  const [deals, setDeals] = useState(6)
  const [fee, setFee] = useState(30000)
  const [pct, setPct] = useState(20)
  const [fixed, setFixed] = useState(0)
  const [months, setMonths] = useState(12)
  const [years, setYears] = useState(5)
  const yearToday = deals * fee * (pct / 100) + fixed * 12
  const today = (yearToday * months) / 12
  const ours = OFFICE_PRICE * months
  const diff = today - ours
  const yearGap = yearToday - OFFICE_YEAR
  const covers = Math.floor(fee / OFFICE_PRICE)
  const period = months === 12 ? 'בשנה האחרונה' : `ב-${months} חודשים`
  const perDealToday = deals ? yearToday / deals : 0
  const perDealOurs = deals ? OFFICE_YEAR / deals : 0
  const top = Math.max(today, ours, 1)
  const gToday = useGlide(today)
  const gOurs = useGlide(ours)
  const gDiff = useGlide(Math.abs(diff))
  const gStay = useGlide(Math.max(yearGap, 0) * years)

  // joining (a simulation: nothing is charged and no card details are asked for)
  const [pay, setPay] = useState<'closed' | 'open' | 'busy' | 'done'>('closed')
  const [agree, setAgree] = useState(false)
  const [open, setOpen] = useState(0)
  useEffect(() => {
    if (pay !== 'busy') return
    const t = window.setTimeout(() => setPay('done'), 1600)
    return () => window.clearTimeout(t)
  }, [pay])
  const begin = () => {
    setMember('office')
    if (stage === 'locked') patch({ stage: 'onboarding', step: 0, paidAt: new Date().toISOString() })
    navigate('/app/agent')
  }
  const cta = () => (joined ? navigate('/app/agent') : (setAgree(false), setPay('open')))

  return (
    <div className="jo">
      <header className="jc-top">
        <div className="jc-top-start">
          <BackButton fallback="/join" className="is-icon" />
          <Link to="/" aria-label="דף הבית">
            <Logo size={30} withName />
          </Link>
        </div>
        <div className="jc-top-end">
          <Link to="/join/community" className="jo-free">
            הצטרפות לקהילה, בחינם
          </Link>
          <DemoTag />
        </div>
      </header>

      {/* ------------------------------------------------------------ hero */}
      <section className="jo-hero">
        <i className="jo-grid" aria-hidden />
        <div className="jo-in jo-hero-in">
          <motion.span className="jo-kicker" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: EASE }}>
            {OFFICE_NAME}
          </motion.span>
          <motion.h1 initial={{ opacity: 0, y: 22 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.1, ease: EASE }}>
            משרד תיווך ארצי.
            <br />
            <span>0% עמלה למשרד.</span>
          </motion.h1>
          <motion.p className="jo-sub" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.2, ease: EASE }}>
            100% מהעמלה נשארת אצלכם. המשרד נותן את השם, את הכלים ואת הצוות.
          </motion.p>
          <motion.div className="jo-price" initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.8, delay: 0.3, ease: EASE }}>
            <b className="num">0%</b>
            <span>
              <strong>עמלה למשרד</strong>
              <small>דמי חבר: {OFFICE_FEE}</small>
            </span>
          </motion.div>
          <motion.div className="jo-actions" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.4, ease: EASE }}>
            <button className="btn btn-white btn-lg" onClick={cta}>
              {joined ? 'לאזור הסוכן שלנו' : 'להצטרפות למשרד'}
              <ArrowLeft />
            </button>
            <a href="#calc" className="btn btn-outline-white btn-lg">
              <Calculator /> לחשב כמה זה משתלם
            </a>
          </motion.div>
          <ul className="jo-chips">
            <li>
              <Check /> 100% מהעמלה למתווך
            </li>
            <li>
              <Check /> דף אישי בגוגל
            </li>
            <li>
              <Check /> מותג משרד ארצי
            </li>
          </ul>
        </div>
      </section>

      {/* ------------------------------------------------------------ the calculator */}
      <section className="jo-section" id="calc">
        <div className="jo-in">
          <Reveal className="jo-head">
            <span className="jo-tag">בואו נחשב</span>
            <h2>כמה כסף יצא לכם בשנה האחרונה?</h2>
            <p>קודם כמה שילמתם למשרד שלכם, ואחר כך כמה זה היה עולה עם אותן עסקאות ואותם סכומים אצלנו.</p>
          </Reveal>

          <div className="jo-calcs">
            <Reveal className="jo-ccard jo-today">
              <span className="jo-step">1</span>
              <h3>במשרד שלכם היום</h3>
              <div className="jo-inputs">
                <label>
                  <span>
                    כמה עסקאות סגרתם בשנה? <b className="num">{deals}</b>
                  </span>
                  <input data-k="deals" type="range" min={1} max={30} value={deals} onChange={(e) => setDeals(Number(e.target.value))} />
                </label>
                <label>
                  <span>
                    עמלה ממוצעת לעסקה <b className="num">{shekel(fee)}</b>
                  </span>
                  <input data-k="fee" type="range" min={5000} max={100000} step={1000} value={fee} onChange={(e) => setFee(Number(e.target.value))} />
                </label>
                <label>
                  <span>
                    כמה אחוזים מהעמלה לוקחים מכם? <b className="num">{pct}%</b>
                  </span>
                  <input data-k="pct" type="range" min={0} max={50} value={pct} onChange={(e) => setPct(Number(e.target.value))} />
                  <small>אם אתם עצמאים, בחרו 0.</small>
                </label>
                <label>
                  <span>
                    תשלום קבוע למשרד בחודש, אם יש <b className="num">{shekel(fixed)}</b>
                  </span>
                  <input data-k="fixed" type="range" min={0} max={5000} step={100} value={fixed} onChange={(e) => setFixed(Number(e.target.value))} />
                </label>
              </div>
              <div className="jo-total">
                <small>שילמתם למשרד {period}</small>
                <b className="num jo-big">{shekel(gToday)}</b>
                <em>{fixed > 0 ? 'עמלות ותשלום קבוע' : 'עמלות שנלקחו מכם'}</em>
              </div>
            </Reveal>

            <Reveal delay={0.1} className="jo-ccard jo-ours">
              <span className="jo-step">2</span>
              <h3>דרך {PLATFORM_NAME}</h3>
              <div className="jo-inputs">
                <label>
                  <span>
                    כמה חודשים? <b className="num">{months}</b>
                  </span>
                  <input data-k="months" type="range" min={OFFICE_MIN_MONTHS} max={12} value={months} onChange={(e) => setMonths(Number(e.target.value))} />
                  <small>מינימום {OFFICE_MIN_MONTHS} חודשים.</small>
                </label>
              </div>
              <ul className="jo-facts">
                <li>
                  <Check />
                  <span>{OFFICE_PRICE} ₪ לחודש, מחיר קבוע</span>
                </li>
                <li>
                  <Check />
                  <span>0% מהעמלה, היא כולה אצלכם</span>
                </li>
                {deals > 0 && (
                  <li>
                    <Check />
                    <span>
                      עלות לעסקה: <b className="num">{shekel(perDealOurs)}</b> במקום <b className="num">{shekel(perDealToday)}</b>
                    </span>
                  </li>
                )}
              </ul>
              <div className="jo-total">
                <small>אותן עסקאות, אצלנו זה היה עולה {months === 12 ? 'בשנה' : `ב-${months} חודשים`}</small>
                <b className="num jo-big">{shekel(gOurs)}</b>
                <em>
                  {OFFICE_PRICE} × {months}
                </em>
              </div>
            </Reveal>
          </div>

          <Reveal className={`jo-diff${diff > 0 ? ' is-save' : ''}`}>
            <span className="jo-step">3</span>
            <h3>ההבדל</h3>
            <p className="jo-same-deals">
              אותן <b className="num">{deals}</b> עסקאות, אותה עמלה ממוצעת של <b className="num">{shekel(fee)}</b>.
            </p>
            <div className="jo-bars" aria-hidden>
              <div className="is-red">
                <small>שילמתם למשרד</small>
                <i>
                  <u style={{ width: `${(today / top) * 100}%` }} />
                </i>
                <b className="num">{shekel(today)}</b>
              </div>
              <div className="is-us">
                <small>הייתם משלמים ב-{PLATFORM_NAME}</small>
                <i>
                  <u style={{ width: `${(ours / top) * 100}%` }} />
                </i>
                <b className="num">{shekel(ours)}</b>
              </div>
            </div>
            {diff > 0 ? (
              <div className="jo-verdict">
                <Sparkles />
                <div>
                  <small>הכסף הגדול היה נשאר אצלכם {months === 12 ? 'בשנה האחרונה' : `ב-${months} חודשים`}</small>
                  <b className="num">{shekel(gDiff)}</b>
                </div>
              </div>
            ) : (
              <div className="jo-verdict is-plain">
                <div>
                  <small>המנוי עולה {shekel(ours)}</small>
                  <b>ומה שמקבלים בתמורה: מותג משרד, דף בגוגל וצוות מאחורי הקלעים</b>
                </div>
              </div>
            )}
            <p className="jo-cover">
              עסקה אחת בעמלה של <b className="num">{shekel(fee)}</b> מכסה <b className="num">{covers}</b> חודשי מנוי.
            </p>

            <div className="jo-same">
              <h4>אצלנו מקבלים את אותם דברים, ואפילו יותר</h4>
              <div className="jo-same-cols">
                <div>
                  <b>אותו דבר שמשרד נותן</b>
                  <ul>
                    {same.map((t) => (
                      <li key={t}>
                        <Check /> {t}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="is-more">
                  <b>ועוד, רק אצלנו</b>
                  <ul>
                    {more.map((t) => (
                      <li key={t}>
                        <Plus /> {t}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
            <small className="jo-note">חישוב לפי המספרים שהזנתם. כל משרד עובד אחרת, כדאי לבדוק מה משלמים היום.</small>
          </Reveal>

          <Reveal className="jo-marathon">
            <span className="jo-kicker-red">מרתון, לא ריצה קצרה</span>
            <h3>איתנו זה מרתון, לא ריצה קצרה</h3>
            <p className="jo-marathon-sub">במשרד שלוקח אחוזים, כל שנה עולה לכם שוב אותו סכום. אצלנו המחיר קבוע, והפער רק גדל משנה לשנה.</p>
            <label className="jo-years">
              <span>
                כמה שנים קדימה? <b className="num">{years}</b>
              </span>
              <input data-k="years" type="range" min={1} max={10} value={years} onChange={(e) => setYears(Number(e.target.value))} />
            </label>
            {yearGap > 0 ? (
              <>
                <MarathonChart perYearToday={yearToday} perYearOurs={OFFICE_YEAR} years={years} />
                <div className="jo-run">
                  <div className="is-red">
                    <small>במשרד שלכם, אחרי {years} {years === 1 ? 'שנה' : 'שנים'}</small>
                    <b className="num">{shekel(yearToday * years)}</b>
                  </div>
                  <div className="is-green">
                    <small>אצלנו, אחרי {years} {years === 1 ? 'שנה' : 'שנים'}</small>
                    <b className="num">{shekel(OFFICE_YEAR * years)}</b>
                  </div>
                  <div className="is-stay">
                    <small>נשארים אצלכם</small>
                    <b className="num jo-stay">{shekel(gStay)}</b>
                  </div>
                </div>
              </>
            ) : (
              <p className="jo-run-plain">
                אם אתם לא משלמים היום למשרד, המנוי הוא השקעה לטווח ארוך: דף בגוגל, מותג משרד וצוות שעובד בשבילכם. עסקה אחת נוספת בשנה מכסה את המנוי כמה פעמים.
              </p>
            )}
            <small className="jo-note">בהנחה שאותו מספר עסקאות ואותה עמלה בכל שנה.</small>
          </Reveal>
        </div>
      </section>

      {/* ------------------------------------------------------------ what you get */}
      <section className="jo-section is-tint">
        <div className="jo-in">
          <Reveal className="jo-head">
            <span className="jo-tag">מה מקבלים</span>
            <h2>הרבה יותר ממשרד</h2>
          </Reveal>
          <div className="jo-gains">
            {gains.map((g, i) => (
              <Reveal key={g.title} delay={i * 0.06} className="jo-gain">
                <span>
                  <g.icon />
                </span>
                <h3>{g.title}</h3>
                <p>{g.text}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------ the two ways side by side */}
      <section className="jo-section">
        <div className="jo-in">
          <Reveal className="jo-head">
            <span className="jo-tag">קהילה מול משרד</span>
            <h2>מה בכל מסלול</h2>
          </Reveal>
          <Reveal className="jo-table" delay={0.05}>
            <div className="jo-row is-head">
              <span />
              <b>הקהילה</b>
              <b className="is-office">{OFFICE_NAME}</b>
            </div>
            <div className="jo-row is-price">
              <span>מחיר</span>
              <b>חינם</b>
              <b className="is-office num">{OFFICE_FEE}</b>
            </div>
            {rows.map((r) => (
              <div key={r.what} className="jo-row">
                <span>{r.what}</span>
                <i className={r.community ? 'is-yes' : 'is-no'}>{r.community ? <Check aria-label="כלול" /> : <X aria-label="לא כלול" />}</i>
                <i className={`is-office ${r.office ? 'is-yes' : 'is-no'}`}>{r.office ? <Check aria-label="כלול" /> : <X aria-label="לא כלול" />}</i>
              </div>
            ))}
          </Reveal>
        </div>
      </section>

      {/* ------------------------------------------------------------ how to join */}
      <section className="jo-section is-tint">
        <div className="jo-in">
          <Reveal className="jo-head">
            <span className="jo-tag">איך מצטרפים</span>
            <h2>שלושה צעדים</h2>
          </Reveal>
          <ol className="jo-steps">
            {[
              ['מצטרפים למשרד', `${OFFICE_FEE}, ו-0% עמלה למשרד. בדמו אין חיוב אמיתי.`],
              ['עונים על 15 שאלות', 'קלילות, בכיף: תמונה, רישיון, אזורים והסיפור שלכם.'],
              ['הדף והמשרד שלכם מוכנים', 'דף אישי מרשים בשמכם, ומקום במשרד תיווך ארצי.'],
            ].map(([t, d], i) => (
              <Reveal key={t} delay={i * 0.08} as="li">
                <b className="num">{i + 1}</b>
                <h3>{t}</h3>
                <p>{d}</p>
              </Reveal>
            ))}
          </ol>
        </div>
      </section>

      {/* ------------------------------------------------------------ questions */}
      <section className="jo-section">
        <div className="jo-in jo-faq-wrap">
          <Reveal className="jo-head">
            <span className="jo-tag">שאלות נפוצות</span>
            <h2>לפני שמצטרפים</h2>
          </Reveal>
          <ul className="jo-faq">
            {faq.map((f, i) => (
              <li key={f.q} className={open === i ? 'is-open' : ''}>
                <button onClick={() => setOpen(open === i ? -1 : i)} aria-expanded={open === i}>
                  {f.q}
                  <span aria-hidden>+</span>
                </button>
                <div>
                  <p>{f.a}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ------------------------------------------------------------ the close */}
      <section className="jo-final">
        <i className="jo-grid" aria-hidden />
        <div className="jo-in jo-final-in">
          <h2>שווה לכם להצטרף</h2>
          <p>{OFFICE_FEE}, 0% עמלה למשרד, ו-100% מהעמלה נשארת אצלכם.</p>
          <button className="btn btn-white btn-lg" onClick={cta}>
            {joined ? 'לאזור הסוכן שלנו' : 'להצטרפות למשרד'}
            <ArrowLeft />
          </button>
          <small>
            <Lock /> בדמו אין חיוב אמיתי.
          </small>
        </div>
      </section>

      <div className="jo-sticky">
        <div>
          <b className="num">0%</b>
          <small>עמלה למשרד. {OFFICE_FEE}</small>
        </div>
        <button className="btn btn-gold btn-lg" onClick={cta}>
          {joined ? 'לאזור הסוכן' : 'להצטרפות'}
          <ArrowLeft />
        </button>
      </div>

      {/* ------------------------------------------------------------ the simulated joining */}
      <Modal open={pay !== 'closed'} onClose={() => pay !== 'busy' && setPay('closed')} title={`הצטרפות ל${OFFICE_NAME}`} subtitle="בדמו אין חיוב אמיתי ולא מבקשים פרטי אשראי.">
        <div className="modal-body jo-pay">
          {pay === 'done' ? (
            <div className="jo-done">
              <span>
                <Check />
              </span>
              <h3>ברוכים הבאים למשרד</h3>
              <p>מעכשיו רואים את הדמו כחבר משרד. האזור "הסוכן שלנו" נפתח: עונים על 15 שאלות קלילות, ואנחנו בונים את הדף.</p>
              <button className="btn btn-gold btn-lg" onClick={begin}>
                מתחילים <ArrowLeft />
              </button>
            </div>
          ) : (
            <>
              <dl className="jo-sum">
                <div>
                  <dt>מסלול</dt>
                  <dd>{OFFICE_NAME}</dd>
                </div>
                <div>
                  <dt>עמלה למשרד</dt>
                  <dd className="num">0%</dd>
                </div>
                <div>
                  <dt>דמי חבר</dt>
                  <dd className="num">{OFFICE_FEE}</dd>
                </div>
                <div className="is-total">
                  <dt>חיוב היום</dt>
                  <dd>אין, זה דמו</dd>
                </div>
              </dl>
              <p className="jo-commit">{COMMIT_TBD}</p>
              <label className="jo-agree">
                <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
                <span>אני מאשר/ת את תנאי ההצטרפות. בדמו זה ממשק בלבד: התנאים דורשים אישור עורך דין לפני גרסה אמיתית.</span>
              </label>
              <button className="btn btn-gold btn-lg jo-go" disabled={!agree || pay === 'busy'} onClick={() => setPay('busy')}>
                {pay === 'busy' ? (
                  <>
                    <LoaderCircle className="jo-spin" /> מצרפים אתכם למשרד
                  </>
                ) : (
                  'הצטרפות למשרד, בדמו'
                )}
              </button>
            </>
          )}
        </div>
      </Modal>
    </div>
  )
}
