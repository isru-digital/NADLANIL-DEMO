// The calculator compares fairly (Itzik, 14.11.2026): in a regular office or alone the broker pays for ads himself,
// at a price per ad he writes (it starts on an example value that says so); each plan shows how many ads it includes
// and what they would cost bought alone; his explanation is there word for word; and the calculator says it is an
// example only. No promise about deals.
// Usage: node scripts/calc-ads-check.mjs [outDir]     (BASE_GREEN overrides the address)
import puppeteer from 'puppeteer-core'
import { mkdirSync } from 'node:fs'

const green = process.env.BASE_GREEN ?? 'http://localhost:5240/NADLANIL-DEMO/green'
const out = process.argv[2] ?? '_shots/calc-ads'
mkdirSync(out, { recursive: true })
const browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--hide-scrollbars'] })
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
const results = []
const check = (name, ok, detail = '') => {
  const line = `${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  [' + detail + ']' : ''}`
  results.push(line)
  console.error(line)
}
const WHY = 'יותר מודעות = יותר חשיפה = יותר סיכוי לסגור עסקאות. לכן מסלול גדול יותר משתלם יותר ממה שנראה במחיר.'

const state = (page) =>
  page.evaluate(() => {
    const clean = (s) => (s ?? '').replace(/\s+/g, ' ').trim()
    return {
      example: clean(document.querySelector('#calc [data-note="example"]')?.textContent),
      side: clean(document.querySelector('.jo-today h3')?.textContent),
      field: document.querySelector('[data-k="adPrice"]')?.value,
      fieldLabel: clean(document.querySelector('.jo-adprice > span')?.textContent),
      fieldNote: clean(document.querySelector('#adprice-note')?.textContent),
      adsToday: clean(document.querySelector('[data-fact="ads-today"]')?.textContent),
      today: clean(document.querySelector('.jo-today .jo-big')?.textContent),
      todayWhat: clean(document.querySelector('.jo-today .jo-total em')?.textContent),
      ours: clean(document.querySelector('.jo-ours .jo-big')?.textContent),
      rows: [...document.querySelectorAll('.jo-ads-row')].map((r) => `${clean(r.querySelector('b').textContent)} | ${clean(r.querySelector('.jo-ads-n').textContent)} | ${clean(r.querySelector('.jo-ads-worth').textContent)}${r.classList.contains('is-on') ? ' *' : ''}`),
      why: clean(document.querySelector('[data-note="why"]')?.textContent),
      note: clean(document.querySelector('#calc .jo-diff .jo-note')?.textContent),
      calcText: clean(document.querySelector('#calc')?.innerText),
      ov: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    }
  })
