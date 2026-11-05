// End-to-end check of the demo script: publish from CRM -> card appears on the shared board.
import puppeteer from 'puppeteer-core'
import fs from 'node:fs'
const out = process.argv[2] ?? '_shots'
const mobile = process.argv.includes('mobile')
fs.mkdirSync(out, { recursive: true })
const exe = ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find((p) => fs.existsSync(p))
const base = process.env.BASE ?? 'http://localhost:5230/brokers-community-demo'
const browser = await puppeteer.launch({ executablePath: exe, headless: 'new', args: ['--hide-scrollbars'] })
const page = await browser.newPage()
const errors = []
page.on('pageerror', (e) => errors.push(String(e)))
page.on('console', (m) => m.type() === 'error' && errors.push(m.text().slice(0, 300)))
await page.setViewport(mobile ? { width: 375, height: 812, deviceScaleFactor: 2, isMobile: true, hasTouch: true } : { width: 1440, height: 900 })
const sfx = mobile ? '-mobile' : ''
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
const shot = (n) => page.screenshot({ path: `${out}/${n}${sfx}.png` })
const clickText = async (sel, text) => {
  const ok = await page.evaluate((sel, text) => {
    const el = [...document.querySelectorAll(sel)].find((e) => e.textContent.includes(text) && e.offsetParent !== null)
    if (!el) return false
    el.scrollIntoView({ block: 'center' }); el.click(); return true
  }, sel, text)
  if (!ok) throw new Error(`not found: ${sel} "${text}"`)
}
await page.goto(base + '/app/crm', { waitUntil: 'networkidle0' })
await page.evaluate(() => localStorage.clear())
await page.reload({ waitUntil: 'networkidle0' })
await wait(1500); await shot('crm')
const before = await page.evaluate(() => JSON.parse(localStorage.getItem('brokers-demo-state-v3') ?? '{}').board?.length)
await clickText('button', 'פרסם לקהילה'); await wait(900); await shot('crm-publish-modal')
await clickText('.modal button', 'פרסום ללוח השיתוף'); await wait(2400); await shot('crm-publish-success')
await clickText('.modal button', 'מעבר ללוח השיתוף'); await wait(1800); await shot('board-after-publish')
const res = await page.evaluate(() => {
  const first = document.querySelector('.board-grid .board-card')
  return { url: location.pathname + location.search, firstTitle: first?.querySelector('h3')?.textContent, fresh: first?.classList.contains('is-fresh'), count: document.querySelectorAll('.board-grid .board-card').length, overflow: document.documentElement.scrollWidth - innerWidth }
})
console.log('board before:', before, 'after:', JSON.stringify(res), errors.length ? 'ERRORS ' + errors.join(' | ') : 'no console errors')
await browser.close()
