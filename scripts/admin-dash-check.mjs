// The approvers' screen as a dashboard, against the LOCAL test server (server/, TEST_MODE=1) and the local site.
// It fills the local test database with known requests (spread over 30 days, approved by אופק and by אריאל through
// the buttons of their e-mails, one rejected, two waiting, visits on known days), then checks that every number on
// the screen is the server's number, that the general lists carry no full phone, that a broker's details do, that
// the search works, the "coming" area has no numbers, and that it all fits a phone. Saves screenshots.
// Usage: node scripts/admin-dash-check.mjs [outDir]     (it WIPES the local test database first; never the real one)
import puppeteer from 'puppeteer-core'
import { mkdirSync } from 'node:fs'

const API = process.env.API ?? 'http://localhost:8787'
const ORIGIN = 'http://localhost:5240'
const green = process.env.BASE_GREEN ?? 'http://localhost:5240/NADLANIL-DEMO/green'
if (!/^http:\/\/(localhost|127\.0\.0\.1)/.test(API)) throw new Error('local test server only')
const out = process.argv[2] ?? '_shots/admin-dash'
mkdirSync(out, { recursive: true })
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
const results = []
const check = (name, ok, detail = '') => {
  const line = `${ok ? 'PASS' : 'FAIL'}  ${name}${detail && !ok ? '  [' + detail + ']' : ''}`
  results.push(line)
  console.log(line)
}
const api = async (path, { method = 'GET', body, token, form } = {}) => {
  const headers = { origin: ORIGIN, ...(token ? { authorization: `Bearer ${token}` } : {}), ...(body ? { 'content-type': 'application/json' } : {}) }
  const res = await fetch(API + path, { method, headers, body: form ? new URLSearchParams(form) : body ? JSON.stringify(body) : undefined, redirect: 'manual' })
  const text = await res.text()
  try {
    return { status: res.status, data: JSON.parse(text), text }
  } catch {
    return { status: res.status, data: null, text }
  }
}
const outbox = async () => (await api('/api/test/outbox')).data.outbox
const lastTo = async (email, has = '') => (await outbox()).filter((m) => m.to_email === email && m.subject.includes(has)).at(-1)
const links = (html) => [...html.matchAll(/href="([^"]+)"/g)].map((m) => m[1].replace(/&amp;/g, '&'))
const tokenOf = (html) => new URL(links(html).find((l) => l.includes('/kehila/enter'))).searchParams.get('t')

