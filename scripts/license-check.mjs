// The licence number against the Registrar of Real Estate Brokers (24.11.2026), on the LOCAL test server only.
// It starts a fake registry on 127.0.0.1:8799 (server/.dev.vars points REGISTRY_API there), answering the way
// data.gov.il's datastore_search does, and checks:
//  1. a number that exists: the server answers with the registry's full name
//  2. a number that does not exist: "not found", and the sign-up still goes on, to a check by hand
//  3. a made-up number (000000, 1111111, 1234567): "not found" without even asking the registry
//  4. the registry down or broken: "unavailable", and the sign-up still goes on
//  5. on sign-up the registry's name wins over what was typed, and is kept with the status; the approvers' e-mail says it
//  6. the screen: the name fills in by itself and is locked, a made-up number gets a soft word and is not blocked
//  7. a verified broker cannot change the name in "עריכת פרופיל"
//  8. (read-only) the real data.gov.il answers: one real number is found, 000000 is not. Skipped when offline.
// Usage: node scripts/license-check.mjs [outDir]     ONLY=phone or ONLY=desktop for one of the two
import puppeteer from 'puppeteer-core'
import http from 'node:http'
import { mkdirSync } from 'node:fs'

const API = process.env.API ?? 'http://localhost:8787'
const ORIGIN = 'http://localhost:5240'
const green = process.env.BASE_GREEN ?? 'http://localhost:5240/NADLANIL-DEMO/green'
if (!/^http:\/\/(localhost|127\.0\.0\.1)/.test(API)) throw new Error('local test server only')
const out = process.argv[2] ?? '_shots/license'
mkdirSync(out, { recursive: true })
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
const results = []
const check = (name, ok, detail = '') => {
  const line = `${ok ? 'PASS' : 'FAIL'}  ${name}${detail && !ok ? '  [' + (typeof detail === 'string' ? detail : JSON.stringify(detail)) + ']' : ''}`
  results.push(line)
  console.log(line)
}
const api = async (path, { method = 'GET', body, token } = {}) => {
  const headers = { origin: ORIGIN, ...(token ? { authorization: `Bearer ${token}` } : {}), ...(body ? { 'content-type': 'application/json' } : {}) }
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

// ---------------------------------------------------------------- the fake registry
const REAL = { 3141592: 'נועה ישראלי', 2468024: 'אבי בן דוד' }
const BROKEN = 5550001 // answers 500
let asked = []
let down = false
const fake = http.createServer((req, res) => {
  const u = new URL(req.url, 'http://x')
  const filters = JSON.parse(u.searchParams.get('filters') ?? '{}')
  const n = Number(filters['מס רשיון'])
  asked.push(n)
  if (down || n === BROKEN) {
    res.writeHead(500)
    return res.end('error')
  }
  const name = REAL[n]
  res.writeHead(200, { 'content-type': 'application/json' })
  res.end(JSON.stringify({ success: true, result: { total: name ? 1 : 0, records: name ? [{ _id: 1, 'מס רשיון': n, 'שם המתווך': name, 'עיר מגורים': 'תל אביב' }] : [] } }))
})
await new Promise((r) => fake.listen(8799, '127.0.0.1', r))

await api('/api/test/rate', { method: 'DELETE' })
await api('/api/test/outbox', { method: 'DELETE' })
const lic = (license) => api('/api/license', { method: 'POST', body: { license } })

// ---------------------------------------------------------------- 1-4: the lookup on the server
let r = await lic('3141592')
check('an existing number: verified, with the registry\'s full name', r.status === 200 && r.data.status === 'verified' && r.data.name === 'נועה ישראלי', r.data)
r = await lic('314-1592')
check('the same number typed with a dash is found too', r.data.status === 'verified' && r.data.name === 'נועה ישראלי', r.data)
r = await lic('7654321')
check('a number that is not in the registry: not_found, no name', r.status === 200 && r.data.status === 'not_found' && !r.data.name, r.data)
for (const n of ['000000', '0000000', '1111111', '1234567', '9876543']) {
  asked = []
  r = await lic(n)
  check(`a made-up number (${n}): not_found, and the registry is not even asked`, r.data.status === 'not_found' && asked.length === 0, { data: r.data, asked })
}
r = await lic('12ab')
check('letters are refused with a clear word (400)', r.status === 400 && /ספרות/.test(r.data.error ?? ''), r)
r = await lic(String(BROKEN))
check('the registry answers with an error: unavailable', r.data.status === 'unavailable', r.data)
down = true
r = await lic('3141592')
check('the registry is down: unavailable, never a name', r.data.status === 'unavailable' && !r.data.name, r.data)
down = false

// ---------------------------------------------------------------- 5: on sign-up
await api('/api/test/rate', { method: 'DELETE' })
const reg = (email, name, license) =>
  api('/api/register', { method: 'POST', body: { name, phone: '052-555-0177', email, license, work: 'solo', office_name: '', cities: ['תל אביב'], areas: '' } })
await api('/api/login', { method: 'POST', body: { email: 'itzik@test.local' } })
const staffToken = (await api('/api/session', { method: 'POST', body: { token: tokenOf((await lastTo('itzik@test.local')).html) } })).data.token
// earlier runs: remove what is left of them (real requests are kept by the server: they are rejected instead)
const stamp = Date.now().toString(36)
const mails = { ok: `lic-ok-${stamp}@test.local`, fake: `lic-fake-${stamp}@test.local`, down: `lic-down-${stamp}@test.local` }

r = await reg(mails.ok, 'שם אחר שהוקלד', '3141592')
check('sign-up with an existing number: accepted, and the answer carries the registry\'s name', r.status === 200 && r.data.name === 'נועה ישראלי' && r.data.license === 'verified', r.data)
r = await reg(mails.fake, 'מישהו עם מספר מזויף', '000000')
check('sign-up with 000000: not blocked, goes to a check by hand (not_found), the typed name kept', r.status === 200 && r.data.license === 'not_found' && r.data.name === 'מישהו עם מספר מזויף', r.data)
down = true
r = await reg(mails.down, 'כשהמאגר לא עונה', '2468024')
down = false
check('sign-up while the registry is down: not blocked, unavailable, the typed name kept', r.status === 200 && r.data.license === 'unavailable' && r.data.name === 'כשהמאגר לא עונה', r.data)

const members = (await api('/api/admin/members', { token: staffToken })).data.members
const row = (email) => members.find((m) => m.email === email)
check('kept on the server: the registry\'s name, the status and the registry name', row(mails.ok)?.name === 'נועה ישראלי' && row(mails.ok)?.license_status === 'verified' && row(mails.ok)?.registry_name === 'נועה ישראלי', row(mails.ok))
check('kept on the server: 000000 as not_found, unavailable as unavailable, no registry name', row(mails.fake)?.license_status === 'not_found' && row(mails.down)?.license_status === 'unavailable' && !row(mails.fake)?.registry_name, [row(mails.fake), row(mails.down)])
const ask = async (name) => (await outbox()).filter((m) => m.subject.includes(name) && m.subject.includes('בקשת הצטרפות'))
const [okMail, fakeMail, downMail] = [await ask('נועה ישראלי'), await ask('מישהו עם מספר מזויף'), await ask('כשהמאגר לא עונה')]
check('the approvers\' e-mail says "אומת" for a found number', okMail.length > 0 && okMail.every((m) => m.html.includes('אומת. השם מתוך רשם המתווכים')), okMail.length)
check('the approvers\' e-mail says "לא נמצא במאגר. לבדוק ידנית" for 000000', fakeMail.length > 0 && fakeMail.every((m) => m.html.includes('לא נמצא במאגר. לבדוק ידנית')), fakeMail.length)
check('the approvers\' e-mail says "המאגר לא ענה" when the registry was down', downMail.length > 0 && downMail.every((m) => m.html.includes('המאגר לא ענה. לבדוק ידנית')), downMail.length)

// the found one is approved, to sign in with below; the other two are put aside (rejected, kept on record)
const idOf = (email) => row(email).id
await api(`/api/admin/members/${idOf(mails.ok)}/approve`, { method: 'POST', token: staffToken })
for (const e of [mails.fake, mails.down]) await api(`/api/admin/members/${idOf(e)}/reject`, { method: 'POST', token: staffToken, body: { reason: 'בדיקה של רשם המתווכים.' } })
const welcome = await lastTo(mails.ok, 'ברוכים הבאים')
const memberSession = (await api('/api/session', { method: 'POST', body: { token: tokenOf(welcome.html) } })).data

// ---------------------------------------------------------------- 6-7: the screens
const browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--hide-scrollbars'] })
const devices = [
  ['desktop', { width: 1280, height: 860 }],
  ['phone', { width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }],
].filter(([t]) => !process.env.ONLY || process.env.ONLY === t)

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
  await page.goto(green + '/kehila/join', { waitUntil: 'load' })
  await page.waitForSelector('[data-f="license"]', { timeout: 15000 })
  const first = await page.evaluate(() => [...document.querySelectorAll('.au-grid [data-f]')].map((e) => e.dataset.f).slice(0, 2).join())
  check(`${t}: the licence number comes first, the name right after it`, first === 'license,name', first)

  await page.type('[data-f="license"]', '3141592')
  await page.waitForSelector('[data-license="verified"]', { timeout: 8000 }).catch(() => null)
  const ok = await page.evaluate(() => {
    const n = document.querySelector('[data-f="name"]')
    return { name: n.value, ro: n.readOnly, src: document.querySelector('[data-license="verified"]')?.textContent ?? '' }
  })
  check(`${t}: the full name fills in by itself from the registry, and is locked`, ok.name === 'נועה ישראלי' && ok.ro, ok)
  check(`${t}: the source is named under it (רשם המתווכים, data.gov.il)`, ok.src.includes('רשם המתווכים') && ok.src.includes('data.gov.il'), ok.src)
  await page.screenshot({ path: `${out}/${t}-1-verified.png` })
  // typing over the locked name does nothing
  await page.click('[data-f="name"]')
  await page.keyboard.type('xyz')
  check(`${t}: typing over the locked name changes nothing`, (await page.$eval('[data-f="name"]', (e) => e.value)) === 'נועה ישראלי')

  // a made-up number: the name leaves with the number it came from, a soft word, the field opens again
  await page.click('[data-f="license"]', { clickCount: 3 })
  await page.keyboard.press('Backspace')
  await page.type('[data-f="license"]', '000000')
  await page.waitForSelector('[data-license="manual"]', { timeout: 8000 }).catch(() => null)
  const bad = await page.evaluate(() => {
    const n = document.querySelector('[data-f="name"]')
    return { name: n.value, ro: n.readOnly, note: document.querySelector('[data-license="manual"]')?.textContent ?? '', red: !!document.querySelector('[data-f="license"][aria-invalid="true"]') }
  })
  check(`${t}: 000000: a soft word that the staff will check by hand, not a red error`, bad.note.includes('לא מצאנו') && bad.note.includes('ידנית') && !bad.red, bad)
  check(`${t}: 000000: the registry's name is gone and the name can be typed`, bad.name === '' && !bad.ro, bad)
  await page.screenshot({ path: `${out}/${t}-2-not-found.png` })

  // and the request still goes through
  await page.type('[data-f="name"]', 'מתווך בלי מספר במאגר')
  await page.type('[data-f="phone"]', '052-555-0188')
  await page.type('[data-f="email"]', `lic-ui-${t}-${stamp}@test.local`)
  await page.evaluate(() => document.querySelector('[data-v="solo"]').click())
  await page.evaluate(() => [...document.querySelectorAll('button')].find((b) => b.textContent.trim() === 'תל אביב')?.click())
  await page.evaluate(() => document.querySelector('form.au-card button[type="submit"]')?.click())
  const sent = await page.waitForSelector('[data-state="waiting"]', { timeout: 10000 }).catch(() => null)
  if (!sent) { await page.screenshot({ path: `${out}/${t}-debug-submit.png`, fullPage: true }); console.log('DEBUG', await page.evaluate(() => [...document.querySelectorAll('.au-err,.au-fail,[role=alert]')].map((e) => e.textContent).join(' / '))) }
  check(`${t}: with 000000 the request is not blocked: it reaches the waiting screen`, !!sent)
  const mine = (await api('/api/admin/members', { token: staffToken })).data.members.find((m) => m.email === `lic-ui-${t}-${stamp}@test.local`)
  check(`${t}: the request is kept as not_found, for a check by hand`, mine?.license_status === 'not_found', mine)
  if (mine) await api(`/api/admin/members/${mine.id}/reject`, { method: 'POST', token: staffToken, body: { reason: 'בדיקה של רשם המתווכים.' } })

  // 7: the verified broker's own profile: the name cannot be changed
  await page.goto(green + '/about', { waitUntil: 'load' })
  await page.evaluate((s) => localStorage.setItem('nadlanup-session-v1', JSON.stringify(s)), { token: memberSession.token, member: memberSession.member, staff: memberSession.staff ?? null })
  await page.goto(green + '/app/community', { waitUntil: 'load' })
  await page.waitForSelector('[data-act="open-profile"]', { timeout: 15000 })
  await wait(800)
  await page.evaluate(() => document.querySelector('[data-act="open-profile"]').click())
  await page.waitForSelector('[data-act="edit-profile"]', { visible: true, timeout: 5000 })
  await page.evaluate(() => document.querySelector('[data-act="edit-profile"]').click())
  await page.waitForSelector('[data-profile-edit]', { visible: true, timeout: 5000 })
  await wait(400)
  const prof = await page.evaluate(() => {
    const n = document.querySelector('[data-profile-edit] [data-f="name"]')
    return { name: n.value, ro: n.readOnly, note: !!document.querySelector('[data-profile-edit] [data-name-locked]') }
  })
  check(`${t}: "עריכת פרופיל" of a verified broker: the registry's name, locked, with a word why`, prof.name === 'נועה ישראלי' && prof.ro && prof.note, prof)
  await page.screenshot({ path: `${out}/${t}-3-profile-locked.png` })
  check(`${t}: no page errors`, errors.length === 0, errors.join(' | '))
  await ctx.close()
}
await browser.close()
fake.close()

