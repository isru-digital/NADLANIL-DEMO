// Finds what keeps the main thread busy on the phone home page while it just sits
// there, by switching effects off one at a time. Usage: node scripts/perf-probe.mjs
import puppeteer from 'puppeteer-core'

const base = process.env.BASE ?? 'http://localhost:5231/NADLANIL-DEMO'
const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: 'new',
  args: ['--hide-scrollbars', '--autoplay-policy=no-user-gesture-required'],
})
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
const variants = {
  'as built': '',
  'no life scene': '.hero-life{display:none!important}',
  'no wing flap': '.life-bird{animation:none!important}',
  'no floating cards motion': '.float-bob{animation:none!important}',
  'no signal lights': '.eyebrow::after,.brand-rule::after,.step::after{animation:none!important}',
  'no fee bar fill': '.float-fee i{animation:none!important}',
  'hero stage hidden': '.hero-stage{display:none!important}',
  'everything off': '*,*::before,*::after{animation:none!important}',
}
const rows = []
for (const [name, css] of Object.entries(variants)) {
  const page = await browser.newPage()
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 3, isMobile: true, hasTouch: true })
  const cdp = await page.createCDPSession()
  await cdp.send('Performance.enable')
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 })
  const read = async () => {
    const { metrics } = await cdp.send('Performance.getMetrics')
    const get = (n) => metrics.find((m) => m.name === n)?.value ?? 0
    return { task: get('TaskDuration'), style: get('RecalcStyleDuration'), layout: get('LayoutDuration'), script: get('ScriptDuration') }
  }
  await page.goto(base + '/', { waitUntil: 'load', timeout: 90000 })
  if (css) await page.addStyleTag({ content: css })
  await wait(7000)
  const a = await read()
  await wait(4000)
  const b = await read()
  rows.push({
    variant: name,
    busyPct: Math.round(((b.task - a.task) / 4) * 100),
    styleMs: Math.round((b.style - a.style) * 1000),
    layoutMs: Math.round((b.layout - a.layout) * 1000),
    scriptMs: Math.round((b.script - a.script) * 1000),
  })
  await page.close()
}
console.table(rows)
await browser.close().catch(() => {})