// ---------------------------------------------------------------- the known data
await api('/api/test/outbox', { method: 'DELETE' })
const people = [
  // name, email, work, office, cities, areas, created days ago, decision: [by, yes/no, hours after], visits days ago
  ['רונית לוי', 'ronit', 'office', 'אנגלו סכסון השרון', ['רעננה', 'כפר סבא'], 'מרכז רעננה, הירוקה', 27, ['ofek', 'yes', 5], [0, 1, 3, 9]],
  ['אבי כהן', 'avi', 'solo', '', ['תל אביב'], 'הצפון הישן, לב העיר', 20, ['ariel', 'yes', 26], [0, 6]],
  ['מירב שושן', 'merav', 'office', 'רימקס עוצמה', ['חיפה'], 'כרמל, נווה שאנן', 12, ['ofek', 'yes', 2], [2]],
  ['יוסי ביטון', 'yossi', 'solo', '', ['באר שבע'], 'רמות, נווה זאב', 8, ['ariel', 'yes', 50], []],
  ['שני מזרחי', 'shani', 'solo', '', ['תל אביב', 'רמת גן'], 'לב העיר, הבורסה', 5, ['ofek', 'yes', 1], [0]],
  ['דוד פרץ', 'david', 'office', 'אנגלו סכסון השרון', ['נתניה'], 'עיר ימים, פולג', 3, ['ariel', 'no', 4], []],
  ['טל אורן', 'tal', 'solo', '', ['ירושלים'], 'רחביה, בקעה', 1, null, []],
  ['נועה גבאי', 'noa', 'office', 'קלר וויליאמס', ['ראשון לציון'], 'נחלת יהודה', 0, null, []],
]
await api('/api/test/rate', { method: 'DELETE' })
for (const [name, mail, work, office, cities, areas] of people) {
  await api('/api/test/rate', { method: 'DELETE' }) // the brake allows 6 sign-ups an hour from one place
  const r = await api('/api/register', { method: 'POST', body: { name, phone: '052-555-01' + String(10 + people.findIndex((p) => p[1] === mail)), email: `${mail}@test.local`, license: '2718281', work, office_name: office, cities, areas } })
  if (r.status !== 200) throw new Error('could not register ' + mail + ' ' + r.text)
}
for (const [name, mail, , , , , ago, decision, visits] of people) {
  const email = `${mail}@test.local`
  await api('/api/test/backdate', { method: 'POST', body: { email, created_days_ago: ago, created_minutes_ago: 30 } })
  if (decision) {
    const [who, yes] = decision
    const ask = await lastTo(`${who}@test.local`, name)
    const link = links(ask.html).find((l) => l.includes(yes === 'yes' ? 'a=yes' : 'a=no'))
    const r = await api(link.replace(API, '').split('?')[0], { method: 'POST', form: yes === 'yes' ? { a: 'yes' } : { a: 'no', reason: 'לא הצלחנו לאמת את מספר הרישיון.' } })
    if (r.status !== 200) throw new Error('decision failed ' + mail)
    await api('/api/test/backdate', { method: 'POST', body: { email, created_days_ago: ago, created_minutes_ago: 30, decided_hours_after: decision[2], visits_days_ago: visits } })
  }
}
// two brokers really sign in with their welcome link, and open the community
for (const mail of ['ronit', 'shani']) {
  const w = await lastTo(`${mail}@test.local`, 'ברוכים הבאים')
  const s = await api('/api/session', { method: 'POST', body: { token: tokenOf(w.html) } })
  await api('/api/me', { token: s.data.token })
}
// a test registrant, which no number may count
await api('/api/login', { method: 'POST', body: { email: 'itzik@test.local' } })
const staffToken = (await api('/api/session', { method: 'POST', body: { token: tokenOf((await lastTo('itzik@test.local')).html) } })).data.token
await api('/api/admin/test', { method: 'POST', token: staffToken, body: { name: 'נרשם בדיקה', email: 'itest@test.local' } })
const S = (await api('/api/admin/stats', { token: staffToken })).data
check('the known data: 5 approved, 2 waiting, 1 rejected, the test registrant left out', S.totals.approved === 5 && S.totals.pending === 2 && S.totals.rejected === 1 && S.tests === 1, JSON.stringify(S.totals))
check('server: sign-ups today 1, in 7 days 4, in 30 days 8', S.signups.today === 1 && S.signups.week === 4 && S.signups.month === 8, JSON.stringify([S.signups.today, S.signups.week, S.signups.month]))
check('server: active today 3 (two signed in now, one visit kept for today), in the week 4', S.activity.today === 3 && S.activity.week === 4 && S.activity.never === 1, JSON.stringify(S.activity))
check('server: אופק approved 3, אריאל approved 2 and rejected 1', S.approvers.some((a) => a.name === 'אופק' && a.approved === 3 && a.rejected === 0) && S.approvers.some((a) => a.name === 'אריאל' && a.approved === 2 && a.rejected === 1), JSON.stringify(S.approvers))
const avgH = ((5 + 26 + 2 + 50 + 1 + 4) / 6).toFixed(1)
check(`server: the average time to a decision is ${avgH} hours`, Math.abs(S.decision_time.all.avg_ms / 3600_000 - Number(avgH)) < 0.05, String(S.decision_time.all.avg_ms / 3600_000))

