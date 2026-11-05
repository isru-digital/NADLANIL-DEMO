import { useEffect, useRef, useState } from 'react'
import type { MouseEvent } from 'react'
import { Link } from 'react-router-dom'
import { animate, motion, useInView, useMotionValue, useScroll, useSpring, useTransform } from 'framer-motion'
import {
  ArrowLeft,
  Check,
  FolderOpen,
  Handshake,
  Heart,
  KanbanSquare,
  KeyRound,
  LayoutTemplate,
  MessagesSquare,
  Percent,
  Users,
} from 'lucide-react'
import { PLATFORM_NAME, asset } from '../config'
import { brokers, formatPriceShort } from '../data/demo'
import { Avatar, DemoTag, EASE, Logo, Reveal } from '../components/ui'
import '../styles/builder.css'
import '../styles/home.css'

const rise = (i: number) => ({
  initial: { opacity: 0, y: 26 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.9, delay: 0.15 + i * 0.09, ease: EASE },
})

function CountUp({ to }: { to: number }) {
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true, margin: '0px 0px -120px 0px' })
  const [value, setValue] = useState(0)
  useEffect(() => {
    if (!inView) return
    const controls = animate(0, to, { duration: 1.8, ease: EASE, onUpdate: (v) => setValue(Math.round(v)) })
    return () => controls.stop()
  }, [inView, to])
  return <span ref={ref}>{value}</span>
}

const features = [
  {
    to: '/app/community',
    icon: MessagesSquare,
    title: 'קהילה ופיד מקצועי',
    text: 'שאלות, טיפים מהשטח והתייעצויות עם מתווכים שמבינים בדיוק מה עובר עליך.',
    wide: true,
    visual: 'faces',
  },
  {
    to: '/app/community?topic=coop',
    icon: Handshake,
    title: 'שיתופי פעולה והפניות',
    text: 'נכס לשיתוף פעולה, הפניה למתווך בעיר אחרת או חיפוש לקונה. כל בקשה נשמרת בנושא שלה.',
  },
  {
    to: '/app/brokers',
    icon: Users,
    title: 'אינדקס מתווכים',
    text: 'מי עובד באיזה אזור ובמה הוא מתמחה. סינון מהיר ופנייה ישירה.',
  },
  {
    to: '/app/crm',
    icon: KanbanSquare,
    title: 'CRM פשוט',
    text: 'לקוחות ונכסים על לוח אחד, מהפנייה הראשונה ועד הסגירה.',
  },
  {
    to: '/app/builder',
    icon: LayoutTemplate,
    title: 'דף נחיתה אישי',
    text: 'שלוש תבניות יוקרה, תצוגה חיה וביו שנכתב בעזרת AI. מוכן תוך דקות.',
    wide: true,
    visual: 'templates',
  },
  {
    to: '/app/folder',
    icon: FolderOpen,
    title: 'פולדר דיגיטלי',
    text: 'תיק נכסים ממותג שנשלח ללקוח בקישור אחד.',
  },
]

const principles = [
  {
    icon: Percent,
    title: 'בלי עמלה לפלטפורמה',
    text: 'סגרת עסקה? כל העמלה שלך. הפלטפורמה לא לוקחת אחוזים.',
  },
  {
    icon: KeyRound,
    title: 'הנכסים נשארים שלך',
    text: 'את המלאי שלך מנהל רק אתה. משתפים עם הקהילה רק את מה שבוחרים לשתף.',
  },
  {
    icon: Users,
    title: 'קהילה חינמית',
    text: 'ההצטרפות לקהילה בחינם. עצמאים שעוזרים לעצמאים.',
  },
]

const steps = [
  { title: 'מצטרפים בחינם', text: 'פותחים פרופיל, בוחרים אזורי פעילות והתמחויות ונכנסים לקהילה.' },
  { title: 'מנהלים הכול במקום אחד', text: 'לקוחות, נכסים, תזכורות, דף נחיתה אישי ופולדר ללקוח.' },
  { title: 'משתפים פעולה', text: 'פותחים נכס לשיתוף פעולה או שומרים חיפוש לקונה, והמערכת מתריעה כשיש התאמה.' },
]

