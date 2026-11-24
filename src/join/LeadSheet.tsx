import { useCallback, useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { Check, LoaderCircle, Lock, Send } from 'lucide-react'
import { PLATFORM_NAME } from '../config'
import { Modal } from '../components/ui'
import { cities as knownCities } from '../data/demo'
import { call } from '../auth/session'
import '../styles/leads.css'

/**
 * "מעוניינים לקבל מידע?" (24.11.2026): the short form that took the place of the prices on the office page. A name, a
 * phone, a city and a note that is not required. It goes to the server, which keeps it and tells the office's staff.
 * A phone opens it as a sheet from the bottom, like a post box on Facebook. What is typed here is for the staff only.
 */
type F = 'name' | 'phone' | 'city'
const CITY_LIST = [...new Set([...knownCities, 'טבריה', 'אשקלון', 'אילת', 'קריית שמונה', 'כרמיאל', 'בת ים', 'בני ברק'])]

export default function LeadSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [city, setCity] = useState('')
  const [note, setNote] = useState('')
  const [trap, setTrap] = useState('')
  const [errors, setErrors] = useState<Partial<Record<F, string>>>({})
  const [state, setState] = useState<'form' | 'busy' | 'done'>('form')
  const [failure, setFailure] = useState('')
  const box = useRef<HTMLFormElement>(null)
  // the window's close must keep one identity: the window puts the focus back on itself whenever it changes, which
  // would take every key typed in the form away
  const busy = useRef(false)
  busy.current = state === 'busy'
  const closeRef = useRef(onClose)
  closeRef.current = onClose
  const close = useCallback(() => {
    if (!busy.current) closeRef.current()
  }, [])

  // a sheet opened again after a lead was sent starts clean
  useEffect(() => {
    if (!open || state !== 'done') return
    setName('')
    setPhone('')
    setCity('')
    setNote('')
    setErrors({})
    setState('form')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const check = () => {
    const e: Partial<Record<F, string>> = {}
    if (name.trim().length < 2) e.name = 'איך קוראים לך?'
    if (phone.replace(/\D/g, '').length < 9) e.phone = 'מספר הטלפון קצר מדי. למשל: 050-1234567'
    if (city.trim().length < 2) e.city = 'באיזו עיר?'
    return e
  }
  // an error leaves as soon as its field is right
  useEffect(() => {
    setErrors((old) => {
      const keys = Object.keys(old) as F[]
      if (!keys.length) return old
      const now = check()
      const left = keys.filter((k) => now[k])
      return left.length === keys.length ? old : Object.fromEntries(left.map((k) => [k, old[k]]))
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name, phone, city])

  const submit = async (ev: FormEvent) => {
    ev.preventDefault()
    setFailure('')
    const e = check()
    setErrors(e)
    const first = (['name', 'phone', 'city'] as F[]).find((f) => e[f])
    if (first) return box.current?.querySelector<HTMLElement>(`[data-lead="${first}"]`)?.focus()
    setState('busy')
    const r = await call('/api/leads', { method: 'POST', body: { name, phone, city, note, website: trap } })
    if (r.ok) return setState('done')
    setState('form')
    if (r.data.fields) setErrors(r.data.fields as Partial<Record<F, string>>)
    setFailure(r.data.error ?? 'משהו השתבש. נסו שוב בעוד רגע.')
  }

  const err = (f: F) =>
    errors[f] ? (
      <em id={`lead-err-${f}`} className="ld-err" role="alert">
        {errors[f]}
      </em>
    ) : null
  const bad = (f: F) => ({ 'aria-invalid': !!errors[f], 'aria-describedby': errors[f] ? `lead-err-${f}` : undefined })

  return (
    <Modal open={open} onClose={close} title={state === 'done' ? 'קיבלנו, תודה' : 'מעוניינים לקבל מידע?'} subtitle={state === 'done' ? undefined : 'משאירים פרטים, וצוות המשרד חוזר אליכם.'}>
      <div className="modal-body ld" data-sheet="lead" data-state={state}>
        {state === 'done' ? (
          <div className="ld-done" role="status">
            <span className="ld-mark">
              <Check />
            </span>
            <h3>הפרטים אצלנו</h3>
            <p>צוות <bdi dir="ltr">{PLATFORM_NAME}</bdi> יחזור אליך בהקדם, בטלפון שהשארת.</p>
            <button type="button" className="btn btn-gold btn-lg" onClick={onClose} data-act="lead-done">
              סגירה
            </button>
          </div>
        ) : (
          <form ref={box} onSubmit={submit} noValidate className="ld-form">
            <label className="ld-field">
              <span>שם מלא</span>
              <input className="input" data-lead="name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" maxLength={80} required {...bad('name')} />
              {err('name')}
            </label>
            <label className="ld-field">
              <span>טלפון</span>
              <input className="input ltr" data-lead="phone" type="tel" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="tel" maxLength={20} required {...bad('phone')} />
              {err('phone')}
            </label>
            <label className="ld-field">
              <span>עיר</span>
              <input className="input" data-lead="city" list="ld-cities" value={city} onChange={(e) => setCity(e.target.value)} autoComplete="address-level2" maxLength={40} required {...bad('city')} />
              <datalist id="ld-cities">
                {CITY_LIST.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
              {err('city')}
            </label>
            <label className="ld-field">
              <span>
                הערה <small>(לא חובה)</small>
              </span>
              <textarea className="textarea" data-lead="note" value={note} onChange={(e) => setNote(e.target.value)} rows={3} maxLength={500} placeholder="למשל: מתי נוח לדבר" />
            </label>
            {/* never seen by people: a robot that fills it in is quietly let go */}
            <input className="ld-trap" tabIndex={-1} aria-hidden autoComplete="off" value={trap} onChange={(e) => setTrap(e.target.value)} name="website" />
            {failure && (
              <p className="ld-fail" role="alert">
                {failure}
              </p>
            )}
            <button type="submit" className="btn btn-gold btn-lg ld-go" disabled={state === 'busy'} data-act="send-lead">
              {state === 'busy' ? (
                <>
                  <LoaderCircle className="ld-spin" aria-hidden /> שולחים
                </>
              ) : (
                <>
                  <Send aria-hidden /> שליחה
                </>
              )}
            </button>
            <p className="ld-private">
              <Lock aria-hidden />
              הפרטים מגיעים לצוות המשרד בלבד, ולא מתפרסמים בשום מקום.
            </p>
          </form>
        )}
      </div>
    </Modal>
  )
}
