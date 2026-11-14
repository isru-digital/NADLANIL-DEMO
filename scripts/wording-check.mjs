// The commission is always "0% עמלה למשרד" (Itzik, 14.11.2026): no screen of the demo may speak of a commission to
// the system or to the platform. Walks every screen as a community member and as an office member, reading all the
// text in the page (also text that shows only when a panel opens), and saves screenshots of the fixed places.
// Usage: node scripts/wording-check.mjs [outDir]     (BASE_GREEN overrides the address)
import puppeteer from 'puppeteer-core'
import { mkdirSync } from 'node:fs'

const green = process.env.BASE_GREEN ?? 'http://localhost:5240/NADLANIL-DEMO/green'
const out = process.argv[2] ?? '_shots/wording'
mkdirSync(out, { recursive: true })
const browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--hide-scrollbars'] })
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
const results = []
const check = (name, ok, detail = '') => {
  const line = `${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  [' + detail + ']' : ''}`
  results.push(line)
  if (!ok) console.error(line)
}
const BAD = /עמלה\s+ל(מערכת|פלטפורמה)|(המערכת|הפלטפורמה)\s+(לא|אינה|אינו)\s+(לוקח|גוזר)|(0%|אפס)\s+(עמלה\s+)?(מהעמלה\s+)?ל(מערכת|פלטפורמה)/
const routes = ['/', '/join', '/join/office', '/about', '/upgrade', '/kehila', '/kehila/join', '/app', '/app/community', '/app/brokers', '/app/crm', '/app/crm?v=properties', '/app/office', '/app/agent', '/b/demo', '/f/demo', '/agent/demo', '/o/p']

const page = await browser.newPage()
await page.setViewport({ width: 1440, height: 900 })
await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }])
for (const member of ['community', 'office']) {
  await page.goto(green + '/', { waitUntil: 'load' })
  await page.evaluate((m) => {
    localStorage.clear()
    localStorage.setItem('nadlanup-member-v1', m)
    localStorage.setItem('nadlanup-mode-v1', JSON.stringify({ mode: 'day', until: Date.now() + 9e9 }))
  }, member)
  for (const r of routes) {
    await page.goto(green + r, { waitUntil: 'load' })
    await wait(1300)
    const t = await page.evaluate(() => [document.title, document.querySelector('meta[name="description"]')?.content, document.querySelector('meta[property="og:description"]')?.content, document.body.textContent].join(' ').replace(/\s+/g, ' '))
    const hit = t.match(new RegExp(`.{0,30}(${BAD.source}).{0,20}`))
    check(`${member} ${r}: no commission "to the system"`, !hit, hit?.[0] ?? '')
  }
}

// the places that were fixed, as the visitor sees them
await page.goto(green + '/', { waitUntil: 'load' })
await wait(1500)
const home = await page.evaluate(() => ({
  hero: document.querySelector('.hg-sub')?.textContent.replace(/\s+/g, ' ').trim(),
  duo: [...document.querySelectorAll('.hg-duo-item strong')].map((s) => s.textContent.trim()),
}))
check('home hero: "0% עמלה למשרד, 100% עמלה למתווך"', home.hero?.includes('0% עמלה למשרד, 100% עמלה למתווך.'), home.hero)
check('home figures: "עמלה למשרד" and "עמלה למתווך"', home.duo.join('|') === 'עמלה למשרד|עמלה למתווך', home.duo.join('|'))
await page.screenshot({ path: `${out}/1-home-hero.png` })
await page.evaluate(() => document.querySelector('#commission').scrollIntoView({ block: 'center' }))
await wait(1800)
await page.screenshot({ path: `${out}/2-home-figures.png` })
// the wallet panel's line shows when its panel is open
await page.evaluate(() => document.querySelector('#shift').scrollIntoView({ block: 'center' }))
await wait(900)
const opened = await page.evaluate(() => {
  const all = [...document.querySelectorAll('#shift button, #shift [role="tab"], #shift [tabindex]')]
  const btn = all.find((b) => b.textContent.includes('100%'))
  btn?.click()
  btn?.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }))
  return !!btn
})
await wait(1200)
const wallet = await page.evaluate(() => document.querySelector('#shift')?.textContent.replace(/\s+/g, ' ') ?? '')
check('the 100% panel: "אין עמלה למשרד"', opened && wallet.includes('אין עמלה למשרד.') && !wallet.includes('אין עמלה למערכת'), opened ? '' : 'panel not found')
await page.screenshot({ path: `${out}/3-home-panel.png` })

const fails = results.filter((r) => r.startsWith('FAIL')).length
console.log(`${results.length - fails} passed, ${fails} failed`)
console.log(fails ? '\nSOME CHECKS FAILED' : '\nALL CHECKS PASSED')
await Promise.race([browser.close().catch(() => {}), wait(4000)])
process.exit(0)
