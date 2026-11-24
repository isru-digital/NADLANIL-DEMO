import { useEffect, useRef, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, BadgeCheck, Building2, Check, Compass, HeartHandshake, Megaphone, PhoneCall, ShieldCheck, Sparkles, Sprout, UserRound, X } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { PLATFORM_NAME, asset, CURRENT_BROKER_ID } from '../config'
import { useMember } from '../config/member'
import { MADLAN_PACKS, PLANS, TERMS } from '../config/pricing'
import { brokerPhone, brokers } from '../data/demo'
import { BackButton, Logo, Reveal } from '../components/ui'
import LeadSheet from '../join/LeadSheet'
import '../styles/office-story.css'
import '../styles/leads.css'

// 24.11.2026 (Itzik): no prices on this page. The price list, the Madlan packs and the fee line are not shown; the
// leads form of the office page takes their place, and the fee reads "0% עמלה למשרד, 100% עמלה למתווך"
const SHOW_PRICES = false
const FEE = '0% עמלה למשרד, 100% עמלה למתווך'

/**
 * The office's page for a member of the community (Itzik, 17.11.2026): what opens from "המשרד" and from
 * "שדרג למשרד NadlanUP". It speaks to the feeling (independence, a back behind you, not alone, a business of your
 * own) and not with a list of the community's features. Every price, ad count and service here comes from the
 * price list in config/pricing.ts; there are no numbers, people or reviews of its own. The one figure that is not a
 * price ("לרוב 50%") is his own, from the community's page.
 */

const num = (n: number) => n.toLocaleString('he-IL')
const ADS_PLUS = PLANS.find((p) => p.id === 'plus')?.yad2 ?? 0
const ADS_PRO = PLANS.find((p) => p.id === 'pro')?.yad2 ?? 0
const termOf = (k: string) => TERMS.find(([what]) => what === k)?.[1] ?? ''

const feelings: { icon: LucideIcon; word: string; title: string; text: string }[] = [
  {
    icon: Compass,
    word: 'עצמאות',
    title: 'אתם מחליטים',
    text: 'על הלקוחות, על השעות ועל הדרך. אין מי שמחלק לכם עבודה, ואין אחוזים שיורדים מהעסקה.',
  },
  {
    icon: ShieldCheck,
    word: 'ביטחון',
    title: 'משרד ארצי מאחוריכם',
    text: 'דף עסקי ממותג תחת שם המשרד, ומשרד בפריסה ארצית שעומד מאחוריכם בכל פגישה עם לקוח.',
  },
  {
    icon: HeartHandshake,
    word: 'לא לבד',
    title: 'מישהו בצד שלכם, כל שבוע',
    text: 'פגישה אישית שבועית עם אריאל, מענה לכל שאלה מקצועית, וקהילה של מתווכים מכל הארץ.',
  },
  {
    icon: Sprout,
    word: 'עסק משלכם',
    title: 'לבנות משהו שנשאר',
    text: 'תוכנית עסקית אישית עם יעדים שבועיים, חודשיים ושנתיים. כל חודש מוסיף לעסק שלכם, לא לעסק של מישהו אחר.',
  },
]

const envelope: { id: string; icon: LucideIcon; name: string; lines: ReactNode[] }[] = [
  {
    id: 'ads',
    icon: Megaphone,
    name: 'פרסום',
    lines: [
      // the plan names are Latin: each sits in its own island, so the line reads right to left
      <>
        מודעות יד2 כלולות: {ADS_PLUS} במסלול <bdi dir="ltr">PLUS</bdi>, ו-{ADS_PRO} במסלול <bdi dir="ltr">PRO</bdi>
      </>,
      ...(SHOW_PRICES ? [`חבילות מדלן בתוספת: ${MADLAN_PACKS.map((m) => `${m.ads} מודעות ב-${num(m.price)} ₪`).join(', ')} לחודש, לפני מע"מ`] : []),
    ],
  },
  {
    id: 'guide',
    icon: HeartHandshake,
    name: 'ליווי',
    lines: ['פגישה אישית כל שבוע עם אריאל', 'תוכנית עסקית עם יעדים שבועיים, חודשיים ושנתיים', 'מענה לכל עזרה מקצועית'],
  },
  {
    id: 'brand',
    icon: BadgeCheck,
    name: 'מיתוג',
    lines: ['השתייכות למשרד בפריסה ארצית', 'דף עסקי ממותג תחת שם המשרד', '"הסוכן שלנו": דף אישי בשמכם'],
  },
  {
    id: 'tools',
    icon: Sparkles,
    name: 'כלים וידע',
    lines: [
      "קהילה מלאה עם כל הפיצ'רים",
      'דף נחיתה ופולדר דיגיטלי ללקוח',
      'ספריית ידע: תיק פרזנטציה, קורס פייסבוק ממומן, תסריטי שיחות וטיפול בהתנגדויות',
    ],
  },
]

