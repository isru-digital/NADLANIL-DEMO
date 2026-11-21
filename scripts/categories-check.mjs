// A property has a group, "מגורים" or "מסחרי", and under it a kind (since 22.11.2026: the two lists of
// config/propertyTypes.ts; before that the two were called "פרטי" and "משרדי/עסקי"). Both are picked when the
// property is opened, the kind shows on the card, the board can be filtered by the group, and the community post and
// the owner's page describe a commercial property by its size, not by rooms.
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
    chips: [...document.querySelectorAll('.crm-cats .ct-chip[data-cat]')].map((c) => c.textContent.trim()),
    on: document.querySelector('.crm-cats .ct-chip.is-on')?.textContent.trim(),
    cards: [...document.querySelectorAll('.kan-card')].map((c) => ({ title: c.querySelector('h3')?.textContent.trim(), tag: c.querySelector('.kan-top .tag')?.textContent.trim(), cat: c.querySelector('.kan-top .tag')?.dataset.cat, meta: c.querySelector('.kan-meta')?.textContent.replace(/\s+/g, ' ').trim() })),
    ov: document.documentElement.scrollWidth - document.documentElement.clientWidth,
  }))
const form = (page) =>
  page.evaluate(() => ({
    cats: [...document.querySelectorAll('[data-f="category"] .pf-group')].map((c) => `${c.textContent.trim()}${c.getAttribute('aria-pressed') === 'true' ? '*' : ''}`),
    labels: [...document.querySelectorAll('.ga-fields > .field > .field-label')].map((l) => l.textContent.trim()).filter((t) => ['עיר', 'חדרים', 'שטח, במ"ר', 'מחיר, בשקלים'].includes(t)),
    extras: [...document.querySelectorAll('.ga-fields > .field:last-child .ga-pick')].map((c) => c.textContent.trim()),
    photos: !!document.querySelector('.ga-photos'),
  }))
const pickCat = async (page, id, kind) => {
  await page.evaluate((c) => document.querySelector(`[data-f="category"] .pf-group[data-cat="${c}"]`).click(), id)
  await wait(500)
  // step 2: the kind, from the list of the group that was picked
  if (kind) await page.evaluate((k) => document.querySelector(`[data-f="category"] .pf-kind[data-kind="${k}"]`).click(), kind)
  await wait(200)
}

