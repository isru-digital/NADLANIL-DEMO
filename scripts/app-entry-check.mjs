// Three fixes from Itzik's iPhone (18.11.2026), on the green dev server:
//  1. five taps on the logo of "האתר בבנייה" open the preview key field with a FINGER (touch), not only a mouse;
//     a touch is never counted twice, a calm rhythm works, a long stop starts again
//  2. the home page's "100% גב קהילתי | 0% גזירות בעמלה" sits inside its frame, centred, on a phone and a computer
//  3. "הורדת האפליקציה" in the menu (side menu, "עוד"), at the foot of the home page and on the app's bottom line,
//     all to /install, and none of it inside the installed app
// Saves screenshots. Usage: node scripts/app-entry-check.mjs [outDir]
import puppeteer from 'puppeteer-core'
import { mkdirSync } from 'node:fs'

const green = 'http://localhost:5240/NADLANIL-DEMO/green'
const out = process.argv[2] ?? '_shots/app-entry'
mkdirSync(out, { recursive: true })
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
let fails = 0
const check = (name, ok, info) => {
  if (!ok) fails++
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok || info === undefined ? '' : '  [' + JSON.stringify(info) + ']'}`)
}
const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/131.0.6778.73 Mobile/15E148 Safari/604.1'
const PHONE = { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true }
const DESK = { width: 1440, height: 900 }
const browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--hide-scrollbars'] })

async function fresh(vp, { ua, demo, mode = 'day', app = false } = {}) {
  const ctx = await browser.createBrowserContext()
  const page = await ctx.newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push(String(e)))
  if (ua) await page.setUserAgent(ua)
  if (app) await page.evaluateOnNewDocument(() => Object.defineProperty(navigator, 'standalone', { get: () => true }))
  await page.setViewport(vp)
  await page.goto(green + '/about', { waitUntil: 'load' })
  await page.evaluate(
    (m, d) => {
      localStorage.setItem('nadlanup-mode-v1', JSON.stringify({ mode: m, until: Date.now() + 9e9 }))
      if (d) localStorage.setItem('nadlanup-demo-v1', '1')
    },
    mode,
    !!demo,
  )
  return { ctx, page, errors }
}

// ================================================================== 1. five taps with a finger
{
  const { ctx, page, errors } = await fresh(PHONE, { ua: IPHONE })
  const curtain = async () => {
    await page.goto(`${green}/app/community?gate=on`, { waitUntil: 'load' })
    await page.waitForSelector('[data-construction] [data-logo]', { timeout: 15000 })
    await wait(800)
    const r = await page.$eval('[data-logo]', (e) => {
      const b = e.getBoundingClientRect()
      return { x: b.left + b.width / 2, y: b.top + b.height / 2, w: b.width, h: b.height }
    })
    return r
  }
  const fingers = async (at, n, gap) => {
    for (let i = 0; i < n; i++) {
      await page.touchscreen.tap(at.x + (i % 2 ? 6 : -6), at.y)
      await wait(gap)
    }
  }
  const open = () => page.$('[data-key-panel]').then(Boolean)

  let at = await curtain()
  check('the logo gives a finger a wide target (44px at least each way)', at.w >= 200 && at.h >= 44, at)
  await fingers(at, 3, 150)
  check('three quick finger taps: still closed (a touch is not counted twice)', !(await open()))
  at = await curtain()
  await fingers(at, 5, 130)
  await page.waitForSelector('[data-key-panel]', { timeout: 2500 }).catch(() => {})
  const quick = await page.evaluate(() => ({ open: !!document.querySelector('[data-key-panel]'), zoom: visualViewport.scale }))
  check('five quick finger taps open the key field, and the page did not zoom', quick.open && quick.zoom === 1, quick)
  await wait(500)
  await page.screenshot({ path: `${out}/phone-curtain-taps.png` })

  at = await curtain()
  await fingers(at, 5, 900)
  check('five calm taps (almost a second apart) open it too', await open())
  at = await curtain()
  await fingers(at, 4, 200)
  await wait(1900)
  await fingers(at, 1, 100)
  check('four taps, a long stop, one more: still closed', !(await open()))
  check('curtain: no errors', errors.length === 0, errors)
  await ctx.close()
}
{
  const { ctx, page } = await fresh(DESK)
  await page.goto(`${green}/app/community?gate=on`, { waitUntil: 'load' })
  await page.waitForSelector('[data-logo]', { timeout: 15000 })
  const logo = await page.$('[data-logo]')
  for (let i = 0; i < 5; i++) {
    await logo.click()
    await wait(150)
  }
  check('on a computer, five mouse clicks still open it', !!(await page.waitForSelector('[data-key-panel]', { timeout: 2500 }).catch(() => null)))
  await ctx.close()
}

// ================================================================== 2. the two promises inside their frame
for (const [dev, vp, ua] of [
  ['desktop', DESK, null],
  ['phone', PHONE, IPHONE],
  ['small-phone', { width: 340, height: 740, deviceScaleFactor: 2, isMobile: true, hasTouch: true }, IPHONE],
]) {
  const { ctx, page, errors } = await fresh(vp, { ua })
  await page.goto(green + '/', { waitUntil: 'load' })
  await page.waitForSelector('[data-tagline]', { timeout: 15000 })
  await wait(1800)
  const t = await page.evaluate(() => {
    const pill = document.querySelector('[data-tagline]')
    const p = pill.getBoundingClientRect()
    const tags = [...pill.querySelectorAll('.hg-tag')].map((e) => e.getBoundingClientRect())
    const left = Math.min(...tags.map((r) => r.left))
    const right = Math.max(...tags.map((r) => r.right))
    const top = Math.min(...tags.map((r) => r.top))
    const bottom = Math.max(...tags.map((r) => r.bottom))
    return {
      text: pill.textContent.replace(/\s+/g, ' ').trim(),
      img: !!pill.querySelector('img'),
      inside: left >= p.left - 0.5 && right <= p.right + 0.5 && top >= p.top - 0.5 && bottom <= p.bottom + 0.5,
      centre: Math.round(Math.abs((left + right) / 2 - (p.left + p.right) / 2)),
      middle: Math.round(Math.abs((top + bottom) / 2 - (p.top + p.bottom) / 2)),
      onScreen: p.left >= 0 && p.right <= document.documentElement.clientWidth,
      wide: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    }
  })
  check(`${dev}: "100% גב קהילתי · 0% גזירות בעמלה" is in the frame, nothing else in it`, /100% גב קהילתי/.test(t.text) && /0% גזירות בעמלה/.test(t.text) && !t.img, t)
  check(`${dev}: the words sit inside the frame, centred both ways, and the frame is on screen`, t.inside && t.centre <= 2 && t.middle <= 2 && t.onScreen && t.wide <= 1, t)
  await page.screenshot({ path: `${out}/${dev}-home-top.png` })
  check(`${dev} home: no errors`, errors.length === 0, errors)
  await ctx.close()
}

// ================================================================== 3. "הורדת האפליקציה"
const findApp = (page) =>
  page.evaluate(() => {
    const seen = (el) => el && el.getBoundingClientRect().width > 0 && getComputedStyle(el).visibility !== 'hidden'
    const all = [...document.querySelectorAll('[data-getapp]')].filter(seen)
    return Object.fromEntries(all.map((e) => [e.dataset.getapp, { href: e.getAttribute('href'), h: Math.round(e.getBoundingClientRect().height), text: e.textContent.trim() }]))
  })
for (const [dev, vp, ua] of [
  ['desktop', DESK, null],
  ['phone', PHONE, IPHONE],
]) {
  for (const mode of ['day', 'night']) {
    const tag = `${dev}${mode === 'night' ? ' night' : ''}`
    const file = `${out}/${dev}${mode === 'night' ? '-night' : ''}`
    const { ctx, page, errors } = await fresh(vp, { ua, demo: true, mode })
    // inside the app (the presentation)
    await page.goto(green + '/app/community', { waitUntil: 'load' })
    await page.waitForSelector('[data-welcome]', { timeout: 15000 })
    await wait(900)
    if (dev === 'desktop') {
      const a = await findApp(page)
      check(`${tag}: "הורדת האפליקציה" in the side menu, to /install`, a.side?.href?.endsWith('/install') && a.side.h >= 44, a)
      await page.screenshot({ path: `${file}-menu.png` })
    } else {
      await page.evaluate(() => [...document.querySelectorAll('.bottom-nav .bottom-link')].at(-1).click())
      await page.waitForSelector('.more-sheet', { timeout: 4000 })
      await wait(500)
      const a = await findApp(page)
      check(`${tag}: "הורדת האפליקציה" in "עוד", to /install`, a.more?.href?.endsWith('/install') && a.more.h >= 44, a)
      await page.screenshot({ path: `${file}-more.png` })
      await page.keyboard.press('Escape')
      await wait(300)
    }
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight))
    await wait(500)
    const line = await findApp(page)
    check(`${tag}: and on the app's bottom line`, line.line?.href?.endsWith('/install') && line.line.h >= 44, line)

    // the home page's foot
    await page.goto(green + '/', { waitUntil: 'load' })
    await page.waitForSelector('[data-getapp="foot"]', { timeout: 15000 })
    await page.evaluate(() => {
      const b = document.querySelector('[data-getapp="foot"]')
      window.scrollTo({ top: b.getBoundingClientRect().top + scrollY - innerHeight / 2, behavior: 'instant' })
    })
    await wait(1200)
    const foot = await findApp(page)
    check(`${tag}: a "הורדת האפליקציה" badge at the foot of the home page, to /install`, foot.foot?.href?.endsWith('/install') && /הורדת האפליקציה/.test(foot.foot.text) && foot.foot.h >= 44, foot)
    await page.screenshot({ path: `${file}-home-foot.png` })
    if (mode === 'day') {
      await page.click('[data-getapp="foot"]')
      await page.waitForSelector('[data-page="install"]', { timeout: 8000 }).catch(() => {})
      check(`${tag}: it opens the install guide`, !!(await page.$('[data-page="install"]')))
    }
    check(`${tag}: no errors`, errors.length === 0, errors)
    await ctx.close()
  }
}
// inside the installed app: nothing to download
{
  const { ctx, page } = await fresh(PHONE, { ua: IPHONE, demo: true, app: true })
  await page.goto(green + '/app/community', { waitUntil: 'load' })
  await page.waitForSelector('[data-welcome]', { timeout: 15000 })
  await page.evaluate(() => [...document.querySelectorAll('.bottom-nav .bottom-link')].at(-1).click())
  await page.waitForSelector('.more-sheet', { timeout: 4000 })
  const inApp = await page.evaluate(() => document.querySelectorAll('[data-getapp]').length)
  await page.goto(green + '/', { waitUntil: 'load' })
  await wait(1200)
  const home = await page.evaluate(() => document.querySelectorAll('[data-getapp]').length)
  check('inside the installed app: no "הורדת האפליקציה" anywhere (menu, bottom line, home page)', inApp === 0 && home === 0, { inApp, home })
  await ctx.close()
}

await browser.close().catch(() => {})
console.log(fails ? `\n${fails} FAILED` : '\nALL CHECKS PASSED')
process.exit(fails ? 1 : 0)
