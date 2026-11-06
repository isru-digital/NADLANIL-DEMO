// Phone performance probe. Emulates a mid-range phone (CPU slowed 4x) and reports,
// per screen: time until content is on screen, and how busy the main thread is
// while the page just sits there and while it is scrolled (lower is smoother).
// Usage: BASE=<site root> node scripts/perf-mobile.mjs [label]
import puppeteer from 'puppeteer-core'

const base = process.env.BASE ?? 'http://localhost:5231/NADLANIL-DEMO'
const label = process.argv[2] ?? 'run'
const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: 'new',
  args: ['--hide-scrollbars', '--autoplay-policy=no-user-gesture-required'],
})
const wait = (ms) => new Promise((r) => setTimeout(r, ms))

const rows = []
for (const [name, path, ready] of [
  ['home', '/', '.hero-copy h1'],
  ['community', '/app/community', '.ci-list .ci'],
  ['crm', '/app/crm', '.kan-card'],
  ['dashboard', '/app', '.stat'],
]) {
  const page = await browser.newPage()
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 3, isMobile: true, hasTouch: true })
  const cdp = await page.createCDPSession()
  await cdp.send('Performance.enable')
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 })
  const busy = async () => {
    const { metrics } = await cdp.send('Performance.getMetrics')
    const get = (n) => metrics.find((m) => m.name === n)?.value ?? 0
    return { task: get('TaskDuration'), script: get('ScriptDuration'), layout: get('LayoutDuration'), style: get('RecalcStyleDuration') }
  }
  const t0 = Date.now()
  await page.goto(base + path, { waitUntil: 'domcontentloaded', timeout: 90000 })
  await page.waitForSelector(ready, { timeout: 60000 })
  const contentMs = Date.now() - t0
  await wait(6000) // let entrance animations finish

  const a = await busy()
  await wait(4000)
  const b = await busy()
  // scroll like a thumb flick: 2400px over 3 seconds
  for (let i = 0; i < 150; i++) {
    await page.evaluate(() => window.scrollBy(0, 16))
    await wait(20)
  }
  const c = await busy()
  rows.push({
    label,
    page: name,
    contentMs,
    idleBusyPct: Math.round(((b.task - a.task) / 4) * 100),
    idleStyleMs: Math.round((b.style - a.style) * 1000),
    scrollBusyMs: Math.round((c.task - b.task) * 1000),
    scrollScriptMs: Math.round((c.script - b.script) * 1000),
    scrollLayoutMs: Math.round((c.layout - b.layout + (c.style - b.style)) * 1000),
  })
  await page.close()
}
console.table(rows)
await browser.close().catch(() => {})
