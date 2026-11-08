import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { MouseEvent, ReactNode, RefObject } from 'react'
import { Link } from 'react-router-dom'
import { animate, motion, useInView, useMotionValue, useScroll, useSpring, useTransform } from 'framer-motion'
import type { MotionValue } from 'framer-motion'
import {
  ArrowLeft,
  Briefcase,
  Building2,
  FolderOpen,
  Handshake,
  Heart,
  KanbanSquare,
  LayoutTemplate,
  Scale,
  ShieldCheck,
  Users,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { PLATFORM_NAME, asset } from '../config'
import { brokers, formatPriceShort } from '../data/demo'
import { Avatar, BrandLockup, DemoTag, EASE, Logo, Reveal } from '../components/ui'
import LivingScene from '../components/LivingScene'
import OpenPanels from '../components/OpenPanels'
import '../styles/builder.css'
import '../styles/home.css'

const rise = (i: number) => ({
  initial: { opacity: 0, y: 26 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.9, delay: 0.15 + i * 0.09, ease: EASE },
})

/**
 * Counts from one number to another when it scrolls into view. The final number is
 * what is rendered first, so nothing wrong is ever shown if the count never starts.
 */
export function CountUp({ from = 0, to }: { from?: number; to: number }) {
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true, margin: '0px 0px -120px 0px' })
  const [value, setValue] = useState(to)
  useLayoutEffect(() => {
    if (!inView || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    setValue(from)
    const controls = animate(from, to, { duration: 1.8, ease: EASE, onUpdate: (v) => setValue(Math.round(v)) })
    return () => controls.stop()
  }, [inView, from, to])
  return <span ref={ref}>{value}</span>
}

/**
 * The skyline behind the hero, alive: a short silent loop of the same picture.
 * It fades in over the still image once it can play, pauses when the hero is off
 * screen, and is skipped entirely for visitors who asked for reduced motion.
 */
function LivingSkyline() {
  const ref = useRef<HTMLVideoElement>(null)
  const [ready, setReady] = useState(false)
  const [enabled] = useState(() => !window.matchMedia('(prefers-reduced-motion: reduce)').matches)

  useEffect(() => {
    const video = ref.current
    if (!video) return
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) video.play().catch(() => {})
        else video.pause()
      },
      { threshold: 0.05 },
    )
    io.observe(video)
    return () => io.disconnect()
  }, [enabled])

  if (!enabled) return null
  return (
    <video
      ref={ref}
      className={`hero-live${ready ? ' is-ready' : ''}`}
      src={asset('media/skyline-live.mp4')}
      poster={asset('img/skyline.webp')}
      muted
      loop
      autoPlay
      playsInline
      preload="auto"
      disablePictureInPicture
      tabIndex={-1}
      onPlaying={() => setReady(true)}
    />
  )
}

/** The picture, the dark veil and the living layer behind the hero. */
function HeroBackdrop({ life, lite = false, y }: { life: boolean; lite?: boolean; y?: MotionValue<string> }) {
  const style = y ? { y } : undefined
  return (
    <>
      <motion.div className="hero-bg" style={style} aria-hidden>
        <img src={asset('img/skyline.webp')} alt="" />
        {!lite && <LivingSkyline />}
      </motion.div>
      <div className="hero-veil" aria-hidden />
      {life && (
        <motion.div className="hero-life" style={style} aria-hidden>
          <LivingScene lite={lite} />
        </motion.div>
      )}
    </>
  )
}

/** Desktop only: the backdrop drifts a little as the hero scrolls away. */
function ParallaxBackdrop({ heroRef, life }: { heroRef: RefObject<HTMLElement>; life: boolean }) {
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ['start start', 'end start'] })
  const y = useTransform(scrollYProgress, [0, 1], ['0%', '18%'])
  return <HeroBackdrop life={life} y={y} />
}

// ------------------------------------------------------------------ content
// Short on purpose: a headline and one line per card. The page is meant to be
// looked at, not read.

type Feature = { to?: string; icon: LucideIcon; title: string; text: string; wide?: boolean; visual?: 'faces' | 'templates' }

