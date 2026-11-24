// The leads form of the office page and "לידים נכנסים" in the admin (24.11.2026), on the LOCAL test server only.
//  1. the server keeps a lead, refuses a short one with clear words, quietly drops a robot, brakes after 5 an hour,
//     and refuses a foreign site
//  2. the e-mail of a lead: in test mode only to the staff marked test_inbox (itzik), never to אריאל or אופק, even
//     though they are marked gets_leads; no e-mail address is written in the server's code
//  3. the list is for staff only: nobody signed in gets 401, a broker gets 403; the statuses move
//  4. the office page: no price left, the button, the sheet, the network's text word for word, a kept place for
//     "מילון מונחים", and the fee always as "0% עמלה למשרד, 100% עמלה למתווך"
//  5. the admin: the tab, the card with date, name, phone, city and note, the status buttons, the filter
//  6. a lead's name and phone are on no public page
//  7. the home page's map names נתניה, טבריה and אשדוד, with no label on top of another
// Usage: node scripts/leads-check.mjs [outDir]      ONLY=phone or ONLY=desktop for one of the two
import puppeteer from 'puppeteer-core'
import { mkdirSync, readFileSync, readdirSync } from 'node:fs'

const API = process.env.API ?? 'http://localhost:8787'
const ORIGIN = 'http://localhost:5240'
const green = process.env.BASE_GREEN ?? 'http://localhost:5240/NADLANIL-DEMO/green'
if (!/^http:\/\/(localhost|127\.0\.0\.1)/.test(API)) throw new Error('local test server only')
const out = process.argv[2] ?? '_shots/leads'
mkdirSync(out, { recursive: true })
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
const results = []
const check = (name, ok, detail = '') => {
  const line = `${ok ? 'PASS' : 'FAIL'}  ${name}${detail && !ok ? '  [' + (typeof detail === 'string' ? detail : JSON.stringify(detail)) + ']' : ''}`
  results.push(line)
  console.log(line)
}
const api = async (path, { method = 'GET', body, token, origin = ORIGIN } = {}) => {
  const headers = { ...(origin ? { origin } : {}), ...(token ? { authorization: `Bearer ${token}` } : {}), ...(body ? { 'content-type': 'application/json' } : {}) }
  const res = await fetch(API + path, { method, headers, body: body ? JSON.stringify(body) : undefined })
  const text = await res.text()
  try {
    return { status: res.status, data: JSON.parse(text) }
  } catch {
    return { status: res.status, data: null }
  }
}
const outbox = async () => (await api('/api/test/outbox')).data.outbox
const lastTo = async (email, has = '') => (await outbox()).filter((m) => m.to_email === email && m.subject.includes(has)).at(-1)
const links = (html) => [...html.matchAll(/href="([^"]+)"/g)].map((m) => m[1].replace(/&amp;/g, '&'))
const tokenOf = (html) => new URL(links(html).find((l) => l.includes('/kehila/enter'))).searchParams.get('t')
const FEE = '0% עמלה למשרד, 100% עמלה למתווך'
const ABOUT = [
  'NADLANUP | רשת תיווך נדל"ן ארצית',
  'NADLANUP היא רשת תיווך נדל"ן ארצית הפועלת באמצעות סוכני נדל"ן בעלי רישיון תיווך בתוקף, המצטרפים למשרד במסגרת הסכם התקשרות והשתייכות מקצועית.',
  'הרשת מעניקה לסוכניה מעטפת מקצועית ועסקית הכוללת מערכות טכנולוגיות, הכשרות, קהילה מקצועית, תמיכה שוטפת, שירותי שיווק ופרסום משרדיים וכלים לפיתוח פעילות התיווך.',
  'סוכני הרשת פועלים במסגרת נהלי המשרד, תוך שמירה על עצמאותם העסקית בהתאם להסכם ההתקשרות, להוראות הדין ולהסדרי המשרד עם ספקיו.',
  'שירותי הפרסום הניתנים לסוכני המשרד מופעלים במסגרת פעילות המשרד, בכפוף לתנאי ההתקשרות עם ספקי הפרסום ולאישורים הנדרשים מהם.',
]

