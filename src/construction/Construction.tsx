import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { ArrowLeft, Check, LoaderCircle, MailCheck, Sprout, UserRound } from 'lucide-react'
import { asset } from '../config'
import { call, sessionActions } from '../auth/session'
import type { MemberInfo, StaffInfo } from '../auth/session'
import CodeBoxes from '../auth/CodeBoxes'
import './construction.css'
import '../styles/auth.css'

/**
 * The one page every visitor sees while the site is being upgraded (see src/config/construction.ts).
 * "כניסת צוות" (Itzik 22.11.2026, in place of the preview key and the five taps on the logo): a partner writes the
 * address they are staff with and gets a code of six digits, as in the usual sign-in. The server sends the code only
 * to an address of its own list (/api/staff-login); any other address is told, gently, that the site is still being
 * built, and nothing is sent to it. The list itself is never in this code.
 */
type Step = 'page' | 'email' | 'code' | 'no' | 'in'
const CODE_MINUTES = 10

export default function Construction() {
  const [step, setStep] = useState<Step>('page')
  const [email, setEmail] = useState('')
  return (
    <main className="uc" data-construction>
      <div className={`uc-card${step === 'page' ? '' : ' is-key'}`}>
        <span className="uc-logo-hit">
          <img className="uc-logo" src={asset('brand/nadlanup-lockup-light.png')} alt="NadlanUP" width={1000} height={323} draggable={false} />
        </span>
        <span className="uc-line" aria-hidden />
        {step === 'page' && (
          <>
            <h1>האתר בבנייה</h1>
            <p>אנחנו משדרגים את המערכת, נחזור בקרוב</p>
            <span className="uc-dots" aria-hidden>
              <i />
              <i />
              <i />
            </span>
            <button type="button" className="uc-staff" onClick={() => setStep('email')} data-act="staff-entry">
              <UserRound aria-hidden /> כניסת צוות
            </button>
          </>
        )}
        {step === 'email' && <EmailStep email={email} setEmail={setEmail} onSent={() => setStep('code')} onNo={() => setStep('no')} onClose={() => setStep('page')} />}
        {step === 'code' && <CodeStep email={email} onIn={() => setStep('in')} onOther={() => setStep('email')} />}
        {step === 'no' && (
          <div className="uc-key is-no" data-staff-no>
            <span className="uc-key-mark is-soft" aria-hidden>
              <Sprout />
            </span>
            <h1>האתר עדיין בבנייה</h1>
            <p>נשמח לראות אותך בקרוב.</p>
            <div className="uc-acts">
              <button type="button" className="uc-back" onClick={() => setStep('page')} data-act="no-close">
                סגירה
              </button>
            </div>
          </div>
        )}
        {step === 'in' && (
          <div className="uc-key is-ok" data-staff-in>
            <span className="uc-key-mark" aria-hidden>
              <Check />
            </span>
            <h1>נכנסים</h1>
            <p>האתר נפתח במכשיר הזה.</p>
          </div>
        )}
      </div>
      <small className="uc-foot" data-owner>
        © 2026 <bdi dir="ltr">ISRU-E</bdi> · כל הזכויות שמורות
      </small>
    </main>
  )
}

