// The way in for whoever is not signed in (Itzik 18.11.2026): the app on a phone's home screen has no address bar,
// so "כניסה" must be one tap away. Checks, on a computer and a phone, day and night: the top bar's button, the card in
// the menu (the side menu; "עוד" on a phone), the card at the top of the feed, that each leads to the code screen, that
// a signed-in broker sees none of them, and that the locked door puts the way in first inside the installed app.
// Against the LOCAL test server (a real session from a code) and the green dev server. Saves screenshots.
// Usage: node scripts/sign-in-entry-check.mjs [outDir]
import puppeteer from 'puppeteer-core'
import { mkdirSync } from 'node:fs'

const API = process.env.API ?? 'http://localhost:8787'
const ORIGIN = 'http://localhost:5240'
const green = 'http://localhost:5240/NADLANIL-DEMO/green'
if (!/^http:\/\/(localhost|127\.0\.0\.1)/.test(API)) throw new Error('local test server only')
const out = process.argv[2] ?? '_shots/sign-in-entry'
mkdirSync(out, { recursive: true })
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
let fails = 0
const check = (name, ok, info) => {
  if (!ok) fails++
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok || info === undefined ? '' : '  [' + JSON.stringify(info) + ']'}`)
}
const api = async (path, { method = 'GET', body } = {}) => {
  const res = await fetch(API + path, { method, headers: { origin: ORIGIN, ...(body ? { 'content-type': 'application/json' } : {}) }, body: body ? JSON.stringify(body) : undefined })
  return res.json().catch(() => ({}))
}
const PHONE = { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true }
const DESK = { width: 1440, height: 900 }
const browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--hide-scrollbars'] })

// what of the way in is on the screen, and where each one leads
const look = (page) =>
  page.evaluate(() => {
    const seen = (el) => {
      if (!el) return false
      const r = el.getBoundingClientRect()
      const s = getComputedStyle(el)
      return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none'
    }
    const at = (sel) => [...document.querySelectorAll(sel)].find(seen)
    const href = (el) => (el ? (el.matches('a') ? el : el.querySelector('a'))?.getAttribute('href') : null)
    const bar = at('[data-signin="bar"]')
    const side = at('[data-signin="side"]')
    const feed = at('[data-signin="feed"]')
    const r = (el) => el?.getBoundingClientRect()
    return {
      bar: !!bar,
      side: !!side,
      feed: !!feed,
      hrefs: [bar, side, feed].filter(Boolean).map(href),
      barH: bar ? Math.round(r(bar).height) : 0,
      feedBtnH: feed ? Math.round(r(feed.querySelector('.si-go')).height) : 0,
      account: !!document.querySelector('.au-chip'),
      // 19.11.2026: the feed's top is light; the way in is one slim row at the top of its block, above the share line
      feedH: feed ? Math.round(r(feed).height) : 0,
      feedFirst: (() => {
        const share = document.querySelector('[data-act="share"]')
        return !feed || !share || feed.getBoundingClientRect().bottom <= share.getBoundingClientRect().top + 1
      })(),
      wide: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      dashes: /[\u2013\u2014]/.test(document.body.innerText),
    }
  })

// ------------------------------------------------------------------ not signed in (the presentation)
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
    await page.evaluate((m) => {
      localStorage.setItem('nadlanup-demo-v1', '1')
      localStorage.setItem('nadlanup-mode-v1', JSON.stringify({ mode: m, until: Date.now() + 9e9 }))
    }, mode)
    await page.goto(green + '/app/community', { waitUntil: 'load' })
    await page.waitForSelector('[data-welcome]', { timeout: 15000 })
    await wait(900)
    const l = await look(page)
    check(`${tag}: "כניסה" in the top bar`, l.bar && l.barH >= 36, l)
    if (dev === 'desktop') check(`${tag}: a sign-in card in the side menu`, l.side, l)
    check(`${tag}: a slim sign-in row at the top of the feed (above the share line), with a button big enough to tap`, l.feed && l.feedFirst && l.feedH <= 72 && l.feedBtnH >= 44, l)
    check(`${tag}: every one of them leads to the code screen`, l.hrefs.length >= 2 && l.hrefs.every((h) => h?.endsWith('/kehila/login')), l.hrefs)
    check(`${tag}: no sideways scroll, no long dashes`, l.wide <= 1 && !l.dashes, l)
    await page.screenshot({ path: `${file}-feed.png` })

    if (dev === 'phone') {
      // "עוד" opens with the way in at its top
      await page.evaluate(() => [...document.querySelectorAll('.bottom-nav .bottom-link')].at(-1).click())
      await page.waitForSelector('.more-sheet', { timeout: 4000 })
      await wait(500)
      const more = await page.evaluate(() => {
        const sheet = document.querySelector('.more-sheet')
        const card = sheet.querySelector('[data-signin="more"]')
        return { card: !!card, first: sheet.firstElementChild === card, href: card?.getAttribute('href'), h: card ? Math.round(card.getBoundingClientRect().height) : 0 }
      })
      check(`${tag}: "עוד" opens with "כניסה לחשבון" first`, more.card && more.first && more.href?.endsWith('/kehila/login') && more.h >= 44, more)
      await page.screenshot({ path: `${file}-more.png` })
      if (mode === 'day') {
        await page.click('[data-signin="more"]')
        await page.waitForSelector('[data-f="email"]', { timeout: 8000 }).catch(() => {})
        check(`${tag}: a tap on it opens the code screen, inside the app (no new window)`, (await page.evaluate(() => location.pathname)).endsWith('/kehila/login') && !!(await page.$('[data-act="login"]')))
      }
    } else if (mode === 'day') {
      await page.click('[data-signin="feed"] .si-go')
      await page.waitForSelector('[data-f="email"]', { timeout: 8000 }).catch(() => {})
      check(`${tag}: the feed's "כניסה" opens the code screen`, (await page.evaluate(() => location.pathname)).endsWith('/kehila/login'))
      await page.screenshot({ path: `${file}-login.png` })
    }
    check(`${tag}: no errors`, errors.length === 0, errors)
    await ctx.close()
  }
}

