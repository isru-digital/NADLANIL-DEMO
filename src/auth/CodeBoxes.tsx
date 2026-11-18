import { useEffect, useRef } from 'react'

/**
 * Six boxes for the sign-in code (Itzik 18.11.2026). Under them is ONE real field, so the phone's keyboard can offer
 * the code from the e-mail (one-time-code), pasting a whole code works, and a screen reader hears one field. The boxes
 * only draw what is in it. Digits run left to right, as on the keyboard and in the e-mail.
 */
export default function CodeBoxes({
  value,
  onChange,
  onFull,
  state,
  disabled,
}: {
  value: string
  onChange: (v: string) => void
  onFull: (v: string) => void
  state: 'idle' | 'busy' | 'wrong' | 'ok'
  disabled?: boolean
}) {
  const field = useRef<HTMLInputElement>(null)
  useEffect(() => {
    if (!disabled) field.current?.focus()
  }, [disabled])
  useEffect(() => {
    if (state === 'wrong') field.current?.focus()
  }, [state])

  const set = (raw: string) => {
    const v = raw.replace(/\D/g, '').slice(0, 6)
    onChange(v)
    if (v.length === 6) onFull(v)
  }
  const at = Math.min(value.length, 5)

  return (
    <div className={`cb6 is-${state}${disabled ? ' is-off' : ''}`} dir="ltr" data-code-boxes>
      <input
        ref={field}
        className="cb6-field"
        value={value}
        onChange={(e) => set(e.target.value)}
        inputMode="numeric"
        pattern="[0-9]*"
        autoComplete="one-time-code"
        maxLength={6}
        disabled={disabled || state === 'busy' || state === 'ok'}
        aria-label="קוד הכניסה, 6 ספרות"
        aria-invalid={state === 'wrong'}
        aria-describedby="cb6-msg"
        data-f="code"
      />
      {Array.from({ length: 6 }, (_, i) => (
        <span key={i} className={`cb6-box${value[i] ? ' is-full' : ''}${i === at && state !== 'ok' ? ' is-at' : ''}`} style={{ ['--i' as string]: i }} aria-hidden>
          {value[i] ?? ''}
        </span>
      ))}
    </div>
  )
}