const planLine = (yad2: number) => (yad2 > 0 ? `כל המעטפת, ועוד ${yad2} מודעות יד2` : 'כל המעטפת, בלי מודעות יד2')

// ---------------------------------------------------------------------------------------------------------------- the split

const FROM = 50
const RUN = 1700

/** The commission of one deal: it starts split in half, the way it is in many offices, and slides to 0% / 100%. */
function Split() {
  const still = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const [share, setShare] = useState(still ? 100 : FROM)
  const done = share === 100
  useEffect(() => {
    if (still) return
    let raf = 0
    const t = window.setTimeout(() => {
      const t0 = performance.now()
      const tick = (now: number) => {
        const p = Math.min(1, (now - t0) / RUN)
        const e = p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2
        setShare(Math.round(FROM + (100 - FROM) * e))
        if (p < 1) raf = requestAnimationFrame(tick)
      }
      raf = requestAnimationFrame(tick)
    }, 750)
    return () => {
      window.clearTimeout(t)
      cancelAnimationFrame(raf)
    }
  }, [still])

  return (
    <div className={`os-split${done ? ' is-done' : ''}`} data-share={share} role="img" aria-label="מכל עסקה: 0% עמלה למשרד, 100% עמלה למתווך">
      <small className="os-split-cap" aria-hidden>
        מכל עסקה שאתם סוגרים
      </small>
      <div className="os-split-nums" aria-hidden>
        <div className="os-split-n is-broker">
          <i>
            <UserRound />
          </i>
          <b className="num">{share}%</b>
          <span>עמלה למתווך</span>
        </div>
        <div className="os-split-n is-office">
          <i>
            <Building2 />
          </i>
          <b className="num">{100 - share}%</b>
          <span>עמלה למשרד</span>
        </div>
      </div>
      <div className="os-split-bar" aria-hidden>
        <i style={{ width: `${share}%` }} />
      </div>
      <p className="os-split-note" aria-hidden>
        במשרדים רבים חלק מהעמלה, לרוב 50%, נשאר במשרד. כאן: {FEE}.
      </p>
    </div>
  )
}

// ---------------------------------------------------------------------------------------------------------------- call me back

const TIMES = ['בבוקר', 'בצהריים', 'בערב'] as const

