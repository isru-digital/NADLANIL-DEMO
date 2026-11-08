// Confirms the "signal" light really runs along the gold accent rules, and captures frames.
// The light is each rule's ::after, moved with transform only.
import puppeteer from 'puppeteer-core'
import fs from 'node:fs'

const out = process.argv[2] ?? '_shots'
fs.mkdirSync(out, { recursive: true })
const base = process.env.BASE ?? 'http://localhost:5230/NADLANIL-DEMO'
const browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--hide-scrollbars'] })
const page = await browser.newPage()
await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 3 })
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
const results = []

const targets = [
  ['/', '.hero-copy .brand-rule.is-start', 'lockup right rule'],
  ['/', '.hero-copy .brand-rule.is-end', 'lockup left rule'],
  ['/', '.shift .eyebrow', 'eyebrow rule'],
  ['/app/crm', '.page-head .eyebrow', 'app eyebrow rule'],
  ['/f/demo', '.folder-for', 'folder cover rule'],
]
let current = ''
for (const [path, sel, name] of targets) {
  if (path !== current) {
    await page.goto(base + path, { waitUntil: 'load' })
    await wait(1800)
    current = path
  }
  const samples = []
  for (let i = 0; i < 7; i++) {
    samples.push(await page.evaluate((sel) => getComputedStyle(document.querySelector(sel), '::after').transform, sel))
    await wait(160)
  }
  const distinct = new Set(samples).size
  results.push(`${distinct >= 3 ? 'PASS' : 'FAIL'}  ${name} signals  [${distinct} positions seen]`)
}

// frames of the hero lockup, to look at
await page.goto(base + '/', { waitUntil: 'load' })
await wait(1800)
const box = await page.evaluate(() => {
  const r = document.querySelector('.hero-copy .brand-lockup').getBoundingClientRect()
  return { x: r.x - 16, y: r.y - 12, width: r.width + 32, height: r.height + 24 }
})
for (let i = 0; i < 6; i++) {
  await page.screenshot({ path: `${out}/signal-${i}.png`, clip: box })
  await wait(200)
}
console.log(results.join('\n'))
await browser.close().catch(() => {})
