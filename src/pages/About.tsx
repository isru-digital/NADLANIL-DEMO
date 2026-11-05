import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft } from 'lucide-react'
import { PLATFORM_NAME } from '../config'
import { aboutSections } from '../data/demo'
import { BackButton, DemoTag, EASE, Logo, Reveal } from '../components/ui'
import '../styles/home.css'
import '../styles/join.css'

/** "אודות": who we are, what we do, where we came from, where we are going. Demo copy only. */
export default function About() {
  useEffect(() => {
    window.scrollTo({ top: 0 })
  }, [])

  return (
    <div className="about">
      <a className="skip-link" href="#content">
        דילוג לתוכן
      </a>
      <header className="home-nav">
        <div className="container home-nav-in">
          <div className="join-top-start">
            <BackButton fallback="/" className="is-icon" />
            <Link to="/" aria-label={PLATFORM_NAME}>
              <Logo size={32} withName />
            </Link>
          </div>
          <nav className="home-nav-links" aria-label="ניווט">
            <Link to="/">דף הבית</Link>
            <Link to="/about" aria-current="page">
              אודות
            </Link>
            <Link to="/app">אזור החבר</Link>
          </nav>
          <div className="home-nav-cta">
            <Link to="/join" className="btn btn-gold btn-sm">
              הצטרפות
            </Link>
          </div>
        </div>
      </header>

      <section className="about-hero grain" id="content">
        <div className="container">
          <motion.span
            className="eyebrow"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1, ease: EASE }}
          >
            אודות
          </motion.span>
          <motion.h1
            initial={{ opacity: 0, y: 26 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.2, ease: EASE }}
          >
            קהילה של מתווכים, <span className="gold-text">בשביל מתווכים.</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 26 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.3, ease: EASE }}
          >
            {PLATFORM_NAME} מחברת בין מתווכים עצמאיים, יוצרת שיתופי פעולה ומגבירה עסקאות. המתווך שומר על הנכסים שלו ועל 100% מהעמלה.
          </motion.p>
          <span className="demo-tag about-draft">טקסט לדוגמה, הנוסח הסופי ייכתב על ידי המייסדים</span>
        </div>
      </section>

      <section className="about-list">
        <div className="container">
          {aboutSections.map((s, i) => (
            <Reveal key={s.id} className="about-row">
              <div className="about-row-label">
                <span className="num">0{i + 1}</span>
                <strong>{s.label}</strong>
              </div>
              <div>
                <h2>{s.title}</h2>
                <p>{s.text}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="final">
        <div className="container">
          <Reveal className="final-card grain">
            <Logo size={54} />
            <h2>רוצים להיות חלק מזה?</h2>
            <p>קהילה חינמית. 100% מהעמלה אצלך.</p>
            <Link to="/join" className="btn btn-gold btn-lg">
              הצטרפות חינם
              <ArrowLeft />
            </Link>
          </Reveal>
        </div>
      </section>

      <footer className="home-foot">
        <div className="container home-foot-in">
          <div className="foot-brand">
            <Logo size={30} withName />
            <p>קהילה חינמית למתווכים עצמאיים.</p>
          </div>
          <nav className="foot-links" aria-label="קישורים">
            <Link to="/">דף הבית</Link>
            <Link to="/join">הצטרפות</Link>
            <Link to="/app/community">קהילה</Link>
          </nav>
          <div className="foot-note">
            <DemoTag />
            <p>אב טיפוס להדגמה בלבד. כל השמות, הנכסים והמחירים באתר מומצאים.</p>
            <p className="faint">נבנה על ידי ISRU-E איציק עוזיאל</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
