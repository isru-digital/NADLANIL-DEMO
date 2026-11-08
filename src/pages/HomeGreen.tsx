import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, Heart } from 'lucide-react'
import { PLATFORM_NAME, PLATFORM_TAGLINE, asset } from '../config'
import { brokers, formatPriceShort } from '../data/demo'
import { Avatar, DemoTag, EASE, Logo, Reveal } from '../components/ui'
import NetworkMap from '../components/NetworkMap'
import OpenPanels from '../components/OpenPanels'
import { CountUp, SectionHead, behind, features } from './Home'
import '../styles/builder.css'
import '../styles/home.css'
import '../styles/home-green.css'

const rise = (i: number) => ({
  initial: { opacity: 0, y: 26 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.9, delay: 0.1 + i * 0.09, ease: EASE },
})

const marquee = ['תל אביב', 'חיפה', 'ירושלים', 'באר שבע', 'נתניה', 'אשדוד', 'קריית שמונה', 'טבריה', 'אילת', 'הרצליה', 'רמת גן', 'מודיעין', 'רעננה', 'כרמיאל']

/**
 * The green version of the home page. Same purpose and the same message as the navy one, a different
 * direction: a bright field of green with the country drawn as a network of brokers, then white,
 * airy sections.
 */
export default function HomeGreen() {
  // phones and touch screens get a lighter hero: fewer arcs, fewer pulses
  const [lite] = useState(() => window.matchMedia('(max-width: 980px), (hover: none) and (pointer: coarse)').matches)

  return (
    <div className={`home hg${lite ? ' is-lite' : ''}`}>
      <a className="skip-link" href="#content">
        דילוג לתוכן
      </a>

      <header className="hg-nav">
        <div className="container hg-nav-in">
          <Link to="/" aria-label={PLATFORM_NAME}>
            <Logo size={34} withName />
          </Link>
          <nav className="hg-nav-links" aria-label="ניווט">
            <a href="#commission">העמלה</a>
            <a href="#shift">מה משתנה</a>
            <a href="#features">מה בפנים</a>
            <a href="#behind">מאחורי הקלעים</a>
          </nav>
          <div className="hg-nav-cta">
            <Link to="/app" className="hg-login">
              כניסה
            </Link>
            <Link to="/join" className="btn btn-gold btn-sm">
              הצטרפות
            </Link>
          </div>
        </div>
      </header>

      {/* ------------------------------------------------------------ hero */}
      <section className="hg-hero">
        <div className="hg-hero-bg" aria-hidden>
          <i className="hg-grid" />
          <i className="hg-glow" />
        </div>

        <div className="container hg-hero-in" id="content">
          <div className="hg-copy">
            <motion.div className="hg-brand" {...rise(0)}>
              <span className="hg-pill">
                <i aria-hidden />
                {PLATFORM_NAME}
              </span>
              <span className="hg-tags">
                {PLATFORM_TAGLINE.map((part) => {
                  const [num, ...rest] = part.split(' ')
                  return (
                    <span key={part}>
                      <b className="num">{num}</b> {rest.join(' ')}
                    </span>
                  )
                })}
              </span>
            </motion.div>
            <h1>
              <motion.span {...rise(1)}>הדבר הבא</motion.span>
              <motion.span {...rise(2)} className="hg-mark">
                בעולם המתווכים.
              </motion.span>
            </h1>
            <motion.p className="hg-sub" {...rise(3)}>
              קהילה ארצית של מתווכים ומערכת פשוטה שעובדת בשבילם. <span className="nb">0% עמלה למערכת,</span>{' '}
              <span className="nb">100% עמלה למתווך.</span>
            </motion.p>
            <motion.div className="hg-cta" {...rise(4)}>
              <Link to="/join" className="btn btn-white btn-lg">
                אני בפנים
                <ArrowLeft />
              </Link>
              <a href="#features" className="btn btn-outline-white btn-lg">
                הצצה למערכת
              </a>
            </motion.div>
            <motion.p className="hg-note" {...rise(5)}>
              כמה פרטים ואתם בקהילה.
            </motion.p>
          </div>

          <motion.div className="hg-stage" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1.1, delay: 0.25 }}>
            <NetworkMap lite={lite} />

            <div className="hg-card hg-card-property" aria-hidden>
              <div className="hg-card-photo">
                <img src={asset('img/prop-01.webp')} alt="" />
                <span>נכס לשיתוף פעולה</span>
              </div>
              <div className="hg-card-body">
                <strong>פנטהאוז 5 חדרים עם נוף לים</strong>
                <small>תל אביב, הצפון הישן</small>
                <div className="hg-card-row">
                  <b className="num">{formatPriceShort(9450000)}</b>
                  <span className="hg-faces">
                    {brokers.slice(1, 4).map((b) => (
                      <Avatar key={b.id} src={b.avatar} name="" size={24} />
                    ))}
                  </span>
                </div>
              </div>
            </div>

            <div className="hg-card hg-card-fee" aria-hidden>
              <small>העמלה שלך</small>
              <strong className="num">100%</strong>
              <i />
            </div>

            <div className="hg-card hg-card-ping" aria-hidden>
              <Avatar src={brokers[1].avatar} name="" size={34} />
              <div>
                <b>{brokers[1].name}</b>
                <span>לקוח רציני לבית פרטי בהרצליה פיתוח</span>
              </div>
              <em>
                <Heart /> <span className="num">18</span>
              </em>
            </div>
          </motion.div>
        </div>
        <i className="hg-curve" aria-hidden />
      </section>

      {/* ------------------------------------------------------ city strip */}
      <div className="hg-marquee" aria-hidden>
        <div className="hg-marquee-track">
          {[...marquee, ...marquee].map((c, i) => (
            <span key={i}>{c}</span>
          ))}
        </div>
      </div>

      {/* ------------------------------------------- 0% / 100%, the strongest thing */}
      <section className="hg-duo" id="commission">
        <div className="container">
          <Reveal className="hg-duo-card">
            <div className="hg-duo-item is-zero">
              <span className="hg-duo-num num">
                <CountUp from={100} to={0} />%
              </span>
              <strong>עמלה למערכת</strong>
            </div>
            <div className="hg-duo-item is-full">
              <span className="hg-duo-num num">
                <CountUp to={100} />%
              </span>
              <strong>עמלה למתווך</strong>
            </div>
            <div className="hg-split" aria-hidden>
              <i />
            </div>
          </Reveal>
          <Reveal delay={0.1}>
            <p className="hg-duo-line">הנכסים והלקוחות נשארים שלכם, וכל העמלה איתם.</p>
          </Reveal>
        </div>
      </section>

      {/* ------------------------------------------------- what changes: three panels */}
      <section className="shift" id="shift">
        <div className="container">
          <SectionHead eyebrow="מה משתנה">ככה נראית מהפכה בעולם המתווכים.</SectionHead>
          <Reveal>
            <OpenPanels />
          </Reveal>
        </div>
      </section>

      {/* -------------------------------------------------------- features */}
      <section className="features" id="features">
        <div className="container">
          <SectionHead eyebrow="מה בפנים">מערכת שבנויה למתווכים. פשוטה ונוחה.</SectionHead>
          <div className="bento">
            {features.map((f, i) => {
              const body = (
                <>
                  <span className="icon-badge">
                    <f.icon />
                  </span>
                  <h3>{f.title}</h3>
                  <p>{f.text}</p>
                  {f.to && (
                    <span className="bento-go">
                      לצפייה במסך <ArrowLeft />
                    </span>
                  )}
                  {f.visual === 'faces' && (
                    <span className="bento-visual bento-faces" aria-hidden>
                      {brokers.slice(0, 6).map((b) => (
                        <Avatar key={b.id} src={b.avatar} name="" size={44} />
                      ))}
                    </span>
                  )}
                  {f.visual === 'templates' && (
                    <span className="bento-visual" aria-hidden>
                      {(['night', 'gallery', 'line'] as const).map((id) => (
                        <span key={id} className={`tpl-thumb tpl-${id}`}>
                          <i />
                          <b>מאיה</b>
                          <u />
                        </span>
                      ))}
                    </span>
                  )}
                  <span className="bento-glow" aria-hidden />
                </>
              )
              return (
                <Reveal key={f.title} delay={(i % 3) * 0.07} className={f.wide ? 'bento-wide' : ''}>
                  {f.to ? (
                    <Link to={f.to} className="card bento-card">
                      {body}
                    </Link>
                  ) : (
                    <div className="card bento-card is-static">{body}</div>
                  )}
                </Reveal>
              )
            })}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------ behind the scenes */}
      <section className="behind" id="behind">
        <div className="container">
          <SectionHead eyebrow="מאחורי הקלעים">יש מי שעומד מאחורי זה.</SectionHead>
          <div className="behind-grid">
            {behind.map((b, i) => (
              <Reveal key={b.title} delay={i * 0.08} className="card card-pad behind-card">
                <span className="icon-badge">
                  <b.icon />
                </span>
                <h3>{b.title}</h3>
                <p>{b.text}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------- cta */}
      <section className="hg-final">
        <div className="container">
          <Reveal className="hg-final-card">
            <i className="hg-grid" aria-hidden />
            <img className="hg-final-logo" src={asset('logo-white.png')} alt="" width={86} height={56} />
            <h2>בואו להיות חלק מזה.</h2>
            <Link to="/join" className="btn btn-white btn-lg">
              אני בפנים
              <ArrowLeft />
            </Link>
            <p>המערכת חינמית, חוץ מאזורים נבחרים בתשלום.</p>
          </Reveal>
        </div>
      </section>

      <footer className="home-foot">
        <div className="container home-foot-in">
          <div className="foot-brand">
            <Logo size={30} withName />
            <p>הדבר הבא בעולם המתווכים.</p>
          </div>
          <nav className="foot-links" aria-label="קישורים">
            <Link to="/join">הצטרפות</Link>
            <Link to="/app">אזור החבר</Link>
            <Link to="/app/community">קהילה</Link>
            <Link to="/app/brokers">אינדקס מתווכים</Link>
            <Link to="/b/demo">דף נחיתה לדוגמה</Link>
            <Link to="/f/demo">פולדר לדוגמה</Link>
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
