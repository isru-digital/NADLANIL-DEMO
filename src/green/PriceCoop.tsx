import { type ChangeEvent, useEffect, useRef, useState } from 'react'
import { ArrowUp, X } from 'lucide-react'
import { SnapSlider } from '../components/SnapSlider'
import { COOP_STOPS, PRICE_LIKELY_LOW, PRICE_TYPED_MAX, coopAmount, coopStop, coopText, priceDigits, priceGroups, priceWords, shekels } from '../config/coop'
import '../styles/post-form.css'

/** where the caret should sit once the digits were grouped again: right after the same digit it was after */
function caretFor(shown: string, digitsBefore: number): number {
  if (digitsBefore <= 0) return 0
  let seen = 0
  for (let i = 0; i < shown.length; i++) {
    if (/\d/.test(shown[i])) {
      seen++
      if (seen === digitsBefore) return i + 1
    }
  }
  return shown.length
}

/**
 * The price of a property (Itzik 22.11.2026, in place of the slider): one box, the amount is typed into it. The
 * digits are grouped while they are typed, under the box the size is said in words ("2.79 מיליון שקלים") so a zero
 * that is short is seen at once, and a price under 100,000 ₪ is offered, quietly, times a thousand. What is kept is
 * a plain number, exactly as it was typed, which is what the filter of the feed and the fee's shekels read.
 * 0 means "not chosen yet".
 */
export function PriceField({ price, onPrice }: { price: number; onPrice: (n: number) => void }) {
  const [text, setText] = useState(() => priceGroups(price))
  const box = useRef<HTMLInputElement>(null)
  const caret = useRef<number | null>(null)
  // the form can be filled from elsewhere (a WhatsApp message, a sample): the box follows the price it is given
  useEffect(() => {
    if (priceDigits(text) !== price) setText(priceGroups(price))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [price])
  // put the caret back where it was, after the digits were grouped again
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
    caret.current = caretFor(shown, before)
    setText(shown)
    onPrice(n)
  }
  const clear = () => {
    setText('')
    onPrice(0)
    box.current?.focus()
  }
  const times = price > 0 && price < PRICE_LIKELY_LOW ? price * 1000 : 0
  return (
    <div className="field pf-money" data-f="price-field" data-price-value={price || ''}>
      <label className="field-label" htmlFor="pf-price">
        מחיר
      </label>
      <div className={`pf-amount${price ? ' is-filled' : ''}`} data-price-box>
        <span className="pf-cur" aria-hidden>
          ₪
        </span>
        <input
          ref={box}
          id="pf-price"
          className="pf-amount-in num"
          type="text"
          inputMode="numeric"
          autoComplete="off"
          enterKeyHint="done"
          value={text}
          onChange={type}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              box.current?.blur()
            }
          }}
          placeholder="2,790,000"
          aria-label="מחיר הנכס, בשקלים"
          aria-describedby="pf-price-say"
          data-f="price"
        />
        {price > 0 && (
          <button type="button" className="pf-amount-clear" onClick={clear} aria-label="ניקוי המחיר" data-act="price-clear">
            <X aria-hidden />
          </button>
        )}
      </div>
      <small className={`pf-hint pf-say${price ? ' is-filled' : ''}`} id="pf-price-say" data-price-say aria-live="polite">
        {price ? priceWords(price) : 'כותבים את הסכום בספרות, והוא יסתדר לבד.'}
      </small>
      {times > 0 && times <= PRICE_TYPED_MAX && (
        <button type="button" className="pf-lift" onClick={() => onPrice(times)} data-act="price-x1000">
          <ArrowUp aria-hidden />
          <span>
            התכוונתם ל-<bdi className="num">{shekels(times)}</bdi>?
          </span>
        </button>
      )}
    </div>
  )
}

/**
 * "עמלת שת"פ" (Itzik 22.11.2026), a must: how much of the price the broker who brings the buyer earns, 0% to 1% in
 * steps of 0.05%. The percent is big; under it, what it is in shekels at this price. null = not chosen yet.
 */
export function CoopField({ pct, price, onPct, missing }: { pct: number | null; price: number; onPct: (p: number) => void; missing?: boolean }) {
  const chosen = pct !== null
  const line = !chosen
    ? 'כמה ירוויח המתווך שיביא קונה, באחוזים מהמחיר.'
    : price > 0
      ? `בנכס של ${shekels(price)} זה בערך ${shekels(coopAmount(price, pct))}`
      : 'בוחרים מחיר, ונראה כאן כמה זה בשקלים.'
  return (
    <div className={`field pf-money pf-coop${missing && !chosen ? ' is-missing' : ''}`} data-f="coop">
      <span className="field-label">
        עמלת שת"פ <b className="pf-must">חובה</b>
      </span>
      <strong className={`pf-big is-coop${chosen ? '' : ' is-empty'}`} data-coop-show aria-live="polite">
        <bdi dir="ltr" className="num">
          {chosen ? coopText(pct) : 'בוחרים אחוז'}
        </bdi>
      </strong>
      <SnapSlider
        id="coop"
        count={COOP_STOPS.length}
        index={chosen ? coopStop(pct) : 10}
        chosen={chosen}
        onChange={(i) => onPct(COOP_STOPS[i])}
        label="עמלת שת״פ"
        valueText={chosen ? coopText(pct) : 'לא נבחרה עמלה'}
        less="פחות אחוז"
        more="יותר אחוז"
        marks={[
          { at: 0, label: '0%' },
          { at: 10, label: '0.5%' },
          { at: 20, label: '1%' },
        ]}
      />
      <small className="pf-hint num" data-coop-line>
        {line}
      </small>
      {missing && !chosen && (
        <em className="pf-err" role="alert" data-err="coop">
          בוחרים עמלת שת"פ לפני השמירה. אפשר גם 0%.
        </em>
      )}
    </div>
  )
}
