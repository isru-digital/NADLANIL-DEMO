// The CRM property card (16.11.2026): exact address (street, number, neighbourhood), parking as a number (0, 1, 2, 3+),
// "מיועד להתחדשות עירונית" with a tag and a filter, big buttons instead of lists, and a draft that saves itself.
// The street and the house number are seen only by the broker who put the property in: the feed, the card and the
// property page show the city and the neighbourhood only.
// Usage: node scripts/crm-form-check.mjs [outDir]     (BASE_GREEN overrides the address)
import puppeteer from 'puppeteer-core'
import { mkdirSync } from 'node:fs'

const green = process.env.BASE_GREEN ?? 'http://localhost:5240/NADLANIL-DEMO/green'
const out = process.argv[2] ?? '_shots/crm-form'
mkdirSync(out, { recursive: true })
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
const browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--hide-scrollbars'] })
let fails = 0
const check = (name, ok, info) => {
  if (!ok) fails++
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok || info === undefined ? '' : '  [' + JSON.stringify(info) + ']'}`)
}
const STREET = 'סמטת הכרמים'

for (const [tag, vp] of [
  ['desktop', { width: 1366, height: 900 }],
  ['phone', { width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }],
]) {
  const page = await browser.newPage()
  await page.setViewport(vp)
  await page.evaluateOnNewDocument(() => {
    try {
      localStorage.setItem('nadlanup-demo-v1', '1')
    } catch {}
  })
  await page.goto(green + '/', { waitUntil: 'load' })
  await page.evaluate(() => {
    localStorage.clear()
    // the day look for the pictures (the night look is checked by the other checks)
    localStorage.setItem('nadlanup-mode-v1', JSON.stringify({ mode: 'day', until: Date.now() + 9e9 }))
  })
  await page.goto(green + '/app/crm?v=properties', { waitUntil: 'networkidle0' })
  await wait(600)
  const click = async (sel) => {
    await page.waitForSelector(sel, { visible: true, timeout: 8000 })
    await page.$eval(sel, (el) => el.scrollIntoView({ block: 'center' }))
    await page.click(sel)
  }
  const open = async () => {
    await click('[data-act="new-card"]')
    await page.waitForSelector('.ga-fields', { visible: true })
    await wait(450)
  }
  // ---- the properties board: one list, no stages (17.11.2026), and the owner's button by its new name
  const flatBoard = await page.evaluate(() => ({
    flat: !!document.querySelector('[data-flat]'),
    cols: document.querySelectorAll('.kan-col').length,
    tabs: !!document.querySelector('.stage-tabs'),
    next: document.querySelectorAll('.kan-next').length,
    // the stage names as labels (a card's own note may say "סיור", that is not a stage)
    words: ['בטיפול', 'משא ומתן'].filter((w) => (document.querySelector('main')?.innerText ?? '').includes(w)),
    cards: document.querySelectorAll('.kan-card').length,
    owner: [...document.querySelectorAll('[data-act="owner-link"]')].map((b) => b.textContent.trim()),
  }))
  check(`${tag}: the properties are one list, with no stages (no "בטיפול", "משא ומתן" or columns)`, flatBoard.flat && flatBoard.cols === 0 && !flatBoard.tabs && flatBoard.next === 0 && flatBoard.words.length === 0 && flatBoard.cards >= 6, flatBoard)
  await page.screenshot({ path: `${out}/${tag}-board.png` })
  await open()

  // ---- big buttons, no lists
  const look = await page.evaluate(() => {
    const m = document.querySelector('.modal-body.ga')
    const picks = [...m.querySelectorAll('.ga-pick, .ga-seg-btn, .ga-renew')]
    return {
      selects: m.querySelectorAll('select').length,
      picks: picks.length,
      small: picks.filter((p) => p.getBoundingClientRect().height < 44).map((p) => p.textContent).slice(0, 4),
      draft: m.querySelector('[data-draft]')?.textContent,
      address: !!m.querySelector('[data-f="street"]') && !!m.querySelector('[data-f="house"]') && !!m.querySelector('[data-f="hood"]'),
      parking: [...m.querySelectorAll('[data-parking]')].map((b) => b.textContent),
      renewal: !!m.querySelector('[data-f="renewal"]'),
      inputs: Math.min(...[...m.querySelectorAll('input:not([type=file])')].map((i) => parseFloat(getComputedStyle(i).fontSize))),
      wide: m.scrollWidth - m.clientWidth,
    }
  })
  check(`${tag}: no lists in the card, only big buttons (44px and up)`, look.selects === 0 && look.picks >= 20 && look.small.length === 0, look)
  check(`${tag}: exact address fields (neighbourhood, street, number)`, look.address, look)
  check(`${tag}: parking as 0 / 1 / 2 / 3+`, JSON.stringify(look.parking) === JSON.stringify(['אין', '1', '2', '3+']), look.parking)
  check(`${tag}: an urban renewal box, and a line saying the draft saves itself`, look.renewal && /אוטומטית/.test(look.draft ?? ''), look.draft)
  check(`${tag}: inputs 16px (no zoom on a phone), nothing spills sideways`, look.inputs >= 16 && look.wide <= 1, look)

  // ---- fill it in
  await click('[data-city="חיפה"]')
  await page.type('[data-f="hood"]', 'נווה שאנן')
  await page.type('[data-f="street"]', STREET)
  await page.type('[data-f="house"]', '12')
  await click('[data-rooms="4"]')
  await page.type('[data-f="price"]', '1690000')
  await click('[data-parking="2"]')
  await click('[data-f="renewal"]')
  await wait(900)
  const saved = await page.evaluate(() => ({ line: document.querySelector('[data-draft]')?.textContent, state: document.querySelector('[data-draft]')?.dataset.draft, stored: JSON.parse(localStorage.getItem('nadlanup-crm-draft-v1') ?? 'null')?.card }))
  check(`${tag}: the draft saves itself while typing`, saved.state === 'saved' && /נשמרה/.test(saved.line) && saved.stored?.street === STREET && saved.stored?.parking === 2 && saved.stored?.renewal === true, saved)
  await page.evaluate(() => document.querySelector('[data-draft]').scrollIntoView({ block: 'start' }))
  await wait(200)
  await page.screenshot({ path: `${out}/${tag}-form.png`, fullPage: false })
  // the whole form, top to bottom
  await page.evaluate(() => document.querySelector('[data-f="parking"]').scrollIntoView({ block: 'center' }))
  await wait(200)
  await page.screenshot({ path: `${out}/${tag}-form-2.png` })

  // ---- close and open again: it comes back
  await page.keyboard.press('Escape')
  await wait(500)
  await open()
  const back = await page.evaluate(() => ({
    line: document.querySelector('[data-draft]')?.textContent,
    street: document.querySelector('[data-f="street"]')?.value,
    house: document.querySelector('[data-f="house"]')?.value,
    city: document.querySelector('[data-city][aria-pressed="true"]')?.textContent,
    parking: document.querySelector('[data-parking][aria-checked="true"]')?.textContent,
    renewal: document.querySelector('[data-f="renewal"]')?.getAttribute('aria-checked'),
  }))
  check(`${tag}: closing and opening again brings the draft back`, /המשכנו מהטיוטה/.test(back.line) && back.street === STREET && back.house === '12' && back.city === 'חיפה' && back.parking === '2' && back.renewal === 'true', back)

  // ---- save
  await click('.ga-go')
  await wait(900)
  const after = await page.evaluate(() => ({ draft: localStorage.getItem('nadlanup-crm-draft-v1') }))
  check(`${tag}: saving the card clears the draft`, after.draft === null, after)
  const owner = await page.evaluate(() => ({ btn: [...document.querySelectorAll('[data-act="owner-link"]')].map((b) => b.textContent.trim()), any: document.body.innerText.includes('קישור לבעל הנכס') }))
  check(`${tag}: a published property's button is called "הוכחת פרסום לבעל הנכס" (the old name is gone)`, owner.btn.length > 0 && owner.btn.every((t) => t === 'הוכחת פרסום לבעל הנכס') && !owner.any, owner)
  const card = await page.evaluate((street) => {
    const c = [...document.querySelectorAll('.kan-card')].find((k) => k.textContent.includes(street))
    return c ? { address: c.querySelector('[data-exact]')?.textContent, renewal: !!c.querySelector('[data-renewal]'), area: c.querySelector('.kan-meta')?.textContent } : null
  }, STREET)
  check(`${tag}: the CRM card (the broker's own) shows the exact address with a lock, and the renewal tag`, card && /סמטת הכרמים 12, נווה שאנן/.test(card.address) && card.renewal, card)
  await page.evaluate((street) => [...document.querySelectorAll('.kan-card')].find((k) => k.textContent.includes(street))?.scrollIntoView({ block: 'center' }), STREET)
  await wait(300)
  await page.screenshot({ path: `${out}/${tag}-crm-card.png` })

  // ---- the board filter
  await click('[data-filter="renewal"]')
  await wait(500)
  const board = await page.evaluate(() => [...document.querySelectorAll('.kan-card')].map((k) => !!k.querySelector('[data-renewal]')))
  check(`${tag}: the board filters to urban renewal only`, board.length >= 1 && board.every(Boolean), board)
  await click('[data-filter="renewal"]')

  // ---- what the community got: city and neighbourhood, never the street
  await wait(600)
  const store = await page.evaluate(() => JSON.parse(localStorage.getItem('brokers-demo-state-v5') ?? '{}'))
  const posted = (store.items ?? []).filter((it) => it.property && JSON.stringify(it).includes('נווה שאנן') && it.authorId === 'b1')
  const leak = (store.items ?? []).filter((it) => JSON.stringify(it).includes(STREET))
  check(`${tag}: the property went up to the community with city and neighbourhood, parking and the renewal mark`, posted.length === 1 && posted[0].property.area === 'חיפה - נווה שאנן' && posted[0].property.parking === 2 && posted[0].property.renewal === true, posted.map((p) => p.property))
  check(`${tag}: the street and the house number are nowhere in the community`, leak.length === 0, leak.map((l) => l.id))

  await page.goto(green + '/app/community?topic=coop', { waitUntil: 'networkidle0' })
  await wait(900)
  const feed = await page.evaluate((street) => ({
    text: document.querySelector('main')?.innerText.includes(street),
    mine: [...document.querySelectorAll('.fb-prop')].find((c) => c.textContent.includes('נווה שאנן') && c.querySelector('[data-renewal]'))?.querySelector('.fb-embed-kicker')?.textContent,
  }), STREET)
  check(`${tag}: in the feed: "חיפה - נווה שאנן" and the tag, no street`, !feed.text && /חיפה - נווה שאנן/.test(feed.mine ?? '') && /התחדשות עירונית/.test(feed.mine ?? ''), feed)

  // ---- the feed filter
  await click('[data-filter="renewal"]')
  await wait(1300)
  const f = await page.evaluate(() => ({
    count: Number(document.querySelector('[data-count]')?.textContent),
    cards: [...document.querySelectorAll('.fb-prop')].map((c) => !!c.querySelector('[data-renewal]')),
  }))
  check(`${tag}: the feed filters to urban renewal only (2 from the demo and the new one)`, f.count === 3 && f.cards.length === 3 && f.cards.every(Boolean), f)
  await page.evaluate(() => document.querySelector('[data-filters]')?.scrollIntoView({ block: 'start' }))
  await wait(300)
  await page.screenshot({ path: `${out}/${tag}-feed-filter.png` })

  // ---- the page of the new property (mine): the exact address for me only
  const id = posted[0]?.id
  await page.goto(green + `/app/property/${id}`, { waitUntil: 'networkidle0' })
  await wait(700)
  const mine = await page.evaluate(() => ({
    exact: document.querySelector('[data-exact]')?.textContent,
    renewal: !!document.querySelector('.pp [data-renewal]'),
    parking: document.querySelector('[data-fact="חניה"] dd')?.textContent,
    area: document.querySelector('.pp-area')?.textContent,
    noPhoto: (() => {
      const n = document.querySelector('[data-nophoto]')
      if (!n) return null
      const r = n.getBoundingClientRect()
      return { text: n.textContent, icon: !!n.querySelector('svg'), h: Math.round(r.height), img: !!document.querySelector('.pp-main img') }
    })(),
  }))
  check(`${tag}: a property with no photos gets a picture of its own: a house and the city, not an empty frame`, mine.noPhoto && mine.noPhoto.icon && /חיפה/.test(mine.noPhoto.text) && mine.noPhoto.h > 150 && !mine.noPhoto.img, mine.noPhoto)
  check(`${tag}: my own property page shows me the exact address (marked "רק אתם רואים"), the tag and "2 חניות"`, /סמטת הכרמים 12, נווה שאנן, חיפה/.test(mine.exact ?? '') && /רק אתם/.test(mine.exact ?? '') && mine.renewal && mine.parking === '2 חניות', mine)
  await page.screenshot({ path: `${out}/${tag}-my-property.png` })

  // ---- another broker's property marked for renewal: the tag, and no address
  await page.goto(green + '/app/property/p12', { waitUntil: 'networkidle0' })
  await wait(700)
  const other = await page.evaluate(() => ({ nophoto: !!document.querySelector('[data-nophoto]'), exact: !!document.querySelector('[data-exact]'), renewal: !!document.querySelector('.pp [data-renewal]'), area: document.querySelector('.pp-area')?.textContent }))
  check(`${tag}: another broker's property page: the tag, the city and neighbourhood, no exact address (and its own photos)`, !other.nophoto && !other.exact && other.renewal && /ראשון לציון - רמז/.test(other.area ?? ''), other)
  await page.screenshot({ path: `${out}/${tag}-other-property.png` })

  const wide = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
  check(`${tag}: no sideways scroll`, wide <= 1, { wide })
  await page.close()
}

console.log(fails ? '\nSOME CHECKS FAILED' : '\nALL CHECKS PASSED')
await Promise.race([browser.close().catch(() => {}), wait(4000)])
process.exit(0)
