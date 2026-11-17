import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { Clock, Moon, Sun } from 'lucide-react'
import { dayNight, useDayNight } from '../config/dayNight'
import '../styles/day-night.css'

/**
 * The switch at the corner of the screen: light (day) or dark (night). The site follows the clock by itself and this
 * lets the visitor change it at any time; after a choice by hand, a small clock button goes back to automatic.
 */
/**
 * On a phone inside the app the floating switch hid content (Itzik 17.11.2026): there it is one small round button
 * in the top bar, showing the mode now; a tap changes it.
 */
export function DayNightCompact() {
  const { mode } = useDayNight()
  const night = mode === 'night'
  return (
    <button type="button" className="dn-compact" onClick={() => dayNight.set(night ? 'day' : 'night')} aria-label={night ? 'מעבר לתצוגה בהירה' : 'מעבר לתצוגה כהה'} title={night ? 'תצוגה בהירה' : 'תצוגה כהה'} data-mode={mode}>
      {night ? <Moon /> : <Sun />}
    </button>
  )
}

export default function DayNightSwitch() {
  const { pathname } = useLocation()
  const { mode, byHand } = useDayNight()

  // keep the mood right on every screen, and when the clock passes 08:00 or 18:01 while the site is open
  useEffect(() => {
    dayNight.apply()
  }, [pathname])
  useEffect(() => {
    const t = window.setInterval(dayNight.apply, 30_000)
    const onShow = () => document.visibilityState === 'visible' && dayNight.apply()
    document.addEventListener('visibilitychange', onShow)
    return () => {
      window.clearInterval(t)
      document.removeEventListener('visibilitychange', onShow)
    }
  }, [])

  if (/^\/(b|f|agent|o)\//.test(pathname)) return null
  return (
    <nav className={`dn${pathname.startsWith('/app') ? ' on-app' : ''}`} aria-label="תצוגת יום או לילה">
      <button type="button" data-mode="day" aria-pressed={mode === 'day'} onClick={() => dayNight.set('day')}>
        <Sun /> בהיר
      </button>
      <button type="button" data-mode="night" aria-pressed={mode === 'night'} onClick={() => dayNight.set('night')}>
        <Moon /> כהה
      </button>
      {byHand && (
        <button type="button" className="dn-auto" onClick={dayNight.auto} aria-label="חזרה למצב אוטומטי לפי השעה" title="אוטומטי לפי השעה: בהיר מ-08:00 עד 18:00">
          <Clock />
        </button>
      )}
    </nav>
  )
}
