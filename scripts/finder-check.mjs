// "מציאת מתווך בעיר אחרת" (17.11.2026): search a city, the brokers who work there (photo, specialty, years, deals in
// the community), "יש לי לקוח בעיר שלך" opens a short form (seller or buyer, what the client has, referral fee), and a
// city with no broker says "עוד אין מתווך בעיר הזו. נודיע לך כשיצטרף".
// Usage: node scripts/finder-check.mjs [outDir]     (BASE_GREEN overrides the address)
import puppeteer from 'puppeteer-core'
import { mkdirSync } from 'node:fs'

const green = process.env.BASE_GREEN ?? 'http://localhost:5240/NADLANIL-DEMO/green'
const out = process.argv[2] ?? '_shots/finder'
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
  await page.goto(green + '/app/community?topic=referrals', { waitUntil: 'networkidle0' })
  await wait(900)
  const top = await page.evaluate(() => ({
    title: document.querySelector('[data-finder] h2')?.textContent.trim(),
    chips: [...document.querySelectorAll('[data-finder] .bf-chip')].map((c) => c.textContent.trim()),
    search: !!document.querySelector('[data-f="city-search"]'),
  }))
  check(`${tag}: the room opens as "מציאת מתווך בעיר אחרת" with a city search and the cities that have brokers`, top.title === 'מציאת מתווך בעיר אחרת' && top.search && top.chips.includes('חיפה') && top.chips.length >= 8, top)
  await page.evaluate(() => document.querySelector('[data-finder]').scrollIntoView({ block: 'start' }))
  await wait(200)
  await page.screenshot({ path: `${out}/${tag}-1-search.png` })

  // ---- typing a city: suggestions, then the brokers who work there
  await page.type('[data-f="city-search"]', 'חיפ')
  await wait(300)
  const sug = await page.evaluate(() => [...document.querySelectorAll('[data-suggest]')].map((b) => b.dataset.suggest))
  check(`${tag}: typing shows matching cities`, sug.includes('חיפה'), sug)
  await tap(page, '[data-suggest="חיפה"]')
  await wait(500)
  const res = await page.evaluate(() => {
    const rows = [...document.querySelectorAll('[data-results] .bf-row')]
    return {
      count: document.querySelector('.bf-count')?.textContent,
      rows: rows.map((r) => ({
        face: !!r.querySelector('.avatar img, .avatar.is-initials, img'),
        name: r.querySelector('.bf-who > b')?.textContent,
        spec: r.querySelector('.bf-specs')?.textContent,
        years: r.querySelector('[data-years]')?.textContent,
        deals: r.querySelector('[data-deals]')?.textContent,
        btn: r.querySelector('[data-act="refer-to"]')?.textContent.trim(),
        h: Math.round(r.querySelector('[data-act="refer-to"]')?.getBoundingClientRect().height ?? 0),
      })),
    }
  })
  check(`${tag}: the brokers in חיפה, each with a photo, specialty, years and deals in the community`, res.rows.length >= 1 && res.rows.every((r) => r.face && r.name && r.spec && /שנות ניסיון/.test(r.years) && /עסקאות בקהילה/.test(r.deals)), res)
  check(`${tag}: each has "יש לי לקוח בעיר שלך" (44px and up)`, res.rows.every((r) => r.btn === 'יש לי לקוח בעיר שלך' && r.h >= 44), res.rows.map((r) => [r.btn, r.h]))
  await page.evaluate(() => document.querySelector('[data-results]').scrollIntoView({ block: 'start' }))
  await wait(200)
  await page.screenshot({ path: `${out}/${tag}-2-brokers.png` })

  // ---- the short form
  const itemsBefore = await page.evaluate(() => (JSON.parse(localStorage.getItem('brokers-demo-state-v5') ?? '{}').items ?? []).length)
  await tap(page, '[data-results] .bf-row [data-act="refer-to"]')
  await page.waitForSelector('[data-refer]', { visible: true })
  await wait(300)
  const form = await page.evaluate(() => ({
    sides: [...document.querySelectorAll('[data-refer] [data-side]')].map((b) => b.textContent.trim()),
    fees: [...document.querySelectorAll('[data-refer] [data-fee]')].map((b) => `${b.textContent.trim()}${b.getAttribute('aria-checked') === 'true' ? '*' : ''}`),
    what: !!document.querySelector('[data-refer] [data-f="what"]'),
  }))
  check(`${tag}: the form: seller or buyer, what the client has, and the referral fee (25% to start)`, form.sides.join() === 'מוכר,קונה' && form.what && form.fees.join() === '20%,25%*,30%,לפי סיכום', form)
  await page.screenshot({ path: `${out}/${tag}-3-form.png` })
  await tap(page, '[data-act="send-refer"]')
  await wait(300)
  const err = await page.evaluate(() => document.querySelector('[data-refer] [role="alert"]')?.textContent)
  check(`${tag}: it asks for a few words before sending`, !!err, err)
  await page.type('[data-refer] [data-f="what"]', '4 חדרים עם מרפסת, רוצים למכור בחודשים הקרובים')
  await tap(page, '[data-refer] [data-fee="30%"]')
  await page.type('[data-refer] [data-f="name"]', 'דליה ש.')
  await page.type('[data-refer] [data-f="phone"]', '054-555-0191')
  await tap(page, '[data-act="send-refer"]')
  await wait(900)
  const after = await page.evaluate(() => ({
    toast: document.querySelector('.toast')?.textContent,
    sent: !!document.querySelector('[data-results] .bf-row [data-sent]'),
    client: JSON.parse(localStorage.getItem('nadlanup-clients-v1') ?? '[]').find((c) => c.name === 'דליה ש.'),
    items: (JSON.parse(localStorage.getItem('brokers-demo-state-v5') ?? '{}').items ?? []).length,
    leak: (JSON.parse(localStorage.getItem('brokers-demo-state-v5') ?? '{}').items ?? []).some((x) => JSON.stringify(x).includes('דליה')),
  }))
  check(`${tag}: sending says it went to the broker, marks the row "נשלחה הפניה", and keeps the client in the CRM`, /ההפניה נשלחה ל/.test(after.toast ?? '') && after.sent && after.client?.type === 'seller' && /30%/.test(after.client.about) && /חיפה/.test(after.client.about), after)
  check(`${tag}: nothing is published in the community, and the client's name is nowhere there`, after.items === itemsBefore && !after.leak, { before: itemsBefore, after: after.items })

  // ---- a city with no broker yet
  await page.click('.bf-clear')
  await page.type('[data-f="city-search"]', 'אילת')
  await wait(300)
  const s2 = await page.evaluate(() => document.querySelector('[data-suggest="אילת"] small')?.textContent)
  await tap(page, '[data-suggest="אילת"]')
  await wait(500)
  const empty = await page.evaluate(() => ({
    text: document.querySelector('[data-empty] b')?.textContent.trim(),
    watch: JSON.parse(localStorage.getItem('nadlanup-city-watch-v1') ?? '[]'),
  }))
  check(`${tag}: a city with no broker: "עוד אין מתווך בעיר הזו. נודיע לך כשיצטרף", and the city is kept to hear about`, s2 === 'עוד אין מתווך' && empty.text === 'עוד אין מתווך בעיר הזו. נודיע לך כשיצטרף' && empty.watch.includes('אילת'), { s2, empty })
  await page.evaluate(() => document.querySelector('[data-empty]').scrollIntoView({ block: 'center' }))
  await wait(200)
  await page.screenshot({ path: `${out}/${tag}-4-empty.png` })
  await tap(page, '[data-act="open-referral"]')
  await page.waitForSelector('[data-picker="referral"]', { visible: true })
  const pre = await page.evaluate(() => document.querySelector('[data-picker="referral"] [data-city][aria-pressed="true"]')?.dataset.city)
  check(`${tag}: from there, an open referral to the whole community, with the city already picked`, pre === 'אילת', pre)
  await page.keyboard.press('Escape')
  await wait(400)

  const wide = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
  check(`${tag}: no sideways scroll`, wide <= 1, { wide })
  await page.close()
}

console.log(fails ? '\nSOME CHECKS FAILED' : '\nALL CHECKS PASSED')
await Promise.race([browser.close().catch(() => {}), wait(4000)])
process.exit(0)
