import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, BadgeCheck, Building2, Check, FolderOpen, Handshake, KanbanSquare, LayoutTemplate, Lock, MessageCircle, MessagesSquare, Search, Users } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { PLATFORM_NAME } from '../config'
import { COMMUNITY_DESC, COMMUNITY_FEED, COMMUNITY_HOME, COMMUNITY_JOIN, COMMUNITY_NAME, COMMUNITY_SUB, OFFICE_ONLY, OFFICE_PAGE, UPGRADE_LABEL } from '../config/community'
import { DemoTag, EASE, Reveal } from '../components/ui'
import CommunityBrand from './CommunityBrand'
import '../styles/join-green.css'
import '../styles/community.css'

/**
 * The community's own entry page, with its own name (stands for its own address, apart from the office's page).
 * From here a broker joins or enters, and lands in the feed. Nothing here is a number or a fact that was not given.
 */
const pillars: { icon: LucideIcon; title: string; text: string }[] = [
  { icon: Building2, title: 'נכסים', text: 'משתפים נכסים עם מתווכים מכל הארץ.' },
  { icon: Search, title: 'קונים', text: 'מאתרים קונים דרך מתווכים אחרים.' },
  { icon: Handshake, title: 'שיתופי פעולה', text: 'מתייעצים, משתפים פעולה ויוצרים הזדמנויות עסקיות.' },
]

const inside: { icon: LucideIcon; text: string }[] = [
  { icon: MessagesSquare, text: 'פיד הקהילה, לפי נושאים' },
  { icon: Users, text: 'אינדקס מתווכים' },
  { icon: KanbanSquare, text: 'CRM ללקוחות ולנכסים' },
  { icon: MessageCircle, text: 'מוואטסאפ למערכת' },
]

const officeOnly: { icon: LucideIcon; text: string }[] = [
  { icon: LayoutTemplate, text: 'בונה דף נחיתה' },
  { icon: FolderOpen, text: 'פולדר דיגיטלי' },
]

const rise = (i: number) => ({
  initial: { opacity: 0, y: 22 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.8, delay: 0.08 + i * 0.08, ease: EASE },
})

export default function CommunityHome() {
  useEffect(() => {
    const prev = document.title
    document.title = `${COMMUNITY_NAME} | מבית ${PLATFORM_NAME}`
    window.scrollTo({ top: 0 })
    return () => {
      document.title = prev
    }
  }, [])

  return (
    <div className="jo kh">
      <header className="jc-top kh-top">
        <Link to={COMMUNITY_HOME} className="kh-brand" aria-label={`${COMMUNITY_NAME}, דף הקהילה`}>
          <CommunityBrand />
        </Link>
        <div className="jc-top-end">
          <Link to={COMMUNITY_FEED} className="jo-free">
            כניסה
          </Link>
          <DemoTag />
        </div>
      </header>

      <section className="jo-hero kh-hero">
        <i className="jo-grid" aria-hidden />
        <div className="jo-in jo-hero-in">
          <motion.span className="jo-kicker" {...rise(0)}>
            הקהילה החינמית של המתווכים
          </motion.span>
          <motion.h1 {...rise(1)}>{COMMUNITY_NAME}</motion.h1>
          <motion.span className="kh-from" {...rise(2)}>
            מבית <bdi dir="ltr">{PLATFORM_NAME}</bdi>
          </motion.span>
          <motion.ul className="kh-sub" aria-label={COMMUNITY_SUB.join(', ')} {...rise(3)}>
            {COMMUNITY_SUB.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </motion.ul>
          <motion.p className="jo-sub kh-desc" {...rise(4)}>
            {COMMUNITY_DESC}
          </motion.p>
          <motion.div className="kh-cta" {...rise(5)}>
            <Link to={COMMUNITY_JOIN} className="btn btn-white btn-lg">
              הצטרפות לקהילה, בחינם <ArrowLeft />
            </Link>
            <Link to={COMMUNITY_FEED} className="btn btn-outline-white btn-lg">
              כניסה לחברים
            </Link>
          </motion.div>
          <motion.small className="kh-note" {...rise(6)}>
            אחרי הכניסה מגיעים ישר לפיד של הקהילה.
          </motion.small>
        </div>
      </section>

      <section className="jo-section">
        <div className="jo-in">
          <div className="kh-pillars">
            {pillars.map((p, i) => (
              <Reveal key={p.title} delay={i * 0.07} className="kh-pillar">
                <span>
                  <p.icon />
                </span>
                <h2>{p.title}</h2>
                <p>{p.text}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="jo-section is-tint">
        <div className="jo-in kh-inside">
          <Reveal className="jo-head">
            <span className="jo-tag">מה יש בקהילה</span>
            <h2>מה מקבלים בחינם</h2>
          </Reveal>
          <Reveal delay={0.05}>
            <ul className="kh-list">
              {inside.map((x) => (
                <li key={x.text}>
                  <i>
                    <x.icon />
                  </i>
                  <span>{x.text}</span>
                  <em>
                    <Check /> חינם
                  </em>
                </li>
              ))}
              {officeOnly.map((x) => (
                <li key={x.text} className="is-locked">
                  <i>
                    <x.icon />
                  </i>
                  <span>{x.text}</span>
                  <em>
                    <Lock /> {OFFICE_ONLY}
                  </em>
                </li>
              ))}
            </ul>
          </Reveal>
        </div>
      </section>

      <section className="jo-section">
        <div className="jo-in">
          <Reveal className="kh-office">
            <span className="kh-office-ico">
              <BadgeCheck />
            </span>
            <div>
              <small>רוצים יותר מהקהילה?</small>
              <h2>
                המשרד <bdi dir="ltr">{PLATFORM_NAME}</bdi>
              </h2>
              <p>משרד תיווך ארצי עם 0% עמלה למשרד. דף נחיתה, פולדר דיגיטלי וכל הכלים המתקדמים כלולים.</p>
            </div>
            <Link to={OFFICE_PAGE} className="btn btn-gold btn-lg">
              {UPGRADE_LABEL} <ArrowLeft />
            </Link>
          </Reveal>
        </div>
      </section>

      <footer className="kh-foot">
        <div className="jo-in kh-foot-in">
          <CommunityBrand size="sm" />
          <nav aria-label="קישורים">
            <Link to={COMMUNITY_JOIN}>הצטרפות</Link>
            <Link to={COMMUNITY_FEED}>כניסה</Link>
            <Link to="/">
              לאתר <bdi dir="ltr">{PLATFORM_NAME}</bdi>
            </Link>
          </nav>
          <p>אב טיפוס להדגמה בלבד. כל השמות, הנכסים והמחירים באתר מומצאים.</p>
        </div>
      </footer>
    </div>
  )
}