export default function Home() {
  const heroRef = useRef<HTMLElement>(null)
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ['start start', 'end start'] })
  const bgY = useTransform(scrollYProgress, [0, 1], ['0%', '18%'])
  const mx = useMotionValue(0)
  const my = useMotionValue(0)
  const sx = useSpring(mx, { stiffness: 60, damping: 18 })
  const sy = useSpring(my, { stiffness: 60, damping: 18 })
  const farX = useTransform(sx, (v) => v * -14)
  const farY = useTransform(sy, (v) => v * -10)
  const nearX = useTransform(sx, (v) => v * 22)
  const nearY = useTransform(sy, (v) => v * 16)

  const onMove = (e: MouseEvent<HTMLElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    mx.set((e.clientX - r.left) / r.width - 0.5)
    my.set((e.clientY - r.top) / r.height - 0.5)
  }

  return (
    <div className="home">
      <a className="skip-link" href="#content">
        דילוג לתוכן
      </a>

      <header className="home-nav">
        <div className="container home-nav-in">
          <Link to="/" aria-label={PLATFORM_NAME}>
            <Logo size={32} withName />
          </Link>
          <nav className="home-nav-links" aria-label="ניווט">
            <a href="#features">מה בפנים</a>
            <a href="#principle">העיקרון</a>
            <a href="#how">איך זה עובד</a>
            <Link to="/about">אודות</Link>
          </nav>
          <div className="home-nav-cta">
            <Link to="/app" className="home-login">
              כניסה
            </Link>
            <Link to="/join" className="btn btn-gold btn-sm">
              הצטרפות
            </Link>
          </div>
        </div>
      </header>

      {/* ------------------------------------------------------------ hero */}
      <section className="hero grain" ref={heroRef} onMouseMove={onMove}>
        <motion.div className="hero-bg" style={{ y: bgY }} aria-hidden>
          <img src={asset('img/skyline.webp')} alt="" />
        </motion.div>
        <div className="hero-veil" aria-hidden />

        <div className="container hero-in" id="content">
          <div className="hero-copy">
            <motion.span className="eyebrow" {...rise(0)}>
              קהילה חינמית למתווכים עצמאיים
            </motion.span>
            <h1>
              <motion.span {...rise(1)}>הנכסים שלך.</motion.span>
              <motion.span {...rise(2)} className="gold-text">
                העמלה שלך.
              </motion.span>
              <motion.span {...rise(3)}>הקהילה של כולנו.</motion.span>
            </h1>
            <motion.p className="hero-sub" {...rise(4)}>
              {PLATFORM_NAME} היא הבית המקצועי של מתווכים עצמאיים: קהילה פעילה, שיתופי פעולה, CRM פשוט ודף נחיתה
              אישי. בחינם, ובלי שהפלטפורמה לוקחת עמלה.
            </motion.p>
            <motion.div className="hero-cta" {...rise(5)}>
              <Link to="/join" className="btn btn-gold btn-lg">
                הצטרפות חינם
                <ArrowLeft />
              </Link>
              <a href="#features" className="btn btn-ghost btn-lg">
                הצצה למערכת
              </a>
            </motion.div>
            <motion.ul className="hero-ticks" {...rise(6)}>
              <li>
                <Check /> 100% מהעמלה למתווך
              </li>
              <li>
                <Check /> הנכסים נשארים אצלך
              </li>
              <li>
                <Check /> קהילה חינמית
              </li>
            </motion.ul>
          </div>

          {/* floating glass collage of real product pieces */}
          <div className="hero-stage" aria-hidden>
            <motion.div className="float float-main" style={{ x: farX, y: farY }} {...rise(3)}>
              <div className="float-bob">
                <div className="mini-photo">
                  <img src={asset('img/prop-01.webp')} alt="" />
                  <span className="tag tag-gold">נכס לשיתוף פעולה</span>
                </div>
                <div className="mini-body">
                  <strong>פנטהאוז 5 חדרים עם נוף לים</strong>
                  <span>תל אביב - הצפון הישן</span>
                  <div className="mini-row">
                    <b className="num">{formatPriceShort(9450000)}</b>
                    <span className="mini-faces">
                      {brokers.slice(1, 4).map((b) => (
                        <Avatar key={b.id} src={b.avatar} name="" size={26} />
                      ))}
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>

            <motion.div className="float float-fee" style={{ x: nearX, y: nearY }} {...rise(5)}>
              <div className="float-bob bob-b">
                <span>העמלה שלך</span>
                <strong className="gold-text num">100%</strong>
                <i />
              </div>
            </motion.div>

            <motion.div className="float float-post" style={{ x: nearX, y: nearY }} {...rise(6)}>
              <div className="float-bob bob-c">
                <div className="mini-post-head">
                  <Avatar src={brokers[1].avatar} name="" size={34} />
                  <div>
                    <strong>{brokers[1].name}</strong>
                    <span>שיתופי פעולה</span>
                  </div>
                </div>
                <p>יש לי לקוח רציני שמחפש בית פרטי בהרצליה פיתוח. מי שמחזיק נכס מתאים - דברו איתי.</p>
                <div className="mini-like">
                  <Heart /> <span className="num">18</span>
                </div>
              </div>
            </motion.div>
          </div>
        </div>

        <div className="hero-scroll" aria-hidden>
          <span />
        </div>
      </section>

      {/* ------------------------------------------------------- principle */}
      <section className="principle" id="principle">
        <div className="container">
          <div className="principle-top">
            <Reveal className="principle-num">
              <span className="num">
                <CountUp to={100} />%
              </span>
            </Reveal>
            <Reveal delay={0.12} className="principle-copy">
              <span className="eyebrow">העיקרון שלנו</span>
              <h2>מהעמלה נשארת אצל המתווך.</h2>
              <p>
                אתה מביא את הנכסים, את הלקוחות ואת העבודה הקשה. לכן כל העמלה שלך. הפלטפורמה לא לוקחת אחוזים מעסקאות
                ולא מתערבת בנכסים שלך.
              </p>
            </Reveal>
          </div>
          <div className="principle-grid">
            {principles.map((p, i) => (
              <Reveal key={p.title} delay={i * 0.08} className="card card-pad principle-card">
                <span className="icon-badge">
                  <p.icon />
                </span>
                <h3>{p.title}</h3>
                <p>{p.text}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* -------------------------------------------------------- features */}
      <section className="features" id="features">
        <div className="container">
          <Reveal className="section-head">
            <span className="eyebrow">מה בפנים</span>
            <h2>כל מה שמתווך עצמאי צריך. במקום אחד.</h2>
            <p>לחיצה על כל כרטיס פותחת את המסך עצמו בדמו.</p>
          </Reveal>
          <div className="bento">
            {features.map((f, i) => (
              <Reveal key={f.title} delay={(i % 3) * 0.07} className={f.wide ? 'bento-wide' : ''}>
                <Link to={f.to} className="card bento-card">
                  <span className="icon-badge">
                    <f.icon />
                  </span>
                  <h3>{f.title}</h3>
                  <p>{f.text}</p>
                  <span className="bento-go">
                    לצפייה במסך <ArrowLeft />
                  </span>
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
                </Link>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------- how */}
      <section className="how" id="how">
        <div className="container how-in">
          <Reveal className="section-head">
            <span className="eyebrow">איך זה עובד</span>
            <h2>שלושה צעדים, ואתה בפנים.</h2>
          </Reveal>
          <ol className="steps">
            {steps.map((s, i) => (
              <Reveal as="li" key={s.title} delay={i * 0.1} className="step">
                <span className="step-num num">0{i + 1}</span>
                <h3>{s.title}</h3>
                <p>{s.text}</p>
              </Reveal>
            ))}
          </ol>
        </div>
      </section>

      {/* ------------------------------------------------------------- cta */}
      <section className="final">
        <div className="container">
          <Reveal className="final-card grain">
            <Logo size={54} />
            <h2>
              מקום אחד למתווכים
              <br />
              שעובדים בשביל עצמם.
            </h2>
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
            <Link to="/about">אודות</Link>
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
