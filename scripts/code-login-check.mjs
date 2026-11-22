// The iPhone fix before phone notices (Itzik 18.11.2026), against the LOCAL test server (server/, TEST_MODE=1, mail
// kept in the local outbox, never sent) and the green dev server:
//  A. the construction curtain: one quiet way in, "כניסת צוות", which opens a mail field (since 22.11.2026, in
//     place of the preview key; scripts/staff-entry-check.mjs walks the sign-in itself)
//  B. sign-in with a 6-digit code: the mail, wrong tries, the fifth wrong try, a new code ending the old one, one use,
//     expiry, unknown addresses answered alike, the link still working; and the screen on a computer and a phone,
//     day and night. Saves screenshots.
// Usage: node scripts/code-login-check.mjs [outDir]
import puppeteer from 'puppeteer-core'
import { mkdirSync } from 'node:fs'

const API = process.env.API ?? 'http://localhost:8787'
const ORIGIN = 'http://localhost:5240'
const green = 'http://localhost:5240/NADLANIL-DEMO/green'
if (!/^http:\/\/(localhost|127\.0\.0\.1)/.test(API)) throw new Error('local test server only')
const out = process.argv[2] ?? '_shots/code-login'
mkdirSync(out, { recursive: true })
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
let fails = 0
const check = (name, ok, info) => {
  if (!ok) fails++
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok || info === undefined ? '' : '  [' + JSON.stringify(info) + ']'}`)
}
const api = async (path, { method = 'GET', body, token } = {}) => {
  const res = await fetch(API + path, {
    method,
    headers: { origin: ORIGIN, ...(body ? { 'content-type': 'application/json' } : {}), ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  })
  return { status: res.status, data: await res.json().catch(() => ({})) }
}
const STAFF = 'itzik@test.local'
const lastMail = async (to) => (await api('/api/test/outbox')).data.outbox.filter((m) => m.to_email === to).at(-1)
const codeOf = (mail) => mail?.subject.match(/^(\d{6}) הוא קוד הכניסה שלך$/)?.[1]
const askCode = async (email) => {
  await api('/api/test/rate', { method: 'DELETE' })
  const before = (await lastMail(email))?.id ?? (await lastMail(email))?.created_at
  await api('/api/login', { method: 'POST', body: { email } })
  const m = await lastMail(email)
  return { mail: m, code: codeOf(m), fresh: (m?.id ?? m?.created_at) !== before }
}
const tryCode = (email, code) => api('/api/session', { method: 'POST', body: { email, code } })
const other = (c) => String((Number(c) + 1) % 1e6).padStart(6, '0')

const PHONE = { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true }
const DESK = { width: 1440, height: 900 }
const browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--hide-scrollbars'] })

// ================================================================== A. the curtain's hidden way in
for (const [dev, vp] of [
  ['desktop', DESK],
  ['phone', PHONE],
]) {
  const ctx = await browser.createBrowserContext()
  const page = await ctx.newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push(String(e)))
  await page.setViewport(vp)
  // on this computer the curtain shows only when asked (?gate=on)
  await page.goto(`${green}/app/community?gate=on`, { waitUntil: 'load' })
  await page.waitForSelector('[data-construction]', { timeout: 15000 })
  // since 22.11.2026 the way in is "כניסת צוות" (scripts/staff-entry-check.mjs walks it end to end); the preview
  // key and the five taps on the logo are gone
  const plain = await page.evaluate(() => ({
    panel: !!document.querySelector('[data-key-panel]'),
    key: !!document.querySelector('[data-f="preview-key"]'),
    logo: !!document.querySelector('[data-logo]'),
    entry: document.querySelector('[data-act="staff-entry"]')?.textContent.trim() ?? null,
    links: document.querySelectorAll('a').length,
  }))
  check(`${dev} curtain: one quiet way in, "כניסת צוות", and nothing of the preview key`, plain.entry === 'כניסת צוות' && !plain.panel && !plain.key && !plain.logo && plain.links === 0, plain)
  await page.click('[data-act="staff-entry"]')
  await page.waitForSelector('[data-staff-panel]', { timeout: 3000 }).catch(() => {})
  const opened = await page.evaluate(() => ({ panel: !!document.querySelector('[data-staff-panel]'), focus: document.activeElement?.dataset.f, type: document.querySelector('[data-f="staff-email"]')?.type }))
  check(`${dev} curtain: it opens a mail field, ready to type`, opened.panel && opened.focus === 'staff-email' && opened.type === 'email', opened)
  await wait(500)
  await page.screenshot({ path: `${out}/${dev}-curtain-staff.png` })
  await page.click('[data-act="staff-close"]')
  await wait(300)
  check(`${dev} curtain: "ביטול" goes back to the plain page`, !(await page.$('[data-staff-panel]')) && (await page.$eval('[data-construction] h1', (h) => h.textContent.trim())) === 'האתר בבנייה')
  check(`${dev} curtain: no errors`, errors.length === 0, errors)
  await ctx.close()
}

// ================================================================== B1. the code, at the server
{
  const a = await askCode(STAFF)
  check('the sign-in mail leads with a 6-digit code in its subject', !!a.code && a.fresh, a.mail?.subject)
  const html = a.mail?.html ?? ''
  check('the mail shows the code large, says how long it lives, and still has the button', html.includes(`>${a.code}<`) && html.includes('הקוד בתוקף ל-10 דקות') && html.includes('/kehila/enter?t=') && html.includes('כניסה בלחיצה'))
  check('no long dashes in the mail', !/[\u2013\u2014]/.test(html + a.mail.subject))

  const fmt = await tryCode(STAFF, '12345')
  check('five digits: asked for six, nothing counted', fmt.status === 400 && fmt.data.code === 'format', fmt)
  const lefts = []
  for (let i = 0; i < 4; i++) lefts.push((await tryCode(STAFF, other(a.code))).data)
  check('each wrong code says how many tries are left (4, 3, 2, 1)', lefts.map((x) => x.left).join() === '4,3,2,1' && lefts[3].error === 'הקוד לא נכון. נשאר עוד ניסיון אחד.', lefts)
  const fifth = await tryCode(STAFF, other(a.code))
  check('the fifth wrong code ends the code', fifth.data.code === 'locked' && fifth.data.left === 0, fifth)
  const late = await tryCode(STAFF, a.code)
  check('after that, even the right code does not open', !late.data.token && ['locked', 'used'].includes(late.data.code), late)

  const b = await askCode(STAFF)
  check('a new code can be asked for, and it is a different code', !!b.code && b.fresh, b.mail?.subject)
  const c = await askCode(STAFF)
  const oldOne = await tryCode(STAFF, b.code)
  check('a newer code ends the one before', b.code === c.code || oldOne.data.code === 'used', { b: b.code, c: c.code, oldOne: oldOne.data })
  const ok = await tryCode(STAFF, c.code)
  check('the right code opens a session', ok.status === 200 && !!ok.data.token && ok.data.staff?.email === STAFF, { status: ok.status, staff: ok.data.staff })
  const me = await api('/api/me', { token: ok.data.token })
  check('and that session is real at the server', me.status === 200 && (me.data.staff?.email === STAFF || me.data.email === STAFF || JSON.stringify(me.data).includes(STAFF)), me.status)
  const again = await tryCode(STAFF, c.code)
  check('a code works once', again.data.code === 'used' && !again.data.token, again.data)

  const d = await askCode(STAFF)
  await api('/api/test/expire', { method: 'POST' })
  const old = await tryCode(STAFF, d.code)
  check('a code past its time is refused as old', old.data.code === 'expired' && !old.data.token, old.data)

  await api('/api/test/rate', { method: 'DELETE' })
  const nobody = await tryCode('nobody-here@test.local', '123456')
  check('an address that is not signed up gets the same answer as a wrong code (nothing given away)', nobody.status === 400 && nobody.data.code === 'bad' && nobody.data.left === 4, nobody.data)

  const e = await askCode(STAFF)
  const link = [...e.mail.html.matchAll(/href="([^"]+)"/g)].map((m) => m[1].replace(/&amp;/g, '&')).find((l) => l.includes('/kehila/enter'))
  const viaLink = await api('/api/session', { method: 'POST', body: { token: new URL(link).searchParams.get('t') } })
  check('the link in the same mail still signs in, as before', viaLink.status === 200 && !!viaLink.data.token, viaLink.status)
}

// ================================================================== B2. the screen
for (const [dev, vp] of [
  ['desktop', DESK],
  ['phone', PHONE],
]) {
  for (const mode of ['day', 'night']) {
    const tag = `${dev}${mode === 'night' ? ' night' : ''}`
    const file = `${out}/${dev}${mode === 'night' ? '-night' : ''}`
    const ctx = await browser.createBrowserContext()
    const page = await ctx.newPage()
    const errors = []
    page.on('pageerror', (e) => errors.push(String(e)))
    await page.setViewport(vp)
    await page.goto(green + '/', { waitUntil: 'load' })
    await page.evaluate((m) => localStorage.setItem('nadlanup-mode-v1', JSON.stringify({ mode: m, until: Date.now() + 9e9 })), mode)
    await api('/api/test/rate', { method: 'DELETE' })
    await page.goto(green + '/kehila/login', { waitUntil: 'load' })
    await page.waitForSelector('[data-f="email"]')
    const words = await page.evaluate(() => ({ lead: document.querySelector('.au-lead')?.textContent, btn: document.querySelector('[data-act="login"]')?.textContent.trim() }))
    if (mode === 'day') check(`${tag}: the sign-in page speaks of a code now`, /קוד כניסה/.test(words.lead ?? '') && words.btn === 'שלחו לי קוד כניסה', words)
    await page.type('[data-f="email"]', STAFF)
    await page.click('[data-act="login"]')
    await page.waitForSelector('[data-code-boxes]', { timeout: 15000 })
    await wait(700)
    const step = await page.evaluate(() => {
      const f = document.querySelector('[data-f="code"]')
      const boxes = [...document.querySelectorAll('.cb6-box')].map((b) => b.getBoundingClientRect())
      return {
        h1: document.querySelector('h1').textContent,
        auto: f.autocomplete,
        mode: f.inputMode,
        focus: document.activeElement === f,
        boxes: boxes.length,
        tall: Math.min(...boxes.map((r) => r.height)),
        row: boxes.every((r) => Math.abs(r.top - boxes[0].top) < 1),
        ltr: boxes[0].left < boxes[5].left,
        again: document.querySelector('[data-act="new-code"]')?.disabled,
        clock: document.querySelector('[data-clock]')?.textContent,
        wide: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        dashes: /[\u2013\u2014]/.test(document.body.innerText),
      }
    })
    check(`${tag}: six boxes in one row, left to right, big enough to tap`, step.boxes === 6 && step.row && step.ltr && step.tall >= 44, step)
    check(`${tag}: one field under them, ready, with the phone's code suggestion and number keys`, step.focus && step.auto === 'one-time-code' && step.mode === 'numeric', step)
    check(`${tag}: a clock for the code, and a new code only after a short wait`, /הקוד בתוקף עוד 9:5\d|10:00/.test(step.clock ?? '') && step.again === true, step)
    check(`${tag}: no sideways scroll, no long dashes`, step.wide <= 1 && !step.dashes, step)
    await page.screenshot({ path: `${file}-code.png` })

    const { code } = { code: codeOf(await lastMail(STAFF)) }
    if (mode === 'day') {
      // three digits in: the boxes fill as you type
      await page.type('[data-f="code"]', code.slice(0, 3), { delay: 60 })
      await wait(300)
      const typed = await page.evaluate(() => [...document.querySelectorAll('.cb6-box')].map((b) => b.textContent).join(''))
      check(`${tag}: typing fills the boxes one by one`, typed === code.slice(0, 3), typed)
      await page.screenshot({ path: `${file}-code-typing.png` })
      // a wrong last three: shaken, told how many tries are left, emptied for the next try
      await page.type('[data-f="code"]', other(code).slice(3), { delay: 40 })
      await page.waitForSelector('.cb6.is-wrong', { timeout: 6000 }).catch(() => {})
      await wait(120)
      const bad = await page.evaluate(() => ({ msg: document.querySelector('#cb6-msg')?.textContent, value: document.querySelector('[data-f="code"]').value, focus: document.activeElement?.dataset.f }))
      check(`${tag}: a wrong code is shaken off, says 4 tries are left, and the boxes empty for the next try`, bad.msg === 'הקוד לא נכון. נשארו עוד 4 ניסיונות.' && bad.value === '' && bad.focus === 'code', bad)
      await wait(300)
      await page.screenshot({ path: `${file}-code-wrong.png` })
      await page.type('[data-f="code"]', code.slice(0, 1))
      await wait(150)
      const calm = await page.evaluate(() => ({ red: !!document.querySelector('.cb6.is-wrong'), bg: getComputedStyle(document.querySelector('.cb6-field')).boxShadow }))
      check(`${tag}: typing again calms the boxes (no red while trying again), and the field draws nothing of its own`, !calm.red && calm.bg === 'none', calm)
    }
    // the whole code at once (as the phone's suggestion or a paste puts it): in
    await page.evaluate((c) => {
      const f = document.querySelector('[data-f="code"]')
      const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set
      set.call(f, c)
      f.dispatchEvent(new Event('input', { bubbles: true }))
    }, code)
    await page.waitForSelector('.cb6.is-ok', { timeout: 6000 }).catch(() => {})
    await wait(450)
    await page.screenshot({ path: `${file}-code-ok.png` })
    await page.waitForFunction(() => location.pathname.endsWith('/kehila/admin'), { timeout: 15000 }).catch(() => {})
    const inside = await page.evaluate(() => ({ path: location.pathname, token: !!Object.keys(localStorage).find((k) => /session/i.test(k) && localStorage.getItem(k)) }))
    check(`${tag}: the whole code at once (a paste or the phone's suggestion) signs in and opens the right screen`, inside.path.endsWith('/kehila/admin') && inside.token, inside)
    check(`${tag}: no errors`, errors.length === 0, errors)
    await ctx.close()
  }
}

await browser.close().catch(() => {})
console.log(fails ? `\n${fails} FAILED` : '\nALL CHECKS PASSED')
process.exit(fails ? 1 : 0)
