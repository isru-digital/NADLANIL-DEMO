import { sendMail } from './mail.js'
import { approvalMail, approveConfirmPage, donePage, loginMail, rejectFormPage, rejectMail, welcomeMail } from './templates.js'

/**
 * The community's sign-up, for real: a broker asks to join, an approver says yes or no from an e-mail (or from the
 * approvers' screen), and only an approved broker can sign in. Sign-in is a link sent by e-mail, with no passwords.
 *
 * Privacy: brokers' details are in the database only. The public can send a request and nothing else; reading
 * details needs a staff session. Tokens and sessions are kept as SHA-256 only. The Gmail app password is a secret
 * of the Worker and is never in this repository.
 */
const HOUR = 3600_000
const DAY = 24 * HOUR
const DECIDE_HOURS = 72 // the two buttons of an approval e-mail
const LOGIN_MINUTES = 30 // a sign-in link that was asked for
const WELCOME_DAYS = 7 // the sign-in button of the welcome e-mail
const SESSION_DAYS = 30

const SITE_ORIGIN = 'https://isru-digital.github.io'
const LOCAL = /^http:\/\/(localhost|127\.0\.0\.1):\d+$/

// ---------------------------------------------------------------- small tools
const json = (data, status = 200, headers = {}) => new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...headers } })
const html = (body, status = 200) => new Response(body, { status, headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store', 'referrer-policy': 'no-referrer', 'x-robots-tag': 'noindex' } })

const b64url = (bytes) => {
  let s = ''
  for (const b of bytes) s += String.fromCharCode(b)
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}
const newToken = () => b64url(crypto.getRandomValues(new Uint8Array(32)))
const newId = () => [...crypto.getRandomValues(new Uint8Array(8))].map((b) => b.toString(16).padStart(2, '0')).join('')
async function sha(text) {
  const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, '0')).join('')
}
const str = (v, max) => String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, max)
const emailOf = (v) => str(v, 160).toLowerCase()
const isEmail = (e) => /^[^\s@<>"]+@[^\s@<>"]+\.[a-z]{2,}$/i.test(e)

/** The public view of a broker's own record. */
const memberView = (m) => ({
  id: m.id,
  name: m.name,
  phone: m.phone,
  email: m.email,
  license: m.license,
  work: m.work,
  office_name: m.office_name,
  cities: safeList(m.cities),
  areas: m.areas,
  status: m.status,
  reason: m.reason,
  is_test: !!m.is_test,
  created_at: m.created_at,
  decided_at: m.decided_at,
  decided_by: m.decided_by,
})
function safeList(text) {
  try {
    const v = JSON.parse(text)
    return Array.isArray(v) ? v : []
  } catch {
    return []
  }
}

/** A simple brake: at most `max` times per `windowMs` for a key. */
async function allowed(env, key, max, windowMs) {
  const now = Date.now()
  const row = await env.DB.prepare('SELECT n, reset_at FROM rate WHERE key = ?').bind(key).first()
  if (!row || row.reset_at < now) {
    await env.DB.prepare('INSERT INTO rate (key, n, reset_at) VALUES (?, 1, ?) ON CONFLICT(key) DO UPDATE SET n = 1, reset_at = excluded.reset_at').bind(key, now + windowMs).run()
    return true
  }
  if (row.n >= max) return false
  await env.DB.prepare('UPDATE rate SET n = n + 1 WHERE key = ?').bind(key).run()
  return true
}

// ---------------------------------------------------------------- tokens and sessions
async function makeToken(env, kind, { memberId = null, staffEmail = null, ttl }) {
  const token = newToken()
  await env.DB.prepare('INSERT INTO tokens (hash, kind, member_id, staff_email, expires_at) VALUES (?, ?, ?, ?, ?)').bind(await sha(token), kind, memberId, staffEmail, Date.now() + ttl).run()
  return token
}
const findToken = async (env, token, kind) => (token ? env.DB.prepare('SELECT * FROM tokens WHERE hash = ? AND kind = ?').bind(await sha(token), kind).first() : null)

