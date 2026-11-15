// The community page's own look (16.11.2026): light mint and white, the brand's dark green for the name and the main
// button, warm gold for the tags and icons, floating example cards, a "עכשיו בקהילה" line, and the office's page
// left as it was. Checks the words did not change, every example is marked, nothing scrolls sideways, the motion
// stops with reduced motion, and saves screenshots (desktop, phone, night).
// Usage: node scripts/kehila-look-check.mjs [outDir]     (BASE_GREEN overrides the address)
import puppeteer from 'puppeteer-core'
import { mkdirSync } from 'node:fs'

const green = process.env.BASE_GREEN ?? 'http://localhost:5240/NADLANIL-DEMO/green'
const out = process.argv[2] ?? '_shots/kehila-look'
mkdirSync(out, { recursive: true })
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
const results = []
const check = (name, ok, detail = '') => {
  const line = `${ok ? 'PASS' : 'FAIL'}  ${name}${detail && !ok ? '  [' + detail + ']' : ''}`
  results.push(line)
  console.log(line)
}
const browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--hide-scrollbars'] })
const rgb = (c) => (c.match(/\d+(\.\d+)?/g) ?? []).slice(0, 3).map(Number)
const light = (c) => {
  const [r, g, b] = rgb(c)
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255
}

for (const dev of [{ name: 'desktop', vp: { width: 1440, height: 900 } }, { name: 'phone', vp: { width: 390, height: 844, isMobile: true, hasTouch: true } }]) {
  const d = dev.name
  const page = await browser.newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push(String(e)))
  await page.setViewport(dev.vp)
  await page.goto(green + '/', { waitUntil: 'load' })
  await page.evaluate(() => {
    localStorage.clear()
    localStorage.setItem('nadlanup-mode-v1', JSON.stringify({ mode: 'day', until: Date.now() + 9e9 }))
  })
  await page.goto(green + '/kehila', { waitUntil: 'networkidle0' })
  await wait(2200)
  const look = await page.evaluate(() => {
    const hero = document.querySelector('.kh-hero')
    const h1 = hero.querySelector('h1')
    const pills = [...document.querySelectorAll('.kh-sub li')]
    const main = document.querySelector('.kh-cta .khv-primary')
    return {
      heroBg: getComputedStyle(document.querySelector('.khv')).backgroundColor,
      h1Color: getComputedStyle(h1).color,
      pillBg: getComputedStyle(pills[0]).backgroundColor,
      mainBg: getComputedStyle(main).backgroundColor,
      cta: [...document.querySelectorAll('.kh-cta a')].map((a) => [a.textContent.trim(), a.pathname.replace(/^\/NADLANIL-DEMO(\/green)?/, '')]),
      h1: h1.textContent.trim(),
      from: document.querySelector('.kh-from').textContent.replace(/\s+/g, ' ').trim(),
      sub: pills.map((p) => p.textContent.trim()).join('|'),
      desc: document.querySelector('.kh-desc').textContent.trim(),
      note: document.querySelector('.kh-note').textContent.trim(),
      kicker: document.querySelector('.khv-kicker').textContent.trim(),
      cards: [...document.querySelectorAll('.khv-card')].map((c) => ({ text: c.innerText.replace(/\s+/g, ' '), sample: !!c.querySelector('.khv-sample') })),
      map: !!document.querySelector('.jo-grid, .kh-map'),
      brand: document.querySelector('.kh-brand')?.textContent.replace(/\s+/g, ' ').trim(),
    }
  })
  check(`${d} light background, the name in dark green, gold tags, the main button dark green`, light(look.heroBg) > 0.9 && light(look.h1Color) < 0.3 && rgb(look.pillBg)[0] > rgb(look.pillBg)[2] + 25 && light(look.mainBg) < 0.3, JSON.stringify([look.heroBg, look.h1Color, look.pillBg, look.mainBg]))
  check(`${d} the words are the same: name, "מבית NadlanUP", tags, description, note, kicker, buttons`, look.h1 === 'מתווכים לעסקאות' && look.from === 'מבית NadlanUP' && look.sub === 'נכסים|קונים|שיתופי פעולה' && look.desc === 'הקהילה החינמית שמחברת בין מתווכים מכל הארץ, לשיתוף נכסים, איתור קונים, התייעצויות ויצירת הזדמנויות עסקיות.' && look.note === 'ההצטרפות באישור: נרשמים, הצוות מאשר, ומקבלים מייל עם כניסה.' && look.kicker === 'הקהילה החינמית של המתווכים' && JSON.stringify(look.cta) === JSON.stringify([['הצטרפות לקהילה, בחינם', '/kehila/join'], ['כניסה לחברים', '/kehila/login']]), JSON.stringify(look))
  check(`${d} the logo and name in the top bar are unchanged`, look.brand?.includes('מתווכים לעסקאות') && look.brand?.includes('מבית NadlanUP'), look.brand)
  check(`${d} four floating cards (broker, new property, buyer for 4 rooms, joint deal), each marked "דוגמה"`, look.cards.length === 4 && look.cards.every((c) => c.sample) && look.cards.some((c) => c.text.includes('קונה מחפש 4 חדרים')) && look.cards.some((c) => c.text.includes('שיתוף פעולה')), JSON.stringify(look.cards))
  check(`${d} no map in the head of the page`, !look.map)
  // the line of "now in the community" changes
  const now1 = await page.evaluate(() => document.querySelector('[data-now-text]')?.textContent)
  await wait(4200)
  const now2 = await page.evaluate(() => document.querySelector('[data-now-text]')?.textContent)
  const nowMarked = await page.evaluate(() => !!document.querySelector('[data-now]').textContent.includes('עכשיו בקהילה') && (getComputedStyle(document.querySelector('[data-now] .khv-sample')).display !== 'none' || window.innerWidth < 561))
  check(`${d} "עכשיו בקהילה" changes gently from one example to the next`, !!now1 && !!now2 && now1 !== now2 && nowMarked, `${now1} / ${now2}`)
  check(`${d} the cards float`, await page.evaluate(() => getComputedStyle(document.querySelector('.khv-float')).animationName === 'khv-bob'))
  const icons = await page.evaluate(() => ({ pillars: document.querySelectorAll('.khv-pillar .khv-pillar-icon svg.khi').length, list: document.querySelectorAll('.kh-list svg.khi').length, lucide: document.querySelectorAll('.khv-pillar svg.lucide, .kh-list li > i svg.lucide').length }))
  check(`${d} the page's own icons on the pillars and the list, not the standard set`, icons.pillars === 3 && icons.list === 6 && icons.lucide === 0, JSON.stringify(icons))
  check(`${d} nothing scrolls sideways`, (await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)) <= 1)
  await page.screenshot({ path: `${out}/${d}-1-head.png` })
  // walk down, so every part comes into view
  const H = await page.evaluate(() => document.documentElement.scrollHeight)
  for (let y = 0; y < H; y += 500) {
    await page.evaluate((v) => window.scrollTo(0, v), y)
    await wait(160)
  }
  await wait(900)
  await page.evaluate(() => document.querySelector('.khv-bento').scrollIntoView({ block: 'start' }))
  await page.evaluate(() => window.scrollBy(0, -40))
  await wait(700)
  await page.screenshot({ path: `${out}/${d}-2-pillars.png` })
  await page.evaluate(() => document.querySelector('.kh-list').scrollIntoView({ block: 'center' }))
  await wait(700)
  await page.screenshot({ path: `${out}/${d}-3-inside.png` })
  await page.evaluate(() => window.scrollTo(0, 0))
  await wait(600)
  await page.screenshot({ path: `${out}/${d}-4-full.png`, fullPage: true })

  // night
  await page.evaluate(() => localStorage.setItem('nadlanup-mode-v1', JSON.stringify({ mode: 'night', until: Date.now() + 9e9 })))
  await page.reload({ waitUntil: 'networkidle0' })
  await wait(1800)
  await page.screenshot({ path: `${out}/${d}-5-night.png` })
  // reduced motion: nothing floats
  await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }])
  await page.evaluate(() => localStorage.setItem('nadlanup-mode-v1', JSON.stringify({ mode: 'day', until: Date.now() + 9e9 })))
  await page.reload({ waitUntil: 'networkidle0' })
  await wait(1500)
  check(`${d} with reduced motion the cards stand still`, await page.evaluate(() => getComputedStyle(document.querySelector('.khv-float')).animationName === 'none'))
  await page.emulateMediaFeatures([])
  check(`${d} no page errors`, errors.length === 0, errors.slice(0, 2).join(' | '))

  // the office's page keeps its look
  await page.goto(green + '/', { waitUntil: 'networkidle0' })
  await wait(1200)
  const office = await page.evaluate(() => ({ khv: !!document.querySelector('.khv'), styled: [...document.styleSheets].length }))
  check(`${d} the office's page does not take the community's look`, !office.khv)
  await page.screenshot({ path: `${out}/${d}-6-office-home.png` })
  await page.close()
}

const fails = results.filter((r) => r.startsWith('FAIL')).length
console.log(`\n${results.length - fails} passed, ${fails} failed`)
console.log(fails ? 'SOME CHECKS FAILED' : 'ALL CHECKS PASSED')
await Promise.race([browser.close().catch(() => {}), wait(4000)])
process.exit(0)
