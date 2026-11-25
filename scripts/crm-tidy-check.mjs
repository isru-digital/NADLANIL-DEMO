// The CRM round of 25.11.2026, on a computer and on a phone, in day and in night:
// 1. a buyer's card on a phone: name, type, cities with two neighbourhoods at most and "+N עוד", rooms and kind,
//    budget, short lines with icons, nothing cut and no sideways scroll; "נכסים מתאימים" big enough for a thumb.
// 2. the client's window has no "שלב" and no "סימון מהיר" any more; what was saved in them stays in the data, and the
//    rest of the window (the note) and the new client form still work.
// 3. "מחפש נכס בהתחדשות עירונית" in the window of a buyer or a renter, the same switch as the property form's: saved,
//    kept after a reload, shown as a tag on the buyer's card; a seller has no such switch.
// 4. "מצב הנכס" on the new property form: five tags in order, one picked, and the tag on the CRM card.
// (5. "לקוח שמחפש" on the property form: Itzik chose to skip it, nothing to check.)
// Usage: node scripts/crm-tidy-check.mjs [outDir]     (BASE_GREEN overrides the address)
import puppeteer from 'puppeteer-core'
import { mkdirSync } from 'node:fs'

const green = process.env.BASE_GREEN ?? 'http://localhost:5240/NADLANIL-DEMO/green'
const out = process.argv[2] ?? '_shots/crm-tidy'
mkdirSync(out, { recursive: true })
const browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--hide-scrollbars'] })
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
const results = []
const check = (name, ok, detail = '') => {
  const line = `${ok ? 'PASS' : 'FAIL'}  ${name}${ok || !detail ? '' : '  [' + (typeof detail === 'string' ? detail : JSON.stringify(detail)) + ']'}`
  results.push(line)
  if (!ok) console.error(line)
}
const PREVIEW = '6d5eaaca072bf02f647051d8688d1337a4ab7a6cb92a2a8b3924cf91fda89e8b'
const CONDITIONS = ['חדש מקבלן', 'חדש עד 5 שנים', 'משופץ', 'שמור', 'דרוש שיפוץ']

/** the contrast of an element's text against the first solid background under it (WCAG ratio) */
const contrastOf = (page, sel) =>
  page.evaluate((s) => {
    const el = document.querySelector(s)
    if (!el) return null
    const rgb = (c) => (c.match(/[\d.]+/g) ?? []).map(Number)
    const lum = ([r, g, b]) => {
      const f = (v) => ((v /= 255) <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)
      return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)
    }
    // the backgrounds from the page up to the element, laid one on the other
    const chain = []
    for (let n = el; n; n = n.parentElement) chain.unshift(getComputedStyle(n).backgroundColor)
    let bg = [255, 255, 255]
    for (const c of chain) {
      const [r, g, b, a = 1] = rgb(c)
      if (c === 'transparent' || a === 0) continue
      bg = [r * a + bg[0] * (1 - a), g * a + bg[1] * (1 - a), b * a + bg[2] * (1 - a)]
    }
    const [r, g, b, a = 1] = rgb(getComputedStyle(el).color)
    const fg = [r * a + bg[0] * (1 - a), g * a + bg[1] * (1 - a), b * a + bg[2] * (1 - a)]
    const [x, y] = [lum(fg), lum(bg)].sort((p, q) => q - p)
    return Math.round(((x + 0.05) / (y + 0.05)) * 100) / 100
  }, sel)