async function sessionOf(env, request) {
  const auth = request.headers.get('authorization') ?? ''
  const token = auth.startsWith('Bearer ') ? auth.slice(7).trim() : ''
  if (!token) return null
  const s = await env.DB.prepare('SELECT * FROM sessions WHERE hash = ?').bind(await sha(token)).first()
  if (!s || s.expires_at < Date.now()) return null
  const member = s.member_id ? await env.DB.prepare("SELECT * FROM members WHERE id = ? AND status = 'approved'").bind(s.member_id).first() : null
  const staff = s.staff_email ? await env.DB.prepare('SELECT * FROM staff WHERE email = ?').bind(s.staff_email).first() : null
  // a broker who is no longer approved, or staff who were removed, are signed out
  if (!member && !staff) return null
  return { hash: s.hash, member, staff }
}
const who = (s) => ({ member: s.member ? memberView(s.member) : null, staff: s.staff ? { name: s.staff.name, email: s.staff.email, approver: !!s.staff.approver } : null })

// ---------------------------------------------------------------- the e-mails
const site = (env) => String(env.SITE_URL).replace(/\/$/, '')

/** Sends the approval e-mail to every approver (or only to `onlyTo`), each with his own one-time token. */
async function askApprovers(env, origin, member, onlyTo = null) {
  const list = onlyTo ? [onlyTo] : (await env.DB.prepare('SELECT * FROM staff WHERE approver = 1').all()).results
  const out = []
  for (const approver of list) {
    const token = await makeToken(env, 'decide', { memberId: member.id, staffEmail: approver.email, ttl: DECIDE_HOURS * HOUR })
    const mail = approvalMail({ site: site(env), approver, member, yes: `${origin}/d/${token}?a=yes`, no: `${origin}/d/${token}?a=no`, hours: DECIDE_HOURS })
    out.push(await sendMail(env, { to: approver.email, kind: 'approval', ...mail }))
  }
  return out
}

/**
 * The decision, made once. The update only passes while the request is still pending, so two approvers (or two
 * clicks) can never both decide: the second one gets `false`.
 */
async function decide(env, member, approved, by, reason = '') {
  const done = await env.DB.prepare("UPDATE members SET status = ?, reason = ?, decided_at = ?, decided_by = ? WHERE id = ? AND status = 'pending'")
    .bind(approved ? 'approved' : 'rejected', approved ? '' : reason, Date.now(), by, member.id)
    .run()
  if (done.meta.changes !== 1) return false
  // every other button of this request is spent
  await env.DB.prepare("UPDATE tokens SET used_at = ? WHERE member_id = ? AND kind = 'decide' AND used_at IS NULL").bind(Date.now(), member.id).run()
  if (approved) {
    const staff = await env.DB.prepare('SELECT email FROM staff WHERE email = ?').bind(member.email).first()
    const token = await makeToken(env, 'login', { memberId: member.id, staffEmail: staff?.email ?? null, ttl: WELCOME_DAYS * DAY })
    await sendMail(env, { to: member.email, kind: 'welcome', ...welcomeMail({ site: site(env), member, enter: `${site(env)}/kehila/enter?t=${token}` }) })
  } else {
    await sendMail(env, { to: member.email, kind: 'reject', ...rejectMail({ site: site(env), member, reason }) })
  }
  return true
}

