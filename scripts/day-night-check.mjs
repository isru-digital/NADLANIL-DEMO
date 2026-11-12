// Day and night: the site is light from 08:00 to 18:00 (Israel time) and dark from 18:01 to 07:59, by itself.
// The corner switch changes it at any time; a choice by hand lasts until the clock's next change, and a small clock
// button goes back to automatic. A broker's public pages are always light. The clock is faked in the page, so this
// runs the same at any hour.
// Usage: node scripts/day-night-check.mjs [outDir]     (BASE_GREEN overrides the address)
import puppeteer from 'puppeteer-core'
import { mkdirSync } from 'node:fs'

const green = process.env.BASE_GREEN ?? 'http://localhost:5240/NADLANIL-DEMO/green'
const out = process.argv[2] ?? '_shots'
mkdirSync(out, { recursive: true })
const browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--hide-scrollbars'] })
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
const results = []
const check = (name, ok, detail = '') => results.push(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  [' + detail + ']' : ''}`)

// Israel is two hours ahead of UTC in November: "08:00" there is 06:00 UTC
const at = (hhmm, day = 12) => {
  const [h, m] = hhmm.split(':').map(Number)
  return new Date(Date.UTC(2026, 10, day, h - 2, m, 20)).getTime()
}
/** A page whose clock stands at the given moment. Storage is shared between the pages of one browser. */
async function pageAt(ms, vp = { width: 1440, height: 900 }) {
  const page = await browser.newPage()
  await page.setViewport(vp)
  await page.evaluateOnNewDocument((fixed) => {
    const Real = Date
    class Fake extends Real {
      constructor(...a) {
        if (a.length) super(...a)
        else super(fixed)
      }
      static now() {
        return fixed
      }
    }
    window.Date = Fake
  }, ms)
  return page
}
const state = (page) =>
  page.evaluate(() => {
    const b = getComputedStyle(document.body)
    const lum = (c) => {
      const [r, g, bl] = c.match(/\d+/g).map(Number)
      return Math.round(0.2126 * r + 0.7152 * g + 0.0722 * bl)
    }
    return {
      mode: document.documentElement.dataset.mode,
      pressed: document.querySelector('.dn button[aria-pressed="true"]')?.textContent.trim() ?? null,
      auto: !!document.querySelector('.dn-auto'),
      sw: !!document.querySelector('.dn'),
      old: !!document.querySelector('.vswitch'),
      bg: lum(b.backgroundColor),
      text: lum(b.color),
      logo: document.querySelector('.logo img')?.getAttribute('src')?.split('/').pop(),
    }
  })
const fresh = async () => {
  const p = await browser.newPage()
  await p.goto(green + '/', { waitUntil: 'load' })
  await p.evaluate(() => localStorage.clear())
  await p.close()
}

// ---- 1. the clock
await fresh()
for (const [t, want] of [['07:59', 'night'], ['08:00', 'day'], ['12:30', 'day'], ['18:00', 'day'], ['18:01', 'night'], ['23:30', 'night'], ['03:00', 'night']]) {
  const page = await pageAt(at(t))
  await page.goto(green + '/', { waitUntil: 'load' })
  await wait(1100)
  const s = await state(page)
  check(`at ${t} the site is ${want === 'day' ? 'light' : 'dark'} by itself`, s.mode === want && s.pressed === (want === 'day' ? 'בהיר' : 'כהה') && !s.auto, JSON.stringify(s))
  if (t === '12:30') {
    check('by day: a light page, dark text, the light-page logo', s.bg > 200 && s.text < 90 && s.logo === 'nadlanup-light.png', JSON.stringify(s))
    check('the old navy / green switch is gone, the day / night switch is there', s.sw && !s.old)
    await page.screenshot({ path: `${out}/dn-day-home.png` })
  }
  if (t === '23:30') {
    check('at night: a dark page, light text, the dark-page logo', s.bg < 45 && s.text > 200 && s.logo === 'nadlanup-dark.png', JSON.stringify(s))
    await page.screenshot({ path: `${out}/dn-night-home.png` })
  }
  await page.close()
}

// ---- 2. switching by hand at noon
{
  const page = await pageAt(at('12:00'))
  await page.goto(green + '/app', { waitUntil: 'load' })
  await wait(1300)
  await page.evaluate(() => document.querySelector('.dn button[data-mode="night"]')?.click())
  await wait(700)
  let s = await state(page)
  check('the visitor can switch to dark in the middle of the day', s.mode === 'night' && s.pressed === 'כהה' && s.bg < 45, JSON.stringify(s))
  check('after a choice by hand there is a button back to automatic', s.auto)
  await page.screenshot({ path: `${out}/dn-night-app.png` })
  await page.reload({ waitUntil: 'load' })
  await wait(1300)
  s = await state(page)
  check('the choice is kept after a reload, and on another screen', s.mode === 'night' && s.auto)
  await page.goto(green + '/join/office', { waitUntil: 'load' })
  await wait(1300)
  check('... (the office page is dark too)', (await state(page)).mode === 'night')
  await page.screenshot({ path: `${out}/dn-night-office.png` })
  // a broker's public page is always light
  await page.goto(green + '/agent/demo', { waitUntil: 'load' })
  await wait(1400)
  s = await state(page)
  check("a broker's public page stays light and has no switch", s.mode === 'day' && !s.sw && s.bg > 200, JSON.stringify(s))
  await page.goto(green + '/app', { waitUntil: 'load' })
  await wait(1300)
  check('coming back from it, the choice still holds', (await state(page)).mode === 'night')
  await page.evaluate(() => document.querySelector('.dn-auto')?.click())
  await wait(700)
  s = await state(page)
  check('the clock button goes back to automatic (light at noon)', s.mode === 'day' && !s.auto && s.pressed === 'בהיר', JSON.stringify(s))
  await page.close()
}

// ---- 3. a choice by hand ends at the clock's next change
{
  let page = await pageAt(at('17:00'))
  await page.goto(green + '/', { waitUntil: 'load' })
  await wait(1100)
  await page.evaluate(() => document.querySelector('.dn button[data-mode="night"]')?.click())
  await wait(500)
  check('17:00, switched to dark by hand', (await state(page)).mode === 'night' && (await state(page)).auto)
  await page.close()
  page = await pageAt(at('17:50'))
  await page.goto(green + '/', { waitUntil: 'load' })
  await wait(1100)
  check('17:50: still dark, by the choice', (await state(page)).mode === 'night' && (await state(page)).auto)
  await page.close()
  page = await pageAt(at('18:30'))
  await page.goto(green + '/', { waitUntil: 'load' })
  await wait(1100)
  let s = await state(page)
  check('18:30: dark by the clock now, the choice has ended (no clock button)', s.mode === 'night' && !s.auto, JSON.stringify(s))
  // in the evening the visitor wants light
  await page.evaluate(() => document.querySelector('.dn button[data-mode="day"]')?.click())
  await wait(500)
  check('19:00-ish: switched to light by hand in the evening', (await state(page)).mode === 'day' && (await state(page)).auto)
  await page.close()
  page = await pageAt(at('23:00'))
  await page.goto(green + '/', { waitUntil: 'load' })
  await wait(1100)
  check('23:00: still light, by the choice', (await state(page)).mode === 'day' && (await state(page)).auto)
  await page.close()
  page = await pageAt(at('08:30', 13))
  await page.goto(green + '/', { waitUntil: 'load' })
  await wait(1100)
  s = await state(page)
  check('08:30 the next morning: light by the clock, the choice has ended', s.mode === 'day' && !s.auto, JSON.stringify(s))
  await page.close()
  page = await pageAt(at('19:00', 13))
  await page.goto(green + '/', { waitUntil: 'load' })
  await wait(1100)
  check('... and that evening it is dark again by itself', (await state(page)).mode === 'night' && !(await state(page)).auto)
  await page.close()
}

// ---- 4. on a phone the switch is reachable and nothing scrolls sideways, in both moods
for (const t of ['12:00', '22:00']) {
  await fresh()
  const page = await pageAt(at(t), { width: 390, height: 844, isMobile: true, hasTouch: true })
  for (const path of ['/', '/app', '/app/community', '/join/office', '/upgrade', '/app/office']) {
    await page.goto(green + path, { waitUntil: 'load' })
    await wait(1300)
    const s = await page.evaluate(() => {
      const r = document.querySelector('.dn')?.getBoundingClientRect()
      const nav = document.querySelector('.bottom-nav')?.getBoundingClientRect()
      return { ov: document.documentElement.scrollWidth - document.documentElement.clientWidth, in: !!r && r.left >= 0 && r.right <= innerWidth && r.bottom <= innerHeight, clear: !nav || nav.height === 0 || r.bottom <= nav.top + 1, h: r ? Math.round(document.querySelector('.dn button').getBoundingClientRect().height) : 0 }
    })
    check(`phone, ${t}, ${path}: the switch is on screen, clear of the bottom menu, and nothing scrolls sideways`, s.ov <= 1 && s.in && s.clear && s.h >= 36, JSON.stringify(s))
  }
  await page.screenshot({ path: `${out}/dn-phone-${t === '12:00' ? 'day' : 'night'}.png` })
  await page.close()
}

await browser.close().catch(() => {})
console.log(results.join('\n'))
console.log(results.some((r) => r.startsWith('FAIL')) ? '\nSOME CHECKS FAILED' : '\nALL CHECKS PASSED')
