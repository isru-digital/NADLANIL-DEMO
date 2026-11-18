import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { Check, Eye, EyeOff, KeyRound, LoaderCircle } from 'lucide-react'
import { asset } from '../config'
import { tryKey } from '../config/construction'
import './construction.css'

/**
 * The one page every visitor sees while the site is being upgraded (see src/config/construction.ts).
 * Five quick taps on the logo turn the card over to a field for the preview key (Itzik 18.11.2026): the way in from
 * the app on an iPhone's home screen, which cannot take ?preview= in its address. Nothing on the page hints at it.
 */
const TAPS = 5
const WINDOW_MS = 2500
const TRIES = 5
const PAUSE_S = 30

export default function Construction() {
  const [open, setOpen] = useState(false)
  const taps = useRef<number[]>([])

  const tap = () => {
    if (open) return
    const now = Date.now()
    taps.current = [...taps.current.filter((t) => now - t < WINDOW_MS), now]
    if (taps.current.length >= TAPS) {
      taps.current = []
      setOpen(true)
    }
  }

  return (
    <main className="uc" data-construction>
      <div className={`uc-card${open ? ' is-key' : ''}`}>
        <img
          className="uc-logo"
          src={asset('brand/nadlanup-lockup-light.png')}
          alt="NadlanUP"
          width={1000}
          height={323}
          draggable={false}
          onPointerUp={tap}
          data-logo
        />
        <span className="uc-line" aria-hidden />
        {open ? (
          <KeyPanel onClose={() => setOpen(false)} />
        ) : (
          <>
            <h1>האתר בבנייה</h1>
            <p>אנחנו משדרגים את המערכת, נחזור בקרוב</p>
            <span className="uc-dots" aria-hidden>
              <i />
              <i />
              <i />
            </span>
          </>
        )}
      </div>
      <small className="uc-foot" data-owner>
        © 2026 <bdi dir="ltr">ISRU-E</bdi> · כל הזכויות שמורות
      </small>
    </main>
  )
}

function KeyPanel({ onClose }: { onClose: () => void }) {
  const [key, setKey] = useState('')
  const [show, setShow] = useState(false)
  const [state, setState] = useState<'idle' | 'busy' | 'wrong' | 'ok'>('idle')
  const [misses, setMisses] = useState(0)
  const [wait, setWait] = useState(0)
  const field = useRef<HTMLInputElement>(null)

  useEffect(() => {
    field.current?.focus()
  }, [])
  // after a few wrong keys, a short pause before the next try
  useEffect(() => {
    if (wait <= 0) return
    const t = window.setTimeout(() => setWait((s) => s - 1), 1000)
    return () => window.clearTimeout(t)
  }, [wait])

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!key.trim() || state === 'busy' || wait > 0) return
    setState('busy')
    const ok = await tryKey(key)
    if (ok) {
      setState('ok')
      // the whole site opens, from the screen the app was opened on
      window.setTimeout(() => location.reload(), 900)
      return
    }
    const n = misses + 1
    setMisses(n)
    setState('wrong')
    if (n % TRIES === 0) setWait(PAUSE_S)
    field.current?.select()
  }

  return (
    <form className={`uc-key is-${state}`} onSubmit={submit} data-key-panel noValidate>
      <span className="uc-key-mark" aria-hidden>
        {state === 'ok' ? <Check /> : <KeyRound />}
      </span>
      <h1>{state === 'ok' ? 'נכנסים' : 'כניסה לתצוגה מקדימה'}</h1>
      {state === 'ok' ? (
        <p>הקוד נכון. האתר נפתח במכשיר הזה.</p>
      ) : (
        <>
          <p>מקלידים את קוד הגישה פעם אחת, והמכשיר הזה זוכר אותו.</p>
          <label className="uc-field">
            <span>קוד גישה</span>
            <span className="uc-input">
              <input
                ref={field}
                type={show ? 'text' : 'password'}
                dir="ltr"
                value={key}
                onChange={(e) => {
                  setKey(e.target.value)
                  if (state === 'wrong') setState('idle')
                }}
                autoComplete="off"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                enterKeyHint="go"
                aria-invalid={state === 'wrong'}
                aria-describedby="uc-key-msg"
                data-f="preview-key"
              />
              <button type="button" className="uc-eye" onClick={() => setShow((s) => !s)} aria-label={show ? 'הסתרת הקוד' : 'הצגת הקוד'} aria-pressed={show}>
                {show ? <EyeOff /> : <Eye />}
              </button>
            </span>
          </label>
          <em id="uc-key-msg" className="uc-msg" role={state === 'wrong' ? 'alert' : undefined} data-msg={state === 'wrong' ? 'wrong' : wait > 0 ? 'wait' : ''}>
            {wait > 0 ? `יותר מדי ניסיונות. אפשר לנסות שוב בעוד ${wait} שניות.` : state === 'wrong' ? 'הקוד לא נכון. בודקים ומנסים שוב.' : ''}
          </em>
          <div className="uc-acts">
            <button type="submit" className="uc-go" disabled={!key.trim() || state === 'busy' || wait > 0} data-act="key-go">
              {state === 'busy' ? <LoaderCircle className="uc-spin" aria-hidden /> : null}
              כניסה
            </button>
            <button type="button" className="uc-back" onClick={onClose} data-act="key-close">
              ביטול
            </button>
          </div>
        </>
      )}
    </form>
  )
}
