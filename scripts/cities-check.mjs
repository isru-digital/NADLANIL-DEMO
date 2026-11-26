// Every city of Israel in the search of a city (Itzik 26.11.2026: "ערים ומועצות"), on a computer and on a phone, by
// day and by night:
// - the list (src/config/cities-il.json, built by scripts/build-cities.mjs from data.gov.il) holds the cities and local
//   councils, and not tribes, kibbutzim or moshavim; every city that has streets and neighbourhoods is in it;
// - the popular cities stay as shortcuts, and a box under them finds any city by typing: in the property form, the
//   buyer form, the sign-up page and the feed's cities window;
// - "קרית" finds "קריית", a wrong name says so, a city found and picked shows as picked, and nothing is sent by Enter.
// Usage: node scripts/cities-check.mjs [outDir]     (BASE_GREEN overrides the address)
import puppeteer from 'puppeteer-core'
import { mkdirSync, readFileSync } from 'node:fs'

const green = process.env.BASE_GREEN ?? 'http://localhost:5240/NADLANIL-DEMO/green'
const out = process.argv[2] ?? '_shots/round-12'
mkdirSync(out, { recursive: true })
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
const results = []
const check = (name, ok, detail = '') => {
  const line = `${ok ? 'PASS' : 'FAIL'}  ${name}${ok || !detail ? '' : '  [' + (typeof detail === 'string' ? detail : JSON.stringify(detail)) + ']'}`
  results.push(line)
  if (!ok) console.error(line)
}

// ================================================================ the list itself
const list = JSON.parse(readFileSync('src/config/cities-il.json', 'utf8'))
const geo = Object.keys(JSON.parse(readFileSync('src/config/geo-index.json', 'utf8')))
check('list: some 200 cities and local councils', list.length >= 190 && list.length <= 260, list.length)
check('list: no name twice, and sorted', new Set(list).size === list.length && [...list].sort((a, b) => a.localeCompare(b, 'he')).join() === list.join())
check('list: big cities and small councils are in it', ['תל אביב', 'ירושלים', 'קריית גת', 'דימונה', 'שדרות', 'מטולה', 'כפר שמריהו', 'אום אל-פחם', 'קצרין'].every((c) => list.includes(c)))
check('list: no tribes, kibbutzim or moshavim, and no place that is not a town', !list.some((c) => /שבט|^(דגניה|נהלל|עין גדי|חברון|מקווה ישראל)/.test(c)), list.filter((c) => /שבט/.test(c)))
check('list: every city that has streets and neighbourhoods is in it', geo.every((c) => list.includes(c)), geo.filter((c) => !list.includes(c)))
check('list: the names are written the way the app writes them', !list.some((c) => /^קרית |תל אביב - יפו|מכבים/.test(c)))

const PREVIEW = '6d5eaaca072bf02f647051d8688d1337a4ab7a6cb92a2a8b3924cf91fda89e8b'
const browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--hide-scrollbars'] })