export const features: Feature[] = [
  { to: '/app/community', icon: Users, title: 'קהילה ענקית למתווכים', text: 'מתווכים מכל הארץ, במקום אחד.', wide: true, visual: 'faces' },
  { to: '/app/community?topic=coop', icon: Handshake, title: 'שת"פ בכל הארץ', text: 'נכס, הפניה או חיפוש לקונה, עם כל מתווך בכל עיר.' },
  { icon: Scale, title: 'מחירים מוזלים', text: 'שמאים, עורכי דין ועוד, בעלות נמוכה לחברי הקהילה.' },
  { to: '/app/crm', icon: KanbanSquare, title: 'CRM למתווך', text: 'לקוחות ונכסים על לוח אחד.' },
  { to: '/app/builder', icon: LayoutTemplate, title: 'דף נחיתה אישי', text: 'שלוש תבניות. מוכן תוך דקות.', wide: true, visual: 'templates' },
  { to: '/app/folder', icon: FolderOpen, title: 'פולדר דיגיטלי', text: 'תיק נכסים ממותג ללקוח, בקישור אחד.' },
]

export const behind: { icon: LucideIcon; title: string; text: string }[] = [
  { icon: Building2, title: 'משרד תיווך ארצי', text: 'פריסה בכל הארץ.' },
  { icon: Briefcase, title: 'אנשי מקצוע מהתחום', text: 'עובדים מאחורי הקלעים ומכירים את העבודה מבפנים.' },
  { icon: ShieldCheck, title: 'ניהול ופיקוח', text: 'יש מי שאחראי: צוות שמלווה את הקהילה ושומר על רמה.' },
]

export function SectionHead({ eyebrow, children }: { eyebrow: string; children: ReactNode }) {
  return (
    <Reveal className="section-head">
      <span className="eyebrow">{eyebrow}</span>
      <h2>{children}</h2>
    </Reveal>
  )
}

export default function Home() {
  const heroRef = useRef<HTMLElement>(null)
  const [motionOk] = useState(() => !window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  // phones and touch screens get a lighter hero: no video, no parallax, birds only
  const [lite] = useState(() => window.matchMedia('(max-width: 980px), (hover: none) and (pointer: coarse)').matches)
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
            <a href="#commission">העמלה</a>
            <a href="#shift">מה משתנה</a>
            <a href="#features">מה בפנים</a>
            <a href="#behind">מאחורי הקלעים</a>
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
      <section className="hero grain" ref={heroRef} onMouseMove={lite ? undefined : onMove}>
        {lite ? <HeroBackdrop life={motionOk} lite /> : <ParallaxBackdrop heroRef={heroRef} life={motionOk} />}

        <div className="container hero-in" id="content">
          <div className="hero-copy">
            <motion.div className="hero-brand" {...rise(0)}>
              <BrandLockup />
            </motion.div>
            <h1>
              <motion.span {...rise(1)}>הדבר הבא</motion.span>
              <motion.span {...rise(2)} className="gold-text">
                בעולם המתווכים.
              </motion.span>
            </h1>
            <motion.p className="hero-sub" {...rise(3)}>
              קהילה ארצית של מתווכים ומערכת פשוטה שעובדת בשבילם. <span className="nb">0% עמלה למערכת,</span>{' '}
              <span className="nb">100% עמלה למתווך.</span>
            </motion.p>
            <motion.div className="hero-cta" {...rise(4)}>
              <Link to="/join" className="btn btn-gold btn-lg">
                אני בפנים
                <ArrowLeft />
              </Link>
              <a href="#features" className="btn btn-ghost btn-lg">
                הצצה למערכת
              </a>
            </motion.div>
            <motion.p className="hero-note" {...rise(5)}>
              כמה פרטים ואתם בקהילה.
            </motion.p>
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

      {/* ------------------------------------------- 0% / 100%, the strongest thing */}
      <section className="duo" id="commission">
        <div className="container">
          <Reveal className="duo-grid">
            <div className="duo-item is-zero">
              <span className="duo-num num">
                <CountUp from={100} to={0} />%
              </span>
              <strong>עמלה למערכת</strong>
            </div>
            <i className="duo-rule" aria-hidden />
            <div className="duo-item is-full">
              <span className="duo-num num">
                <CountUp to={100} />%
              </span>
              <strong>עמלה למתווך</strong>
            </div>
          </Reveal>
          <Reveal delay={0.1}>
            <p className="duo-line">הנכסים והלקוחות נשארים שלכם, וכל העמלה איתם.</p>
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
      <section className="final">
        <div className="container">
          <Reveal className="final-card grain">
            <Logo size={54} />
            <BrandLockup size="lg" />
            <h2>בואו להיות חלק מזה.</h2>
            <Link to="/join" className="btn btn-gold btn-lg">
              אני בפנים
              <ArrowLeft />
            </Link>
            <p className="final-note">המערכת חינמית, חוץ מאזורים נבחרים בתשלום.</p>
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
