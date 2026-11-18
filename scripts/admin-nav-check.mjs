// The menu of the approvers' screen's parts: tabs (Itzik 18.11.2026), on a computer and on a phone, day and night.
// Against the LOCAL test server (server/, TEST_MODE=1) with the data admin-dash-check.mjs put there; run that one
// first. Checks that the tabs are the menu with nothing in the address (and that the old ?nav= choices are gone),
// that all five are seen without sliding sideways, that a click opens each part, that on a phone the bar sits at the
// bottom, hides nothing and has the day/night switch above it, and that the waiting count is read. Saves screenshots.
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
const SIZES = { desktop: { width: 1440, height: 900 }, phone: { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true } }

for (const [dev, vp] of Object.entries(SIZES)) {
  for (const mode of ['day', 'night']) {
    const tag = `${dev}${mode === 'night' ? ' night' : ''}`
    const ctx = await browser.createBrowserContext()
    const page = await ctx.newPage()
    const errors = []
    page.on('pageerror', (e) => errors.push(String(e)))
    await page.setViewport(vp)
    await page.goto(green + '/', { waitUntil: 'load' })
    await page.evaluate((m) => localStorage.setItem('nadlanup-mode-v1', JSON.stringify({ mode: m, until: Date.now() + 9e9 })), mode)
    await page.goto(await enterLink(), { waitUntil: 'load' })
    await page.waitForFunction(() => location.pathname.endsWith('/kehila/admin'), { timeout: 20000 })
    await page.goto(`${green}/kehila/admin#overview`, { waitUntil: 'load' })
    await page.waitForSelector('.dk-kpi[data-kpi]', { timeout: 15000 })
    await wait(700)
    await page.screenshot({ path: `${out}/${dev}${mode === 'night' ? '-night' : ''}-tabs.png` })
    if (mode === 'night') {
      check(`${tag}: no errors`, errors.length === 0, errors)
      await ctx.close()
      continue
    }

    const menu = await page.evaluate(() => {
      const vw = document.documentElement.clientWidth
      const lists = [...document.querySelectorAll('[role=tablist][aria-label="חלקי המסך"]')]
      const bar = document.querySelector('.an-tabs')
      return {
        lists: lists.length,
        tabs: !!bar && bar.dataset.nav === 'tabs',
        old: !!document.querySelector('.dk-nav, .an-grid, .an-side'),
        labels: [...document.querySelectorAll('.an-tabs [data-view]')].map((b) => b.querySelector('.an-long').textContent),
        inside: [...document.querySelectorAll('.an-tabs [data-view]')].every((b) => {
          const r = b.getBoundingClientRect()
          return r.left >= -1 && r.right <= vw + 1 && r.width > 40
        }),
        slides: bar.scrollWidth > bar.clientWidth + 1,
        badge: (() => {
          const b = document.querySelector('[data-view="requests"] .an-badge')
          return b ? { n: b.textContent, label: b.getAttribute('aria-label'), hidden: !!b.closest('[aria-hidden="true"]') } : null
        })(),
      }
    })
    check(`${tag}: with nothing in the address the menu is the tabs, and only the tabs`, menu.lists === 1 && menu.tabs && !menu.old, menu)
    check(`${tag}: five tabs in order, all seen, none slides sideways`, menu.labels.join('|') === 'סקירה|בקשות|מתווכים|פילוח|צוות וכלים' && menu.inside && !menu.slides, menu)
    check(`${tag}: the waiting count is on "בקשות", and a screen reader reads it`, !!menu.badge && Number(menu.badge.n) >= 1 && menu.badge.label === `${menu.badge.n} ממתינות` && !menu.badge.hidden, menu.badge)

    for (const v of VIEWS) {
      await page.evaluate((x) => document.querySelector(`[data-view="${x}"]`).click(), v)
      await page.waitForFunction((x) => document.querySelector('[data-view-shown]')?.dataset.viewShown === x, { timeout: 4000 }, v).catch(() => {})
      const shown = await page.evaluate(() => ({ v: document.querySelector('[data-view-shown]')?.dataset.viewShown, on: document.querySelector('.an-tabs .is-on')?.dataset.view, hash: location.hash }))
      check(`${tag}: a click on "${v}" opens it, marks its tab and keeps it in the address`, shown.v === v && shown.on === v && shown.hash === `#${v}`, shown)
    }
    check(`${tag}: no sideways scroll on the page`, (await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)) <= 1)

    // the old choices in the address change nothing any more
    for (const old of ['grid', 'side', 'rail']) {
      await page.goto(`${green}/kehila/admin?nav=${old}#overview`, { waitUntil: 'load' })
      await page.waitForSelector('.dk-kpi[data-kpi]', { timeout: 15000 })
      const same = await page.evaluate(() => ({ tabs: !!document.querySelector('.an-tabs'), old: !!document.querySelector('.dk-nav, .an-grid, .an-side') }))
      check(`${tag}: ?nav=${old} shows the tabs too`, same.tabs && !same.old, same)
    }

    if (dev === 'phone') {
      const bar = await page.evaluate(() => {
        const b = document.querySelector('.an-tabs').getBoundingClientRect()
        const dn = document.querySelector('.dn')?.getBoundingClientRect()
        return { pos: getComputedStyle(document.querySelector('.an-tabs')).position, bottom: Math.round(innerHeight - b.bottom), h: Math.round(b.height), top: Math.round(b.top), dnBottom: dn ? Math.round(dn.bottom) : null, short: document.querySelector('[data-view="tools"]').innerText.trim() }
      })
      check(`${tag}: the bar sits at the bottom of the screen and is big enough for a thumb`, bar.pos === 'fixed' && bar.bottom === 0 && bar.h >= 56, bar)
      check(`${tag}: the day/night switch is above the bar, not over it`, bar.dnBottom === null || bar.dnBottom <= bar.top, bar)
      check(`${tag}: "צוות וכלים" fits as "צוות"`, bar.short === 'צוות', bar.short)
      await page.evaluate(() => document.querySelector('[data-view="tools"]').click())
      await wait(400)
      await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight))
      await wait(400)
      const covered = await page.evaluate(() => {
        const top = document.querySelector('.an-tabs').getBoundingClientRect().top
        const last = [...document.querySelectorAll('#dk-view *')].filter((e) => e.children.length === 0 && e.getBoundingClientRect().height > 0).at(-1).getBoundingClientRect()
        return { barTop: Math.round(top), lastBottom: Math.round(last.bottom) }
      })
      check(`${tag}: at the very bottom, the bar hides nothing`, covered.lastBottom <= covered.barTop, covered)
      await page.screenshot({ path: `${out}/${dev}-tabs-bottom.png` })
    }
    await page.evaluate(() => {
      document.querySelector('[data-view="requests"]').click()
      window.scrollTo(0, 0)
    })
    await wait(600)
    await page.screenshot({ path: `${out}/${dev}-tabs-requests.png` })
    check(`${tag}: no errors`, errors.length === 0, errors)
    await ctx.close()
  }
}
await browser.close()
console.log(fails ? `\n${fails} FAILED` : '\nALL CHECKS PASSED')
process.exit(fails ? 1 : 0)
