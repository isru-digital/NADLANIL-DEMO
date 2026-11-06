// Demo-script check for the landing builder: AI bio typing, template switch, publish, open page.
import puppeteer from 'puppeteer-core'
const out = process.argv[2] ?? '_shots'
const browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--hide-scrollbars'] })
const page = await browser.newPage()
const errors = []
page.on('pageerror', (e) => errors.push(String(e)))
page.on('console', (m) => m.type() === 'error' && errors.push(m.text().slice(0, 300)))
await page.setViewport({ width: 1440, height: 900 })
const base = process.env.BASE ?? 'http://localhost:5230/NADLANIL-DEMO'
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
const shot = (n) => page.screenshot({ path: `${out}/${n}.png` })
const clickText = async (sel, text) => {
  const ok = await page.evaluate((sel, text) => { const el = [...document.querySelectorAll(sel)].find((e) => e.textContent.includes(text) && e.offsetParent !== null); if (!el) return false; el.click(); return true }, sel, text)
  if (!ok) throw new Error(`not found: ${sel} "${text}"`)
}
const tpl = () => page.evaluate(() => document.querySelector('.browser-page .lp')?.dataset.template)
const bioLen = () => page.evaluate(() => document.querySelector('.browser-page .lp-bio')?.textContent.length)
await page.goto(base + '/app/builder', { waitUntil: 'networkidle0' })
await page.evaluate(() => localStorage.clear()); await page.reload({ waitUntil: 'networkidle0' }); await wait(1500)
await shot('builder-1-details')
await clickText('.wizard-foot button', 'הבא'); await wait(700)
await clickText('button', 'AI כותב לי ביו'); await wait(900)
const mid = await bioLen(); await shot('builder-2-typing')
await wait(4500)
const end = await bioLen(); await shot('builder-3-bio-done')
console.log('bio length mid-typing:', mid, 'after:', end)
await clickText('.step-dot', 'תבנית'); await wait(700)
const t0 = await tpl()
await clickText('.tpl', 'גלריה'); await wait(900); const t1 = await tpl(); await shot('builder-4-gallery')
await clickText('.preview-bar .seg-btn', 'קו נקי'); await wait(900); const t2 = await tpl(); await shot('builder-5-line')
await page.evaluate(() => document.querySelector('[aria-label="תצוגת נייד"]').click()); await wait(900); await shot('builder-6-mobile-preview')
console.log('templates:', t0, '->', t1, '->', t2)
await clickText('.wizard-foot button', 'פרסום הדף'); await wait(1300); await shot('builder-7-published')
await clickText('.modal button', 'פתיחת הדף'); await wait(1800); await shot('builder-8-public')
console.log('public page:', await page.evaluate(() => ({ path: location.pathname, template: document.querySelector('.lp')?.dataset.template, bio: document.querySelector('.lp-bio')?.textContent.length, overflow: document.documentElement.scrollWidth - innerWidth })))
console.log(errors.length ? 'ERRORS ' + errors.join(' | ') : 'no console errors')
await browser.close()
