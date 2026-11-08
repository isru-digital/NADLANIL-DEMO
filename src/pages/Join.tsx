import { useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeft, ArrowRight, Building2, Check, Handshake, Home, LayoutTemplate, Radar, ShieldCheck, User } from 'lucide-react'
import { CURRENT_BROKER_ID, PLATFORM_NAME, PLATFORM_TAGLINE, asset } from '../config'
import { brokerById, cities, whyCommunity } from '../data/demo'
import type { CrmItem } from '../data/demo'
import { useStore } from '../store'
import { BackButton, DemoTag, EASE, Logo } from '../components/ui'
import '../styles/join.css'
import '../styles/topics.css'

const steps = ['הפרטים שלך', 'על הקהילה', 'הערים שלך', 'הנכס הראשון', 'הדף העסקי שלך']
const whyIcons = [Radar, Handshake, ShieldCheck]

type Office = 'office' | 'solo'

/** Onboarding for a broker who just joined. Visual demo only: nothing is sent anywhere. */
export default function Join() {
  const navigate = useNavigate()
  const { myCities, setMyCities, addCrm, setBuilder, builder, setOnboarded, toast } = useStore()
  const persona = brokerById(CURRENT_BROKER_ID)
  const [step, setStep] = useState(0)
  const [dir, setDir] = useState(1)

  // step 1
  const [name, setName] = useState(persona.name)
  const [email, setEmail] = useState('maya@example.com')
  const [office, setOffice] = useState<Office | null>('solo')
  const [officeName, setOfficeName] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const nameRef = useRef<HTMLInputElement>(null)
  const emailRef = useRef<HTMLInputElement>(null)

  // step 4
  const [prop, setProp] = useState({ title: 'דירת 3 חדרים עם מרפסת', city: 'תל אביב', rooms: '3', price: '3450000' })
  const [added, setAdded] = useState(false)

  const go = (i: number) => {
    setDir(i > step ? 1 : -1)
    setStep(i)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const submitDetails = (e: FormEvent) => {
    e.preventDefault()
    const next: Record<string, string> = {}
    if (name.trim().length < 2) next.name = 'צריך שם מלא כדי שמתווכים אחרים יכירו אתכם.'
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) next.email = 'כתובת האימייל לא נראית תקינה. למשל: name@example.com'
    if (!office) next.office = 'בוחרים אחת משתי האפשרויות.'
    if (office === 'office' && officeName.trim().length < 2) next.officeName = 'מה שם המשרד?'
    setErrors(next)
    if (next.name) return nameRef.current?.focus()
    if (next.email) return emailRef.current?.focus()
    if (Object.keys(next).length === 0) go(1)
  }

  const addFirstProperty = () => {
    const id = `c-first-${Date.now()}`
    const item: CrmItem = {
      id,
      kind: 'property',
      title: prop.title.trim() || 'הנכס הראשון שלי',
      area: prop.city,
      city: prop.city,
      rooms: prop.rooms || '3',
      price: Number(prop.price) || 0,
      status: 'new',
      client: 'בעל הנכס',
      note: 'הנכס הראשון שעלה. אפשר לסמן עליו שת"פ ולפרסם בקהילה.',
      updated: 'נוסף עכשיו',
      image: 'img/prop-09.webp',
      sqm: 78,
    }
    addCrm(item)
    setBuilder({ propertyIds: [id, ...builder.propertyIds].slice(0, 3) })
    setAdded(true)
    toast('הנכס הראשון נוסף ל-CRM')
    go(4)
  }

  const finish = () => {
    setOnboarded(true)
    navigate('/app')
  }

  return (
    <div className="join grain">
      <header className="join-top">
        <div className="join-top-start">
          <BackButton fallback="/" className="is-icon" />
          <Link to="/" aria-label="דף הבית">
            <Logo size={28} withName />
          </Link>
        </div>
        <div className="join-top-end">
          <DemoTag />
          <Link to="/app" className="join-skip">
            דילוג לדמו
          </Link>
        </div>
      </header>

      <div className="join-progress" aria-hidden>
        <motion.i animate={{ scaleX: (step + 1) / steps.length }} transition={{ duration: 0.6, ease: EASE }} />
      </div>

      <main className="join-main">
        <ol className="join-steps" aria-label="שלבי ההצטרפות">
          {steps.map((s, i) => (
            <li key={s} className={i === step ? 'is-current' : i < step ? 'is-done' : ''}>
              <span className="num">{i < step ? <Check /> : i + 1}</span>
              {s}
            </li>
          ))}
        </ol>

        <AnimatePresence mode="wait" initial={false}>
          <motion.section
            key={step}
            className="join-card"
            initial={{ opacity: 0, x: dir * -40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: dir * 40 }}
            transition={{ duration: 0.34, ease: EASE }}
          >
            {step === 0 && (
              <form onSubmit={submitDetails} noValidate>
                <span className="eyebrow">ברוכים הבאים</span>
                <h1>נעים להכיר.</h1>
                <p className="join-lead">שלושה פרטים, וזהו. ההצטרפות בחינם.</p>

                <label className="field">
                  <span>
                    שם מלא <b aria-hidden>*</b>
                  </span>
                  <input
                    ref={nameRef}
                    className={`input${errors.name ? ' is-error' : ''}`}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    autoComplete="name"
                    aria-invalid={!!errors.name}
                    aria-describedby={errors.name ? 'err-name' : undefined}
                    required
                  />
                  {errors.name && (
                    <em id="err-name" role="alert">
                      {errors.name}
                    </em>
                  )}
                </label>

                <label className="field">
                  <span>
                    אימייל <b aria-hidden>*</b>
                  </span>
                  <input
                    ref={emailRef}
                    className={`input ltr${errors.email ? ' is-error' : ''}`}
                    type="email"
                    inputMode="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    aria-invalid={!!errors.email}
                    aria-describedby={errors.email ? 'err-email' : undefined}
                    required
                  />
                  {errors.email && (
                    <em id="err-email" role="alert">
                      {errors.email}
                    </em>
                  )}
                </label>

                <fieldset className="join-choice">
                  <legend>
                    איך אתם עובדים? <b aria-hidden>*</b>
                  </legend>
                  <div>
                    <button
                      type="button"
                      className={`choice${office === 'solo' ? ' is-on' : ''}`}
                      role="radio"
                      aria-checked={office === 'solo'}
                      onClick={() => setOffice('solo')}
                    >
                      <User />
                      <strong>עובדים לבד</strong>
                      <span>תיווך עצמאי</span>
                    </button>
                    <button
                      type="button"
                      className={`choice${office === 'office' ? ' is-on' : ''}`}
                      role="radio"
                      aria-checked={office === 'office'}
                      onClick={() => setOffice('office')}
                    >
                      <Building2 />
                      <strong>משרד תיווך</strong>
                      <span>חלק מצוות</span>
                    </button>
                  </div>
                  {errors.office && <em role="alert">{errors.office}</em>}
                </fieldset>

                <AnimatePresence initial={false}>
                  {office === 'office' && (
                    <motion.label
                      className="field"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.26, ease: EASE }}
                    >
                      <span>
                        שם המשרד <b aria-hidden>*</b>
                      </span>
                      <input
                        className={`input${errors.officeName ? ' is-error' : ''}`}
                        value={officeName}
                        onChange={(e) => setOfficeName(e.target.value)}
                        aria-invalid={!!errors.officeName}
                      />
                      {errors.officeName && <em role="alert">{errors.officeName}</em>}
                    </motion.label>
                  )}
                </AnimatePresence>

                <div className="join-actions">
                  <button className="btn btn-gold btn-lg">
                    המשך
                    <ArrowLeft />
                  </button>
                  <span className="join-note">בדמו שום פרט לא נשמר ולא נשלח.</span>
                </div>
              </form>
            )}

            {step === 1 && (
              <>
                <span className="eyebrow">על הקהילה</span>
                <h1>דקה אחת, לפני שמתחילים.</h1>
                <div className="why-grid">
                  {whyCommunity.map((w, i) => {
                    const Icon = whyIcons[i]
                    return (
                      <motion.div
                        key={w.title}
                        className="why"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.1 + i * 0.08, ease: EASE }}
                      >
                        <span className="icon-badge">
                          <Icon />
                        </span>
                        <h2>{w.title}</h2>
                        <p>{w.text}</p>
                      </motion.div>
                    )
                  })}
                </div>
                <StepNav onBack={() => go(0)} onNext={() => go(2)} />
              </>
            )}

            {step === 2 && (
              <>
                <span className="eyebrow">הערים שלך</span>
                <h1>איפה אתם עובדים?</h1>
                <p className="join-lead">בוחרים עיר אחת או כמה ערים. בקהילה יוצג רק מה שרלוונטי אליהן. אפשר לשנות בכל רגע.</p>
                <div className="city-grid join-cities">
                  {cities.map((c) => {
                    const on = myCities.includes(c)
                    return (
                      <button
                        key={c}
                        className={`city-opt${on ? ' is-on' : ''}`}
                        role="checkbox"
                        aria-checked={on}
                        onClick={() => setMyCities(on ? myCities.filter((x) => x !== c) : [...myCities, c])}
                      >
                        <span className="pick-check">{on && <Check />}</span>
                        {c}
                      </button>
                    )
                  })}
                </div>
                <StepNav
                  onBack={() => go(1)}
                  onNext={() => go(3)}
                  nextLabel={myCities.length === 0 ? 'המשך עם כל הארץ' : `המשך עם ${myCities.length} ערים`}
                />
              </>
            )}

            {step === 3 && (
              <>
                <span className="eyebrow">הנכס הראשון</span>
                <h1>מעלים נכס אחד, ומתחילים.</h1>
                <p className="join-lead">
                  נכס אחד מספיק כדי להתחיל לקבל פניות ממתווכים באזור. הוא נכנס ל-CRM שלכם, ורק אתם מחליטים אם לפתוח אותו
                  לשיתוף פעולה.
                </p>
                <div className="first-prop">
                  <div className="first-prop-photo">
                    <img src={asset('img/prop-09.webp')} alt="" />
                    <span>תמונה לדוגמה</span>
                  </div>
                  <div className="first-prop-fields">
                    <label className="field">
                      <span>כותרת הנכס</span>
                      <input className="input" value={prop.title} onChange={(e) => setProp({ ...prop, title: e.target.value })} />
                    </label>
                    <div className="field-row3">
                      <label className="field">
                        <span>עיר</span>
                        <select className="input" value={prop.city} onChange={(e) => setProp({ ...prop, city: e.target.value })}>
                          {cities.map((c) => (
                            <option key={c}>{c}</option>
                          ))}
                        </select>
                      </label>
                      <label className="field">
                        <span>חדרים</span>
                        <input
                          className="input num"
                          inputMode="decimal"
                          value={prop.rooms}
                          onChange={(e) => setProp({ ...prop, rooms: e.target.value })}
                        />
                      </label>
                      <label className="field">
                        <span>מחיר בשקלים</span>
                        <input
                          className="input num"
                          inputMode="numeric"
                          value={prop.price}
                          onChange={(e) => setProp({ ...prop, price: e.target.value.replace(/\D/g, '') })}
                        />
                      </label>
                    </div>
                  </div>
                </div>
                <div className="join-actions">
                  <button className="btn btn-quiet" onClick={() => go(2)}>
                    <ArrowRight />
                    חזרה
                  </button>
                  <button className="btn btn-ghost" onClick={() => go(4)}>
                    אעלה אחר כך
                  </button>
                  <button className="btn btn-gold btn-lg" onClick={addFirstProperty}>
                    <Home />
                    העלאת הנכס
                  </button>
                </div>
              </>
            )}

            {step === 4 && (
              <>
                <span className="eyebrow">הדף העסקי שלך</span>
                <h1>הדף האישי שלכם כבר מוכן.</h1>
                <p className="join-lead">
                  יצרנו עבורכם דף עסקי אישי באופן אוטומטי, {added ? 'כולל הנכס שהעליתם עכשיו' : 'והנכסים שתעלו יופיעו בו'}. אפשר לערוך אותו
                  ולהחליף תבנית בכל רגע.
                </p>
                <div className="page-ready">
                  <div className="page-ready-shot">
                    <img src={asset('img/prop-01.webp')} alt="" />
                    <div>
                      <span>{persona.title}</span>
                      <strong>{name.trim() || persona.name}</strong>
                    </div>
                  </div>
                  <ul>
                    <li>
                      <Check />
                      כתובת אישית לשיתוף עם לקוחות
                    </li>
                    <li>
                      <Check />
                      הנכסים מתעדכנים מה-CRM
                    </li>
                    <li>
                      <Check />
                      שלוש תבניות לבחירה
                    </li>
                  </ul>
                </div>
                <div className="join-actions">
                  <Link to="/b/demo" className="btn btn-ghost">
                    <LayoutTemplate />
                    צפייה בדף שלי
                  </Link>
                  <button className="btn btn-gold btn-lg" onClick={finish}>
                    כניסה לקהילה
                    <ArrowLeft />
                  </button>
                </div>
              </>
            )}
          </motion.section>
        </AnimatePresence>
      </main>

      <footer className="join-foot">
        <span>
          {PLATFORM_NAME} · {PLATFORM_TAGLINE.join(' · ')}
        </span>
      </footer>
    </div>
  )
}

function StepNav({ onBack, onNext, nextLabel = 'המשך' }: { onBack: () => void; onNext: () => void; nextLabel?: string }) {
  return (
    <div className="join-actions">
      <button className="btn btn-quiet" onClick={onBack}>
        <ArrowRight />
        חזרה
      </button>
      <button className="btn btn-gold btn-lg" onClick={onNext}>
        {nextLabel}
        <ArrowLeft />
      </button>
    </div>
  )
}
