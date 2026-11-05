import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ArrowLeft,
  CalendarCheck,
  Check,
  Eye,
  FolderOpen,
  Handshake,
  Heart,
  LayoutTemplate,
  MessageCircle,
  Search,
  Share2,
  UserPlus,
} from 'lucide-react'
import { CURRENT_BROKER_ID } from '../config'
import { brokerById, crmStages, dashboardLeads, dashboardReminders } from '../data/demo'
import { useStore } from '../store'
import { Avatar, EASE, PageHead } from '../components/ui'
import '../styles/dashboard.css'

const greeting = () => {
  const h = new Date().getHours()
  if (h < 5) return 'לילה טוב'
  if (h < 12) return 'בוקר טוב'
  if (h < 17) return 'צהריים טובים'
  if (h < 21) return 'ערב טוב'
  return 'לילה טוב'
}

const stats = [
  { label: 'לידים חדשים', value: 4, hint: '2 מהבוקר', icon: UserPlus },
  { label: 'סיורים השבוע', value: 3, hint: 'הקרוב היום ב-17:30', icon: CalendarCheck },
  { label: 'פניות מלוח השיתוף', value: 2, hint: 'מתווכים שמעוניינים בנכס שלך', icon: Handshake },
  { label: 'צפיות בדף הנחיתה', value: 128, hint: 'ב-7 הימים האחרונים', icon: Eye },
]

const shortcuts = [
  { to: '/app/crm', label: 'פרסום נכס לקהילה', icon: Share2 },
  { to: '/app/builder', label: 'עריכת דף הנחיתה', icon: LayoutTemplate },
  { to: '/app/folder', label: 'פולדר ללקוח', icon: FolderOpen },
  { to: '/app/brokers', label: 'חיפוש מתווך', icon: Search },
]

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06, delayChildren: 0.05 } },
}
const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE } },
}

export default function Dashboard() {
  const { crm, posts, liked, remindersDone, toggleReminder } = useStore()
  const me = brokerById(CURRENT_BROKER_ID)
  const firstName = me.name.split(' ')[0]
  const maxStage = Math.max(...crmStages.map((s) => crm.filter((c) => c.status === s.id).length), 1)

  return (
    <>
      <PageHead
        eyebrow="יום חמישי, 5 בנובמבר"
        title={`${greeting()}, ${firstName}`}
        subtitle="הנה מה שמחכה לך היום."
      >
        <Link to="/app/crm" className="btn btn-gold">
          <Share2 />
          פרסום לקהילה
        </Link>
      </PageHead>

      <motion.div className="dash" variants={stagger} initial="hidden" animate="show">
        <div className="stat-row">
          {stats.map((s) => (
            <motion.div key={s.label} variants={item} className="card stat">
              <span className="stat-icon">
                <s.icon />
              </span>
              <span className="stat-label">{s.label}</span>
              <strong className="num">{s.value}</strong>
              <span className="stat-hint">{s.hint}</span>
            </motion.div>
          ))}
        </div>

        <div className="dash-grid">
          <div className="dash-col">
            <motion.section variants={item} className="card card-pad">
              <div className="block-head">
                <h2>לידים חדשים</h2>
                <Link to="/app/crm" className="link-more">
                  לכל הלקוחות <ArrowLeft />
                </Link>
              </div>
              <ul className="lead-list">
                {dashboardLeads.map((l) => (
                  <li key={l.id}>
                    <span className="lead-mono" aria-hidden>
                      {l.name.charAt(0)}
                    </span>
                    <div className="lead-main">
                      <strong>{l.name}</strong>
                      <span>{l.need}</span>
                    </div>
                    <div className="lead-meta">
                      <span className="tag">{l.source}</span>
                      <time>{l.time}</time>
                    </div>
                  </li>
                ))}
              </ul>
            </motion.section>

            <motion.section variants={item} className="card card-pad">
              <div className="block-head">
                <h2>פוסטים אחרונים בקהילה</h2>
                <Link to="/app/community" className="link-more">
                  לפיד המלא <ArrowLeft />
                </Link>
              </div>
              <ul className="post-mini-list">
                {posts.slice(0, 3).map((p) => {
                  const author = brokerById(p.authorId)
                  return (
                    <li key={p.id}>
                      <Avatar src={author.avatar} name={author.name} size={40} />
                      <div>
                        <div className="post-mini-head">
                          <strong>{author.name}</strong>
                          <span className="tag tag-gold">{p.topic}</span>
                          <time>{p.time}</time>
                        </div>
                        <p>{p.body}</p>
                        <div className="post-mini-foot">
                          <span>
                            <Heart /> <b className="num">{p.likes + (liked[p.id] ? 1 : 0)}</b>
                          </span>
                          <span>
                            <MessageCircle /> <b className="num">{p.comments.length}</b>
                          </span>
                        </div>
                      </div>
                    </li>
                  )
                })}
              </ul>
            </motion.section>
          </div>

          <div className="dash-col">
            <motion.section variants={item} className="card card-pad">
              <div className="block-head">
                <h2>תזכורות</h2>
                <span className="faint num">
                  {dashboardReminders.filter((r) => !remindersDone[r.id]).length} פתוחות
                </span>
              </div>
              <ul className="reminders">
                {dashboardReminders.map((r) => {
                  const done = !!remindersDone[r.id]
                  return (
                    <li key={r.id}>
                      <button
                        className={`reminder${done ? ' is-done' : ''}`}
                        onClick={() => toggleReminder(r.id)}
                        aria-pressed={done}
                      >
                        <span className="check">{done && <Check />}</span>
                        <span className="reminder-text">
                          <strong>{r.text}</strong>
                          <span>{r.when}</span>
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            </motion.section>

            <motion.section variants={item} className="card card-pad">
              <div className="block-head">
                <h2>קיצורי דרך</h2>
              </div>
              <div className="shortcuts">
                {shortcuts.map((s) => (
                  <Link key={s.label} to={s.to} className="shortcut">
                    <s.icon />
                    <span>{s.label}</span>
                  </Link>
                ))}
              </div>
            </motion.section>

            <motion.section variants={item} className="card card-pad">
              <div className="block-head">
                <h2>הצנרת שלי</h2>
                <Link to="/app/crm" className="link-more">
                  ללוח <ArrowLeft />
                </Link>
              </div>
              <ul className="pipeline">
                {crmStages.map((s) => {
                  const n = crm.filter((c) => c.status === s.id).length
                  return (
                    <li key={s.id}>
                      <span>{s.label}</span>
                      <i>
                        <motion.b
                          initial={{ scaleX: 0 }}
                          animate={{ scaleX: n / maxStage }}
                          transition={{ duration: 0.9, delay: 0.4, ease: EASE }}
                        />
                      </i>
                      <strong className="num">{n}</strong>
                    </li>
                  )
                })}
              </ul>
            </motion.section>
          </div>
        </div>
      </motion.div>
    </>
  )
}
