import { useEffect, useState } from 'react'
import { Link, NavLink, useLocation, useOutlet } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import {
  FolderOpen,
  Home,
  KanbanSquare,
  LayoutDashboard,
  LayoutGrid,
  LayoutTemplate,
  Lock,
  Menu,
  MessagesSquare,
  RotateCcw,
  Users,
} from 'lucide-react'
import { CURRENT_BROKER_ID, PLATFORM_TAGLINE } from '../config'
import { extraNav, extraResets, shellSlots } from '../config/navExtras'
import type { LucideIcon } from 'lucide-react'
import { brokerById } from '../data/demo'
import { useStore } from '../store'
import { Avatar, BackButton, DemoTag, EASE, Logo, Modal } from '../components/ui'
import MatchAlert from '../components/MatchAlert'
import BetaLab, { labItems } from '../components/BetaLab'
import type { LabView } from '../components/BetaLab'
import '../styles/shell.css'

type NavItem = { to: string; label: string; short?: string; icon: LucideIcon; end?: boolean }

const baseNav = [
  { to: '/app', label: 'דשבורד', icon: LayoutDashboard, end: true },
  { to: '/app/community', label: 'קהילה', icon: MessagesSquare },
  { to: '/app/brokers', label: 'אינדקס מתווכים', short: 'מתווכים', icon: Users },
  { to: '/app/crm', label: 'CRM - לקוחות ונכסים', short: 'CRM', icon: KanbanSquare },
  { to: '/app/builder', label: 'בונה דף נחיתה', short: 'דף נחיתה', icon: LayoutTemplate },
  { to: '/app/folder', label: 'פולדר דיגיטלי', short: 'פולדר', icon: FolderOpen },
]

/**
 * Keeps rendering the route it was mounted with. Without this the exiting page
 * would already show the next route, and its exit animation would never finish.
 */
function FrozenOutlet() {
  const outlet = useOutlet()
  const [frozen] = useState(outlet)
  return frozen
}

export default function AppShell() {
  const nav: NavItem[] = [...baseNav, ...extraNav]
  const location = useLocation()
  const { reset, toast } = useStore()
  const me = brokerById(CURRENT_BROKER_ID)
  const [moreOpen, setMoreOpen] = useState(false)
  const [lab, setLab] = useState<LabView>(null)
  const Bar = shellSlots.bar
  const Badge = shellSlots.badge
  const Lab = shellSlots.lab ?? BetaLab

  useEffect(() => {
    setMoreOpen(false)
    window.scrollTo({ top: 0 })
  }, [location.pathname])

  const resetDemo = () => {
    reset()
    extraResets.forEach((fn) => fn())
    toast('הדמו אופס לנתוני ההתחלה')
  }

  return (
    <div className="shell">
      <a className="skip-link" href="#main">
        דילוג לתוכן
      </a>

      <aside className="sidebar">
        <Link to="/" className="sidebar-brand" aria-label="חזרה לדף הבית">
          <Logo size={30} withName />
        </Link>

        <nav className="side-nav" aria-label="ניווט ראשי">
          {nav.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end} className="side-link">
              {({ isActive }) => (
                <>
                  {isActive && (
                    <motion.span
                      layoutId="side-active"
                      className="side-active"
                      transition={{ type: 'spring', stiffness: 420, damping: 36 }}
                    />
                  )}
                  <item.icon />
                  <span>{item.label}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="side-lab">
          <span className="side-lab-title">
            מעבדת בטא
            <em className="beta-chip">
              <Lock />
              בטא
            </em>
          </span>
          {labItems
            .filter((x) => x.id === 'voice' || x.id === 'room')
            .map((x) => (
              <button key={x.id} className="side-link side-lab-link" onClick={() => setLab(x.id)} aria-haspopup="dialog">
                <x.icon />
                <span>{x.title}</span>
              </button>
            ))}
          <button className="side-link side-lab-link is-all" onClick={() => setLab('hub')} aria-haspopup="dialog">
            <LayoutGrid />
            <span>כל הכלים ({labItems.length})</span>
          </button>
        </div>

        <div className="sidebar-foot">
          <div className="side-principle">
            {PLATFORM_TAGLINE.map((part) => {
              const [num, ...rest] = part.split(' ')
              return (
                <div key={part}>
                  <strong className="gold-text num">{num}</strong>
                  <span>{rest.join(' ')}</span>
                </div>
              )
            })}
          </div>
          <div className="side-user">
            <Avatar src={me.avatar} name={me.name} size={40} ring />
            <div>
              <strong>{me.name}</strong>
              <span>{me.title}</span>
              {Badge && <Badge />}
            </div>
          </div>
          <div className="side-demo">
            <DemoTag />
            <button className="side-reset" onClick={resetDemo}>
              <RotateCcw />
              איפוס
            </button>
          </div>
        </div>
      </aside>

      <header className={`topbar${Bar ? ' has-bar' : ''}`}>
        <div className="topbar-start">
          <BackButton fallback="/" className="is-icon" />
          <Link to="/" className="topbar-brand" aria-label="דף הבית">
            <Logo size={26} withName />
          </Link>
        </div>
        <DemoTag />
        {Bar && (
          <div className="topbar-bar">
            <Bar />
          </div>
        )}
      </header>

      <main className="main" id="main" tabIndex={-1}>
        <div className={`main-back${Bar ? ' has-bar' : ''}`}>
          <BackButton fallback="/" />
          {Bar && <Bar />}
        </div>
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.28, ease: EASE }}
          >
            <FrozenOutlet />
          </motion.div>
        </AnimatePresence>
      </main>

      <nav className="bottom-nav" aria-label="ניווט ראשי">
        {nav.slice(0, 4).map((item) => (
          <NavLink key={item.to} to={item.to} end={item.end} className="bottom-link">
            <item.icon />
            <span>{item.short ?? item.label}</span>
          </NavLink>
        ))}
        <button
          className={`bottom-link${/builder|folder|agent|office/.test(location.pathname) ? ' active' : ''}`}
          onClick={() => setMoreOpen(true)}
          aria-haspopup="dialog"
        >
          <Menu />
          <span>עוד</span>
        </button>
      </nav>

      <MatchAlert />
      <Lab view={lab} setView={setLab} />

      <Modal open={moreOpen} onClose={() => setMoreOpen(false)} title="עוד כלים">
        <div className="modal-body more-sheet">
          {nav.slice(4).map((item) => (
            <Link key={item.to} to={item.to} className="more-link">
              <item.icon />
              <span>{item.label}</span>
            </Link>
          ))}
          <button
            className="more-link"
            onClick={() => {
              setMoreOpen(false)
              setLab('hub')
            }}
          >
            <LayoutGrid />
            <span>מעבדת בטא</span>
            <em className="beta-chip">
              <Lock />
              בטא
            </em>
          </button>
          <Link to="/" className="more-link">
            <Home />
            <span>דף הבית</span>
          </Link>
          <button className="more-link" onClick={resetDemo}>
            <RotateCcw />
            <span>איפוס נתוני הדמו</span>
          </button>
        </div>
      </Modal>
    </div>
  )
}