/** The address. The server alone knows who is on the list, and answers whether it sent a code. */
function EmailStep({ email, setEmail, onSent, onNo, onClose }: { email: string; setEmail: (v: string) => void; onSent: () => void; onNo: () => void; onClose: () => void }) {
  const [state, setState] = useState<'idle' | 'busy'>('idle')
  const [err, setErr] = useState('')
  const field = useRef<HTMLInputElement>(null)
  useEffect(() => {
    field.current?.focus()
  }, [])

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const at = email.trim()
    if (!at || state === 'busy') return
    setState('busy')
    setErr('')
    const r = await call<{ sent?: boolean; error?: string }>('/api/staff-login', { method: 'POST', body: { email: at }, token: '' })
    setState('idle')
    if (!r.ok) return setErr(r.data.error ?? 'משהו השתבש. אפשר לנסות שוב.')
    if (r.data.sent) return onSent()
    onNo()
  }

  return (
    <form className="uc-key" onSubmit={submit} data-staff-panel noValidate>
      <span className="uc-key-mark" aria-hidden>
        <UserRound />
      </span>
      <h1>כניסת צוות</h1>
      <p>כותבים את המייל שלכם, ומקבלים קוד כניסה בן 6 ספרות.</p>
      <label className="uc-field">
        <span>מייל</span>
        <span className="uc-input">
          <input
            ref={field}
            type="email"
            dir="ltr"
            inputMode="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value)
              setErr('')
            }}
            autoComplete="email"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            enterKeyHint="send"
            aria-invalid={!!err}
            aria-describedby="uc-staff-msg"
            data-f="staff-email"
          />
        </span>
      </label>
      <em id="uc-staff-msg" className="uc-msg" role={err ? 'alert' : undefined} data-msg={err ? 'wrong' : ''}>
        {err}
      </em>
      <div className="uc-acts">
        <button type="submit" className="uc-go" disabled={!email.trim() || state === 'busy'} data-act="staff-send">
          {state === 'busy' ? <LoaderCircle className="uc-spin" aria-hidden /> : null}
          שלחו לי קוד
        </button>
        <button type="button" className="uc-back" onClick={onClose} data-act="staff-close">
          ביטול
        </button>
      </div>
    </form>
  )
}

/** The six digits from the mail. The session it opens is the one the usual sign-in opens. */
function CodeStep({ email, onIn, onOther }: { email: string; onIn: () => void; onOther: () => void }) {
  const [code, setCode] = useState('')
  const [state, setState] = useState<'idle' | 'busy' | 'wrong' | 'ok'>('idle')
  const [msg, setMsg] = useState('')
  const [dead, setDead] = useState(false)
  const [left, setLeft] = useState(CODE_MINUTES * 60)

  useEffect(() => {
    const t = window.setInterval(() => setLeft((s) => Math.max(0, s - 1)), 1000)
    return () => window.clearInterval(t)
  }, [])
  useEffect(() => {
    if (left === 0 && state !== 'ok') {
      setDead(true)
      setMsg('הקוד פג. אפשר לבקש קוד חדש.')
    }
  }, [left, state])

  const send = async (v: string) => {
    if (state === 'busy' || state === 'ok' || dead) return
    setState('busy')
    setMsg('')
    const r = await call<{ token: string; member: MemberInfo | null; staff: StaffInfo | null; error?: string; code?: string }>('/api/session', { method: 'POST', body: { email, code: v }, token: '' })
    if (r.ok) {
      setState('ok')
      sessionActions.save({ token: r.data.token, member: r.data.member, staff: r.data.staff })
      onIn()
      // the whole site opens, from the screen the app was opened on
      window.setTimeout(() => location.reload(), 900)
      return
    }
    setState('wrong')
    setMsg(r.data.error ?? 'הקוד לא נכון. בודקים במייל ומנסים שוב.')
    if (['locked', 'expired', 'used'].includes(String(r.data.code))) setDead(true)
    setCode('')
  }

  const mm = String(Math.floor(left / 60)).padStart(2, '0')
  const ss = String(left % 60).padStart(2, '0')
  return (
    <div className="uc-key" data-staff-code>
      <span className="uc-key-mark" aria-hidden>
        <MailCheck />
      </span>
      <h1>הקוד נשלח</h1>
      <p>
        שלחנו קוד בן 6 ספרות ל<bdi dir="ltr">{email}</bdi>
      </p>
      <CodeBoxes
        value={code}
        onChange={(v) => {
          setCode(v)
          if (state === 'wrong') setState('idle')
        }}
        onFull={send}
        state={state}
        disabled={dead}
      />
      <em className={`uc-msg${msg ? '' : ' is-quiet'}`} role={msg ? 'alert' : undefined} data-msg={msg ? 'wrong' : ''}>
        {msg || (dead ? '' : `הקוד פועל עוד ${mm}:${ss} דקות`)}
      </em>
      <div className="uc-acts">
        <button type="button" className="uc-go" disabled={code.length < 6 || state === 'busy' || dead} onClick={() => send(code)} data-act="code-go">
          {state === 'busy' ? <LoaderCircle className="uc-spin" aria-hidden /> : null}
          כניסה
          <ArrowLeft aria-hidden />
        </button>
        <button type="button" className="uc-back" onClick={onOther} data-act="code-other">
          מייל אחר
        </button>
      </div>
    </div>
  )
}
