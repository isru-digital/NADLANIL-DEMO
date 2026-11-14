// A property has a category (green version): a private home, an office or a business property. It is picked when
// the property is opened, shows on the card, the board can be filtered by it, and the community post and the owner's
// page describe an office or a business property by its size, not by rooms.
// Usage: node scripts/categories-check.mjs [outDir]     (BASE_GREEN overrides the address)
import puppeteer from 'puppeteer-core'
import { mkdirSync } from 'node:fs'

const green = process.env.BASE_GREEN ?? 'http://localhost:5240/NADLANIL-DEMO/green'
const out = process.argv[2] ?? '_shots/categories'
mkdirSync(out, { recursive: true })
const browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--hide-scrollbars'] })
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
const results = []
const check = (name, ok, detail = '') => {
  const line = `${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  [' + detail + ']' : ''}`
  results.push(line)
  console.error(line)
}
const board = (page) =>
  page.evaluate(() => ({
    chips: [...document.querySelectorAll('.crm-cats .ct-chip')].map((c) => c.textContent.trim()),
    on: document.querySelector('.crm-cats .ct-chip.is-on')?.textContent.trim(),
    cards: [...document.querySelectorAll('.kan-card')].map((c) => ({ title: c.querySelector('h3')?.textContent.trim(), tag: c.querySelector('.kan-top .tag')?.textContent.trim(), meta: c.querySelector('.kan-meta')?.textContent.replace(/\s+/g, ' ').trim() })),
    ov: document.documentElement.scrollWidth - document.documentElement.clientWidth,
  }))
const form = (page) =>
  page.evaluate(() => ({
    cats: [...document.querySelectorAll('[data-f="category"] .chip')].map((c) => `${c.textContent.trim()}${c.getAttribute('aria-pressed') === 'true' ? '*' : ''}`),
    labels: [...document.querySelectorAll('.ga-row .field-label')].map((l) => l.textContent.trim()),
    extras: [...document.querySelectorAll('.ga-fields > .field:last-child .chip')].map((c) => c.textContent.trim()),
    photos: !!document.querySelector('.ga-photos'),
  }))