for (const dev of [
  { name: 'desktop', vp: { width: 1440, height: 900 } },
  { name: 'phone', vp: { width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 } },
]) {
  const d = dev.name
  const phone = d === 'phone'
  for (const mode of ['day', 'night']) {
    const tag = `${d} ${mode}`
    const page = await browser.newPage()
    const errors = []
    page.on('pageerror', (e) => errors.push(String(e)))
    page.on('console', (m) => m.type() === 'error' && !/favicon|Failed to load resource/.test(m.text()) && errors.push(m.text()))
    await page.evaluateOnNewDocument(() => {
      try {
        localStorage.setItem('nadlanup-demo-v1', '1')
      } catch {}
    })
    await page.setViewport(dev.vp)
    await page.goto(green + '/', { waitUntil: 'load' })
    await page.evaluate(
      (m, p) => {
        localStorage.clear()
        localStorage.setItem('nadlanup-demo-v1', '1')
        localStorage.setItem('nadlanup-preview-v1', p)
        localStorage.setItem('nadlanup-mode-v1', JSON.stringify({ mode: m, until: Date.now() + 9e9 }))
      },
      mode,
      PREVIEW,
    )
    const shot = async (name, sel) => {
      if (sel) await page.$eval(sel, (el) => el.scrollIntoView({ block: 'start', behavior: 'instant' })).catch(() => {})
      await wait(350)
      await page.screenshot({ path: `${out}/${d}-${mode}-${name}.png` })
    }
    await page.goto(green + '/app/crm', { waitUntil: 'networkidle0' })
    await wait(900)

    // ------------------------------------------------------------ 1. the buyer's card
    const k1 = await page.evaluate(() => {
      const tr = document.querySelector('.ct-table tbody tr[data-id="k1"]')
      const facts = tr?.querySelector('[data-facts]')
      const shown = !!facts && facts.getBoundingClientRect().height > 0
      const lines = facts ? [...facts.querySelectorAll('li')].map((li) => ({ fact: li.dataset.fact, text: li.textContent.trim(), cut: li.scrollWidth > li.clientWidth + 1, svg: !!li.querySelector('svg') })) : []
      const btn = tr?.querySelector('.ct-match')?.getBoundingClientRect()
      return { shown, lines, btnH: btn ? Math.round(btn.height) : 0, btnText: tr?.querySelector('.ct-match')?.textContent.trim(), type: tr?.querySelector('.ct-type')?.textContent.trim(), name: tr?.querySelector('.ct-name b')?.textContent.trim() }
    })
    const seller = await page.evaluate(() => !!document.querySelector('.ct-table tbody tr[data-id="k2"] [data-facts]'))
    const over = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
    if (phone) {
      const where = k1.lines.find((l) => l.fact === 'where')?.text ?? ''
      const what = k1.lines.find((l) => l.fact === 'what')?.text ?? ''
      const budget = k1.lines.find((l) => l.fact === 'budget')?.text ?? ''
      check(`${tag}: a buyer's card shows the name, the type and short lines with icons`, k1.shown && k1.name === 'רון ומיכל ק.' && k1.type === 'קונה' && k1.lines.length >= 3 && k1.lines.every((l) => l.svg), k1)
      check(`${tag}: the city and two neighbourhoods, then "+2 עוד" (of four)`, /תל אביב/.test(where) && where.includes('לב העיר, הצפון הישן') && !where.includes('נווה צדק') && /\+2\s*עוד/.test(where), where)
      check(`${tag}: rooms with the kind, and the budget`, /3 חדרים/.test(what) && /דירה/.test(what) && /3\.2/.test(budget), { what, budget })
      check(`${tag}: no line of the card is cut, and the page does not scroll sideways`, k1.lines.every((l) => !l.cut) && over <= 0, { over, cut: k1.lines.filter((l) => l.cut) })
      check(`${tag}: "נכסים מתאימים" stays on the card, at least 44px high`, k1.btnText === 'נכסים מתאימים' && k1.btnH >= 44, k1.btnH)
      check(`${tag}: a seller's card has no buyer lines`, !seller)
      // every buyer and renter card, not only the first: nothing cut
      const allCut = await page.evaluate(() => [...document.querySelectorAll('.ct-table [data-facts] li')].filter((li) => li.scrollWidth > li.clientWidth + 1).map((li) => li.textContent))
      check(`${tag}: no line is cut on any buyer's or renter's card`, allCut.length === 0, allCut)
      const c = await contrastOf(page, '.ct-table tr[data-id="k1"] [data-fact="where"]')
      check(`${tag}: the card's lines are readable (contrast at least 4.5)`, c >= 4.5, c)
      // the page scrolls smoothly: jump at once, or the picture is taken half way
      await page.$eval('.ct-table tbody tr[data-id="k1"]', (el) => el.scrollIntoView({ block: 'center', behavior: 'instant' }))
      await wait(500)
      await page.screenshot({ path: `${out}/${d}-${mode}-1-buyer-cards.png` })
    } else {
      check(`${tag}: on a computer the table keeps its row line, the phone lines are hidden`, !k1.shown && over <= 0, k1)
      if (mode === 'day') await shot('1-table', '.ct-wrap')
    }

    // ------------------------------------------------------------ 2. no stage and no quick marks in the client's window
    // k3 was saved with stage "tour" and "תואם סיור": that stays in the data
    await page.$eval('.ct-table tbody tr[data-id="k3"] .ct-name button', (b) => b.click())
    await page.waitForSelector('.ct-det', { visible: true })
    await wait(450)
    const det = await page.evaluate(() => ({
      stage: !!document.querySelector('.ct-det .ct-stage'),
      marks: document.querySelectorAll('.ct-det .ct-mark').length,
      words: ['סימון מהיר', 'חזרתי לבעלים', 'תואם סיור', 'בלעדיות'].filter((w) => document.querySelector('.ct-det')?.textContent.includes(w)),
      labels: [...document.querySelectorAll('.ct-det .ct-label')].map((l) => l.textContent.trim()),
      note: !!document.querySelector('.ct-det input.input'),
      renewal: document.querySelector('.ct-det [data-f="client-renewal"]')?.getAttribute('aria-checked'),
    }))
    check(`${tag}: the client's window has no "שלב" and no "סימון מהיר"`, !det.stage && det.marks === 0 && det.words.length === 0 && !det.labels.includes('שלב'), det)
    check(`${tag}: the note is still in the window`, det.note, det)
    await page.click('.ct-det input.input', { clickCount: 3 })
    await page.type('.ct-det input.input', 'לבדוק שוב בשבוע הבא')
    await wait(300)
    const kept = await page.evaluate(() => JSON.parse(localStorage.getItem('nadlanup-clients-v1') ?? '[]').find((c) => c.id === 'k3'))
    check(`${tag}: what was saved in the stage and the marks stays in the client's data`, kept && kept.stage === 'tour' && kept.tourSet === true && kept.note === 'לבדוק שוב בשבוע הבא', kept && { stage: kept.stage, tourSet: kept.tourSet, note: kept.note })

    // ------------------------------------------------------------ 3. urban renewal on a renter (k3)
    check(`${tag}: a renter's window has the urban renewal switch, off`, det.renewal === 'false', det)
    if (mode === 'day') await shot('2-client-window', '.ct-det')
    await page.$eval('.ct-det [data-f="client-renewal"]', (b) => {
      b.scrollIntoView({ block: 'center' })
      b.click()
    })
    await wait(300)
    const on = await page.evaluate(() => ({
      aria: document.querySelector('.ct-det [data-f="client-renewal"]')?.getAttribute('aria-checked'),
      same: document.querySelector('.ct-det [data-f="client-renewal"]')?.className,
      text: document.querySelector('.ct-det [data-f="client-renewal"] b')?.textContent,
      saved: JSON.parse(localStorage.getItem('nadlanup-clients-v1') ?? '[]').find((c) => c.id === 'k3')?.renewal,
    }))
    check(`${tag}: the switch turns on, is the property form's switch (ga-renew) and is saved`, on.aria === 'true' && on.same === 'ga-renew' && on.text === 'מחפש נכס בהתחדשות עירונית' && on.saved === true, on)
    const rc = await contrastOf(page, '.ct-det [data-f="client-renewal"] b')
    check(`${tag}: the switch's words are readable (contrast at least 4.5)`, rc >= 4.5, rc)
    if (phone || mode === 'day') await shot('3-renewal-on')
    await page.keyboard.press('Escape')
    await wait(500)
    // a seller has no such switch
    await page.$eval('.ct-table tbody tr[data-id="k2"] .ct-name button', (b) => b.click())
    await page.waitForSelector('.ct-det', { visible: true })
    await wait(350)
    check(`${tag}: a seller's window has no urban renewal switch`, await page.evaluate(() => document.querySelector('.ct-det')?.dataset.id === 'k2' && !document.querySelector('.ct-det [data-f="client-renewal"]')))
    await page.keyboard.press('Escape')
    await wait(400)
    // kept after a reload, and the tag on the renter's card (on a phone)
    await page.reload({ waitUntil: 'networkidle0' })
    await wait(800)
    const after = await page.evaluate(() => ({
      tag: !!document.querySelector('.ct-table tr[data-id="k3"] [data-fact="renewal"] .kan-renew'),
      shown: (document.querySelector('.ct-table tr[data-id="k3"] [data-fact="renewal"]')?.getBoundingClientRect().height ?? 0) > 0,
    }))
    check(`${tag}: after a reload the renter's card carries the "התחדשות עירונית" tag${phone ? '' : ' (hidden with the phone lines on a computer)'}`, after.tag && after.shown === phone, after)

    // the new client form still adds a buyer with a full search
    await page.$eval('[data-act="new-client"]', (b) => b.click())
    await page.waitForSelector('.ct-new [data-f="name"]', { visible: true })
    await wait(400)
    const form = await page.evaluate(() => ({ stage: !!document.querySelector('.nc .ct-label') && [...document.querySelectorAll('.nc .ct-label')].some((l) => /סימון מהיר/.test(l.textContent)), search: !!document.querySelector('.nc [data-search]') }))
    await page.type('.ct-new [data-f="name"]', 'בדיקה קונה')
    await page.$eval('.nc [data-city="רמת גן"]', (b) => b.click())
    await page.$eval('[data-act="add-client"]', (b) => b.click())
    await wait(700)
    const added = await page.evaluate(() => JSON.parse(localStorage.getItem('nadlanup-clients-v1') ?? '[]').find((c) => c.name === 'בדיקה קונה'))
    check(`${tag}: the new client form works as before (a buyer with a search is added)`, !form.stage && form.search && added?.type === 'buyer' && added.cities?.includes('רמת גן') && added.roomsMin === 3, { form, added: added && { type: added.type, cities: added.cities } })

    // ------------------------------------------------------------ 4. "מצב הנכס" on a new property
    await page.goto(green + '/app/crm?v=properties', { waitUntil: 'networkidle0' })
    await wait(700)
    await page.$eval('[data-act="new-card"]', (b) => b.click())
    await page.waitForSelector('.ga-fields', { visible: true })
    await wait(450)
    const conds = await page.evaluate(() => ({
      label: document.querySelector('.ga [data-f="condition"] .field-label')?.textContent,
      tags: [...document.querySelectorAll('.ga [data-f="condition"] [data-condition]')].map((b) => b.textContent.trim()),
      picked: document.querySelectorAll('.ga [data-f="condition"] [aria-pressed="true"]').length,
      seeking: ['לקוח שמחפש'].filter((w) => document.querySelector('.ga')?.textContent.includes(w)),
    }))
    check(`${tag}: the property form has "מצב הנכס" with the five tags in order, none picked`, conds.label === 'מצב הנכס' && JSON.stringify(conds.tags) === JSON.stringify(CONDITIONS) && conds.picked === 0, conds)
    await page.evaluate(() => document.querySelector('.ga [data-cat="home"]')?.click())
    await wait(450)
    await page.evaluate(() => document.querySelector('.ga .pf-kind[data-kind="דירה"]')?.click())
    await page.evaluate(() => document.querySelector('[data-slider="coop"] [data-step="more"]')?.click())
    await page.$eval('.ga [data-condition="שמור"]', (b) => b.click())
    await page.$eval('.ga [data-condition="משופץ"]', (b) => {
      b.scrollIntoView({ block: 'center' })
      b.click()
    })
    await wait(300)
    const one = await page.evaluate(() => [...document.querySelectorAll('.ga [data-f="condition"] [aria-pressed="true"]')].map((b) => b.textContent.trim()))
    check(`${tag}: one condition is picked at a time`, JSON.stringify(one) === JSON.stringify(['משופץ']), one)
    const cc = await contrastOf(page, '.ga [data-condition="משופץ"]')
    check(`${tag}: the picked tag is readable (contrast at least 4.5)`, cc >= 4.5, cc)
    if (phone || mode === 'day') await shot('4-condition-form')
    await page.$eval('.ga-go', (b) => b.click())
    await wait(900)
    await page.$eval('[data-act="close-match"]', (b) => b.click()).catch(() => {})
    await wait(500)
    const card = await page.evaluate(() => {
      const c = document.querySelector('.kan-card .kan-cond')
      return { text: c?.textContent.trim(), saved: JSON.parse(localStorage.getItem('brokers-demo-state-v5') ?? '{}').crm?.find?.((x) => x.condition)?.condition }
    })
    check(`${tag}: the new property's CRM card shows "משופץ"`, card.text === 'משופץ', card)
    const kc = await contrastOf(page, '.kan-card .kan-cond')
    check(`${tag}: the condition tag on the card is readable (contrast at least 4.5)`, kc >= 4.5, kc)
    const over2 = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
    check(`${tag}: the properties page does not scroll sideways`, over2 <= 0, over2)
    await page.$eval('.kan-card .kan-cond', (el) => el.closest('.kan-card').scrollIntoView({ block: 'center', behavior: 'instant' }))
    await wait(350)
    if (phone || mode === 'day') await page.screenshot({ path: `${out}/${d}-${mode}-5-condition-card.png` })

    check(`${tag}: no errors in the page`, errors.length === 0, errors.slice(0, 3))
    await page.close()
  }
}

const failed = results.filter((r) => r.startsWith('FAIL')).length
console.log(results.join('\n'))
console.log(`\n${results.length - failed}/${results.length} passed`)
console.log(failed ? 'SOME CHECKS FAILED' : 'ALL CHECKS PASSED')
await browser.close().catch(() => {})
process.exit(failed ? 1 : 0)
