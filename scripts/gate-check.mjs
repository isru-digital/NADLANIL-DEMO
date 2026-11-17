// "האתר בבנייה" (17.11.2026): every address shows one page to a visitor; Itzik's key opens the real site and the
// browser remembers it; a wrong key does not; ?preview=off locks the browser again.
// Usage: PREVIEW_KEY=<the key> node scripts/gate-check.mjs [outDir]
//   BASE_GREEN overrides the address (the live site: https://isru-digital.github.io/NADLANIL-DEMO).
//   On this computer (localhost) the curtain is off unless ?gate=on, so the check adds it.
// The key is never written in this file: it comes from the environment.
import puppeteer from 'puppeteer-core'
import { mkdirSync } from 'node:fs'

const base = process.env.BASE_GREEN ?? 'http://localhost:5240/NADLANIL-DEMO/green'
const key = process.env.PREVIEW_KEY
if (!key) throw new Error('PREVIEW_KEY is missing')
const local = /localhost|127\.0\.0\.1/.test(base)
const out = process.argv[2] ?? '_shots/gate'
mkdirSync(out, { recursive: true })
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
const browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--hide-scrollbars'] })
let fails = 0
const check = (name, ok, info) => {
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
      logo: !!logo && logo.complete && logo.naturalWidth > 0,
      app: !!document.querySelector('.kh-hero, .app-shell, .shell, main.main, .jo, .au-card'),
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
  // a wrong key changes nothing
  await page.goto(url('/kehila', `?${local ? 'gate=on&' : ''}preview=not-the-key`), { waitUntil: 'networkidle0' })
  await wait(500)
  let s = await state(page)
  check(`${tag}: a wrong key keeps the curtain, and leaves the address clean`, s.curtain && !s.app && !s.search.includes('preview'), s)
  await ctx.close()

  // ---- Itzik: the key once, then the real site everywhere, remembered
  const mine = await browser.createBrowserContext()
  const p2 = await mine.newPage()
  await p2.setViewport(vp)
  await p2.goto(url('/kehila', `?${local ? 'gate=on&' : ''}preview=${encodeURIComponent(key)}`), { waitUntil: 'networkidle0' })
  await wait(900)
  s = await state(p2)
  check(`${tag}: the key opens the real site, and is taken out of the address`, !s.curtain && s.app && !s.search.includes('preview'), s)
  for (const path of ['/kehila/login', '/demo', '/app/community']) {
    await p2.goto(url(path), { waitUntil: 'networkidle0' })
    await wait(700)
    s = await state(p2)
    check(`${tag}: remembered on ${path} (no key needed again)`, !s.curtain, s)
  }
  if (tag === 'desktop') await p2.screenshot({ path: `${out}/${tag}-with-key.png` })
  // ?preview=off locks this browser again
  await p2.goto(url('/kehila', `?${local ? 'gate=on&' : ''}preview=off`), { waitUntil: 'networkidle0' })
  await wait(600)
  s = await state(p2)
  check(`${tag}: ?preview=off brings the curtain back`, s.curtain && !s.app, s)
  await mine.close()
}

console.log(fails ? '\nSOME CHECKS FAILED' : '\nALL CHECKS PASSED')
await Promise.race([browser.close().catch(() => {}), wait(4000)])
process.exit(0)
