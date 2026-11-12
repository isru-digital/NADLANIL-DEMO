// The CRM's clients as one simple table (green version): search, types with counts, a match button that changes with
// the type, a details window with quick marks, a simulated pull from Yad2, the office's extra fields and types, and
// a short list of cards on a phone.
// Usage: node scripts/clients-check.mjs [outDir]     (BASE_GREEN overrides the address)
import puppeteer from 'puppeteer-core'
import { mkdirSync } from 'node:fs'

const green = process.env.BASE_GREEN ?? 'http://localhost:5240/NADLANIL-DEMO/green'
const out = process.argv[2] ?? '_shots/clients'
mkdirSync(out, { recursive: true })
const browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--hide-scrollbars'] })
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
const results = []
const check = (name, ok, detail = '') => {
  const line = `${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  [' + detail + ']' : ''}`
  results.push(line)
  if (!ok) console.error(line)
}
const overflow = (page) => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
const rows = (page) =>
  page.evaluate(() =>
    [...document.querySelectorAll('.ct-table tbody tr')].map((tr) => ({
      id: tr.dataset.id,
      type: tr.dataset.type,
      name: tr.querySelector('.ct-name b')?.textContent.trim(),
      kind: tr.querySelector('.ct-type')?.textContent.trim(),
      phone: tr.querySelector('.ct-phone')?.textContent.trim(),
      btn: tr.querySelector('.ct-act button')?.textContent.trim(),
    })),
  )
const toast = (page) => page.evaluate(() => document.querySelector('.toast, [role="status"].toast, .toaster')?.textContent.trim() ?? '')
const closeModal = async (page) => {
  await page.keyboard.press('Escape')
  await wait(500)
}

