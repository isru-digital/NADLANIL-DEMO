import { Link } from 'react-router-dom'
import { ArrowLeft, KeyRound, LogIn } from 'lucide-react'
import { session } from './session'
import '../styles/sign-in-prompt.css'

/**
 * The way in for whoever is not signed in (Itzik 18.11.2026): the app on a phone's home screen has no address bar, so
 * the sign-in screen has to be one tap away. Three places, all to the same screen (/kehila/login, the 6-digit code):
 * a "כניסה" button in the top bar, a card in the menu (the side menu on a computer, "עוד" on a phone), and a card at
 * the top of the feed. A signed-in broker sees none of them.
 */
export const LOGIN_PATH = '/kehila/login'

/** "כניסה" in the app's top bar */
export function SignInChip() {
  if (session) return null
  return (
    <Link to={LOGIN_PATH} className="si-chip" data-signin="bar">
      <LogIn aria-hidden />
      <span>כניסה</span>
    </Link>
  )
}

/** The card in the menu and at the top of the feed */
export function SignInCard({ place }: { place: 'side' | 'more' | 'feed' }) {
  if (session) return null
  if (place === 'feed')
    return (
      <aside className="si-card is-feed" data-signin="feed" aria-label="כניסה לחשבון">
        <i className="si-mark" aria-hidden>
          <KeyRound />
        </i>
        <div className="si-words">
          <strong>כבר חברים בקהילה?</strong>
          <span>נכנסים עם קוד בן 6 ספרות שמגיע למייל, בלי סיסמה.</span>
        </div>
        <Link to={LOGIN_PATH} className="si-go">
          כניסה <ArrowLeft aria-hidden />
        </Link>
      </aside>
    )
  return (
    <Link to={LOGIN_PATH} className={`si-card is-${place}`} data-signin={place}>
      <i className="si-mark" aria-hidden>
        <KeyRound />
      </i>
      <span className="si-words">
        <strong>כניסה לחשבון</strong>
        <span>{place === 'side' ? 'קוד מהמייל, בלי סיסמה' : 'עם קוד מהמייל, בלי סיסמה'}</span>
      </span>
      {place === 'more' && <ArrowLeft className="si-arrow" aria-hidden />}
    </Link>
  )
}
