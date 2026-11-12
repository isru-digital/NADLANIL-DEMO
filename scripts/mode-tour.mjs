// A walk through the site in one mood, for looking at: saves a screenshot of every main screen.
// Usage: node scripts/mode-tour.mjs <day|night> [desktop|phone] [outDir] [scrollY]
import puppeteer from 'puppeteer-core'
import { mkdirSync } from 'node:fs'

const mode = process.argv[2] ?? 'night'
const device = process.argv[3] ?? 'desktop'
const out = process.argv[4] ?? '_shots/tour'
const scroll = Number(process.argv[5] ?? 0)
const base = process.env.BASE_GREEN ?? 'http://localhost:5240/NADLANIL-DEMO/green'
mkdirSync(out, { recursive: true })
const browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--hide-scrollbars'] })
const page = await browser.newPage()
await page.setViewport(device === 'phone' ? { width: 390, height: 844, isMobile: true, hasTouch: true } : { width: 1440, height: 900 })
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
await page.goto(base + '/', { waitUntil: 'load' })
await page.evaluate((m) => {
  localStorage.setItem('nadlanup-mode-v1', JSON.stringify({ mode: m, until: Date.now() + 9e9 }))
  localStorage.setItem('nadlanup-member-v1', 'office')
}, mode)
const routes = (process.env.ROUTES ?? '/,/join,/join/office,/about,/upgrade,/app,/app/community,/app/brokers,/app/crm,/app/builder,/app/folder,/app/office,/app/office/leads,/app/office/report,/app/office/pitch,/app/office/growth,/app/office/deal,/app/office/assistant,/app/office/benefits,/app/office/badge,/app/agent').split(',').map((r) => (r === 'home' ? '/' : r.startsWith('/') ? r : '/' + r)) // ROUTES may be written without the leading slash (Git Bash rewrites it)
for (const r of routes) {
  await page.goto(base + r, { waitUntil: 'load' })
  await wait(1900)
  if (scroll) {
    await page.evaluate((y) => window.scrollTo(0, y), scroll)
    await wait(900)
  }
  const name = (r === '/' ? 'home' : r.slice(1).replace(/\//g, '-')) + (scroll ? `-y${scroll}` : '')
  await page.screenshot({ path: `${out}/${mode}-${device}-${name}.png` })
  const ov = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
  console.log(`${mode} ${device} ${r} mode=${await page.evaluate(() => document.documentElement.dataset.mode)} overflow=${ov}`)
}
await browser.close()
