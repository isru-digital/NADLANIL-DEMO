import { Link, Navigate, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, ArrowRight, BadgeCheck, Check, Lock } from 'lucide-react'
import type { ReactNode } from 'react'
import { useMember } from '../config/member'
import { OFFICE_FEE, OFFICE_NAME } from '../config/office'
import { EASE } from '../components/ui'
import { extraById, extras } from './officeData'
import type { Extra } from './officeData'
import { AssistantScreen, BadgeScreen, BenefitsScreen, DealScreen, GrowthScreen, LeadsScreen, PitchScreen, ReportScreen } from './OfficeScreens'
import '../styles/office.css'

/**
 * "המשרד שלי" (green version): what only the office gives. An office member opens every screen. A community member
 * sees the same list, each one closed, with what it gives and the way to upgrade, never the screen itself.
 */
export function OfficeHub() {
  const { isOffice } = useMember()
  return (
    <div className="of">
      <header className="of-head">
        <span className="of-tag">
          <BadgeCheck /> בלעדי לחברי {OFFICE_NAME}
        </span>
        <h1>המשרד שלי</h1>
        <p>מה שרק משרד יכול לתת: לידים, ליווי, ניירת וכלים שעובדים בשבילכם.</p>
      </header>

      {isOffice ? (
        <div className="of-banner is-in">
          <span>
            <BadgeCheck />
          </span>
          <div>
            <b>אתם חברי משרד. הכול פתוח.</b>
            <small>0% עמלה למשרד, 100% נשאר אצלכם.</small>
          </div>
        </div>
      ) : (
        <div className="of-banner">
          <span>
            <Lock />
          </span>
          <div>
            <b>אתם רואים את זה כחבר קהילה</b>
            <small>האקסטרות נפתחות לחברי המשרד: {OFFICE_FEE}, ו-0% עמלה למשרד.</small>
          </div>
          <div className="of-banner-cta">
            <Link to="/upgrade" className="btn btn-gold">
              להשוואת המסלולים <ArrowLeft />
            </Link>
          </div>
        </div>
      )}

      <ul className="of-grid">
        {extras.map((x, i) => (
          <motion.li key={x.id} initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: Math.min(i, 8) * 0.05, ease: EASE }}>
            <Link to={x.to ?? `/app/office/${x.id}`} className={`of-card${isOffice ? '' : ' is-locked'}`} data-id={x.id}>
              <span className="of-ico">
                <x.icon />
              </span>
              <em className={`of-chip${!isOffice ? ' is-lock' : x.status ? ' is-soon' : ''}`}>
                {!isOffice ? (
                  <>
                    <Lock /> בלעדי למשרד
                  </>
                ) : (
                  x.status ?? 'פתוח'
                )}
              </em>
              <strong>{x.title}</strong>
              <small>{x.line}</small>
              <span className="of-go">
                {isOffice ? 'לפתיחה' : 'מה זה נותן'} <ArrowLeft />
              </span>
            </Link>
          </motion.li>
        ))}
      </ul>
      <p className="of-demo">נתוני דמו. המסכים הם הדמיה: אין חיבור אמיתי לספקים, ל-AI או לחתימה דיגיטלית.</p>
    </div>
  )
}

const screens: Record<string, () => ReactNode> = {
  leads: () => <LeadsScreen />,
  report: () => <ReportScreen />,
  pitch: () => <PitchScreen />,
  growth: () => <GrowthScreen />,
  deal: () => <DealScreen />,
  assistant: () => <AssistantScreen />,
  benefits: () => <BenefitsScreen />,
  badge: () => <BadgeScreen />,
}

/** One of the office's screens, or its closed door for a community member. */
export function OfficeScreen() {
  const { id } = useParams()
  const { isOffice } = useMember()
  const extra = extraById(id)
  if (!extra || !screens[extra.id]) return <Navigate to="/app/office" replace />
  return (
    <div className="of of-screen" data-id={extra.id}>
      <Link to="/app/office" className="of-back">
        <ArrowRight /> המשרד שלי
      </Link>
      {isOffice ? (
        <>
          <header className="of-head is-screen">
            <span className="of-tag">
              <extra.icon /> {extra.status ?? 'בלעדי למשרד'}
            </span>
            <h1>{extra.title}</h1>
            <p>{extra.line}</p>
          </header>
          {screens[extra.id]()}
        </>
      ) : (
        <Locked extra={extra} />
      )}
    </div>
  )
}

function Locked({ extra }: { extra: Extra }) {
  return (
    <section className="of-locked">
      <div className="of-locked-copy">
        <span className="of-tag is-lock">
          <Lock /> בלעדי לחברי המשרד
        </span>
        <h1>{extra.title}</h1>
        <p>{extra.line}</p>
        <ul>
          {extra.points.map((p) => (
            <li key={p}>
              <Check /> {p}
            </li>
          ))}
        </ul>
        <div className="of-locked-cta">
          <Link to="/upgrade" className="btn btn-gold btn-lg">
            להשוואת המסלולים <ArrowLeft />
          </Link>
          <Link to="/join/office" className="btn btn-ghost btn-lg">
            להצטרפות למשרד
          </Link>
        </div>
        <small>בדמו אפשר לעבור לתצוגת "חבר משרד" במתג שלמעלה ולראות את המסך.</small>
      </div>
      {/* a blurred outline only: the screen itself is not rendered for a community member */}
      <div className="of-ghost" aria-hidden>
        <span className="of-ghost-lock">
          <Lock />
        </span>
        <i className="is-a" />
        <i className="is-b" />
        <i className="is-c" />
        <i className="is-d" />
        <i className="is-e" />
      </div>
    </section>
  )
}