// ---------------------------------------------------------------- staff, and who gets what
await api('/api/test/rate', { method: 'DELETE' })
await api('/api/test/outbox', { method: 'DELETE' })
await api('/api/login', { method: 'POST', body: { email: 'itzik@test.local' } })
const staffToken = (await api('/api/session', { method: 'POST', body: { token: tokenOf((await lastTo('itzik@test.local')).html) } })).data.token
const team = (await api('/api/admin/staff', { token: staffToken })).data.staff
const byMail = (m) => team.find((s) => s.email === m)
// אריאל and אופק get the leads for real; only itzik is the inbox of a test
for (const [email, flags] of [
  ['itzik@test.local', { test_inbox: true, gets_leads: false }],
  ['ariel@test.local', { gets_leads: true, test_inbox: false }],
  ['ofek@test.local', { gets_leads: true, test_inbox: false }],
]) {
  const s = byMail(email)
  if (s) await api('/api/admin/staff', { method: 'POST', token: staffToken, body: { name: s.name, email, approver: s.approver, ...flags } })
}
const team2 = (await api('/api/admin/staff', { token: staffToken })).data.staff
check('the staff table: itzik is the test inbox; אריאל and אופק get leads; the flags kept on the approver row', team2.find((s) => s.email === 'itzik@test.local')?.test_inbox && team2.filter((s) => s.gets_leads).length >= 2 && team2.every((s) => s.email === 'itzik@test.local' || !s.test_inbox), team2)

// ---------------------------------------------------------------- 1-2: the server
const stamp = Date.now().toString(36).slice(-5)
const LEAD = { name: `ליאת בדיקה ${stamp}`, phone: '054-555-0123', city: 'טבריה', note: 'אפשר להתקשר אחרי חמש' }
let r = await api('/api/leads', { method: 'POST', body: LEAD })
check('a lead with name, phone, city and note is kept', r.status === 200 && r.data.ok, r)
const box = (await outbox()).filter((m) => !m.subject.includes('קוד הכניסה') && !m.subject.includes('קישור הכניסה'))
const leadMails = box.filter((m) => m.subject.includes(LEAD.name))
check('the e-mail of the lead went to itzik (the test inbox) only', leadMails.length === 1 && leadMails[0].to_email === 'itzik@test.local', leadMails.map((m) => m.to_email))
check('no e-mail of the lead to אריאל or to אופק while testing', !box.some((m) => /ariel|ofek/.test(m.to_email)), box.map((m) => m.to_email))
check('the e-mail says it is a test, and carries the name, phone, city, note and a link to the leads tab', leadMails[0]?.subject.startsWith('(בדיקה)') && ['054-555-0123', 'טבריה', 'אפשר להתקשר אחרי חמש', '/kehila/admin#leads'].every((x) => leadMails[0].html.includes(x)), leadMails[0]?.subject)
const code = readdirSync('server/src').map((f) => readFileSync(`server/src/${f}`, 'utf8')).join('\n')
const addrs = [...code.matchAll(/[\w.+-]+@[\w-]+\.[\w.]+/g)].map((m) => m[0]).filter((a) => !/^(noreply|example)@/.test(a))
check('no e-mail address is written in the server\'s code (they come from the staff table)', addrs.length === 0, addrs)

r = await api('/api/leads', { method: 'POST', body: { name: 'א', phone: '123', city: '' } })
check('a short lead is refused, field by field, in plain words', r.status === 400 && r.data.fields?.name && r.data.fields?.phone && r.data.fields?.city, r.data)
const before = (await api('/api/admin/leads', { token: staffToken })).data.leads.length
r = await api('/api/leads', { method: 'POST', body: { ...LEAD, name: 'רובוט', website: 'http://spam.example' } })
const after = (await api('/api/admin/leads', { token: staffToken })).data.leads.length
check('a robot that fills the hidden field gets a quiet yes, and nothing is kept', r.status === 200 && after === before, [before, after])
r = await api('/api/leads', { method: 'POST', body: LEAD, origin: 'https://evil.example' })
check('a lead from a foreign site is refused (403)', r.status === 403, r.status)
await api('/api/test/rate', { method: 'DELETE' })
const codes = []
for (let i = 0; i < 6; i++) codes.push((await api('/api/leads', { method: 'POST', body: { ...LEAD, name: `ליד בלם ${i} ${stamp}` } })).status)
check('the brake: 5 leads an hour from one place, the sixth is asked to wait (429)', codes.slice(0, 5).every((c) => c === 200) && codes[5] === 429, codes)
await api('/api/test/rate', { method: 'DELETE' })