for (const dev of [{ name: 'desktop', vp: { width: 1440, height: 900 } }, { name: 'phone', vp: { width: 390, height: 844, isMobile: true, hasTouch: true } }]) {
  const d = dev.name
  const phone = d === 'phone'
  const page = await browser.newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push(String(e)))
  page.on('console', (m) => m.type() === 'error' && !/favicon|Failed to load resource/.test(m.text()) && errors.push(m.text()))
  await page.setViewport(dev.vp)
  await page.goto(green + '/', { waitUntil: 'load' })
  await page.evaluate(() => {
    localStorage.clear()
    localStorage.setItem('nadlanup-mode-v1', JSON.stringify({ mode: 'day', until: Date.now() + 9e9 }))
  })
  const shot = async (name) => {
    await wait(300)
    await page.screenshot({ path: `${out}/${d}-${name}.png` })
  }

  // ---------------------------------------------------------------- a community member
  await page.goto(green + '/app/crm', { waitUntil: 'load' })
  await wait(1700)
  let st = await page.evaluate(() => ({
    tabs: [...document.querySelectorAll('.seg .seg-btn')].map((b) => b.textContent.trim()),
    on: document.querySelector('.seg .seg-btn.is-active')?.textContent.trim(),
    board: !!document.querySelector('.kanban'),
    table: !!document.querySelector('.ct-table'),
    head: [...document.querySelectorAll('.ct-table thead th')].filter((x) => !x.querySelector('.sr-only')).map((x) => x.textContent.trim()),
    bar: { add: document.querySelector('[data-act="new-client"]')?.textContent.trim(), search: !!document.querySelector('.ct-search input'), sort: document.querySelector('.ct-sort select option:checked')?.textContent.trim(), pull: document.querySelector('[data-act="yad2"]')?.textContent.trim() },
    chips: [...document.querySelectorAll('button.ct-chip')].map((x) => x.textContent.trim()),
    locked: [...document.querySelectorAll('.ct-chip.is-locked')].map((x) => x.textContent.trim()),
    office: document.querySelector('.ct > .ct-office')?.textContent.replace(/\s+/g, ' ').trim() ?? '',
  }))
  check(`${d} the clients are a table, not the board, and it is the first tab`, st.table && !st.board && st.on === 'לקוחות' && st.tabs.join() === 'לקוחות,נכסים', JSON.stringify(st.tabs))
  check(`${d} at the top: "לקוח חדש", a search field, sorted by "פעילים לאחרונה", and the pull from Yad2`, st.bar.add === 'לקוח חדש' && st.bar.search && st.bar.sort === 'פעילים לאחרונה' && st.bar.pull === 'משוך נכסים מיד 2', JSON.stringify(st.bar))
  check(`${d} the columns: name, type, phone, last update`, st.head.join() === 'שם הלקוח,סוג,טלפון,עדכון אחרון', st.head.join())
  check(`${d} four types to filter by, each with its count`, st.chips.join() === 'קונים4,מוכרים3,שוכרים2,משכירים2', st.chips.join())
  check(`${d} the office's four types are there, locked`, st.locked.join() === 'ניהול נכסים,מסחרי,מגרש,אנשי מקצוע', st.locked.join())
  check(`${d} the office's fields are marked "זמין לחברי המשרד", with the way to the office`, st.office.includes('זמין לחברי המשרד') && st.office.includes('דירוג') && st.office.includes('פולואפ') && st.office.includes('תאריך יצירה') && st.office.includes('שדרג למשרד NadlanUP'), st.office)
  let r = await rows(page)
  check(`${d} eleven clients, none of the office's types`, r.length === 11 && r.every((x) => ['buyer', 'seller', 'renter', 'landlord'].includes(x.type)), `${r.length}`)
  check(`${d} the button follows the type`, r.every((x) => x.btn === (x.type === 'buyer' || x.type === 'renter' ? 'נכסים מתאימים' : 'קונים מתאימים')), JSON.stringify(r.map((x) => [x.kind, x.btn])))
  check(`${d} sorted by the last update, newest first`, r[0].id === 'k1' && r.at(-1).id === 'k11', r.map((x) => x.id).join())
  check(`${d} nothing scrolls sideways`, (await overflow(page)) <= 1)
  if (phone) {
    const card = await page.evaluate(() => {
      const tr = document.querySelector('.ct-table tbody tr')
      const vis = (el) => !!el && getComputedStyle(el).display !== 'none' && el.getBoundingClientRect().width > 0
      return { grid: getComputedStyle(tr).display, name: vis(tr.querySelector('.ct-name b')), type: vis(tr.querySelector('.ct-type')), phone: vis(tr.querySelector('.ct-phone a')), btn: vis(tr.querySelector('.ct-act button')), last: vis(tr.querySelector('.ct-last')), head: vis(document.querySelector('.ct-table thead')), h: Math.round(tr.getBoundingClientRect().height), btnH: Math.round(tr.querySelector('.ct-act button').getBoundingClientRect().height) }
    })
    check('phone: the table is a short list of cards: name, type, phone and the match button', card.grid === 'grid' && card.name && card.type && card.phone && card.btn && !card.last && !card.head && card.h < 150, JSON.stringify(card))
  }
  await shot('1-table-community')

  // search by name and by phone
  await page.type('.ct-search input', 'אבירם')
  await wait(400)
  r = await rows(page)
  check(`${d} search by name`, r.length === 1 && r[0].name === 'משפחת אבירם', r.map((x) => x.name).join())
  await page.evaluate(() => { const i = document.querySelector('.ct-search input'); i.focus(); i.select() })
  await page.keyboard.press('Backspace')
  await page.type('.ct-search input', '0105')
  await wait(400)
  r = await rows(page)
  check(`${d} search by phone`, r.length === 1 && r[0].name === 'אבי ד.', r.map((x) => x.name).join())
  await page.evaluate(() => { const i = document.querySelector('.ct-search input'); i.focus(); i.select() })
  await page.keyboard.press('Backspace')
  await wait(300)

  // several types together
  await page.evaluate(() => document.querySelector('button.ct-chip[data-type="renter"]').click())
  await page.evaluate(() => document.querySelector('button.ct-chip[data-type="landlord"]').click())
  await wait(400)
  r = await rows(page)
  check(`${d} two types picked together show both`, r.length === 4 && r.every((x) => x.type === 'renter' || x.type === 'landlord'), r.map((x) => x.kind).join())
  await shot('2-filter-two-types')
  await page.evaluate(() => document.querySelector('.ct-clear').click())
  await wait(300)

  // matches: a buyer gets properties, a seller gets buyers
  await page.evaluate(() => document.querySelector('tr[data-id="k1"] [data-act="match"]').click())
  await wait(700)
  st = await page.evaluate(() => ({ title: document.querySelector('.modal h2, .modal-title')?.textContent.trim() ?? '', n: document.querySelectorAll('.ct-m').length, demo: document.querySelector('.ct-matches .ct-demo')?.textContent ?? '', det: !!document.querySelector('.ct-det') }))
  check(`${d} "נכסים מתאימים" opens matches from the community for a buyer, marked as demo data`, st.title.includes('נכסים מתאימים') && st.n >= 2 && st.demo.includes('נתוני דמו') && !st.det, JSON.stringify(st))
  await shot('3-matches-buyer')
  await closeModal(page)
  await page.evaluate(() => document.querySelector('tr[data-id="k2"] [data-act="match"]').click())
  await wait(700)
  st = await page.evaluate(() => ({ title: document.querySelector('.modal h2, .modal-title')?.textContent.trim() ?? '', n: document.querySelectorAll('.ct-m').length }))
  check(`${d} "קונים מתאימים" opens matches for a seller`, st.title.includes('קונים מתאימים') && st.n >= 1, JSON.stringify(st))
  await closeModal(page)

  // the details window: stage, three marks, a short note
  await page.evaluate(() => document.querySelector('tr[data-id="k11"] .ct-name button').click())
  await wait(700)
  st = await page.evaluate(() => ({
    stages: [...document.querySelectorAll('.ct-det .ct-stage button')].map((b) => b.textContent.trim()),
    marks: [...document.querySelectorAll('.ct-det .ct-mark')].map((b) => b.textContent.trim()),
    note: !!document.querySelector('.ct-det input.input'),
    office: document.querySelector('.ct-det .ct-office')?.textContent ?? '',
    fields: !!document.querySelector('.ct-office-fields'),
  }))
  check(`${d} a click on a row opens the details: stage, "חזרתי לבעלים", "תואם סיור", "בלעדיות" and a short note`, st.stages.length === 5 && st.marks.join() === 'חזרתי לבעלים,תואם סיור,בלעדיות' && st.note, JSON.stringify(st))
  check(`${d} for a community member the office's fields are locked there too`, !st.fields && st.office.includes('זמין לחברי המשרד'))
  await page.evaluate(() => {
    document.querySelector('.ct-det .ct-mark[data-mark="tourSet"]').click()
    ;[...document.querySelectorAll('.ct-det .ct-stage button')].find((b) => b.textContent.trim() === 'סיור').click()
  })
  await page.type('.ct-det input.input', 'סיור ביום חמישי')
  await wait(400)
  check(`${d} typing the note keeps the focus in the field`, await page.evaluate(() => document.activeElement?.matches('.ct-det input.input') && document.activeElement.value === 'סיור ביום חמישי'))
  await shot('4-details')
  await closeModal(page)
  r = await rows(page)
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('nadlanup-clients-v1')).find((x) => x.id === 'k11'))
  check(`${d} the marks are saved, and the client jumps to the top as updated today`, saved.tourSet === true && saved.stage === 'tour' && saved.note === 'סיור ביום חמישי' && r[0].id === 'k11', `${r[0].id} ${JSON.stringify({ t: saved.tourSet, s: saved.stage })}`)

  // a new client
  await page.evaluate(() => document.querySelector('[data-act="new-client"]').click())
  await wait(600)
  await page.type('.ct-new [data-f="name"]', 'גלית ר.')
  await page.type('.ct-new [data-f="phone"]', '050-555-0199')
  const newTypes = await page.evaluate(() => [...document.querySelectorAll('.ct-new .ct-stage button')].map((b) => b.textContent.trim()))
  await page.evaluate(() => [...document.querySelectorAll('.ct-new .ct-stage button')].find((b) => b.textContent.trim() === 'מוכר').click())
  await page.evaluate(() => document.querySelector('.ct-new').closest('form').querySelector('button[type="submit"]').click())
  await wait(800)
  r = await rows(page)
  check(`${d} "לקוח חדש" adds a client to the top of the table (four types to pick from in the community)`, r.length === 12 && r[0].name === 'גלית ר.' && r[0].kind === 'מוכר' && r[0].btn === 'קונים מתאימים' && newTypes.length === 4, `${r.length} ${r[0].name} ${newTypes.length}`)
  check(`${d} the count next to "מוכרים" follows`, await page.evaluate(() => document.querySelector('button.ct-chip[data-type="seller"] b').textContent === '4'))

  // the pull from Yad2: a simulation
  await page.evaluate(() => document.querySelector('[data-act="yad2"]').click())
  await wait(700)
  st = await page.evaluate(() => ({ note: document.querySelector('[data-note="yad2"]')?.textContent.trim(), n: document.querySelectorAll('.ct-y2-item').length, disabled: document.querySelector('[data-act="take"]')?.disabled }))
  check(`${d} "משוך נכסים מיד 2" shows 3 to 4 demo properties with the note, and nothing is taken until something is marked`, st.note === 'דמו - החיבור האמיתי ייבדק בהמשך' && st.n >= 3 && st.n <= 4 && st.disabled === true, JSON.stringify(st))
  await page.evaluate(() => {
    document.querySelector('.ct-y2-item[data-id="y1"]').click()
    document.querySelector('.ct-y2-item[data-id="y3"]').click()
  })
  await wait(300)
  await shot('5-yad2')
  await page.evaluate(() => document.querySelector('[data-act="take"]').click())
  await wait(900)
  await page.evaluate(() => [...document.querySelectorAll('.seg .seg-btn')].find((b) => b.textContent.trim() === 'נכסים').click())
  await wait(1200)
  st = await page.evaluate(() => ({ cards: [...document.querySelectorAll('.kan-card h3')].map((h) => h.textContent.trim()), clientCards: [...document.querySelectorAll('.kan-card .tag')].filter((t) => t.textContent.trim() === 'לקוח').length }))
  check(`${d} the two marked properties are in the CRM, on the properties board`, st.cards.includes('דירת 4 חדרים עם מרפסת שמש') && st.cards.includes('דירת 3.5 חדרים ליד הפארק') && !st.cards.includes('דירת 3 חדרים בקומה שנייה'), st.cards.slice(0, 4).join(' / '))
  check(`${d} the board holds properties only, the clients live in the table`, st.clientCards === 0)

  // publishing a buyer's request still works from the details window
  await page.evaluate(() => [...document.querySelectorAll('.seg .seg-btn')].find((b) => b.textContent.trim() === 'לקוחות').click())
  await wait(800)
  await page.evaluate(() => document.querySelector('tr[data-id="k7"] .ct-name button').click())
  await wait(700)
  await page.evaluate(() => document.querySelector('.ct-det-foot [data-act="publish"]')?.click())
  await wait(900)
  check(`${d} a buyer's request can still be published to the community from the details window`, await page.evaluate(() => !!document.querySelector('.publish') && !document.querySelector('.ct-det')))
  await closeModal(page)

  // ---------------------------------------------------------------- an office member
  await page.evaluate(() => {
    localStorage.setItem('nadlanup-member-v1', 'office')
    localStorage.removeItem('nadlanup-clients-v1')
  })
  await page.goto(green + '/app/crm', { waitUntil: 'load' })
  await wait(1700)
  st = await page.evaluate(() => ({
    head: [...document.querySelectorAll('.ct-table thead th')].filter((x) => !x.querySelector('.sr-only')).map((x) => x.textContent.trim()),
    chips: [...document.querySelectorAll('button.ct-chip')].map((x) => x.textContent.trim()),
    locked: document.querySelectorAll('.ct-chip.is-locked, .ct-office').length,
    sorts: [...document.querySelectorAll('.ct-sort select option')].map((o) => o.textContent.trim()),
  }))
  check(`${d} office member: also rating, follow-up and the date created`, st.head.join() === 'שם הלקוח,סוג,טלפון,עדכון אחרון,דירוג,פולואפ,נוצר', st.head.join())
  check(`${d} office member: eight types, the four of the office open with counts, nothing locked`, st.chips.join() === 'קונים4,מוכרים3,שוכרים2,משכירים2,ניהול נכסים1,מסחרי1,מגרש1,אנשי מקצוע1' && st.locked === 0, st.chips.join())
  r = await rows(page)
  check(`${d} office member: fifteen clients, with the office's types`, r.length === 15 && ['manage', 'commercial', 'land', 'pro'].every((t) => r.some((x) => x.type === t)), `${r.length}`)
  if (!phone) {
    const cells = await page.evaluate(() => {
      const tr = document.querySelector('tr[data-id="k1"]')
      return { stars: tr.querySelectorAll('.ct-stars svg.is-on').length, follow: tr.querySelectorAll('.ct-date')[0]?.textContent.trim(), made: tr.querySelectorAll('.ct-date')[1]?.textContent.trim() }
    })
    check('desktop office member: a row shows the stars, a follow-up date and the date created', cells.stars === 5 && /^\d{2}\.\d{2}\.\d{4}$/.test(cells.follow) && /^\d{2}\.\d{2}\.\d{4}$/.test(cells.made), JSON.stringify(cells))
  }
  check(`${d} office member: nothing scrolls sideways`, (await overflow(page)) <= 1)
  await shot('6-table-office')
  await page.evaluate(() => document.querySelector('tr[data-id="k6"] .ct-name button').click())
  await wait(700)
  st = await page.evaluate(() => ({ fields: !!document.querySelector('.ct-office-fields'), stars: document.querySelectorAll('.ct-office-fields .ct-stars button').length, date: document.querySelector('.ct-office-fields input[type="date"]')?.value, made: document.querySelector('.ct-created')?.textContent.trim(), lock: !!document.querySelector('.ct-det .ct-office') }))
  check(`${d} office member: the details window has the rating, a follow-up with a date and the date created`, st.fields && st.stars === 5 && /^\d{4}-\d{2}-\d{2}$/.test(st.date) && /^\d{2}\.\d{2}\.\d{4}$/.test(st.made) && !st.lock, JSON.stringify(st))
  await page.evaluate(() => document.querySelectorAll('.ct-office-fields .ct-stars button')[2].click())
  await wait(300)
  check(`${d} office member: the rating can be changed`, await page.evaluate(() => JSON.parse(localStorage.getItem('nadlanup-clients-v1')).find((x) => x.id === 'k6').rating === 3))
  await shot('7-details-office')
  await closeModal(page)

  check(`${d} no console errors`, errors.length === 0, errors.slice(0, 2).join(' | '))
  await page.close()
}

await browser.close().catch(() => {})
console.log(results.join('\n'))
console.log(results.some((r) => r.startsWith('FAIL')) ? '\nSOME CHECKS FAILED' : '\nALL CHECKS PASSED')
