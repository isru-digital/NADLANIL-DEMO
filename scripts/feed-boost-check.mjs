// The four things of 23.11.2026 that are meant to get a broker to work the feed:
//   1. the budget slider of the filter, 0 to 100,000,000 ₪, on a ladder of rungs (small steps where the prices are)
//   2. "שת"פ מלא" in the filter, and the one tap in the property form that marks it (the fee at 0%)
//   3. the banner at the top of the feed, closed for the day with its X
//   4. the calm line of the co-operation room while no match has come yet
// Every check here is about what the page DOES, not about what it shows: the filter is read off the cards that
// are left, the ladder off the amounts a key press lands on, the banner off a reload.
// Usage: node scripts/feed-boost-check.mjs [outDir]     (BASE_GREEN overrides the address)
import puppeteer from 'puppeteer-core'
import { mkdirSync } from 'node:fs'

const green = process.env.BASE_GREEN ?? 'http://localhost:5240/NADLANIL-DEMO/green'
const out = process.argv[2] ?? '_shots/feed-boost'
mkdirSync(out, { recursive: true })
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
let fails = 0
let total = 0
const check = (name, ok, info) => {
  total++
  if (!ok) fails++
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok || info === undefined ? '' : '  [' + JSON.stringify(info).slice(0, 400) + ']'}`)
}
const BANNER = 'הגיע הזמן לעלות את הנכסים שלך לקהילה שנתחיל לעשות עסקאות ביחד'
const CALM = "אל דאגה, ברגע שיהיה מאצ' יישלח לך עדכון"
const KEY = 'nadlanup-share-banner-v1'
const STATE = 'brokers-demo-state-v5'

const browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--hide-scrollbars'] })

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
    const open = async (path) => {
      await page.goto(green + path, { waitUntil: 'load' })
      await wait(1300)
    }
    const text = (sel) => page.evaluate((s) => document.querySelector(s)?.innerText.replace(/\s+/g, ' ').trim() ?? null, sel)
    const say = () => page.evaluate(() => document.querySelector('[data-range-say]')?.textContent.trim() ?? null)
    const box = (w) => page.evaluate((s) => document.querySelector(`[data-f="price-${s}"]`).value, w)
    const at = (w) => page.evaluate((s) => Number(document.querySelector(`[data-thumb="${s}"]`).getAttribute('aria-valuenow')), w)
    const press = async (w, key, times = 1) => {
      await page.evaluate((s) => document.querySelector(`[data-thumb="${s}"]`).focus({ preventScroll: true }), w)
      for (let i = 0; i < times; i++) await page.keyboard.press(key)
      await wait(350)
    }

    /* ---------------------------------------------------------------- 3. the banner at the top of the feed */
    await open('/app/community')
    const bnr = await page.evaluate(() => {
      const b = document.querySelector('[data-banner="share"]')
      if (!b) return null
      const feed = b.closest('.comm-feed')
      const post = feed?.querySelector('.ci, article')
      return {
        text: b.innerText.replace(/\s+/g, ' ').trim(),
        go: !!b.querySelector('[data-act="banner-add"]'),
        x: !!b.querySelector('[data-act="banner-close"]'),
        inFeed: !!feed,
        // it sits above the first post of the feed, not somewhere below it
        aboveFirstPost: post ? b.compareDocumentPosition(post) === Node.DOCUMENT_POSITION_FOLLOWING : true,
      }
    })
    check(`${dev} ${mode}: the banner is at the top of the feed, with its button and its X`, !!bnr && bnr.text.includes(BANNER) && bnr.go && bnr.x && bnr.inFeed && bnr.aboveFirstPost, bnr)
    await shot('1-banner')
    // its button opens the form that a new property is written in
    await page.click('[data-act="banner-add"]')
    await wait(1200)
    const formOpen = await page.evaluate(() => !!document.querySelector('[data-f="price"]') && !!document.querySelector('[data-f="coop"]'))
    check(`${dev} ${mode}: the banner's button opens the form of a new property`, formOpen)
    await shot('2-form')

    /* ------------------------------------- 2a. the form: one tap marks "שת"פ מלא", which is the fee at 0% */
    const chip = await page.evaluate(async () => {
      const b = document.querySelector('[data-act="coop-full"]')
      if (!b) return null
      const before = b.getAttribute('aria-pressed')
      b.click()
      await new Promise((r) => setTimeout(r, 300))
      const slider = document.querySelector('[data-slider="coop"] [role="slider"], [data-f="coop"] [role="slider"]')
      return {
        before,
        after: b.getAttribute('aria-pressed'),
        show: document.querySelector('[data-coop-show]')?.textContent.trim(),
        line: document.querySelector('[data-coop-line]')?.textContent.trim(),
        // the fee itself moved to 0: the slider of the fee says so, so what is saved is 0%, nothing new of its own
        sliderText: slider?.getAttribute('aria-valuetext') ?? null,
      }
    })
    check(
      `${dev} ${mode}: in the form one tap marks שת"פ מלא, and it IS the fee at 0% (nothing else is kept)`,
      !!chip && chip.before === 'false' && chip.after === 'true' && chip.show === 'שת"פ מלא' && chip.line.startsWith('אין תשלום בין המתווכים') && chip.sliderText === '0%',
      chip,
    )
    await page.evaluate(() => document.querySelector('[data-f="coop"]')?.scrollIntoView({ block: 'center' }))
    await wait(300)
    await shot('3-coop-full')
    await page.keyboard.press('Escape')
    await wait(700)

    /* ---------------------------------------------------------------- 3b. the X closes it for the day */
    await page.click('[data-act="banner-close"]')
    await wait(400)
    const closedNow = await page.evaluate((k) => ({ gone: !document.querySelector('[data-banner="share"]'), day: localStorage.getItem(k) }), KEY)
    await open('/app/community')
    const closedAfter = await page.evaluate(() => !document.querySelector('[data-banner="share"]'))
    // a day later it is back
    await page.evaluate((k) => localStorage.setItem(k, '2020-01-01'), KEY)
    await open('/app/community')
    const backTomorrow = await page.evaluate(() => !!document.querySelector('[data-banner="share"]'))
    check(`${dev} ${mode}: the X closes the banner for the day, and a new day brings it back`, closedNow.gone && !!closedNow.day && closedAfter && backTomorrow, { closedNow, closedAfter, backTomorrow })

    /* ---------------------------------------------------------------- 1. the slider: a ladder, 0 to 100,000,000 */
    await open('/app/community?topic=coop')
    const ends = await page.evaluate(() => {
      const t = [...document.querySelectorAll('[data-range="price"] [data-thumb]')]
      return { n: t.length, max: t.map((x) => Number(x.getAttribute('aria-valuemax'))), now: t.map((x) => Number(x.getAttribute('aria-valuenow'))) }
    })
    check(`${dev} ${mode}: the budget slider has two handles and reaches 100,000,000 ₪`, ends.n === 2 && ends.max.every((m) => m === 100_000_000) && ends.now[0] === 0 && ends.now[1] === 100_000_000, ends)
    // the rungs are not one size: small at the bottom, bigger at the top
    await press('from', 'ArrowUp')
    const firstRung = await at('from')
    await press('from', 'End')
    await press('from', 'ArrowDown')
    const nearTop = await at('from')
    const topRung = 100_000_000 - nearTop
    check(`${dev} ${mode}: the jumps are small where the prices are (${firstRung} ₪) and bigger high up (${topRung} ₪)`, firstRung === 50_000 && topRung === 2_500_000, { firstRung, nearTop, topRung })
    // a common price can be set exactly, and the range is read in full digits
    await page.evaluate(() => {
      const set = (el, v) => {
        Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(el, v)
        el.dispatchEvent(new Event('input', { bubbles: true }))
      }
      set(document.querySelector('[data-f="price-min"]'), '1500000')
      set(document.querySelector('[data-f="price-max"]'), '2750000')
    })
    await wait(600)
    const both = await say()
    check(`${dev} ${mode}: the range is read big and in full digits, "1,500,000 - 2,750,000 ₪"`, both === '1,500,000 - 2,750,000 ₪', both)
    const big = await page.evaluate(() => parseFloat(getComputedStyle(document.querySelector('[data-range-say]')).fontSize))
    check(`${dev} ${mode}: and it is big enough to read across the room (${big}px)`, big >= 16, big)
    // 2,750,000 is a rung of its own: the handle is on it, not near it
    const onRung = await at('to')
    check(`${dev} ${mode}: 2,750,000 ₪ is a rung of its own, so the handle sits on it`, onRung === 2_750_000, onRung)
    // an amount typed by hand is not rounded when the other handle is dragged
    await press('to', 'ArrowDown')
    const kept = await box('min')
    check(`${dev} ${mode}: moving one handle leaves the amount typed in the other box exactly as it was`, kept === '1,500,000', { kept, to: await box('max') })
    await page.evaluate(() => document.querySelector('[data-range="price"]')?.scrollIntoView({ block: 'center' }))
    await wait(300)
    await shot('4-slider')

    /* ---------------------------------------------------------------- 2b. "שת"פ מלא" in the filter */
    const btn = await page.evaluate(() => {
      const b = document.querySelector('[data-filter="full-coop"]')
      return b ? { pressed: b.getAttribute('aria-pressed'), anim: getComputedStyle(b).animationName, say: b.parentElement.querySelector('.flt-full-say')?.textContent.trim() } : null
    })
    check(`${dev} ${mode}: there is a "שת"פ מלא" button, and beside it what it means`, !!btn && btn.pressed === 'false' && !!btn.say && btn.say.includes('בלי תשלום בין המתווכים'), btn)
    // one property of the room is marked as a full co-operation, as the form would mark it, and only it is left
    const seeded = await page.evaluate((k) => {
      const s = JSON.parse(localStorage.getItem(k) ?? '{}')
      const first = (s.items ?? []).find((x) => x.topicId === 'coop' && x.property)
      if (!first) return null
      const copy = JSON.parse(JSON.stringify(first))
      copy.id = 'full-coop-check'
      copy.title = 'נכס בשת"פ מלא לבדיקה'
      copy.property.coopPct = 0
      s.items = [copy, ...s.items]
      localStorage.setItem(k, JSON.stringify(s))
      return copy.title
    }, STATE)
    await open('/app/community?topic=coop')
    await page.evaluate(() => document.querySelector('[data-filter="full-coop"]').click())
    await wait(1200)
    const only = await page.evaluate(() => ({
      count: Number(document.querySelector('[data-count]')?.textContent),
      badges: [...document.querySelectorAll('[data-coop]')].map((b) => b.getAttribute('data-coop')),
      words: [...document.querySelectorAll('[data-coop="0"]')].map((b) => b.textContent.trim()),
    }))
    check(
      `${dev} ${mode}: the button leaves only the properties of a full co-operation, and they say so in words`,
      !!seeded && only.count === 1 && only.badges.length > 0 && only.badges.every((b) => b === '0') && only.words.every((w) => w === 'שת"פ מלא'),
      { seeded, only },
    )
    await shot('5-full-coop')
    // pressing it again brings everything back
    await page.evaluate(() => document.querySelector('[data-filter="full-coop"]').click())
    await wait(1100)
    const back = await page.evaluate(() => Number(document.querySelector('[data-count]')?.textContent))
    check(`${dev} ${mode}: pressing it again brings every property back`, back > only.count, { back, was: only.count })

    /* ---------------------------------------------------------------- 4. the calm line of the co-operation room */
    const calm = await text('[data-banner="calm"]')
    check(`${dev} ${mode}: while no match has come, the co-operation room says so calmly`, calm === CALM, calm)
    // it belongs to the co-operation room: it is not on every room of the feed
    await open('/app/community?topic=knowledge')
    check(`${dev} ${mode}: and it is not on the other rooms`, !(await page.evaluate(() => !!document.querySelector('[data-banner="calm"]'))))
    // once a match has been made it goes
    await page.evaluate(() => localStorage.setItem('nadlanup-match-v1', JSON.stringify({ said: {}, mutual: ['a|b'] })))
    await open('/app/community?topic=coop')
    check(`${dev} ${mode}: once there is a match, the line goes`, !(await page.evaluate(() => !!document.querySelector('[data-banner="calm"]'))))
    await page.evaluate(() => localStorage.removeItem('nadlanup-match-v1'))

    /* ---------------------------------------------------------------- the manners: motion, day and night, errors */
    await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }])
    await open('/app/community?topic=coop')
    const still = await page.evaluate(() => ({
      banner: getComputedStyle(document.querySelector('[data-banner="share"]') ?? document.body).animationName,
      full: getComputedStyle(document.querySelector('[data-filter="full-coop"]')).animationName,
    }))
    check(`${dev} ${mode}: with "less motion" asked for, nothing blinks`, still.banner === 'none' && still.full === 'none', still)
    await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'no-preference' }])
    await open('/app/community?topic=coop')
    const moving = await page.evaluate(() => getComputedStyle(document.querySelector('[data-filter="full-coop"]')).animationName)
    check(`${dev} ${mode}: and without it, the hairline breathes`, moving === 'flt-breathe', moving)
    const seen = await page.evaluate(() => {
      const on = (sel) => {
        const el = document.querySelector(sel)
        if (!el) return null
        const r = el.getBoundingClientRect()
        return { w: Math.round(r.width), h: Math.round(r.height), ink: getComputedStyle(el).color }
      }
      return { say: on('[data-range-say]'), full: on('[data-filter="full-coop"]'), calm: on('[data-banner="calm"] .bnr-text') }
    })
    check(`${dev} ${mode}: all three are on the screen and have their own ink`, Object.values(seen).every((s) => s && s.w > 40 && s.h > 10), seen)
    check(`${dev} ${mode}: nothing scrolls sideways`, (await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)) <= 1)
    check(`${dev} ${mode}: no page errors`, errors.length === 0, errors.slice(0, 2))
    await ctx.close()
  }
}

console.log(`\n${total - fails} passed, ${fails} failed`)
console.log(fails ? 'SOME CHECKS FAILED' : 'ALL CHECKS PASSED')
await Promise.race([browser.close().catch(() => {}), wait(4000)])
process.exit(0)
