import { useEffect, useState } from 'react'
import { Link, NavLink, useLocation, useOutlet } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import {
  FolderOpen,
  Home,
  KanbanSquare,
  LayoutDashboard,
  LayoutTemplate,
  Menu,
  MessagesSquare,
  RotateCcw,
  Users,
} from 'lucide-react'
import { CURRENT_BROKER_ID, PLATFORM_TAGLINE } from '../config'
import { brokerById } from '../data/demo'
import { useStore } from '../store'
import { Avatar, BackButton, DemoTag, EASE, Logo, Modal } from '../components/ui'
import MatchAlert from '../components/MatchAlert'
import '../styles/shell.css'

const nav = [
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
  const location = useLocation()
  const { reset, toast } = useStore()
  const me = brokerById(CURRENT_BROKER_ID)
  const [moreOpen, setMoreOpen] = useState(false)

  useEffect(() => {
    setMoreOpen(false)
    window.scrollTo({ top: 0 })
  }, [location.pathname])

  const resetDemo = () => {
    reset()
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

      <header className="topbar">
        <div className="topbar-start">
          <BackButton fallback="/" className="is-icon" />
          <Link to="/" className="topbar-brand" aria-label="דף הבית">
            <Logo size={26} withName />
          </Link>
        </div>
        <DemoTag />
      </header>

      <main className="main" id="main" tabIndex={-1}>
        <div className="main-back">
          <BackButton fallback="/" />
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
          className={`bottom-link${/builder|folder/.test(location.pathname) ? ' active' : ''}`}
          onClick={() => setMoreOpen(true)}
          aria-haspopup="dialog"
        >
          <Menu />
          <span>עוד</span>
        </button>
      </nav>

      <MatchAlert />

      <Modal open={moreOpen} onClose={() => setMoreOpen(false)} title="עוד כלים">
        <div className="modal-body more-sheet">
          {nav.slice(4).map((item) => (
            <Link key={item.to} to={item.to} className="more-link">
              <item.icon />
              <span>{item.label}</span>
            </Link>
          ))}
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
