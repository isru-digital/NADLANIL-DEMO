import { useEffect, useMemo, useState } from 'react'
import {
  Activity,
  Building2,
  CalendarDays,
  ChevronLeft,
  Handshake,
  Hourglass,
  House,
  Link2,
  LoaderCircle,
  LogIn,
  Mail,
  MapPin,
  MessageSquare,
  Phone,
  Search,
  ShieldCheck,
  Timer,
  Trophy,
  Users,
  UserX,
} from 'lucide-react'
import { Modal } from '../components/ui'
import { call } from './session'
import type { MemberInfo } from './session'

/**
 * The numbers of the approvers' screen. Everything here comes from the server (`/api/admin/stats`), which counts only
 * what it really keeps and leaves test registrants out. Where nothing is kept yet the screen says so, it never
 * shows a made-up number.
 */
type Count = { name: string; n: number }
type Avg = { avg_ms: number | null; n: number }
export type DirRow = { id: string; name: string; cities: string[]; work: 'office' | 'solo'; office_name: string; joined_at: number | null; last_seen: number | null; signins: number; days30: number }
export type Stats = {
  generated_at: number
  tests: number
  activity_since: number | null
  totals: { approved: number; pending: number; rejected: number; all: number }
  signups: { today: number; week: number; month: number; daily: { day: string; n: number }[] }
  decision_time: { all: Avg; approved: Avg; rejected: Avg; oldest_pending_at: number | null }
  approvers: { name: string; approved: number; rejected: number; last_at: number }[]
  decisions: { id: string; name: string; status: 'approved' | 'rejected'; decided_by: string | null; decided_at: number; created_at: number }[]
  activity: { today: number; week: number; month: number; never: number; signins: number }
  breakdown: { cities: Count[]; areas: Count[]; work: { office: number; solo: number }; offices: Count[] }
  directory: DirRow[]
}

