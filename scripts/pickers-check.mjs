// Sharing from the CRM with as few actions as possible (17.11.2026): in "נכסים לשיתוף פעולה" a clear "בחירה מהנכסים
// הקיימים שלי" (my properties with a small photo) and "נכס חדש"; in "מחפש לקונה" a buyer from the CRM or "קונה חדש".
// Anything new is saved in the CRM too. The community never gets the street, the house number, a name or a phone.
// Usage: node scripts/pickers-check.mjs [outDir]     (BASE_GREEN overrides the address)
import puppeteer from 'puppeteer-core'
import { mkdirSync } from 'node:fs'

const green = process.env.BASE_GREEN ?? 'http://localhost:5240/NADLANIL-DEMO/green'
const out = process.argv[2] ?? '_shots/pickers'
mkdirSync(out, { recursive: true })
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
const browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--hide-scrollbars'] })
let fails = 0
const check = (name, ok, info) => {
  if (!ok) fails++
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok || info === undefined ? '' : '  [' + JSON.stringify(info) + ']'}`)
}
const PREVIEW = '6d5eaaca072bf02f647051d8688d1337a4ab7a6cb92a2a8b3924cf91fda89e8b'
const tap = (page, sel) => page.$eval(sel, (el) => (el.scrollIntoView({ block: 'center' }), el.click()))
const store = (page) => page.evaluate(() => JSON.parse(localStorage.getItem('brokers-demo-state-v5') ?? '{}'))
const clients = (page) => page.evaluate(() => JSON.parse(localStorage.getItem('nadlanup-clients-v1') ?? '[]'))
const toast = (page) => page.evaluate(() => document.querySelector('.toast')?.textContent ?? '')

for (const [tag, vp] of [
  ['desktop', { width: 1440, height: 900 }],
  ['phone', { width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }],
]) {
  const page = await browser.newPage()
  await page.setViewport(vp)
  await page.evaluateOnNewDocument((h) => {
    try {
      localStorage.setItem('nadlanup-demo-v1', '1')
      localStorage.setItem('nadlanup-preview-v1', h)
    } catch {}
  }, PREVIEW)
  await page.goto(green + '/', { waitUntil: 'load' })
  await page.evaluate((h) => {
    localStorage.clear()
    localStorage.setItem('nadlanup-demo-v1', '1')
    localStorage.setItem('nadlanup-preview-v1', h)
    localStorage.setItem('nadlanup-mode-v1', JSON.stringify({ mode: 'day', until: Date.now() + 9e9 }))
  }, PREVIEW)

  // ---- properties for cooperation: pick one of mine
  await page.goto(green + '/app/community?topic=coop', { waitUntil: 'networkidle0' })
  await wait(900)
  const head = await page.evaluate(() => ({
    pick: document.querySelector('[data-act="pick-property"]')?.textContent.trim(),
    add: document.querySelector('[data-act="add-property"]')?.textContent.trim(),
    old: document.body.innerText.includes('פרסום מה-CRM'),
    small: [...document.querySelectorAll('.topic-acts .btn')].filter((b) => b.getBoundingClientRect().height < 44).length,
  }))
  check(`${tag}: "נכסים לשיתוף פעולה" has "בחירה מהנכסים הקיימים שלי" and "נכס חדש" (no more "פרסום מה-CRM")`, head.pick === 'בחירה מהנכסים הקיימים שלי' && head.add === 'נכס חדש' && !head.old && head.small === 0, head)
  await page.evaluate(() => document.querySelector('[data-act="pick-property"]').scrollIntoView({ block: 'center' }))
  await wait(400)
  await page.screenshot({ path: `${out}/${tag}-1-coop-head.png` })
  await tap(page, '[data-act="pick-property"]')
  await page.waitForSelector('[data-picker="property"]', { visible: true })
  await wait(400)
  const list = await page.evaluate(() => ({
    rows: [...document.querySelectorAll('[data-picker="property"] .pk-row')].map((r) => ({ id: r.dataset.pick, title: r.querySelector('b')?.textContent, photo: !!r.querySelector('.pk-thumb img'), done: r.disabled })),
    newRow: !!document.querySelector('[data-act="new-property"]'),
    small: [...document.querySelectorAll('.pk-row, .pk-new')].filter((b) => b.getBoundingClientRect().height < 44).length,
  }))
  check(`${tag}: the list shows my properties with a small photo, and "נכס חדש" on top`, list.newRow && list.rows.length >= 6 && list.rows.filter((r) => r.photo).length >= 4 && list.small === 0, list)
  await page.screenshot({ path: `${out}/${tag}-2-property-picker.png` })
  const first = list.rows.find((r) => !r.done)
  await tap(page, `[data-picker="property"] [data-pick="${first.id}"]`)
  await wait(1300)
  let s = await store(page)
  let post = s.items?.find((it) => it.sourceId === first.id && it.topicId === 'coop')
  const url = await page.evaluate(() => location.search)
  check(`${tag}: one tap shares it in "נכסים לשיתוף פעולה" and shows it`, !!post && post.title === first.title && /topic=coop/.test(url) && /item=/.test(url) && /פורסם/.test(await toast(page)), { url, post: post?.title })
  await tap(page, '[data-act="pick-property"]')
  await wait(500)
  const again = await page.evaluate((id) => document.querySelector(`[data-pick="${id}"]`)?.textContent, first.id)
  check(`${tag}: the shared one now says "כבר בקהילה"`, /כבר בקהילה/.test(again ?? ''), again)
  await page.keyboard.press('Escape')
  await wait(400)

  // ---- a new property from the feed: saved in the CRM and published, city and neighbourhood only
  const crmBefore = s.crm.length
  await tap(page, '[data-act="add-property"]')
  await page.waitForSelector('.ga-fields', { visible: true })
  await wait(400)
  await tap(page, '[data-city="חיפה"]')
  await page.type('[data-f="hood"]', 'נווה שאנן')
  await page.type('[data-f="street"]', 'סמטת הכרמים')
  await page.type('[data-f="house"]', '12')
  await page.type('[data-f="price"]', '1690000')
  await tap(page, '.ga-go')
  await wait(1500)
  s = await store(page)
  const card = s.crm.find((c) => c.street === 'סמטת הכרמים')
  post = card && s.items.find((it) => it.sourceId === card.id)
  const leak = s.items.filter((it) => JSON.stringify(it).includes('סמטת הכרמים'))
  check(`${tag}: a new property is saved in the CRM and published in the community`, s.crm.length === crmBefore + 1 && !!card && !!post && post.topicId === 'coop', { crm: s.crm.length, crmBefore, post: post?.title })
  check(`${tag}: the community gets "חיפה - נווה שאנן" and never the street or the house number`, post?.property?.area === 'חיפה - נווה שאנן' && leak.length === 0, { area: post?.property?.area, leak: leak.length })

  // ---- looking for a buyer: pick one of mine
  await page.goto(green + '/app/community?topic=seeking', { waitUntil: 'networkidle0' })
  await wait(900)
  const sh = await page.evaluate(() => ({ pick: document.querySelector('[data-act="pick-buyer"]')?.textContent.trim(), add: document.querySelector('[data-act="add-buyer"]')?.textContent.trim() }))
  check(`${tag}: "מחפש לקונה" has "בחירת קונה מה-CRM" and "קונה חדש"`, sh.pick === 'בחירת קונה מה-CRM' && sh.add === 'קונה חדש', sh)
  await tap(page, '[data-act="pick-buyer"]')
  await page.waitForSelector('[data-picker="buyer"]', { visible: true })
  await wait(400)
  const buyers = await page.evaluate(() => [...document.querySelectorAll('[data-picker="buyer"] .pk-row')].map((r) => ({ id: r.dataset.pick, name: r.querySelector('b')?.textContent })))
  const cl = (await clients(page)).length ? await clients(page) : null
  check(`${tag}: the list shows my buyers and renters, and "קונה חדש" on top`, buyers.length >= 4 && !!(await page.$('[data-act="new-buyer"]')), buyers.length)
  await page.screenshot({ path: `${out}/${tag}-3-buyer-picker.png` })
  const b0 = buyers[0]
  await tap(page, `[data-picker="buyer"] [data-pick="${b0.id}"]`)
  await wait(1300)
  s = await store(page)
  post = s.items.find((it) => it.id.startsWith(`b-${b0.id}-`))
  const nameOnly = b0.name.replace(/(קונה|שוכר)$/, '').trim()
  check(`${tag}: one tap publishes the buyer in "מחפש לקונה", without his name or phone`, !!post && post.topicId === 'seeking' && /^מחפש ל(קונה|שוכר)/.test(post.title) && !JSON.stringify(post).includes(nameOnly) && !/555-/.test(JSON.stringify(post)), { post: post?.title, nameOnly, cl: !!cl })
  await page.screenshot({ path: `${out}/${tag}-4-buyer-published.png` })

  // After a buyer is published the site checks for a match and shows its answer over the whole screen, a moment
  // later: "אין עדיין התאמה", or the matches it found (the phone run comes after the computer's, in the same browser,
  // so there it can find some). That screen keeps the keyboard to itself, so when it was still up the typing below
  // went nowhere and this check failed now and then (19.11.2026). Wait for it and close it, whichever it is.
  await page
    .waitForSelector('[data-match-screen]', { visible: true, timeout: 5000 })
    .then(() => page.evaluate(() => document.querySelector('[data-act="close-match"]')?.click()))
    .catch(() => {})
  await page.waitForFunction(() => !document.querySelector('[data-match-screen]'), { timeout: 5000 }).catch(() => {})
  await wait(400)

  // ---- a new buyer from the feed: the form opens at once, saved in the CRM and published
  const before = (await clients(page)).length || 0
  await tap(page, '[data-act="add-buyer"]')
  await page.waitForSelector('.nc', { visible: true })
  await wait(400)
  const types = await page.evaluate(() => [...document.querySelectorAll('.nc .ct-stage button')].map((b) => b.textContent.trim()))
  check(`${tag}: "קונה חדש" opens the full buyer form at once (buyer or renter only)`, JSON.stringify(types) === JSON.stringify(['קונה', 'שוכר']), types)
  await page.type('[data-f="name"]', 'רוני ומאיה ת.')
  await page.type('[data-f="phone"]', '050-555-0188')
  await tap(page, '[data-city="רמת גן"]')
  await page.screenshot({ path: `${out}/${tag}-5-new-buyer.png` })
  await tap(page, '[data-act="add-client"]')
  await wait(1400)
  const after = await clients(page)
  s = await store(page)
  const kid = after.find((c) => c.name === 'רוני ומאיה ת.')
  post = kid && s.items.find((it) => it.id.startsWith(`b-${kid.id}-`))
  check(`${tag}: the new buyer is saved in the CRM and published in "מחפש לקונה"`, !!kid && !!post && post.topicId === 'seeking', { kid: !!kid, post: post?.title, before, after: after.length })
  check(`${tag}: the new buyer's post has no name and no phone`, !!post && !JSON.stringify(post).includes('רוני ומאיה') && !JSON.stringify(post).includes('050-555-0188') && /רמת גן/.test(post.title), post?.title)
  check(`${tag}: the toast says it went to both places`, /נשמר ב-CRM ופורסם/.test(await toast(page)), await toast(page))

  const wide = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
  check(`${tag}: no sideways scroll`, wide <= 1, { wide })
  await page.close()
}

console.log(fails ? '\nSOME CHECKS FAILED' : '\nALL CHECKS PASSED')
await Promise.race([browser.close().catch(() => {}), wait(4000)])
process.exit(0)
