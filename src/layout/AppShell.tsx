import { Fragment, useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
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
import { CURRENT_BROKER_ID } from '../config'
import { extraNav, extraResets, shellSlots } from '../config/navExtras'
import type { ShellNav } from '../config/navExtras'
import { brokerById } from '../data/demo'
import { useStore } from '../store'
import { Avatar, BackButton, DemoTag, EASE, Logo, Modal } from '../components/ui'
import MatchAlert from '../components/MatchAlert'
import BetaLab, { labItems } from '../components/BetaLab'
import type { LabView } from '../components/BetaLab'
import '../styles/shell.css'

type NavItem = ShellNav

const baseNav: NavItem[] = [
  { to: '/app', label: 'דשבורד', icon: LayoutDashboard, end: true },
  { to: '/app/community', label: 'קהילה', icon: MessagesSquare },
  { to: '/app/brokers', label: 'אינדקס מתווכים', short: 'מתווכים', icon: Users },
  { to: '/app/crm', label: 'CRM - לקוחות ונכסים', short: 'CRM', icon: KanbanSquare },
  { to: '/app/builder', label: 'בונה דף נחיתה', short: 'דף נחיתה', icon: LayoutTemplate },
  { to: '/app/folder', label: 'פולדר דיגיטלי', short: 'פולדר', icon: FolderOpen },
]

/** A line under an entry is the current one when its path and its `v` (the view inside the page) both match. */
const subActive = (to: string, pathname: string, search: string) => {
  const [path, query = ''] = to.split('?')
  return pathname === path && (new URLSearchParams(query).get('v') ?? '') === (new URLSearchParams(search).get('v') ?? '')
}

export default function AppShell() {
  const all: NavItem[] = [...baseNav, ...extraNav]
  // the green version may change the menu for the member who is looking (see config/navExtras)
  const nav = shellSlots.useNav ? shellSlots.useNav(all) : all
  const location = useLocation()
  const { reset, toast } = useStore()
  const me = brokerById(CURRENT_BROKER_ID)
  const [moreOpen, setMoreOpen] = useState(false)
  const [lab, setLab] = useState<LabView>(null)
  const Bar = shellSlots.bar
  const Badge = shellSlots.badge
  const Lab = shellSlots.lab ?? BetaLab
  const Brand = shellSlots.brand
  const Banner = shellSlots.banner
  const Foot = shellSlots.foot
  const TopEnd = shellSlots.topEnd
  const Account = shellSlots.account
  // a community member sees the product, not the demo's workshop: no beta lab, no demo tags, no reset here
  const quiet = shellSlots.useQuiet ? shellSlots.useQuiet() : false

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
        {Brand ? (
          <Brand place="side" />
        ) : (
          <Link to="/" className="sidebar-brand" aria-label="חזרה לדף הבית">
            <Logo size={30} withName />
          </Link>
        )}

        <nav className="side-nav" aria-label="ניווט ראשי">
          {nav.map((item) => (
            <Fragment key={item.to}>
            <NavLink to={item.to} end={item.end} className="side-link">
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
                  {item.locked && (
                    <em className="nav-lock" title={item.locked} aria-label={item.locked}>
                      <Lock />
                    </em>
                  )}
                </>
              )}
            </NavLink>
            {/* the lines that open under an entry while the visitor is inside it (the green version's CRM) */}
            {item.children && location.pathname.startsWith(item.to) && (
              <div className="side-sub" role="group" aria-label={item.label}>
                {item.children.map((ch) => {
                  const on = subActive(ch.to, location.pathname, location.search)
                  return (
                    <Link key={ch.to} to={ch.to} className={`side-sub-link${on ? ' active' : ''}`} aria-current={on ? 'page' : undefined}>
                      {ch.icon && <ch.icon />}
                      <span>{ch.label}</span>
                    </Link>
                  )
                })}
              </div>
            )}
            </Fragment>
          ))}
        </nav>

        {!quiet && (
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
        )}

        <div className="sidebar-foot">
          {Account && <Account place="side" />}
          {/* the small 0% / 100% box that stood here is gone (Itzik 27.11.2026): the message lives on the office's page */}
          <div className="side-user">
            <Avatar src={me.avatar} name={me.name} size={40} ring />
            <div>
              <strong>{me.name}</strong>
              <span>{me.title}</span>
              {Badge && <Badge />}
            </div>
          </div>
          {!quiet && (
            <div className="side-demo">
              <DemoTag />
              <button className="side-reset" onClick={resetDemo}>
                <RotateCcw />
                איפוס
              </button>
            </div>
          )}
        </div>
      </aside>

      <header className={`topbar${Bar ? ' has-bar' : ''}`} data-root={nav.some((n) => n.to === location.pathname) || location.pathname === '/app' ? '' : undefined}>
        <div className="topbar-start">
          <BackButton fallback="/" className="is-icon" />
          {Brand ? (
            <Brand place="top" />
          ) : (
            <Link to="/" className="topbar-brand" aria-label="דף הבית">
              <Logo size={26} withName />
            </Link>
          )}
        </div>
        {!quiet && <DemoTag />}
        {TopEnd && <TopEnd />}
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
        {Banner && <Banner />}
        <motion.div
          key={location.pathname}
          className="main-page"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.24, ease: EASE }}
        >
          <Outlet />
        </motion.div>
        {Foot && <Foot />}
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
          {Account && <Account place="more" />}
          {nav.slice(4).map((item) => (
            <Link key={item.to} to={item.to} className="more-link">
              <item.icon />
              <span>{item.label}</span>
              {item.locked && (
                <em className="nav-lock is-text">
                  <Lock />
                  {item.locked}
                </em>
              )}
            </Link>
          ))}
          {!quiet && (
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
          )}
          <Link to="/" className="more-link">
            <Home />
            <span>דף הבית</span>
          </Link>
          {!quiet && (
            <button className="more-link" onClick={resetDemo}>
              <RotateCcw />
              <span>איפוס נתוני הדמו</span>
            </button>
          )}
        </div>
      </Modal>
    </div>
  )
}
