import { coopText, hasCoop } from '../config/coop'
import '../styles/post-form.css'

/**
 * The tag of the fee (Itzik 22.11.2026): on the photo of a post in the feed and on the main photo of the property's
 * page, in its corner, so a broker sees at once what working together earns. A property with no fee (one published
 * before the fee existed) shows nothing: no number is made up for it.
 * 0% is not "nothing" but the best there is (Itzik 23.11.2026): each side takes from its own client, so it is said
 * in words, "שת"פ מלא", in a light green, and only a fee that is asked for is said in red.
 * A few properties of the demo are marked that way so the filter has what to show; those carry a "דוגמה" tag of
 * their own beside the fee, so no one takes them for a real property of a real broker.
 */
export function CoopBadge({ pct, at = 'photo', sample = false }: { pct: unknown; at?: 'photo' | 'line'; sample?: boolean }) {
  if (!hasCoop(pct)) return null
  const full = pct === 0
  return (
    <span className={`coop-wrap is-${at}`}>
      <span className={`coop-badge is-${at}${full ? ' is-full' : ''}`} data-coop={pct}>
        {full ? (
          'שת"פ מלא'
        ) : (
          <>
            עמלת שת"פ{' '}
            <bdi dir="ltr" className="num">
              {coopText(pct)}
            </bdi>
          </>
        )}
      </span>
      {sample && (
        <span className={`coop-badge is-${at} is-sample`} data-sample>
          דוגמה
        </span>
      )}
    </span>
  )
}
