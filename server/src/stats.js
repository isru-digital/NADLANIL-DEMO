/**
 * What the approvers' screen shows about the community: only what the server really keeps. Test registrants are left
 * out of every number. Days are counted in Israel time.
 *
 * Kept since 15.11.2026 (before that nothing about visits was kept):
 *   activity: per broker, the first and last time he opened the community, and how many times he signed in with a link
 *   visits  : one row per broker per day he opened the community
 */
const DAY = 24 * 3600_000
export const TZ = 'Asia/Jerusalem'
const dayFmt = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' })
/** "YYYY-MM-DD" of a moment, in Israel. */
export const dayKey = (ms) => dayFmt.format(new Date(ms))
const shiftDay = (key, by) => {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d + by)).toISOString().slice(0, 10)
}
/** The last `n` days, oldest first, ending today. */
export const lastDays = (n, now = Date.now()) => {
  const today = dayKey(now)
  return Array.from({ length: n }, (_, i) => shiftDay(today, i - (n - 1)))
}

function list(text) {
  try {
    const v = JSON.parse(text)
    return Array.isArray(v) ? v : []
  } catch {
    return []
  }
}

/** A broker opened the community (or signed in with a link). Never throws: a visit is not worth a failed page. */
export async function seen(env, memberId, signin = false) {
  if (!memberId) return
  const now = Date.now()
  try {
    await env.DB.batch([
      env.DB.prepare('INSERT INTO activity (member_id, first_at, last_at, signins) VALUES (?, ?, ?, ?) ON CONFLICT(member_id) DO UPDATE SET last_at = excluded.last_at, signins = signins + excluded.signins').bind(memberId, now, now, signin ? 1 : 0),
      env.DB.prepare('INSERT OR IGNORE INTO visits (member_id, day, first_at) VALUES (?, ?, ?)').bind(memberId, dayKey(now), now),
    ])
  } catch (e) {
    console.error('activity not kept', e?.message ?? e)
  }
}

const count = (items, keyOf) => {
  const m = new Map()
  for (const it of items) for (const k of [keyOf(it)].flat()) if (k) m.set(k, (m.get(k) ?? 0) + 1)
  return [...m.entries()].map(([name, n]) => ({ name, n })).sort((a, b) => b.n - a.n || a.name.localeCompare(b.name, 'he'))
}
const avg = (rows) => (rows.length ? { avg_ms: Math.round(rows.reduce((s, m) => s + (m.decided_at - m.created_at), 0) / rows.length), n: rows.length } : { avg_ms: null, n: 0 })
/** The areas are free text ("כפר גנים, אם המושבות"): split on commas and count each place. */
const areasOf = (text) =>
  String(text ?? '')
    .split(/[,،;\n/]+/)
    .map((s) => s.replace(/\s+/g, ' ').trim())
    .filter((s) => s.length >= 2 && s.length <= 40)