// ---------------------------------------------------------------- the screen
const browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--hide-scrollbars'] })
const signIn = async (vp) => {
  const ctx = await browser.createBrowserContext()
  const page = await ctx.newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push(String(e)))
  await page.setViewport(vp)
  await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }])
  await page.goto(green + '/', { waitUntil: 'load' })
  await page.evaluate(() => localStorage.setItem('nadlanup-mode-v1', JSON.stringify({ mode: 'day', until: Date.now() + 9e9 })))
  await api('/api/login', { method: 'POST', body: { email: 'itzik@test.local' } })
  await page.goto(links((await lastTo('itzik@test.local')).html).find((l) => l.includes('/kehila/enter')), { waitUntil: 'load' })
  await page.waitForFunction(() => location.pathname.endsWith('/kehila/admin'), { timeout: 20000 })
  await page.waitForSelector('.dk-kpi[data-kpi]', { timeout: 15000 })
  await wait(800)
  return { ctx, page, errors }
}
const textOf = (page) => page.evaluate(() => document.body.innerText)
const VIEWS = ['overview', 'requests', 'people', 'breakdown', 'tools']
const view = async (page, v) => {
  await page.evaluate((x) => document.querySelector(`[data-view="${x}"]`).click(), v)
  await page.waitForFunction((x) => document.querySelector('[data-view-shown]')?.dataset.viewShown === x, { timeout: 5000 }, v)
  await wait(500)
}
const shotAt = async (page, v, name) => {
  await view(page, v)
  await page.screenshot({ path: `${out}/${name}.png` })
}
const shown = (page) =>
  page.evaluate(() => ({
    kpis: !!document.querySelector('.dk-kpi[data-kpi]'),
    pending: !!document.querySelector('[data-card="pending"]'),
    chart: !!document.querySelector('[data-card="signups"]'),
    requests: !!document.querySelector('.ad-tabs'),
    decisions: !!document.querySelector('[data-card="decisions"]'),
    visits: !!document.querySelector('[data-card="visits"]'),
    directory: !!document.querySelector('[data-card="directory"]'),
    breakdown: !!document.querySelector('[data-card="breakdown"]'),
    engagement: !!document.querySelector('[data-card="engagement"]'),
    test: !!document.querySelector('[data-box="test"]'),
    staff: !!document.querySelector('[data-box="staff"]'),
    mail: !!document.querySelector('[data-box="mail"]'),
    height: document.documentElement.scrollHeight,
  }))

