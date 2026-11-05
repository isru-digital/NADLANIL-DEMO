// Headless screenshots for visual QA. Usage: node scripts/shots.mjs <outDir> <name:path[:mobile][:full]> ...
import puppeteer from 'puppeteer-core'
import fs from 'node:fs'
const [outDir, ...targets] = process.argv.slice(2)
fs.mkdirSync(outDir, { recursive: true })
const exe = ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find((p) => fs.existsSync(p))
const base = process.env.BASE ?? 'http://localhost:5230/brokers-community-demo'
const browser = await puppeteer.launch({ executablePath: exe, headless: 'new', args: ['--hide-scrollbars'] })
for (const t of targets) {
  const [name, path, ...flags] = t.split('|')
  const mobile = flags.includes('mobile'), full = flags.includes('full')
  const page = await browser.newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push(String(e)))
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text().slice(0, 300)))
  await page.setViewport(mobile ? { width: 375, height: 812, deviceScaleFactor: 2, isMobile: true, hasTouch: true } : { width: 1440, height: 900, deviceScaleFactor: 1 })
  await page.goto(base + path, { waitUntil: 'networkidle0' })
  await new Promise((r) => setTimeout(r, 2200))
  if (full) {
    // walk the page so whileInView reveals fire, then return to top
    await page.evaluate(async () => {
      for (let y = 0; y < document.body.scrollHeight; y += 500) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 140)) }
      window.scrollTo(0, 0); await new Promise((r) => setTimeout(r, 900))
    })
  }
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
  await page.screenshot({ path: `${outDir}/${name}.png`, fullPage: full })
  console.log(name, 'overflowX:', overflow, errors.length ? 'ERRORS: ' + errors.join(' | ') : 'no console errors')
  await page.close()
}
await browser.close()