// ---------------------------------------------------------------- what the public can do
async function register(env, request, origin) {
  const ip = request.headers.get('cf-connecting-ip') ?? 'local'
  if (!(await allowed(env, `reg:${ip}`, 6, HOUR))) return json({ error: 'יותר מדי בקשות מהמקום הזה. נסו שוב בעוד שעה.' }, 429)
  const b = await request.json().catch(() => null)
  if (!b || typeof b !== 'object') return json({ error: 'הבקשה לא תקינה.' }, 400)

  const m = {
    name: str(b.name, 80),
    phone: str(b.phone, 20),
    email: emailOf(b.email),
    license: str(b.license, 20),
    work: b.work === 'office' ? 'office' : b.work === 'solo' ? 'solo' : '',
    office_name: str(b.office_name, 80),
    cities: Array.isArray(b.cities) ? b.cities.map((c) => str(c, 40)).filter(Boolean).slice(0, 30) : [],
    areas: str(b.areas, 300),
  }
  // every field is required
  const errors = {}
  if (m.name.length < 2) errors.name = 'צריך שם מלא.'
  if (m.phone.replace(/\D/g, '').length < 9) errors.phone = 'מספר הטלפון קצר מדי.'
  if (!isEmail(m.email)) errors.email = 'כתובת המייל לא נראית תקינה.'
  if (!/^\d{4,10}$/.test(m.license.replace(/[\s-]/g, ''))) errors.license = 'מספר רישיון תיווך הוא ספרות בלבד.'
  if (!m.work) errors.work = 'בוחרים: במשרד או עצמאי.'
  if (m.work === 'office' && m.office_name.length < 2) errors.office_name = 'מה שם המשרד?'
  if (m.cities.length === 0) errors.cities = 'בוחרים לפחות עיר אחת.'
  if (m.areas.length < 2) errors.areas = 'כותבים באילו אזורים אתם עובדים.'
  if (Object.keys(errors).length) return json({ error: 'חסרים פרטים.', fields: errors }, 400)
  if (m.work === 'solo') m.office_name = ''

  const old = await env.DB.prepare('SELECT * FROM members WHERE email = ?').bind(m.email).first()
  // the answer is the same waiting screen whether or not the address was seen before: nothing about a broker leaks
  if (old && old.status === 'pending') return json({ ok: true, name: old.name })
  if (old && old.status === 'approved') {
    // already a member: a sign-in link goes to the address itself
    await sendLogin(env, m.email)
    return json({ ok: true, name: m.name })
  }
  const now = Date.now()
  const id = old?.id ?? newId()
  if (old) {
    // asked again after a rejection: the request starts over
    await env.DB.prepare("UPDATE members SET name=?, phone=?, license=?, work=?, office_name=?, cities=?, areas=?, status='pending', reason='', created_at=?, decided_at=NULL, decided_by=NULL WHERE id=?")
      .bind(m.name, m.phone, m.license, m.work, m.office_name, JSON.stringify(m.cities), m.areas, now, id)
      .run()
  } else {
    await env.DB.prepare('INSERT INTO members (id, name, phone, email, license, work, office_name, cities, areas, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
      .bind(id, m.name, m.phone, m.email, m.license, m.work, m.office_name, JSON.stringify(m.cities), m.areas, now)
      .run()
  }
  const member = await env.DB.prepare('SELECT * FROM members WHERE id = ?').bind(id).first()
  await askApprovers(env, origin, member)
  return json({ ok: true, name: member.name })
}

/** A sign-in link to an approved broker and/or to staff. Says nothing to anyone else. */
async function sendLogin(env, email) {
  const member = await env.DB.prepare("SELECT * FROM members WHERE email = ? AND status = 'approved'").bind(email).first()
  const staff = await env.DB.prepare('SELECT * FROM staff WHERE email = ?').bind(email).first()
  if (!member && !staff) return false
  const token = await makeToken(env, 'login', { memberId: member?.id ?? null, staffEmail: staff?.email ?? null, ttl: LOGIN_MINUTES * 60_000 })
  await sendMail(env, { to: email, kind: 'login', ...loginMail({ site: site(env), name: member?.name ?? staff.name, enter: `${site(env)}/kehila/enter?t=${token}`, minutes: LOGIN_MINUTES }) })
  return true
}

async function login(env, request) {
  const ip = request.headers.get('cf-connecting-ip') ?? 'local'
  const b = await request.json().catch(() => null)
  const email = emailOf(b?.email)
  if (!isEmail(email)) return json({ error: 'כתובת המייל לא נראית תקינה.' }, 400)
  if (!(await allowed(env, `login-ip:${ip}`, 20, HOUR)) || !(await allowed(env, `login:${email}`, 5, HOUR))) return json({ error: 'יותר מדי בקשות. נסו שוב בעוד שעה.' }, 429)
  await sendLogin(env, email)
  // the same answer for every address
  return json({ ok: true })
}

/** A sign-in link is traded for a session, once. */
async function openSession(env, request) {
  const b = await request.json().catch(() => null)
  const t = await findToken(env, str(b?.token, 200), 'login')
  if (!t) return json({ error: 'הקישור לא תקין.', code: 'bad' }, 400)
  if (t.used_at) return json({ error: 'הקישור הזה כבר שימש לכניסה. אפשר לבקש קישור חדש.', code: 'used' }, 400)
  if (t.expires_at < Date.now()) return json({ error: 'הקישור פג. אפשר לבקש קישור חדש.', code: 'expired' }, 400)
  const spent = await env.DB.prepare('UPDATE tokens SET used_at = ? WHERE hash = ? AND used_at IS NULL').bind(Date.now(), t.hash).run()
  if (spent.meta.changes !== 1) return json({ error: 'הקישור הזה כבר שימש לכניסה. אפשר לבקש קישור חדש.', code: 'used' }, 400)
  const token = newToken()
  const now = Date.now()
  await env.DB.prepare('INSERT INTO sessions (hash, member_id, staff_email, created_at, expires_at) VALUES (?, ?, ?, ?, ?)').bind(await sha(token), t.member_id, t.staff_email, now, now + SESSION_DAYS * DAY).run()
  const s = await sessionOf(env, new Request('https://x/', { headers: { authorization: `Bearer ${token}` } }))
  if (!s) return json({ error: 'אי אפשר להיכנס עם הקישור הזה.', code: 'bad' }, 403)
  return json({ ok: true, token, ...who(s) })
}

// ---------------------------------------------------------------- the two buttons of an approval e-mail
async function decisionPage(env, request, origin, token, url) {
  const t = await findToken(env, token, 'decide')
  const admin = { href: `${site(env)}/kehila/admin`, label: 'למסך הניהול' }
  if (!t) return html(donePage({ site: site(env), title: 'הקישור לא תקין', text: 'הקישור הזה לא מוכר. אפשר לטפל בבקשות ממסך הניהול.', mark: '!', grey: true, link: admin }), 404)
  const member = await env.DB.prepare('SELECT * FROM members WHERE id = ?').bind(t.member_id).first()
  if (!member) return html(donePage({ site: site(env), title: 'הבקשה לא נמצאה', text: 'הבקשה הזו כבר לא קיימת.', mark: '!', grey: true, link: admin }), 404)
  if (member.status !== 'pending') {
    const what = member.status === 'approved' ? 'אושרה' : 'נדחתה'
    return html(donePage({ site: site(env), title: 'הבקשה כבר טופלה', text: `הבקשה של ${member.name} ${what}${member.decided_by ? ` על ידי ${member.decided_by}` : ''}.`, mark: '✓', grey: true, link: admin }))
  }
  // a spent button of a request that is waiting again: the broker signed up again after a rejection, and the
  // approvers got a new e-mail with new buttons
  if (t.used_at) return html(donePage({ site: site(env), title: 'הקישור הזה כבר לא בתוקף', text: `${member.name} נרשם שוב, ולכן נשלח מייל חדש עם כפתורים חדשים. אפשר לטפל בבקשה גם ממסך הניהול.`, mark: '!', grey: true, link: admin }), 410)
  if (t.expires_at < Date.now()) return html(donePage({ site: site(env), title: 'הקישור פג', text: `הכפתורים במייל בתוקף ל-${DECIDE_HOURS} שעות. הבקשה של ${member.name} עדיין ממתינה, ואפשר לטפל בה ממסך הניהול.`, mark: '!', grey: true, link: admin }), 410)

  const staff = await env.DB.prepare('SELECT * FROM staff WHERE email = ?').bind(t.staff_email).first()
  if (!staff) return html(donePage({ site: site(env), title: 'אין הרשאה', text: 'הכתובת שאליה נשלח המייל כבר לא ברשימת המאשרים.', mark: '!', grey: true }), 403)
  const action = `${origin}/d/${token}`

  if (request.method === 'GET') {
    return html(url.searchParams.get('a') === 'no' ? rejectFormPage({ site: site(env), member, action }) : approveConfirmPage({ site: site(env), member, action }))
  }
  const form = await request.formData().catch(() => null)
  const a = form?.get('a')
  if (a === 'yes') {
    const ok = await decide(env, member, true, staff.name)
    if (!ok) return html(donePage({ site: site(env), title: 'הבקשה כבר טופלה', text: `מישהו כבר טיפל בבקשה של ${member.name}.`, grey: true, link: admin }))
    return html(donePage({ site: site(env), title: `${member.name} אושר`, text: 'נשלח אליו מייל "ברוכים הבאים" עם כפתור כניסה. מעכשיו הוא יכול להיכנס לקהילה.' }))
  }
  if (a === 'no') {
    const reason = String(form.get('reason') ?? '').trim().slice(0, 600)
    if (reason.length < 3) return html(rejectFormPage({ site: site(env), member, action, reason, error: 'צריך לכתוב סיבה קצרה.' }), 400)
    const ok = await decide(env, member, false, staff.name, reason)
    if (!ok) return html(donePage({ site: site(env), title: 'הבקשה כבר טופלה', text: `מישהו כבר טיפל בבקשה של ${member.name}.`, grey: true, link: admin }))
    return html(donePage({ site: site(env), title: 'הבקשה נדחתה', text: `נשלח אל ${member.name} מייל מנומס עם הסיבה שכתבת.`, mark: '✓', grey: true }))
  }
  return html(donePage({ site: site(env), title: 'הבקשה לא תקינה', text: 'אפשר לחזור למייל ולנסות שוב.', mark: '!', grey: true }), 400)
}

// ---------------------------------------------------------------- the approvers' screen
async function admin(env, request, origin, path, s) {
  const method = request.method
  const body = method === 'GET' || method === 'DELETE' ? null : await request.json().catch(() => ({}))

  if (path === '/api/admin/members' && method === 'GET') {
    const rows = (await env.DB.prepare('SELECT * FROM members ORDER BY created_at DESC LIMIT 500').all()).results
    const mail = (await env.DB.prepare('SELECT to_email, kind, status, error, created_at FROM mail_log ORDER BY id DESC LIMIT 12').all()).results
    return json({ members: rows.map(memberView), mail, mailReady: env.TEST_MODE === '1' || !!env.GMAIL_APP_PASSWORD, decideHours: DECIDE_HOURS })
  }

  const one = path.match(/^\/api\/admin\/members\/([a-f0-9]{16})(?:\/(approve|reject|resend))?$/)
  if (one) {
    const member = await env.DB.prepare('SELECT * FROM members WHERE id = ?').bind(one[1]).first()
    if (!member) return json({ error: 'הבקשה לא נמצאה.' }, 404)
    if (one[2] === 'approve' && method === 'POST') {
      const ok = await decide(env, member, true, s.staff.name)
      return ok ? json({ ok: true }) : json({ error: 'הבקשה כבר טופלה.', code: 'handled' }, 409)
    }
    if (one[2] === 'reject' && method === 'POST') {
      const reason = String(body?.reason ?? '').trim().slice(0, 600)
      if (reason.length < 3) return json({ error: 'צריך לכתוב סיבה קצרה.' }, 400)
      const ok = await decide(env, member, false, s.staff.name, reason)
      return ok ? json({ ok: true }) : json({ error: 'הבקשה כבר טופלה.', code: 'handled' }, 409)
    }
    if (one[2] === 'resend' && method === 'POST') {
      if (member.status !== 'pending') return json({ error: 'הבקשה כבר טופלה.', code: 'handled' }, 409)
      const sent = await askApprovers(env, origin, member)
      return json({ ok: true, sent })
    }
    if (!one[2] && method === 'DELETE') {
      // only a test registrant can be removed: a real request stays on record
      if (!member.is_test) return json({ error: 'אפשר למחוק רק נרשם בדיקה.' }, 400)
      await env.DB.batch([
        env.DB.prepare('DELETE FROM tokens WHERE member_id = ?').bind(member.id),
        env.DB.prepare('DELETE FROM sessions WHERE member_id = ?').bind(member.id),
        env.DB.prepare('DELETE FROM members WHERE id = ?').bind(member.id),
      ])
      return json({ ok: true })
    }
  }

  // a test registrant: a full request made from this screen, to try the whole way through
  if (path === '/api/admin/test' && method === 'POST') {
    const name = str(body?.name, 80)
    const email = emailOf(body?.email)
    if (name.length < 2) return json({ error: 'צריך שם.' }, 400)
    if (!isEmail(email)) return json({ error: 'כתובת המייל לא נראית תקינה.' }, 400)
    const old = await env.DB.prepare('SELECT * FROM members WHERE email = ?').bind(email).first()
    if (old && !old.is_test) return json({ error: 'הכתובת הזו שייכת לבקשה אמיתית. בחרו כתובת אחרת.' }, 409)
    if (old) {
      await env.DB.batch([env.DB.prepare('DELETE FROM tokens WHERE member_id = ?').bind(old.id), env.DB.prepare('DELETE FROM sessions WHERE member_id = ?').bind(old.id), env.DB.prepare('DELETE FROM members WHERE id = ?').bind(old.id)])
    }
    const id = newId()
    await env.DB.prepare("INSERT INTO members (id, name, phone, email, license, work, office_name, cities, areas, is_test, created_at) VALUES (?, ?, '050-555-0100', ?, '0000000', 'solo', '', ?, 'נרשם בדיקה', 1, ?)")
      .bind(id, name, email, JSON.stringify(['תל אביב']), Date.now())
      .run()
    const member = await env.DB.prepare('SELECT * FROM members WHERE id = ?').bind(id).first()
    // by default the approval e-mail of a test goes only to whoever made it, so the other approvers are not disturbed
    const sent = await askApprovers(env, origin, member, body?.to_all ? null : s.staff)
    return json({ ok: true, member: memberView(member), sent })
  }

  // the list of approvers: one place to add Ariel
  if (path === '/api/admin/staff' && method === 'GET') {
    return json({ staff: (await env.DB.prepare('SELECT email, name, approver FROM staff ORDER BY created_at').all()).results.map((x) => ({ ...x, approver: !!x.approver })) })
  }
  if (path === '/api/admin/staff' && method === 'POST') {
    const name = str(body?.name, 60)
    const email = emailOf(body?.email)
    if (name.length < 2 || !isEmail(email)) return json({ error: 'צריך שם וכתובת מייל תקינה.' }, 400)
    await env.DB.prepare('INSERT INTO staff (email, name, approver, created_at) VALUES (?, ?, ?, ?) ON CONFLICT(email) DO UPDATE SET name = excluded.name, approver = excluded.approver')
      .bind(email, name, body?.approver === false ? 0 : 1, Date.now())
      .run()
    return json({ ok: true })
  }
  if (path === '/api/admin/staff' && method === 'DELETE') {
    const email = emailOf(new URL(request.url).searchParams.get('email'))
    if (email === s.staff.email) return json({ error: 'אי אפשר להסיר את עצמך.' }, 400)
    await env.DB.batch([env.DB.prepare('DELETE FROM staff WHERE email = ?').bind(email), env.DB.prepare('DELETE FROM sessions WHERE staff_email = ? AND member_id IS NULL').bind(email)])
    return json({ ok: true })
  }
  return json({ error: 'לא נמצא.' }, 404)
}

// ---------------------------------------------------------------- the door
export default {
  async fetch(request, env) {
    const url = new URL(request.url)
    const path = url.pathname.replace(/\/+$/, '') || '/'
    const origin = url.origin
    const from = request.headers.get('origin') ?? ''
    const okOrigin = from === SITE_ORIGIN || (env.TEST_MODE === '1' && LOCAL.test(from))
    const cors = okOrigin ? { 'access-control-allow-origin': from, vary: 'Origin', 'access-control-allow-headers': 'authorization, content-type', 'access-control-allow-methods': 'GET, POST, DELETE, OPTIONS', 'access-control-max-age': '86400' } : {}
    const withCors = (res) => {
      for (const [k, v] of Object.entries(cors)) res.headers.set(k, v)
      return res
    }

    try {
      if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors })

      // the two buttons of an approval e-mail (pages, opened straight from the mail program)
      const d = path.match(/^\/d\/([A-Za-z0-9_-]{20,})$/)
      if (d && (request.method === 'GET' || request.method === 'POST')) return await decisionPage(env, request, origin, d[1], url)

      if (path === '/' || path === '/api') return withCors(json({ ok: true, service: 'nadlanup community sign-up' }))

      // anything that changes something must come from the site itself
      if (path.startsWith('/api/') && request.method !== 'GET' && !okOrigin) return json({ error: 'מקור הבקשה לא מורשה.' }, 403)

      if (path === '/api/register' && request.method === 'POST') return withCors(await register(env, request, origin))
      if (path === '/api/login' && request.method === 'POST') return withCors(await login(env, request))
      if (path === '/api/session' && request.method === 'POST') return withCors(await openSession(env, request))

      // local testing only: the e-mails that would have gone out
      if (path === '/api/test/outbox' && env.TEST_MODE === '1') {
        if (request.method === 'DELETE') {
          await env.DB.batch(['outbox', 'members', 'tokens', 'sessions', 'mail_log', 'rate'].map((t) => env.DB.prepare(`DELETE FROM ${t}`)))
          return withCors(json({ ok: true }))
        }
        return withCors(json({ outbox: (await env.DB.prepare('SELECT * FROM outbox ORDER BY id').all()).results }))
      }
      if (path === '/api/test/expire' && env.TEST_MODE === '1' && request.method === 'POST') {
        // makes every unused link old, to check what an expired link does
        await env.DB.prepare('UPDATE tokens SET expires_at = 1 WHERE used_at IS NULL').run()
        return withCors(json({ ok: true }))
      }
      if (path === '/api/test/rate' && env.TEST_MODE === '1' && request.method === 'DELETE') {
        await env.DB.prepare('DELETE FROM rate').run()
        return withCors(json({ ok: true }))
      }

      const s = await sessionOf(env, request)
      if (path === '/api/me' && request.method === 'GET') return withCors(s ? json({ ok: true, ...who(s) }) : json({ error: 'לא מחוברים.' }, 401))
      if (path === '/api/logout' && request.method === 'POST') {
        if (s) await env.DB.prepare('DELETE FROM sessions WHERE hash = ?').bind(s.hash).run()
        return withCors(json({ ok: true }))
      }
      if (path.startsWith('/api/admin/')) {
        // brokers' details are for staff only
        if (!s?.staff) return withCors(json({ error: 'המסך הזה פתוח למאשרים בלבד.' }, s ? 403 : 401))
        return withCors(await admin(env, request, origin, path, s))
      }
      return withCors(json({ error: 'לא נמצא.' }, 404))
    } catch (e) {
      // never leak details of a failure to the outside
      console.error('server error', e?.message ?? e)
      return withCors(json({ error: 'משהו השתבש בשרת. נסו שוב בעוד רגע.' }, 500))
    }
  },
}
