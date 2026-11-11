import { useEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeft, ArrowRight, BadgeCheck, CalendarCheck, Check, CheckCheck, Clock, Eye, FileSignature, Footprints, Info, MapPin, MessageCircle, PenLine, RotateCcw, Send, ShieldCheck, Sparkles, UserRound, WandSparkles } from 'lucide-react'
import { CURRENT_BROKER_ID, PLATFORM_NAME, PLATFORM_SUBNAME, asset } from '../config'
import { brokerById, brokers, crmItems, formatPriceShort } from '../data/demo'
import { useStore } from '../store'
import { Avatar, EASE, Modal } from '../components/ui'
import AreasMap from '../agent/AreasMap'
import { OFFICE_BROKER_IDS, benefits, chatScript, dealDocs, dealSteps, goals, leadAreas, leads, report, sampleFlat, sessions, weekTasks } from './officeData'
import '../styles/agent.css'

/** The line under every simulated screen: what is not real here. */
function Sim({ children }: { children: string }) {
  return (
    <p className="of-sim">
      <Info /> {children}
    </p>
  )
}

/* ================================================================ 1. the leads machine */
export function LeadsScreen() {
  const { toast } = useStore()
  const [taken, setTaken] = useState<string[]>([])
  const mine = leads.filter((l) => l.mine)
  const top = Math.max(...leadAreas.map((a) => a.count))
  return (
    <>
      <div className="of-stats">
        <div>
          <b className="num">{leadAreas[0].count}</b>
          <span>לידים השבוע באזור שלך</span>
        </div>
        <div>
          <b className="num">{mine.length - taken.length}</b>
          <span>מחכים לך עכשיו</span>
        </div>
        <div>
          <b className="num">{leadAreas.reduce((n, a) => n + a.count, 0)}</b>
          <span>לידים השבוע בכל הארץ</span>
        </div>
      </div>

      <div className="of-cols">
        <section className="of-panel">
          <h2>הלידים שלך</h2>
          <p className="of-panel-sub">ליד שנכנס מהקמפיינים של המשרד מגיע למתווך של האזור.</p>
          <ul className="of-leads">
            {leads.map((l) => {
              const got = taken.includes(l.id)
              return (
                <li key={l.id} className={`${l.mine ? '' : 'is-other'}${got ? ' is-taken' : ''}`}>
                  <span className="of-lead-face">
                    <UserRound />
                  </span>
                  <div className="of-lead-main">
                    <b>{l.name}</b>
                    <p>{l.want}</p>
                    <small>
                      <MapPin /> {l.area}
                      <i /> <Clock /> {l.ago}
                      <i /> <em>{l.source}</em>
                    </small>
                  </div>
                  {l.mine ? (
                    <button
                      className={`btn ${got ? 'btn-ghost' : 'btn-gold'} btn-sm`}
                      disabled={got}
                      onClick={() => {
                        setTaken((t) => [...t, l.id])
                        toast(`הליד של ${l.name} אצלך. הפרטים נוספו ל-CRM, בדמו`)
                      }}
                    >
                      {got ? (
                        <>
                          <Check /> אצלך
                        </>
                      ) : (
                        'לקחת את הליד'
                      )}
                    </button>
                  ) : (
                    <span className="of-lead-else">הועבר למתווך של האזור</span>
                  )}
                </li>
              )
            })}
          </ul>
        </section>

        <section className="of-panel is-map">
          <h2>לידים לפי אזור</h2>
          <div className="of-map">
            <AreasMap selected={['tlv']} labels width={150} />
            <ul className="of-areas">
              {leadAreas.map((a) => (
                <li key={a.id} className={a.mine ? 'is-mine' : ''}>
                  <span>
                    {a.label}
                    {a.mine && <em>האזור שלך</em>}
                  </span>
                  <i>
                    <u style={{ width: `${(a.count / top) * 100}%` }} />
                  </i>
                  <b className="num">{a.count}</b>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </div>
      <Sim>סימולציה עם נתוני דמו. אין חיבור אמיתי ליד2, למדלן או לספקי פרסום.</Sim>
    </>
  )
}

/* ================================================================ 2. the weekly report to the seller */
export function ReportScreen() {
  const { toast } = useStore()
  const [sent, setSent] = useState(false)
  const top = Math.max(...report.days.map((d) => d.v))
  return (
    <>
      <div className="of-cols is-report">
        <article className="of-paper">
          <header>
            <img src={asset('brand/nadlanup-light.png')} alt={PLATFORM_NAME} />
            <span>
              דוח שבועי למוכר <i /> {report.week}
            </span>
          </header>
          <div className="of-paper-prop">
            <img src={asset(sampleFlat.image)} alt="" />
            <div>
              <b>{sampleFlat.title}</b>
              <small>{sampleFlat.area}</small>
              <em>לכבוד {sampleFlat.seller}</em>
            </div>
          </div>
          <div className="of-kpis">
            <div>
              <Eye />
              <b className="num">{report.views}</b>
              <span>צפו במודעה</span>
            </div>
            <div>
              <MessageCircle />
              <b className="num">{report.inquiries}</b>
              <span>פנו אלינו</span>
            </div>
            <div>
              <Footprints />
              <b className="num">{report.visits}</b>
              <span>הגיעו לראות</span>
            </div>
          </div>
          <div className="of-bars" role="img" aria-label="צפיות לפי יום">
            {report.days.map((d, i) => (
              <span key={d.d} style={{ '--h': `${(d.v / top) * 100}%`, '--i': i } as CSSProperties}>
                <i />
                <small>{d.d}</small>
              </span>
            ))}
          </div>
          <h3>מה עשינו השבוע</h3>
          <ul className="of-done">
            {report.done.map((t) => (
              <li key={t}>
                <Check /> {t}
              </li>
            ))}
          </ul>
          <p className="of-next">
            <b>ההמלצה שלנו:</b> {report.next}
          </p>
          <footer>
            {brokerById(CURRENT_BROKER_ID).name} <i /> {PLATFORM_NAME}, {PLATFORM_SUBNAME}
          </footer>
        </article>

        <aside className="of-phone-wrap">
          <div className="of-phone">
            <div className="of-phone-top">
              <span>
                <UserRound />
              </span>
              <b>{sampleFlat.seller}</b>
            </div>
            <div className="of-phone-body">
              <div className={`of-msg${sent ? ' is-in' : ''}`}>
                <b>הדוח השבועי שלכם מוכן</b>
                <p>
                  השבוע {report.views} צפו במודעה, {report.inquiries} פנו ו-{report.visits} הגיעו לראות את הדירה.
                </p>
                <span className="of-msg-file">
                  <FileSignature /> דוח שבועי, {report.week}
                </span>
                <small>
                  09:00 <CheckCheck />
                </small>
              </div>
              {!sent && <p className="of-phone-wait">הדוח הבא יישלח לבד ביום ראשון ב-09:00</p>}
            </div>
          </div>
          <button
            className="btn btn-gold btn-lg"
            disabled={sent}
            onClick={() => {
              setSent(true)
              toast('הדוח נשלח למוכר, בדמו')
            }}
          >
            {sent ? (
              <>
                <CheckCheck /> נשלח למוכר
              </>
            ) : (
              <>
                <Send /> לשלוח עכשיו למוכר
              </>
            )}
          </button>
        </aside>
      </div>
      <Sim>נתוני דמו. בדמו שום הודעה לא נשלחת באמת.</Sim>
    </>
  )
}

/* ================================================================ 3. the exclusivity pitch */
const pitchSteps = ['קוראים את פרטי הנכס מה-CRM', 'משווים לנכסים דומים באזור', 'בונים הערכת מחיר ותוכנית שיווק']
const plan = [
  ['שבוע 1', 'צילום, מודעה ופולדר דיגיטלי'],
  ['שבוע 2', 'פרסום בקהילת המתווכים ובקמפיין המשרד'],
  ['שבוע 3', 'יום פתוח וביקורים מרוכזים'],
  ['שבוע 4', 'הצעות, משא ומתן וסגירה'],
]

export function PitchScreen() {
  const props = crmItems.filter((c) => c.kind === 'property' && c.price < 6000000).slice(0, 3)
  const [pick, setPick] = useState(props[0].id)
  const [stage, setStage] = useState<'pick' | 'busy' | 'ready'>('pick')
  const [step, setStep] = useState(0)
  const [slide, setSlide] = useState(0)
  const item = props.find((p) => p.id === pick) ?? props[0]
  const me = brokerById(CURRENT_BROKER_ID)

  useEffect(() => {
    if (stage !== 'busy') return
    if (step >= pitchSteps.length) {
      const t = window.setTimeout(() => {
        setStage('ready')
        setSlide(0)
      }, 500)
      return () => window.clearTimeout(t)
    }
    const t = window.setTimeout(() => setStep((s) => s + 1), 900)
    return () => window.clearTimeout(t)
  }, [stage, step])

  const low = Math.round((item.price * 0.96) / 10000) * 10000
  const high = Math.round((item.price * 1.03) / 10000) * 10000
  const slides = [
    <div className="of-slide is-cover" key="cover">
      <img src={asset(item.image ?? sampleFlat.image)} alt="" />
      <div>
        <img className="of-slide-logo" src={asset('brand/nadlanup-ongreen.png')} alt={PLATFORM_NAME} />
        <small>הצעה לשיווק בבלעדיות</small>
        <h3>{item.title}</h3>
        <p>{item.area}</p>
      </div>
    </div>,
    <div className="of-slide" key="price">
      <small>הערכת מחיר</small>
      <h3>טווח מחיר מומלץ</h3>
      <div className="of-range">
        <b className="num">{formatPriceShort(low)}</b>
        <i>
          <u />
        </i>
        <b className="num">{formatPriceShort(high)}</b>
      </div>
      <ul className="of-done">
        <li>
          <Check /> לפי נכסים דומים באזור {item.area.split(' - ')[0]}
        </li>
        <li>
          <Check /> {item.rooms} חדרים, {item.sqm} מ"ר, {item.floor}
        </li>
        <li>
          <Check /> מחיר פתיחה מוצע: {formatPriceShort(item.price)}
        </li>
      </ul>
      <em className="of-slide-note">הערכה מדומה. בדמו אין מקור מחירים אמיתי.</em>
    </div>,
    <div className="of-slide" key="plan">
      <small>תוכנית שיווק</small>
      <h3>ארבעה שבועות, שלב אחרי שלב</h3>
      <ol className="of-plan">
        {plan.map(([w, t]) => (
          <li key={w}>
            <b>{w}</b>
            <span>{t}</span>
          </li>
        ))}
      </ol>
    </div>,
    <div className="of-slide is-why" key="why">
      <small>למה איתנו</small>
      <h3>
        {PLATFORM_NAME}, {PLATFORM_SUBNAME}
      </h3>
      <ul className="of-done">
        <li>
          <Check /> משרד תיווך בפריסה ארצית
        </li>
        <li>
          <Check /> קהילת מתווכים שמביאה קונים מכל הארץ
        </li>
        <li>
          <Check /> דוח שבועי למוכר, בלי לבקש
        </li>
      </ul>
      <div className="of-slide-me">
        <Avatar src={me.avatar} name={me.name} size={44} ring />
        <div>
          <b>{me.name}</b>
          <span>{me.title}</span>
        </div>
      </div>
    </div>,
  ]

  return (
    <>
      <div className="of-cols is-pitch">
        <section className="of-panel">
          <h2>בוחרים נכס מה-CRM</h2>
          <ul className="of-picks">
            {props.map((p) => (
              <li key={p.id}>
                <button className={p.id === pick ? 'is-on' : ''} onClick={() => (setPick(p.id), setStage('pick'))} aria-pressed={p.id === pick}>
                  <img src={asset(p.image ?? sampleFlat.image)} alt="" />
                  <span>
                    <b>{p.title}</b>
                    <small>
                      {p.area} <i /> {formatPriceShort(p.price)}
                    </small>
                  </span>
                </button>
              </li>
            ))}
          </ul>
          <button
            className="btn btn-gold btn-lg of-make"
            disabled={stage === 'busy'}
            onClick={() => {
              setStep(0)
              setStage('busy')
            }}
          >
            <WandSparkles /> {stage === 'ready' ? 'ליצור מחדש' : 'ליצור מצגת'}
          </button>
        </section>

        <section className="of-deck">
          {stage === 'pick' && (
            <div className="of-deck-empty">
              <Sparkles />
              <b>המצגת תופיע כאן</b>
              <small>בוחרים נכס ולוחצים "ליצור מצגת".</small>
            </div>
          )}
          {stage === 'busy' && (
            <ul className="of-deck-busy" aria-live="polite">
              {pitchSteps.map((s, i) => (
                <li key={s} className={i < step ? 'is-done' : i === step ? 'is-now' : ''}>
                  <span>{i < step ? <Check /> : <i />}</span>
                  {s}
                </li>
              ))}
            </ul>
          )}
          {stage === 'ready' && (
            <>
              <AnimatePresence mode="wait" initial={false}>
                <motion.div key={slide} className="of-deck-view" initial={{ opacity: 0, x: -24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 24 }} transition={{ duration: 0.3, ease: EASE }}>
                  {slides[slide]}
                </motion.div>
              </AnimatePresence>
              <div className="of-deck-nav">
                <button onClick={() => setSlide((s) => Math.max(0, s - 1))} disabled={slide === 0} aria-label="השקף הקודם">
                  <ArrowRight />
                </button>
                <span className="num">
                  שקף {slide + 1} מתוך {slides.length}
                </span>
                <button onClick={() => setSlide((s) => Math.min(slides.length - 1, s + 1))} disabled={slide === slides.length - 1} aria-label="השקף הבא">
                  <ArrowLeft />
                </button>
              </div>
            </>
          )}
        </section>
      </div>
      <Sim>הדמיה. בדמו אין מודל AI אמיתי, וההערכה אינה שמאות ואינה מבוססת על מקור מחירים אמיתי.</Sim>
    </>
  )
}

/* ================================================================ 4. growth and the mentor */
export function GrowthScreen() {
  const [done, setDone] = useState<number[]>([0])
  return (
    <>
      <div className="of-cols is-growth">
        <section className="of-panel">
          <h2>היעדים שלך</h2>
          <ul className="of-goals">
            {goals.map((g) => (
              <li key={g.id}>
                <span className="of-ring" style={{ '--p': g.done / g.of } as CSSProperties}>
                  <b className="num">
                    {g.done}/{g.of}
                  </b>
                </span>
                <div>
                  <b>{g.label}</b>
                  <small>{g.done >= g.of ? 'הושג' : `עוד ${g.of - g.done} ליעד`}</small>
                </div>
              </li>
            ))}
          </ul>
          <h2 className="of-h2-gap">המשימות לשבוע</h2>
          <ul className="of-tasks">
            {weekTasks.map((t, i) => (
              <li key={t}>
                <label className={done.includes(i) ? 'is-done' : ''}>
                  <input type="checkbox" checked={done.includes(i)} onChange={() => setDone((d) => (d.includes(i) ? d.filter((x) => x !== i) : [...d, i]))} />
                  <span>{t}</span>
                </label>
              </li>
            ))}
          </ul>
        </section>

        <section className="of-panel">
          <div className="of-mentor">
            <span>
              <UserRound />
            </span>
            <div>
              <small>המנטור שלך</small>
              <b>שם ימולא בהמשך</b>
            </div>
          </div>
          <h2>יומן הליווי</h2>
          <ul className="of-cal">
            {sessions.map((s) => (
              <li key={s.id} className={s.next ? 'is-next' : ''}>
                <time>
                  <b>{s.day}</b>
                  <span className="num">{s.time}</span>
                </time>
                <div>
                  <b>{s.title}</b>
                  <small>{s.kind}</small>
                </div>
                {s.next && <em>הפגישה הבאה</em>}
              </li>
            ))}
          </ul>
        </section>
      </div>
      <Sim>נתוני דמו. היעדים, הפגישות והמנטור יוגדרו לכל חבר משרד.</Sim>
    </>
  )
}

/* ================================================================ 5. the deal manager */
export function DealScreen() {
  const { toast } = useStore()
  const [sign, setSign] = useState<'closed' | 'open' | 'done'>('closed')
  const signed = sign === 'done'
  return (
    <>
      <section className="of-panel of-deal-top">
        <img src={asset(sampleFlat.image)} alt="" />
        <div>
          <small>העסקה</small>
          <b>{sampleFlat.title}</b>
          <span>
            {sampleFlat.area} <i /> {formatPriceShort(sampleFlat.price)}
          </span>
        </div>
        <div className="of-deal-who">
          <span>
            <UserRound />
          </span>
          <div>
            <small>מנהלת העסקה, מצוות המשרד</small>
            <b>שם ימולא בהמשך</b>
          </div>
        </div>
      </section>

      <ol className="of-line">
        {dealSteps.map((s, i) => {
          const state = s.id === 'sign' && signed ? 'done' : s.state
          return (
            <li key={s.id} className={`is-${state}`} style={{ '--i': i } as CSSProperties}>
              <span>{state === 'done' ? <Check /> : <b className="num">{i + 1}</b>}</span>
              <div>
                <b>{s.label}</b>
                <small>{s.id === 'sign' && signed ? 'נחתם, בדמו' : s.note}</small>
              </div>
            </li>
          )
        })}
      </ol>

      <div className="of-cols is-deal">
        <section className="of-panel">
          <h2>המסמכים</h2>
          <ul className="of-docs">
            {dealDocs.map((d) => (
              <li key={d.label} className={d.state === 'התקבל' ? 'is-ok' : ''}>
                <span>{d.state === 'התקבל' ? <Check /> : <Clock />}</span>
                <b>{d.label}</b>
                <em>{d.state}</em>
              </li>
            ))}
          </ul>
        </section>
        <section className="of-panel of-sign">
          <h2>חתימה דיגיטלית</h2>
          <p>כשהטיוטה מאושרת, הצדדים חותמים מרחוק, והמשרד מלווה עד הסוף.</p>
          <button className="btn btn-gold btn-lg" disabled={signed} onClick={() => setSign('open')}>
            {signed ? (
              <>
                <Check /> נחתם, בדמו
              </>
            ) : (
              <>
                <PenLine /> לנסות חתימה דיגיטלית
              </>
            )}
          </button>
          <small>
            <ShieldCheck /> החוזים דורשים אישור עורך דין. לחתימה בדמו אין תוקף משפטי.
          </small>
        </section>
      </div>
      <Sim>הדמיה. אין כאן הסכם אמיתי, ואין חיבור לשירות חתימה דיגיטלית.</Sim>

      <Modal open={sign === 'open'} onClose={() => setSign('closed')} title="חתימה דיגיטלית" subtitle="סימולציה. אין לזה תוקף משפטי.">
        <div className="modal-body of-signer">
          <div className="of-sign-doc">
            <b>הסכם מכר, טיוטה לדוגמה</b>
            <i />
            <i />
            <i className="is-short" />
          </div>
          <div className="of-sign-pad">
            <svg viewBox="0 0 320 90" aria-hidden>
              <path pathLength={1} d="M18 62 C40 20, 58 20, 62 50 S 84 82, 100 44 S 122 18, 136 52 S 160 74, 176 40 S 204 24, 222 54 S 262 66, 302 38" />
            </svg>
            <small>חתימת הקונה</small>
          </div>
          <button
            className="btn btn-gold btn-lg"
            onClick={() => {
              setSign('done')
              toast('נחתם בדמו. בגרסה אמיתית נדרש אישור עורך דין')
            }}
          >
            <Check /> לאשר חתימה, בדמו
          </button>
          <p className="of-sign-law">ממשק דמו בלבד. חוזים וחתימה דיגיטלית דורשים אישור עורך דין לפני גרסה אמיתית.</p>
        </div>
      </Modal>
    </>
  )
}

/* ================================================================ 6. the assistant on the landing page */
export function AssistantScreen() {
  const [shown, setShown] = useState(1)
  const [typing, setTyping] = useState(false)
  const [slot, setSlot] = useState<string | null>(null)
  const [run, setRun] = useState(0)
  const end = useRef<HTMLDivElement>(null)

  // the scripted lines arrive one by one, each after a moment of "typing"
  useEffect(() => {
    if (shown >= chatScript.length) return
    setTyping(true)
    const t = window.setTimeout(() => {
      setTyping(false)
      setShown((n) => n + 1)
    }, 1500)
    return () => window.clearTimeout(t)
  }, [shown, run])
  useEffect(() => {
    end.current?.scrollIntoView({ block: 'nearest' })
  }, [shown, typing, slot])

  const lines = chatScript.slice(0, shown)
  const next = chatScript[shown]
  const again = () => {
    setSlot(null)
    setShown(1)
    setRun((r) => r + 1)
  }
  return (
    <>
      <div className="of-cols is-chat">
        <section className="of-chat">
          <header>
            <img src={asset(sampleFlat.image)} alt="" />
            <div>
              <b>{sampleFlat.title}</b>
              <small>דף הנחיתה של {brokerById(CURRENT_BROKER_ID).name}</small>
            </div>
          </header>
          <div className="of-chat-body" aria-live="polite">
            <p className="of-chat-day">העוזר של הדף, פעיל 24/7</p>
            {lines.map((l, i) => (
              <div key={`${run}-${i}`} className={`of-bubble is-${l.from}`}>
                <p>{l.text}</p>
                {l.slots && (
                  <div className="of-slots">
                    {l.slots.map((s) => (
                      <button key={s} className={slot === s ? 'is-on' : ''} disabled={!!slot} onClick={() => setSlot(s)}>
                        {s}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {slot && (
              <>
                <div className="of-bubble is-lead">
                  <p>{slot}, מתאים.</p>
                </div>
                <div className="of-bubble is-bot">
                  <p>
                    נקבע: {slot}. שלחתי ל{brokerById(CURRENT_BROKER_ID).name.split(' ')[0]} את הפרטים שלכם, ותקבלו ממנה אישור.
                  </p>
                </div>
              </>
            )}
            {typing && next && (
              <div className={`of-bubble is-${next.from} is-typing`} aria-label="מקליד">
                <i />
                <i />
                <i />
              </div>
            )}
            <div ref={end} />
          </div>
          <footer>
            <span>{shown >= chatScript.length && !slot ? 'בחרו מועד כדי לראות איך נקבעת פגישה' : 'כתבו הודעה...'}</span>
            <button onClick={again} aria-label="להפעיל שוב">
              <RotateCcw /> שוב
            </button>
          </footer>
        </section>

        <section className="of-panel of-got">
          <h2>מה אתם מקבלים</h2>
          <div className={`of-got-card${slot ? ' is-on' : ''}`}>
            <span>
              <UserRound />
            </span>
            <div>
              <b>ליד חדש מדף הנחיתה</b>
              <small>{slot ? 'מתעניין בדירה בכפר גנים, מעוניין בביקור' : 'ממתין לשיחה'}</small>
            </div>
          </div>
          <div className={`of-got-card${slot ? ' is-on' : ''}`}>
            <span>
              <CalendarCheck />
            </span>
            <div>
              <b>פגישה ביומן</b>
              <small>{slot ? `ביקור בנכס, ${slot}` : 'תיקבע כשהליד יבחר מועד'}</small>
            </div>
          </div>
          <p className="of-got-note">העוזר עונה לפי פרטי הנכס שבדף, ומעביר אליכם רק ליד עם מועד.</p>
        </section>
      </div>
      <Sim>צ'אט מדומה עם תסריט קבוע. בדמו אין מודל AI אמיתי.</Sim>
    </>
  )
}

/* ================================================================ 7. members' benefits */
export function BenefitsScreen() {
  const { toast } = useStore()
  const [want, setWant] = useState<string[]>([])
  return (
    <>
      <div className="of-soon">
        <span>בהקמה</span>
        <p>ההטבות עוד נסגרות מול הספקים. בינתיים אפשר לסמן מה מעניין אתכם, ונעדכן כשזה ייפתח.</p>
      </div>
      <ul className="of-benefits">
        {benefits.map((b) => {
          const on = want.includes(b.id)
          return (
            <li key={b.id} className={on ? 'is-on' : ''}>
              <em>בהקמה</em>
              <b>{b.title}</b>
              <p>{b.text}</p>
              <button
                className={`btn ${on ? 'btn-gold' : 'btn-ghost'} btn-sm`}
                aria-pressed={on}
                onClick={() => {
                  setWant((w) => (on ? w.filter((x) => x !== b.id) : [...w, b.id]))
                  if (!on) toast('סימנו. נעדכן כשההטבה תיפתח, בדמו')
                }}
              >
                {on ? (
                  <>
                    <Check /> מעניין אותי
                  </>
                ) : (
                  'מעניין אותי'
                )}
              </button>
            </li>
          )
        })}
      </ul>
      <Sim>ההטבות בהקמה: אין עדיין ספקים, מחירים או תנאים.</Sim>
    </>
  )
}

/* ================================================================ 8. the verified mark */
export function BadgeScreen() {
  const me = brokerById(CURRENT_BROKER_ID)
  // a list of matches as an office member sees it: office members first
  const order = [me, ...brokers.filter((b) => OFFICE_BROKER_IDS.includes(b.id)).slice(0, 1), ...brokers.filter((b) => b.id !== me.id && !OFFICE_BROKER_IDS.includes(b.id)).slice(0, 2)]
  return (
    <>
      <div className="of-cols is-badge">
        <section className="of-panel of-id">
          <Avatar src={me.avatar} name={me.name} size={92} ring />
          <b>
            {me.name}
            <em className="ms-badge">
              <BadgeCheck /> חבר משרד
            </em>
          </b>
          <span>{me.title}</span>
          <ul className="of-done">
            <li>
              <Check /> ליד השם בפיד הקהילה
            </li>
            <li>
              <Check /> בכרטיס שלכם באינדקס המתווכים
            </li>
            <li>
              <Check /> בהתאמות ובבקשות בוערות
            </li>
          </ul>
        </section>

        <section className="of-panel">
          <h2>עדיפות בהתאמות</h2>
          <p className="of-panel-sub">כשנכס מתאים לכמה מתווכים, חברי המשרד מקבלים את ההתאמה ראשונים.</p>
          <ol className="of-order">
            {order.map((b, i) => {
              const office = b.id === me.id || OFFICE_BROKER_IDS.includes(b.id)
              return (
                <li key={b.id} className={office ? 'is-office' : ''} style={{ '--i': i } as CSSProperties}>
                  <b className="num">{i + 1}</b>
                  <Avatar src={b.avatar} name={b.name} size={40} />
                  <div>
                    <strong>
                      {b.name}
                      {office && (
                        <em className="ms-badge">
                          <BadgeCheck /> חבר משרד
                        </em>
                      )}
                    </strong>
                    <small>{b.area}</small>
                  </div>
                  <span>{office ? 'מקבל ראשון' : 'אחרי חברי המשרד'}</span>
                </li>
              )
            })}
          </ol>
        </section>
      </div>
      <Sim>נתוני דמו. התג מוצג בדמו לך ולכמה מתווכים לדוגמה.</Sim>
    </>
  )
}
