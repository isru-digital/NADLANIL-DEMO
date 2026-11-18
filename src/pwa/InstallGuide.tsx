import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import {
  BellRing,
  BookmarkPlus,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Copy,
  Download,
  EllipsisVertical,
  Ellipsis,
  History,
  Lock,
  Maximize2,
  MousePointerClick,
  Plus,
  Settings,
  Share,
  SquarePlus,
  Zap,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import CommunityBrand from '../community/CommunityBrand'
import { COMMUNITY_HOME, COMMUNITY_NAME } from '../config/community'
import { BackButton, EASE } from '../components/ui'
import { useInstall } from './pwa'
import type { Platform } from './pwa'
import '../styles/join-green.css'
import '../styles/install.css'

/**
 * "איך מוסיפים למסך הבית" (Itzik 18.11.2026, stage 1 of phone notices): the site becomes an app on an iPhone or an
 * Android phone. The phone in the picture is drawn here (no screenshots of anyone's system), and walks the same steps
 * as the list next to it. Where the browser itself offers to install (Chrome), one button does it all.
 * Notices are not built yet, so they are written as "בקרוב".
 */

const ICON = `${import.meta.env.BASE_URL}icons/app-512.png`
const STEP_MS = 3600

type Step = { title: string; text: ReactNode; key: Glyph }
type Glyph = { icon: LucideIcon; label: string }

const STEPS: Record<'ios' | 'android', Step[]> = {
  ios: [
    {
      title: 'לוחצים על כפתור השיתוף',
      text: 'בספארי, בשורה שבתחתית המסך. אם רואים שם שלוש נקודות, לוחצים עליהן קודם ואז על "שיתוף".',
      key: { icon: Share, label: 'שיתוף' },
    },
    {
      title: 'בוחרים "הוספה למסך הבית"',
      text: 'גוללים מעט למטה ברשימה. אם הוא לא מופיע, הוא מחכה תחת "עוד".',
      key: { icon: SquarePlus, label: 'הוספה למסך הבית' },
    },
    {
      title: 'לוחצים "הוספה"',
      text: 'השם "מתווכים" כבר ממולא. אם מופיע מתג של פתיחה כאפליקציה, משאירים אותו דלוק.',
      key: { icon: Plus, label: 'הוספה' },
    },
    {
      title: 'פותחים מהאייקון',
      text: 'האייקון הירוק עם לחיצת היד מחכה במסך הבית, ונפתח ישר לפיד של הקהילה.',
      key: { icon: MousePointerClick, label: 'פתיחה' },
    },
  ],
  android: [
    {
      title: 'לוחצים על שלוש הנקודות',
      text: 'בכרום, בפינה העליונה של המסך.',
      key: { icon: EllipsisVertical, label: 'תפריט' },
    },
    {
      title: 'בוחרים "הוספה למסך הבית"',
      text: 'בחלק מהטלפונים זה נקרא "התקנת אפליקציה".',
      key: { icon: SquarePlus, label: 'הוספה למסך הבית' },
    },
    {
      title: 'לוחצים "התקנה"',
      text: 'ומאשרים. האייקון נוסף למסך הבית לבד.',
      key: { icon: Download, label: 'התקנה' },
    },
    {
      title: 'פותחים מהאייקון',
      text: 'האייקון הירוק עם לחיצת היד מחכה במסך הבית, ונפתח ישר לפיד של הקהילה.',
      key: { icon: MousePointerClick, label: 'פתיחה' },
    },
  ],
}

const WHY: { icon: LucideIcon; title: string; text: string; soon?: boolean }[] = [
  { icon: Maximize2, title: 'נפתחת במסך מלא', text: 'בלי שורת כתובת ובלי טאבים. נראית ומרגישה כמו כל אפליקציה בטלפון.' },
  { icon: Zap, title: 'נכנסים בנגיעה אחת', text: 'אייקון משלה על מסך הבית, וישר לפיד, לנכסים ולקונים.' },
  { icon: BellRing, title: 'התראות לנייד', text: 'הודעה חדשה או התאמה לקונה שלך יגיעו כהתראה, גם כשהאתר סגור.', soon: true },
]

const FAQ: { q: string; a: string }[] = [
  { q: 'זה עולה משהו?', a: 'לא. זה האתר של הקהילה עצמו, בלי חנות אפליקציות ובלי הורדה.' },
  { q: 'זה תופס מקום בטלפון?', a: 'כמעט לא. האפליקציה היא האתר, ולכן אין קובץ גדול להוריד.' },
  { q: 'איך מסירים אותה?', a: 'לחיצה ארוכה על האייקון, ובוחרים הסרה. כמו כל אפליקציה אחרת.' },
  { q: 'ומה עם ההתראות?', a: 'הן השלב הבא. כשיהיו מוכנות, תופיע באפליקציה בקשה להפעיל אותן, ותוכלו לבחור על מה לקבל התראה.' },
]

export default function InstallGuide() {
  const app = useInstall()
  const still = useReducedMotion()
  const detected: 'ios' | 'android' = app.platform === 'android' ? 'android' : 'ios'
  const [os, setOs] = useState<'ios' | 'android'>(detected)
  const [step, setStep] = useState(0)
  const [auto, setAuto] = useState(true)
  const [done, setDone] = useState(false)
  const guideRef = useRef<HTMLElement>(null)

  // the picture walks the steps by itself until the broker picks one
  useEffect(() => {
    if (!auto || still) return
    const t = window.setTimeout(() => setStep((s) => (s + 1) % 4), STEP_MS)
    return () => window.clearTimeout(t)
  }, [auto, still, step, os])

  const pickOs = (o: 'ios' | 'android') => {
    setOs(o)
    setStep(0)
  }
  const pickStep = (i: number) => {
    setAuto(false)
    setStep(i)
  }
  const install = async () => {
    if (await app.prompt()) setDone(true)
  }
  const installed = app.installed || done

  return (
    <div className="jo ig" data-page="install">
      <header className="jc-top">
        <div className="jc-top-start">
          <BackButton fallback={COMMUNITY_HOME} className="is-icon" />
          <Link to={COMMUNITY_HOME} aria-label={`${COMMUNITY_NAME}, לדף הקהילה`}>
            <CommunityBrand size="sm" />
          </Link>
        </div>
      </header>

      {/* ------------------------------------------------------------ the opening */}
      <section className="ig-hero">
        <i className="ig-aura" aria-hidden />
        <div className="ig-hero-in">
          <motion.div
            className="ig-app"
            initial={{ opacity: 0, y: 26, scale: 0.86 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.9, ease: EASE }}
          >
            <i className="ig-app-ring" aria-hidden />
            <img src={ICON} alt="" width={128} height={128} />
            <span className="ig-app-name">מתווכים</span>
          </motion.div>

          <motion.span className="ig-kicker" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.15, ease: EASE }}>
            אפליקציה, בלי חנות אפליקציות
          </motion.span>
          <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.22, ease: EASE }}>
            {COMMUNITY_NAME}, על מסך הבית שלך
          </motion.h1>
          <motion.p className="ig-sub" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.3, ease: EASE }}>
            שלוש נגיעות, והקהילה נפתחת במסך מלא כמו כל אפליקציה. בלי להוריד ובלי לחפש בחנות.
          </motion.p>

          <motion.div className="ig-now" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.4, ease: EASE }}>
            {installed ? (
              <span className="ig-state is-done" data-state="installed">
                <Check aria-hidden /> האפליקציה כבר על מסך הבית שלך
              </span>
            ) : app.canPrompt ? (
              <button type="button" className="ig-cta" data-act="install" onClick={install}>
                <Download aria-hidden /> התקנת האפליקציה
              </button>
            ) : (
              <button
                type="button"
                className="ig-cta"
                data-act="to-guide"
                onClick={() => guideRef.current?.scrollIntoView({ behavior: still ? 'auto' : 'smooth', block: 'start' })}
              >
                איך מוסיפים <ChevronDown aria-hidden />
              </button>
            )}
            <span className="ig-seen" data-platform={app.platform}>
              {app.inApp
                ? 'נראה שהדף נפתח מתוך אפליקציה אחרת. כדי להוסיף למסך הבית, פותחים אותו בספארי או בכרום.'
                : app.platform === 'desktop'
                  ? 'הכי נוח מהטלפון: פותחים את הדף הזה בנייד, ועוקבים אחרי הצעדים.'
                  : app.platform === 'ios'
                    ? 'זיהינו אייפון. הצעדים למטה מותאמים לו.'
                    : 'זיהינו אנדרואיד. הצעדים למטה מותאמים לו.'}
            </span>
          </motion.div>
        </div>
      </section>

      {/* ------------------------------------------------------------ why */}
      <section className="ig-why" aria-label="למה כדאי">
        {WHY.map((w, i) => (
          <motion.article
            key={w.title}
            className="ig-why-card"
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ duration: 0.6, delay: i * 0.08, ease: EASE }}
          >
            <i className="ig-why-icon" aria-hidden>
              <w.icon />
            </i>
            <h3>
              {w.title}
              {w.soon && <em className="ig-soon">בקרוב</em>}
            </h3>
            <p>{w.text}</p>
          </motion.article>
        ))}
      </section>

      {/* ------------------------------------------------------------ the steps, with the phone that shows them */}
      <section className="ig-guide" ref={guideRef} aria-labelledby="ig-guide-title">
        <div className="ig-guide-head">
          <h2 id="ig-guide-title">איך מוסיפים למסך הבית</h2>
          <div className="ig-os" role="tablist" aria-label="סוג הטלפון">
            {(['ios', 'android'] as const).map((o) => (
              <button
                key={o}
                type="button"
                role="tab"
                id={`ig-tab-${o}`}
                aria-selected={os === o}
                aria-controls="ig-steps"
                className={os === o ? 'is-on' : ''}
                data-os={o}
                onClick={() => pickOs(o)}
              >
                {o === 'ios' ? 'אייפון' : 'אנדרואיד'}
                {o === detected && app.platform !== 'desktop' && <small>הטלפון שלך</small>}
              </button>
            ))}
            <i className="ig-os-pill" data-on={os} aria-hidden />
          </div>
        </div>

        <div className="ig-guide-body">
          <ol className="ig-steps" id="ig-steps" role="tabpanel" aria-labelledby={`ig-tab-${os}`} data-os={os}>
            {STEPS[os].map((s, i) => (
              <li key={`${os}-${i}`} className={i === step ? 'is-on' : i < step ? 'is-past' : ''} data-step={i}>
                <button type="button" onClick={() => pickStep(i)} aria-current={i === step ? 'step' : undefined}>
                  <b className="ig-num num" aria-hidden>
                    {i < step ? <Check /> : i + 1}
                  </b>
                  <span className="ig-step-words">
                    <strong>{s.title}</strong>
                    <span>{s.text}</span>
                  </span>
                  <span className="ig-key" title={s.key.label}>
                    <s.key.icon aria-hidden />
                  </span>
                  {i === step && auto && !still && <i key={`${os}-${step}`} className="ig-timer" aria-hidden style={{ animationDuration: `${STEP_MS}ms` }} />}
                </button>
              </li>
            ))}
          </ol>

          {/* on a phone the list shows one step at a time under the picture: back, the dots, and "הבא" */}
          <div className="ig-stepnav">
            <button type="button" className="ig-nav-btn" data-act="prev" aria-label="הצעד הקודם" disabled={step === 0} onClick={() => pickStep(step - 1)}>
              <ChevronRight aria-hidden />
            </button>
            <span className="ig-dots">
              {STEPS[os].map((s, i) => (
                <button
                  key={i}
                  type="button"
                  className={`ig-dot${i === step ? ' is-on' : ''}`}
                  data-step={i}
                  aria-label={`צעד ${i + 1}: ${s.title}`}
                  aria-current={i === step ? 'step' : undefined}
                  onClick={() => pickStep(i)}
                >
                  <i aria-hidden />
                </button>
              ))}
            </span>
            <button type="button" className="ig-nav-btn is-next" data-act="next" disabled={step === 3} onClick={() => pickStep(step + 1)}>
              הבא <ChevronLeft aria-hidden />
            </button>
          </div>

          <div className="ig-stage">
            <Phone os={os} step={step} still={!!still} />
            <p className="ig-stage-note">איור להמחשה. המסכים בטלפון שלך יכולים להיראות מעט אחרת.</p>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------ questions */}
      <section className="ig-faq" aria-labelledby="ig-faq-title">
        <h2 id="ig-faq-title">שאלות קצרות</h2>
        {FAQ.map((f) => (
          <details key={f.q}>
            <summary>
              {f.q}
              <ChevronDown aria-hidden />
            </summary>
            <p>{f.a}</p>
          </details>
        ))}
      </section>
    </div>
  )
}

