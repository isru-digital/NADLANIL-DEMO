import { coopText, hasCoop } from '../config/coop'
import '../styles/post-form.css'

/**
 * The red tag "עמלת שת"פ 0.5%" (Itzik 22.11.2026): on the photo of a post in the feed and on the main photo of the
 * property's page, in its corner, so a broker sees at once what working together earns. A property with no fee
 * (one published before the fee existed) shows nothing: no number is made up for it.
 */
export function CoopBadge({ pct, at = 'photo' }: { pct: unknown; at?: 'photo' | 'line' }) {
  if (!hasCoop(pct)) return null
  return (
    <span className={`coop-badge is-${at}`} data-coop={pct}>
      עמלת שת"פ{' '}
      <bdi dir="ltr" className="num">
        {coopText(pct)}
      </bdi>
    </span>
  )
}