// ---------------------------------------------------------------- 3: staff only, and the statuses
r = await api('/api/admin/leads')
check('the list without signing in: 401', r.status === 401, r.status)
// a broker who is not staff: asks to join, is approved, and signs in with the welcome link
const brokerMail = `lead-broker-${stamp}@test.local`
await api('/api/register', { method: 'POST', body: { name: 'מתווך לא מהצוות', phone: '052-555-0166', email: brokerMail, license: '2718281', work: 'solo', office_name: '', cities: ['חיפה'], areas: '' } })
const brokerRow = (await api('/api/admin/members', { token: staffToken })).data.members.find((m) => m.email === brokerMail)
await api(`/api/admin/members/${brokerRow.id}/approve`, { method: 'POST', token: staffToken })
const brokerSession = (await api('/api/session', { method: 'POST', body: { token: tokenOf((await lastTo(brokerMail, 'ברוכים הבאים')).html) } })).data
const brokerToken = brokerSession && !brokerSession.staff ? brokerSession.token : null
if (brokerToken) {
  r = await api('/api/admin/leads', { token: brokerToken })
  check('the list for a signed-in broker who is not staff: 403', r.status === 403, r.status)
} else console.log('SKIP  no approved broker who is not staff on the local server, to try the 403')
const list = (await api('/api/admin/leads', { token: staffToken })).data
const mine = list.leads.find((l) => l.name === LEAD.name)
check('staff see the lead: name, full phone, city, note, status new, newest first', mine && mine.phone === LEAD.phone && mine.city === 'טבריה' && mine.note === LEAD.note && mine.status === 'new' && list.leads[0].created_at >= list.leads.at(-1).created_at, mine)
check('the list says the e-mails are in test mode', list.live === false)
r = await api(`/api/admin/leads/${mine.id}/status`, { method: 'POST', token: staffToken, body: { status: 'working' } })
let now = (await api('/api/admin/leads', { token: staffToken })).data.leads.find((l) => l.id === mine.id)
check('status to בטיפול: kept, with who and when', r.status === 200 && now.status === 'working' && now.updated_by && now.updated_at, now)
r = await api(`/api/admin/leads/${mine.id}/status`, { method: 'POST', token: staffToken, body: { status: 'gone' } })
check('an unknown status is refused (400)', r.status === 400, r.status)
r = await api('/api/admin/leads/0123456789abcdef/status', { method: 'POST', token: staffToken, body: { status: 'closed' } })
check('a lead that does not exist: 404', r.status === 404, r.status)
await api(`/api/admin/leads/${mine.id}/status`, { method: 'POST', token: staffToken, body: { status: 'new' } })

// ---------------------------------------------------------------- 4-7: the screens
const browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--hide-scrollbars'] })
const devices = [
  ['desktop', { width: 1280, height: 860 }],
  ['phone', { width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }],
].filter(([t]) => !process.env.ONLY || process.env.ONLY === t)
const overflow = (page) => page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)

