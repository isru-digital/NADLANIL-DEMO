import { useEffect, useRef, useState } from 'react'
import type { FormEvent, ReactElement } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Check, LoaderCircle, Lock, LogOut, MailCheck, ShieldCheck, X } from 'lucide-react'
import { COMMUNITY_HOME, COMMUNITY_JOIN, COMMUNITY_NAME } from '../config/community'
import CommunityBrand from '../community/CommunityBrand'
import CodeBoxes from './CodeBoxes'
import { runningAsApp } from '../pwa/pwa'
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

/**
 * Signing in: the broker writes his e-mail and gets a mail with a 6-digit code and a link (Itzik 18.11.2026). The code
 * is typed right here, so signing in works inside the app on a phone's home screen too, where a link from the mail
 * would open in the browser instead. No passwords.
 */
const CODE_MINUTES = 10
const RESEND_S = 30
const clock = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

export function Login() {
  const [email, setEmail] = useState('')
  const [state, setState] = useState<'form' | 'busy' | 'sent'>('form')
  const [error, setError] = useState('')
  const ask = async () => {
    const r = await call('/api/login', { method: 'POST', body: { email } })
    return r.ok ? '' : (r.data.error ?? 'משהו השתבש. נסו שוב בעוד רגע.')
  }
  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    if (!/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(email.trim())) return setError('כתובת המייל לא נראית תקינה. למשל: name@example.com')
    setState('busy')
    const err = await ask()
    if (!err) return setState('sent')
    setState('form')
    setError(err)
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
        <CodeStep email={email.trim()} resend={ask} other={() => setState('form')} />
      ) : (
        <form className="au-card" onSubmit={submit} noValidate>
          <span className="au-kicker">כניסה לחברים</span>
          <h1>כניסה לקהילה</h1>
          <p className="au-lead">כותבים את המייל שנרשמתם איתו, ומקבלים קוד כניסה. בלי סיסמה.</p>
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
                  שלחו לי קוד כניסה <ArrowLeft />
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </Frame>
  )
}

