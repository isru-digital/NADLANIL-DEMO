import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { ArrowLeft, BadgeCheck, Bell, Clock, KeyRound, LogOut, Moon, Search, ShieldCheck, Sun } from 'lucide-react'
import { CURRENT_BROKER_ID } from '../config'
import { OFFICE_PAGE, UPGRADE_LABEL } from '../config/community'
import { dayNight, useDayNight } from '../config/dayNight'
import { useMember } from '../config/member'
import { brokerById } from '../data/demo'
import { useStore } from '../store'
import { asMember, session, sessionActions } from '../auth/session'
import { LOGIN_PATH } from '../auth/SignInPrompt'
import { Avatar, Modal } from '../components/ui'
import '../styles/top-actions.css'

/**
 * The end of the app's top bar for a community member (Itzik 19.11.2026): three small icons, the search, the bell
 * and the broker's picture. Every line at the top pushes the posts down, so what used to stand there in rows of its
 * own moved behind them:
 *   the search field and "כל הערים"   ->  the search screen (the search icon)
 *   the bell of the feed              ->  here, on every screen of the app
 *   the name with "יציאה"             ->  the menu that the picture opens
 *   "שדרג למשרד NadlanUP"             ->  that menu (and one quiet post inside the feed)
 *   day / night                       ->  that menu
 * Nothing was removed. The search and the notices belong to the feed, so from another screen the icons go to it.
 */
const FEED = '/app/community'

export default function TopActions() {
  const { pathname, search } = useLocation()
  const navigate = useNavigate()
  const { notices, myCities } = useStore()
  const [menu, setMenu] = useState(false)
  const me = brokerById(CURRENT_BROKER_ID)
  const name = asMember?.name ?? session?.staff?.name ?? me.name
  // a member has his own picture (his initials); staff with no broker's card get initials of their name
  const picture = session && !asMember ? '' : me.avatar
  const unread = notices.filter((n) => !n.read).length

  // the feed opens what was asked for (pages/Community.tsx reads ?open=), keeping the room it is in
  const open = (what: 'search' | 'notices') => {
    const p = new URLSearchParams(pathname === FEED ? search : '')
    p.set('open', what)
    navigate(`${FEED}?${p}`, { replace: pathname === FEED })
  }

  return (
    <div className="ta" data-top-actions>
      <button type="button" className="ta-btn" onClick={() => open('search')} aria-label={myCities.length ? `חיפוש בקהילה, מסונן לפי ${myCities.length} ערים` : 'חיפוש בקהילה'} data-act="open-search">
        <Search aria-hidden />
        {myCities.length > 0 && <i className="ta-dot" aria-hidden />}
      </button>
      <button type="button" className="ta-btn bell" onClick={() => open('notices')} aria-label={unread ? `התראות, ${unread} חדשות` : 'התראות'} data-act="open-notices">
        <Bell aria-hidden />
        {unread > 0 && <b className="ta-count bell-count num">{unread}</b>}
      </button>
      <button type="button" className="ta-me" onClick={() => setMenu(true)} aria-label={`החשבון של ${name}`} aria-haspopup="dialog" data-act="open-profile">
        <Avatar src={picture} name={name} size={36} />
      </button>
      <ProfileMenu open={menu} onClose={() => setMenu(false)} name={name} picture={picture} />
    </div>
  )
}

/** What the picture opens: who is signed in, the way out, the upgrade, and light or dark. */
function ProfileMenu({ open, onClose, name, picture }: { open: boolean; onClose: () => void; name: string; picture: string }) {
  const { isOffice } = useMember()
  const { mode, byHand } = useDayNight()
  const me = brokerById(CURRENT_BROKER_ID)
  const role = session ? (asMember ? me.title : 'צוות הקהילה') : me.title
  const look: { id: 'day' | 'night' | 'auto'; label: string; icon: typeof Sun; on: boolean; set: () => void }[] = [
    { id: 'day', label: 'בהיר', icon: Sun, on: byHand && mode === 'day', set: () => dayNight.set('day') },
    { id: 'night', label: 'כהה', icon: Moon, on: byHand && mode === 'night', set: () => dayNight.set('night') },
    { id: 'auto', label: 'לפי השעה', icon: Clock, on: !byHand, set: () => dayNight.auto() },
  ]
  return (
    <Modal open={open} onClose={onClose} title="החשבון שלי">
      <div className="modal-body pfm" data-profile-menu>
        <div className="pfm-who">
          <Avatar src={picture} name={name} size={52} />
          <span>
            <strong>{name}</strong>
            <small>{role}</small>
          </span>
        </div>

        {!session && (
          <Link to={LOGIN_PATH} className="pfm-row is-main" onClick={onClose} data-signin="menu">
            <i aria-hidden>
              <KeyRound />
            </i>
            <span>
              <b>כניסה לחשבון</b>
              <small>עם קוד מהמייל, בלי סיסמה</small>
            </span>
            <ArrowLeft className="pfm-go" aria-hidden />
          </Link>
        )}
        {session?.staff && (
          <Link to="/kehila/admin" className="pfm-row" onClick={onClose} data-act="to-admin">
            <i aria-hidden>
              <ShieldCheck />
            </i>
            <span>
              <b>מסך הניהול</b>
            </span>
            <ArrowLeft className="pfm-go" aria-hidden />
          </Link>
        )}
        {!isOffice && (
          <Link to={OFFICE_PAGE} className="pfm-row" onClick={onClose} data-upgrade="menu">
            <i aria-hidden>
              <BadgeCheck />
            </i>
            <span>
              <b>{UPGRADE_LABEL}</b>
              <small>0% עמלה למשרד, 100% עמלה למתווך</small>
            </span>
            <ArrowLeft className="pfm-go" aria-hidden />
          </Link>
        )}

        {/* light or dark: by hand, or by the clock (light from 08:00 to 18:00) */}
        <div className="pfm-look" role="group" aria-label="תצוגת יום או לילה" data-look>
          <span className="pfm-label">תצוגה</span>
          <div className="pfm-seg">
            {look.map((l) => (
              <button key={l.id} type="button" aria-pressed={l.on} onClick={l.set} data-mode={l.id}>
                <l.icon aria-hidden /> {l.label}
              </button>
            ))}
          </div>
        </div>

        {session && (
          <button type="button" className="pfm-row is-exit" onClick={() => sessionActions.signOut()} data-act="sign-out">
            <i aria-hidden>
              <LogOut />
            </i>
            <span>
              <b>יציאה</b>
            </span>
          </button>
        )}
      </div>
    </Modal>
  )
}
