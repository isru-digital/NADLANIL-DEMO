import type { ReactElement } from 'react'
import { Link, Navigate, useLocation } from 'react-router-dom'
import { ArrowLeft, BadgeCheck, Check, Home, Lock, UserRound } from 'lucide-react'
import { useMember } from '../config/member'
import { useStore } from '../store'
import { demo } from '../auth/session'
import { COMMUNITY_FEED, COMMUNITY_HOME, COMMUNITY_NAME, OFFICE_ONLY, OFFICE_PAGE, UPGRADE_LABEL } from '../config/community'
import type { ShellNav } from '../config/navExtras'
import { Logo } from '../components/ui'
import Dashboard from '../pages/Dashboard'
import CommunityBrand from './CommunityBrand'
import GetApp from '../pwa/GetApp'
import { runningAsApp } from '../pwa/pwa'
import '../styles/office.css'
import '../styles/kehila.css'

/** The CRM's two views. Each one is its own line under "CRM" in the side menu, and its own screen. */
export const CRM_PATH = '/app/crm'
const CRM_VIEWS = [
  { to: CRM_PATH, label: 'לקוחות', icon: UserRound },
  { to: `${CRM_PATH}?v=properties`, label: 'נכסים', icon: Home },
]

/** The two tools that left the free community and stay in the office only. */
const OFFICE_TOOLS = ['/app/builder', '/app/folder']

/**
 * The menu of a community member: no dashboard (the feed is the first screen), and the landing page builder and the
 * digital folder are there but locked, after the things that are open. An office member's menu is unchanged.
 */
export function useCommunityNav(all: ShellNav[]): ShellNav[] {
  const { isOffice } = useMember()
  // for everyone: opening the CRM opens its two views under it, each one a screen of its own
  const items = all.map((x) => (x.to === CRM_PATH ? { ...x, label: 'CRM', children: CRM_VIEWS } : x))
  if (isOffice) return items
  const open = items.filter((x) => x.to !== '/app' && !OFFICE_TOOLS.includes(x.to))
  const locked = items.filter((x) => OFFICE_TOOLS.includes(x.to)).map((x) => ({ ...x, locked: OFFICE_ONLY }))
  // the first four are the phone's bottom bar: the feed, the brokers, the CRM and the way to the office
  const head = open.filter((x) => x.to !== '/app/agent')
  const tail = open.filter((x) => x.to === '/app/agent')
  return [...head, ...locked, ...tail]
}

/** The name at the top of the app: the community's for a community member, the office's logo for an office member. */
export function ShellBrand({ place }: { place: 'side' | 'top' }) {
  const { isOffice } = useMember()
  const cls = place === 'side' ? 'sidebar-brand' : 'topbar-brand'
  if (isOffice)
    return (
      <Link to="/" className={cls} aria-label="חזרה לדף הבית">
        <Logo size={place === 'side' ? 30 : 26} withName />
      </Link>
    )
  return (
    <Link to={COMMUNITY_HOME} className={`${cls} is-community`} aria-label={`${COMMUNITY_NAME}, לדף הקהילה`}>
      <CommunityBrand size="sm" />
    </Link>
  )
}

/** The first screen inside: an office member has a dashboard, a community member goes straight to the feed. */
export function AppIndex() {
  const { isOffice } = useMember()
  return isOffice ? <Dashboard /> : <Navigate to={COMMUNITY_FEED} replace />
}

/** A clear way from the community to the office's page, on every screen a community member sees inside. */
export function UpgradeBanner() {
  const { isOffice } = useMember()
  const { pathname } = useLocation()
  // the office's own screens and the locked tools already carry this call
  if (isOffice || /^\/app\/(office|builder|folder|agent)/.test(pathname)) return null
  // the feed's top is kept for the posts (Itzik 19.11.2026): there the call is in the menu that the broker's picture
  // opens, and once, quietly, among the posts (UpgradePost below)
  if (pathname === COMMUNITY_FEED) return null
  // a small, quiet strip: one line, never louder than the screen under it
  return (
    <Link to={OFFICE_PAGE} className="upb is-slim">
      <BadgeCheck aria-hidden />
      <span>
        <b>{UPGRADE_LABEL}</b>
        <small>0% עמלה למשרד, 100% עמלה למתווך</small>
      </span>
      <em>
        לפרטים <ArrowLeft />
      </em>
    </Link>
  )
}