/** The second step: the code from the mail, a clock for how long it lives, and a new code when needed. */
function CodeStep({ email, resend, other }: { email: string; resend: () => Promise<string>; other: () => void }) {
  const [code, setCode] = useState('')
  const [state, setState] = useState<'idle' | 'busy' | 'wrong' | 'ok'>('idle')
  const [msg, setMsg] = useState('')
  const [dead, setDead] = useState(false)
  const [left, setLeft] = useState(CODE_MINUTES * 60)
  const [again, setAgain] = useState(RESEND_S)
  const [note, setNote] = useState('')

  // one clock for both: how long the code lives, and the pause before a new code can be asked for
  useEffect(() => {
    const t = window.setInterval(() => {
      setLeft((s) => Math.max(0, s - 1))
      setAgain((s) => Math.max(0, s - 1))
    }, 1000)
    return () => window.clearInterval(t)
  }, [])
  useEffect(() => {
    if (left === 0 && state !== 'ok') {
      setDead(true)
      setMsg(`הקוד פג אחרי ${CODE_MINUTES} דקות. בקשו קוד חדש.`)
    }
  }, [left, state])

  const check = async (v: string) => {
    if (state === 'busy' || state === 'ok' || dead) return
    setState('busy')
    setMsg('')
    setNote('')
    const r = await call<{ token: string; member: MemberInfo | null; staff: StaffInfo | null; error?: string; code?: string }>('/api/session', {
      method: 'POST',
      body: { email, code: v },
      token: '',
    })
    if (r.ok) {
      setState('ok')
      sessionActions.save({ token: r.data.token, member: r.data.member, staff: r.data.staff })
      // a moment to see it worked, then in: the app opens as this broker, with his own area
      window.setTimeout(() => go(r.data.member ? '/app/community' : '/kehila/admin'), 700)
      return
    }
    setState('wrong')
    setMsg(r.data.error ?? 'הקוד לא נכון. בודקים במייל ומנסים שוב.')
    if (['locked', 'expired', 'used'].includes(String(r.data.code))) setDead(true)
    setCode('')
  }
  const newCode = async () => {
    if (again > 0) return
    setNote('')
    const err = await resend()
    if (err) return setMsg(err)
    setCode('')
    setDead(false)
    setState('idle')
    setMsg('')
    setLeft(CODE_MINUTES * 60)
    setAgain(RESEND_S)
    setNote('שלחנו קוד חדש. הקוד הקודם כבר לא פועל.')
  }

  return (
    <section className={`au-card au-code is-${state}`} data-state="sent" aria-live="polite">
      <span className={`au-mark${state === 'ok' ? ' is-ok' : ''}`}>{state === 'ok' ? <Check /> : <MailCheck />}</span>
      <h1>{state === 'ok' ? 'נכנסים' : 'הקוד בדרך אליכם'}</h1>
      <p className="au-lead">
        {state === 'ok' ? (
          'הקוד נכון. פותחים את הקהילה שלך.'
        ) : (
          <>
            אם הכתובת <bdi dir="ltr">{email}</bdi> רשומה ומאושרת, שלחנו אליה קוד בן 6 ספרות. מקלידים אותו כאן.
          </>
        )}
      </p>

      <CodeBoxes
        value={code}
        onChange={(v) => {
          setCode(v)
          // typing again after a wrong code: the boxes calm down, the message stays until the next try
          if (state === 'wrong' && v) setState('idle')
        }}
        onFull={check}
        state={state}
        disabled={dead}
      />

      <em id="cb6-msg" className={`au-code-msg${msg ? ' is-err' : ''}`} role={msg ? 'alert' : undefined} data-msg={msg ? 'error' : note ? 'note' : ''}>
        {state === 'busy' ? (
          <>
            <LoaderCircle className="au-spin" /> בודקים את הקוד
          </>
        ) : (
          msg || note
        )}
      </em>

      {state !== 'ok' && (
        <div className="au-code-row">
          <span className="au-code-clock" data-clock>
            {dead ? (
              'הקוד הזה כבר לא פועל'
            ) : (
              <>
                הקוד בתוקף עוד <b className="num">{clock(left)}</b>
              </>
            )}
          </span>
          <button type="button" className={`au-code-again${dead ? ' is-main' : ''}`} onClick={newCode} disabled={again > 0} data-act="new-code">
            {again > 0 ? (
              <>
                קוד חדש בעוד <b className="num">{clock(again)}</b>
              </>
            ) : (
              'לשלוח קוד חדש'
            )}
          </button>
        </div>
      )}
      {state !== 'ok' && (
        <p className="au-note">
          לא הגיע? בודקים בתיקיית הספאם. במחשב אפשר גם ללחוץ על הכפתור שבמייל.{' '}
          <button type="button" className="au-link" onClick={other} data-act="other-email">
            לכתובת אחרת
          </button>
        </p>
      )}
    </section>
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
  const inApp = runningAsApp()
  return (
    <Frame>
      <section className="au-card au-wait" data-state="locked">
        <span className="au-mark">
          <Lock />
        </span>
        <h1>הקהילה פתוחה למתווכים שאושרו</h1>
        <p className="au-lead">נרשמים, הצוות שלנו מאשר, ואז מקבלים מייל עם כניסה.</p>
        {/* in the app on a phone's home screen the broker is most likely signed up already: the way in comes first */}
        <div className="au-actions" data-first={inApp ? 'login' : 'join'}>
          {inApp ? (
            <>
              <Link to="/kehila/login" className="btn btn-gold btn-lg" data-act="to-login">
                כניסה עם קוד מהמייל <ArrowLeft />
              </Link>
              <Link to={COMMUNITY_JOIN} className="btn btn-ghost btn-lg">
                עוד לא חברים? הרשמה
              </Link>
            </>
          ) : (
            <>
              <Link to={COMMUNITY_JOIN} className="btn btn-gold btn-lg">
                הרשמה לקהילה <ArrowLeft />
              </Link>
              <Link to="/kehila/login" className="btn btn-ghost btn-lg" data-act="to-login">
                כבר אושרתם? כניסה
              </Link>
            </>
          )}
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