/* ================================================================== the drawn phone */

function Phone({ os, step, still }: { os: 'ios' | 'android'; step: number; still: boolean }) {
  const fade = still ? { initial: false, animate: { opacity: 1 }, exit: { opacity: 1 } } : null
  return (
    <div className={`pm is-${os}`} data-scene={`${os}-${step}`} aria-hidden>
      <div className="pm-screen">
        <div className="pm-status">
          <span className="num">9:41</span>
          {os === 'ios' && <i className="pm-island" />}
          <span className="pm-bars">
            <i />
            <i />
            <i />
          </span>
        </div>

        {step < 3 ? (
          <>
            {os === 'android' && <ChromeBar tap={step === 0} />}
            <MiniSite />
            {os === 'ios' && <SafariBar tap={step === 0} />}
          </>
        ) : (
          <Home os={os} still={still} />
        )}

        <AnimatePresence>
          {os === 'ios' && step === 1 && (
            <motion.div key="ios-share" className="pm-sheet" {...(fade ?? { initial: { y: '100%' }, animate: { y: 0 }, exit: { y: '100%' }, transition: { duration: 0.42, ease: EASE } })}>
              <div className="pm-sheet-head">
                <img src={ICON} alt="" />
                <span>
                  <b>{COMMUNITY_NAME}</b>
                  <small />
                </span>
              </div>
              <Row icon={Copy} label="העתקה" />
              <Row icon={BookmarkPlus} label="הוספה לסימניות" />
              <Row icon={SquarePlus} label="הוספה למסך הבית" tap />
              <Row icon={Ellipsis} label="עוד" />
            </motion.div>
          )}
          {os === 'ios' && step === 2 && (
            <motion.div key="ios-add" className="pm-full" {...(fade ?? { initial: { y: '100%' }, animate: { y: 0 }, exit: { opacity: 0 }, transition: { duration: 0.42, ease: EASE } })}>
              <div className="pm-full-bar">
                <span>ביטול</span>
                <b>הוספה למסך הבית</b>
                <span className="pm-tap is-text">הוספה</span>
              </div>
              <div className="pm-add">
                <img src={ICON} alt="" />
                <span className="pm-field">מתווכים</span>
              </div>
              <div className="pm-toggle">
                <span>פתיחה כאפליקציה</span>
                <i className="is-on" />
              </div>
            </motion.div>
          )}
          {os === 'android' && step === 1 && (
            <motion.div key="and-menu" className="pm-menu" {...(fade ?? { initial: { opacity: 0, scale: 0.9 }, animate: { opacity: 1, scale: 1 }, exit: { opacity: 0, scale: 0.95 }, transition: { duration: 0.3, ease: EASE } })}>
              <Row icon={Plus} label="כרטיסייה חדשה" />
              <Row icon={History} label="היסטוריה" />
              <Row icon={SquarePlus} label="הוספה למסך הבית" tap />
              <Row icon={Settings} label="הגדרות" />
            </motion.div>
          )}
          {os === 'android' && step === 2 && (
            <motion.div key="and-dialog" className="pm-scrim" {...(fade ?? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 }, transition: { duration: 0.3 } })}>
              <div className="pm-dialog">
                <b>להתקין את האפליקציה?</b>
                <div className="pm-add">
                  <img src={ICON} alt="" />
                  <span>
                    מתווכים
                    <small />
                  </span>
                </div>
                <div className="pm-dialog-acts">
                  <span>ביטול</span>
                  <span className="pm-tap is-text is-fill">התקנה</span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

function Row({ icon: Icon, label, tap }: { icon: LucideIcon; label: string; tap?: boolean }) {
  return (
    <div className={`pm-row${tap ? ' pm-tap is-row' : ''}`}>
      <span>{label}</span>
      <Icon />
    </div>
  )
}

/** a page of the community, drawn in shapes only */
function MiniSite() {
  return (
    <div className="pm-site">
      <div className="pm-site-top">
        <i className="pm-site-mark" />
        <i className="pm-line is-w40" />
      </div>
      <div className="pm-site-hero">
        <i className="pm-line is-w70 is-light" />
        <i className="pm-line is-w50 is-light" />
      </div>
      {[0, 1, 2].map((k) => (
        <div key={k} className="pm-card">
          <i className="pm-thumb" />
          <span>
            <i className="pm-line is-w80" />
            <i className="pm-line is-w50 is-faint" />
          </span>
        </div>
      ))}
    </div>
  )
}

function SafariBar({ tap }: { tap: boolean }) {
  return (
    <div className="pm-safari">
      <ChevronRight />
      <span className="pm-url">
        <Lock />
        <i className="pm-line is-w60 is-faint" />
      </span>
      <span className={tap ? 'pm-tap' : ''}>
        <Share />
      </span>
      <Ellipsis />
    </div>
  )
}

function ChromeBar({ tap }: { tap: boolean }) {
  return (
    <div className="pm-chrome">
      <span className="pm-url">
        <Lock />
        <i className="pm-line is-w60 is-faint" />
      </span>
      <span className={tap ? 'pm-tap' : ''}>
        <EllipsisVertical />
      </span>
    </div>
  )
}

/** the home screen, with the new icon landing among the others */
function Home({ os, still }: { os: Platform; still: boolean }) {
  return (
    <div className={`pm-home is-${os}`}>
      <div className="pm-grid">
        {Array.from({ length: 11 }, (_, k) => (
          <span key={k} className="pm-app">
            <i />
            <small />
          </span>
        ))}
        <motion.span
          className="pm-app is-ours"
          initial={still ? false : { scale: 0.2, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 260, damping: 18, delay: 0.15 }}
        >
          <img src={ICON} alt="" />
          <small>מתווכים</small>
        </motion.span>
      </div>
      <div className="pm-dock">
        {[0, 1, 2, 3].map((k) => (
          <i key={k} />
        ))}
      </div>
    </div>
  )
}
