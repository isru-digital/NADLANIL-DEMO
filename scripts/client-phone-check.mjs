// The phone of a client (Itzik 23.11.2026): it is not a must any more, only the name is. The field says "לא חובה"
// and under it one quiet line says where the number stays. An action that really needs a number asks for it on the
// spot, keeps it on the client's card and goes on. And the thing all of it rests on: a client's name and phone are
// never seen by another broker, so this check also looks for them in everything the community carries.
// Usage: node scripts/client-phone-check.mjs [outDir]     (BASE_GREEN overrides the address)
import puppeteer from 'puppeteer-core'
import { mkdirSync } from 'node:fs'

const green = process.env.BASE_GREEN ?? 'http://localhost:5240/NADLANIL-DEMO/green'
const out = process.argv[2] ?? '_shots/client-phone'
mkdirSync(out, { recursive: true })
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
let fails = 0
let total = 0
const check = (name, ok, info) => {
  total++
  if (!ok) fails++
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok || info === undefined ? '' : '  [' + JSON.stringify(info).slice(0, 400) + ']'}`)
}
/** the contrast of an element's words against what is really behind them */
const CONTRAST = `(sel) => {
  const parse = (c) => { const m = c.match(/rgba?\\(([^)]+)\\)/); if (!m) return [0, 0, 0, 0]; const p = m[1].split(/[ ,/]+/).filter(Boolean).map(Number); return [p[0], p[1], p[2], p[3] ?? 1] }
  const over = (top, under) => under.map((v, i) => v * (1 - top[3]) + top[i] * top[3])
  const lum = (c) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4 }; return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]) }
  const el = document.querySelector(sel)
  if (!el) return null
  const layers = []
  for (let e = el; e; e = e.parentElement) { const c = parse(getComputedStyle(e).backgroundColor); if (c[3] > 0) layers.push(c); if (c[3] >= 1) break }
  let bg = document.documentElement.dataset.mode === 'night' ? [12, 22, 18] : [255, 255, 255]
  for (const c of layers.reverse()) bg = over(c, bg)
  const ink = over(parse(getComputedStyle(el).color), bg)
  const a = lum(ink), b = lum(bg)
  return Math.round(((Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)) * 10) / 10
}`

const NAME = 'רועי פרטיות בדיקה'
const PHONE = '050-555-0177'
const browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--hide-scrollbars'] })

for (const [dev, vp] of [
  ['desktop', { width: 1440, height: 900 }],
  ['phone', { width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }],
]) {
  for (const mode of ['day', 'night']) {
    const ctx = await browser.createBrowserContext()
    const page = await ctx.newPage()
    const errors = []
    const outside = []
    page.on('pageerror', (e) => errors.push(String(e).slice(0, 160)))
    await page.setRequestInterception(true)
    page.on('request', (r) => {
      const h = new URL(r.url()).hostname
      // the fonts of the page are the one thing that is fetched from outside, and nothing of a client is in them
      if (!/^(localhost|127\.0\.0\.1|fonts\.googleapis\.com|fonts\.gstatic\.com)$/.test(h)) {
        outside.push(h + new URL(r.url()).pathname + (r.url().includes('?') ? '?' + r.url().split('?')[1] : ''))
        return r.abort()
      }
      r.continue()
    })
    await page.setViewport(vp)
    // whatever the page would open in another window is written down instead of opening
    await page.evaluateOnNewDocument((m) => {
      try {
        localStorage.setItem('nadlanup-demo-v1', '1')
        localStorage.setItem('nadlanup-mode-v1', JSON.stringify({ mode: m, until: Date.now() + 9e9 }))
      } catch {}
      window.__opened = []
      window.open = (u) => {
        window.__opened.push(String(u))
        return null
      }
    }, mode)
    const shot = (n) => page.screenshot({ path: `${out}/${dev}-${mode}-${n}.png` })
    const type = async (sel, text) => {
      await page.$eval(sel, (el) => (el.scrollIntoView({ block: 'center' }), el.focus()))
      await page.keyboard.type(text)
    }
    const clientNamed = () => page.evaluate((n) => JSON.parse(localStorage.getItem('nadlanup-clients-v1') ?? '[]').find((c) => c.name === n) ?? null, NAME)

    // ---------------------------------------------------------------- 1. the form asks for a name, and nothing else
    await page.goto(green + '/app/crm?v=clients', { waitUntil: 'networkidle0' })
    await wait(900)
    await page.evaluate(() => [...document.querySelectorAll('button')].find((b) => b.textContent.trim().startsWith('לקוח חדש'))?.click())
    await page.waitForSelector('.nc [data-f="name"]', { visible: true, timeout: 8000 })
    await wait(500)
    const words = await page.evaluate(() => ({
      sub: [...document.querySelectorAll('.modal p, .modal small, .modal .modal-sub')].map((e) => e.textContent.trim()).find((t) => t.includes('חובה')) ?? null,
      label: [...document.querySelectorAll('.nc .ct-label')].map((l) => l.textContent.trim()).find((t) => t.startsWith('טלפון')) ?? null,
      note: document.querySelector('[data-f="phone-note"]')?.textContent.replace(/\s+/g, ' ').trim() ?? null,
      lock: !!document.querySelector('[data-f="phone-note"] svg'),
      // the line belongs to the phone's field alone, not to the whole form (23.11.2026)
      under: document.querySelector('[data-f="phone-note"]')?.closest('label')?.contains(document.querySelector('[data-f="phone"]')) ?? false,
      plain: getComputedStyle(document.querySelector('[data-f="phone-note"]')).backgroundColor,
      narrow: Math.round((document.querySelector('[data-f="phone-note"]')?.getBoundingClientRect().width ?? 0) / (document.querySelector('.nc-row')?.getBoundingClientRect().width ?? 1) * 100),
      // on a computer it holds in one line (its height is one line of its own line-height)
      lines: Math.round((document.querySelector('[data-f="phone-note"]')?.getBoundingClientRect().height ?? 0) / (parseFloat(getComputedStyle(document.querySelector('[data-f="phone-note"]')).lineHeight) || 18)),
    }))
    check(`${dev}, ${mode}: the form says only the name is a must, the field says "טלפון (לא חובה)", and a plain lock line under that field alone says where the number stays`, words.sub === 'מה הוא מחפש, בכמה לחיצות. רק שם חובה.' && words.label === 'טלפון (לא חובה)' && words.note === 'המספר נשמר רק אצלך. מתווכים אחרים לא רואים אותו.' && words.lock && words.under && /rgba\(0, 0, 0, 0\)|transparent/.test(words.plain) && (dev === 'phone' || (words.narrow <= 65 && words.lines === 1)), words)
    await shot('1-new-client')
    // half a number is still said, so it is not kept by mistake
    await type('.nc [data-f="name"]', NAME)
    await type('.nc [data-f="phone"]', '050')
    await page.evaluate(() => [...document.querySelectorAll('.modal button')].find((b) => b.textContent.trim() === 'הוספת הלקוח').click())
    await wait(500)
    const short = await page.evaluate(() => ({ err: document.querySelector('.nc .pf-err, .nc [role="alert"], .ct-new .nc-err')?.textContent.trim() ?? document.querySelector('.modal [role="alert"]')?.textContent.trim() ?? null, still: !!document.querySelector('.nc [data-f="name"]') }))
    check(`${dev}, ${mode}: half a number is still said and the client is not kept`, short.still && (await clientNamed()) === null, short)
    // and with no number at all, the client is kept
    await page.$eval('.nc [data-f="phone"]', (el) => (el.focus(), el.select()))
    await page.keyboard.press('Backspace')
    await page.evaluate(() => [...document.querySelectorAll('.modal button')].find((b) => b.textContent.trim() === 'הוספת הלקוח').click())
    await wait(1000)
    const saved = await clientNamed()
    check(`${dev}, ${mode}: a client is kept with a name and no phone at all`, !!saved && saved.phone === '', saved && { name: saved.name, phone: saved.phone })

    // ---------------------------------------------------------------- 2. an action that needs a number asks for it
    await page.evaluate((n) => [...document.querySelectorAll('.ct-name, tbody tr')].find((x) => x.textContent.includes(n))?.click(), NAME)
    await page.waitForSelector('.ct-det', { visible: true, timeout: 8000 })
    await wait(500)
    const det = await page.evaluate(() => ({ add: document.querySelector('[data-act="add-phone"]')?.textContent.trim() ?? null, send: !!document.querySelector('[data-act="send-client"]'), tall: Math.round(document.querySelector('[data-act="send-client"]')?.getBoundingClientRect().height ?? 0) }))
    check(`${dev}, ${mode}: the card of a client with no phone offers "הוספת טלפון" and "שליחה ללקוח"`, det.add === 'הוספת טלפון' && det.send && det.tall >= 44, det)
    // since 26.11.2026 "שליחה ללקוח" of a client with no phone is grey, and the small "הוסף טלפון" beside it asks
    await page.evaluate(() => document.querySelector('[data-act="send-add-phone"]').click())
    await page.waitForSelector('[data-ask-phone]', { visible: true, timeout: 8000 })
    await wait(400)
    const ask = await page.evaluate(() => ({
      title: [...document.querySelectorAll('.modal h2, .modal h3, .modal strong')].map((h) => h.textContent.trim()).find((t) => t.includes('להוסיף טלפון')) ?? null,
      note: [...document.querySelectorAll('[data-ask-phone] .nc-safe')].map((e) => e.textContent.replace(/\s+/g, ' ').trim())[0] ?? null,
      under: document.querySelector('[data-ask-phone] .nc-safe')?.closest('label')?.contains(document.querySelector('[data-f="ask-phone"]')) ?? false,
      field: !!document.querySelector('[data-f="ask-phone"]'),
      opened: window.__opened.length,
    }))
    check(`${dev}, ${mode}: "שליחה ללקוח" with no number opens the small window with a field, and nothing was sent yet`, ask.title === 'להוסיף טלפון כדי לשלוח ללקוח?' && ask.field && ask.note === 'המספר נשמר רק אצלך. מתווכים אחרים לא רואים אותו.' && ask.under && ask.opened === 0, ask)
    await shot('2-ask-phone')
    const ratio = await page.evaluate(`(${CONTRAST})('[data-ask-phone] .nc-safe')`)
    check(`${dev}, ${mode}: the line about where the number stays can be read (4.5 to 1 at least)`, ratio !== null && ratio >= 4.5, ratio)
    // "לא עכשיו": nothing is kept, nothing is sent
    await page.evaluate(() => document.querySelector('[data-act="ask-phone-cancel"]').click())
    await wait(600)
    const after = await clientNamed()
    check(`${dev}, ${mode}: "לא עכשיו" keeps nothing and sends nothing`, after.phone === '' && (await page.evaluate(() => window.__opened.length)) === 0, after.phone)
    // and with a number: it is kept on the card, and the action goes on
    await page.evaluate(() => document.querySelector('[data-act="send-add-phone"]').click())
    await page.waitForSelector('[data-f="ask-phone"]', { visible: true, timeout: 8000 })
    await type('[data-f="ask-phone"]', PHONE)
    await page.evaluate(() => document.querySelector('[data-act="ask-phone-save"]').click())
    await wait(900)
    // with the number on the card "שליחה ללקוח" is a button again, and a press on it opens WhatsApp
    await page.evaluate(() => document.querySelector('button[data-act="send-client"]')?.click())
    await wait(500)
    const done = await clientNamed()
    const sent = await page.evaluate(() => ({ opened: window.__opened, shown: document.querySelector('.ct-det-phone')?.textContent.trim() ?? null, gone: !document.querySelector('[data-f="ask-phone"]') }))
    check(`${dev}, ${mode}: the number is kept on the client's card, and what was asked for goes on (wa.me with that number)`, done.phone === PHONE && sent.opened.length === 1 && sent.opened[0] === 'https://wa.me/972505550177' && sent.shown === PHONE && sent.gone, { done: done.phone, sent })
    await shot('3-phone-kept')

    // ---------------------------------------------------------------- 3. nobody else ever sees the name or the number
    const published = await page.evaluate(() => {
      const b = document.querySelector('[data-act="publish"]')
      if (b) b.click()
      return !!b
    })
    await wait(1400)
    if (!published) {
      // a client who was not made from a CRM card is published from the room itself
      await page.goto(green + '/app/community?topic=seeking', { waitUntil: 'networkidle0' })
      await wait(900)
      await page.evaluate(() => document.querySelector('[data-act="pick-buyer"]')?.click())
      await page.waitForSelector('[data-picker="buyer"]', { visible: true, timeout: 8000 })
      await wait(400)
      await page.evaluate((n) => [...document.querySelectorAll('[data-picker="buyer"] .pk-row')].find((r) => r.textContent.includes(n))?.click(), NAME)
      await wait(1600)
    }
    const digits = PHONE.replace(/\D/g, '')
    const leak = await page.evaluate(
      (n, d) => {
        const state = localStorage.getItem('brokers-demo-state-v5') ?? ''
        const items = JSON.stringify(JSON.parse(state || '{}').items ?? [])
        const clean = (s) => s.replace(/\D/g, '')
        return {
          // what another broker's browser would ever get: the posts of the community
          inItems: items.includes(n) || clean(items).includes(d),
          // and what is on the screen right now
          onScreen: document.body.innerText.includes(n) || clean(document.body.innerText).includes(d),
          posts: (JSON.parse(state || '{}').items ?? []).length,
          mine: ((JSON.parse(state || '{}').items ?? []).find((x) => x.search && x.time === 'עכשיו') ?? {}).title ?? null,
        }
      },
      NAME,
      digits,
    )
    check(`${dev}, ${mode}: the client was published, and neither the name nor the number is in the posts the community carries`, !leak.inItems && !!leak.mine, leak)
    await page.goto(green + '/app/community?topic=seeking', { waitUntil: 'networkidle0' })
    await wait(1200)
    const feed = await page.evaluate(
      (n, d) => ({ text: document.body.innerText.includes(n) || document.body.innerText.replace(/\D/g, '').includes(d), html: document.documentElement.innerHTML.includes(n) }),
      NAME,
      digits,
    )
    check(`${dev}, ${mode}: and neither of them is anywhere in the feed itself, not in the words and not in the page`, !feed.text && !feed.html, feed)
    await shot('4-feed-without-the-client')
    const fonts = await page.evaluate(() => performance.getEntriesByType('resource').map((e) => e.name).filter((u) => /fonts\.(googleapis|gstatic)\.com/.test(u)))
    check(`${dev}, ${mode}: nothing was asked of any address outside this computer except the fonts, nothing of the client is in what was asked, and there are no errors`, outside.length === 0 && errors.length === 0 && !fonts.some((u) => u.includes(encodeURIComponent(NAME)) || u.replace(/\D/g, '').includes(digits)), { outside: [...new Set(outside)].slice(0, 3), errors: errors.slice(0, 2), fonts: fonts.length })
    await ctx.close()
  }
}

console.log(`\nPASS: ${total - fails}  FAIL: ${fails}`)
console.log(fails ? 'SOME CHECKS FAILED' : `ALL CHECKS PASSED (${total})`)
await Promise.race([browser.close().catch(() => {}), wait(4000)])
process.exit(0)
