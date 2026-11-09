import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { animate, motion } from 'framer-motion'
import { ArrowLeft, BadgeCheck, Building2, Calculator, Check, Gem, LoaderCircle, Lock, ShieldCheck, Sparkles, Users, Wallet, X } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { PLATFORM_NAME } from '../config'
import { BackButton, DemoTag, EASE, Logo, Modal, Reveal } from '../components/ui'
import { useAgent } from '../agent/useAgent'
import { OFFICE_MIN_MONTHS, OFFICE_MIN_TOTAL, OFFICE_NAME, OFFICE_PRICE, OFFICE_YEAR, shekel } from '../config/office'
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
  { icon: Wallet, title: 'מחיר קבוע, בלי אחוזים', text: 'משלמים סכום אחד בחודש, והעמלה כולה נשארת אצלכם.' },
  { icon: Gem, title: 'כלים חדשים לפני כולם', text: 'חדר עסקה משותף, בקשה בוערת, ארנק עמלות ועוד, בעדיפות.' },
  { icon: Users, title: 'קהילה ארצית ושת"פים', text: 'מתווכים מכל הארץ, במקום אחד, וכל העבודה ביחד.' },
]

const rows: { what: string; community: boolean; office: boolean }[] = [
  { what: 'קהילת מתווכים ארצית ופיד שת"פים', community: true, office: true },
  { what: 'CRM למתווך ופולדר דיגיטלי', community: true, office: true },
  { what: 'דף נחיתה אישי לפי תבנית', community: true, office: true },
  { what: 'מחירים מוזלים אצל שמאים ועורכי דין', community: true, office: true },
  { what: 'הסוכן שלנו: דף אישי מרשים שמופיע בגוגל', community: false, office: true },
  { what: 'שם ומותג של משרד תיווך ארצי', community: false, office: true },
  { what: 'ליווי וניהול מקצועי של צוות המשרד', community: false, office: true },
  { what: 'עדיפות לכלי הבטא החדשים', community: false, office: true },
]

const faq = [
  { q: 'כמה זה עולה?', a: `${OFFICE_PRICE} ₪ לחודש. המינימום הוא ${OFFICE_MIN_MONTHS} חודשים, כלומר התחייבות של ${shekel(OFFICE_MIN_TOTAL)}.` },
  { q: 'האם לוקחים אחוז מהעמלה?', a: 'לא. זה מחיר קבוע, והעמלה כולה נשארת אצלכם.' },
  { q: 'מתי אפשר להתחיל?', a: 'מיד אחרי התשלום נפתח האזור "הסוכן שלנו". עונים על 15 שאלות קלילות, ואנחנו בונים את הדף.' },
  { q: 'אפשר להתחיל בקהילה ולעבור למשרד אחר כך?', a: 'כן. מצטרפים לקהילה בחינם, ועוברים למשרד בכל שלב.' },
  { q: 'צריך רישיון מתווך?', a: 'כן. מעלים אותו בשאלון, והצוות בודק אותו.' },
]

