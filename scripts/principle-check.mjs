// The two numbers (0% / 100%) on the home page: both inside the screen, in the right order,
// stacked on a phone and side by side on a desktop. Usage: node scripts/principle-check.mjs
import puppeteer from 'puppeteer-core'

const base = process.env.BASE ?? 'http://localhost:5230/NADLANIL-DEMO'
const browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--hide-scrollbars'] })
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
const results = []
const check = (name, ok, detail = '') => results.push(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  [' + detail + ']' : ''}`)

for (const [name, vp, stacked] of [
  ['m375', { width: 375, height: 812, deviceScaleFactor: 2, isMobile: true }, true],
  ['m320', { width: 320, height: 700, deviceScaleFactor: 2, isMobile: true }, true],
  ['t768', { width: 768, height: 1024 }, false],
  ['d1440', { width: 1440, height: 900 }, false],
]) {
  const page = await browser.newPage()
  await page.setViewport(vp)
  await page.goto(base + '/', { waitUntil: 'load' })
  await wait(1200)
  await page.evaluate(() => document.querySelector('#commission').scrollIntoView())
  await wait(3200)
  const r = await page.evaluate(() => {
    const zero = document.querySelector('.duo-item.is-zero .duo-num')
    const full = document.querySelector('.duo-item.is-full .duo-num')
    const z = zero.getBoundingClientRect()
    const f = full.getBoundingClientRect()
    return {
      zeroText: zero.textContent,
      fullText: full.textContent,
      inside: z.left >= 0 && z.right <= innerWidth && f.left >= 0 && f.right <= innerWidth,
      zeroRightOfFull: z.left > f.left,
      sameRow: Math.abs(z.top - f.top) < 40,
      overflow: document.documentElement.scrollWidth - innerWidth,
    }
  })
  check(`${name}: numbers settle on 0% and 100%`, r.zeroText === '0%' && r.fullText === '100%', `${r.zeroText} / ${r.fullText}`)
  check(`${name}: both numbers are inside the screen`, r.inside)
  check(`${name}: ${stacked ? 'stacked' : 'side by side'}`, stacked ? !r.sameRow : r.sameRow && r.zeroRightOfFull)
  check(`${name}: no horizontal overflow`, r.overflow === 0)
  await page.screenshot({ path: `_shots/duo-${name}.png` })
  await page.close()
}
console.log(results.join('\n'))
console.log(`${results.filter((r) => r.startsWith('PASS')).length}/${results.length} checks passed`)
await browser.close().catch(() => {})