for (const dev of [{ name: 'desktop', vp: { width: 1440, height: 900 } }, { name: 'phone', vp: { width: 390, height: 844, isMobile: true, hasTouch: true } }]) {
  const d = dev.name
  const page = await browser.newPage()
  await page.evaluateOnNewDocument(() => { try { localStorage.setItem('nadlanup-demo-v1', '1') } catch {} }) // the community is closed to visitors: these checks walk the open demo
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
  check(`${d} the properties board can be filtered by group: all, "מגורים", "מסחרי", with counts`, b.chips.join() === 'הכול8,מגורים6,מסחרי2' && b.on === 'הכול8', b.chips.join())
  const office = b.cards.find((c) => c.title?.startsWith('משרד 120'))
  const shop = b.cards.find((c) => c.title?.startsWith('חנות 45'))
  check(`${d} an office and a shop are on the board, each marked by its kind and measured in square metres`, office?.tag === 'משרד' && office.cat === 'business' && office.meta.includes('120 מ"ר') && !office.meta.includes('חד') && shop?.tag === 'חנות' && shop.cat === 'business' && shop.meta.includes('45 מ"ר'), JSON.stringify([office, shop]))
  check(`${d} a home keeps its rooms and is marked by its kind`, b.cards.some((c) => c.cat === 'home' && c.meta.includes("חד'")) && b.cards.filter((c) => c.cat === 'home').length === 6)
  await page.screenshot({ path: `${out}/${d}-1-board.png` })

  await page.evaluate(() => document.querySelector('.crm-cats .ct-chip[data-cat="business"]').click())
  await wait(600)
  b = await board(page)
  check(`${d} choosing "מסחרי" shows only those`, b.cards.length === 2 && b.cards.every((c) => c.cat === 'business') && b.on.startsWith('מסחרי'), JSON.stringify(b.cards.map((c) => c.tag)))
  await page.screenshot({ path: `${out}/${d}-2-only-office.png` })
  await page.evaluate(() => document.querySelector('.crm-cats .ct-chip[data-cat="all"]').click())
  await wait(500)
  check(`${d} nothing scrolls sideways on the board`, b.ov <= 1)

  // ---- opening a property: the category is picked inside the form
  await page.evaluate(() => document.querySelector('[data-act="new-card"]')?.click())
  await wait(800)
  let f = await form(page)
  check(`${d} the new property form opens with the two groups, none picked yet`, f.cats.join() === 'מגורים,מסחרי', f.cats.join())
  check(`${d} a home asks for rooms`, f.labels.join() === 'עיר,חדרים,מחיר, בשקלים' && f.extras.includes('מרפסת שמש'), f.labels.join())
  await pickCat(page, 'business', 'משרד')
  f = await form(page)
  check(`${d} an office asks for its size in square metres, and has its own extras`, f.labels.join() === 'עיר,שטח, במ"ר,מחיר, בשקלים' && f.extras.includes('נגישות') && f.extras.includes('חזית לרחוב') && !f.extras.includes('מרפסת שמש') && !f.extras.includes('ממ"ד'), `${f.labels.join()} / ${f.extras.join()}`)
  check(`${d} photos can be added to an office too`, f.photos)
  await page.evaluate(() => document.querySelector('[data-f="category"]').scrollIntoView({ block: 'start' }))
  await wait(300)
  await page.screenshot({ path: `${out}/${d}-3-form-office.png` })

  await page.type('[data-f="sqm"]', '85')
  await page.evaluate(() => document.querySelector('[data-f="price"]')?.focus())
  await page.keyboard.type('1400000')
  await page.evaluate(() => { document.querySelector('[data-parking="1"]')?.click(); [...document.querySelectorAll('.ga-fields > .field:last-child .ga-pick')].filter((c) => ['מעלית'].includes(c.textContent.trim())).forEach((c) => c.click()) })
  await page.evaluate(() => [...document.querySelectorAll('.ga-go')].find((x) => x.textContent.includes('הוספה ל-CRM')).click())
  await wait(1700)
  b = await board(page)
  const made = b.cards.find((c) => c.title === 'משרד 85 מ"ר בפתח תקווה')
  check(`${d} the new office is on the board, marked "משרד", 85 square metres`, made?.tag === 'משרד' && made.meta.includes('85 מ"ר') && b.chips.includes('מסחרי3') && b.chips.includes('הכול9'), JSON.stringify({ made, chips: b.chips }))
  check(`${d} it was published by itself, and has the owner link`, await page.evaluate(() => { const c = [...document.querySelectorAll('.kan-card')].find((x) => x.textContent.includes('משרד 85 מ"ר')); return !!c && c.textContent.includes('פורסם בקהילה') && !!c.querySelector('[data-act="owner-link"]') }))

  // a business property
  await page.evaluate(() => document.querySelector('[data-act="new-card"]')?.click())
  await wait(800)
  await pickCat(page, 'business', 'חנות')
  await page.type('[data-f="sqm"]', '60')
  await page.evaluate(() => [...document.querySelectorAll('.ga-go')].find((x) => x.textContent.includes('הוספה ל-CRM')).click())
  await wait(1700)
  b = await board(page)
  check(`${d} a shop opens the same way`, b.cards.some((c) => c.title === 'חנות 60 מ"ר בפתח תקווה' && c.tag === 'חנות') && b.chips.includes('מסחרי4'), b.chips.join())
  await page.screenshot({ path: `${out}/${d}-4-board-after.png` })

  // ---- the owner's page of an office speaks in square metres
  await page.evaluate(() => [...document.querySelectorAll('.kan-card')].find((x) => x.textContent.includes('משרד 85 מ"ר'))?.querySelector('[data-act="owner-link"]')?.click())
  await wait(700)
  const url = await page.evaluate(() => document.querySelector('.ol-url input')?.value ?? '')
  await page.keyboard.press('Escape')
  await wait(400)
  const op = await browser.newPage()
  await op.evaluateOnNewDocument(() => { try { localStorage.setItem('nadlanup-demo-v1', '1') } catch {} }) // the community is closed to visitors: these checks walk the open demo
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
  check(`${d} the office is in the community with its size and no "חדרים"`, post.there && post.text.includes('85 מ"ר') && post.text.includes('נכס מסחרי חדש אצלי') && !/\d\s*חדרים/.test(post.text) && post.ov <= 1, post.text.slice(0, 200))
  await page.screenshot({ path: `${out}/${d}-5-post.png` })

  check(`${d} no page errors`, errors.length === 0, errors.slice(0, 2).join(' | '))
  await page.close()
}

console.log(results.some((r) => r.startsWith('FAIL')) ? '\nSOME CHECKS FAILED' : '\nALL CHECKS PASSED')
await Promise.race([browser.close().catch(() => {}), wait(4000)])
process.exit(0)