const TZ = 'Asia/Jerusalem'
const NONE = 'אין נתונים עדיין'
export const date = (ms: number | null) => (ms ? new Date(ms).toLocaleDateString('he-IL', { timeZone: TZ, day: '2-digit', month: '2-digit', year: 'numeric' }) : '')
export const dateTime = (ms: number | null) => (ms ? new Date(ms).toLocaleString('he-IL', { timeZone: TZ, day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '')
const time = (ms: number) => new Date(ms).toLocaleTimeString('he-IL', { timeZone: TZ, hour: '2-digit', minute: '2-digit' })
const dayOf = (ms: number) => new Date(ms).toLocaleDateString('en-CA', { timeZone: TZ })
const num = (n: number) => n.toLocaleString('he-IL')

/** "35 דקות", "5.5 שעות", "2.3 ימים". */
export function duration(ms: number | null) {
  if (ms == null) return NONE
  const min = ms / 60_000
  if (min < 1) return 'פחות מדקה'
  if (min < 60) return Math.round(min) === 1 ? 'דקה' : `${Math.round(min)} דקות`
  const h = min / 60
  if (h < 48) {
    const v = h < 10 ? h.toFixed(1).replace(/\.0$/, '') : String(Math.round(h))
    return v === '1' ? 'שעה' : v === '2' ? 'שעתיים' : `${v} שעות`
  }
  const d = h / 24
  const v = d < 10 ? d.toFixed(1).replace(/\.0$/, '') : String(Math.round(d))
  return v === '2' ? 'יומיים' : `${v} ימים`
}

/** "היום, 14:32", "אתמול, 09:10", "לפני 5 ימים", or the date. */
export function lastSeen(ms: number | null, now = Date.now()) {
  if (!ms) return 'עוד לא נכנס'
  const today = dayOf(now)
  const d = dayOf(ms)
  if (d === today) return `היום, ${time(ms)}`
  if (d === dayOf(now - 86_400_000)) return `אתמול, ${time(ms)}`
  const days = Math.round((Date.parse(today) - Date.parse(d)) / 86_400_000)
  if (days < 30) return `לפני ${days} ימים`
  return date(ms)
}
const shortDay = (key: string) => {
  const [, m, d] = key.split('-')
  return `${Number(d)}.${Number(m)}`
}

// ---------------------------------------------------------------- the summary cards
export function Kpis({ s }: { s: Stats }) {
  const cards = [
    { id: 'approved', icon: <Users />, label: 'מתווכים מאושרים', value: s.totals.approved, sub: s.totals.all ? `מתוך ${num(s.totals.all)} בקשות שהגיעו` : 'עוד לא הגיעו בקשות', tone: 'green' },
    {
      id: 'pending',
      icon: <Hourglass />,
      label: 'ממתינים לאישור',
      value: s.totals.pending,
      sub: s.decision_time.oldest_pending_at ? `הוותיקה ממתינה ${duration(Date.now() - s.decision_time.oldest_pending_at)}` : 'אין בקשות פתוחות',
      tone: s.totals.pending ? 'amber' : 'green',
    },
    { id: 'rejected', icon: <UserX />, label: 'נדחו', value: s.totals.rejected, sub: s.totals.rejected ? 'אפשר להירשם שוב אחרי דחייה' : 'לא נדחו בקשות', tone: 'rose' },
    { id: 'active', icon: <Activity />, label: 'פעילים השבוע', value: s.activity.week, sub: `ב-7 הימים האחרונים · ${num(s.activity.today)} היום`, tone: 'blue' },
  ] as const
  return (
    <div className="dk-kpis" role="list" aria-label="סיכום">
      {cards.map((c) => (
        <article key={c.id} className={`dk-kpi is-${c.tone}`} role="listitem" data-kpi={c.id}>
          <span className="dk-kpi-icon" aria-hidden="true">
            {c.icon}
          </span>
          <span className="dk-kpi-label">{c.label}</span>
          <b className="dk-kpi-num num">{num(c.value)}</b>
          <small>{c.sub}</small>
        </article>
      ))}
    </div>
  )
}

// ---------------------------------------------------------------- sign-ups by day
export function Signups({ s }: { s: Stats }) {
  const daily = s.signups.daily
  // a scale of at least 4, so one sign-up is not drawn as a full bar
  const max = Math.max(4, ...daily.map((d) => d.n))
  const W = 600
  const H = 190
  const top = 22
  const base = H - 26
  const step = W / daily.length
  const bw = Math.max(6, step * 0.62)
  const label = `הרשמות ב-30 הימים האחרונים: ${num(s.signups.month)} בסך הכול, ${num(s.signups.week)} בשבוע האחרון, ${num(s.signups.today)} היום.`
  return (
    <section className="dk-card dk-signups" aria-labelledby="dk-signups-h" data-card="signups">
      <header className="dk-card-head">
        <h2 id="dk-signups-h">
          <CalendarDays /> הרשמות חדשות
        </h2>
        <span className="dk-hint">לפי ימים, שעון ישראל</span>
      </header>
      <div className="dk-trio">
        <div data-n="today">
          <b className="num">{num(s.signups.today)}</b>
          <span>היום</span>
        </div>
        <div data-n="week">
          <b className="num">{num(s.signups.week)}</b>
          <span>7 ימים אחרונים</span>
        </div>
        <div data-n="month">
          <b className="num">{num(s.signups.month)}</b>
          <span>30 ימים אחרונים</span>
        </div>
      </div>
      <div className="dk-chart" dir="ltr">
        <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label} preserveAspectRatio="none">
          {[1, 0.5].map((f) => (
            <line key={f} x1="0" x2={W} y1={base - (base - top) * f} y2={base - (base - top) * f} className="dk-grid" />
          ))}
          <line x1="0" x2={W} y1={base} y2={base} className="dk-axis" />
          {daily.map((d, i) => {
            const h = (d.n / max) * (base - top)
            const x = i * step + (step - bw) / 2
            const today = i === daily.length - 1
            return (
              <g key={d.day} data-day={d.day} data-n={d.n}>
                <rect x={x} y={base - Math.max(h, d.n ? 3 : 0)} width={bw} height={Math.max(h, d.n ? 3 : 0)} rx="3" className={today ? 'dk-bar is-today' : 'dk-bar'}>
                  <title>{`${shortDay(d.day)}: ${d.n} הרשמות`}</title>
                </rect>
                {d.n > 0 && (
                  <text x={x + bw / 2} y={base - h - 6} className="dk-val" textAnchor="middle">
                    {d.n}
                  </text>
                )}
              </g>
            )
          })}
        </svg>
        <div className="dk-ticks" aria-hidden="true">
          {daily.map((d, i) => (
            <span key={d.day}>{i === daily.length - 1 ? 'היום' : i % 5 === 4 ? shortDay(d.day) : ''}</span>
          ))}
        </div>
        {s.signups.month === 0 && <p className="dk-empty-over">עוד אין הרשמות ב-30 הימים האחרונים</p>}
      </div>
      <table className="sr-only">
        <caption>הרשמות לפי ימים</caption>
        <tbody>
          {daily
            .filter((d) => d.n)
            .map((d) => (
              <tr key={d.day}>
                <th>{shortDay(d.day)}</th>
                <td>{d.n}</td>
              </tr>
            ))}
        </tbody>
      </table>
    </section>
  )
}

// ---------------------------------------------------------------- how long a decision takes, and by whom
export function Timing({ s }: { s: Stats }) {
  const t = s.decision_time
  return (
    <section className="dk-card dk-timing" aria-labelledby="dk-timing-h" data-card="timing">
      <header className="dk-card-head">
        <h2 id="dk-timing-h">
          <Timer /> זמן עד החלטה
        </h2>
        <span className="dk-hint">מהרשמה ועד אישור או דחייה</span>
      </header>
      <div className="dk-big">
        <b data-avg="all">{duration(t.all.avg_ms)}</b>
        <span>{t.all.n ? `ממוצע של ${num(t.all.n)} החלטות` : 'עוד לא התקבלו החלטות'}</span>
      </div>
      <dl className="dk-pairs">
        <div>
          <dt>עד אישור</dt>
          <dd data-avg="approved">{duration(t.approved.avg_ms)}</dd>
        </div>
        <div>
          <dt>עד דחייה</dt>
          <dd data-avg="rejected">{duration(t.rejected.avg_ms)}</dd>
        </div>
      </dl>
      <h3 className="dk-sub">
        <ShieldCheck /> מי החליט
      </h3>
      {s.approvers.length === 0 ? (
        <p className="dk-none">{NONE}</p>
      ) : (
        <ul className="dk-approvers">
          {s.approvers.map((a) => (
            <li key={a.name}>
              <span className="dk-avatar" aria-hidden="true">
                {a.name.slice(0, 1)}
              </span>
              <span>
                <b>{a.name}</b>
                <small>אחרונה: {dateTime(a.last_at)}</small>
              </span>
              <em>
                <span className="is-ok num">{num(a.approved)}</span> אישורים · <span className="num">{num(a.rejected)}</span> דחיות
              </em>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

export function Decisions({ s, onOpen }: { s: Stats; onOpen: (id: string) => void }) {
  return (
    <section className="dk-card" aria-labelledby="dk-dec-h" data-card="decisions">
      <header className="dk-card-head">
        <h2 id="dk-dec-h">
          <ShieldCheck /> מי אישר ומתי
        </h2>
        <span className="dk-hint">30 ההחלטות האחרונות</span>
      </header>
      {s.decisions.length === 0 ? (
        <p className="dk-none">{NONE}</p>
      ) : (
        <ul className="dk-feed">
          {s.decisions.map((d) => (
            <li key={d.id}>
              <button type="button" onClick={() => onOpen(d.id)} data-open={d.id}>
                <span className={`dk-dot is-${d.status}`} aria-hidden="true" />
                <span className="dk-feed-main">
                  <b>{d.name}</b>
                  <small>
                    {d.status === 'approved' ? 'אושר' : 'נדחה'} על ידי {d.decided_by || 'לא ידוע'} · {dateTime(d.decided_at)}
                  </small>
                </span>
                <em className="num">{duration(d.decided_at - d.created_at)}</em>
                <ChevronLeft className="dk-go" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

// ---------------------------------------------------------------- visits
export function Visits({ s, onOpen }: { s: Stats; onOpen: (id: string) => void }) {
  const seen = s.directory.filter((m) => m.last_seen).slice(0, 12)
  return (
    <section className="dk-card" aria-labelledby="dk-vis-h" data-card="visits">
      <header className="dk-card-head">
        <h2 id="dk-vis-h">
          <LogIn /> כניסות לקהילה
        </h2>
        <span className="dk-hint">{s.activity_since ? `נשמר מ-${date(s.activity_since)}` : 'נשמר מעכשיו'}</span>
      </header>
      <div className="dk-trio is-small">
        <div data-n="active-today">
          <b className="num">{num(s.activity.today)}</b>
          <span>נכנסו היום</span>
        </div>
        <div data-n="active-week">
          <b className="num">{num(s.activity.week)}</b>
          <span>פעילים השבוע</span>
        </div>
        <div data-n="never">
          <b className="num">{num(s.activity.never)}</b>
          <span>עוד לא נכנסו</span>
        </div>
      </div>
      {seen.length === 0 ? (
        <p className="dk-none">{s.totals.approved ? 'עוד לא נשמרו כניסות של מתווכים.' : NONE}</p>
      ) : (
        <ul className="dk-feed">
          {seen.map((m) => (
            <li key={m.id}>
              <button type="button" onClick={() => onOpen(m.id)} data-open={m.id}>
                <span className="dk-avatar" aria-hidden="true">
                  {m.name.slice(0, 1)}
                </span>
                <span className="dk-feed-main">
                  <b>{m.name}</b>
                  <small>{lastSeen(m.last_seen)}</small>
                </span>
                <em>{m.days30 === 1 ? 'יום אחד' : `${num(m.days30)} ימים`} פעיל ב-30 יום</em>
                <ChevronLeft className="dk-go" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

// ---------------------------------------------------------------- who the community is
function Bars({ rows, total, empty }: { rows: Count[]; total: number; empty: string }) {
  if (!rows.length) return <p className="dk-none">{empty}</p>
  const max = Math.max(...rows.map((r) => r.n))
  return (
    <ul className="dk-bars">
      {rows.map((r) => (
        <li key={r.name}>
          <span className="dk-bars-name">{r.name}</span>
          <span className="dk-bars-track" aria-hidden="true">
            <i style={{ width: `${(r.n / max) * 100}%` }} />
          </span>
          <b className="num">{num(r.n)}</b>
          <span className="sr-only">{total ? `${Math.round((r.n / total) * 100)}%` : ''}</span>
        </li>
      ))}
    </ul>
  )
}

export function Breakdown({ s }: { s: Stats }) {
  const b = s.breakdown
  const total = b.work.office + b.work.solo
  const pct = (n: number) => (total ? Math.round((n / total) * 100) : 0)
  return (
    <div className="dk-split" data-card="breakdown">
      <section className="dk-card" aria-labelledby="dk-city-h">
        <header className="dk-card-head">
          <h2 id="dk-city-h">
            <MapPin /> ערים
          </h2>
          <span className="dk-hint">מתווכים מאושרים</span>
        </header>
        <Bars rows={b.cities.slice(0, 10)} total={s.totals.approved} empty={NONE} />
      </section>
      <section className="dk-card" aria-labelledby="dk-area-h">
        <header className="dk-card-head">
          <h2 id="dk-area-h">
            <MapPin /> אזורים ושכונות
          </h2>
          <span className="dk-hint">כפי שהמתווכים כתבו</span>
        </header>
        {b.areas.length === 0 ? (
          <p className="dk-none">{NONE}</p>
        ) : (
          <ul className="dk-chips">
            {b.areas.map((a) => (
              <li key={a.name}>
                {a.name} <b className="num">{num(a.n)}</b>
              </li>
            ))}
          </ul>
        )}
      </section>
      <section className="dk-card" aria-labelledby="dk-work-h">
        <header className="dk-card-head">
          <h2 id="dk-work-h">
            <Building2 /> משרד מול עצמאי
          </h2>
        </header>
        {total === 0 ? (
          <p className="dk-none">{NONE}</p>
        ) : (
          <>
            <div className="dk-stack" role="img" aria-label={`במשרד ${b.work.office}, עצמאים ${b.work.solo}`}>
              <i className="is-office" style={{ width: `${pct(b.work.office)}%` }} />
              <i className="is-solo" style={{ width: `${pct(b.work.solo)}%` }} />
            </div>
            <dl className="dk-legend">
              <div data-work="office">
                <dt>
                  <span className="is-office" aria-hidden="true" /> במשרד
                </dt>
                <dd>
                  <b className="num">{num(b.work.office)}</b> ({pct(b.work.office)}%)
                </dd>
              </div>
              <div data-work="solo">
                <dt>
                  <span className="is-solo" aria-hidden="true" /> עצמאים
                </dt>
                <dd>
                  <b className="num">{num(b.work.solo)}</b> ({pct(b.work.solo)}%)
                </dd>
              </div>
            </dl>
            {b.offices.length > 0 && (
              <>
                <h3 className="dk-sub">המשרדים</h3>
                <Bars rows={b.offices} total={b.work.office} empty={NONE} />
              </>
            )}
          </>
        )}
      </section>
    </div>
  )
}

// ---------------------------------------------------------------- the brokers of the community
export function Directory({ s, onOpen }: { s: Stats; onOpen: (id: string) => void }) {
  const [q, setQ] = useState('')
  const rows = useMemo(() => {
    const t = q.replace(/\s+/g, ' ').trim()
    if (!t) return s.directory
    return s.directory.filter((m) => [m.name, ...m.cities, m.office_name, m.work === 'office' ? 'משרד' : 'עצמאי'].some((v) => v.includes(t)))
  }, [q, s.directory])
  return (
    <section className="dk-card dk-dir" aria-labelledby="dk-dir-h" data-card="directory">
      <header className="dk-card-head">
        <h2 id="dk-dir-h">
          <Users /> המתווכים בקהילה <span className="dk-count num">{num(s.directory.length)}</span>
        </h2>
        <label className="dk-search">
          <Search aria-hidden="true" />
          <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="חיפוש לפי שם, עיר או משרד" aria-label="חיפוש מתווך" data-f="dir-search" />
        </label>
      </header>
      {s.directory.length === 0 ? (
        <p className="dk-none">עוד אין מתווכים מאושרים.</p>
      ) : rows.length === 0 ? (
        <p className="dk-none" data-state="no-match">
          לא נמצא מתווך בשם הזה.
        </p>
      ) : (
        <div className="dk-table">
          <div className="dk-tr dk-th" aria-hidden="true">
            <span>שם</span>
            <span>עיר</span>
            <span>הצטרף</span>
            <span>כניסה אחרונה</span>
            <span>משרד או עצמאי</span>
            <span />
          </div>
          {rows.map((m) => (
            <button key={m.id} type="button" className="dk-tr" onClick={() => onOpen(m.id)} data-open={m.id} data-row="member">
              <span className="dk-name">
                <span className="dk-avatar" aria-hidden="true">
                  {m.name.slice(0, 1)}
                </span>
                <b>{m.name}</b>
              </span>
              <span data-label="עיר">
                {m.cities.join(', ') || '-'}
              </span>
              <span data-label="הצטרף" className="num">
                {date(m.joined_at)}
              </span>
              <span data-label="כניסה אחרונה" className={m.last_seen ? '' : 'is-faint'}>
                {lastSeen(m.last_seen)}
              </span>
              <span data-label={m.work === 'office' ? 'משרד' : undefined}>{m.work === 'office' ? m.office_name : 'עצמאי'}</span>
              <span className="dk-go-cell">
                <ChevronLeft className="dk-go" aria-hidden="true" />
                <span className="sr-only">לפרטים של {m.name}</span>
              </span>
            </button>
          ))}
        </div>
      )}
    </section>
  )
}

// ---------------------------------------------------------------- engagement: coming once the shared feed is on
const SOON = [
  { id: 'posts', icon: <MessageSquare />, label: 'פוסטים' },
  { id: 'properties', icon: <House />, label: 'נכסים' },
  { id: 'deals', icon: <Handshake />, label: 'שיתופי פעולה' },
  { id: 'matches', icon: <Link2 />, label: 'התאמות' },
  { id: 'top', icon: <Trophy />, label: 'המתווכים הכי פעילים' },
]
export function Engagement() {
  return (
    <section className="dk-card dk-soon" aria-labelledby="dk-soon-h" data-card="engagement">
      <header className="dk-card-head">
        <h2 id="dk-soon-h">מעורבות בקהילה</h2>
        <span className="dk-badge">יופעל אחרי הפיד המשותף</span>
      </header>
      <p className="dk-soon-lead">היום הפוסטים והנכסים נשמרים רק במכשיר של כל מתווך, ולכן לשרת אין עליהם נתונים. כשהפיד יהיה משותף, המספרים יופיעו כאן.</p>
      <ul className="dk-soon-grid">
        {SOON.map((x) => (
          <li key={x.id} data-soon={x.id}>
            <span className="dk-kpi-icon" aria-hidden="true">
              {x.icon}
            </span>
            <b>{x.label}</b>
            <small>{NONE}</small>
          </li>
        ))}
      </ul>
    </section>
  )
}

// ---------------------------------------------------------------- one broker's details (the full phone is here only)
type Detail = { member: MemberInfo; activity: { first_at: number | null; last_at: number | null; signins: number; days30: number } }
const STATUS: Record<string, string> = { pending: 'ממתין לאישור', approved: 'מאושר', rejected: 'נדחה' }
export function MemberDetails({ id, onClose }: { id: string | null; onClose: () => void }) {
  const [d, setD] = useState<Detail | null>(null)
  const [error, setError] = useState('')
  useEffect(() => {
    if (!id) return
    setD(null)
    setError('')
    call<Detail>(`/api/admin/members/${id}`).then((r) => (r.ok ? setD(r.data) : setError(r.data.error ?? 'לא הצלחנו לטעון את הפרטים.')))
  }, [id])
  const m = d?.member
  return (
    <Modal open={!!id} onClose={onClose} title={m ? m.name : 'פרטי מתווך'} subtitle={m ? STATUS[m.status] : undefined}>
      <div className="modal-body dk-detail" data-state={d ? 'details' : 'loading'}>
        {error ? (
          <p className="au-fail" role="alert">
            {error}
          </p>
        ) : !m || !d ? (
          <p className="dk-none">
            <LoaderCircle className="au-spin" /> טוענים...
          </p>
        ) : (
          <>
            <div className="dk-contact">
              <a href={`tel:${m.phone.replace(/[^\d+]/g, '')}`} data-f="detail-phone">
                <Phone /> <bdi dir="ltr">{m.phone}</bdi>
              </a>
              <a href={`mailto:${m.email}`}>
                <Mail /> <bdi dir="ltr">{m.email}</bdi>
              </a>
            </div>
            <dl className="dk-pairs is-list">
              <div>
                <dt>מספר רישיון</dt>
                <dd className="num">{m.license}</dd>
              </div>
              <div>
                <dt>עובד</dt>
                <dd>{m.work === 'office' ? `במשרד: ${m.office_name}` : 'עצמאי'}</dd>
              </div>
              <div>
                <dt>ערים</dt>
                <dd>{m.cities.join(', ')}</dd>
              </div>
              <div>
                <dt>שכונות ואזורים</dt>
                <dd>{m.areas || 'לא צוין'}</dd>
              </div>
              <div>
                <dt>נרשם</dt>
                <dd className="num">{dateTime(m.created_at)}</dd>
              </div>
              {m.decided_at && (
                <div>
                  <dt>{m.status === 'approved' ? 'אושר' : 'נדחה'}</dt>
                  <dd>
                    <span className="num">{dateTime(m.decided_at)}</span>
                    {m.decided_by ? `, על ידי ${m.decided_by}` : ''} ({duration(m.decided_at - m.created_at)} אחרי ההרשמה)
                  </dd>
                </div>
              )}
              {m.status === 'rejected' && m.reason && (
                <div>
                  <dt>הסיבה</dt>
                  <dd>{m.reason}</dd>
                </div>
              )}
              {m.status === 'approved' && (
                <>
                  <div>
                    <dt>כניסה אחרונה</dt>
                    <dd>{lastSeen(d.activity.last_at)}</dd>
                  </div>
                  <div>
                    <dt>כניסה ראשונה</dt>
                    <dd className="num">{d.activity.first_at ? dateTime(d.activity.first_at) : 'עוד לא נכנס'}</dd>
                  </div>
                  <div>
                    <dt>ימים פעילים</dt>
                    <dd>
                      {d.activity.days30 === 1 ? 'יום אחד' : `${d.activity.days30} ימים`} ב-30 הימים האחרונים
                    </dd>
                  </div>
                  <div>
                    <dt>כניסות עם קישור</dt>
                    <dd className="num">{d.activity.signins}</dd>
                  </div>
                </>
              )}
            </dl>
          </>
        )}
      </div>
    </Modal>
  )
}
