// Checks the back button on every screen: it returns to the previous page,
// and falls back to a sensible parent when the page was opened directly.
// Usage: node scripts/back-flow.mjs [outDir] [mobile]
import puppeteer from 'puppeteer-core'
import fs from 'node:fs'

const out = process.argv[2] ?? '_shots'
const mobile = process.argv.includes('mobile')
fs.mkdirSync(out, { recursive: true })
const exe = ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find((p) => fs.existsSync(p))
const base = process.env.BASE ?? 'http://localhost:5230/NADLANIL-DEMO'
const root = new URL(base).pathname
const browser = await puppeteer.launch({ executablePath: exe, headless: 'new', args: ['--hide-scrollbars'] })
const page = await browser.newPage()
const errors = []
page.on('pageerror', (e) => errors.push(String(e)))
page.on('console', (m) => m.type() === 'error' && errors.push(m.text().slice(0, 300)))
await page.setViewport(mobile ? { width: 375, height: 812, deviceScaleFactor: 2, isMobile: true, hasTouch: true } : { width: 1440, height: 900 })
const sfx = mobile ? '-m' : ''
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
const results = []
const check = (name, ok, detail = '') => results.push(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  [' + detail + ']' : ''}`)
const path = () => page.evaluate((root) => (location.pathname.replace(root, '') || '/') + location.search, root)
const visible = (sel) => page.evaluate((sel) => !![...document.querySelectorAll(sel)].find((e) => e.offsetParent !== null), sel)
const clickSel = async (sel) => {
  const ok = await page.evaluate((sel) => {
    const el = [...document.querySelectorAll(sel)].find((e) => e.offsetParent !== null)
    if (!el) return false
    el.click()
    return true
  }, sel)
  if (!ok) throw new Error('not found: ' + sel)
  await wait(1100)
}
const clickText = async (sel, t) => {
  const ok = await page.evaluate(
    (sel, t) => {
      const el = [...document.querySelectorAll(sel)].find((e) => e.textContent.includes(t) && e.offsetParent !== null)
      if (!el) return false
      el.click()
      return true
    },
    sel,
    t,
  )
  if (!ok) throw new Error(`not found: ${sel} "${t}"`)
  await wait(1100)
}
const back = '.back-btn'

// 1. inside the member area: dashboard -> CRM -> community -> back, back
await page.goto(base + '/', { waitUntil: 'networkidle0' })
await wait(1200)
await clickText('a', 'כניסה')
check('entered the member area', (await path()) === '/app')
check('back button is visible in the member area', await visible(back))
await clickText(mobile ? '.bottom-link' : '.side-link', 'CRM')
await clickText(mobile ? '.bottom-link' : '.side-link', 'קהילה')
check('navigated to the community', (await path()) === '/app/community')
await page.screenshot({ path: `${out}/b-01-member-area${sfx}.png` })
await clickSel(back)
check('back returns to the CRM', (await path()) === '/app/crm', await path())
await clickSel(back)
check('back again returns to the dashboard', (await path()) === '/app', await path())
await clickSel(back)
check('back from the dashboard returns to the home page', (await path()) === '/', await path())

// 2. topic changes inside the community do not pile up in history
await page.goto(base + '/app', { waitUntil: 'networkidle0' })
await wait(1000)
await clickText(mobile ? '.bottom-link' : '.side-link', 'קהילה')
await clickText('.rail-btn', 'מחפש לקונה')
await clickText('.rail-btn', 'שאלות וידע')
await clickSel(back)
check('back from a community topic leaves the community', (await path()) === '/app', await path())

// 3. published landing page: in-page links, then back to where we came from
await page.goto(base + '/app/builder', { waitUntil: 'networkidle0' })
await wait(1200)
await clickText('button', 'פתיחת הדף המפורסם')
check('opened the published page', (await path()) === '/b/demo')
await page.evaluate(() => document.querySelector('.lp-nav a[href="#lp-contact"], .lp-hero a[href="#lp-contact"]').click())
await wait(900)
check('in-page link scrolled without changing the address', (await page.evaluate(() => location.hash === '' && scrollY > 200)))
await page.screenshot({ path: `${out}/b-02-public-page${sfx}.png` })
await clickSel(back)
check('back from the published page returns to the builder', (await path()) === '/app/builder', await path())

// 4. client folder
await page.goto(base + '/app/folder', { waitUntil: 'networkidle0' })
await wait(1200)
await clickText('a', 'תצוגת לקוח')
check('opened the client folder', (await path()) === '/f/demo')
await clickSel(back)
check('back from the client folder returns to the folder screen', (await path()) === '/app/folder', await path())

// 5. about and onboarding, reached from the home page
await page.goto(base + '/', { waitUntil: 'networkidle0' })
await wait(1000)
await page.evaluate(() => [...document.querySelectorAll('a')].find((a) => a.getAttribute('href')?.endsWith('/about')).click())
await wait(1100)
check('opened the about page', (await path()) === '/about')
await page.screenshot({ path: `${out}/b-03-about${sfx}.png` })
await clickSel(back)
check('back from about returns to the home page', (await path()) === '/', await path())
await clickText('a', 'הצטרפות חינם')
check('opened onboarding', (await path()) === '/join')
await page.screenshot({ path: `${out}/b-04-join${sfx}.png` })
await clickSel(back)
check('back from onboarding returns to the home page', (await path()) === '/', await path())

// 6. opened directly (no history inside the site): falls back to a parent page
for (const [start, expected] of [
  ['/app/crm', '/'],
  ['/b/demo', '/app/builder'],
  ['/f/demo', '/app/folder'],
  ['/about', '/'],
]) {
  const fresh = await browser.newPage()
  await fresh.setViewport(mobile ? { width: 375, height: 812, deviceScaleFactor: 2, isMobile: true, hasTouch: true } : { width: 1440, height: 900 })
  await fresh.goto(base + start, { waitUntil: 'networkidle0' })
  await wait(1200)
  await fresh.evaluate(() => [...document.querySelectorAll('.back-btn')].find((e) => e.offsetParent !== null).click())
  await wait(1200)
  const got = await fresh.evaluate((root) => location.pathname.replace(root, '') || '/', root)
  check(`direct visit to ${start} falls back to ${expected}`, got === expected, got)
  await fresh.close()
}

console.log(results.join('\n'))
console.log(errors.length ? 'CONSOLE ERRORS: ' + errors.join(' | ') : 'no console errors')
console.log(`${results.filter((r) => r.startsWith('PASS')).length}/${results.length} checks passed`)
await browser.close().catch(() => {})