for (const dev of [{ name: 'desktop', vp: { width: 1440, height: 900 } }, { name: 'phone', vp: { width: 390, height: 844, isMobile: true, hasTouch: true } }]) {
  const d = dev.name
  const { ctx, page, errors } = await signIn(dev.vp)
  // the tabs: the overview first, each tab shows only its own part
  const tabs = await page.evaluate(() => ({ list: [...document.querySelectorAll('[role="tablist"].an-tabs [data-view]')].map((b) => (b.querySelector('.an-long') ?? b).textContent.replace(/\d+/g, '').trim()), on: document.querySelector('.an-tabs [aria-selected="true"]')?.dataset.view, badge: document.querySelector('[data-view="requests"] b')?.textContent }))
  check(`${d} six tabs (with "לידים נכנסים", 24.11.2026), the overview open, the waiting count on "בקשות"`, tabs.list.join('|') === 'סקירה|בקשות|לידים נכנסים|מתווכים|פילוח|צוות וכלים' && tabs.on === 'overview' && tabs.badge === '3', JSON.stringify(tabs))
  let sh = await shown(page)
  check(`${d} the overview: the cards, the waiting requests and the chart, and none of the other parts`, sh.kpis && sh.pending && sh.chart && !sh.requests && !sh.directory && !sh.breakdown && !sh.engagement && !sh.test && !sh.staff && !sh.mail, JSON.stringify(sh))
  const pend = await page.evaluate(() => ({
    n: document.querySelector('[data-card="pending"] .dk-pend-num')?.textContent,
    rows: [...document.querySelectorAll('[data-card="pending"] [data-pending]')].map((li) => ({ name: li.querySelector('b').textContent, yes: !!li.querySelector('[data-act="approve"]'), no: !!li.querySelector('[data-act="reject"]') })),
  }))
  check(`${d} the waiting requests stand out on the overview: the number, and a yes and a no for each`, pend.n === '3' && pend.rows.length === 3 && pend.rows.every((r) => r.yes && r.no) && pend.rows.some((r) => r.name.startsWith('טל אורן')), JSON.stringify(pend))
  const kp = await page.evaluate(() => Object.fromEntries([...document.querySelectorAll('.dk-kpi[data-kpi]')].map((k) => [k.dataset.kpi, Number(k.querySelector('.dk-kpi-num').textContent)])))
  check(`${d} the summary cards are the server's numbers`, kp.approved === 5 && kp.pending === 2 && kp.rejected === 1 && kp.active === 4, JSON.stringify(kp))
  const ch = await page.evaluate(() => ({
    bars: document.querySelectorAll('.dk-chart g[data-day]').length,
    sum: [...document.querySelectorAll('.dk-chart g[data-day]')].reduce((s, g) => s + Number(g.dataset.n), 0),
    today: document.querySelector('.dk-chart g[data-day]:last-of-type')?.dataset.n,
    trio: [...document.querySelectorAll('[data-card="signups"] .dk-trio b')].map((b) => b.textContent).join(','),
    avg: document.querySelector('[data-avg="all"]')?.textContent,
  }))
  check(`${d} the chart has 30 days, the bars add up to the month, today is last`, ch.bars === 30 && ch.sum === 8 && ch.today === '1' && ch.trio === '1,4,8', JSON.stringify(ch))
  check(`${d} the average time to a decision is shown, rounded (14.7 hours shows as 15)`, ch.avg === '15 שעות', ch.avg)
  await page.screenshot({ path: `${out}/${d}-1-overview.png` })
  const t = await textOf(page)
  check(`${d} who decided: אופק and אריאל with their counts`, t.includes('אופק') && t.includes('אריאל'))
  let phones = t
  for (const v of VIEWS.slice(1)) {
    await view(page, v)
    phones += await textOf(page)
  }
  await view(page, 'overview')
  check(`${d} no full phone in any tab`, !/052-555-01\d\d/.test(phones) && phones.includes('052-•••-••'))
  await shotAt(page, 'requests', `${d}-2-requests`)
  sh = await shown(page)
  check(`${d} the requests tab: the requests and who decided, nothing else`, sh.requests && sh.decisions && !sh.kpis && !sh.directory && !sh.test, JSON.stringify(sh))
  check(`${d} ... with the 6 decisions`, (await page.evaluate(() => document.querySelectorAll('[data-card="decisions"] .dk-feed li').length)) === 6)
  await shotAt(page, 'people', `${d}-3-people`)
  sh = await shown(page)
  check(`${d} the brokers tab: visits and the list of brokers, nothing else`, sh.visits && sh.directory && !sh.requests && !sh.kpis && !sh.breakdown, JSON.stringify(sh))
  const vis = await page.evaluate(() => [...document.querySelectorAll('[data-card="visits"] .dk-feed b')].map((b) => b.textContent))
  check(`${d} visits: who came in, latest first`, vis.length === 4 && vis.includes('רונית לוי') && vis.includes('שני מזרחי') && !vis.includes('יוסי ביטון'), vis.join(','))

  // the brokers, with a search
  await page.evaluate(() => document.querySelector('[data-card="directory"]').scrollIntoView({ block: 'start' }))
  await page.evaluate(() => window.scrollBy(0, -80))
  await wait(300)
  await page.screenshot({ path: `${out}/${d}-4-brokers.png` })
  const rows = await page.evaluate(() => [...document.querySelectorAll('[data-row="member"]')].map((r) => r.innerText.replace(/\s+/g, ' ')))
  check(`${d} the list of brokers: the 5 approved, with city, joining date, last visit and office or not`, rows.length === 5 && rows.some((r) => r.includes('יוסי ביטון') && r.includes('באר שבע') && r.includes('עוד לא נכנס') && r.includes('עצמאי')) && rows.some((r) => r.includes('מירב שושן') && r.includes('רימקס עוצמה')), rows.join(' | '))
  await page.type('[data-f="dir-search"]', 'חיפה')
  await wait(300)
  let found = await page.evaluate(() => [...document.querySelectorAll('[data-row="member"]')].map((r) => r.querySelector('.dk-name b').textContent))
  check(`${d} searching "חיפה" finds the broker of Haifa only`, found.length === 1 && found[0] === 'מירב שושן', found.join(','))
  await page.evaluate(() => {
    const i = document.querySelector('[data-f="dir-search"]')
    i.focus()
    i.select()
  })
  await page.keyboard.press('Backspace')
  await page.type('[data-f="dir-search"]', 'אין כזה')
  await wait(300)
  check(`${d} a search with no match says so`, await page.evaluate(() => !!document.querySelector('[data-state="no-match"]')))
  await page.evaluate(() => {
    const i = document.querySelector('[data-f="dir-search"]')
    i.focus()
    i.select()
  })
  await page.keyboard.press('Backspace')
  await wait(300)

  // a broker's details: the full phone is here
  await page.evaluate(() => [...document.querySelectorAll('[data-row="member"]')].find((r) => r.textContent.includes('שני מזרחי')).click())
  await page.waitForSelector('[data-state="details"]', { timeout: 10000 })
  await wait(400)
  const det = await page.evaluate(() => document.querySelector('[data-state="details"]').innerText.replace(/\s+/g, ' '))
  check(`${d} a broker's details carry the full phone, the licence, who approved and his visits`, /052-555-01\d\d/.test(det) && det.includes('2718281') && det.includes('על ידי אופק') && det.includes('היום') && det.includes('כניסות עם קישור'), det.slice(0, 200))
  await page.screenshot({ path: `${out}/${d}-5-details.png` })
  await page.keyboard.press('Escape')
  await wait(400)

  await shotAt(page, 'breakdown', `${d}-6-breakdown`)
  sh = await shown(page)
  check(`${d} the breakdown tab: the breakdown and the engagement area, nothing else`, sh.breakdown && sh.engagement && !sh.directory && !sh.kpis && !sh.test, JSON.stringify(sh))
  const br = await page.evaluate(() => ({
    office: document.querySelector('[data-work="office"] b')?.textContent,
    solo: document.querySelector('[data-work="solo"] b')?.textContent,
    cities: [...document.querySelectorAll('[data-card="breakdown"] .dk-bars li .dk-bars-name')].map((x) => x.textContent),
    areas: [...document.querySelectorAll('.dk-chips li')].map((x) => x.textContent),
  }))
  check(`${d} breakdown: 2 in an office, 3 on their own; cities and areas of the approved only`, br.office === '2' && br.solo === '3' && br.cities.includes('תל אביב') && br.cities.includes('חיפה') && !br.cities.includes('נתניה') && br.areas.some((a) => a.startsWith('לב העיר') && a.endsWith('2')), JSON.stringify(br))

  await page.evaluate(() => document.querySelector('[data-card="engagement"]').scrollIntoView({ block: 'start' }))
  await page.evaluate(() => window.scrollBy(0, -80))
  await wait(300)
  await page.screenshot({ path: `${out}/${d}-7-engagement.png` })
  const soon = await page.evaluate(() => ({ badge: document.querySelector('.dk-badge')?.textContent, tiles: [...document.querySelectorAll('[data-soon]')].map((x) => x.innerText.replace(/\s+/g, ' ')) }))
  check(`${d} engagement: marked "יופעל אחרי הפיד המשותף", 5 parts, no numbers, "אין נתונים עדיין"`, soon.badge === 'יופעל אחרי הפיד המשותף' && soon.tiles.length === 5 && soon.tiles.every((x) => x.includes('אין נתונים עדיין') && !/\d/.test(x)), JSON.stringify(soon))

  await shotAt(page, 'tools', `${d}-9-tools`)
  sh = await shown(page)
  check(`${d} the tools tab: test registrant, latest e-mails and the approvers, nothing else`, sh.test && sh.mail && sh.staff && !sh.kpis && !sh.pending && !sh.requests, JSON.stringify(sh))
  // a tab is kept in the address
  await page.reload({ waitUntil: 'load' })
  await page.waitForSelector('[data-view-shown]', { timeout: 15000 })
  check(`${d} a reload keeps the open tab`, (await page.evaluate(() => document.querySelector('[data-view-shown]').dataset.viewShown)) === 'tools' && (await page.evaluate(() => location.hash)) === '#tools')
  let wide = 0
  for (const v of VIEWS) {
    await view(page, v)
    wide = Math.max(wide, await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth))
  }
  check(`${d} nothing scrolls sideways in any tab`, wide <= 1, `${wide}px`)
  if (d === 'phone') {
    // since 18.11.2026 the tabs are a bar at the bottom of a phone's screen: all five seen, nothing slides sideways
    const strip = await page.evaluate(() => {
      const n = document.querySelector('.an-tabs')
      const r = n.getBoundingClientRect()
      return { scrolls: n.scrollWidth > n.clientWidth + 1, pos: getComputedStyle(n).position, bottom: Math.round(innerHeight - r.bottom), all: [...n.querySelectorAll('[data-view]')].every((b) => b.getBoundingClientRect().width > 40) }
    })
    check('phone: the tabs are a bar at the bottom, all five seen, none slides sideways', !strip.scrolls && strip.pos === 'fixed' && strip.bottom === 0 && strip.all, JSON.stringify(strip))
  }
  // a yes from the overview approves, and the number goes down
  await view(page, 'overview')
  if (d === 'phone') {
    await page.evaluate(() => [...document.querySelectorAll('[data-pending]')].find((li) => li.textContent.includes('טל אורן')).querySelector('[data-act="approve"]').click())
    await page.waitForFunction(() => document.querySelector('.ad-note')?.textContent.includes('טל אורן אושר'), { timeout: 15000 })
    await wait(800)
    const after = await page.evaluate(() => ({ n: document.querySelector('.dk-pend-num')?.textContent, badge: document.querySelector('[data-view="requests"] b')?.textContent, kpi: document.querySelector('[data-kpi="approved"] .dk-kpi-num')?.textContent }))
    check('phone: "כן, לאשר" on the overview approves: the waiting number, the tab badge and the approved card all move', after.n === '2' && after.badge === '2' && after.kpi === '6', JSON.stringify(after))
  }
  // night
  await page.evaluate(() => localStorage.setItem('nadlanup-mode-v1', JSON.stringify({ mode: 'night', until: Date.now() + 9e9 })))
  await page.reload({ waitUntil: 'load' })
  await page.waitForSelector('.dk-kpi[data-kpi]', { timeout: 15000 })
  await wait(700)
  await page.screenshot({ path: `${out}/${d}-8-night.png` })
  check(`${d} no page errors`, errors.length === 0, errors.slice(0, 2).join(' | '))
  await ctx.close()
}

