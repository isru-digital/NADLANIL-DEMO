import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, BadgeCheck, Building2, Check, Info, LoaderCircle, Lock, MailCheck, Plus, User, X } from 'lucide-react'
import { COMMUNITY_HOME, COMMUNITY_NAME } from '../config/community'
import { cities as knownCities } from '../data/demo'
import CommunityBrand from '../community/CommunityBrand'
import { call, pending } from './session'
import '../styles/join-green.css'
import '../styles/auth.css'

/**
 * Asking to join the community, for real: the form goes to the server, an approver gets an e-mail, and until he
 * says yes the broker cannot enter. Every field is required.
 */
type Fields = 'name' | 'phone' | 'email' | 'license' | 'work' | 'office_name' | 'cities' | 'areas'
const ORDER: Fields[] = ['license', 'name', 'phone', 'email', 'work', 'office_name', 'cities', 'areas']

export default function SignUp() {
  // "להרשמה מחדש" in the rejection e-mail opens the form even on the device that still shows the waiting screen,
  // with the name and address it remembers already filled in
  const [again] = useState(() => new URLSearchParams(window.location.search).has('again'))
  const [before] = useState(() => (again ? pending.get() : null))
  const [waiting, setWaiting] = useState(() => (again ? null : pending.get()))
  const [name, setName] = useState(before?.name ?? '')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState(before?.email ?? '')
  const [license, setLicense] = useState('')
  const [work, setWork] = useState<'office' | 'solo' | ''>('')
  const [officeName, setOfficeName] = useState('')
  const [cities, setCities] = useState<string[]>([])
  const [other, setOther] = useState('')
  const [areas, setAreas] = useState('')
  const [errors, setErrors] = useState<Partial<Record<Fields, string>>>({})
  const [busy, setBusy] = useState(false)
  const [failure, setFailure] = useState('')
  const form = useRef<HTMLFormElement>(null)
  // the licence number, looked up by the server in the Registrar of Real Estate Brokers (24.11.2026): once found, the
  // full name is the registry's and cannot be typed over. Not found: a soft word, and the request goes to a check by hand
  const [lic, setLic] = useState<{ state: 'idle' | 'checking' | 'verified' | 'not_found' | 'unavailable'; of: string; name?: string }>({ state: 'idle', of: '' })
  const digits = license.replace(/[\s-]/g, '')
  useEffect(() => {
    if (!/^\d{4,10}$/.test(digits)) {
      setLic((old) => {
        // the number changed after a name came from the registry: the name goes with it
        if (old.state === 'verified') setName('')
        return { state: 'idle', of: '' }
      })
      return
    }
    if (lic.of === digits && lic.state !== 'idle') return
    let gone = false
    const t = window.setTimeout(async () => {
      setLic({ state: 'checking', of: digits })
      const r = await call<{ status: 'verified' | 'not_found' | 'unavailable'; name?: string }>('/api/license', { method: 'POST', body: { license: digits } })
      if (gone) return
      if (r.ok && r.data.status === 'verified' && r.data.name) {
        setLic({ state: 'verified', of: digits, name: r.data.name })
        setName(r.data.name)
      } else {
        setLic((old) => {
          if (old.state === 'verified') setName('')
          return { state: r.ok && r.data.status === 'not_found' ? 'not_found' : 'unavailable', of: digits }
        })
      }
    }, 550)
    return () => {
      gone = true
      window.clearTimeout(t)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [digits])
  const locked = lic.state === 'verified' && lic.of === digits

  useEffect(() => {
    if (again) pending.set(null)
  }, [again])

  useEffect(() => {
    const prev = document.title
    document.title = `הרשמה | ${COMMUNITY_NAME}`
    window.scrollTo({ top: 0 })
    return () => {
      document.title = prev
    }
  }, [])

  const toggle = (c: string) => setCities((list) => (list.includes(c) ? list.filter((x) => x !== c) : [...list, c]))
  const addOther = () => {
    const c = other.replace(/\s+/g, ' ').trim()
    if (c.length < 2) return
    setCities((list) => (list.includes(c) ? list : [...list, c]))
    setOther('')
  }

  const check = (): Partial<Record<Fields, string>> => {
    const e: Partial<Record<Fields, string>> = {}
    if (name.trim().length < 2) e.name = 'צריך שם מלא.'
    if (phone.replace(/\D/g, '').length < 9) e.phone = 'מספר הטלפון קצר מדי. למשל: 050-1234567'
    if (!/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(email.trim())) e.email = 'כתובת המייל לא נראית תקינה. למשל: name@example.com'
    if (!/^\d{4,10}$/.test(license.replace(/[\s-]/g, ''))) e.license = 'מספר רישיון תיווך הוא ספרות בלבד.'
    if (!work) e.work = 'בוחרים אחת משתי האפשרויות.'
    if (work === 'office' && officeName.trim().length < 2) e.office_name = 'מה שם המשרד?'
    if (cities.length === 0) e.cities = 'בוחרים לפחות עיר אחת.'
    return e
  }
  // an error goes away as soon as its field is put right, without waiting for the next press on the button
  useEffect(() => {
    setErrors((old) => {
      const keys = Object.keys(old) as Fields[]
      if (!keys.length) return old
      const now = check()
      const left = keys.filter((k) => now[k])
      return left.length === keys.length ? old : Object.fromEntries(left.map((k) => [k, old[k]]))
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name, phone, email, license, work, officeName, cities, areas])

  const focusFirst = (e: Partial<Record<Fields, string>>) => {
    const first = ORDER.find((f) => e[f])
    if (first) form.current?.querySelector<HTMLElement>(`[data-f="${first}"]`)?.focus()
  }

  const submit = async (ev: FormEvent) => {
    ev.preventDefault()
    setFailure('')
    const e = check()
    setErrors(e)
    if (Object.keys(e).length) return focusFirst(e)
    setBusy(true)
    const r = await call<{ name: string }>('/api/register', { method: 'POST', body: { name, phone, email, license, work, office_name: officeName, cities, areas } })
    setBusy(false)
    if (r.ok) {
      const w = { name: r.data.name ?? name.trim(), email: email.trim().toLowerCase() }
      pending.set(w)
      setWaiting(w)
      window.scrollTo({ top: 0 })
      return
    }
    if (r.data.fields) {
      setErrors(r.data.fields as Partial<Record<Fields, string>>)
      focusFirst(r.data.fields as Partial<Record<Fields, string>>)
    }
    setFailure(r.data.error ?? 'משהו השתבש. נסו שוב בעוד רגע.')
  }

  const err = (f: Fields) =>
    errors[f] ? (
      <em id={`err-${f}`} className="au-err" role="alert">
        {errors[f]}
      </em>
    ) : null
  const bad = (f: Fields) => ({ 'aria-invalid': !!errors[f], 'aria-describedby': errors[f] ? `err-${f}` : undefined })

  return (
    <div className="au">
      <header className="jc-top">
        <Link to={COMMUNITY_HOME} className="kh-brand" aria-label={`${COMMUNITY_NAME}, דף הקהילה`}>
          <CommunityBrand />
        </Link>
        <div className="jc-top-end">
          <Link to="/kehila/login" className="jo-free">
            כבר אושרתם? כניסה
          </Link>
        </div>
      </header>

      <main className="au-main">
        {waiting ? (
          <section className="au-card au-wait" data-state="waiting" aria-live="polite">
            <span className="au-mark">
              <MailCheck />
            </span>
            <h1>היי {waiting.name}, קיבלנו את הפרטים שלך ואנחנו בודקים אותם</h1>
            <p className="au-lead">אחרי אישור תקבל מייל עם אישור כניסה.</p>
            <p className="au-note">
              המייל יישלח אל <bdi dir="ltr">{waiting.email}</bdi>. עד האישור אי אפשר להיכנס לקהילה.
            </p>
            <div className="au-actions">
              <Link to={COMMUNITY_HOME} className="btn btn-ghost btn-lg">
                חזרה לדף הקהילה
              </Link>
              <button
                type="button"
                className="au-link"
                onClick={() => {
                  pending.set(null)
                  setWaiting(null)
                }}
              >
                נרשמתי עם פרטים לא נכונים, למלא מחדש
              </button>
            </div>
          </section>
        ) : (
          <form ref={form} className="au-card" onSubmit={submit} noValidate>
            <span className="au-kicker">הרשמה לקהילה, בחינם</span>
            <h1>מצטרפים ל{COMMUNITY_NAME}</h1>
            <p className="au-lead">ממלאים את הפרטים, והצוות שלנו מאשר כל מתווך. אחרי האישור מקבלים מייל עם כניסה.</p>

            <div className="au-grid">
              <label className="au-field">
                <span>
                  מספר רישיון תיווך <b aria-hidden>*</b>
                </span>
                <span className="au-lic">
                  <input className="input ltr" data-f="license" inputMode="numeric" value={license} onChange={(e) => setLicense(e.target.value.replace(/[^\d\s-]/g, ''))} autoComplete="off" required {...bad('license')} />
                  {lic.state === 'checking' && <LoaderCircle className="au-lic-spin" aria-hidden />}
                  {locked && <BadgeCheck className="au-lic-ok" aria-hidden />}
                </span>
                {err('license') ??
                  (lic.state === 'not_found' || lic.state === 'unavailable' ? (
                    <small className="au-lic-note" data-license="manual" role="status">
                      <Info aria-hidden />
                      {lic.state === 'not_found'
                        ? 'לא מצאנו את המספר במאגר רשם המתווכים. אפשר להמשיך, והצוות יבדוק את הבקשה ידנית.'
                        : 'המאגר של רשם המתווכים לא זמין כרגע. אפשר להמשיך, והצוות יבדוק את הבקשה ידנית.'}
                    </small>
                  ) : (
                    <small>השם המלא יתמלא לבד מתוך רשם המתווכים.</small>
                  ))}
              </label>
              <label className="au-field">
                <span>
                  שם מלא <b aria-hidden>*</b>
                </span>
                <span className={`au-lic${locked ? ' is-locked' : ''}`}>
                  <input className="input" data-f="name" value={name} onChange={(e) => setName(e.target.value)} readOnly={locked} aria-readonly={locked} autoComplete="name" required {...bad('name')} />
                  {locked && <Lock className="au-lic-ok" aria-hidden />}
                </span>
                {err('name') ??
                  (locked ? (
                    <small className="au-lic-src" data-license="verified" role="status">
                      <BadgeCheck aria-hidden />
                      אומת מול רשם המתווכים. מקור: משרד המשפטים, data.gov.il
                    </small>
                  ) : null)}
              </label>
              <label className="au-field">
                <span>
                  טלפון <b aria-hidden>*</b>
                </span>
                <input className="input ltr" data-f="phone" type="tel" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="tel" required {...bad('phone')} />
                {err('phone')}
              </label>
              <label className="au-field">
                <span>
                  מייל <b aria-hidden>*</b>
                </span>
                <input className="input ltr" data-f="email" type="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required {...bad('email')} />
                {err('email')}
                <small>לכתובת הזו יישלח אישור הכניסה.</small>
              </label>
            </div>

            <fieldset className="au-field">
              <legend>
                עובדים במשרד או עצמאים? <b aria-hidden>*</b>
              </legend>
              <div className="au-choice" role="radiogroup" aria-label="עובדים במשרד או עצמאים">
                <button type="button" role="radio" aria-checked={work === 'office'} className={work === 'office' ? 'is-on' : ''} data-f="work" data-v="office" onClick={() => setWork('office')}>
                  <Building2 />
                  <strong>במשרד</strong>
                </button>
                <button type="button" role="radio" aria-checked={work === 'solo'} className={work === 'solo' ? 'is-on' : ''} data-v="solo" onClick={() => setWork('solo')}>
                  <User />
                  <strong>עצמאי</strong>
                </button>
              </div>
              {err('work')}
            </fieldset>
            {work === 'office' && (
              <label className="au-field">
                <span>
                  שם המשרד <b aria-hidden>*</b>
                </span>
                <input className="input" data-f="office_name" value={officeName} onChange={(e) => setOfficeName(e.target.value)} autoComplete="organization" required {...bad('office_name')} />
                {err('office_name')}
              </label>
            )}

            <fieldset className="au-field">
              <legend>
                ערים שאתם עובדים בהן <b aria-hidden>*</b>
              </legend>
              <div className="au-cities" role="group" aria-label="ערים">
                {[...knownCities, ...cities.filter((c) => !knownCities.includes(c))].map((c, i) => {
                  const on = cities.includes(c)
                  return (
                    <button key={c} type="button" role="checkbox" aria-checked={on} className={on ? 'is-on' : ''} data-f={i === 0 ? 'cities' : undefined} data-city={c} onClick={() => toggle(c)}>
                      {on ? <Check /> : <Plus />}
                      {c}
                    </button>
                  )
                })}
              </div>
              <div className="au-other">
                <input
                  className="input"
                  value={other}
                  onChange={(e) => setOther(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      addOther()
                    }
                  }}
                  placeholder="עיר אחרת"
                  aria-label="עיר אחרת"
                  data-f="other-city"
                />
                <button type="button" className="btn btn-ghost" onClick={addOther}>
                  הוספה
                </button>
              </div>
              {err('cities')}
            </fieldset>

            <label className="au-field">
              {/* the neighbourhoods are optional, the city above is what is required (Itzik 18.11.2026) */}
              <span>
                שכונות ואזורים <em className="au-opt">רשות</em>
              </span>
              <input className="input" data-f="areas" value={areas} onChange={(e) => setAreas(e.target.value)} placeholder="למשל: כפר גנים, אם המושבות" />
              <small className="au-hint">אפשר להשאיר ריק ולהוסיף בהמשך.</small>
            </label>

            {failure && (
              <p className="au-fail" role="alert">
                <X /> {failure}
              </p>
            )}
            <div className="au-actions">
              <button className="btn btn-gold btn-lg" type="submit" disabled={busy} data-act="register">
                {busy ? (
                  <>
                    <LoaderCircle className="au-spin" /> שולחים את הבקשה
                  </>
                ) : (
                  <>
                    שליחת הבקשה <ArrowLeft />
                  </>
                )}
              </button>
              <span className="au-private">
                <Lock /> הפרטים נשמרים בשרת מאובטח, ורק צוות האישור של הקהילה רואה אותם.
              </span>
            </div>
          </form>
        )}
      </main>
    </div>
  )
}
