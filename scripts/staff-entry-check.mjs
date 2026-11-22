// "כניסת צוות" on the page of the upgrade (Itzik 22.11.2026, in place of the preview key and the five taps on the
// logo): while the site is closed, only the partners get in, each with their own address and a code of six digits.
// Against the LOCAL test server (server/, TEST_MODE=1: every mail stays in the outbox table of the local database and
// nothing is sent anywhere) and the green dev server.
// ONE address is used here, itzik@test.local, which is Itzik's own test address on this computer. The addresses of
// Ofek and Ariel are never typed and never mailed, here or anywhere else in the checks.
//   A. the server: a code goes only to an address of the `staff` table. An approved broker gets the usual sign-in
//      mail from /api/login (untouched) and NOTHING from /api/staff-login
//   B. a visitor: every inner page typed straight in shows the page of the upgrade, and nothing of the preview key
//      is left
//   C. an address that is not on the list: a gentle word, and not one mail
//   D. a partner: the code from the mail opens the site, and this device stays signed in
//   E. by day and by night every word can be read
// Usage: node scripts/staff-entry-check.mjs [outDir]     (ONLY=phone|desktop)
import puppeteer from 'puppeteer-core'
import { mkdirSync } from 'node:fs'

const API = process.env.API ?? 'http://localhost:8787'
const ORIGIN = 'http://localhost:5240'
const green = `${ORIGIN}/NADLANIL-DEMO/green`
if (!/^http:\/\/(localhost|127\.0\.0\.1)/.test(API)) throw new Error('local test server only')
const MINE = 'itzik@test.local'
const out = process.argv[2] ?? '_shots/staff-entry'
mkdirSync(out, { recursive: true })
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
let fails = 0
let total = 0
const check = (name, ok, info) => {
  total++
  if (!ok) fails++
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok || info === undefined ? '' : '  [' + JSON.stringify(info).slice(0, 400) + ']'}`)
}
const api = async (path, opts = {}) => {
  const r = await fetch(API + path, { method: opts.method ?? 'GET', headers: { 'content-type': 'application/json', origin: ORIGIN, ...(opts.token ? { authorization: `Bearer ${opts.token}` } : {}) }, body: opts.body ? JSON.stringify(opts.body) : undefined })
  return { status: r.status, data: await r.json().catch(() => ({})) }
}
const outbox = async () => {
  const r = await api('/api/test/outbox')
  const list = Array.isArray(r.data) ? r.data : (r.data.outbox ?? r.data.mails ?? [])
  return list
}
const mailsTo = async (email) => (await outbox()).filter((m) => (m.to_email ?? m.to ?? '') === email)
const codeFor = async (email) => {
  const m = (await mailsTo(email)).slice(-1)[0]
  return m?.html?.match(/>\s*(\d{6})\s*</)?.[1] ?? m?.html?.match(/(\d{6})/)?.[1] ?? null
}
const clear = async () => {
  await api('/api/test/outbox', { method: 'DELETE' })
  await api('/api/test/rate', { method: 'DELETE' })
}

// ================================================================== A. the server
await clear()
let r = await api('/api/staff-login', { method: 'POST', body: { email: MINE } })
check('A: a partner asking gets a code: the server says it was sent, and one mail waits in the local outbox', r.status === 200 && r.data.sent === true && (await mailsTo(MINE)).length === 1, { r: r.data, mails: (await mailsTo(MINE)).length })
const staffCode = await codeFor(MINE)
check('A: the mail carries a code of six digits', /^\d{6}$/.test(staffCode ?? ''), staffCode ? 'six digits' : null)
r = await api('/api/staff-login', { method: 'POST', body: { email: 'nobody@test.local' } })
check('A: an address that is not on the list: the server says nothing was sent, and sends nothing', r.status === 200 && r.data.sent === false && (await mailsTo('nobody@test.local')).length === 0, r.data)
r = await api('/api/staff-login', { method: 'POST', body: { email: 'not-an-address' } })
check('A: an address that is not an address is refused', r.status === 400, r.data)

// an approved broker: the usual sign-in still mails him, "כניסת צוות" does not
const broker = `broker-${Date.now().toString(36)}@test.local`
await api('/api/register', { method: 'POST', body: { name: 'מתווך בדיקה', phone: '052-555-0142', email: broker, license: '3141592', work: 'solo', office_name: '', cities: ['חיפה'], areas: '' } })
const enter = await api('/api/session', { method: 'POST', body: { email: MINE, code: staffCode } })
const token = enter.data.token
check('A: the code opens a session of the staff (the same door the usual sign-in opens)', !!token && !!enter.data.staff?.email, { staff: !!enter.data.staff })
const members = await api('/api/admin/members', { token })
const waiting = (members.data.members ?? []).find((m) => m.email === broker)
if (waiting) await api(`/api/admin/members/${waiting.id}/approve`, { method: 'POST', token })
// nothing is cleared from here on: clearing the outbox clears the members with it
const was = (await mailsTo(broker)).length
await api('/api/login', { method: 'POST', body: { email: broker } })
const afterLogin = (await mailsTo(broker)).length - was
r = await api('/api/staff-login', { method: 'POST', body: { email: broker } })
const afterStaff = (await mailsTo(broker)).length - was - afterLogin
check('A: an approved broker gets the usual sign-in mail from /api/login, and NOTHING from "כניסת צוות"', !!waiting && afterLogin === 1 && r.data.sent === false && afterStaff === 0, { approved: !!waiting, afterLogin, afterStaff, sent: r.data.sent })

// ================================================================== the browser
const browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--hide-scrollbars'] })
process.on('uncaughtException', () => {})
const DEVICES = [
  ['desktop', { width: 1366, height: 900 }],
  ['phone', { width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }],
].filter(([n]) => !process.env.ONLY || process.env.ONLY === n)
const CONTRAST = `(sel) => {
  const parse = (c) => {
    let m = c.match(/rgba?\\(([^)]+)\\)/)
    if (m) { const p = m[1].split(/[ ,/]+/).filter(Boolean).map(Number); return [p[0], p[1], p[2], p[3] ?? 1] }
    return [0, 0, 0, 0]
  }
  const over = (top, under) => under.map((v, i) => v * (1 - top[3]) + top[i] * top[3])
  const lum = (c) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4 }; return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]) }
  const el = document.querySelector(sel)
  if (!el) return null
  const layers = []
  for (let e = el; e; e = e.parentElement) {
    const st = getComputedStyle(e)
    // a gradient is a background too: of its colours the lightest is the worst for the words on it
    const grad = (st.backgroundImage.match(/rgba?[(][^)]+[)]/g) ?? []).map(parse)
    const c = grad.length ? grad.sort((x, y) => x[0] + x[1] + x[2] - (y[0] + y[1] + y[2])).pop() : parse(st.backgroundColor)
    if (c[3] > 0) layers.push(c)
    if (c[3] >= 1) break
  }
  let bg = [255, 255, 255]
  for (const c of layers.reverse()) bg = over(c, bg)
  const ink = over(parse(getComputedStyle(el).color), bg)
  const a = lum(ink), b = lum(bg)
  return Math.round(((Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)) * 10) / 10
}`
const fresh = async (vp, mode = 'day') => {
  const ctx = await browser.createBrowserContext()
  const page = await ctx.newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 160)))
  await page.setViewport(vp)
  await page.goto(`${green}/about`, { waitUntil: 'load' })
  await page.evaluate((m) => {
    localStorage.clear()
    localStorage.setItem('nadlanup-mode-v1', JSON.stringify({ mode: m, until: Date.now() + 9e9 }))
  }, mode)
  // on this computer the page of the upgrade shows only when it is asked for (?gate=on)
  const open = async (path) => {
    await page.goto(`${green}${path}${path.includes('?') ? '&' : '?'}gate=on`, { waitUntil: 'load' })
    await wait(900)
  }
  return { ctx, page, errors, open, contrast: (sel) => page.evaluate(`(${CONTRAST})(${JSON.stringify(sel)})`), shot: (n) => page.screenshot({ path: `${out}/${n}.png` }) }
}
const state = (page) =>
  page.evaluate(() => ({
    curtain: !!document.querySelector('[data-construction]'),
    title: document.querySelector('[data-construction] h1')?.textContent.trim() ?? null,
    app: !!document.querySelector('.hg-hero, .kh-hero, .app-shell, .shell, main.main, .jo, .au-card, .fbx-page'),
    entry: document.querySelector('[data-act="staff-entry"]')?.textContent.trim() ?? null,
    old: !!document.querySelector('[data-logo], [data-key-panel], [data-f="preview-key"]'),
    path: location.pathname,
  }))

for (const [dev, vp] of DEVICES) {
  const t = await fresh(vp)
  const { page } = t

  // ---------------------------------------------------------------- B. a visitor
  const PAGES = ['/', '/kehila', '/app', '/app/community', '/app/crm?v=properties', '/kehila/admin', '/kehila/login', '/demo']
  const bad = []
  for (const p of PAGES) {
    await t.open(p)
    const s = await state(page)
    if (!s.curtain || s.app || s.title !== 'האתר בבנייה' || s.entry !== 'כניסת צוות' || s.old) bad.push({ p, ...s })
  }
  check(`${dev}, a visitor with no session: the page of the upgrade on all ${PAGES.length} addresses, inner pages typed straight in too`, bad.length === 0, bad.slice(0, 2))
  check(`${dev}: nothing of the preview key or the five taps is left on it`, !(await page.$('[data-logo]')) && !(await page.$('[data-f="preview-key"]')))
  await t.open('/')
  await t.shot(`${dev}-1-curtain`)

  // ---------------------------------------------------------------- C. an address that is not on the list
  await clear()
  await page.click('[data-act="staff-entry"]')
  await page.waitForSelector('[data-staff-panel]', { visible: true, timeout: 8000 })
  await wait(300)
  await t.shot(`${dev}-2-staff-field`)
  await page.type('[data-f="staff-email"]', 'someone@example.com')
  await page.click('[data-act="staff-send"]')
  await page.waitForSelector('[data-staff-no]', { timeout: 8000 }).catch(() => {})
  await wait(400)
  const no = await page.evaluate(() => ({
    title: document.querySelector('[data-staff-no] h1')?.textContent.trim() ?? null,
    line: document.querySelector('[data-staff-no] p')?.textContent.trim() ?? null,
    curtain: !!document.querySelector('[data-construction]'),
    session: localStorage.getItem('nadlanup-session-v1'),
  }))
  check(`${dev}: an address that is not on the list gets a gentle word, stays outside, and no session is made`, no.title === 'האתר עדיין בבנייה' && no.line === 'נשמח לראות אותך בקרוב.' && no.curtain && no.session === null, no)
  check(`${dev}: and not one mail was sent to it`, (await mailsTo('someone@example.com')).length === 0 && (await outbox()).length === 0)
  await t.shot(`${dev}-3-not-on-the-list`)
  await page.click('[data-act="no-close"]')
  await wait(300)
  check(`${dev}: "סגירה" goes back to the plain page`, (await state(page)).title === 'האתר בבנייה')

  // ---------------------------------------------------------------- D. a partner
  await clear()
  await page.click('[data-act="staff-entry"]')
  await page.waitForSelector('[data-f="staff-email"]', { visible: true, timeout: 8000 })
  await page.$eval('[data-f="staff-email"]', (el) => el.select())
  await page.keyboard.press('Backspace')
  await page.type('[data-f="staff-email"]', MINE)
  await page.click('[data-act="staff-send"]')
  await page.waitForSelector('[data-staff-code]', { timeout: 8000 }).catch(() => {})
  await wait(400)
  const sent = await page.evaluate(() => ({ title: document.querySelector('[data-staff-code] h1')?.textContent.trim() ?? null, said: document.querySelector('[data-staff-code] p')?.textContent.trim() ?? '', boxes: document.querySelectorAll('[data-code-boxes] .cb6-box').length }))
  check(`${dev}: a partner is told the code was sent, to that address, with six boxes for it`, sent.title === 'הקוד נשלח' && sent.said.includes(MINE) && sent.boxes === 6, sent)
  const mine = await mailsTo(MINE)
  check(`${dev}: the mail waits in the local outbox, and nowhere else`, mine.length === 1 && (await outbox()).length === 1)
  await t.shot(`${dev}-4-code-sent`)
  const code = await codeFor(MINE)
  await page.type('[data-code-boxes] .cb6-field', code)
  await page.waitForSelector('[data-staff-in]', { timeout: 8000 }).catch(() => {})
  await wait(300)
  await t.shot(`${dev}-5-in`)
  await page.waitForFunction(() => !document.querySelector('[data-construction]'), { timeout: 15000 }).catch(() => {})
  await wait(1200)
  const inside = await state(page)
  const kept = await page.evaluate(() => JSON.parse(localStorage.getItem('nadlanup-session-v1') ?? 'null'))
  check(`${dev}: the right code opens the site on the same screen`, !inside.curtain && inside.app, inside)
  check(`${dev}: the session of the staff is kept on this device`, !!kept?.staff?.email && kept.staff.email === MINE && !!kept.token, { staff: kept?.staff?.email })
  await t.shot(`${dev}-6-inside`)
  // stays signed in: another page, and a reload
  await t.open('/app/community')
  const still = await state(page)
  await page.reload({ waitUntil: 'load' })
  await wait(1200)
  const after = await state(page)
  const me = await api('/api/me', { token: kept?.token })
  check(`${dev}: the partner stays signed in: another page and a reload, with no code again`, !still.curtain && still.app && !after.curtain && after.app, { still: still.curtain, after: after.curtain, me: me.status })
  check(`${dev}: no errors`, t.errors.length === 0, t.errors.slice(0, 2))
  await t.ctx.close()

  // ---------------------------------------------------------------- E. by day and by night
  for (const mode of ['day', 'night']) {
    const n = await fresh(vp, mode)
    await n.open('/')
    const ratios = {}
    ratios['"כניסת צוות"'] = await n.contrast('[data-act="staff-entry"]')
    await n.page.click('[data-act="staff-entry"]')
    await n.page.waitForSelector('[data-staff-panel]', { visible: true, timeout: 8000 })
    await wait(300)
    for (const [name, sel] of [
      ['the title', '[data-staff-panel] h1'],
      ['the line under it', '[data-staff-panel] p'],
      ['the name of the field', '[data-staff-panel] .uc-field > span:first-child'],
      ['"שלחו לי קוד"', '[data-act="staff-send"]'],
      ['"ביטול"', '[data-act="staff-close"]'],
    ])
      ratios[name] = await n.contrast(sel)
    await n.shot(`${dev}-${mode}-panel`)
    await n.page.type('[data-f="staff-email"]', 'someone@example.com')
    await n.page.click('[data-act="staff-send"]')
    await n.page.waitForSelector('[data-staff-no]', { timeout: 8000 }).catch(() => {})
    await wait(300)
    ratios['the gentle word'] = await n.contrast('[data-staff-no] p')
    const low = Object.entries(ratios).filter(([, v]) => v === null || v < 4.5)
    check(`${dev}, ${mode}: every word of the way in can be read (4.5 to 1 at least)`, low.length === 0, { low, ratios })
    await n.shot(`${dev}-${mode}-no`)
    await n.ctx.close()
  }
}
await clear()

console.log(fails ? `\nSOME CHECKS FAILED (${fails} of ${total})` : `\nALL CHECKS PASSED (${total})`)
await Promise.race([browser.close().catch(() => {}), wait(4000)])
process.exit(fails ? 1 : 0)
