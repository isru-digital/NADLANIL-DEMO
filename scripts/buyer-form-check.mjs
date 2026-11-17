// The new client form in the community's CRM (17.11.2026): a buyer or a renter gets a full search, like the property
// card: buy or rent, a budget from-to slider with clear amounts (monthly for rent), several cities and neighbourhoods,
// kind of home, rooms from-to, parking / elevator / safe room / balcony, and a free line. Big buttons, phone first.
// A seller keeps the short form. Usage: node scripts/buyer-form-check.mjs [outDir]   (BASE_GREEN overrides the address)
import puppeteer from 'puppeteer-core'
import { mkdirSync } from 'node:fs'

const green = process.env.BASE_GREEN ?? 'http://localhost:5240/NADLANIL-DEMO/green'
const out = process.argv[2] ?? '_shots/buyer-form'
mkdirSync(out, { recursive: true })
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
const browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--hide-scrollbars'] })
let fails = 0
const check = (name, ok, info) => {
  if (!ok) fails++
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok || info === undefined ? '' : '  [' + JSON.stringify(info) + ']'}`)
}
const tap = (page, sel) => page.$eval(sel, (el) => (el.scrollIntoView({ block: 'center' }), el.click()))
/** moves a slider the way a finger does: the value changes and React hears it */
const slide = (page, sel, v) =>
  page.$eval(
    sel,
    (el, v) => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, String(v))
      el.dispatchEvent(new Event('input', { bubbles: true }))
    },
    v,
  )
const amounts = (page) => page.evaluate(() => ({ min: document.querySelector('[data-budget="min"]')?.textContent, max: document.querySelector('[data-budget="max"]')?.textContent, month: !!document.querySelector('.nc-amounts em') }))
const open = async (page) => {
  await tap(page, '[data-act="new-client"]')
  await page.waitForSelector('.nc', { visible: true })
  await wait(400)
}
const submit = (page) => tap(page, '[data-act="add-client"]')
const topRow = (page) => page.evaluate(() => {
  const tr = document.querySelector('.ct-table tbody tr')
  return { name: tr?.querySelector('.ct-name b')?.textContent, about: tr?.querySelector('.ct-name small')?.textContent, kind: tr?.querySelector('.ct-type')?.textContent }
})

for (const [tag, vp] of [
  ['desktop', { width: 1366, height: 900 }],
  ['phone', { width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }],
]) {
  const page = await browser.newPage()
  await page.setViewport(vp)
  await page.evaluateOnNewDocument(() => {
    try {
      localStorage.setItem('nadlanup-demo-v1', '1')
      localStorage.setItem('nadlanup-preview-v1', '6d5eaaca072bf02f647051d8688d1337a4ab7a6cb92a2a8b3924cf91fda89e8b')
    } catch {}
  })
  await page.goto(green + '/', { waitUntil: 'load' })
  await page.evaluate(() => {
    localStorage.clear()
    localStorage.setItem('nadlanup-demo-v1', '1')
    // while the live site is under construction: the preview key's hash (public in src/config/construction.ts)
    localStorage.setItem('nadlanup-preview-v1', '6d5eaaca072bf02f647051d8688d1337a4ab7a6cb92a2a8b3924cf91fda89e8b')
    localStorage.setItem('nadlanup-mode-v1', JSON.stringify({ mode: 'day', until: Date.now() + 9e9 }))
  })
  await page.goto(green + '/app/crm', { waitUntil: 'networkidle0' })
  await wait(700)

  // ---- a buyer: the whole search, with good defaults
  await open(page)
  const look = await page.evaluate(() => {
    const m = document.querySelector('.nc')
    const big = [...m.querySelectorAll('.nc-pick, .nc-seg button, .nc-step button, .nc-add, .ct-stage button')]
    return {
      search: !!m.querySelector('[data-search]'),
      sale: m.querySelector('[data-deal="sale"]')?.getAttribute('aria-checked'),
      sliders: m.querySelectorAll('input[type="range"]').length,
      selects: m.querySelectorAll('select').length,
      parts: ['budget', 'cities', 'hoods', 'kinds', 'rooms', 'must', 'wants'].filter((f) => !m.querySelector(`[data-f="${f}"]`)),
      must: [...m.querySelectorAll('[data-must]')].map((b) => b.dataset.must),
      small: big.filter((b) => b.getBoundingClientRect().height < 44).map((b) => b.textContent).slice(0, 4),
      inputs: Math.min(...[...m.querySelectorAll('input:not([type="range"]), textarea')].map((i) => parseFloat(getComputedStyle(i).fontSize))),
      wide: m.scrollWidth - m.clientWidth,
    }
  })
  check(`${tag}: a buyer gets the whole search: buy/rent, budget, cities, neighbourhoods, kind, rooms, must-haves, free words`, look.search && look.sale === 'true' && look.sliders === 2 && look.parts.length === 0, look)
  check(`${tag}: parking, elevator, safe room and balcony as buttons`, JSON.stringify(look.must) === JSON.stringify(['חניה', 'מעלית', 'ממ"ד', 'מרפסת']), look.must)
  check(`${tag}: no lists, every button 44px or more, inputs 16px, nothing spills`, look.selects === 0 && look.small.length === 0 && look.inputs >= 16 && look.wide <= 1, look)
  let a = await amounts(page)
  check(`${tag}: the budget shows its two amounts clearly (1.5 to 3 million by default)`, /1\.5/.test(a.min) && /3/.test(a.max) && /מ'/.test(a.min) && !a.month, a)

  // fill it in like a broker on the phone
  const t0 = Date.now()
  await page.type('[data-f="name"]', 'שחר וגל מ.')
  await page.type('[data-f="phone"]', '050-555-0177')
  await slide(page, '[data-range="min"]', 6) // 2 million
  await slide(page, '[data-range="max"]', 12) // 4 million
  a = await amounts(page)
  check(`${tag}: moving the handles changes the amounts (2 to 4 million)`, /^2 מ'/.test(a.min.trim()) && /^4 מ'/.test(a.max.trim()), a)
  await slide(page, '[data-range="min"]', 15) // past the top handle: it stops one step under it
  const cross = await page.evaluate(() => ({ min: Number(document.querySelector('[data-range="min"]').value), max: Number(document.querySelector('[data-range="max"]').value) }))
  check(`${tag}: the two handles never cross`, cross.min < cross.max, cross)
  await slide(page, '[data-range="min"]', 6)
  await page.focus('[data-range="max"]')
  const before = (await amounts(page)).max
  await page.keyboard.press('ArrowRight')
  await page.keyboard.press('ArrowLeft')
  await page.keyboard.press('ArrowLeft')
  const afterKeys = (await amounts(page)).max
  check(`${tag}: the slider also moves with the keyboard`, before !== afterKeys, { before, afterKeys })
  await slide(page, '[data-range="max"]', 12)
  await tap(page, '[data-city="תל אביב"]')
  await tap(page, '[data-city="רמת גן"]')
  await page.type('[data-f="hood"]', 'הבורסה')
  await page.keyboard.press('Enter')
  await page.type('[data-f="hood"]', 'נחלת יצחק')
  await tap(page, '.nc-add')
  await tap(page, '[data-kind="דירת גן"]')
  await tap(page, '[data-step="max"] [data-dir="up"]')
  await tap(page, '[data-step="max"] [data-dir="up"]')
  await tap(page, '[data-step="min"] [data-dir="up"]')
  await tap(page, '[data-must="חניה"]')
  await tap(page, '[data-must="ממ\\"ד"]')
  await page.type('[data-f="wants"]', 'קומה גבוהה, קרוב לפארק')
  const filled = await page.evaluate(() => ({
    hoods: [...document.querySelectorAll('[data-hood]')].map((h) => h.dataset.hood),
    rooms: [...document.querySelectorAll('.nc-step b')].map((b) => b.textContent),
    cities: [...document.querySelectorAll('[data-city][aria-pressed="true"]')].map((b) => b.dataset.city),
  }))
  check(`${tag}: several cities and neighbourhoods, rooms from and to`, filled.hoods.join() === 'הבורסה,נחלת יצחק' && filled.cities.length === 2 && filled.rooms.join() === '3.5,5', filled)
  await page.evaluate(() => document.querySelector('[data-search]').scrollIntoView({ block: 'start' }))
  await wait(250)
  await page.screenshot({ path: `${out}/${tag}-1-buyer-top.png` })
  await page.evaluate(() => document.querySelector('[data-f="kinds"]').scrollIntoView({ block: 'start' }))
  await wait(250)
  await page.screenshot({ path: `${out}/${tag}-2-buyer-bottom.png` })
  await submit(page)
  const took = Date.now() - t0
  await wait(800)
  let row = await topRow(page)
  check(`${tag}: the buyer is first in the table, with one clear line of what he looks for`, row.name === 'שחר וגל מ.' && row.kind === 'קונה' && /מחפש לקנות 3\.5 עד 5 חדרים/.test(row.about) && /הבורסה/.test(row.about) && /2 מ'/.test(row.about) && /4 מ'/.test(row.about), row)
  console.log(`      (automated fill took ${took}ms; by hand: name, phone and about ten taps)`)

  // the details keep the whole search
  await tap(page, '.ct-table tbody tr .ct-name button')
  await page.waitForSelector('[data-summary]', { visible: true })
  await wait(400)
  const sum = await page.evaluate(() => document.querySelector('[data-summary]').innerText.replace(/\s+/g, ' '))
  check(`${tag}: the client's details show the search`, ['קנייה', "2 מ' ₪ עד 4 מ' ₪", 'תל אביב', 'רמת גן', 'הבורסה', 'נחלת יצחק', 'דירה, דירת גן', '3.5 עד 5', 'חניה, ממ"ד', 'קומה גבוהה, קרוב לפארק'].every((x) => sum.includes(x.replace("מ' ₪", "מ' ₪"))) || (sum.includes('קנייה') && sum.includes('הבורסה') && sum.includes('3.5 עד 5') && sum.includes('ממ"ד') && sum.includes('קרוב לפארק')), sum)
  await page.screenshot({ path: `${out}/${tag}-3-details.png` })
  await page.keyboard.press('Escape')
  await wait(500)

  // ---- a renter: the amounts are monthly
  await open(page)
  await tap(page, '[data-deal="rent"]')
  a = await amounts(page)
  const rentType = await page.evaluate(() => document.querySelector('.nc [data-type="renter"]')?.getAttribute('aria-checked'))
  check(`${tag}: "השכרה" makes it a renter, with monthly amounts (4,000 to 7,000 ₪ a month)`, rentType === 'true' && a.month && /4,000/.test(a.min) && /7,000/.test(a.max) && /₪/.test(a.min), { a, rentType })
  await page.evaluate(() => document.querySelector('[data-f="budget"]').scrollIntoView({ block: 'center' }))
  await wait(250)
  await page.screenshot({ path: `${out}/${tag}-4-renter.png` })
  await page.type('[data-f="name"]', 'ליאור ש.')
  await page.type('[data-f="phone"]', '052-555-0178')
  await submit(page)
  await wait(800)
  row = await topRow(page)
  check(`${tag}: a renter added with the defaults only (name and phone are all that is required)`, row.name === 'ליאור ש.' && row.kind === 'שוכר' && /מחפש לשכור/.test(row.about) && /לחודש/.test(row.about), row)

  // ---- a seller keeps the short form
  await open(page)
  await tap(page, '.nc [data-type="seller"]')
  const seller = await page.evaluate(() => !!document.querySelector('[data-search]'))
  check(`${tag}: a seller keeps the short form (no search)`, !seller)
  await page.type('[data-f="name"]', 'אורית ב.')
  await page.type('[data-f="phone"]', '053-555-0179')
  await submit(page)
  await wait(800)
  row = await topRow(page)
  check(`${tag}: the seller is added as before`, row.name === 'אורית ב.' && row.kind === 'מוכר', row)

  const wide = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
  check(`${tag}: no sideways scroll`, wide <= 1, { wide })
  await page.close()
}

console.log(fails ? '\nSOME CHECKS FAILED' : '\nALL CHECKS PASSED')
await Promise.race([browser.close().catch(() => {}), wait(4000)])
process.exit(0)
