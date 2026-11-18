// The three ways to show the parts of the approvers' screen (?nav=grid|side|tabs), next to today's row of pills, on a
// computer and on a phone. Against the LOCAL test server (server/, TEST_MODE=1) with the data admin-dash-check.mjs
// put there; run that one first. Checks that every part is reachable without sliding sideways, that a click opens
// it, that the phone's tab bar hides nothing, and that the side list closes. Saves screenshots.
// Usage: node scripts/admin-nav-check.mjs [outDir]
import puppeteer from 'puppeteer-core'
import { mkdirSync } from 'node:fs'

const API = process.env.API ?? 'http://localhost:8787'
const ORIGIN = 'http://localhost:5240'
const green = process.env.BASE_GREEN ?? 'http://localhost:5240/NADLANIL-DEMO/green'
if (!/^http:\/\/(localhost|127\.0\.0\.1)/.test(API)) throw new Error('local test server only')
const out = process.argv[2] ?? '_shots/admin-nav'
mkdirSync(out, { recursive: true })
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
let fails = 0
const check = (name, ok, info) => {
  if (!ok) fails++
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok || info === undefined ? '' : '  [' + JSON.stringify(info) + ']'}`)
}
const api = async (path, { method = 'GET', body } = {}) => {
  const res = await fetch(API + path, { method, headers: { origin: ORIGIN, ...(body ? { 'content-type': 'application/json' } : {}) }, body: body ? JSON.stringify(body) : undefined })
  return res.json()
}
const enterLink = async () => {
  await api('/api/test/rate', { method: 'DELETE' })
  await api('/api/login', { method: 'POST', body: { email: 'itzik@test.local' } })
  const mail = (await api('/api/test/outbox')).outbox.filter((m) => m.to_email === 'itzik@test.local').at(-1)
  return [...mail.html.matchAll(/href="([^"]+)"/g)].map((m) => m[1].replace(/&amp;/g, '&')).find((l) => l.includes('/kehila/enter'))
}

// one request waiting, so the count on "בקשות" shows (an invented broker, in the local test database only)
await api('/api/test/rate', { method: 'DELETE' })
await api('/api/register', { method: 'POST', body: { name: 'גלעד שמש', phone: '052-555-0199', email: 'gilad@test.local', license: '3141592', work: 'solo', office_name: '', cities: ['הרצליה'], areas: 'הרצליה פיתוח' } })

const browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--hide-scrollbars'] })
const VIEWS = ['overview', 'requests', 'people', 'breakdown', 'tools']
const STYLES = ['rail', 'grid', 'side', 'tabs']
const SIZES = { desktop: { width: 1440, height: 900 }, phone: { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true } }

for (const [dev, vp] of Object.entries(SIZES)) {
  for (const mode of ['day', 'night']) {
    const ctx = await browser.createBrowserContext()
    const page = await ctx.newPage()
    const errors = []
    page.on('pageerror', (e) => errors.push(String(e)))
    await page.setViewport(vp)
    await page.goto(green + '/', { waitUntil: 'load' })
    await page.evaluate((m) => localStorage.setItem('nadlanup-mode-v1', JSON.stringify({ mode: m, until: Date.now() + 9e9 })), mode)
    await page.goto(await enterLink(), { waitUntil: 'load' })
    await page.waitForFunction(() => location.pathname.endsWith('/kehila/admin'), { timeout: 20000 })
    for (const style of mode === 'night' ? ['grid', 'side', 'tabs'] : STYLES) {
      const tag = `${dev}${mode === 'night' ? ' night' : ''} ${style}`
      await page.goto(`${green}/kehila/admin${style === 'rail' ? '' : `?nav=${style}`}#overview`, { waitUntil: 'load' })
      await page.waitForSelector('.dk-kpi[data-kpi]', { timeout: 15000 })
      await wait(700)
      const name = `${dev}${mode === 'night' ? '-night' : ''}-${STYLES.indexOf(style)}-${style}`
      await page.screenshot({ path: `${out}/${name}.png` })
      if (mode === 'night') continue

      // every part: can it be seen without sliding sideways, and does a click open it
      const seen = await page.evaluate(() => {
        const vw = document.documentElement.clientWidth
        return [...document.querySelectorAll('[data-view]')].map((b) => {
          const r = b.getBoundingClientRect()
          return { v: b.dataset.view, inside: r.width === 0 || (r.left >= -1 && r.right <= vw + 1) }
        })
      })
      const sideways = await page.evaluate(() => [...document.querySelectorAll('[role=tablist]')].some((t) => t.scrollWidth > t.clientWidth + 2 && getComputedStyle(t).overflowX !== 'visible'))
      if (style === 'rail') check(`${tag}: today's row slides sideways on a phone (the problem)`, dev === 'desktop' ? true : sideways, sideways)
      else check(`${tag}: all five parts are there, none needs sliding sideways`, seen.length === 5 && seen.every((s) => s.inside) && !sideways, { seen, sideways })
      for (const v of VIEWS) {
        if (style === 'side' && dev === 'phone') {
          await page.click('[data-act="nav-open"]')
          await wait(260)
          await page.click(`[data-view="${v}"]`)
        } else await page.evaluate((x) => document.querySelector(`[data-view="${x}"]`).click(), v)
        await page.waitForFunction((x) => document.querySelector('[data-view-shown]')?.dataset.viewShown === x, { timeout: 4000 }, v).catch(() => {})
        const shown = await page.evaluate(() => document.querySelector('[data-view-shown]')?.dataset.viewShown)
        if (shown !== v) check(`${tag}: a click on "${v}" opens it`, false, shown)
      }
      check(`${tag}: a click on each part opens it`, true)
      check(`${tag}: no sideways scroll on the page`, (await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)) <= 1)

      if (style === 'side' && dev === 'phone') {
        await page.evaluate(() => document.querySelector('[data-view="requests"]').click())
        await wait(300)
        await page.click('[data-act="nav-open"]')
        await wait(320)
        const open = await page.evaluate(() => ({ exp: document.querySelector('[data-act="nav-open"]').getAttribute('aria-expanded'), vis: getComputedStyle(document.querySelector('.an-side-list')).visibility }))
        check(`${tag}: the button opens the list of parts`, open.exp === 'true' && open.vis === 'visible', open)
        await page.screenshot({ path: `${out}/${dev}-2-side-open.png` })
        await page.keyboard.press('Escape')
        await wait(300)
        const closed = await page.evaluate(() => getComputedStyle(document.querySelector('.an-side-list')).visibility)
        check(`${tag}: Escape closes the list`, closed === 'hidden', closed)
      }
      if (style === 'tabs' && dev === 'phone') {
        await page.evaluate(() => document.querySelector('[data-view="tools"]').click())
        await wait(400)
        await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight))
        await wait(400)
        const covered = await page.evaluate(() => {
          const bar = document.querySelector('.an-tabs').getBoundingClientRect()
          const last = [...document.querySelectorAll('#dk-view *')].filter((e) => e.children.length === 0 && e.getBoundingClientRect().height > 0).at(-1).getBoundingClientRect()
          return { barTop: Math.round(bar.top), lastBottom: Math.round(last.bottom), h: Math.round(bar.height) }
        })
        check(`${tag}: at the very bottom, the bar hides nothing`, covered.lastBottom <= covered.barTop, covered)
        check(`${tag}: the bar is big enough for a thumb`, covered.h >= 56, covered)
        await page.screenshot({ path: `${out}/${dev}-3-tabs-bottom.png` })
      }
      // one more picture: the requests part, where the work is
      await page.evaluate(() => window.scrollTo(0, 0))
      if (style === 'side' && dev === 'phone') {
        await page.click('[data-act="nav-open"]')
        await wait(260)
        await page.click('[data-view="requests"]')
      } else await page.evaluate(() => document.querySelector('[data-view="requests"]').click())
      await wait(600)
      await page.screenshot({ path: `${out}/${name}-requests.png` })
    }
    check(`${dev} ${mode}: no errors on the page`, errors.length === 0, errors)
    await ctx.close()
  }
}
await browser.close()
console.log(fails ? `\n${fails} FAILED` : '\nALL CHECKS PASSED')
process.exit(fails ? 1 : 0)
