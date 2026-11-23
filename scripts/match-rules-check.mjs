// The three things of 23.11.2026 about matches:
//   1. the window around a buyer's budget, by the table of src/config/matchPrice.ts, band by band
//   2. the two answers on every match: "כן" in green, "לא מעניין אותי" in red, and a "no" that does not come back
//   3. the window of "שים לב, יש התאמה עבורך בדרישת קונה" for the broker whose property it is: what the buyer is
//      looking for, and, only after "כן", the other BROKER's details, to message or to call
// The rules themselves are read from the code (scripts/assets/match-rules.mts), the rest is done in the browser.
// This check also hunts for a client's name or phone anywhere in the match screens.
// Usage: node scripts/match-rules-check.mjs [outDir]     (BASE_GREEN overrides the address)
import puppeteer from 'puppeteer-core'
import { mkdirSync } from 'node:fs'
import { execFileSync } from 'node:child_process'

const green = process.env.BASE_GREEN ?? 'http://localhost:5240/NADLANIL-DEMO/green'
const out = process.argv[2] ?? '_shots/match-rules'
mkdirSync(out, { recursive: true })
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
let fails = 0
let total = 0
const check = (name, ok, info) => {
  total++
  if (!ok) fails++
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok || info === undefined ? '' : '  [' + JSON.stringify(info).slice(0, 400) + ']'}`)
}

/* ---------------------------------------------------------------- 1. the rules, from the code itself */
const rules = JSON.parse(String(execFileSync('npx', ['--no-install', 'tsx', 'scripts/assets/match-rules.mts'], { shell: true })).trim().split('\n').pop())
for (const b of rules.bands) check(`a budget of ${b.budget.toLocaleString('he-IL')} ₪ has a window of ${b.want.toLocaleString('he-IL')} ₪`, b.got === b.want, b)
check('the table is the six bands Itzik wrote, and nothing else', rules.bandsCount === 6, rules.bandsCount)
for (const e of rules.edges) check(`the window ${e.name}`, e.ok === e.want, e)
check('a rent keeps a window of its own size (10% of the rent)', rules.rent.tol === 690 && rules.rent.fitsNear && !rules.rent.fitsFar, rules.rent)
check('a buyer inside the window is a match; one the property is too dear for, and one it is too cheap for, are not', rules.window.inside && !rules.window.over && !rules.window.under && rules.window.found.join() === 'b-in', rules.window)
check('a match answered "לא מעניין אותי" is not offered again', rules.afterNo.said === 'no' && rules.afterNo.found.length === 0, rules.afterNo)

/* ---------------------------------------------------------------- the browser */
const browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--hide-scrollbars'] })
const tap = (page, sel) => page.$eval(sel, (el) => (el.scrollIntoView({ block: 'center' }), el.click()))
const ink = (c) => c.replace(/\s/g, '')

for (const [dev, vp] of [
  ['desktop', { width: 1440, height: 900 }],
  ['phone', { width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }],
]) {
  for (const mode of ['day', 'night']) {
    const ctx = await browser.createBrowserContext()
    const page = await ctx.newPage()
    const errors = []
    page.on('pageerror', (e) => errors.push(String(e).slice(0, 160)))
    await page.setViewport(vp)
    await page.evaluateOnNewDocument((m) => {
      try {
        localStorage.setItem('nadlanup-demo-v1', '1')
        localStorage.setItem('nadlanup-mode-v1', JSON.stringify({ mode: m, until: Date.now() + 9e9 }))
      } catch {}
    }, mode)
    const shot = (n) => page.screenshot({ path: `${out}/${dev}-${mode}-${n}.png` })

    // share a property of my own from the CRM: the community is checked at once
    await page.goto(green + '/app/community?topic=coop', { waitUntil: 'load' })
    await wait(1400)
    await tap(page, '[data-act="pick-property"]')
    await page.waitForSelector('[data-picker="property"]', { visible: true })
    const id = await page.evaluate(() => {
      const crm = JSON.parse(localStorage.getItem('brokers-demo-state-v5')).crm
      return [...document.querySelectorAll('[data-picker="property"] .pk-row')].find((r) => !r.disabled && (crm.find((c) => c.id === r.dataset.pick)?.category ?? 'home') === 'home')?.dataset.pick
    })
    await tap(page, `[data-picker="property"] [data-pick="${id}"]`)
    await page.waitForSelector('[data-match-screen="meet"]', { visible: true, timeout: 6000 })
    await wait(1500)

    /* ------------------------------------------- 2. the two answers on the deck */
    const hasMatches = await page.evaluate(() => !!document.querySelector('[data-act="see-matches"]'))
    check(`${dev} ${mode}: the property found matches to go through`, hasMatches)
    if (hasMatches) {
      await tap(page, '[data-act="see-matches"]')
      await page.waitForSelector('.mm-card.is-top', { visible: true })
      await wait(800)
      const btns = await page.evaluate(() => {
        const y = document.querySelector('[data-act="match-yes"]')
        const n = document.querySelector('[data-act="match-no"]')
        const paint = (el) => getComputedStyle(el).backgroundColor + ' ' + getComputedStyle(el).backgroundImage
        return {
          yes: y.textContent.trim(),
          no: n.textContent.trim(),
          yesPaint: paint(y),
          noPaint: paint(n),
          high: Math.round(Math.min(y.getBoundingClientRect().height, n.getBoundingClientRect().height)),
          card: document.querySelector('.mm-card.is-top')?.dataset.matchCard,
        }
      })
      // green is a green somewhere in the paint, red is a red: both are said in the paint, not in a class name
      const isGreen = /10, ?163|12, ?163|163, ?10|122, ?79/.test(ink(btns.yesPaint)) || /#0a7a4f/i.test(btns.yesPaint)
      const isRed = /214, ?69, ?69|240, ?138, ?138/.test(ink(btns.noPaint))
      check(`${dev} ${mode}: every match has "כן" in green and "לא מעניין אותי" in red, big enough for a thumb`, btns.yes === 'כן' && btns.no === 'לא מעניין אותי' && isGreen && isRed && btns.high >= 48, btns)
      await shot('1-deck')
      // "לא מעניין אותי" takes this match away, and it is written down
      await tap(page, '[data-act="match-no"]')
      await wait(900)
      const said = await page.evaluate((card) => {
        const s = JSON.parse(localStorage.getItem('nadlanup-match-v1') ?? '{}')
        return { entries: Object.entries(s.said ?? {}).filter(([k]) => k.endsWith(`|${card}`)), top: document.querySelector('.mm-card.is-top')?.dataset.matchCard }
      }, btns.card)
      check(`${dev} ${mode}: "לא מעניין אותי" is written down for that match, and the card is gone`, said.entries.length === 1 && said.entries[0][1] === 'no' && said.top !== btns.card, said)
      await page.keyboard.press('Escape')
      await wait(600)
    }
    await page.evaluate(() => document.querySelector('[data-act="close-match"]')?.click())
    await wait(500)

    /* ------------------------------------------- 3. the window of a buyer for my property */
    await page.waitForSelector('[data-offer]', { visible: true, timeout: 12000 })
    await wait(800)
    const ask = await page.evaluate(() => {
      const el = document.querySelector('[data-offer]')
      const r = el.getBoundingClientRect()
      return {
        stage: el.dataset.offer,
        title: document.querySelector('[data-offer-title]')?.textContent.replace(/\s+/g, ' ').trim(),
        need: document.querySelector('[data-offer-need]')?.textContent.replace(/\s+/g, ' ').trim(),
        yes: document.querySelector('[data-act="offer-yes"]')?.textContent.trim(),
        no: document.querySelector('[data-act="offer-no"]')?.textContent.trim(),
        contact: !!document.querySelector('[data-offer-broker]') || !!document.querySelector('[data-act="offer-call"]'),
        text: el.innerText,
        inside: r.top >= 0 && r.bottom <= innerHeight + 1 && r.left >= 0 && r.right <= innerWidth + 1,
        ink: getComputedStyle(document.querySelector('[data-offer-title]')).color,
      }
    })
    check(`${dev} ${mode}: the broker whose property it is gets "שים לב, יש התאמה עבורך בדרישת קונה"`, /^שים לב, יש התאמה עבורך בדרישת (קונה|שוכר)$/.test(ask.title ?? ''), ask.title)
    check(`${dev} ${mode}: it says what the buyer is looking for: city, neighbourhood, rooms and budget`, !!ask.need && ask.need.split('·').length >= 3 && /תקציב עד|שכירות עד/.test(ask.need), ask.need)
    check(`${dev} ${mode}: with the same two answers, and no contact details before "כן"`, ask.yes === 'כן' && ask.no === 'לא מעניין אותי' && !ask.contact && ask.stage === 'ask', { ...ask, text: undefined })
    check(`${dev} ${mode}: the window is whole on the screen`, ask.inside, ask.inside)
    await shot('2-offer-ask')

    // what a client of mine is called, and their number: neither may be anywhere in this window
    const mineNames = await page.evaluate(() => {
      const crm = JSON.parse(localStorage.getItem('brokers-demo-state-v5') ?? '{}').crm ?? []
      const cl = JSON.parse(localStorage.getItem('nadlanup-clients-v1') ?? '[]')
      return { names: [...crm.map((c) => c.client), ...cl.map((c) => c.name)].filter(Boolean), phones: [...cl.map((c) => c.phone)].filter(Boolean) }
    })
    const leak = (text) => ({
      names: mineNames.names.filter((n) => text.includes(n)),
      phones: mineNames.phones.filter((p) => text.includes(p) || text.includes(p.replace(/\D/g, ''))),
    })
    const leaked = leak(ask.text)
    check(`${dev} ${mode}: no client's name and no client's phone in the window`, leaked.names.length === 0 && leaked.phones.length === 0, { leaked, names: mineNames.names.length })

    if (mode === 'night') {
      // the red answer takes it away for good: the notice in the list does not bring it back either
      await tap(page, '[data-act="offer-no"]')
      await wait(700)
      const gone = await page.evaluate(() => ({ open: !!document.querySelector('[data-offer]'), said: Object.values(JSON.parse(localStorage.getItem('nadlanup-match-v1') ?? '{}').said ?? {}) }))
      check(`${dev} ${mode}: "לא מעניין אותי" closes the window and is written down`, !gone.open && gone.said.includes('no'), gone)
      await page.evaluate(() => document.querySelector('.bell')?.click())
      await wait(800)
      await page.evaluate(() => document.querySelector('.notice-list li.has-pair [data-act="notice-have"]')?.click())
      await wait(1000)
      const back = await page.evaluate(() => ({ offer: !!document.querySelector('[data-offer]'), toast: document.querySelector('.toast, [data-toast]')?.textContent?.trim() ?? '' }))
      check(`${dev} ${mode}: and the notice does not bring that match back`, !back.offer, back)
    } else {
      // "כן" opens the other broker's details, and two ways to reach them
      await tap(page, '[data-act="offer-yes"]')
      await wait(800)
      const open = await page.evaluate(() => {
        const el = document.querySelector('[data-offer]')
        const call = document.querySelector('[data-act="offer-call"]')
        return {
          stage: el.dataset.offer,
          broker: document.querySelector('[data-offer-broker] b')?.textContent.trim(),
          message: document.querySelector('[data-act="offer-message"]')?.textContent.trim(),
          call: call?.textContent.trim(),
          href: call?.getAttribute('href') ?? null,
          text: el.innerText,
          safe: document.querySelector('[data-offer-safe]')?.textContent.replace(/\s+/g, ' ').trim(),
        }
      })
      check(`${dev} ${mode}: after "כן" the other broker's details open, with a message and a call`, open.stage === 'open' && !!open.broker && open.message === 'שליחת הודעה' && open.call === 'התקשרות' && /^tel:0\d{8,9}$/.test(open.href ?? ''), open)
      check(`${dev} ${mode}: and it is said that the client's own details stay where they are`, /שם הלקוח והטלפון שלו נשארים אצלו/.test(open.safe ?? ''), open.safe)
      const leaked2 = leak(open.text)
      check(`${dev} ${mode}: still no client's name or phone once the details are open`, leaked2.names.length === 0 && leaked2.phones.length === 0, leaked2)
      await shot('3-offer-open')
      // the message is the community's own chat: nothing is sent by itself, and no WhatsApp from here
      const wa = await page.evaluate(() => document.querySelector('[data-offer]')?.innerHTML.includes('wa.me') ?? false)
      check(`${dev} ${mode}: no WhatsApp link and nothing sent on its own from the window`, !wa)
      await tap(page, '[data-act="offer-message"]')
      await page.waitForSelector('[data-chat]', { visible: true, timeout: 5000 })
      await wait(600)
      const chat = await page.evaluate(() => ({ val: document.querySelector('[data-f="chat-input"]')?.value ?? '', sent: document.querySelectorAll('[data-msg="me"]').length }))
      check(`${dev} ${mode}: "שליחת הודעה" opens the chat with a line ready, and sends nothing by itself`, /^היי /.test(chat.val) && chat.sent === 0, chat)
      await shot('4-chat')
      await tap(page, '[data-act="close-chat"]')
      await wait(400)
    }

    check(`${dev} ${mode}: nothing scrolls sideways`, (await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)) <= 1)
    check(`${dev} ${mode}: no page errors`, errors.length === 0, errors.slice(0, 2))
    await ctx.close()
  }
}

console.log(`\n${total - fails} passed, ${fails} failed`)
console.log(fails ? 'SOME CHECKS FAILED' : 'ALL CHECKS PASSED')
await Promise.race([browser.close().catch(() => {}), wait(4000)])
process.exit(0)
