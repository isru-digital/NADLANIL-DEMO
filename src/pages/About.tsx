import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, BadgeCheck, Coins, UserRound, Users } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { PLATFORM_NAME, PLATFORM_SUBNAME } from '../config'
import { BackButton, DemoTag, EASE, Logo, Reveal } from '../components/ui'
import '../styles/join-green.css'
import '../styles/about.css'

/**
 * The about page (green version). Everything here follows the business idea only: an office in national spread,
 * 0% of the commission to the office and 100% to the broker, with a free community around it. No dates, no
 * numbers of brokers, no biographies: those are filled in when they are real.
 */
const layers: { icon: LucideIcon; tag: string; title: string; text: string }[] = [
  { icon: Users, tag: 'תמיד בחינם', title: 'הקהילה', text: 'פיד לפי נושאים, אינדקס מתווכים, CRM, דף נחיתה ופולדר ללקוח. מי שנכנס מקבל ערך אמיתי, בלי לשלם.' },
  { icon: Coins, tag: 'לפי שימוש', title: 'כלים מתקדמים', text: 'למי שרוצה יותר בלי להצטרף למשרד: כלים מתקדמים שפותחים רק כשצריך אותם.' },
  { icon: BadgeCheck, tag: 'המסלול המלא', title: 'המשרד', text: 'שם ומותג של משרד ארצי, דף אישי, צוות שמלווה, וכל הכלים המתקדמים כלולים. והעמלה כולה שלכם.' },
]

export default function About() {
  return (
    <div className="jo ab">
      <header className="jc-top">
        <div className="jc-top-start">
          <BackButton fallback="/" className="is-icon" />
          <Link to="/" aria-label="דף הבית">
            <Logo size={30} withName />
          </Link>
        </div>
        <div className="jc-top-end">
          <Link to="/join" className="jo-free">
            הצטרפות
          </Link>
          <DemoTag />
        </div>
      </header>

      <section className="jo-hero ab-hero">
        <i className="jo-grid" aria-hidden />
        <div className="jo-in jo-hero-in">
          <motion.span className="jo-kicker" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: EASE }}>
            אודות
          </motion.span>
          <motion.h1 initial={{ opacity: 0, y: 22 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.1, ease: EASE }}>
            {PLATFORM_NAME}
            <br />
            <span>{PLATFORM_SUBNAME}</span>
          </motion.h1>
          <motion.p className="jo-sub" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.2, ease: EASE }}>
            משרד תיווך בפריסה ארצית, שבו העמלה נשארת אצל מי שעשה את העבודה.
          </motion.p>
          <motion.div className="ab-split" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.8, delay: 0.3, ease: EASE }}>
            <div>
              <b className="num">0%</b>
              <span>עמלה למשרד</span>
            </div>
            <i aria-hidden />
            <div>
              <b className="num">100%</b>
              <span>עמלה למתווך</span>
            </div>
          </motion.div>
        </div>
      </section>

      <section className="jo-section" id="who">
        <div className="jo-in ab-text">
          <Reveal className="jo-head">
            <span className="jo-tag">מי אנחנו</span>
            <h2>משרד אחד, מתווכים חופשיים</h2>
          </Reveal>
          <Reveal delay={0.05}>
            <p>
              {PLATFORM_NAME} הוא משרד תיווך בפריסה ארצית, ומסביבו קהילה פתוחה של מתווכים. אנחנו מאמינים במתווך חופשי: עצמאי בעבודה שלו, עם גב של משרד מאחוריו.
            </p>
            <p>ההבדל מתחיל בעמלה. במשרד שלנו 0% מהעמלה הולך למשרד, ו-100% נשאר אצל המתווך.</p>
          </Reveal>
        </div>
      </section>

      <section className="jo-section is-tint" id="what">
        <div className="jo-in">
          <Reveal className="jo-head">
            <span className="jo-tag">מה אנחנו עושים</span>
            <h2>שלוש דרכים לעבוד איתנו</h2>
            <p>מתחילים בחינם בקהילה, ועולים שלב רק כשזה משתלם לכם.</p>
          </Reveal>
          <div className="jo-gains ab-layers">
            {layers.map((l, i) => (
              <Reveal key={l.title} delay={i * 0.07} className={`jo-gain${i === 2 ? ' is-top' : ''}`}>
                <span>
                  <l.icon />
                </span>
                <em>{l.tag}</em>
                <h3>{l.title}</h3>
                <p>{l.text}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="jo-section" id="road">
        <div className="jo-in">
          <Reveal className="jo-head">
            <span className="jo-tag">מאיפה באנו ולאן הולכים</span>
            <h2>מהרעיון ועד להקמה</h2>
          </Reveal>
          <div className="ab-road">
            <Reveal className="ab-road-card">
              <small>מאיפה באנו</small>
              <h3>שאלה אחת פשוטה</h3>
              <p>מתווך עובד קשה על כל עסקה, במשרדים רבים חלק מהעמלה (לרוב 50%) נשאר במשרד. שאלנו מה יקרה אם המשרד ייתן את הגב, והעמלה תישאר אצל המתווך.</p>
            </Reveal>
            <Reveal delay={0.08} className="ab-road-card is-next">
              <small>לאן הולכים</small>
              <h3>קודם קהילה, ואז UP</h3>
              <p>הקהילה החינמית מחברת מתווכים מכל הארץ ונותנת ערך לכל מי שנכנס. המשרד הוא השלב הבא, למי שרוצה את כל הכלים, את המותג ואת הצוות.</p>
            </Reveal>
          </div>
        </div>
      </section>

      <section className="jo-section is-tint" id="team">
        <div className="jo-in">
          <Reveal className="jo-head">
            <span className="jo-tag">הצוות</span>
            <h2>האנשים שמאחורי {PLATFORM_NAME}</h2>
            <p>השמות ימולאו בהמשך.</p>
          </Reveal>
          <div className="ab-team">
            {[0, 1, 2].map((i) => (
              <Reveal key={i} delay={i * 0.06} className="ab-person">
                <span>
                  <UserRound />
                </span>
                <b>שם ימולא בהמשך</b>
                <small>תפקיד ימולא בהמשך</small>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="jo-final">
        <i className="jo-grid" aria-hidden />
        <div className="jo-in jo-final-in">
          <h2>בואו להיות מתווכים חופשיים</h2>
          <p>מתחילים בקהילה, בחינם.</p>
          <div className="ab-final-cta">
            <Link to="/join" className="btn btn-white btn-lg">
              הצטרפות <ArrowLeft />
            </Link>
            <Link to="/join/office" className="btn btn-outline-white btn-lg">
              להכיר את המשרד
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
