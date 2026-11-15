import { useEffect } from 'react'
import type { ReactElement } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, Check, Lock } from 'lucide-react'
import { PLATFORM_NAME } from '../config'
import { COMMUNITY_DESC, COMMUNITY_FEED, COMMUNITY_HOME, COMMUNITY_JOIN, COMMUNITY_NAME, COMMUNITY_SUB, OFFICE_ONLY } from '../config/community'
import { DemoTag, EASE, Reveal } from '../components/ui'
import CommunityBrand from './CommunityBrand'
import { hasAccess } from '../auth/session'
import OfficePitch from './OfficePitch'
import { KhBackdrop, KhCollage, KhNow } from './KhHero'
import { IconBuyer, IconChatIn, IconCrm, IconDeal, IconFeed, IconFolder, IconHome, IconIndex, IconPage } from './KhIcons'
import { asset } from '../config'
import '../styles/join-green.css'
import '../styles/kehila.css'
import '../styles/kehila-home.css'

/**
 * The community's own entry page, with its own name (stands for its own address, apart from the office's page).
 * From here a broker joins or enters, and lands in the feed. Nothing here is a number or a fact that was not given.
 */
type Icon = (p: { className?: string }) => ReactElement
const pillars: { icon: Icon; title: string; text: string }[] = [
  { icon: IconHome, title: 'נכסים', text: 'משתפים נכסים עם מתווכים מכל הארץ.' },
  { icon: IconBuyer, title: 'קונים', text: 'מאתרים קונים דרך מתווכים אחרים.' },
  { icon: IconDeal, title: 'שיתופי פעולה', text: 'מתייעצים, משתפים פעולה ויוצרים הזדמנויות עסקיות.' },
]

const inside: { icon: Icon; text: string }[] = [
  { icon: IconFeed, text: 'פיד הקהילה, לפי נושאים' },
  { icon: IconIndex, text: 'אינדקס מתווכים' },
  { icon: IconCrm, text: 'CRM ללקוחות ולנכסים' },
  { icon: IconChatIn, text: 'מוואטסאפ למערכת' },
]

const officeOnly: { icon: Icon; text: string }[] = [
  { icon: IconPage, text: 'בונה דף נחיתה' },
  { icon: IconFolder, text: 'פולדר דיגיטלי' },
]

const rise = (i: number) => ({
  initial: { opacity: 0, y: 22 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.8, delay: 0.08 + i * 0.08, ease: EASE },
})

export default function CommunityHome() {
  // whoever is already in goes straight to the feed; anyone else signs in first
  const enter = hasAccess ? COMMUNITY_FEED : '/kehila/login'
  useEffect(() => {
    const prev = document.title
    document.title = `${COMMUNITY_NAME} | מבית ${PLATFORM_NAME}`
    window.scrollTo({ top: 0 })
    return () => {
      document.title = prev
    }
  }, [])

  return (
    <div className="jo kh khv">
      <header className="jc-top kh-top">
        <Link to={COMMUNITY_HOME} className="kh-brand" aria-label={`${COMMUNITY_NAME}, דף הקהילה`}>
          <CommunityBrand />
        </Link>
        <div className="jc-top-end">
          <Link to={enter} className="jo-free">
            כניסה
          </Link>
          <DemoTag />
        </div>
      </header>

      <section className="kh-hero khv-hero">
        <KhBackdrop />
        <div className="jo-in khv-hero-in">
          <div className="khv-copy">
          <motion.span className="khv-kicker" {...rise(0)}>
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
          <motion.p className="kh-desc" {...rise(4)}>
            {COMMUNITY_DESC}
          </motion.p>
          <motion.div className="kh-cta" {...rise(5)}>
            <Link to={COMMUNITY_JOIN} className="btn btn-lg khv-primary">
              הצטרפות לקהילה, בחינם <ArrowLeft />
            </Link>
            <Link to={enter} className="btn btn-lg khv-ghost">
              כניסה לחברים
            </Link>
          </motion.div>
          <motion.small className="kh-note" {...rise(6)}>
            ההצטרפות באישור: נרשמים, הצוות מאשר, ומקבלים מייל עם כניסה.
          </motion.small>
          <motion.div {...rise(7)}>
            <KhNow />
          </motion.div>
          </div>
          <KhCollage />
        </div>
      </section>

      <section className="jo-section khv-pillars-wrap">
        <div className="jo-in">
          <div className="kh-pillars khv-bento">
            {pillars.map((p, i) => (
              <Reveal key={p.title} delay={i * 0.07} className={`kh-pillar khv-pillar is-${i + 1}`}>
                <span className="khv-pillar-icon">
                  <p.icon />
                </span>
                <h2>{p.title}</h2>
                <p>{p.text}</p>
                {i === 0 && (
                  <span className="khv-pillar-art" aria-hidden="true">
                    <img src={asset('img/il-ramat-gan-living.webp')} alt="" width="1100" height="829" loading="lazy" />
                    <span className="khv-pillar-chip">
                      <IconHome /> נכס ששותף <em className="khv-sample">דוגמה</em>
                    </span>
                  </span>
                )}
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="jo-section is-tint khv-inside-wrap">
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
          <OfficePitch />
        </div>
      </section>

      <footer className="kh-foot">
        <div className="jo-in kh-foot-in">
          <CommunityBrand size="sm" />
          <nav aria-label="קישורים">
            <Link to={COMMUNITY_JOIN}>הצטרפות</Link>
            <Link to={enter}>כניסה</Link>
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