export async function stats(env) {
  const now = Date.now()
  const days30 = lastDays(30, now)
  const today = days30.at(-1)
  const week = new Set(days30.slice(-7))
  const month = new Set(days30)

  const all = (
    await env.DB.prepare('SELECT m.*, a.first_at AS seen_first, a.last_at AS seen_last, a.signins AS signins FROM members m LEFT JOIN activity a ON a.member_id = m.id').all()
  ).results
  const real = all.filter((m) => !m.is_test)
  for (const m of real) m.day = dayKey(m.created_at)
  const approved = real.filter((m) => m.status === 'approved')
  const pending = real.filter((m) => m.status === 'pending')
  const rejected = real.filter((m) => m.status === 'rejected')

  // visits of approved, real brokers
  const ids = new Set(approved.map((m) => m.id))
  const visits = (await env.DB.prepare('SELECT member_id, day FROM visits WHERE day >= ?').bind(days30[0]).all()).results.filter((v) => ids.has(v.member_id))
  const activeIn = (days) => new Set(visits.filter((v) => days.has(v.day)).map((v) => v.member_id)).size
  const days30Of = new Map()
  for (const v of visits) days30Of.set(v.member_id, (days30Of.get(v.member_id) ?? 0) + 1)

  const decided = real.filter((m) => m.status !== 'pending' && m.decided_at)
  const approvers = new Map()
  for (const m of decided) {
    const k = m.decided_by || 'לא ידוע'
    const a = approvers.get(k) ?? { name: k, approved: 0, rejected: 0, last_at: 0 }
    a[m.status === 'approved' ? 'approved' : 'rejected']++
    a.last_at = Math.max(a.last_at, m.decided_at)
    approvers.set(k, a)
  }

  return {
    generated_at: now,
    tz: TZ,
    tests: all.length - real.length,
    activity_since: (await env.DB.prepare('SELECT MIN(first_at) AS t FROM activity').first())?.t ?? null,
    totals: { approved: approved.length, pending: pending.length, rejected: rejected.length, all: real.length },
    signups: {
      today: real.filter((m) => m.day === today).length,
      week: real.filter((m) => week.has(m.day)).length,
      month: real.filter((m) => month.has(m.day)).length,
      daily: days30.map((day) => ({ day, n: real.filter((m) => m.day === day).length })),
    },
    decision_time: {
      all: avg(decided),
      approved: avg(decided.filter((m) => m.status === 'approved')),
      rejected: avg(decided.filter((m) => m.status === 'rejected')),
      oldest_pending_at: pending.length ? Math.min(...pending.map((m) => m.created_at)) : null,
    },
    approvers: [...approvers.values()].sort((a, b) => b.approved + b.rejected - (a.approved + a.rejected)),
    decisions: decided
      .sort((a, b) => b.decided_at - a.decided_at)
      .slice(0, 30)
      .map((m) => ({ id: m.id, name: m.name, status: m.status, decided_by: m.decided_by, decided_at: m.decided_at, created_at: m.created_at })),
    activity: {
      today: activeIn(new Set([today])),
      week: activeIn(week),
      month: activeIn(month),
      never: approved.filter((m) => !m.seen_last).length,
      signins: approved.reduce((s, m) => s + (m.signins ?? 0), 0),
    },
    breakdown: {
      cities: count(approved, (m) => list(m.cities)),
      areas: count(approved, (m) => areasOf(m.areas)).slice(0, 12),
      work: { office: approved.filter((m) => m.work === 'office').length, solo: approved.filter((m) => m.work === 'solo').length },
      offices: count(approved.filter((m) => m.work === 'office'), (m) => m.office_name).slice(0, 8),
    },
    // the brokers of the community: no phone and no e-mail here, those are in a broker's own details
    directory: approved
      .map((m) => ({
        id: m.id,
        name: m.name,
        cities: list(m.cities),
        work: m.work,
        office_name: m.office_name,
        joined_at: m.decided_at,
        last_seen: m.seen_last ?? null,
        signins: m.signins ?? 0,
        days30: days30Of.get(m.id) ?? 0,
      }))
      .sort((a, b) => (b.last_seen ?? 0) - (a.last_seen ?? 0) || (b.joined_at ?? 0) - (a.joined_at ?? 0)),
    days: days30,
  }
}

/** One broker's activity, for his details. */
export async function activityOf(env, memberId) {
  const a = await env.DB.prepare('SELECT first_at, last_at, signins FROM activity WHERE member_id = ?').bind(memberId).first()
  const days = lastDays(30)
  const v = await env.DB.prepare('SELECT COUNT(*) AS n FROM visits WHERE member_id = ? AND day >= ?').bind(memberId, days[0]).first()
  return { first_at: a?.first_at ?? null, last_at: a?.last_at ?? null, signins: a?.signins ?? 0, days30: v?.n ?? 0 }
}

/** "052-•••-••42": enough to recognise a number in a list, not enough to use it. */
export function maskPhone(phone) {
  const d = String(phone ?? '').replace(/\D/g, '')
  if (d.length < 6) return '•••'
  return `${d.slice(0, 3)}-•••-••${d.slice(-2)}`
}

