// The server's own checks, against a local copy in test mode (TEST_MODE=1: e-mails go to the "outbox" table, not out).
// Run: in server/  ->  npx wrangler dev --port 8787 --local   and then   node test.mjs
// It wipes the LOCAL test database's requests first. It never touches the real server.
const API = process.env.API ?? 'http://localhost:8787'
const ORIGIN = 'http://localhost:5240'
if (!/^http:\/\/(localhost|127\.0\.0\.1)/.test(API)) throw new Error('these checks run against a local server only')

const results = []
const check = (name, ok, detail = '') => {
  results.push(ok)
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok || !detail ? '' : `  [${detail}]`}`)
}
const call = async (path, { method = 'GET', body, token, origin = ORIGIN, form } = {}) => {
  const headers = { ...(origin ? { origin } : {}), ...(token ? { authorization: `Bearer ${token}` } : {}) }
  let payload
  if (form) {
    payload = new URLSearchParams(form)
  } else if (body !== undefined) {
    headers['content-type'] = 'application/json'
    payload = JSON.stringify(body)
  }
  const res = await fetch(API + path, { method, headers, body: payload, redirect: 'manual' })
  const text = await res.text()
  let data = null
  try {
    data = JSON.parse(text)
  } catch {
    /* a page */
  }
  return { status: res.status, data, text, headers: res.headers }
}
const outbox = async () => (await call('/api/test/outbox')).data.outbox
const lastTo = async (email) => (await outbox()).filter((m) => m.to_email === email).at(-1)
const links = (html) => [...html.matchAll(/href="([^"]+)"/g)].map((m) => m[1].replace(/&amp;/g, '&'))
const pathOf = (u) => u.replace(API, '')
// the brake on repeated requests is real (6 sign-ups an hour from one place): the checks reset it between parts
const freshRate = () => call('/api/test/rate', { method: 'DELETE' })

const good = { name: 'דנה כהן', phone: '052-555-0142', email: 'dana@test.local', license: '3141592', work: 'office', office_name: 'כהן נכסים', cities: ['פתח תקווה', 'ראש העין'], areas: 'כפר גנים, אם המושבות' }

await call('/api/test/outbox', { method: 'DELETE' })

// ---------------------------------------------------------------- 1. the form: every field is required
let r = await call('/api/register', { method: 'POST', body: {} })
check('an empty form is refused, field by field (the neighbourhoods are optional)', r.status === 400 && ['name', 'phone', 'email', 'license', 'work', 'cities'].every((f) => r.data.fields?.[f]) && !r.data.fields?.areas, JSON.stringify(r.data))
r = await call('/api/register', { method: 'POST', body: { ...good, cities: [] } })
check('no city: refused, the city is required', r.status === 400 && !!r.data.fields.cities)
r = await call('/api/register', { method: 'POST', body: { ...good, office_name: '' } })
check('"במשרד" needs the office name', r.status === 400 && !!r.data.fields.office_name)
r = await call('/api/register', { method: 'POST', body: { ...good, license: 'abc' } })
check('a licence number is digits', r.status === 400 && !!r.data.fields.license)
r = await call('/api/register', { method: 'POST', body: good, origin: 'https://evil.example' })
check('a request from another site is refused', r.status === 403)

// a request with a city and no neighbourhoods is accepted (Itzik 18.11.2026); it is taken back right away
await freshRate()
r = await call('/api/register', { method: 'POST', body: { ...good, email: 'no-areas@test.local', areas: '' } })
check('a city and no neighbourhoods: accepted', r.status === 200 && r.data.ok, JSON.stringify(r.data))
await call('/api/test/outbox', { method: 'DELETE' })

// ---------------------------------------------------------------- 2. a good request waits for approval
await freshRate()
r = await call('/api/register', { method: 'POST', body: good })
check('a full form is accepted and answers with the name only', r.status === 200 && r.data.ok && r.data.name === 'דנה כהן' && !('id' in r.data))
let box = await outbox()
const toOfek = box.find((m) => m.to_email === 'ofek@test.local')
const toAriel = box.find((m) => m.to_email === 'ariel@test.local')
check('the approval e-mail goes to every approver, and not to staff who are not approvers', !!toOfek && !!toAriel && !box.some((m) => m.to_email === 'itzik@test.local'), box.map((m) => m.to_email).join())
check('it greets the approver by name, with the sentence as written', toOfek.html.includes('היי אופק,') && toOfek.html.replace(/<[^>]+>/g, '').includes('המתווך דנה כהן מעוניין להצטרף לקהילה. האם אתה מאשר?') && toAriel.html.includes('היי אריאל,'))
check('it carries the logo and every detail that was filled in', toOfek.html.includes('/brand/nadlanup-light.png') && ['דנה כהן', '052-555-0142', 'dana@test.local', '3141592', 'במשרד: כהן נכסים', 'פתח תקווה, ראש העין', 'כפר גנים, אם המושבות'].every((v) => toOfek.html.includes(v)))
check('it has two buttons: "כן, לאשר" and "לא"', toOfek.html.includes('>כן, לאשר</a>') && toOfek.html.includes('>לא</a>'))
const ofek = { yes: links(toOfek.html).find((l) => l.includes('a=yes')), no: links(toOfek.html).find((l) => l.includes('a=no')) }
const ariel = { yes: links(toAriel.html).find((l) => l.includes('a=yes')), no: links(toAriel.html).find((l) => l.includes('a=no')) }
check('each approver has his own one-time token', !!ofek.yes && !!ariel.yes && ofek.yes !== ariel.yes && /\/d\/[A-Za-z0-9_-]{40,}\?a=yes$/.test(ofek.yes))

r = await call('/api/login', { method: 'POST', body: { email: good.email } })
check('before approval a sign-in link is not sent (the answer is the same as for anyone)', r.status === 200 && r.data.ok && !(await lastTo(good.email)))
r = await call('/api/register', { method: 'POST', body: good })
check('asking again while waiting changes nothing and sends no second e-mail', r.status === 200 && (await outbox()).filter((m) => m.to_email === 'ofek@test.local').length === 1)

// ---------------------------------------------------------------- 3. privacy: nobody outside staff reads details
r = await call('/api/admin/members')
check('the list of requests is closed without signing in', r.status === 401)
r = await call('/api/me')
check('"who am I" is closed without signing in', r.status === 401)
r = await call('/api/test/outbox')
check('(test mode is on: the outbox is readable here, and only here)', r.status === 200)

// ---------------------------------------------------------------- 4. yes: only a POST approves, and only once
r = await call(pathOf(ofek.yes), { origin: null })
check('opening "כן, לאשר" shows a page that sends the approval by itself, and changes nothing yet', r.status === 200 && r.text.includes('מאשרים את דנה כהן?') && r.text.includes("getElementById('f').submit()") && !(await lastTo(good.email)))
r = await call(pathOf(ofek.yes).split('?')[0], { method: 'POST', form: { a: 'yes' }, origin: null })
check('the approval goes through', r.status === 200 && r.text.includes('דנה כהן אושר'))
const welcome = await lastTo(good.email)
check('the broker gets a "ברוכים הבאים" e-mail with the logo, a line about the community and an entry button', !!welcome && welcome.subject.includes('ברוכים הבאים') && welcome.html.includes('/brand/nadlanup-light.png') && welcome.html.includes('הקהילה החינמית שמחברת בין מתווכים מכל הארץ') && welcome.html.includes('>כניסה לקהילה</a>'))
r = await call(pathOf(ofek.yes).split('?')[0], { method: 'POST', form: { a: 'yes' }, origin: null })
check('approving a second time is not possible', r.text.includes('הבקשה כבר טופלה'))
r = await call(pathOf(ariel.yes), { origin: null })
check('another approver sees "הבקשה כבר טופלה", and by whom', r.text.includes('הבקשה כבר טופלה') && r.text.includes('על ידי אופק'))
r = await call(pathOf(ariel.no).split('?')[0], { method: 'POST', form: { a: 'no', reason: 'ניסיון לדחות אחרי אישור' }, origin: null })
check('... and cannot reject what was approved', r.text.includes('הבקשה כבר טופלה') && (await outbox()).filter((m) => m.to_email === good.email).length === 1)

// ---------------------------------------------------------------- 5. signing in with the link
const enter = links(welcome.html).find((l) => l.includes('/kehila/enter?t='))
const loginToken = new URL(enter).searchParams.get('t')
check('the entry button leads to the site with a one-time token', enter.startsWith('http://localhost:5240/NADLANIL-DEMO/green/kehila/enter?t=') && loginToken.length >= 40)
r = await call('/api/session', { method: 'POST', body: { token: loginToken } })
const danaSession = r.data?.token
check('the link signs the broker in: his own details come back, and no staff rights', r.status === 200 && !!danaSession && r.data.member.name === 'דנה כהן' && r.data.member.status === 'approved' && r.data.staff === null)
r = await call('/api/session', { method: 'POST', body: { token: loginToken } })
check('the same link does not work twice', r.status === 400 && r.data.code === 'used')
r = await call('/api/me', { token: danaSession })
check('the session is remembered', r.status === 200 && r.data.member.email === good.email)
r = await call('/api/admin/members', { token: danaSession })
check('a broker cannot open the approvers\' screen', r.status === 403)
r = await call('/api/login', { method: 'POST', body: { email: good.email } })
const again = await lastTo(good.email)
check('after approval, asking to sign in sends a mail with a 6-digit code and a link', /^\d{6} הוא קוד הכניסה שלך$/.test(again.subject) && again.html.includes('/kehila/enter?t='), again.subject)

// ---------------------------------------------------------------- 6. no: a reason, and a polite e-mail
await freshRate()
const bad = { ...good, name: 'יוסי לוי', email: 'yossi@test.local', work: 'solo', office_name: '' }
await call('/api/register', { method: 'POST', body: bad })
const ask2 = await lastTo('ofek@test.local')
const no2 = links(ask2.html).find((l) => l.includes('a=no'))
r = await call(pathOf(no2), { origin: null })
check('"לא" opens a small page that asks for a short reason', r.status === 200 && r.text.includes('לא לאשר את יוסי לוי') && r.text.includes('<textarea') && ask2.html.includes('עצמאי'))
r = await call(pathOf(no2).split('?')[0], { method: 'POST', form: { a: 'no', reason: '' }, origin: null })
check('a rejection without a reason is not sent', r.status === 400 && r.text.includes('צריך לכתוב סיבה קצרה') && !(await lastTo(bad.email)))
r = await call(pathOf(no2).split('?')[0], { method: 'POST', form: { a: 'no', reason: 'לא הצלחנו לאמת את מספר הרישיון <b>x</b>' }, origin: null })
const sorry = await lastTo(bad.email)
check('with a reason the request is rejected, and the broker gets a polite e-mail with it', r.text.includes('הבקשה נדחתה') && !!sorry && sorry.html.includes('לצערנו לא נוכל לאשר את הבקשה בשלב הזה') && sorry.html.includes('לא הצלחנו לאמת את מספר הרישיון'))
check('what an approver typed is escaped in the e-mail', sorry.html.includes('&lt;b&gt;x&lt;/b&gt;') && !sorry.html.includes('<b>x</b>'))
check('the rejection e-mail has a "להרשמה מחדש" button to the sign-up form', sorry.html.includes('>להרשמה מחדש</a>') && /href="[^"]+\/kehila\/join\?again=1"/.test(sorry.html))
check('the rejection e-mail has a personal subject and no hidden preview text', sorry.subject === 'יוסי לוי, הבקשה שלך להצטרף למתווכים לעסקאות' && !sorry.html.includes('display:none'))
r = await call('/api/login', { method: 'POST', body: { email: bad.email } })
check('a rejected broker cannot get a sign-in link', (await lastTo(bad.email)).subject !== 'קישור הכניסה שלך')
r = await call('/api/register', { method: 'POST', body: bad })
check('a rejected broker can ask again, and the approvers are asked again', r.status === 200 && (await outbox()).filter((m) => m.to_email === 'ofek@test.local' && m.subject.includes('יוסי לוי')).length === 2)
check('... both approvers, each with a fresh link', (await outbox()).filter((m) => m.to_email === 'ariel@test.local' && m.subject.includes('יוסי לוי')).length === 2)
const ask3 = await lastTo('ofek@test.local')
r = await call(pathOf(links(ask3.html).find((l) => l.includes('a=no'))), { origin: null })
check('the new request is open again: its "לא" asks for a reason, not "already handled"', r.status === 200 && r.text.includes('<textarea') && !r.text.includes('כבר טופלה'))
r = await call(pathOf(no2), { origin: null })
check('the first e-mail\'s buttons are spent, and say a new e-mail was sent', r.status === 410 && r.text.includes('כבר לא בתוקף') && r.text.includes('נשלח מייל חדש'))
r = await call(pathOf(no2).split('?')[0], { method: 'POST', form: { a: 'no', reason: 'ניסיון עם כפתור ישן' }, origin: null })
check('... and pressing one decides nothing', r.status === 410 && (await outbox()).filter((m) => m.to_email === bad.email && m.html.includes('ניסיון עם כפתור ישן')).length === 0)

// ---------------------------------------------------------------- 7. the approvers' screen
await call('/api/login', { method: 'POST', body: { email: 'itzik@test.local' } })
const staffMail = await lastTo('itzik@test.local')
r = await call('/api/session', { method: 'POST', body: { token: new URL(links(staffMail.html).find((l) => l.includes('/kehila/enter'))).searchParams.get('t') } })
const staff = r.data?.token
check('staff sign in with a link too', !!staff && r.data.staff?.name === 'איציק' && r.data.member === null)
r = await call('/api/admin/members', { token: staff })
check('staff see every request with its details and status', r.status === 200 && r.data.members.length === 2 && r.data.members.some((m) => m.name === 'דנה כהן' && m.status === 'approved' && m.license === '3141592') && r.data.members.some((m) => m.name === 'יוסי לוי' && m.status === 'pending'))
const yossi = r.data.members.find((m) => m.name === 'יוסי לוי')
r = await call(`/api/admin/members/${yossi.id}/reject`, { method: 'POST', token: staff, body: { reason: '' } })
check('rejecting from the screen needs a reason too', r.status === 400)
r = await call(`/api/admin/members/${yossi.id}/approve`, { method: 'POST', token: staff })
check('a request can be approved from the screen', r.status === 200 && (await lastTo(bad.email)).subject.includes('ברוכים הבאים'))
r = await call(`/api/admin/members/${yossi.id}/reject`, { method: 'POST', token: staff, body: { reason: 'מאוחר מדי' } })
check('... and then it is handled: a second decision is refused', r.status === 409)
const yes2 = links((await outbox()).filter((m) => m.to_email === 'ofek@test.local' && m.subject.includes('יוסי לוי')).at(-1).html).find((l) => l.includes('a=yes'))
r = await call(pathOf(yes2), { origin: null })
check('the buttons of the old e-mail then say "הבקשה כבר טופלה"', r.text.includes('הבקשה כבר טופלה') && r.text.includes('על ידי איציק'))

// ---------------------------------------------------------------- 8. a test registrant
r = await call('/api/admin/test', { method: 'POST', token: staff, body: { name: 'נרשם בדיקה', email: 'itzik@test.local' } })
const testId = r.data?.member?.id
const testAsk = await lastTo('itzik@test.local')
check('a test registrant is created, marked as a test, and its approval e-mail goes only to whoever made it', r.status === 200 && r.data.member.is_test && testAsk.subject.startsWith('(בדיקה)') && testAsk.html.includes('היי איציק,') && !(await outbox()).some((m) => m.to_email === 'ofek@test.local' && m.subject.includes('נרשם בדיקה')))
const tYes = links(testAsk.html).find((l) => l.includes('a=yes'))
r = await call(pathOf(tYes).split('?')[0], { method: 'POST', form: { a: 'yes' }, origin: null })
const tWelcome = await lastTo('itzik@test.local')
r = await call('/api/session', { method: 'POST', body: { token: new URL(links(tWelcome.html).find((l) => l.includes('/kehila/enter'))).searchParams.get('t') } })
check('the test goes all the way: approved, welcomed, signed in (here as a broker who is also staff)', r.status === 200 && r.data.member?.name === 'נרשם בדיקה' && r.data.staff?.name === 'איציק')
r = await call('/api/admin/test', { method: 'POST', token: staff, body: { name: 'מישהו', email: good.email } })
check('a test cannot take over a real broker\'s address', r.status === 409)
r = await call(`/api/admin/members/${yossi.id}`, { method: 'DELETE', token: staff })
check('a real request cannot be deleted', r.status === 400)
r = await call(`/api/admin/members/${testId}`, { method: 'DELETE', token: staff })
check('a test registrant can be deleted', r.status === 200 && !(await call('/api/admin/members', { token: staff })).data.members.some((m) => m.id === testId))

// ---------------------------------------------------------------- 9. the list of approvers, in one place
await freshRate()
r = await call('/api/admin/staff', { method: 'POST', token: staff, body: { name: 'רותי', email: 'ruti@test.local' } })
r = await call('/api/admin/staff', { token: staff })
check('an approver can be added from the screen', r.data.staff.some((x) => x.email === 'ruti@test.local' && x.approver))
await call('/api/register', { method: 'POST', body: { ...good, name: 'מיכל אור', email: 'michal@test.local' } })
check('... and the next request reaches the new approver too', !!(await lastTo('ruti@test.local'))?.subject.includes('מיכל אור'))
r = await call('/api/admin/staff?email=ruti@test.local', { method: 'DELETE', token: staff })
const rutiYes = links((await lastTo('ruti@test.local')).html).find((l) => l.includes('a=yes'))
r = await call(pathOf(rutiYes).split('?')[0], { method: 'POST', form: { a: 'yes' }, origin: null })
check('the buttons of an approver who was removed no longer work', r.status === 403 && r.text.includes('אין הרשאה'))
r = await call('/api/admin/staff?email=itzik@test.local', { method: 'DELETE', token: staff })
check('staff cannot remove themselves', r.status === 400)

// ---------------------------------------------------------------- 10. signing out, and a bad link
r = await call('/api/logout', { method: 'POST', token: danaSession })
check('signing out ends the session', (await call('/api/me', { token: danaSession })).status === 401)
r = await call('/d/' + 'x'.repeat(43) + '?a=yes', { origin: null })
check('a made-up link approves nothing', r.status === 404 && r.text.includes('הקישור לא תקין'))

// ---------------------------------------------------------------- 10b. links run out
await freshRate()
await call('/api/register', { method: 'POST', body: { ...good, name: 'נועם שחר', email: 'noam@test.local' } })
const lateAsk = await lastTo('ofek@test.local')
const lateYes = links(lateAsk.html).find((l) => l.includes('a=yes'))
check('the approval e-mail says how long its buttons work (72 hours, once)', lateAsk.html.includes('הכפתורים בתוקף ל-72 שעות, ופועלים פעם אחת'))
await call('/api/login', { method: 'POST', body: { email: 'itzik@test.local' } })
const lateLogin = new URL(links((await lastTo('itzik@test.local')).html).find((l) => l.includes('/kehila/enter'))).searchParams.get('t')
await call('/api/test/expire', { method: 'POST' })
r = await call(pathOf(lateYes).split('?')[0], { method: 'POST', form: { a: 'yes' }, origin: null })
check('after its time an approval button no longer approves: "הקישור פג", and the request still waits', r.status === 410 && r.text.includes('הקישור פג') && (await call('/api/admin/members', { token: staff })).data.members.find((m) => m.name === 'נועם שחר').status === 'pending')
r = await call('/api/session', { method: 'POST', body: { token: lateLogin } })
check('after its time a sign-in link no longer signs in', r.status === 400 && r.data.code === 'expired')
const noam = (await call('/api/admin/members', { token: staff })).data.members.find((m) => m.name === 'נועם שחר')
r = await call(`/api/admin/members/${noam.id}/approve`, { method: 'POST', token: staff })
check('a request whose buttons ran out can still be approved from the screen', r.status === 200)

// ---------------------------------------------------------------- 11. the brake
await freshRate()
let codes = []
for (let i = 0; i < 8; i++) codes.push((await call('/api/register', { method: 'POST', body: {} })).status)
check('more than 6 sign-up requests in an hour from one place are stopped', codes.slice(0, 6).every((c) => c === 400) && codes[6] === 429 && codes[7] === 429, codes.join())
await freshRate()
codes = []
for (let i = 0; i < 7; i++) codes.push((await call('/api/login', { method: 'POST', body: { email: 'someone@test.local' } })).status)
check('more than 5 sign-in requests in an hour for one address are stopped', codes.slice(0, 5).every((c) => c === 200) && codes[5] === 429, codes.join())
await freshRate()

// ---------------------------------------------------------------- 12. the approvers' screen: real numbers only
const stats = async (token = staff) => call('/api/admin/stats', { token })
r = await call('/api/admin/stats')
check('the numbers are closed to a visitor', r.status === 401)
const s0 = (await stats()).data
const michal = { name: 'שירה בן דוד', phone: '054-777-1234', email: 'shira@test.local', license: '1618033', work: 'office', office_name: 'רימקס מרכז', cities: ['חיפה'], areas: 'כרמל, נווה שאנן' }
await call('/api/register', { method: 'POST', body: michal })
let s1 = (await stats()).data
check('a new request counts as waiting and as a sign-up of today', s1.totals.pending === s0.totals.pending + 1 && s1.signups.today === s0.signups.today + 1 && s1.signups.daily.at(-1).n === s0.signups.daily.at(-1).n + 1 && s1.signups.daily.length === 30)
await call('/api/test/backdate', { method: 'POST', body: { email: michal.email, created_days_ago: 3 } })
s1 = (await stats()).data
check('a request from 3 days ago counts in the week and the month, not today, and sits on its day in the chart', s1.signups.today === s0.signups.today && s1.signups.week === s0.signups.week + 1 && s1.signups.month === s0.signups.month + 1 && s1.signups.daily.at(-4).n === s0.signups.daily.at(-4).n + 1)
const mid = (await call('/api/admin/members', { token: staff })).data.members.find((m) => m.email === michal.email)
check('the general list shows a masked phone only', mid.phone === '054-•••-••34' && !JSON.stringify((await call('/api/admin/members', { token: staff })).data).includes('777-1234'))
r = await call(`/api/admin/members/${mid.id}`, { token: staff })
check("a broker's own details carry the full phone", r.status === 200 && r.data.member.phone === '054-777-1234' && r.data.activity.signins === 0 && r.data.activity.last_at === null)
r = await call(`/api/admin/members/${mid.id}/approve`, { method: 'POST', token: staff })
await call('/api/test/backdate', { method: 'POST', body: { email: michal.email, created_days_ago: 3, decided_hours_after: 6 } })
let s2 = (await stats()).data
const dec = s2.decisions.find((x) => x.name === 'שירה בן דוד')
check('the decision is listed, with who decided and when', !!dec && dec.status === 'approved' && dec.decided_by === 'איציק' && dec.decided_at - dec.created_at === 6 * 3600_000 && s2.decisions.every((x, i) => i === 0 || s2.decisions[i - 1].decided_at >= x.decided_at))
check('the time to decide counts it', s2.decision_time.approved.n === s1.decision_time.approved.n + 1 && s2.decision_time.all.avg_ms > 0 && s2.approvers.some((a) => a.name === 'איציק' && a.approved >= 1))
check('approved, he is in the directory, never signed in yet', s2.totals.approved === s1.totals.approved + 1 && s2.activity.never === s1.activity.never + 1 && s2.directory.some((m) => m.name === 'שירה בן דוד' && m.last_seen === null && m.cities[0] === 'חיפה' && m.work === 'office'))
check('the directory carries no phone and no e-mail', !s2.directory.some((m) => 'phone' in m || 'email' in m) && !JSON.stringify(s2).includes('777-1234') && !JSON.stringify(s2).includes(michal.email))
check('the breakdown counts his city, his areas one by one, and his office', s2.breakdown.cities.some((c) => c.name === 'חיפה') && ['כרמל', 'נווה שאנן'].every((a) => s2.breakdown.areas.some((x) => x.name === a)) && s2.breakdown.work.office === s1.breakdown.work.office + 1 && s2.breakdown.offices.some((o) => o.name === 'רימקס מרכז'))
// he opens the community
const michalWelcome = await lastTo(michal.email)
r = await call('/api/session', { method: 'POST', body: { token: new URL(links(michalWelcome.html).find((l) => l.includes('/kehila/enter'))).searchParams.get('t') } })
const michalToken = r.data.token
await call('/api/me', { token: michalToken })
await call('/api/me', { token: michalToken })
let s3 = (await stats()).data
const me3 = s3.directory.find((m) => m.name === 'שירה בן דוד')
check('signing in and opening the community are kept: active today and this week, once, with his last visit', s3.activity.today === s2.activity.today + 1 && s3.activity.week === s2.activity.week + 1 && s3.activity.never === s2.activity.never - 1 && me3.last_seen > Date.now() - 60_000 && me3.signins === 1 && me3.days30 === 1)
await call('/api/test/backdate', { method: 'POST', body: { email: michal.email, visits_days_ago: [12] } })
s3 = (await stats()).data
check('a visit 12 days ago counts in the month and not in the week', s3.directory.find((m) => m.name === 'שירה בן דוד').days30 === 2 && s3.activity.week === s2.activity.week + 1 && s3.activity.month === s2.activity.month + 1)
r = await stats(michalToken)
check('a broker cannot read the numbers', r.status === 403)
r = await call(`/api/admin/members/${mid.id}`, { token: michalToken })
check("a broker cannot read anyone's details", r.status === 403)
// a test registrant is left out of every number
const before = (await stats()).data
await call('/api/admin/test', { method: 'POST', token: staff, body: { name: 'נרשם לספירה', email: 'count-test@test.local' } })
const after = (await stats()).data
check('a test registrant is left out of the numbers', after.totals.all === before.totals.all && after.totals.pending === before.totals.pending && after.tests === before.tests + 1 && after.signups.today === before.signups.today)

const failed = results.filter((x) => !x).length
console.log(`\n${results.length - failed} passed, ${failed} failed`)
console.log(failed ? 'SOME CHECKS FAILED' : 'ALL CHECKS PASSED')
process.exit(failed ? 1 : 0)