export default function JoinOffice() {
  const navigate = useNavigate()
  const { stage, patch } = useAgent()
  const joined = stage !== 'locked'

  // the calculator
  const [deals, setDeals] = useState(6)
  const [fee, setFee] = useState(30000)
  const [pct, setPct] = useState(20)
  const today = deals * fee * (pct / 100)
  const diff = today - OFFICE_YEAR
  const covers = Math.floor(fee / OFFICE_PRICE)
  const gToday = useGlide(today)
  const gDiff = useGlide(Math.abs(diff))

  // the payment (a simulation: no card details are asked for)
  const [pay, setPay] = useState<'closed' | 'open' | 'busy' | 'done'>('closed')
  const [agree, setAgree] = useState(false)
  const [open, setOpen] = useState(0)
  useEffect(() => {
    if (pay !== 'busy') return
    const t = window.setTimeout(() => setPay('done'), 1600)
    return () => window.clearTimeout(t)
  }, [pay])
  const begin = () => {
    patch({ stage: 'onboarding', step: 0, paidAt: new Date().toISOString() })
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
            <span>מחיר אחד קבוע.</span>
          </motion.h1>
          <motion.p className="jo-sub" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.2, ease: EASE }}>
            {OFFICE_PRICE} ₪ לחודש, ו-100% מהעמלה נשארת אצלכם.
          </motion.p>
          <motion.div className="jo-price" initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.8, delay: 0.3, ease: EASE }}>
            <b className="num">{shekel(OFFICE_PRICE)}</b>
            <span>
              <strong>לחודש</strong>
              <small>מינימום {OFFICE_MIN_MONTHS} חודשים</small>
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
              <Check /> ללא אחוזים מהעמלה
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
            <h2>כמה זה באמת עולה לכם?</h2>
            <p>מזינים את המספרים שלכם ורואים את ההבדל.</p>
          </Reveal>
          <Reveal className="jo-calc">
            <div className="jo-inputs">
              <label>
                <span>
                  כמה עסקאות אתם סוגרים בשנה? <b className="num">{deals}</b>
                </span>
                <input type="range" min={1} max={30} value={deals} onChange={(e) => setDeals(Number(e.target.value))} />
              </label>
              <label>
                <span>
                  עמלה ממוצעת לעסקה <b className="num">{shekel(fee)}</b>
                </span>
                <input type="range" min={5000} max={100000} step={1000} value={fee} onChange={(e) => setFee(Number(e.target.value))} />
              </label>
              <label>
                <span>
                  כמה אחוזים מהעמלה לוקחים ממכם היום? <b className="num">{pct}%</b>
                </span>
                <input type="range" min={0} max={50} value={pct} onChange={(e) => setPct(Number(e.target.value))} />
                <small>אם אתם עצמאים, בחרו 0.</small>
              </label>
            </div>

            <div className="jo-result">
              <div className="jo-vs">
                <div>
                  <small>היום אתם משלמים</small>
                  <b className="num">{shekel(gToday)}</b>
                  <em>בשנה</em>
                </div>
                <div className="is-us">
                  <small>במשרד {PLATFORM_NAME}</small>
                  <b className="num">{shekel(OFFICE_YEAR)}</b>
                  <em>
                    בשנה ({OFFICE_PRICE} × 12)
                  </em>
                </div>
              </div>
              <div className={`jo-verdict${diff > 0 ? ' is-save' : ''}`}>
                {diff > 0 ? (
                  <>
                    <Sparkles />
                    <div>
                      <small>נשארים אצלכם בכל שנה</small>
                      <b className="num">{shekel(gDiff)}</b>
                    </div>
                  </>
                ) : (
                  <div>
                    <small>המנוי עולה {shekel(OFFICE_YEAR)} בשנה</small>
                    <b>ומה שמקבלים בתמורה: מותג משרד, דף בגוגל וצוות מאחורי הקלעים</b>
                  </div>
                )}
              </div>
              <p className="jo-cover">
                עסקה אחת בעמלה של <b className="num">{shekel(fee)}</b> מכסה <b className="num">{covers}</b> חודשי מנוי.
              </p>
              <small className="jo-note">חישוב לפי המספרים שהזנתם. כל משרד עובד אחרת, כדאי לבדוק מה משלמים היום.</small>
            </div>
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
              <b className="is-office num">{shekel(OFFICE_PRICE)} לחודש</b>
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
              ['משלמים', `${OFFICE_PRICE} ₪ לחודש, מינימום ${OFFICE_MIN_MONTHS} חודשים. רק אחרי התשלום נפתחת ההצטרפות.`],
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
          <p>
            {OFFICE_PRICE} ₪ לחודש, ו-100% מהעמלה נשארת אצלכם.
          </p>
          <button className="btn btn-white btn-lg" onClick={cta}>
            {joined ? 'לאזור הסוכן שלנו' : 'להצטרפות למשרד'}
            <ArrowLeft />
          </button>
          <small>
            <Lock /> ההצטרפות מתבצעת אחרי תשלום. בדמו אין תשלום אמיתי.
          </small>
        </div>
      </section>

      <div className="jo-sticky">
        <div>
          <b className="num">{shekel(OFFICE_PRICE)}</b>
          <small>לחודש, מינימום {OFFICE_MIN_MONTHS} חודשים</small>
        </div>
        <button className="btn btn-gold btn-lg" onClick={cta}>
          {joined ? 'לאזור הסוכן' : 'להצטרפות'}
          <ArrowLeft />
        </button>
      </div>

      {/* ------------------------------------------------------------ the simulated payment */}
      <Modal open={pay !== 'closed'} onClose={() => pay !== 'busy' && setPay('closed')} title={`הצטרפות ל${OFFICE_NAME}`} subtitle="דמו: אין תשלום אמיתי ולא מבקשים פרטי אשראי.">
        <div className="modal-body jo-pay">
          {pay === 'done' ? (
            <div className="jo-done">
              <span>
                <Check />
              </span>
              <h3>התשלום התקבל, ברוכים הבאים</h3>
              <p>האזור "הסוכן שלנו" נפתח. עכשיו עונים על 15 שאלות קלילות, ואנחנו בונים את הדף.</p>
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
                  <dt>מחיר</dt>
                  <dd className="num">{OFFICE_PRICE} ₪ לחודש</dd>
                </div>
                <div>
                  <dt>התחייבות מינימלית</dt>
                  <dd className="num">
                    {OFFICE_MIN_MONTHS} חודשים ({shekel(OFFICE_MIN_TOTAL)})
                  </dd>
                </div>
                <div className="is-total">
                  <dt>חיוב ראשון היום</dt>
                  <dd className="num">{shekel(OFFICE_PRICE)}</dd>
                </div>
              </dl>
              <label className="jo-agree">
                <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
                <span>אני מאשר/ת את תנאי ההצטרפות ואת ההתחייבות למינימום {OFFICE_MIN_MONTHS} חודשים.</span>
              </label>
              <button className="btn btn-gold btn-lg jo-go" disabled={!agree || pay === 'busy'} onClick={() => setPay('busy')}>
                {pay === 'busy' ? (
                  <>
                    <LoaderCircle className="jo-spin" /> מעבדים את התשלום
                  </>
                ) : (
                  'סימולציית תשלום'
                )}
              </button>
            </>
          )}
        </div>
      </Modal>
    </div>
  )
}