// ------------------------------------------------------------------ signed in: none of it
for (const [dev, vp] of [
  ['desktop', DESK],
  ['phone', PHONE],
]) {
  const ctx = await browser.createBrowserContext()
  const page = await ctx.newPage()
  await page.setViewport(vp)
  await api('/api/test/rate', { method: 'DELETE' })
  await api('/api/login', { method: 'POST', body: { email: 'itzik@test.local' } })
  const mail = (await api('/api/test/outbox')).outbox.filter((m) => m.to_email === 'itzik@test.local').at(-1)
  const code = mail.subject.match(/^(\d{6})/)[1]
  const s = await api('/api/session', { method: 'POST', body: { email: 'itzik@test.local', code } })
  await page.goto(green + '/', { waitUntil: 'load' })
  await page.evaluate((v) => localStorage.setItem('nadlanup-session-v1', JSON.stringify(v)), { token: s.token, member: s.member, staff: s.staff })
  await page.goto(green + '/app/community', { waitUntil: 'load' })
  await page.waitForSelector('[data-welcome]', { timeout: 15000 })
  await wait(1200)
  const l = await look(page)
  check(`signed in, ${dev}: no "כניסה" anywhere, and the account chip is there instead`, !l.bar && !l.side && !l.feed && l.account, l)
  if (dev === 'phone') {
    await page.evaluate(() => [...document.querySelectorAll('.bottom-nav .bottom-link')].at(-1).click())
    await page.waitForSelector('.more-sheet', { timeout: 4000 })
    check('signed in, phone: no sign-in card in "עוד"', !(await page.$('.more-sheet [data-signin]')))
  }
  await page.screenshot({ path: `${out}/${dev}-signed-in.png` })
  await ctx.close()
}

// ------------------------------------------------------------------ the locked door, in a browser and in the app
for (const asApp of [false, true]) {
  const ctx = await browser.createBrowserContext()
  const page = await ctx.newPage()
  await page.setViewport(PHONE)
  if (asApp) await page.emulateMediaFeatures([{ name: 'display-mode', value: 'standalone' }]).catch(() => {})
  if (asApp) await page.evaluateOnNewDocument(() => Object.defineProperty(navigator, 'standalone', { get: () => true }))
  await page.goto(green + '/app/community', { waitUntil: 'load' })
  await page.waitForSelector('[data-state="locked"]', { timeout: 15000 })
  await wait(600)
  const door = await page.evaluate(() => {
    const acts = document.querySelector('[data-state="locked"] .au-actions')
    const first = acts.querySelector('a')
    return { first: acts.dataset.first, firstHref: first.getAttribute('href'), firstText: first.textContent.trim() }
  })
  if (asApp) check('the locked door, inside the installed app: "כניסה עם קוד מהמייל" comes first', door.first === 'login' && door.firstHref.endsWith('/kehila/login') && door.firstText === 'כניסה עם קוד מהמייל', door)
  else check('the locked door, in a browser: joining comes first, as before', door.first === 'join', door)
  await page.screenshot({ path: `${out}/phone-locked${asApp ? '-app' : ''}.png` })
  await ctx.close()
}

await browser.close().catch(() => {})
console.log(fails ? `\n${fails} FAILED` : '\nALL CHECKS PASSED')
process.exit(fails ? 1 : 0)
