// Visual regression capture: the same set of screens, in a stable state (reduced motion, no
// living layers), saved under _visual/<label>/. Compare two labels with scripts/visual-diff.py.
// Usage: node scripts/visual.mjs <label> [baseUrl]
import puppeteer from 'puppeteer-core'
import fs from 'node:fs'

const label = process.argv[2] ?? 'run'
const base = (process.argv[3] ?? process.env.BASE ?? 'http://localhost:5230/NADLANIL-DEMO').replace(/\/$/, '')
const out = `_visual/${label}`
fs.mkdirSync(out, { recursive: true })
const browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--hide-scrollbars'] })
const wait = (ms) => new Promise((r) => setTimeout(r, ms))

const pages = [
  ['home', '/'],
  ['join', '/join'],
  ['dashboard', '/app'],
  ['community', '/app/community'],
  ['community-coop', '/app/community?topic=coop'],
  ['brokers', '/app/brokers'],
  ['crm', '/app/crm'],
  ['builder', '/app/builder'],
  ['folder', '/app/folder'],
  ['public-night', '/b/demo?t=night'],
  ['public-gallery', '/b/demo?t=gallery'],
  ['folder-public', '/f/demo'],
]
const viewports = {
  d: { width: 1440, height: 900, deviceScaleFactor: 1 },
  m: { width: 375, height: 812, deviceScaleFactor: 1, isMobile: true, hasTouch: true },
}

async function open(vp, path) {
  const page = await browser.newPage()
  await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }])
  await page.setViewport(vp)
  await page.goto(base + path, { waitUntil: 'load' })
  // the comparison switch is not part of the screens being compared
  await page.addStyleTag({ content: '.vswitch{display:none !important}' })
  await wait(1400)
  return page
}
async function settle(page) {
  await page.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight; y += 600) {
      window.scrollTo(0, y)
      await new Promise((r) => setTimeout(r, 90))
    }
    window.scrollTo(0, 0)
    await new Promise((r) => setTimeout(r, 500))
  })
}

const only = process.env.ONLY ? process.env.ONLY.split(',') : null
for (const [vk, vp] of Object.entries(viewports)) {
  for (const [name, path] of pages) {
    if (only && !only.includes(name)) continue
    const page = await open(vp, path)
    await settle(page)
    await page.screenshot({ path: `${out}/${name}-${vk}.png`, fullPage: true })
    await page.close()
  }
  // a few states with overlays
  {
    const page = await open(vp, '/app/crm')
    if (vk === 'm') await page.evaluate(() => document.querySelector('.stage-tabs .chip')?.click())
    await wait(500)
    await page.evaluate(() => [...document.querySelectorAll('.kan-card button')].find((b) => b.textContent.includes('פרסם בקהילה') && b.offsetParent)?.click())
    await wait(900)
    await page.screenshot({ path: `${out}/crm-modal-${vk}.png` })
    await page.close()
  }
  {
    const page = await open(vp, '/app/community')
    await page.evaluate(() => [...document.querySelectorAll('button')].find((b) => b.textContent.includes('התראות') && b.offsetParent)?.click())
    await wait(700)
    await page.screenshot({ path: `${out}/notices-${vk}.png` })
    await page.close()
  }
  {
    const page = await open(vp, '/join')
    await page.evaluate(() => [...document.querySelectorAll('.join-actions button')].find((b) => b.textContent.includes('המשך'))?.click())
    await wait(1800)
    await page.screenshot({ path: `${out}/join-step2-${vk}.png` })
    await page.close()
  }
}
await browser.close().catch(() => {})
console.log('saved', fs.readdirSync(out).length, 'screens to', out)