for (const [t, vp] of devices) {
  await api('/api/test/rate', { method: 'DELETE' })
  const ctx = await browser.createBrowserContext()
  const page = await ctx.newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push(String(e)))
  await page.setViewport(vp)
  await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }])
  await page.goto(green + '/about', { waitUntil: 'load' })
  await page.evaluate(() => localStorage.setItem('nadlanup-mode-v1', JSON.stringify({ mode: 'day', until: Date.now() + 9e9 })))

  // 7: the map of the home page
  await page.goto(green + '/', { waitUntil: 'load' })
  await page.waitForSelector('.hg-node em', { timeout: 15000 })
  await wait(1200)
  const map = await page.evaluate(() => {
    const r = [...document.querySelectorAll('.hg-node em')].map((e) => ({ t: e.textContent, b: e.getBoundingClientRect() }))
    const hit = []
    for (let i = 0; i < r.length; i++)
      for (let j = i + 1; j < r.length; j++) {
        const a = r[i].b
        const b = r[j].b
        if (a.width && b.width && a.left < b.right - 1 && b.left < a.right - 1 && a.top < b.bottom - 1 && b.top < a.bottom - 1) hit.push(`${r[i].t}/${r[j].t}`)
      }
    return { names: r.map((x) => x.t), hit }
  })
  check(`${t}: the home map names נתניה, טבריה and אשדוד`, ['נתניה', 'טבריה', 'אשדוד'].every((c) => map.names.includes(c)), map.names)
  check(`${t}: no city label sits on another`, map.hit.length === 0, map.hit)
  await page.evaluate(() => document.querySelector('.hg-node')?.closest('section, div')?.scrollIntoView({ block: 'center' }))
  await wait(400)
  await page.screenshot({ path: `${out}/${t}-1-home-map.png` })

  // 4: the office page
  await page.goto(green + '/join/office', { waitUntil: 'load' })
  await page.waitForSelector('.jo-hero', { timeout: 15000 })
  await wait(800)
  const office = await page.evaluate(() => {
    const text = document.body.innerText
    return {
      shekel: (text.match(/₪/g) ?? []).length,
      month: /לחודש|מע"מ|BASIC|PLUS|PRO\b/.test(text),
      priceList: !!document.querySelector('.prc, [data-plans], #calc'),
      buttons: document.querySelectorAll('[data-act="ask-info"]').length,
      ask: [...document.querySelectorAll('[data-act="ask-info"]')].some((b) => b.textContent.includes('מעוניינים לקבל מידע? לחצו כאן')),
      about: [...document.querySelectorAll('.jo-about h2, .jo-about p')].map((e) => e.textContent.replace(/\s+/g, ' ').trim()),
      glossary: document.querySelector('[data-glossary="placeholder"]')?.textContent ?? '',
      fees: (text.match(/0% עמלה למשרד, 100% עמלה למתווך/g) ?? []).length,
      loneFee: text.split('\n').filter((l) => l.includes('עמלה למשרד') && !l.includes('100% עמלה למתווך') && l.trim() !== 'עמלה למשרד').map((l) => l.trim()),
    }
  })
  check(`${t}: the office page shows no price: no ₪, no monthly plans, no price list or calculator`, office.shekel === 0 && !office.month && !office.priceList, office)
  check(`${t}: "מעוניינים לקבל מידע? לחצו כאן" is there in place of the prices`, office.ask && office.buttons >= 2, office.buttons)
  check(`${t}: the network's text, word for word`, JSON.stringify(office.about) === JSON.stringify(ABOUT), office.about)
  check(`${t}: a kept place for "מילון מונחים", with nothing made up in it`, office.glossary.includes('מילון מונחים') && office.glossary.includes('יתווסף בהמשך'), office.glossary)
  check(`${t}: the fee reads "${FEE}", and never as half of it`, office.fees >= 3 && office.loneFee.length === 0, office)
  check(`${t}: the office page does not slide sideways`, (await overflow(page)) <= 1)
  await page.evaluate(() => document.querySelector('[data-section="ask"]').scrollIntoView({ block: 'center' }))
  await wait(500)
  await page.screenshot({ path: `${out}/${t}-2-office-ask.png` })
  await page.evaluate(() => document.querySelector('[data-section="about"]').scrollIntoView({ block: 'start' }))
  await wait(500)
  await page.screenshot({ path: `${out}/${t}-3-office-about.png` })

  // the sheet
  await page.evaluate(() => document.querySelector('[data-section="ask"] [data-act="ask-info"]').click())
  await page.waitForSelector('[data-sheet="lead"]', { visible: true, timeout: 5000 })
  await wait(500)
  const sheet = await page.evaluate(() => ({
    fields: [...document.querySelectorAll('[data-sheet="lead"] [data-lead]')].map((e) => e.dataset.lead),
    noteOptional: document.querySelector('[data-sheet="lead"]').textContent.includes('לא חובה'),
    privacy: document.querySelector('.ld-private')?.textContent ?? '',
  }))
  check(`${t}: the sheet asks for name, phone, city and an optional note`, sheet.fields.join() === 'name,phone,city,note' && sheet.noteOptional, sheet)
  check(`${t}: the sheet says the details go to the office's staff only`, sheet.privacy.includes('לצוות המשרד בלבד'), sheet.privacy)
  await page.screenshot({ path: `${out}/${t}-4-sheet.png` })
  await page.evaluate(() => document.querySelector('[data-act="send-lead"]').click())
  await wait(300)
  const empty = await page.evaluate(() => [...document.querySelectorAll('.ld-err')].map((e) => e.textContent))
  check(`${t}: sending it empty: a word under each required field, nothing sent`, empty.length === 3, empty)
  const NAME = `רון ${t} ${stamp}`
  await page.type('[data-lead="name"]', NAME)
  await page.type('[data-lead="phone"]', '050-555-0144')
  await page.type('[data-lead="city"]', 'נתניה')
  await page.type('[data-lead="note"]', 'מתעניין בהצטרפות למשרד')
  check(`${t}: the errors leave as the fields are filled`, (await page.$$('.ld-err')).length === 0)
  await page.evaluate(() => document.querySelector('[data-act="send-lead"]').click())
  const done = await page.waitForSelector('[data-sheet="lead"][data-state="done"]', { timeout: 8000 }).catch(() => null)
  check(`${t}: sent: a clear thank you`, !!done)
  await wait(400)
  await page.screenshot({ path: `${out}/${t}-5-sent.png` })
  const kept = (await api('/api/admin/leads', { token: staffToken })).data.leads.find((l) => l.name === NAME)
  check(`${t}: the lead from the screen is on the server`, kept?.phone === '050-555-0144' && kept?.city === 'נתניה' && kept?.status === 'new', kept)

  // 6: public pages carry no lead
  const leaks = []
  for (const path of ['/', '/join/office', '/kehila', '/about']) {
    await page.goto(green + path, { waitUntil: 'load' })
    await wait(900)
    const txt = await page.evaluate(() => document.body.innerText + document.documentElement.innerHTML)
    if (txt.includes(NAME) || txt.includes(LEAD.name) || txt.includes('050-555-0144') || txt.includes('054-555-0123')) leaks.push(path)
  }
  check(`${t}: no lead's name or phone on any public page`, leaks.length === 0, leaks)

  // 5: the admin
  await api('/api/login', { method: 'POST', body: { email: 'itzik@test.local' } })
  await page.goto(links((await lastTo('itzik@test.local')).html).find((l) => l.includes('/kehila/enter')), { waitUntil: 'load' })
  await page.waitForFunction(() => location.pathname.endsWith('/kehila/admin'), { timeout: 20000 })
  await page.waitForSelector('[data-view="leads"]', { timeout: 15000 })
  await wait(900)
  const tab = await page.evaluate(() => ({
    label: document.querySelector('[data-view="leads"]').textContent,
    badge: Number(document.querySelector('[data-view="leads"] [data-leads-new]')?.dataset.leadsNew ?? 0),
    tabs: document.querySelectorAll('[data-nav="tabs"] [role="tab"]').length,
  }))
  check(`${t}: the admin has a "לידים נכנסים" tab, with the new leads counted on it`, tab.label.includes('לידים') && tab.badge >= 2, tab)
  await page.evaluate(() => document.querySelector('[data-view="leads"]').click())
  await page.waitForSelector('[data-panel="leads"] [data-lead]', { timeout: 8000 })
  await wait(500)
  const card = await page.evaluate((n) => {
    const c = [...document.querySelectorAll('[data-panel="leads"] [data-lead]')].find((x) => x.querySelector('[data-lead-name]')?.textContent === n)
    if (!c) return null
    return {
      status: c.dataset.status,
      phone: c.querySelector('[data-lead-phone]')?.getAttribute('href'),
      city: c.querySelector('[data-lead-city]')?.textContent,
      note: c.querySelector('.lds-note')?.textContent,
      date: /\d{2}\.\d{2}\.\d{4}/.test(c.textContent),
      buttons: [...c.querySelectorAll('.lds-status button')].map((b) => b.textContent),
      pressed: c.querySelector('.lds-status [aria-pressed="true"]')?.textContent,
      tall: Math.min(...[...c.querySelectorAll('.lds-status button, .lds-call')].map((b) => b.getBoundingClientRect().height)),
    }
  }, NAME)
  check(`${t}: the lead's card: date, name, a phone to call, city and note`, card && card.phone === 'tel:0505550144' && card.city === 'נתניה' && card.note === 'מתעניין בהצטרפות למשרד' && card.date, card)
  check(`${t}: three statuses on the card, "חדש" on, each easy to touch`, card && card.buttons.join() === 'חדש,בטיפול,נסגר' && card.pressed === 'חדש' && card.tall >= 40, card)
  check(`${t}: the admin does not slide sideways`, (await overflow(page)) <= 1)
  await page.screenshot({ path: `${out}/${t}-6-admin-leads.png` })
  await page.evaluate((n) => {
    const c = [...document.querySelectorAll('[data-panel="leads"] [data-lead]')].find((x) => x.querySelector('[data-lead-name]')?.textContent === n)
    c.querySelector('.lds-status [data-v="working"]').click()
  }, NAME)
  await wait(900)
  const moved = (await api('/api/admin/leads', { token: staffToken })).data.leads.find((l) => l.name === NAME)
  check(`${t}: "בטיפול" on the card moves it on the server`, moved?.status === 'working', moved?.status)
  await page.evaluate(() => document.querySelector('[data-filter="working"]').click())
  await wait(300)
  const filtered = await page.evaluate(() => [...document.querySelectorAll('[data-panel="leads"] [data-lead]')].every((c) => c.dataset.status === 'working'))
  check(`${t}: the filter "בטיפול" shows only leads in handling`, filtered)
  await page.screenshot({ path: `${out}/${t}-7-admin-working.png` })
  check(`${t}: no page errors`, errors.length === 0, errors.join(' | '))
  await ctx.close()
}
await browser.close()

const failed = results.filter((l) => l.startsWith('FAIL')).length
console.log(`\n${results.length - failed} passed, ${failed} failed`)
console.log(failed ? 'SOME CHECKS FAILED' : 'ALL CHECKS PASSED')
process.exit(failed ? 1 : 0)
