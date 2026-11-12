// Stage D of the three-layer upgrade (green version): what now works in the browser. A new CRM card (also filled from
// a WhatsApp message), sharing a post with the community, "מוואטסאפ למערכת" (paste, take apart, confirm, publish,
// with no phone number published), the folder's copy-link toast, and no sideways overflow on a phone.
// Usage: node scripts/stage-d-check.mjs [outDir]     (BASE_GREEN overrides the address)
import puppeteer from 'puppeteer-core'
import { mkdirSync } from 'node:fs'

const green = process.env.BASE_GREEN ?? 'http://localhost:5240/NADLANIL-DEMO/green'
const out = process.argv[2] ?? '_shots'
mkdirSync(out, { recursive: true })
const browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--hide-scrollbars'] })
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
const results = []
const check = (name, ok, detail = '') => results.push(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  [' + detail + ']' : ''}`)
const overflow = (page) => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
const clickText = (page, sel, text) => page.evaluate((s, t) => [...document.querySelectorAll(s)].find((e) => e.textContent.includes(t) && e.getBoundingClientRect().width > 0)?.click(), sel, text)
const toast = (page) => page.evaluate(() => document.querySelector('.toast')?.textContent ?? '')
const modal = (page) => page.evaluate(() => document.querySelector('.modal')?.textContent.replace(/\s+/g, ' ') ?? '')
const fields = (page) =>
  page.evaluate(() => {
    const m = document.querySelector('.modal')
    if (!m) return null
    const inputs = [...m.querySelectorAll('.ga-row .input')].map((i) => i.value)
    return { kind: m.querySelector('.ga-fields .chip[aria-pressed="true"]')?.textContent.trim(), city: inputs[0], rooms: inputs[1], price: inputs[2], extras: [...m.querySelectorAll('.ga-fields .field:last-child .chip[aria-pressed="true"]')].map((c) => c.textContent.trim()) }
  })
const modalFits = (page) =>
  page.evaluate(() => {
    const r = document.querySelector('.modal')?.getBoundingClientRect()
    return !!r && r.left >= -1 && r.right <= innerWidth + 1
  })

for (const [label, vp, phone] of [
  ['desktop', { width: 1440, height: 900 }, false],
  ['phone', { width: 390, height: 844, isMobile: true, hasTouch: true }, true],
]) {
  const tag = `green ${label}`
  const page = await browser.newPage()
  const errors = []
  page.on('console', (m) => m.type() === 'error' && !/404/.test(m.text()) && errors.push(m.text()))
  page.on('pageerror', (e) => errors.push(String(e)))
  await page.setViewport(vp)
  const go = async (path, ms = 1500) => {
    await page.goto(green + path, { waitUntil: 'load' })
    await wait(ms)
  }
  const shot = (n) => page.screenshot({ path: `${out}/d-${label}-${n}.png` })
  await go('/', 300)
  await page.evaluate(() => localStorage.clear())

  // ---- 1. a new CRM card
  await go('/app/crm')
  // the clients are a table of their own now: new cards and the board live in the properties tab
  await page.evaluate(() => [...document.querySelectorAll('.seg .seg-btn')].find((b) => b.textContent.trim() === 'נכסים')?.click())
  await wait(700)
  const before = await page.evaluate(() => document.querySelectorAll('.kan-card').length)
  await page.evaluate(() => document.querySelector('[data-act="new-card"]')?.click())
  await wait(800)
  check(`${tag}: "כרטיס חדש" opens a form (not a note that the demo cannot)`, (await modal(page)).includes('כרטיס חדש ב-CRM') && !(await toast(page)).includes('לא ניתן') && (await modalFits(page)))
  await clickText(page, '.ga-from-wa', 'למלא מהודעת וואטסאפ')
  await wait(400)
  await clickText(page, '.ga-paste .tl-alt', 'הודעה לדוגמה')
  await wait(300)
  await clickText(page, '.ga-paste .btn', 'למלא מההודעה')
  await wait(500)
  let f = await fields(page)
  check(`${tag}: the card can be filled from a WhatsApp message (city, rooms, price, extras)`, f?.kind === 'נכס' && f.city === 'פתח תקווה' && f.rooms === '4' && f.price === '2650000' && ['מרפסת שמש', 'חניה', 'מעלית', 'משופצת'].every((x) => f.extras.includes(x)), JSON.stringify(f))
  await shot('1-new-card')
  await clickText(page, '.ga-go', 'הוספה ל-CRM')
  await wait(1200)
  let st = await page.evaluate(() => ({ n: document.querySelectorAll('.kan-card').length, first: document.querySelector('.kan-col .kan-card h3')?.textContent, text: document.querySelector('.kanban')?.textContent ?? '', modal: !!document.querySelector('.modal') }))
  check(`${tag}: the new card enters the board`, st.n === before + 1 && st.text.includes('דירת 4 חדרים בפתח תקווה') && !st.modal && (await toast(page)).includes('הכרטיס נוסף'), JSON.stringify({ n: st.n, before, first: st.first }))
  await shot('2-card-added')
  await page.reload({ waitUntil: 'load' })
  await wait(1400)
  await page.evaluate(() => [...document.querySelectorAll('.seg .seg-btn')].find((b) => b.textContent.trim() === 'נכסים')?.click())
  await wait(700)
  check(`${tag}: and it is still there after a reload`, await page.evaluate(() => document.querySelector('.kanban')?.textContent.includes('דירת 4 חדרים בפתח תקווה')))
  check(`${tag}: no sideways overflow in the CRM`, (await overflow(page)) <= 1)

  // ---- 2. sharing a post
  await go('/app/community', 1900)
  check(`${tag}: no sideways overflow in the feed`, (await overflow(page)) <= 1, `${await overflow(page)}px`)
  const posts = await page.evaluate(() => document.querySelectorAll('.fb.ci').length)
  await page.evaluate(() => document.querySelector('[data-act="share"]')?.click())
  await wait(800)
  check(`${tag}: "שיתוף" opens a share box (not a note that sharing is off)`, (await modal(page)).includes('שיתוף עם הקהילה') && !(await toast(page)).includes('אינו פעיל') && (await modalFits(page)))
  await page.type('.modal textarea', 'שווה לראות')
  await shot('3-share')
  await clickText(page, '.ga-go', 'שיתוף בקהילה')
  await wait(1500)
  st = await page.evaluate(() => ({ n: document.querySelectorAll('.fb.ci').length, first: document.querySelector('.fb.ci')?.textContent.replace(/\s+/g, ' ') ?? '' }))
  check(`${tag}: the shared post enters the feed, in the visitor's name`, st.n === posts + 1 && st.first.includes('מאיה לנדאו') && st.first.includes('שווה לראות') && st.first.includes('שיתוף של פוסט מאת') && (await toast(page)).includes('השיתוף פורסם'), st.first.slice(0, 120))
  await shot('4-shared')

  // ---- 3. from WhatsApp to the system
  if (phone) {
    await clickText(page, '.bottom-link', 'עוד')
    await wait(600)
    await clickText(page, '.more-link', 'מעבדת בטא')
  } else {
    await page.evaluate(() => document.querySelector('.side-lab-link.is-all')?.click())
  }
  await wait(1100)
  await page.evaluate(() => document.querySelector('.bl-tile[data-id="whatsapp"]')?.click())
  await wait(1000)
  check(`${tag}: the free WhatsApp tool has a working button`, await page.evaluate(() => document.querySelector('.ga-lab')?.textContent.includes('להדביק הודעה')))
  await page.evaluate(() => document.querySelector('.ga-lab')?.click())
  await wait(800)
  check(`${tag}: it opens a place to paste a message, and says nothing is connected to WhatsApp`, (await modal(page)).includes('מוואטסאפ למערכת') && (await modal(page)).includes('הדבקה ידנית בלבד. אין חיבור לוואטסאפ') && (await modalFits(page)))
  await clickText(page, '.ga-samples .tl-alt', 'בקשה לדוגמה')
  await wait(300)
  await shot('5-whatsapp-paste')
  await clickText(page, '.ga-go', 'לסדר את ההודעה')
  await wait(600)
  f = await fields(page)
  const m = await modal(page)
  check(`${tag}: the message is taken apart into a request: city, rooms, budget, extras`, f?.kind === 'מחפש לקונה' && f.city === 'רמת גן' && f.rooms === '3' && f.price === '2300000' && f.extras.includes('מעלית') && f.extras.includes('ממ"ד') && m.includes('זיהינו בקשת חיפוש'), JSON.stringify(f))
  check(`${tag}: there is a confirmation step, and it says the phone number will not be published`, m.includes('מצאנו מספר טלפון בהודעה, והוא לא יתפרסם') && m.includes('אישור ופרסום בקהילה'))
  await shot('6-whatsapp-confirm')
  await clickText(page, '.ga-actions .btn', 'אישור ופרסום בקהילה')
  await wait(2200)
  st = await page.evaluate(() => ({ path: location.pathname + location.search, text: document.querySelector('.comm-feed')?.textContent.replace(/\s+/g, ' ') ?? '', all: document.body.textContent }))
  check(`${tag}: after confirming it is published in "מחפש לקונה" and shown`, st.path.includes('topic=seeking') && st.text.includes('מחפשים 3 חדרים ברמת גן') && (await toast(page)).includes('הבקשה פורסמה'), st.path)
  check(`${tag}: the phone number from the message is nowhere on the page`, !st.all.includes('7654321'))
  await shot('7-whatsapp-published')

  check(`${tag}: the lab steps aside after publishing, and the page scrolls again`, await page.evaluate(() => !document.querySelector('.bl') && !document.querySelector('.modal') && document.body.style.overflow !== 'hidden'))

  // ---- 4. the folder's link (the folder belongs to the office)
  await page.evaluate(() => localStorage.setItem('nadlanup-member-v1', 'office'))
  await go('/app/folder')
  await clickText(page, '.folder-toolbar .btn', 'העתקת קישור')
  await wait(600)
  check(`${tag}: "העתקת קישור" in the folder confirms with a toast`, (await toast(page)) === 'הקישור הועתק', await toast(page))
  check(`${tag}: no sideways overflow in the folder`, (await overflow(page)) <= 1)

  check(`${tag}: no console errors`, errors.length === 0, errors.slice(0, 2).join(' | '))
  await page.close()
}

// a narrow phone: the feed and the app's main screens do not scroll sideways
{
  const page = await browser.newPage()
  await page.setViewport({ width: 360, height: 780, isMobile: true, hasTouch: true })
  for (const path of ['/app', '/app/community', '/app/brokers', '/app/crm', '/app/office', '/app/office/leads', '/app/office/deal', '/upgrade', '/join/office', '/about']) {
    await page.goto(green + path, { waitUntil: 'load' })
    await wait(1500)
    await page.evaluate(() => window.scrollTo(0, 1800))
    await wait(500)
    const ov = await overflow(page)
    check(`green 360px: no sideways overflow on ${path}`, ov <= 1, `${ov}px`)
  }
  await page.close()
}

await browser.close().catch(() => {})
console.log(results.join('\n'))
console.log(results.some((r) => r.startsWith('FAIL')) ? '\nSOME CHECKS FAILED' : '\nALL CHECKS PASSED')
