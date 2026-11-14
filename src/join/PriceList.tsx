import { ArrowLeft, Check, Minus, Plus, X } from 'lucide-react'
import { Reveal } from '../components/ui'
import {
  ALL_PLANS_NOTE,
  MADLAN_EXTRA,
  MADLAN_EXTRA_MAX,
  MADLAN_PACKS,
  MADLAN_TITLE,
  PLANS,
  PRICING_SUB,
  PRICING_TITLE,
  TERMS,
  TERMS_TITLE,
  costOf,
  pickActions,
  priceText,
  usePick,
} from '../config/pricing'
import type { MadlanId, PlanId } from '../config/pricing'
import '../styles/pricing.css'

const num = (n: number) => n.toLocaleString('he-IL')

/**
 * The office's price list: three plans side by side (one under the other on a phone), the Madlan packages, and the
 * terms. The words and the prices come from config/pricing.ts, exactly as they were given.
 */
export default function PriceList({ onJoin, joined }: { onJoin: (plan: PlanId) => void; joined: boolean }) {
  const pick = usePick()
  return (
    <section className="jo-section prc" id="pricing">
      <div className="jo-in">
        <Reveal className="jo-head">
          <span className="jo-tag">מחירון</span>
          <h2>{PRICING_TITLE}</h2>
          <p>{PRICING_SUB}</p>
        </Reveal>

        <div className="prc-plans">
          {PLANS.map((p, i) => {
            const on = pick.plan === p.id
            return (
              <Reveal key={p.id} delay={i * 0.07} className={`prc-plan${on ? ' is-on' : ''}`}>
                <article data-plan={p.id}>
                  <h3>{p.name}</h3>
                  <p className="prc-price">
                    <b className="num">{num(p.price)}</b>{' '}
                    <span>₪ + מע"מ לחודש</span>
                  </p>
                  <ul>
                    {p.lines.map((l) => (
                      <li key={l.text} className={l.none ? 'is-none' : ''}>
                        <i aria-hidden>{l.none ? <X /> : <Check />}</i>
                        <span>
                          {l.text}
                          {l.worth && <em>{l.worth}</em>}
                        </span>
                      </li>
                    ))}
                  </ul>
                  <button
                    type="button"
                    className={`btn ${on ? 'btn-gold' : 'btn-ghost'} btn-lg prc-pick`}
                    data-act="pick-plan"
                    onClick={() => {
                      pickActions.set({ plan: p.id })
                      onJoin(p.id)
                    }}
                  >
                    {joined ? `מעבר למסלול ${p.name}, בדמו` : `הצטרפות במסלול ${p.name}`} <ArrowLeft />
                  </button>
                </article>
              </Reveal>
            )
          })}
        </div>
        <p className="prc-all">{ALL_PLANS_NOTE}</p>

        <div className="prc-below">
          <Reveal className="prc-box">
            <h3>{MADLAN_TITLE}</h3>
            <table data-box="madlan">
              <tbody>
                {MADLAN_PACKS.map((m) => (
                  <tr key={m.id}>
                    <th scope="row">{m.label}</th>
                    <td className="num">{priceText(m.price)}</td>
                  </tr>
                ))}
                <tr>
                  <th scope="row">{MADLAN_EXTRA.label}</th>
                  <td className="num">{priceText(MADLAN_EXTRA.price)}</td>
                </tr>
              </tbody>
            </table>
          </Reveal>
          <Reveal delay={0.07} className="prc-box">
            <h3>{TERMS_TITLE}</h3>
            <table data-box="terms">
              <tbody>
                {TERMS.map(([what, term]) => (
                  <tr key={what}>
                    <th scope="row">{what}</th>
                    <td>{term}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Reveal>
        </div>
      </div>
    </section>
  )
}

/**
 * Picking a plan and, on top of it, a Madlan package with as many extras of 5 ads as wanted. The same controls sit
 * in the calculator and in the simulated joining, and both read the same choice.
 */
export function PlanChooser({ compact = false }: { compact?: boolean }) {
  const pick = usePick()
  const cost = costOf(pick)
  const packs: { id: MadlanId; label: string; price?: number }[] = [{ id: 'none', label: 'בלי מדלן' }, ...MADLAN_PACKS]
  return (
    <div className={`prc-choose${compact ? ' is-compact' : ''}`}>
      <div className="prc-field" role="radiogroup" aria-label="מסלול">
        <span className="prc-label">מסלול</span>
        <div className="prc-opts is-plans">
          {PLANS.map((p) => (
            <button key={p.id} type="button" role="radio" aria-checked={pick.plan === p.id} className={pick.plan === p.id ? 'is-on' : ''} data-plan={p.id} onClick={() => pickActions.set({ plan: p.id })}>
              <b>{p.name}</b>
              <small className="num">{priceText(p.price)}</small>
            </button>
          ))}
        </div>
      </div>

      <div className="prc-field" role="radiogroup" aria-label="חבילת מדלן, בתשלום נוסף">
        <span className="prc-label">מדלן, בתשלום נוסף</span>
        <div className="prc-opts">
          {packs.map((m) => (
            <button key={m.id} type="button" role="radio" aria-checked={pick.madlan === m.id} className={pick.madlan === m.id ? 'is-on' : ''} data-madlan={m.id} onClick={() => pickActions.set({ madlan: m.id })}>
              <b>{m.label}</b>
              {m.price !== undefined && <small className="num">{priceText(m.price)}</small>}
            </button>
          ))}
        </div>
        {pick.madlan !== 'none' && (
          <div className="prc-extra" data-extra={pick.extra}>
            <span>
              <b>{MADLAN_EXTRA.label}</b>
              <small className="num">{priceText(MADLAN_EXTRA.price)}</small>
            </span>
            <div className="prc-step" role="group" aria-label={`${MADLAN_EXTRA.label}: ${pick.extra}`}>
              <button type="button" aria-label="פחות תוספת אחת" disabled={pick.extra === 0} data-act="extra-less" onClick={() => pickActions.bumpExtra(-1)}>
                <Minus />
              </button>
              <output className="num" aria-live="polite">
                {pick.extra}
              </output>
              <button type="button" aria-label="עוד תוספת אחת" disabled={pick.extra >= MADLAN_EXTRA_MAX} data-act="extra-more" onClick={() => pickActions.bumpExtra(1)}>
                <Plus />
              </button>
            </div>
            {cost.madlanAds > 0 && (
              <em>
                סך הכול <span className="num">{cost.madlanAds}</span> מודעות מדלן
              </em>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