const setAdPrice = async (page, v) => {
  // select the field's text directly (a triple click does not select with touch emulation)
  await page.evaluate(() => { const i = document.querySelector('[data-k="adPrice"]'); i.focus(); i.select() })
  await page.keyboard.press('Backspace')
  if (v) await page.type('[data-k="adPrice"]', v)
  await wait(900)
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
  await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }])
  await page.goto(green + '/join/office', { waitUntil: 'load' })
  await wait(1700)
  await page.evaluate(() => document.querySelector('#calc').scrollIntoView({ block: 'start' }))
  await wait(700)

  // ---- the example label, the side's name, the field
  let s = await state(page)
  check(`${d} next to the calculator: "חישוב לדוגמה בלבד"`, s.example === 'חישוב לדוגמה בלבד' && s.note.startsWith('חישוב לדוגמה בלבד'), `${s.example} / ${s.note.slice(0, 40)}`)
  check(`${d} the other side is "a regular office or alone"`, s.side === 'במשרד רגיל או כעצמאים', s.side)
  check(`${d} a field "מחיר למודעה בחודש", filled with an example that says it is an example`, s.fieldLabel === 'מחיר למודעה בחודש' && s.field === '100' && s.fieldNote.startsWith('100 ₪ הוא ערך לדוגמה בלבד'), `${s.fieldLabel} / ${s.field} / ${s.fieldNote}`)

  // ---- BASIC has no ads: nothing added
  check(`${d} on BASIC (no ads) no ads cost is added, and it says why`, s.adsToday === 'במסלול BASIC אין מודעות כלולות, ולכן לא נוספה כאן עלות מודעות.' && s.today === '₪36,000', `${s.adsToday} / ${s.today}`)

  // ---- each plan: its ads, and their cost bought alone
  check(`${d} each plan shows its ads and what they cost bought alone (at 100 ₪)`, s.rows.join(' ; ') === 'BASIC | ללא מודעות יד2 | אין מודעות לקנות * ; PLUS | 5 מודעות יד2 | לקנות לבד: ₪500 בחודש ; PRO | 10 מודעות יד2 | לקנות לבד: ₪1,000 בחודש', s.rows.join(' ; '))
  check(`${d} the explanation, word for word`, s.why === WHY, s.why)
  check(`${d} no promise of how many deals`, !/תסגור|תסגרו|עוד \d+ עסקאות|מבטיח|מובטח/.test(s.calcText))
  await page.screenshot({ path: `${out}/${d}-1-calculator.png` })

  // ---- PRO: the other side pays for 10 ads itself
  await page.evaluate(() => document.querySelector('.jo-ads-row[data-plan="pro"]').click())
  await wait(1000)
  s = await state(page)
  // 6 x 30,000 x 20% = 36,000 a year, plus 10 ads x 100 x 12 = 12,000
  check(`${d} on PRO the other side buys the same 10 ads: 10 × 100 = 1,000 a month, 48,000 a year in all`, s.adsToday.includes('10 × ₪100 = ₪1,000 בחודש') && s.today === '₪48,000' && s.todayWhat === 'עמלות, מודעות' && s.rows[2].endsWith('*'), `${s.adsToday} / ${s.today} / ${s.todayWhat}`)
  check(`${d} ... and ours is PRO: 1,219 × 12`, s.ours === '₪14,628', s.ours)

  // ---- the visitor's own price
  await setAdPrice(page, '150')
  s = await state(page)
  check(`${d} the visitor writes his own price (150): 10 × 150, and the plans' rows follow`, s.adsToday.includes('10 × ₪150 = ₪1,500 בחודש') && s.today === '₪54,000' && s.rows[1].includes('₪750') && s.rows[2].includes('₪1,500'), `${s.adsToday} / ${s.today}`)
  await setAdPrice(page, '')
  s = await state(page)
  check(`${d} an empty price counts as 0`, s.today === '₪36,000' && s.todayWhat === 'עמלות', `${s.today} / ${s.todayWhat}`)
  await setAdPrice(page, 'abc90')
  s = await state(page)
  check(`${d} only digits are taken`, s.field === '90', s.field)
  await setAdPrice(page, '100')

  // ---- Madlan on top: the other side buys those ads too
  await page.evaluate(() => document.querySelector('.jo-ours .prc-choose [data-madlan="m5"]').click())
  await wait(1000)
  s = await state(page)
  check(`${d} with 5 Madlan ads on PRO the other side buys 15 ads`, s.adsToday.includes('ובחבילת המדלן') && s.adsToday.includes('15 × ₪100 = ₪1,500 בחודש'), s.adsToday)
  check(`${d} nothing scrolls sideways`, s.ov <= 1, `${s.ov}px`)
  await page.evaluate(() => document.querySelector('.jo-ads').scrollIntoView({ block: 'center' }))
  await wait(400)
  await page.screenshot({ path: `${out}/${d}-2-plans-ads.png` })
  await page.evaluate(() => document.querySelector('.jo-today').scrollIntoView({ block: 'center' }))
  await wait(400)
  await page.screenshot({ path: `${out}/${d}-3-other-side.png` })

  check(`${d} no page errors`, errors.length === 0, errors.slice(0, 2).join(' | '))
  await page.close()
}

console.log(results.some((r) => r.startsWith('FAIL')) ? '\nSOME CHECKS FAILED' : '\nALL CHECKS PASSED')
await Promise.race([browser.close().catch(() => {}), wait(4000)])
process.exit(0)
