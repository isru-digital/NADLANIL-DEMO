import { type ChangeEvent, useEffect, useRef, useState } from 'react'
import { priceCaret, priceDigits, priceGroups } from '../config/coop'

/**
 * A small box for an amount in shekels, written the same way the property form writes a price (Itzik 22.11.2026):
 * the digits are grouped while they are typed, only digits are taken, and what comes out is a plain number, which
 * is what the filter compares. 0 means "nothing was written".
 */
export function MoneyInput({
  value,
  onValue,
  label,
  placeholder,
  name,
  id,
}: {
  value: number
  onValue: (n: number) => void
  label: string
  placeholder?: string
  name?: string
  id?: string
}) {
  const [text, setText] = useState(() => priceGroups(value))
  const box = useRef<HTMLInputElement>(null)
  const caret = useRef<number | null>(null)
  // the amount can be set from outside (a quick range, "ניקוי סינון"): the box follows it
  useEffect(() => {
    if (priceDigits(text) !== value) setText(priceGroups(value))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])
  useEffect(() => {
    if (caret.current !== null && box.current) {
      box.current.setSelectionRange(caret.current, caret.current)
      caret.current = null
    }
  })
  const type = (e: ChangeEvent<HTMLInputElement>) => {
    const el = e.target
    const before = el.value.slice(0, el.selectionStart ?? el.value.length).replace(/\D/g, '').length
    const n = priceDigits(el.value)
    const shown = priceGroups(n)
    caret.current = priceCaret(shown, before)
    setText(shown)
    onValue(n)
  }
  return (
    <span className={`mny${value ? ' is-filled' : ''}`} data-money={name}>
      <input
        ref={box}
        id={id}
        className="mny-in num"
        type="text"
        inputMode="numeric"
        autoComplete="off"
        enterKeyHint="done"
        value={text}
        onChange={type}
        placeholder={placeholder}
        aria-label={label}
        data-f={name}
      />
      <span className="mny-cur" aria-hidden>
        ₪
      </span>
    </span>
  )
}