/** The same call as one quiet post inside the feed, once: marked as the office's own word, never a broker's post. */
export function UpgradePost() {
  const { isOffice } = useMember()
  if (isOffice) return null
  return (
    <Link to={OFFICE_PAGE} className="upost" data-upgrade="post">
      <i aria-hidden>
        <BadgeCheck />
      </i>
      <span>
        <small>מהמשרד</small>
        <b>{UPGRADE_LABEL}</b>
        <span>0% עמלה למשרד, 100% עמלה למתווך</span>
      </span>
      <em>
        לפרטים <ArrowLeft aria-hidden />
      </em>
    </Link>
  )
}

/** A community member sees the product, not the demo's workshop (see AppShell). */
export function useQuietShell() {
  return !useMember().isOffice
}

/**
 * The one line that says this is a demo: small, at the very bottom of every screen inside the app, never inside
 * the feed or a card. In the presentation it also holds the way to the office member's view.
 */
export function DemoFoot() {
  const { member, setMember } = useMember()
  const { toast } = useStore()
  const next = member === 'office' ? 'community' : 'office'
  return (
    <p className="demo-foot" data-foot>
      <span>נתוני דמו: השמות, הנכסים והמחירים מומצאים</span>
      {!runningAsApp() && (
        <>
          <i aria-hidden>·</i>
          <GetApp place="line" />
        </>
      )}
      {demo && (
        <>
          <i aria-hidden>·</i>
          <button
            type="button"
            data-v={next}
            onClick={() => {
              setMember(next)
              toast(next === 'office' ? 'תצוגת חבר משרד' : 'תצוגת חבר קהילה')
            }}
          >
            {next === 'office' ? 'תצוגת חבר משרד' : 'תצוגת חבר קהילה'}
          </button>
        </>
      )}
    </p>
  )
}

const closed: Record<'builder' | 'folder', { title: string; line: string; points: string[] }> = {
  builder: {
    title: 'בונה דף נחיתה',
    line: 'דף נחיתה אישי לפי תבנית, עם הנכסים שלכם מה-CRM.',
    points: ['שלוש תבניות לבחירה', 'הנכסים מתעדכנים מה-CRM', 'כתובת אישית לשיתוף עם לקוחות'],
  },
  folder: {
    title: 'פולדר דיגיטלי',
    line: 'תיק נכסים ממותג ללקוח, בקישור אחד.',
    points: ['תיק נכסים ממותג בשם שלכם', 'קישור אחד לשליחה ללקוח', 'הלקוח מסמן מה אהב'],
  },
}

/** The landing page builder and the digital folder: an office member gets the screen, a community member its closed door. */
export function OfficeOnly({ id, children }: { id: 'builder' | 'folder'; children: ReactElement }) {
  const { isOffice } = useMember()
  if (isOffice) return children
  const x = closed[id]
  return (
    <div className="of of-screen" data-id={id}>
      <section className="of-locked">
        <div className="of-locked-copy">
          <span className="of-tag is-lock">
            <Lock /> {OFFICE_ONLY}
          </span>
          <h1>{x.title}</h1>
          <p>{x.line}</p>
          <ul>
            {x.points.map((p) => (
              <li key={p}>
                <Check /> {p}
              </li>
            ))}
          </ul>
          <div className="of-locked-cta">
            <Link to={OFFICE_PAGE} className="btn btn-gold btn-lg">
              {UPGRADE_LABEL} <ArrowLeft />
            </Link>
            <Link to="/upgrade" className="btn btn-ghost btn-lg">
              להשוואת המסלולים
            </Link>
          </div>
        </div>
        <div className="of-ghost" aria-hidden>
          <span className="of-ghost-lock">
            <Lock />
          </span>
          <i className="is-a" />
          <i className="is-b" />
          <i className="is-c" />
          <i className="is-d" />
          <i className="is-e" />
        </div>
      </section>
    </div>
  )
}
