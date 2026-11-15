// The community page's head at every width from a phone to a wide screen: the floating cards must never cover the
// name, the tags, the description or the buttons (Itzik saw the broker card over "מתווכים לעסקאות", 16.11.2026).
// Usage: node scripts/kehila-overlap-check.mjs [outDir]     (BASE_GREEN overrides the address)
import puppeteer from 'puppeteer-core'
import { mkdirSync } from 'node:fs'

const green = process.env.BASE_GREEN ?? 'http://localhost:5240/NADLANIL-DEMO/green'
const out = process.argv[2] ?? '_shots/kehila-overlap'
mkdirSync(out, { recursive: true })
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
const browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--hide-scrollbars'] })
const page = await browser.newPage()
await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]) // the cards stand still, so the boxes are exact
let fails = 0
const widths = [360, 390, 430, 600, 768, 900, 980, 981, 1024, 1100, 1180, 1200, 1280, 1366, 1440, 1680, 1920]
for (const night of [false, true]) {
  for (const w of widths) {
    await page.setViewport({ width: w, height: 900, isMobile: w < 768, hasTouch: w < 768 })
    await page.goto(green + '/', { waitUntil: 'load' })
    await page.evaluate((n) => localStorage.setItem('nadlanup-mode-v1', JSON.stringify({ mode: n ? 'night' : 'day', until: Date.now() + 9e9 })), night)
    await page.goto(green + '/kehila', { waitUntil: 'networkidle0' })
    await wait(900)
    const r = await page.evaluate(() => {
      const box = (el) => {
        const b = el.getBoundingClientRect()
        return { l: b.left, r: b.right, t: b.top, b: b.bottom }
      }
      const hit = (a, b) => a.l < b.r - 1 && b.l < a.r - 1 && a.t < b.b - 1 && b.t < a.b - 1
      const text = ['.kh-hero h1', '.kh-from', '.kh-sub', '.kh-desc', '.kh-cta', '.kh-note', '[data-now]', '.khv-kicker'].map((s) => [s, box(document.querySelector(s))])
      const cards = [...document.querySelectorAll('.khv-card, .khv-photo')].map((c) => [c.className, box(c)])
      const clash = []
      for (const [s, a] of text) for (const [c, b] of cards) if (hit(a, b)) clash.push(`${c.split(' ').pop()} over ${s}`)
      const h1 = document.querySelector('.kh-hero h1')
      const spill = h1.scrollWidth - h1.clientWidth
      return { clash, spill, wide: document.documentElement.scrollWidth - document.documentElement.clientWidth }
    })
    const ok = r.clash.length === 0 && r.spill <= 1 && r.wide <= 1
    if (!ok) fails++
    console.log(`${ok ? 'PASS' : 'FAIL'}  ${night ? 'night' : 'day'} ${w}px: nothing covers the words${ok ? '' : '  [' + JSON.stringify(r) + ']'}`)
    if (!night && [1024, 1100, 1200, 1280].includes(w)) await page.screenshot({ path: `${out}/day-${w}.png` })
  }
}
console.log(fails ? '\nSOME CHECKS FAILED' : '\nALL CHECKS PASSED')
await Promise.race([browser.close().catch(() => {}), wait(4000)])
process.exit(0)