/** "שיחזרו אליי": the broker's name and phone are already there, one tap picks a time. A demo: nothing is sent. */
function CallBack({ open, onClose }: { open: boolean; onClose: () => void }) {
  const me = brokers.find((b) => b.id === CURRENT_BROKER_ID) ?? brokers[0]
  const [name, setName] = useState(me.name)
  const [phone, setPhone] = useState(brokerPhone(me))
  const [time, setTime] = useState<(typeof TIMES)[number]>('בבוקר')
  const [note, setNote] = useState('')
  const [sent, setSent] = useState(false)
  const [tried, setTried] = useState(false)
  const [leaving, setLeaving] = useState(false)
  const panel = useRef<HTMLDivElement>(null)
  const phoneOk = phone.replace(/\D/g, '').length >= 9
  const nameOk = name.trim().length >= 2

  const close = () => {
    setLeaving(true)
    window.setTimeout(() => {
      setLeaving(false)
      onClose()
    }, 170)
  }
  useEffect(() => {
    if (!open) return
    setSent(false)
    setTried(false)
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close()
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    panel.current?.focus()
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  if (!open) return null
  const submit = (e: FormEvent) => {
    e.preventDefault()
    setTried(true)
    if (!nameOk || !phoneOk) return
    try {
      localStorage.setItem('nadlanup-callback-v1', JSON.stringify({ name: name.trim(), phone: phone.trim(), time, note: note.trim(), at: new Date().toISOString() }))
    } catch {
      /* storage unavailable: the demo still says what would happen */
    }
    setSent(true)
  }
  const first = name.trim().split(/\s+/)[0]

  return createPortal(
    <div className={`os-sheet-scrim${leaving ? ' is-leaving' : ''}`} data-callback onMouseDown={(e) => e.target === e.currentTarget && close()}>
      <div ref={panel} className="os-sheet" role="dialog" aria-modal="true" aria-label="שיחזרו אליי" tabIndex={-1}>
        <button type="button" className="os-sheet-x" onClick={close} aria-label="סגירה" data-act="close-callback">
          <X />
        </button>
        {sent ? (
          <div className="os-sent" data-callback-sent>
            <span className="os-sent-ico">
              <Check />
            </span>
            <h2>קיבלנו, {first}</h2>
            <p>
              הצוות יחזור אליכם {time} לשיחה קצרה, בלי התחייבות.
            </p>
            <small className="os-demo">
              <em>דוגמה</em> בדמו הבקשה נשמרת רק בדפדפן הזה ולא נשלחת לאף אחד.
            </small>
            <button type="button" className="os-btn is-solid" onClick={close} data-act="done-callback">
              חזרה לדף
            </button>
          </div>
        ) : (
          <form onSubmit={submit} noValidate>
            <span className="os-sheet-ico">
              <PhoneCall />
            </span>
            <h2>נשמח לדבר</h2>
            <p className="os-sheet-sub">השאירו פרטים, והצוות יחזור אליכם לשיחה קצרה. בלי התחייבות.</p>
            <label className="os-field">
              <span>שם</span>
              <input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" data-f="cb-name" aria-invalid={tried && !nameOk} />
              {tried && !nameOk && <em role="alert">כתבו את השם, כדי שנדע את מי לבקש</em>}
            </label>
            <label className="os-field">
              <span>טלפון</span>
              <input value={phone} onChange={(e) => setPhone(e.target.value)} type="tel" inputMode="tel" dir="ltr" autoComplete="tel" data-f="cb-phone" aria-invalid={tried && !phoneOk} />
              {tried && !phoneOk && <em role="alert">חסרות ספרות במספר. בדקו אותו ונסו שוב</em>}
            </label>
            <fieldset className="os-times">
              <legend>מתי נוח שנתקשר?</legend>
              <div>
                {TIMES.map((t) => (
                  <button type="button" key={t} aria-pressed={time === t} className={time === t ? 'is-on' : ''} onClick={() => setTime(t)} data-time={t}>
                    {t}
                  </button>
                ))}
              </div>
            </fieldset>
            <label className="os-field">
              <span>
                מה הכי חשוב לכם לשמוע? <small>(לא חובה)</small>
              </span>
              <textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="למשל: איך עובר המעבר ממשרד אחר" data-f="cb-note" />
            </label>
            <button type="submit" className="os-btn is-solid is-wide" data-act="send-callback">
              <PhoneCall /> שיחזרו אליי
            </button>
            <small className="os-demo">
              <em>דוגמה</em> בדמו הבקשה לא נשלחת.
            </small>
          </form>
        )}
      </div>
    </div>,
    document.body,
  )
}

// ---------------------------------------------------------------------------------------------------------------- the page

export default function OfficeStory({ standalone = false }: { standalone?: boolean }) {
  const navigate = useNavigate()
  const { isOffice } = useMember()
  const [call, setCall] = useState(false)
  // "מעוניינים לקבל מידע? לחצו כאן": the same form as on the office page, sent to the office's staff (24.11.2026)
  const [lead, setLead] = useState(false)
  const me = brokers.find((b) => b.id === CURRENT_BROKER_ID) ?? brokers[0]
  const join = () => navigate(isOffice ? '/app/office' : '/join/office?join=1')
  const joinLabel = isOffice ? 'למשרד שלי' : 'אני רוצה להצטרף'

  const ctas = (where: string) => (
    <div className="os-ctas">
      <button type="button" className="os-btn is-light" onClick={join} data-act={`join-${where}`}>
        {joinLabel} <ArrowLeft />
      </button>
      {!isOffice && (
        <button type="button" className="os-btn is-ghost" onClick={() => setLead(true)} data-act="ask-info" data-where={where}>
          מעוניינים לקבל מידע? לחצו כאן
        </button>
      )}
    </div>
  )

  return (
    <div className={`os${standalone ? ' is-standalone' : ''}`} data-office-story>
      {standalone && (
        <header className="os-top">
          <BackButton fallback="/" className="is-icon" />
          <Link to="/" aria-label="דף הבית">
            <Logo size={30} withName />
          </Link>
        </header>
      )}

      {/* ------------------------------------------------------------ hero: the city at night, and the commission */}
      <section className="os-hero">
        <img className="os-hero-img" src={asset('img/skyline.webp')} alt="" aria-hidden />
        <i className="os-hero-shade" aria-hidden />
        <div className="os-hero-in">
          <div className="os-hero-copy">
            <span className="os-kicker">
              <BadgeCheck /> משרד <bdi dir="ltr">{PLATFORM_NAME}</bdi>
            </span>
            <h1>
              <span>העסק שלכם</span>
              <span>השם שלכם</span>
              <span className="is-mint">והעמלה, כולה שלכם</span>
            </h1>
            <p className="os-lead">משרד תיווך ארצי שעומד מאחוריכם בכל עסקה, ולא לוקח ממנה אף אחוז. אתם בונים עסק משלכם, ואנחנו דואגים שלא תעשו את זה לבד.</p>
            {ctas('hero')}
            <small className="os-fine" data-fee>
              {SHOW_PRICES ? (
                <>
                  דמי חבר החל מ-<span className="num">{num(PLANS[0].price)}</span> ₪ + מע"מ לחודש. {termOf('דמי הצטרפות') === 'ללא עלות' ? 'בלי דמי הצטרפות.' : ''}
                </>
              ) : (
                `${FEE}.`
              )}
            </small>
          </div>
          <Split />
        </div>
      </section>

      {/* ------------------------------------------------------------ the moment every broker knows */}
      <section className="os-truth">
        <Reveal className="os-head">
          <span className="os-tag">רגע של כנות</span>
          <h2>אתם עושים את כל העבודה</h2>
        </Reveal>
        <ol className="os-truth-lines">
          <Reveal as="li" className="os-line">
            <b>מוצאים את הנכס, מביאים את הקונה,</b> ומחזיקים את העסקה עד החתימה.
          </Reveal>
          <Reveal as="li" className="os-line" delay={0.08}>
            <b>ואז, במשרד רגיל,</b> חלק גדול מהעמלה הולך הלאה.
          </Reveal>
          <Reveal as="li" className="os-line" delay={0.16}>
            <b>ואם יוצאים לבד, נשארים לבד:</b> עם הפרסום, עם המיתוג, ועם כל שאלה שאין את מי לשאול.
          </Reveal>
        </ol>
        <Reveal className="os-answer" delay={0.1}>
          <span className="os-answer-mark" aria-hidden>
            <Check />
          </span>
          <p>
            במשרד <bdi dir="ltr">{PLATFORM_NAME}</bdi> לא צריך לבחור.
            <strong> עצמאות מלאה, וגב של משרד.</strong>
          </p>
        </Reveal>
      </section>

      {/* ------------------------------------------------------------ how it feels */}
      <section className="os-feel">
        <Reveal className="os-head">
          <span className="os-tag">איך זה מרגיש</span>
          <h2>ככה נראית עבודה עם גב</h2>
        </Reveal>
        <ul className="os-feel-grid">
          {feelings.map((f, i) => (
            <Reveal as="li" key={f.word} className="os-feel-card" delay={i * 0.07}>
              <span className="os-feel-ico">
                <f.icon />
              </span>
              <em>{f.word}</em>
              <h3>{f.title}</h3>
              <p>{f.text}</p>
            </Reveal>
          ))}
        </ul>
      </section>

      {/* ------------------------------------------------------------ the envelope around the broker */}
      <section className="os-env" aria-labelledby="os-env-h">
        <Reveal className="os-head">
          <span className="os-tag">המעטפת</span>
          <h2 id="os-env-h">כל מה שמסביבכם, כדי שתתעסקו רק בעסקאות</h2>
        </Reveal>
        <div className="os-env-map">
          <Reveal className="os-core">
            <span className="os-core-rings" aria-hidden>
              <i />
              <i />
              <i />
            </span>
            <img src={asset(me.avatar)} alt="" aria-hidden />
            <b>אתם</b>
            <small>והעסקאות שלכם</small>
          </Reveal>
          {envelope.map((x, i) => (
            <Reveal key={x.id} className={`os-env-card is-${x.id}`} delay={0.08 + i * 0.07}>
              <span className="os-env-ico">
                <x.icon />
              </span>
              <h3>{x.name}</h3>
              <ul>
                {x.lines.map((l, k) => (
                  <li key={k}>
                    <Check aria-hidden />
                    <span>{l}</span>
                  </li>
                ))}
              </ul>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ------------------------------------------------------------ the ask for details: the price list was here */}
      {!SHOW_PRICES && (
        <section className="jo-ask os-ask" data-section="ask">
          <Reveal className="jo-ask-card">
            <span className="jo-ask-fee">
              <BadgeCheck aria-hidden /> {FEE}
            </span>
            <h2>רוצים לשמוע איך זה עובד אצלנו?</h2>
            <p>משאירים שם, טלפון ועיר, וצוות המשרד חוזר אליכם עם כל הפרטים.</p>
            <button type="button" className="btn btn-gold btn-lg" onClick={() => setLead(true)} data-act="ask-info" data-where="ask">
              מעוניינים לקבל מידע? לחצו כאן
              <ArrowLeft />
            </button>
          </Reveal>
        </section>
      )}

      {/* ------------------------------------------------------------ the price list, short (not shown since 24.11.2026) */}
      {SHOW_PRICES && (
      <section className="os-plans">
        <Reveal className="os-head">
          <span className="os-tag">המחירון</span>
          <h2>מסלול שמתאים לקצב שלכם</h2>
          <p>כל המחירים חודשיים ולפני מע"מ. בכל המסלולים: 0% עמלה למשרד.</p>
        </Reveal>
        <ul className="os-plan-row">
          {PLANS.map((p, i) => (
            <Reveal as="li" key={p.id} className="os-plan" delay={i * 0.07}>
              <span className="os-plan-name" dir="ltr">
                {p.name}
              </span>
              <b className="num">
                {num(p.price)} <small>₪</small>
              </b>
              <small className="os-plan-unit">+ מע"מ לחודש</small>
              <p>{planLine(p.yad2)}</p>
            </Reveal>
          ))}
        </ul>
        <ul className="os-terms">
          {TERMS.map(([what, how]) => (
            <li key={what}>
              <Check /> <b>{what}:</b> {how}
            </li>
          ))}
        </ul>
        <Link to="/join/office" className="os-more" data-act="full-prices">
          למחירון המלא ולמחשבון <ArrowLeft />
        </Link>
      </section>
      )}

      {/* ------------------------------------------------------------ the close */}
      <section className="os-final">
        <img className="os-final-img" src={asset('img/panel-keys.webp')} alt="" aria-hidden loading="lazy" />
        <i className="os-final-shade" aria-hidden />
        <div className="os-final-in">
          <h2>
            הגיע הזמן לעבוד <span className="is-mint">בשביל עצמכם</span>
          </h2>
          <p>עם השם, הליווי והכלים של משרד ארצי. {FEE}.</p>
          {ctas('final')}
          {!isOffice && <small className="os-fine">לא בטוחים עדיין? הקהילה נשארת שלכם, בחינם, כמה שתרצו.</small>}
        </div>
      </section>

      {/* the demo's "שיחזרו אליי" sheet is kept, not shown: the leads form took its place (24.11.2026) */}
      <CallBack open={call} onClose={() => setCall(false)} />
      <LeadSheet open={lead} onClose={() => setLead(false)} />
    </div>
  )
}
