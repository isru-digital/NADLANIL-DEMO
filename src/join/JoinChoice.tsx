import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, BadgeCheck, Check, Lock, Users } from 'lucide-react'
import { BackButton, DemoTag, EASE, Logo } from '../components/ui'
import { OFFICE_NAME, PRICE_TBD } from '../config/office'
import '../styles/join-green.css'

const community = ['קהילת מתווכים ארצית ופיד שת"פים', 'CRM למתווך ופולדר דיגיטלי', 'דף נחיתה אישי לפי תבנית', 'בקשות חיפוש והתאמות שמורות', 'מחירים מוזלים אצל שמאים ועורכי דין']
const office = ['כל מה שבקהילה', 'הסוכן שלנו: דף אישי מרשים שמופיע בגוגל', 'שם ומותג של משרד תיווך ארצי', 'ליווי וניהול מקצועי של צוות המשרד', 'עדיפות לכלי הבטא החדשים']

/** The first screen of joining (green version): the free community, or the office. No price is shown: it is not decided. */
export default function JoinChoice() {
  return (
    <div className="jc">
      <header className="jc-top">
        <div className="jc-top-start">
          <BackButton fallback="/" className="is-icon" />
          <Link to="/" aria-label="דף הבית">
            <Logo size={30} withName />
          </Link>
        </div>
        <DemoTag />
      </header>

      <main className="jc-main">
        <motion.div className="jc-head" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: EASE }}>
          <span className="jc-kicker">הצטרפות</span>
          <h1>איך רוצים להצטרף?</h1>
          <p>אפשר להתחיל בקהילה, בחינם, ולעבור למשרד בכל שלב.</p>
        </motion.div>

        <div className="jc-grid">
          <motion.article className="jc-card is-office" initial={{ opacity: 0, y: 26 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.1, ease: EASE }}>
            <span className="jc-ribbon">המסלול המלא</span>
            <span className="jc-icon">
              <BadgeCheck />
            </span>
            <h2>{OFFICE_NAME}</h2>
            <div className="jc-price">
              <b className="num">0%</b>
              <small>עמלה למשרד. דמי חבר: {PRICE_TBD}</small>
            </div>
            <p className="jc-sub">כל מה שבקהילה, ועוד: משרד תיווך ארצי בשמך, דף אישי שמביא לקוחות מגוגל, ו-100% מהעמלה אצלך.</p>
            <ul>
              {office.map((t) => (
                <li key={t}>
                  <Check /> {t}
                </li>
              ))}
            </ul>
            <Link to="/join/office" className="btn btn-white btn-lg jc-cta">
              למה כדאי להצטרף למשרד
              <ArrowLeft />
            </Link>
            <small className="jc-lock">
              <Lock /> בדמו אין חיוב אמיתי.
            </small>
          </motion.article>
          <motion.article className="jc-card" initial={{ opacity: 0, y: 26 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.2, ease: EASE }}>
            <span className="jc-icon">
              <Users />
            </span>
            <h2>הקהילה</h2>
            <div className="jc-price">
              <b>חינם</b>
              <small>בלי כרטיס אשראי</small>
            </div>
            <p className="jc-sub">להכיר את המערכת, לעבוד עם מתווכים בכל הארץ ולהתחיל לשתף פעולה.</p>
            <ul>
              {community.map((t) => (
                <li key={t}>
                  <Check /> {t}
                </li>
              ))}
            </ul>
            <Link to="/join/community" className="btn btn-ghost btn-lg jc-cta">
              להצטרף לקהילה, בחינם
              <ArrowLeft />
            </Link>
          </motion.article>

        </div>
      </main>
    </div>
  )
}