for (const dev of [
  { name: 'desktop', vp: { width: 1440, height: 900 } },
  { name: 'phone', vp: { width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 } },
]) {
  const d = dev.name
  for (const mode of ['day', 'night']) {
    const tag = `${d} ${mode}`
    const ctx = await browser.createBrowserContext()
    const page = await ctx.newPage()
    const errors = []
    page.on('pageerror', (e) => errors.push(String(e)))
    page.on('console', (m) => m.type() === 'error' && !/favicon|Failed to load resource/.test(m.text()) && errors.push(m.text()))
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
      if (sel) await page.evaluate((s) => document.querySelector(s)?.scrollIntoView({ block: 'center' }), sel)
      await wait(400)
      await page.screenshot({ path: `${out}/${d}-${mode}-${name}.png` })
    }
    const go = async (path, ms = 1500) => {
      await page.goto(green + path, { waitUntil: 'load' })
      await wait(ms)
    }
    const click = async (sel) => {
      await page.waitForSelector(sel, { timeout: 8000 })
      await page.evaluate((s) => {
        const el = document.querySelector(s)
        el.scrollIntoView({ block: 'center' })
        el.click()
      }, sel)
      await wait(350)
    }
    const type = async (sel, text) => {
      await page.waitForSelector(sel, { timeout: 8000 })
      await page.$eval(sel, (el) => (el.scrollIntoView({ block: 'center' }), el.focus(), el.select?.()))
      await page.keyboard.press('Backspace')
      await page.keyboard.type(text)
      await wait(500)
    }
    const overflow = () => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
    /** what the search of a city shows now */
    const find = (id) =>
      page.evaluate((id) => {
        const f = document.querySelector(`[data-city-find="${id}"]`)
        if (!f) return null
        const input = f.querySelector('[data-f="city-find-all"]')
        const hits = [...f.querySelectorAll('[data-city-hit]')]
        const rgb = (c) => (c.match(/[\d.]+/g) ?? []).slice(0, 3).map(Number)
        const lum = (c) => rgb(c).map((v) => ((v /= 255) <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)).reduce((s, v, i) => s + v * [0.2126, 0.7152, 0.0722][i], 0)
        const contrast = (el) => {
          let bg = el
          while (bg && /rgba\(0, 0, 0, 0\)|transparent/.test(getComputedStyle(bg).backgroundColor)) bg = bg.parentElement
          const a = lum(getComputedStyle(el).color)
          const b = lum(bg ? getComputedStyle(bg).backgroundColor : 'rgb(255,255,255)')
          return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)
        }
        return {
          placeholder: input?.placeholder,
          typed: input?.value,
          inputH: Math.round(input?.getBoundingClientRect().height ?? 0),
          font: parseFloat(getComputedStyle(input).fontSize),
          hits: hits.map((h) => h.dataset.cityHit),
          on: hits.filter((h) => h.getAttribute('aria-pressed') === 'true').map((h) => h.dataset.cityHit),
          rowH: Math.min(...hits.map((h) => Math.round(h.getBoundingClientRect().height)), 999),
          contrast: hits[0] ? Math.round(contrast(hits[0]) * 10) / 10 : null,
          none: f.querySelector('[data-none]')?.textContent.replace(/\s+/g, ' ').trim() ?? null,
          open: !!f.querySelector('[data-hits]'),
        }
      }, id)
    const box = (id) => `[data-city-find="${id}"] [data-f="city-find-all"]`

    // ================================================================ the property form
    await go('/app/crm?v=properties', 1200)
    await click('[data-act="new-card"]')
    await page.waitForSelector('.ga-fields', { visible: true })
    await wait(400)
    let f = await find('property')
    let st = await page.evaluate(() => {
      const picks = document.querySelector('.ga [data-f="city"] .ga-picks')
      const findBox = document.querySelector('[data-city-find="property"]')
      return { shortcuts: [...picks.querySelectorAll('[data-city]')].map((b) => b.dataset.city), more: !!picks.querySelector('[data-act="more-cities"]'), under: !!(picks.compareDocumentPosition(findBox) & Node.DOCUMENT_POSITION_FOLLOWING) }
    })
    check(`${tag}: property form: the popular cities stay as shortcuts, and the search of every city is under them`, st.shortcuts.includes('תל אביב') && st.shortcuts.length >= 6 && st.more && st.under && f?.placeholder === 'חיפוש עיר, כל הערים בישראל' && !f.open, { st, f })
    check(`${tag}: property form: the box is easy to tap and does not zoom the phone`, f.inputH >= 44 && f.font >= 16, f)
    await type(box('property'), 'קרית')
    f = await find('property')
    check(`${tag}: property form: "קרית" finds the cities written "קריית"`, f.hits.length >= 5 && f.hits.every((h) => h.startsWith('קריית')) && f.hits.includes('קריית גת'), f.hits)
    check(`${tag}: property form: every city found is a row a finger can tap, and reads`, f.rowH >= 44 && f.contrast >= 4.5, f)
    await shot('5-city-search', '[data-city-find="property"]')
    check(`${tag}: nothing scrolls sideways with the cities found`, (await overflow()) <= 1)
    await type(box('property'), 'זזזקק')
    f = await find('property')
    check(`${tag}: property form: a name that is no city says so`, f.hits.length === 0 && f.none === 'לא נמצאה עיר בשם הזה. כדאי לבדוק את האיות.', f)
    await type(box('property'), 'גת')
    f = await find('property')
    check(`${tag}: property form: a word of the name finds the city ("גת" finds "קריית גת")`, f.hits.includes('קריית גת'), f.hits)
    await click('[data-city-find="property"] [data-city-hit="קריית גת"]')
    f = await find('property')
    st = await page.evaluate(() => ({ on: [...document.querySelectorAll('.ga [data-f="city"] .ga-picks [aria-pressed="true"]')].map((b) => b.dataset.city), modal: !!document.querySelector('.ga-fields') }))
    check(`${tag}: property form: the city found is the city picked, and the box closes`, st.on.join() === 'קריית גת' && st.modal && !f.open && f.typed === '', { st, f })
    // a city with no list of its own: the place is typed by hand, and the form says so
    await click('.ga [data-cat="home"]')
    await click('.ga .pf-kind[data-kind="דירה"]')
    await wait(900)
    await type('[data-places="property"] [data-f="hood-search"]', 'המרכז')
    await wait(600)
    st = await page.evaluate(() => {
      const p = document.querySelector('[data-places="property"]')
      return { lock: !!p?.querySelector('[data-lock]'), byHand: !!p?.querySelector('[data-act="manual"]'), text: p?.textContent.replace(/\s+/g, ' ') ?? '' }
    })
    check(`${tag}: property form: a city that has no list yet says so, and the place is added by hand`, !st.lock && st.byHand && st.text.includes('אין לנו עדיין רשימה לעיר הזאת'), st)
    await shot('5-city-picked', '.ga [data-f="city"]')
    // Enter in the box picks the first city found, and sends nothing
    await type(box('property'), 'דימונ')
    await page.keyboard.press('Enter')
    await wait(400)
    st = await page.evaluate(() => ({ on: [...document.querySelectorAll('.ga [data-f="city"] .ga-picks [aria-pressed="true"]')].map((b) => b.dataset.city), modal: !!document.querySelector('.ga-fields') }))
    check(`${tag}: property form: Enter picks the first city found, and the form stays open`, st.on.join() === 'דימונה' && st.modal, st)

    // ================================================================ the buyer form: several cities
    await go('/app/community?topic=seeking', 1500)
    await click('[data-act="add-buyer"]')
    await page.waitForSelector('.nc [data-city-find="buyer"]', { visible: true })
    await wait(400)
    await type(box('buyer'), 'שדרות')
    await click('[data-city-find="buyer"] [data-city-hit="שדרות"]')
    await type(box('buyer'), 'ערד')
    await click('[data-city-find="buyer"] [data-city-hit="ערד"]')
    f = await find('buyer')
    st = await page.evaluate(() => ({ on: [...document.querySelectorAll('.nc [data-f="cities"] .nc-picks [aria-pressed="true"]')].map((b) => b.dataset.city), lock: !!document.querySelector('[data-places="buyer"] [data-lock]') }))
    check(`${tag}: buyer form: two cities found by the search are both picked, and the neighbourhoods open`, st.on.includes('שדרות') && st.on.includes('ערד') && st.on.length === 2 && !st.lock && f.on.join() === 'ערד', { st, f })
    await click('[data-city-find="buyer"] [data-city-hit="ערד"]')
    st = await page.evaluate(() => [...document.querySelectorAll('.nc [data-f="cities"] .nc-picks [aria-pressed="true"]')].map((b) => b.dataset.city))
    check(`${tag}: buyer form: a second tap on a city found takes it off`, st.join() === 'שדרות', st)
    await shot('5-city-buyer', '[data-city-find="buyer"]')
    check(`${tag}: nothing scrolls sideways in the buyer form`, (await overflow()) <= 1)

    // ================================================================ the sign-up page
    await go('/kehila/join', 1500)
    await type(box('signup'), 'מטולה')
    f = await find('signup')
    check(`${tag}: sign-up: the search finds a small council`, f.hits.join() === 'מטולה', f.hits)
    await page.keyboard.press('Enter')
    await wait(500)
    st = await page.evaluate(() => ({
      on: [...document.querySelectorAll('.au-cities [aria-checked="true"]')].map((b) => b.dataset.city),
      areas: document.querySelector('[data-f="areas"]')?.dataset.open,
      sent: !document.querySelector('.au-cities'),
    }))
    check(`${tag}: sign-up: Enter ticks the city found, opens "שכונות ואזורים", and sends nothing`, st.on.join() === 'מטולה' && st.areas === 'true' && !st.sent, st)
    await shot('5-city-signup', '[data-city-find="signup"]')
    check(`${tag}: nothing scrolls sideways in the sign-up page`, (await overflow()) <= 1)

    // ================================================================ the feed's cities window
    // the feed once, so the demo has written down what it keeps in this browser, then a city of the broker's own
    await go('/app/community?topic=coop', 1900)
    await page.evaluate(() => {
      const s = JSON.parse(localStorage.getItem('brokers-demo-state-v5') ?? '{}')
      s.myCities = ['תל אביב']
      localStorage.setItem('brokers-demo-state-v5', JSON.stringify(s))
    })
    await go('/app/community?topic=coop', 1900)
    await click('[data-act="add-city"]')
    await page.waitForSelector('[data-f="city-find"]', { visible: true })
    await type('[data-f="city-find"]', 'נתיבות')
    st = await page.evaluate(() => [...document.querySelectorAll('[data-city-list] [data-city-opt]')].map((b) => b.dataset.cityOpt))
    check(`${tag}: the feed's cities window finds a city that is not one of the platform's own`, st.join() === 'נתיבות', st)
    await type('[data-f="city-find"]', 'רמת')
    st = await page.evaluate(() => [...document.querySelectorAll('[data-city-list] [data-city-opt]')].map((b) => b.dataset.cityOpt))
    check(`${tag}: the feed's cities window shows the platform's own cities first`, st[0] === 'רמת גן' && st.includes('רמת ישי') && new Set(st).size === st.length, st)

    check(`${tag}: no page errors`, errors.length === 0, errors.slice(0, 3))
    await ctx.close()
  }
}

// on Windows the browser's own temporary folder is sometimes still held when it closes: that is not a failed check
await browser.close().catch(() => {})
console.log(results.join('\n'))
const failed = results.filter((r) => r.startsWith('FAIL')).length
console.log(failed ? '\nSOME CHECKS FAILED' : '\nALL CHECKS PASSED')
process.exit(failed ? 1 : 0)
