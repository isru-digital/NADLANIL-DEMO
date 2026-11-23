import { useState } from 'react'
import { Plus, Sparkles, X } from 'lucide-react'
import '../styles/banners.css'

/**
 * The line at the top of the feed that asks a broker to bring their own properties in (Itzik 23.11.2026, his own
 * words). It breathes slowly, so the eye catches it once and is not nagged: the hairline and the glow move over
 * eight seconds, and a device that asked for less motion gets it still.
 * The X closes it for the rest of the day: the day it was closed on is kept in the browser, and a new day brings it
 * back. Nothing is sent anywhere, and nothing about WhatsApp happens here.
 */
const KEY = 'nadlanup-share-banner-v1'
const today = () => new Date().toLocaleDateString('sv-SE') // yyyy-mm-dd, by the device's own day
const closedToday = () => {
  try {
    return localStorage.getItem(KEY) === today()
  } catch {
    return false
  }
}

export function ShareBanner({ onAdd }: { onAdd: () => void }) {
  const [gone, setGone] = useState(closedToday)
  if (gone) return null
  const close = () => {
    try {
      localStorage.setItem(KEY, today())
    } catch {
      /* storage unavailable: it closes for now */
    }
    setGone(true)
  }
  return (
    <section className="bnr bnr-share" data-banner="share">
      <span className="bnr-icon" aria-hidden>
        <Sparkles />
      </span>
      <p className="bnr-text">הגיע הזמן לעלות את הנכסים שלך לקהילה שנתחיל לעשות עסקאות ביחד</p>
      <button type="button" className="bnr-go" onClick={onAdd} data-act="banner-add">
        <Plus aria-hidden />
        העלאת נכס
      </button>
      <button type="button" className="bnr-x" onClick={close} aria-label="סגירת ההודעה" data-act="banner-close">
        <X aria-hidden />
      </button>
    </section>
  )
}
