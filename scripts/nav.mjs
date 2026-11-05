// Click through every sidebar destination and confirm each page becomes visible.
import puppeteer from 'puppeteer-core'
const browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new' })
const page = await browser.newPage()
const errors = []
page.on('pageerror', (e) => errors.push(String(e)))
page.on('console', (m) => m.type() === 'error' && errors.push(m.text().slice(0, 200)))
await page.setViewport({ width: 1440, height: 900 })
const base = process.env.BASE ?? 'http://localhost:5230/brokers-community-demo'
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
await page.goto(base + '/', { waitUntil: 'networkidle0' }); await wait(1500)
await page.evaluate(() => [...document.querySelectorAll('a')].find((a) => a.textContent.includes('הצטרפות חינם')).click()); await wait(1200)
const links = await page.evaluate(() => [...document.querySelectorAll('.side-link')].map((a) => a.textContent.trim()))
for (const label of [...links, links[0], links[3], links[1]]) {
  await page.evaluate((label) => [...document.querySelectorAll('.side-link')].find((a) => a.textContent.trim() === label).click(), label)
  await wait(1100)
  const r = await page.evaluate(() => { const w = document.querySelector('.main > div'); return { path: location.pathname.replace('/brokers-community-demo', ''), opacity: getComputedStyle(w).opacity, h1: document.querySelector('.main h1')?.textContent, wrappers: document.querySelectorAll('.main > div').length } })
  console.log(label.padEnd(24), JSON.stringify(r))
}
console.log(errors.length ? 'ERRORS ' + errors.join(' | ') : 'no console errors')
await browser.close()
