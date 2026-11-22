import { useEffect, useRef, useState } from 'react'
import { Check, Pencil, X } from 'lucide-react'
import { SnapSlider } from '../components/SnapSlider'
import { COOP_STOPS, PRICE_START, PRICE_STOPS, PRICE_TYPED_MAX, coopAmount, coopStop, coopText, priceStop, shekels, stepAt } from '../config/coop'
import '../styles/post-form.css'

/**
 * The price of a property (Itzik 22.11.2026): a big number, and a slider under it that stops every 25,000 ₪ up to
 * 5,000,000 ₪ (then in bigger steps, see config/coop.ts). A tap on the number opens a box to type an exact price,
 * which is kept exactly as it was typed. 0 means "not chosen yet".
 */
export function PriceField({ price, onPrice }: { price: number; onPrice: (n: number) => void }) {
  const [typing, setTyping] = useState(false)
  const [text, setText] = useState('')
  const box = useRef<HTMLInputElement>(null)
  useEffect(() => {
    if (typing) window.setTimeout(() => box.current?.focus(), 30)
  }, [typing])
  const typed = Math.min(PRICE_TYPED_MAX, Number(text.replace(/\D/g, '')) || 0)
  const open = () => {
    setText(price ? String(price) : '')
    setTyping(true)
  }
  const keep = () => {
    if (typed > 0) onPrice(typed)
    setTyping(false)
  }
  // a typed price between two stops: the handle sits at the nearer one, the number stays exact
  const index = priceStop(price || PRICE_START)
  return (
    <div className="field pf-money" data-f="price-field" data-price-value={price || ''}>
      <span className="field-label" id="pf-price-label">
        מחיר
      </span>
      {typing ? (
        <div className="pf-typed" data-typing>
          <input
            ref={box}
            className="input num"
            inputMode="numeric"
            enterKeyHint="done"
            value={text}
            onChange={(e) => setText(e.target.value.replace(/[^\d,]/g, ''))}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                keep()
              }
              if (e.key === 'Escape') {
                e.preventDefault()
                e.stopPropagation()
                setTyping(false)
              }
            }}
            placeholder="למשל 2479000"
            aria-label="מחיר מדויק, בשקלים"
            data-f="price"
          />
          <button type="button" className="pf-typed-ok" onClick={keep} disabled={typed === 0} aria-label="שמירת המחיר" data-act="price-ok">
            <Check aria-hidden />
          </button>
          <button type="button" className="pf-typed-no" onClick={() => setTyping(false)} aria-label="ביטול" data-act="price-cancel">
            <X aria-hidden />
          </button>
          <small className="pf-typed-say num" aria-live="polite">
            {typed > 0 ? shekels(typed) : 'מקלידים את המחיר בשקלים'}
          </small>
        </div>
      ) : (
        <button type="button" className={`pf-big${price ? '' : ' is-empty'}`} onClick={open} aria-label={price ? `המחיר ${shekels(price)}. לחיצה להקלדת מחיר מדויק` : 'הקלדת מחיר'} data-price-show>
          <span className="num">{price ? shekels(price) : 'בוחרים מחיר'}</span>
          <Pencil aria-hidden />
        </button>
      )}
      <SnapSlider
        id="price"
        count={PRICE_STOPS.length}
        index={index}
        chosen={price > 0}
        onChange={(i) => {
          setTyping(false)
          onPrice(PRICE_STOPS[i])
        }}
        label="מחיר"
        valueText={price ? shekels(price) : 'לא נבחר מחיר'}
        less="מחיר נמוך יותר"
        more="מחיר גבוה יותר"
      />
      <small className="pf-hint">
        {price ? `גוררים בקפיצות של ${shekels(stepAt(price))}. לחיצה על המחיר: הקלדה מדויקת.` : 'גוררים את העיגול, או לוחצים על המחיר ומקלידים.'}
      </small>
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
