import { useEffect, useRef, useState } from 'react'
import type { FormEvent, ReactElement } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ArrowLeft, LoaderCircle, Lock, LogOut, MailCheck, ShieldCheck, X } from 'lucide-react'
import { COMMUNITY_HOME, COMMUNITY_JOIN, COMMUNITY_NAME } from '../config/community'
import CommunityBrand from '../community/CommunityBrand'
import { asMember, call, demo, go, hasAccess, recheck, session, sessionActions } from './session'
import type { MemberInfo, StaffInfo } from './session'
import '../styles/join-green.css'
import '../styles/auth.css'

function Frame({ children, end }: { children: React.ReactNode; end?: React.ReactNode }) {
  return (
    <div className="au">
      <header className="jc-top">
        <Link to={COMMUNITY_HOME} className="kh-brand" aria-label={`${COMMUNITY_NAME}, דף הקהילה`}>
          <CommunityBrand />
        </Link>
        <div className="jc-top-end">
          {end}
        </div>
      </header>
      <main className="au-main is-narrow">{children}</main>
    </div>
  )
}

/** Signing in: the broker writes his e-mail and gets a link. No passwords. */
export function Login() {
  const [email, setEmail] = useState('')
  const [state, setState] = useState<'form' | 'busy' | 'sent'>('form')
  const [error, setError] = useState('')
  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    if (!/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(email.trim())) return setError('כתובת המייל לא נראית תקינה. למשל: name@example.com')
    setState('busy')
    const r = await call('/api/login', { method: 'POST', body: { email } })
    if (r.ok) return setState('sent')
    setState('form')
    setError(r.data.error ?? 'משהו השתבש. נסו שוב בעוד רגע.')
  }
  return (
    <Frame
      end={
        <Link to={COMMUNITY_JOIN} className="jo-free">
          עוד לא נרשמתם? הרשמה
        </Link>
      }
    >
      {state === 'sent' ? (
        <section className="au-card au-wait" data-state="sent" aria-live="polite">
          <span className="au-mark">
            <MailCheck />
          </span>
          <h1>בדקו את המייל</h1>
          <p className="au-lead">
            אם הכתובת <bdi dir="ltr">{email.trim()}</bdi> רשומה ומאושרת, שלחנו אליה קישור כניסה.
          </p>
          <p className="au-note">הקישור בתוקף ל-30 דקות ופועל פעם אחת. לא הגיע? בדקו בתיקיית הספאם, או שהבקשה שלכם עדיין ממתינה לאישור.</p>
          <div className="au-actions">
            <button type="button" className="au-link" onClick={() => setState('form')}>
              לשלוח שוב, או לכתובת אחרת
            </button>
          </div>
        </section>
      ) : (
        <form className="au-card" onSubmit={submit} noValidate>
          <span className="au-kicker">כניסה לחברים</span>
          <h1>כניסה לקהילה</h1>
          <p className="au-lead">כותבים את המייל שנרשמתם איתו, ומקבלים קישור כניסה. בלי סיסמה.</p>
          <label className="au-field">
            <span>מייל</span>
            <input className="input ltr" data-f="email" type="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" autoFocus aria-invalid={!!error} />
            {error && (
              <em className="au-err" role="alert">
                {error}
              </em>
            )}
          </label>
          <div className="au-actions">
            <button className="btn btn-gold btn-lg" type="submit" disabled={state === 'busy'} data-act="login">
              {state === 'busy' ? (
                <>
                  <LoaderCircle className="au-spin" /> שולחים
                </>
              ) : (
                <>
                  שלחו לי קישור כניסה <ArrowLeft />
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </Frame>
  )
}

/** The link from the e-mail lands here: it is traded for a session, once, and the broker goes in. */
export function Enter() {
  const [params] = useSearchParams()
  const [error, setError] = useState('')
  const started = useRef(false)
  useEffect(() => {
    if (started.current) return
    started.current = true
    const token = params.get('t') ?? ''
    if (!token) return setError('הקישור לא תקין.')
    ;(async () => {
      const r = await call<{ token: string; member: MemberInfo | null; staff: StaffInfo | null }>('/api/session', { method: 'POST', body: { token }, token: '' })
      if (!r.ok) return setError(r.data.error ?? 'אי אפשר להיכנס עם הקישור הזה.')
      sessionActions.save({ token: r.data.token, member: r.data.member, staff: r.data.staff })
      // a full reload: the app then opens as this broker, with his own area
      go(r.data.member ? '/app/community' : '/kehila/admin')
    })()
  }, [params])
  return (
    <Frame>
      {error ? (
        <section className="au-card au-wait" data-state="enter-failed" role="alert">
          <span className="au-mark is-grey">
            <X />
          </span>
          <h1>הכניסה לא הצליחה</h1>
          <p className="au-lead">{error}</p>
          <div className="au-actions">
            <Link to="/kehila/login" className="btn btn-gold btn-lg">
              לבקש קישור כניסה חדש <ArrowLeft />
            </Link>
          </div>
        </section>
      ) : (
        <section className="au-card au-wait" data-state="entering" aria-live="polite">
          <span className="au-mark">
            <LoaderCircle className="au-spin" />
          </span>
          <h1>נכנסים...</h1>
        </section>
      )}
    </Frame>
  )
}

/** The door of the community's screens: an approved broker, staff, or a presentation of the demo. */
export function AppGuard({ children }: { children: ReactElement }) {
  useEffect(() => {
    // the server has the last word on a remembered session
    if (session && !demo) recheck()
  }, [])
  if (hasAccess) return children
  return (
    <Frame>
      <section className="au-card au-wait" data-state="locked">
        <span className="au-mark">
          <Lock />
        </span>
        <h1>הקהילה פתוחה למתווכים שאושרו</h1>
        <p className="au-lead">נרשמים, הצוות שלנו מאשר, ואז מקבלים מייל עם כניסה.</p>
        <div className="au-actions">
          <Link to={COMMUNITY_JOIN} className="btn btn-gold btn-lg">
            הרשמה לקהילה <ArrowLeft />
          </Link>
          <Link to="/kehila/login" className="btn btn-ghost btn-lg">
            כבר אושרתם? כניסה
          </Link>
        </div>
      </section>
    </Frame>
  )
}

/** The link for presentations: opens the old open demo, with the example user. */
export function DemoStart() {
  useEffect(() => {
    sessionActions.startDemo()
  }, [])
  return (
    <Frame>
      <section className="au-card au-wait" data-state="demo">
        <span className="au-mark">
          <LoaderCircle className="au-spin" />
        </span>
        <h1>פותחים את ההדגמה...</h1>
      </section>
    </Frame>
  )
}

/** In the app's top bar, for a signed-in broker or staff: who is signed in, the way to the approvers' screen, and out. */
export function AccountChip() {
  if (demo || !session) return null
  const name = asMember?.name ?? session.staff?.name ?? ''
  return (
    <div className="au-chip" data-account={asMember ? 'member' : 'staff'}>
      {session.staff && (
        <Link to="/kehila/admin" className="au-chip-admin" title="מסך הניהול">
          <ShieldCheck />
          <span>ניהול</span>
        </Link>
      )}
      <span className="au-chip-name">{name}</span>
      <button type="button" onClick={() => sessionActions.signOut()} aria-label="יציאה מהחשבון" title="יציאה">
        <LogOut />
      </button>
    </div>
  )
}