// no waiting requests: the overview says so, and the tab has no badge
{
  for (const m of (await api('/api/admin/members', { token: staffToken })).data.members.filter((x) => x.status === 'pending')) {
    if (m.is_test) await api(`/api/admin/members/${m.id}`, { method: 'DELETE', token: staffToken })
    else await api(`/api/admin/members/${m.id}/reject`, { method: 'POST', token: staffToken, body: { reason: 'בדיקה של מסך בלי ממתינות.' } })
  }
  const { ctx, page } = await signIn({ width: 1440, height: 900 })
  await view(page, 'overview')
  const none = await page.evaluate(() => ({ text: document.querySelector('[data-state="no-pending"]')?.textContent.trim(), badge: !!document.querySelector('[data-view="requests"] b') }))
  check('with nothing waiting the overview says "אין בקשות שממתינות לאישור", and "בקשות" has no badge', none.text === 'אין בקשות שממתינות לאישור' && !none.badge, JSON.stringify(none))
  await page.screenshot({ path: `${out}/desktop-10-none-waiting.png` })
  await ctx.close()
}

// a broker who is not staff sees the closed door
{
  const ctx = await browser.createBrowserContext()
  const page = await ctx.newPage()
  await page.goto(green + '/', { waitUntil: 'load' })
  await api('/api/login', { method: 'POST', body: { email: 'avi@test.local' } })
  await page.goto(links((await lastTo('avi@test.local', 'קוד הכניסה')).html).find((l) => l.includes('/kehila/enter')), { waitUntil: 'load' })
  await wait(2500)
  await page.goto(green + '/kehila/admin', { waitUntil: 'load' })
  await wait(1200)
  const st = await page.evaluate(() => ({ state: document.querySelector('[data-state]')?.dataset.state, kpis: document.querySelectorAll('.dk-kpi').length }))
  check('a signed-in broker who is not staff gets the closed door, and no numbers', st.state === 'admin-locked' && st.kpis === 0, JSON.stringify(st))
  const r = await api('/api/admin/stats', { token: (await page.evaluate(() => JSON.parse(localStorage.getItem('nadlanup-session-v1') || '{}').token)) })
  check('... and the server refuses him the numbers too', r.status === 403)
  await ctx.close()
}

const fails = results.filter((r) => r.startsWith('FAIL')).length
console.log(`\n${results.length - fails} passed, ${fails} failed`)
console.log(fails ? 'SOME CHECKS FAILED' : 'ALL CHECKS PASSED')
await Promise.race([browser.close().catch(() => {}), wait(4000)])
process.exit(0)
