// Confirms the "signal" light really moves along the gold accent rules, and captures frames.
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
  ['/', '.hero-copy .brand-lockup-name', '::before', 'lockup right rule'],
  ['/', '.hero-copy .brand-lockup-name', '::after', 'lockup left rule'],
  ['/', '.principle .eyebrow', '::before', 'eyebrow rule'],
  ['/', '.steps .step', '::before', 'step rule'],
  ['/app/crm', '.page-head .eyebrow', '::before', 'app eyebrow rule'],
  ['/f/demo', '.folder-for', '::before', 'folder cover rule'],
]
let current = ''
for (const [path, sel, pseudo, name] of targets) {
  if (path !== current) {
    await page.goto(base + path, { waitUntil: 'networkidle0' })
    await wait(1500)
    current = path
  }
  const samples = []
  for (let i = 0; i < 6; i++) {
    samples.push(await page.evaluate((sel, pseudo) => getComputedStyle(document.querySelector(sel), pseudo).backgroundPosition.split(',')[0].trim(), sel, pseudo))
    await wait(170)
  }
  const distinct = new Set(samples).size
  results.push(`${distinct >= 3 ? 'PASS' : 'FAIL'}  ${name} moves  [${samples[0]} ... ${samples[3]}]`)
}

// frames of the hero lockup, to look at
await page.goto(base + '/', { waitUntil: 'networkidle0' })
await wait(1600)
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
