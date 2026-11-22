// "ממודעה שפרסמתי ביד2": the broker pastes the text of their own Yad2 ad, the new property card fills, they check,
// add their own photos and save. On a computer and a phone. Checks that the card fills from the sample ad and from
// an ad written in one line, that an empty text says so, that phone numbers and links never reach the card, that the
// card is saved to the CRM with its note, and that nothing at all is fetched from outside this site. Saves screenshots.
// Usage: node scripts/yad2-import-check.mjs [outDir]     (BASE_GREEN overrides the address)
import puppeteer from 'puppeteer-core'
import { mkdirSync } from 'node:fs'

const green = process.env.BASE_GREEN ?? 'http://localhost:5240/NADLANIL-DEMO/green'
const out = process.argv[2] ?? '_shots/yad2-import'
mkdirSync(out, { recursive: true })
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
const browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--hide-scrollbars'] })
let fails = 0
const check = (name, ok, info) => {
  if (!ok) fails++
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok || info === undefined ? '' : '  [' + JSON.stringify(info) + ']'}`)
}
const PREVIEW = '6d5eaaca072bf02f647051d8688d1337a4ab7a6cb92a2a8b3924cf91fda89e8b'
const site = new URL(green).origin
const fresh = async (vp, mode = 'day') => {
  const page = await browser.newPage()
  await page.setViewport(vp)
  await page.evaluateOnNewDocument((h) => {
    try {
      localStorage.setItem('nadlanup-demo-v1', '1')
      localStorage.setItem('nadlanup-preview-v1', h)
    } catch {}
  }, PREVIEW)
  await page.goto(green + '/', { waitUntil: 'load' })
  await page.evaluate(
    (h, mode) => {
      localStorage.clear()
      localStorage.setItem('nadlanup-demo-v1', '1')
      localStorage.setItem('nadlanup-preview-v1', h)
      localStorage.setItem('nadlanup-mode-v1', JSON.stringify({ mode, until: Date.now() + 9e9 }))
    },
    PREVIEW,
    mode,
  )
  return page
}
const tap = (page, sel) => page.$eval(sel, (el) => (el.scrollIntoView({ block: 'center' }), el.click()))
const setText = (page, sel, text) =>
  page.$eval(
    sel,
    (el, text) => {
      const set = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set
      set.call(el, text)
      el.dispatchEvent(new Event('input', { bubbles: true }))
    },
    text,
  )
const card = (page) =>
  page.evaluate(() => {
    const m = document.querySelector('.modal-body.ga')
    const on = (sel) => [...m.querySelectorAll(sel)].filter((b) => b.getAttribute('aria-pressed') === 'true' || b.getAttribute('aria-checked') === 'true').map((b) => b.textContent.trim())
    const val = (f) => m.querySelector(`[data-f="${f}"]`)?.value ?? null
    return {
      city: on('[data-city]'),
      cat: on('[data-cat]'),
      hood: val('hood'),
      street: val('street'),
      house: val('house'),
      rooms: on('[data-rooms]'),
      sqm: val('sqm'),
      price: m.querySelector('[data-price-value]')?.dataset.priceValue ?? val('price'),
      parking: on('[data-parking]'),
      extras: on('[aria-label="תוספות"] .ga-pick'),
      notes: val('ad-notes'),
      done: m.querySelector('[data-ad-done]')?.innerText ?? '',
      photosNote: !!m.querySelector('[data-note="own-photos"]'),
      all: m.innerText + ' ' + [...m.querySelectorAll('input, textarea')].map((i) => i.value).join(' '),
    }
  })
const scrollModal = (page, sel) => page.$eval(sel, (el) => el.scrollIntoView({ block: 'start' }))

const INLINE = 'למכירה! דירת 3.5 חדרים ברמת גן, שכונת הבורסה, רחוב ביאליק 22. קומה 5/9, 92 מ"ר, 2 חניות, מעלית, ממ"ד, ללא מחסן. 2.35 מיליון. כניסה מיידית. לפרטים 054-0000000 www.yad2.co.il/item/demo'

for (const [tag, vp, mode] of [
  ['desktop', { width: 1440, height: 900 }, 'day'],
  ['phone', { width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }, 'day'],
  ['phone-night', { width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }, 'night'],
]) {
  const page = await fresh(vp, mode)
  // everything that leaves the site: Yad2 never, at any moment; and while the import is used, nothing at all
  // (except the site's own fonts from Google)
  const outside = []
  const toYad2 = []
  let importing = false
  page.on('request', (r) => {
    const u = r.url()
    if (/yad2/i.test(new URL(u, site).host)) toYad2.push(u)
    // the site's fonts may load a weight late, when bold text first shows; anything else counts
    if (importing && !u.startsWith(site) && !/^(data|blob):/.test(u) && !/^https:\/\/fonts\.(googleapis|gstatic)\.com\//.test(u)) outside.push(u)
  })
  const errors = []
  page.on('pageerror', (e) => errors.push(String(e)))
  await page.goto(green + '/app/crm?v=properties', { waitUntil: 'networkidle0' })
  await wait(500)
  await page.waitForSelector('[data-act="new-card"]', { visible: true, timeout: 15000 })
  await tap(page, '[data-act="new-card"]')
  await page.waitForSelector('[data-act="from-yad2"]', { visible: true, timeout: 5000 })
  await wait(400)
  if (mode === 'night') {
    await tap(page, '[data-act="from-yad2"]')
    await wait(300)
    await tap(page, '[data-act="ad-sample"]')
    await tap(page, '[data-act="ad-fill"]')
    await wait(400)
    await page.screenshot({ path: `${out}/${tag}-filled.png` })
    check(`${tag}: no errors`, errors.length === 0, errors)
    await page.close()
    continue
  }
  await page.screenshot({ path: `${out}/${tag}-1-card.png` })
  importing = true
  const two = await page.$$eval('.ga-fill-from button', (b) => b.map((x) => x.textContent.trim()))
  check(`${tag}: the card offers "למלא ממודעה שפרסמתי ביד2" first, and WhatsApp still there`, two[0] === 'למלא ממודעה שפרסמתי ביד2' && two[1] === 'למלא מהודעת וואטסאפ', two)

  // ---- the panel
  await tap(page, '[data-act="from-yad2"]')
  await page.waitForSelector('[data-panel="yad2"]', { visible: true })
  const panel = await page.$eval('[data-panel="yad2"]', (p) => ({ steps: p.querySelectorAll('.ga-ad-steps li').length, safe: p.querySelector('.ga-ad-safe').textContent, fillOff: p.querySelector('[data-act="ad-fill"]').disabled, url: !!p.querySelector('input[type="url"]') }))
  check(`${tag}: three steps, the promise that Yad2 is not touched, no address box, and the button waits for text`, panel.steps === 3 && panel.safe.includes('לא נכנסים לאתר יד2') && !panel.url && panel.fillOff, panel)
  await tap(page, '[data-act="ad-sample"]')
  await wait(200)
  await scrollModal(page, '[data-panel="yad2"]')
  await wait(200)
  await page.screenshot({ path: `${out}/${tag}-2-paste.png` })

  // ---- the sample ad fills the card
  await tap(page, '[data-act="ad-fill"]')
  await wait(400)
  let c = await card(page)
  const sample = { city: ['פתח תקווה'], hood: 'כפר גנים', street: 'הדקל', house: '14', rooms: ['4'], price: '2650000', parking: ['1'], notesHas: ['קומה 3 מתוך 8', '105 מ"ר', 'כניסה: גמיש', 'מטבח חדש'] }
  check(
    `${tag}: the sample ad fills the city, the address, the rooms, the price and the parking`,
    c.city.join() === sample.city.join() && c.hood === sample.hood && c.street === sample.street && c.house === sample.house && c.rooms.join() === '4' && c.price === sample.price && c.parking.join() === '1',
    c,
  )
  check(`${tag}: the extras the ad lists are marked, and "ללא סורגים" adds nothing`, ['מעלית', 'ממ"ד', 'מחסן', 'מיזוג', 'מרפסת שמש', 'משופצת'].every((x) => c.extras.includes(x)), c.extras)
  check(`${tag}: floor, size, entry and the description go to "עוד מהמודעה"`, sample.notesHas.every((x) => c.notes?.includes(x)), c.notes)
  check(`${tag}: it says what was filled, asks to check the extras, and says the phone and the link were not kept`, c.done.includes('מילאנו מהמודעה') && c.done.includes('במיוחד את התוספות') && c.done.includes('מספרי הטלפון והקישור שבטקסט לא נשמרו'), c.done)
  check(`${tag}: no phone number and no Yad2 link anywhere in the card`, !/052-?0000000|yad2\.co\.il/.test(c.all), c.all.match(/052-?0000000|yad2\.co\.il/)?.[0])
  check(`${tag}: a reminder to add your own photos, not the ad's`, c.photosNote)
  await scrollModal(page, '[data-ad-done]')
  await wait(250)
  await page.screenshot({ path: `${out}/${tag}-3-filled.png` })
  await scrollModal(page, '[data-f="ad-notes"]')
  await wait(250)
  await page.screenshot({ path: `${out}/${tag}-4-notes-photos.png` })

  // ---- saved to the CRM, with the note; the street stays on the broker's own card
  // "עמלת שת"פ" is a must since 22.11.2026: its "+" picks 0.5% (post-form-check walks the slider itself)
  await page.evaluate(() => document.querySelector('[data-slider="coop"] [data-step="more"]')?.click())
  await wait(200)
  await tap(page, '.ga-go')
  await wait(900)
  const saved = await page.evaluate(() => {
    const k = [...document.querySelectorAll('.kan-card')].find((x) => x.querySelector('h3')?.textContent.includes('4 חדרים בפתח תקווה'))
    return k ? { note: k.querySelector('.kan-note')?.textContent ?? '', address: k.querySelector('[data-exact]')?.textContent ?? '' } : null
  })
  check(`${tag}: saved to the CRM: the card has the address and the note from the ad`, !!saved && saved.address.includes('הדקל 14') && saved.note.includes('קומה 3 מתוך 8'), saved)
  // the match notice that opens after a property is saved ("אין עדיין התאמה") is closed first
  await page.evaluate(() => [...document.querySelectorAll('button')].find((b) => b.textContent.trim() === 'הבנתי')?.click())
  await wait(600)
  if (saved) await page.evaluate(() => [...document.querySelectorAll('.kan-card')].find((x) => x.querySelector('h3')?.textContent.includes('4 חדרים בפתח תקווה'))?.scrollIntoView({ block: 'center' }))
  await wait(400)
  await page.screenshot({ path: `${out}/${tag}-5-saved.png` })

  // ---- an ad in one line, and an empty text
  await page.waitForSelector('[data-act="new-card"]', { visible: true, timeout: 15000 })
  await tap(page, '[data-act="new-card"]')
  await page.waitForSelector('[data-act="from-yad2"]', { visible: true })
  await tap(page, '[data-act="from-yad2"]')
  await setText(page, '[data-f="ad-text"]', INLINE)
  await wait(150)
  await tap(page, '[data-act="ad-fill"]')
  await wait(400)
  c = await card(page)
  check(`${tag}: an ad in one line: רמת גן, הבורסה, ביאליק 22, 3.5 rooms, 2,350,000, 2 parking, no storeroom`, c.city.join() === 'רמת גן' && c.hood === 'הבורסה' && c.street === 'ביאליק' && c.house === '22' && c.rooms.join() === '3.5' && c.price === '2350000' && c.parking.join() === '2' && !c.extras.includes('מחסן') && c.extras.includes('ממ"ד'), c)
  check(`${tag}: and its phone and link are gone too`, !/054-?0000000|yad2\.co\.il/.test(c.all))
  await tap(page, '[data-act="from-yad2"]')
  await setText(page, '[data-f="ad-text"]', 'שלום, מה נשמע?')
  await wait(150)
  await tap(page, '[data-act="ad-fill"]')
  await wait(300)
  c = await card(page)
  check(`${tag}: a text with no property details says so, and fills nothing`, c.done.includes('לא מצאנו בטקסט פרטים של נכס') && c.hood === '' && c.price === '', c.done)

  check(`${tag}: no sideways scroll`, (await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)) <= 1)
  check(`${tag}: while importing, nothing was fetched from outside this site`, outside.length === 0, outside)
  check(`${tag}: no request to Yad2 at any moment`, toYad2.length === 0, toYad2)
  const dashes = await page.evaluate(() => /[\u2013\u2014]/.test(document.querySelector('.modal-body.ga')?.innerText ?? ''))
  check(`${tag}: no long dashes in the card`, !dashes)
  check(`${tag}: no errors`, errors.length === 0, errors)
  await page.close()
}
await browser.close()
console.log(fails ? `\n${fails} FAILED` : '\nALL CHECKS PASSED')
process.exit(fails ? 1 : 0)
