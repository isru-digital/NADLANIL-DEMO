// The feed, three changes (Itzik 22.11.2026), on a computer and a phone, by day and by night, in the open demo on the
// green dev server:
//   1. the feed is newest first, always; a broker lifts his own property with "הקפצה למעלה", and only his own, and
//      only once in two days. Before the two days are up the button is grey and says how long is left. A lifted
//      property keeps the day it was published, on the card and on its page.
//   2. a city removed by its X comes back: "הוספת עיר" opens the list of the platform's cities with a box to type in,
//      and when the last city is gone a gentle line takes the row's place, with the same button.
//   3. the chip "פוסטים" is off the row of rooms on a phone; the posts are in the feed as they were, and the room is
//      still in the side list on a computer and at ?topic=posts.
// Nothing here touches a server: the demo keeps everything in this browser. Saves screenshots.
// Usage: node scripts/feed-order-check.mjs [outDir]     (BASE_GREEN overrides the address; ONLY=phone|desktop)
import puppeteer from 'puppeteer-core'
import { mkdirSync } from 'node:fs'

const green = process.env.BASE_GREEN ?? 'http://localhost:5240/NADLANIL-DEMO/green'
const out = process.argv[2] ?? '_shots/feed-order'
mkdirSync(out, { recursive: true })
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
const browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--hide-scrollbars'] })
process.on('uncaughtException', () => {})
let fails = 0
let total = 0
const check = (name, ok, info) => {
  total++
  if (!ok) fails++
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok || info === undefined ? '' : '  [' + JSON.stringify(info) + ']'}`)
}
const DEVICES = [
  ['desktop', { width: 1366, height: 900 }],
  ['phone', { width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }],
].filter(([n]) => !process.env.ONLY || process.env.ONLY === n)
const HOUR = 60 * 60 * 1000

/** the contrast of an element's words against what is really behind them (the layers under it, put together) */
const CONTRAST = `(sel) => {
  const parse = (c) => {
    let m = c.match(/rgba?[(]([^)]+)[)]/)
    if (m) { const p = m[1].split(/[ ,/]+/).filter(Boolean).map(Number); return [p[0], p[1], p[2], p[3] ?? 1] }
    m = c.match(/color[(]srgb ([^)]+)[)]/)
    if (m) { const p = m[1].split(/[ /]+/).filter(Boolean).map(Number); return [p[0] * 255, p[1] * 255, p[2] * 255, p[3] ?? 1] }
    return [0, 0, 0, 0]
  }
  const over = (top, under) => under.map((v, i) => v * (1 - top[3]) + top[i] * top[3])
  const lum = (c) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4 }; return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]) }
  const el = document.querySelector(sel)
  if (!el) return null
  const layers = []
  for (let e = el; e; e = e.parentElement) {
    const c = parse(getComputedStyle(e).backgroundColor)
    if (c[3] > 0) layers.push(c)
    if (c[3] >= 1) break
  }
  let bg = document.documentElement.dataset.mode === 'night' ? [12, 22, 18] : [255, 255, 255]
  for (const c of layers.reverse()) bg = over(c, bg)
  const fg = over(parse(getComputedStyle(el).color), bg)
  const a = lum(fg), b = lum(bg)
  return Math.round(((Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)) * 100) / 100
}`

/** a page of the demo, already let in, in the mode asked for */
async function open(vp, mode) {
  const ctx = await browser.createBrowserContext()
  const page = await ctx.newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 160)))
  await page.setViewport(vp)
  await page.goto(green + '/about', { waitUntil: 'load' })
  await page.evaluate((m) => {
    localStorage.clear()
    localStorage.setItem('nadlanup-demo-v1', '1')
    localStorage.setItem('nadlanup-mode-v1', JSON.stringify({ mode: m, until: Date.now() + 9e9 }))
  }, mode)
  const feed = async (q = '') => {
    await page.goto(green + '/app/community' + q, { waitUntil: 'networkidle2' })
    await page.waitForSelector('.ci-list article', { timeout: 20000 })
    await wait(700)
  }
  const click = async (sel) => {
    await page.waitForSelector(sel, { visible: true, timeout: 8000 })
    await page.$eval(sel, (el) => el.scrollIntoView({ block: 'center' }))
    await wait(150)
    await page.$eval(sel, (el) => el.click())
    await wait(400)
  }
  /** change what the demo keeps in this browser (the state is the demo's own, there is no server here) */
  const patch = async (fn) => {
    await page.evaluate((src) => {
      const s = JSON.parse(localStorage.getItem('brokers-demo-state-v5') ?? '{}')
      // eslint-disable-next-line no-new-func
      new Function('s', src)(s)
      localStorage.setItem('brokers-demo-state-v5', JSON.stringify(s))
    }, fn)
  }
  const contrast = (sel) => page.evaluate(`(${CONTRAST})(${JSON.stringify(sel)})`)
  /** the element in the middle of the screen, with the pictures around it already in: a picture that comes in late
      makes the page grow under the screenshot, and what was in the middle is suddenly off it */
  const focus = async (sel) => {
    for (let i = 0; i < 3; i++) {
      await page.$eval(sel, (el) => el.scrollIntoView({ block: 'center' }))
      await wait(500)
      await page.evaluate(() => Promise.race([
        Promise.all([...document.images].filter((im) => !im.complete).map((im) => new Promise((r) => { im.onload = im.onerror = r }))),
        new Promise((r) => setTimeout(r, 2500)),
      ]))
      await wait(250)
    }
  }
  const shot = (name) => page.screenshot({ path: `${out}/${name}.png` })
  return { ctx, page, errors, feed, click, patch, contrast, focus, shot }
}

for (const [label, vp] of DEVICES) {
  const phone = label === 'phone'

  // ---------------------------------------------------------------- A. the order of the feed, and the lift
  {
    const d = await open(vp, 'day')
    await d.feed()

    const order = await d.page.evaluate(() => {
      const age = (t) => {
        if (t === 'עכשיו') return 0
        const n = (re) => Number(t.match(re)?.[1] ?? 1)
        if (/דקות/.test(t)) return n(/(\d+)/)
        if (t === 'לפני שעה') return 60
        if (t === 'לפני שעתיים') return 120
        if (/שעות/.test(t)) return n(/(\d+)/) * 60
        if (t === 'הבוקר') return 300
        if (t === 'אתמול') return 1440
        if (t === 'לפני יומיים') return 2880
        if (/ימים/.test(t)) return n(/(\d+)/) * 1440
        return 1440 * 9
      }
      return [...document.querySelectorAll('.ci-list article .fb-meta')].map((m) => age(m.querySelector('span:not(.fb-city):not(.fb-bumped):not(.fb-new)')?.textContent.trim() ?? ''))
    })
    check(`${label}: the feed is newest first, from the first post to the last`, order.length > 10 && order.every((v, i) => i === 0 || v >= order[i - 1]), order.slice(0, 8))

    // my own property, five days old: it may be lifted
    const mine = await d.page.evaluate(() => {
      const b = document.querySelector('[data-act="bump"]')
      const card = b?.closest('article')
      return { id: card?.id, ready: b?.dataset.ready, text: b?.textContent.trim(), disabled: b?.disabled, h: b?.getBoundingClientRect().height, count: document.querySelectorAll('[data-act="bump"]').length }
    })
    check(`${label}: "הקפצה למעלה" is on my own property, and on no other post`, mine.count === 1 && mine.text === 'הקפצה למעלה' && mine.ready === '1' && mine.disabled === false, mine)
    check(`${label}: a thumb hits the button (44px)`, mine.h >= 44, mine.h)
    const others = await d.page.evaluate(() => [...document.querySelectorAll('.ci-list article')].filter((a) => !a.querySelector('.ci-mine')).some((a) => a.querySelector('[data-act="bump"]')))
    check(`${label}: another broker's property has no such button`, others === false)

    await d.focus('[data-act="bump"]')
    await d.shot(`${label}-1-ready`)

    const was = await d.page.evaluate(() => document.querySelector('[data-act="bump"]').closest('article').querySelector('.fb-meta span:not(.fb-city):not(.fb-bumped):not(.fb-new)').textContent.trim())
    await d.click('[data-act="bump"]')
    await wait(700)
    const after = await d.page.evaluate(() => {
      const first = document.querySelector('.ci-list article')
      const b = document.querySelector('[data-act="bump"]')
      return {
        first: first?.id,
        date: first?.querySelector('.fb-meta span:not(.fb-city):not(.fb-bumped):not(.fb-new)')?.textContent.trim(),
        mark: first?.querySelector('[data-bumped]')?.textContent.trim(),
        text: b?.textContent.trim(),
        ready: b?.dataset.ready,
        disabled: b?.disabled,
        toast: document.querySelector('.toast')?.textContent.trim(),
      }
    })
    check(`${label}: the lift puts the property at the top of the feed`, after.first === 'ci-p14', after.first)
    check(`${label}: and says so, quietly`, after.toast === 'הנכס עלה לראש הפיד', after.toast)
    check(`${label}: the day it was published does not change ("${was}"), and the post is marked as lifted`, after.date === was && after.mark === 'הוקפץ', after)
    check(`${label}: right after a lift it cannot be lifted again: the button is grey and says the wait`, after.ready === '0' && after.disabled === true && after.text === 'אפשר להקפיץ בעוד 48 שעות', after)
    await d.focus('.ci-list article')
    await d.shot(`${label}-2-lifted`)

    // the property's page keeps the day it was published
    await d.page.goto(green + '/app/property/p14', { waitUntil: 'networkidle2' })
    await d.page.waitForSelector('[data-posted]', { timeout: 15000 })
    const page14 = await d.page.evaluate(() => ({ posted: document.querySelector('[data-posted]')?.textContent.trim(), bumped: !!document.querySelector('[data-posted] [data-bumped]') }))
    check(`${label}: the property's page still says the day it was published, with the lift beside it`, page14.posted.includes(was) && page14.bumped, page14)

    // the two days, from both sides of the line: 47 hours after the lift it still waits, 49 hours after it is ready
    await d.patch(`s.items = s.items.map((it) => (it.id === 'p14' ? { ...it, bumpedAt: Date.now() - ${47 * HOUR} } : it))`)
    await d.feed('?topic=coop')
    const at47 = await d.page.evaluate(() => {
      const b = document.querySelector('[data-act="bump"]')
      return { text: b?.textContent.trim(), ready: b?.dataset.ready }
    })
    check(`${label}: 47 hours after the lift it still waits, and the words say an hour`, at47.ready === '0' && at47.text === 'אפשר להקפיץ בעוד שעה', at47)
    await d.patch(`s.items = s.items.map((it) => (it.id === 'p14' ? { ...it, bumpedAt: Date.now() - ${49 * HOUR} } : it))`)
    await d.feed('?topic=coop')
    const at49 = await d.page.evaluate(() => {
      const b = document.querySelector('[data-act="bump"]')
      return { text: b?.textContent.trim(), ready: b?.dataset.ready }
    })
    check(`${label}: 49 hours after the lift it may be lifted again`, at49.ready === '1' && at49.text === 'הקפצה למעלה', at49)

    // a property published a moment ago waits its two days like any other
    await d.patch(`s.items = [{ ...s.items.find((x) => x.id === 'p14'), id: 'p99', at: Date.now(), bumpedAt: undefined, time: 'עכשיו' }, ...s.items]`)
    await d.feed('?topic=coop')
    const fresh = await d.page.evaluate(() => {
      const card = document.querySelector('#ci-p99')
      const b = card?.querySelector('[data-act="bump"]')
      return { first: document.querySelector('.ci-list article')?.id, text: b?.textContent.trim(), ready: b?.dataset.ready, disabled: b?.disabled }
    })
    check(`${label}: a property published now is at the top of the feed`, fresh.first === 'ci-p99', fresh.first)
    check(`${label}: and before 48 hours it cannot be lifted: the button is grey and carries the wait`, fresh.ready === '0' && fresh.disabled === true && fresh.text === 'אפשר להקפיץ בעוד 48 שעות', fresh)
    const press = await d.page.evaluate(() => {
      const before = JSON.parse(localStorage.getItem('brokers-demo-state-v5')).items.find((x) => x.id === 'p99').bumpedAt ?? null
      document.querySelector('#ci-p99 [data-act="bump"]').click()
      return { before, after: JSON.parse(localStorage.getItem('brokers-demo-state-v5')).items.find((x) => x.id === 'p99').bumpedAt ?? null }
    })
    await wait(400)
    const still = await d.page.evaluate(() => JSON.parse(localStorage.getItem('brokers-demo-state-v5')).items.find((x) => x.id === 'p99').bumpedAt ?? null)
    check(`${label}: pressing it anyway changes nothing`, press.before === null && press.after === null && still === null, { press, still })

    check(`${label}: no error on the page`, d.errors.length === 0, d.errors)
    await d.ctx.close()
  }

  // ---------------------------------------------------------------- B. a city that was removed comes back
  {
    const d = await open(vp, 'day')
    // the feed once, so the demo has written down everything it keeps in this browser, and only then the cities
    await d.feed()
    await d.patch(`s.myCities = ['רמת גן', 'תל אביב']`)
    await d.feed()

    const bar = await d.page.evaluate(() => ({
      chips: [...document.querySelectorAll('[data-city-chip]')].map((b) => b.dataset.cityChip),
      add: document.querySelector('[data-city-bar] [data-act="add-city"]')?.textContent.trim(),
      addH: document.querySelector('[data-city-bar] [data-act="add-city"]')?.getBoundingClientRect().height,
    }))
    check(`${label}: the cities are chips, and "הוספת עיר" stands beside them`, bar.chips.join() === 'רמת גן,תל אביב' && bar.add === 'הוספת עיר', bar)
    if (phone) check(`${label}: a thumb hits "הוספת עיר" (44px)`, bar.addH >= 44, bar.addH)
    await d.focus('[data-city-bar]')
    await d.shot(`${label}-3-cities`)

    // the X removes a city, and the last one leaves a gentle line in the row's place
    await d.click('[data-city-chip="תל אביב"]')
    await d.click('[data-city-chip="רמת גן"]')
    const none = await d.page.evaluate(() => ({
      bar: !!document.querySelector('[data-city-bar]'),
      note: document.querySelector('[data-city-none] p')?.textContent.trim(),
      act: document.querySelector('[data-city-none] [data-act="add-city-empty"]')?.textContent.trim(),
    }))
    check(`${label}: no city left: one gentle line takes the row's place, with the way back`, none.bar === false && none.note === 'אין עיר בסינון, ומוצג כל הארץ. אפשר להוסיף עיר ולראות רק מה שרלוונטי אליה.' && none.act === 'הוספת עיר', none)
    const noteC = await d.contrast('[data-city-none] p')
    check(`${label}: the line reads by day (4.5:1 or more)`, noteC >= 4.5, noteC)
    await d.focus('[data-city-none]')
    await d.shot(`${label}-4-no-city`)

    // the picker: one letter or more narrows the list, and the city picked comes back as a chip
    await d.click('[data-act="add-city-empty"]')
    const opened = await d.page.evaluate(() => !!document.querySelector('[data-f="city-find"]'))
    check(`${label}: it opens the list of the platform's cities, with a box to type in`, opened)
    await d.page.focus('[data-f="city-find"]')
    await d.page.type('[data-f="city-find"]', 'רמת')
    await wait(400)
    const hits = await d.page.evaluate(() => [...document.querySelectorAll('[data-city-opt]')].map((b) => b.dataset.cityOpt))
    check(`${label}: typing narrows the list to the cities of that name`, hits.join() === 'רמת גן,רמת השרון', hits)
    await d.shot(`${label}-5-find-city`)
    await d.click('[data-city-opt="רמת גן"]')
    await d.click('.modal-foot .btn-gold')
    await wait(400)
    const back = await d.page.evaluate(() => ({
      chips: [...document.querySelectorAll('[data-city-chip]')].map((b) => b.dataset.cityChip),
      note: !!document.querySelector('[data-city-none]'),
    }))
    check(`${label}: the city picked is a chip again, and the gentle line steps aside`, back.chips.join() === 'רמת גן' && back.note === false, back)
    check(`${label}: no error on the page`, d.errors.length === 0, d.errors)
    await d.ctx.close()
  }

  // ---------------------------------------------------------------- C. the chip "פוסטים"
  {
    const d = await open(vp, 'day')
    await d.feed()
    const row = await d.page.evaluate(() => ({
      chips: [...document.querySelectorAll('[data-rooms-row] [data-room]')].map((b) => b.dataset.room),
      shown: [...document.querySelectorAll('[data-rooms-row] [data-room]')].filter((b) => b.offsetWidth > 0).map((b) => b.dataset.room),
      rail: [...document.querySelectorAll('.comm-rail button')].map((b) => b.textContent.trim()),
    }))
    check(`${label}: "פוסטים" is not a chip of the row any more`, !row.chips.includes('posts'), row.chips)
    check(`${label}: the other rooms are all there`, ['all', 'coop', 'seeking', 'referrals', 'knowledge', 'wins'].every((r) => row.chips.includes(r)), row.chips)
    if (!phone) check(`${label}: on a computer the side list still holds "פוסטים"`, row.rail.some((t) => t.startsWith('פוסטים')), row.rail)

    // the posts themselves are in the feed, and the room still opens from its own address
    const inFeed = await d.page.evaluate(() => [...document.querySelectorAll('.ci-list article')].some((a) => a.className.includes('ci-post')))
    check(`${label}: the posts are in the feed as they were`, inFeed)
    await d.feed('?topic=posts')
    const room = await d.page.evaluate(() => ({ head: document.querySelector('.topic-head h2')?.textContent.trim(), n: document.querySelectorAll('.ci-list article').length }))
    check(`${label}: the room itself still opens at ?topic=posts`, room.n > 0, room)
    await d.shot(`${label}-6-rooms`)
    check(`${label}: no error on the page`, d.errors.length === 0, d.errors)
    await d.ctx.close()
  }

  // ---------------------------------------------------------------- D. by night
  {
    const d = await open(vp, 'night')
    await d.feed()
    await d.patch(`s.myCities = ['רמת גן']`)
    await d.feed('?topic=coop')
    await d.focus('[data-act="bump"]')
    const night = {
      bump: await d.contrast('[data-act="bump"]'),
      add: await d.contrast('[data-city-bar] [data-act="add-city"]'),
      room: await d.contrast('[data-rooms-row] [data-room="coop"]'),
    }
    check(`${label}: by night, "הקפצה למעלה" reads (4.5:1 or more)`, night.bump >= 4.5, night.bump)
    check(`${label}: by night, "הוספת עיר" reads`, night.add >= 4.5, night.add)
    check(`${label}: by night, the rooms read`, night.room >= 4.5, night.room)
    await d.shot(`${label}-7-night`)

    await d.click('[data-act="bump"]')
    await wait(500)
    const markC = await d.contrast('[data-bumped]')
    check(`${label}: by night, the "הוקפץ" mark reads`, markC >= 4.5, markC)
    const waitC = await d.contrast('[data-act="bump"]')
    check(`${label}: by night, the wait on the grey button reads`, waitC >= 4.5, waitC)
    await d.focus('.ci-list article')
    await d.shot(`${label}-8-night-lifted`)
    check(`${label}: no error on the page`, d.errors.length === 0, d.errors)
    await d.ctx.close()
  }
}

console.log(`\n${total - fails}/${total} passed`)
await Promise.race([browser.close().catch(() => {}), wait(4000)])
process.exit(fails ? 1 : 0)
