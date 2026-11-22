// "האתר בבנייה": every address shows one page to a visitor, and a session of the staff opens the real site.
// Changed 22.11.2026: the preview key was taken out of the product in the round before and replaced by "כניסת צוות",
// so the parts that tested ?preview=<key>, a wrong key and ?preview=off were taken out of this check too. What is
// left is the visitor's side on 11 addresses, and the staff session, held the same way scripts/closed-site-check.mjs
// holds it. The sign-in itself (a code mailed to a partner) is walked by scripts/staff-entry-check.mjs.
// Usage: node scripts/gate-check.mjs [outDir]
//   BASE_GREEN overrides the address (the live site: https://isru-digital.github.io/NADLANIL-DEMO).
//   On this computer (localhost) the curtain is off unless ?gate=on, so the check adds it.
import puppeteer from 'puppeteer-core'
import { mkdirSync } from 'node:fs'

const base = process.env.BASE_GREEN ?? 'http://localhost:5240/NADLANIL-DEMO/green'
const local = /localhost|127\.0\.0\.1/.test(base)
const out = process.argv[2] ?? '_shots/gate'
mkdirSync(out, { recursive: true })
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
/** the session the server hands out for a code it mailed to a partner */
const STAFF = JSON.stringify({ token: 'test-session', member: null, staff: { name: 'בדיקה', email: 'itzik@test.local', approver: true } })
const browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--hide-scrollbars'] })
let fails = 0
let total = 0
const check = (name, ok, info) => {
  total++
  if (!ok) fails++
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok || info === undefined ? '' : '  [' + JSON.stringify(info) + ']'}`)
}
const LINE = 'אנחנו משדרגים את המערכת, נחזור בקרוב'
const PATHS = ['/', '/kehila', '/kehila/join', '/kehila/login', '/kehila/admin', '/demo', '/app', '/app/community', '/app/crm', '/about', '/b/demo']
const url = (path, q = '') => `${base}${path}${q || (local ? '?gate=on' : '')}`
const state = (page) =>
  page.evaluate((line) => {
    const c = document.querySelector('[data-construction]')
    const logo = document.querySelector('.uc-logo')
    return {
      curtain: !!c,
      line: !!c && c.textContent.includes(line),
      title: !!c && c.textContent.includes('האתר בבנייה'),
      staffButton: !!document.querySelector('[data-act="staff-entry"]'),
      logo: !!logo && logo.complete && logo.naturalWidth > 0,
      app: !!document.querySelector('.hg-hero, .kh-hero, .app-shell, .shell, main.main, .jo, .au-card'),
      search: location.search,
      wide: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      dir: document.documentElement.dir,
    }
  }, LINE)

for (const [tag, vp] of [
  ['desktop', { width: 1440, height: 900 }],
  ['phone', { width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }],
]) {
  // ---- a visitor: every address is the one page
  const ctx = await browser.createBrowserContext()
  const page = await ctx.newPage()
  await page.setViewport(vp)
  for (const path of PATHS) {
    await page.goto(url(path), { waitUntil: 'networkidle0' })
    await wait(500)
    const s = await state(page)
    check(`${tag} visitor ${path}: "האתר בבנייה" with the logo and the line, nothing of the site`, s.curtain && s.line && s.title && s.logo && !s.app && s.wide <= 1 && s.dir === 'rtl', s)
    if (path === '/kehila') await page.screenshot({ path: `${out}/${tag}-construction.png` })
  }
  // the one way in is the staff's, and nothing of the old key is left on the page
  let s = await state(page)
  check(`${tag}: the page offers "כניסת צוות", and nothing of the preview key`, s.staffButton && !s.search.includes('preview'), s)
  await ctx.close()

  // ---- the staff: a session opens the real site on every address
  const mine = await browser.createBrowserContext()
  const p2 = await mine.newPage()
  await p2.setViewport(vp)
  await p2.evaluateOnNewDocument((h) => {
    try {
      localStorage.setItem('nadlanup-session-v1', h)
    } catch {}
  }, STAFF)
  for (const path of ['/kehila', '/kehila/login', '/demo', '/app/community']) {
    await p2.goto(url(path), { waitUntil: 'networkidle0' })
    await wait(800)
    s = await state(p2)
    check(`${tag}: a session of the staff opens ${path}, with no curtain`, !s.curtain && s.wide <= 1, s)
  }
  if (tag === 'desktop') await p2.screenshot({ path: `${out}/${tag}-staff.png` })
  await mine.close()
}

console.log(`\nPASS: ${total - fails}  FAIL: ${fails}`)
console.log(fails ? 'SOME CHECKS FAILED' : `ALL CHECKS PASSED (${total})`)
await Promise.race([browser.close().catch(() => {}), wait(4000)])
process.exit(0)