// ---------------------------------------------------------------- 8: the real registry, read only
try {
  const R = 'https://data.gov.il/api/3/action/datastore_search?resource_id=a0f56034-88db-4132-8803-854bcdb01ca1'
  const get = async (q) => (await fetch(R + q, { headers: { 'user-agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(20000) })).json()
  const any = await get('&limit=1')
  const real = any.result.records[0]['מס רשיון']
  const hit = await get(`&limit=2&filters=${encodeURIComponent(JSON.stringify({ 'מס רשיון': real }))}`)
  const zero = await get(`&limit=2&filters=${encodeURIComponent(JSON.stringify({ 'מס רשיון': 0 }))}`)
  check('the real data.gov.il: the fields are מס רשיון and שם המתווך', any.result.fields.some((f) => f.id === 'מס רשיון') && any.result.fields.some((f) => f.id === 'שם המתווך'))
  check('the real data.gov.il: a real number is found, with a name', hit.success && hit.result.total === 1 && String(hit.result.records[0]['שם המתווך']).length >= 2)
  check('the real data.gov.il: 000000 is not found', zero.success && zero.result.total === 0)
} catch (e) {
  console.log(`SKIP  the real data.gov.il could not be reached from here (${e?.message ?? e})`)
}

const failed = results.filter((l) => l.startsWith('FAIL')).length
console.log(`\n${results.length - failed} passed, ${failed} failed`)
console.log(failed ? 'SOME CHECKS FAILED' : 'ALL CHECKS PASSED')
process.exit(failed ? 1 : 0)