const pickCat = async (page, id) => {
  await page.evaluate((c) => document.querySelector(`[data-f="category"] .chip[data-cat="${c}"]`).click(), id)
  await wait(350)
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
  await page.goto(green + '/app/crm?v=properties', { waitUntil: 'load' })
  await wait(1900)

  // ---- the board: three categories, and the demo has an office and a business property
  let b = await board(page)
  check(`${d} the properties board can be filtered by category: all, private, office, business, with counts`, b.chips.join() === 'הכול8,פרטי6,משרדי1,עסקי1' && b.on === 'הכול8', b.chips.join())
  const office = b.cards.find((c) => c.title?.startsWith('משרד 120'))
  const shop = b.cards.find((c) => c.title?.startsWith('חנות 45'))
  check(`${d} an office and a business property are on the board, marked by category and measured in square metres`, office?.tag === 'משרדי' && office.meta.includes('120 מ"ר') && !office.meta.includes('חד') && shop?.tag === 'עסקי' && shop.meta.includes('45 מ"ר'), JSON.stringify([office, shop]))
  check(`${d} a private home keeps its rooms and is marked "פרטי"`, b.cards.some((c) => c.tag === 'פרטי' && c.meta.includes("חד'")) && b.cards.filter((c) => c.tag === 'פרטי').length === 6)
  await page.screenshot({ path: `${out}/${d}-1-board.png` })

  await page.evaluate(() => document.querySelector('.crm-cats .ct-chip[data-cat="office"]').click())
  await wait(600)
  b = await board(page)
  check(`${d} choosing "משרדי" shows only offices`, b.cards.length === 1 && b.cards[0].tag === 'משרדי' && b.on.startsWith('משרדי'), JSON.stringify(b.cards.map((c) => c.tag)))
  await page.screenshot({ path: `${out}/${d}-2-only-office.png` })
  await page.evaluate(() => document.querySelector('.crm-cats .ct-chip[data-cat="all"]').click())
  await wait(500)
  check(`${d} nothing scrolls sideways on the board`, b.ov <= 1)

  // ---- opening a property: the category is picked inside the form
  await page.evaluate(() => document.querySelector('[data-act="new-card"]')?.click())
  await wait(800)
  let f = await form(page)
  check(`${d} the new property form has a category, "פרטי" first`, f.cats.join() === 'פרטי*,משרדי,עסקי', f.cats.join())
  check(`${d} a private home asks for rooms`, f.labels.join() === 'עיר,חדרים,מחיר, בשקלים' && f.extras.includes('מרפסת שמש'), f.labels.join())
  await pickCat(page, 'office')
  f = await form(page)
  check(`${d} an office asks for its size in square metres, and has its own extras`, f.labels.join() === 'עיר,שטח, במ"ר,מחיר, בשקלים' && f.extras.includes('נגישות') && f.extras.includes('חזית לרחוב') && !f.extras.includes('מרפסת שמש') && !f.extras.includes('ממ"ד'), `${f.labels.join()} / ${f.extras.join()}`)
  check(`${d} photos can be added to an office too`, f.photos)
  await page.evaluate(() => document.querySelector('[data-f="category"]').scrollIntoView({ block: 'start' }))
  await wait(300)
  await page.screenshot({ path: `${out}/${d}-3-form-office.png` })

  await page.type('[data-f="sqm"]', '85')
  await page.evaluate(() => document.querySelectorAll('.ga-row input')[1]?.focus())
  await page.keyboard.type('1400000')
  await page.evaluate(() => [...document.querySelectorAll('.ga-fields > .field:last-child .chip')].filter((c) => ['חניה', 'מעלית'].includes(c.textContent.trim())).forEach((c) => c.click()))
  await page.evaluate(() => [...document.querySelectorAll('.ga-go')].find((x) => x.textContent.includes('הוספה ל-CRM')).click())
  await wait(1700)
  b = await board(page)
  const made = b.cards.find((c) => c.title === 'משרד 85 מ"ר בפתח תקווה')
  check(`${d} the new office is on the board, marked "משרדי", 85 square metres`, made?.tag === 'משרדי' && made.meta.includes('85 מ"ר') && b.chips.includes('משרדי2') && b.chips.includes('הכול9'), JSON.stringify({ made, chips: b.chips }))
  check(`${d} it was published by itself, and has the owner link`, await page.evaluate(() => { const c = [...document.querySelectorAll('.kan-card')].find((x) => x.textContent.includes('משרד 85 מ"ר')); return !!c && c.textContent.includes('פורסם בקהילה') && !!c.querySelector('[data-act="owner-link"]') }))

  // a business property
  await page.evaluate(() => document.querySelector('[data-act="new-card"]')?.click())
  await wait(800)
  await pickCat(page, 'business')
  await page.type('[data-f="sqm"]', '60')
  await page.evaluate(() => [...document.querySelectorAll('.ga-go')].find((x) => x.textContent.includes('הוספה ל-CRM')).click())
  await wait(1700)
  b = await board(page)
  check(`${d} a business property opens the same way`, b.cards.some((c) => c.title === 'נכס עסקי 60 מ"ר בפתח תקווה' && c.tag === 'עסקי') && b.chips.includes('עסקי2'), b.chips.join())
  await page.screenshot({ path: `${out}/${d}-4-board-after.png` })

  // ---- the owner's page of an office speaks in square metres
  await page.evaluate(() => [...document.querySelectorAll('.kan-card')].find((x) => x.textContent.includes('משרד 85 מ"ר'))?.querySelector('[data-act="owner-link"]')?.click())
  await wait(700)
  const url = await page.evaluate(() => document.querySelector('.ol-url input')?.value ?? '')
  await page.keyboard.press('Escape')
  await wait(400)
  const op = await browser.newPage()
  await op.setViewport(dev.vp)
  await op.goto(url, { waitUntil: 'load' })
  await wait(1500)
  const ownerCard = await op.evaluate(() => document.querySelector('.own-card')?.textContent.replace(/\s+/g, ' ').trim() ?? '')
  check(`${d} the owner's page of an office shows its size, not rooms`, ownerCard.includes('משרד 85 מ"ר בפתח תקווה') && ownerCard.includes('85 מ"ר') && !ownerCard.includes('חדרים'), ownerCard)
  await op.close()

  // ---- in the community
  await page.goto(green + '/app/community?topic=coop', { waitUntil: 'load' })
  await wait(2000)
  const post = await page.evaluate(() => {
    const p = [...document.querySelectorAll('.fb.ci, .ci')].find((c) => c.textContent.includes('משרד 85 מ"ר בפתח תקווה'))
    return { there: !!p, text: p?.textContent.replace(/\s+/g, ' ') ?? '', ov: document.documentElement.scrollWidth - document.documentElement.clientWidth }
  })
  check(`${d} the office is in the community with its size and no "חדרים"`, post.there && post.text.includes('85 מ"ר') && post.text.includes('משרד חדש אצלי') && !/\d\s*חדרים/.test(post.text) && post.ov <= 1, post.text.slice(0, 200))
  await page.screenshot({ path: `${out}/${d}-5-post.png` })

  check(`${d} no page errors`, errors.length === 0, errors.slice(0, 2).join(' | '))
  await page.close()
}

console.log(results.some((r) => r.startsWith('FAIL')) ? '\nSOME CHECKS FAILED' : '\nALL CHECKS PASSED')
await Promise.race([browser.close().catch(() => {}), wait(4000)])
process.exit(0)
