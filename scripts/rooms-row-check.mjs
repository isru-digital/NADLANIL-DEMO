// The row of rooms in the feed must stay still, and must show that it goes on (Itzik 19.11.2026, from a real iPhone,
// in the installed app: the stuck row jumped up and down while scrolling, and brokers did not see it can be swiped).
//
// 1. STILL. The row sticks by CSS alone. This check holds the page to what makes that true:
//    - no script listens to the page's scroll at all (asked of the browser itself, not guessed from the code)
//    - the row's offset is a fixed length from the stylesheet, equal to the top bar's fixed height (less 1px), with
//      no inline style on the row and no measured value
//    - while the page scrolls up and down, frame by frame: the row stays at one position, and not one attribute or
//      style of the row or of the top bar changes; its height and its line are the same stuck and not stuck
//    - the top bar's height is one fixed number, the same before and after scrolling
// 2. IT GOES ON. On a phone: a chip is cut by the far (left) edge, a fade and a small arrow stand over that edge,
//    the arrow moves the row and goes away at its end, and a lighter fade marks the start once the row was moved.
// 3. THE HINT. On the very first visit only, the row moves a little and comes back, once; never again after.
// Nothing was removed: every room is still in the row and opens with one tap.
// What this cannot do: it runs in Chromium, not on an iPhone. It proves the page gives the phone nothing to redraw
// or re-measure while scrolling; whether the jump is gone on the iPhone itself is for the iPhone to say.
// Usage: node scripts/rooms-row-check.mjs [outDir]      (green dev server on 5240)
import puppeteer from 'puppeteer-core'
import { mkdirSync } from 'node:fs'

const green = process.env.BASE_GREEN ?? 'http://localhost:5240/NADLANIL-DEMO/green'
const out = process.argv[2] ?? '_shots/rooms-row'
mkdirSync(out, { recursive: true })
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
let fails = 0
const check = (name, ok, info) => {
  if (!ok) fails++
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok || info === undefined ? '' : '  [' + JSON.stringify(info) + ']'}`)
}
const PREVIEW = '6d5eaaca072bf02f647051d8688d1337a4ab7a6cb92a2a8b3924cf91fda89e8b'
const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1'
// "פוסטים" left the row on 22.11.2026 (Itzik: the row was crowded on a phone). The room is still in the side list on a
// computer and at ?topic=posts, and the posts are in the feed as they were: scripts/feed-order-check.mjs asks that.
const ALL = ['הכול', 'נכסים לשיתוף', 'מחפש לקונה', 'מתווך בעיר אחרת', 'ידע ושאלות', 'עסקאות שנסגרו']
const DEVICES = [
  { name: 'iphone', label: 'a regular iPhone (390x844)', vp: { width: 390, height: 844, deviceScaleFactor: 3, isMobile: true, hasTouch: true }, phone: true },
  { name: 'iphone-small', label: 'a small iPhone (375x667)', vp: { width: 375, height: 667, deviceScaleFactor: 2, isMobile: true, hasTouch: true }, phone: true },
  { name: 'desktop', label: 'a computer (1440x900)', vp: { width: 1440, height: 900 }, phone: false },
]
const browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--hide-scrollbars'] })

async function open(d, { hintSeen = true, mode = 'day', motion = 'no-preference' } = {}) {
  const ctx = await browser.createBrowserContext()
  const page = await ctx.newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push(String(e)))
  if (d.phone) await page.setUserAgent(IPHONE)
  await page.setViewport(d.vp)
  await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: motion }])
  await page.evaluateOnNewDocument(
    (h, seen, m) => {
      try {
        localStorage.setItem('nadlanup-demo-v1', '1')
        localStorage.setItem('nadlanup-preview-v1', h)
        localStorage.setItem('nadlanup-mode-v1', JSON.stringify({ mode: m, until: 9e15 }))
        if (seen && !sessionStorage.getItem('rr-set')) localStorage.setItem('nadlanup-rooms-hint-v1', '1')
        sessionStorage.setItem('rr-set', '1')
      } catch {}
    },
    PREVIEW,
    hintSeen,
    mode,
  )
  return { ctx, page, errors }
}
const feed = async (page) => {
  await page.goto(green + '/app/community', { waitUntil: 'networkidle0' })
  await page.waitForSelector('[data-rooms-row]', { timeout: 15000 })
  await page.evaluate(() => document.fonts.ready)
  await wait(700)
}
// What the browser itself says is listening while the page scrolls. Two things would make a phone stutter:
//   - a "scroll" listener where the page's scroll is announced (the window, the document, the root element): code
//     that runs on every frame of a scroll
//   - a touchmove or wheel listener that is not passive, anywhere up the page: the phone then has to wait for the
//     page's code before it may scroll at all
// React keeps its own passive listeners on the page's body for the windows it opens there; those are not either.
async function scrollListeners(page) {
  const cdp = await page.createCDPSession()
  const found = []
  for (const expr of ['window', 'document', 'document.documentElement', 'document.body']) {
    const { result } = await cdp.send('Runtime.evaluate', { expression: expr })
    const { listeners } = await cdp.send('DOMDebugger.getEventListeners', { objectId: result.objectId })
    for (const l of listeners) {
      if (l.type === 'scroll' && expr !== 'document.body') found.push(`${expr}: scroll`)
      if ((l.type === 'touchmove' || l.type === 'wheel' || l.type === 'touchstart') && !l.passive) found.push(`${expr}: ${l.type}, not passive`)
    }
  }
  await cdp.detach()
  return found
}

for (const d of DEVICES) {
  const { ctx, page, errors } = await open(d)
  await feed(page)

  // ------------------------------------------------------------------ 1. still
  const listeners = await scrollListeners(page)
  check(`${d.label}: no code runs on the page's scroll (no scroll listener on the window or the document), and no touch or wheel listener holds the scroll back`, listeners.length === 0, listeners)

  const hold = await page.evaluate(() => {
    const nav = document.querySelector('[data-rooms]')
    const bar = document.querySelector('.topbar')
    const barOn = getComputedStyle(bar).display !== 'none'
    const cs = getComputedStyle(nav)
    const bs = getComputedStyle(bar)
    return {
      position: cs.position,
      top: cs.top,
      inline: nav.getAttribute('style') ?? '',
      barOn,
      barH: barOn ? bar.getBoundingClientRect().height : 0,
      barHeightRule: bs.height,
      barMin: bs.minHeight,
      barBox: bs.boxSizing,
      transition: `${cs.transitionProperty} ${cs.transitionDuration}`,
      contain: cs.contain,
      container: cs.containerType,
      feed: getComputedStyle(nav.parentElement).display,
      mask: getComputedStyle(document.querySelector('[data-rooms-row]')).maskImage,
    }
  })
  if (d.phone) {
    check(`${d.label}: the top bar's height is one fixed number (54px), set in the stylesheet`, hold.barOn && hold.barH === 54 && hold.barHeightRule === '54px' && hold.barMin === '0px' && hold.barBox === 'border-box', hold)
    check(`${d.label}: the row sticks at a fixed length, the bar's height less 1px (53px), with nothing written on the row by script`, hold.position === 'sticky' && hold.top === '53px' && hold.inline === '', hold)
  } else {
    check(`${d.label}: the row sticks at the top (0), with nothing written on it by script`, hold.position === 'sticky' && hold.top === '0px' && hold.inline === '', hold)
  }
  check(`${d.label}: nothing on the sticky row that makes a phone redraw it mid-scroll: no transition, no containment, no mask, and the feed column is a plain column`, /\b0s$/.test(hold.transition) && hold.contain === 'none' && hold.container === 'normal' && hold.mask === 'none' && hold.feed === 'flex', hold)

  const rest = await page.evaluate(() => {
    const nav = document.querySelector('[data-rooms]')
    const cs = getComputedStyle(nav)
    return { h: nav.getBoundingClientRect().height, border: `${cs.borderBottomWidth} ${cs.borderBottomColor}`, shadow: cs.boxShadow, bg: cs.backgroundColor, cls: nav.className, attrs: nav.getAttributeNames().sort().join() }
  })
  // up and down, the way a thumb does, and every frame is looked at
  const run = await page.evaluate(async () => {
    const nav = document.querySelector('[data-rooms]')
    const bar = document.querySelector('.topbar')
    const barOn = getComputedStyle(bar).display !== 'none'
    let changes = 0
    const mo = new MutationObserver((m) => (changes += m.length))
    mo.observe(nav, { attributes: true, childList: true, subtree: true, characterData: true })
    if (barOn) mo.observe(bar, { attributes: true })
    const tops = new Set()
    const heights = new Set()
    const barHeights = new Set()
    let frames = 0
    let on = true
    const tick = () => {
      if (!on) return
      const n = nav.getBoundingClientRect()
      if (scrollY > 700) {
        frames++
        tops.add(n.top.toFixed(2))
        heights.add(n.height.toFixed(2))
        if (barOn) barHeights.add(bar.getBoundingClientRect().height.toFixed(2))
      }
      requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
    for (const to of [2600, 900, 3200, 1100, 2800, 1000, 2400]) {
      window.scrollTo({ top: to, behavior: 'smooth' })
      await new Promise((r) => setTimeout(r, 750))
    }
    // short flicks, back and forth
    for (let i = 0; i < 14; i++) {
      window.scrollBy({ top: i % 2 ? -160 : 220, behavior: 'instant' })
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))
    }
    on = false
    mo.disconnect()
    const cs = getComputedStyle(nav)
    return {
      frames,
      tops: [...tops],
      heights: [...heights],
      barHeights: [...barHeights],
      changes,
      stuck: { h: nav.getBoundingClientRect().height, border: `${cs.borderBottomWidth} ${cs.borderBottomColor}`, shadow: cs.boxShadow, bg: cs.backgroundColor, cls: nav.className, attrs: nav.getAttributeNames().sort().join() },
      barBottom: barOn ? bar.getBoundingClientRect().bottom : 0,
      top: nav.getBoundingClientRect().top,
      over: !!document.elementFromPoint(nav.getBoundingClientRect().left + 100, nav.getBoundingClientRect().top + 24)?.closest('[data-rooms]'),
    }
  })
  check(`${d.label}: scrolled up and down, the row is at ONE position in every one of ${run.frames} frames`, run.frames > 200 && run.tops.length === 1 && run.heights.length === 1, { tops: run.tops, heights: run.heights })
  check(`${d.label}: while scrolling, not one attribute or style changed on the row or on the top bar`, run.changes === 0 && run.barHeights.length <= 1, { changes: run.changes, barHeights: run.barHeights })
  check(`${d.label}: the row looks the same stuck and not stuck: same height, same line under it, same class (nothing is switched on)`, JSON.stringify(run.stuck) === JSON.stringify(rest) && rest.h === 48 && /^1px/.test(rest.border) && rest.shadow === 'none', { rest, stuck: run.stuck })
  check(`${d.label}: stuck, it sits right under the top bar with no gap for the feed to show through, and it is solid over the posts`, (d.phone ? run.top === run.barBottom - 1 : run.top === 0) && run.over && !/, 0(\.\d+)?\)$/.test(rest.bg), { top: run.top, barBottom: run.barBottom, bg: rest.bg })
  await page.screenshot({ path: `${out}/${d.name}-2-scrolled.png` })
  const after = await scrollListeners(page)
  check(`${d.label}: still no scroll listener after all that`, after.length === 0, after)

  // ------------------------------------------------------------------ 2. it goes on
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }))
  await wait(500)
  const look = () =>
    page.evaluate(() => {
      const nav = document.querySelector('[data-rooms]')
      const row = document.querySelector('[data-rooms-row]')
      const edge = row.getBoundingClientRect().left
      const chips = [...row.querySelectorAll('.wl-room')].filter((c) => c.offsetWidth > 0)
      const cut = chips.map((c) => ({ t: c.innerText.trim(), r: c.getBoundingClientRect() })).find((c) => c.r.left < edge - 0.5 && c.r.right > edge + 0.5)
      const more = nav.querySelector('.wl-fade.is-more')
      const back = nav.querySelector('.wl-fade.is-back')
      const arrow = more.querySelector('span').getBoundingClientRect()
      const shown = (el) => getComputedStyle(el).display !== 'none' && getComputedStyle(el).opacity === '1'
      return {
        names: chips.map((c) => c.innerText.trim()),
        oneLine: chips.every((c) => Math.abs(c.getBoundingClientRect().top - chips[0].getBoundingClientRect().top) < 1),
        swipes: row.scrollWidth > row.clientWidth + 1,
        cut: cut ? { chip: cut.t, shown: Math.round(cut.r.right - edge), hidden: Math.round(edge - cut.r.left) } : null,
        fade: shown(more),
        fadeW: Math.round(more.getBoundingClientRect().width),
        arrow: shown(more) ? { w: Math.round(arrow.width), left: Math.round(arrow.left - edge), icon: !!more.querySelector('svg') } : null,
        tapH: Math.round(more.getBoundingClientRect().height),
        back: shown(back),
        scrollLeft: Math.round(row.scrollLeft),
        spacing: [row.style.getPropertyValue('--wl-gap'), row.style.getPropertyValue('--wl-pad')],
        firstIn: chips[0].getBoundingClientRect().right <= row.getBoundingClientRect().right + 0.5,
        chipH: Math.round(chips[0].getBoundingClientRect().height),
        wide: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      }
    })
  const start = await look()
  if (d.phone) {
    check(`${d.label}: every room is in the row, by its full name, in one line, "הכול" first and in full view`, start.names.join('|') === ALL.join('|') && start.oneLine && start.firstIn && start.swipes && start.wide <= 1, start)
    check(`${d.label}: a chip is cut by the left edge (a good part showing, a good part hidden), so the row is seen to go on`, !!start.cut && start.cut.shown >= 60 && start.cut.hidden >= 30, { cut: start.cut, spacing: start.spacing })
    check(`${d.label}: a clear fade over that edge, with a small round arrow pointing left`, start.fade && start.fadeW >= 56 && !!start.arrow && start.arrow.icon && start.arrow.w >= 24 && start.arrow.w <= 32 && start.arrow.left >= 0 && start.arrow.left <= 14 && !start.back, start)
    await page.screenshot({ path: `${out}/${d.name}-1-top.png` })
    const rowEl = await page.$('[data-rooms]')
    await rowEl.screenshot({ path: `${out}/${d.name}-row-1-start.png` })

    // the arrow moves the row
    await page.evaluate(() => document.querySelector('[data-act="rooms-more"]').click())
    await wait(900)
    const mid = await look()
    check(`${d.label}: a tap on the arrow moves the row to the left, and a lighter fade marks the start that was left behind`, mid.scrollLeft < -80 && mid.back, mid)
    await rowEl.screenshot({ path: `${out}/${d.name}-row-2-moved.png` })
    await page.evaluate(() => document.querySelector('[data-rooms-row]').scrollBy({ left: -3000, behavior: 'instant' }))
    await wait(600)
    const end = await look()
    const last = await page.evaluate(() => {
      const row = document.querySelector('[data-rooms-row]').getBoundingClientRect()
      const c = [...document.querySelectorAll('[data-rooms-row] .wl-room')].filter((x) => x.offsetWidth > 0).at(-1).getBoundingClientRect()
      return { text: [...document.querySelectorAll('[data-rooms-row] .wl-room')].filter((x) => x.offsetWidth > 0).at(-1).innerText.trim(), clear: c.left >= row.left + 8 && c.right <= row.right }
    })
    check(`${d.label}: at the end of the row the arrow and its fade are gone, and the last room is in full view`, !end.fade && !end.arrow && end.back && last.text === 'עסקאות שנסגרו' && last.clear, { end, last })
    await rowEl.screenshot({ path: `${out}/${d.name}-row-3-end.png` })
    // the last room still opens with one tap
    await page.evaluate(() => document.querySelector('[data-room="wins"]').click())
    await wait(900)
    check(`${d.label}: the last room opens with one tap (nothing was removed)`, /topic=wins/.test(await page.evaluate(() => location.search)))
  } else {
    check(`${d.label}: the row fits in one line: no swipe, no fade, no arrow, and its spacing is untouched`, !start.swipes && start.oneLine && !start.fade && !start.back && start.spacing.join('') === '' && start.names.length === 5, start)
    await page.screenshot({ path: `${out}/${d.name}-1-top.png` })
  }
  check(`${d.label}: the chips are small (36px) and round, and the row is thin (48px)`, start.chipH === 36 && rest.h === 48, { chip: start.chipH, row: rest.h })
  check(`${d.label}: no errors`, errors.length === 0, errors)
  await ctx.close()
}

// ------------------------------------------------------------------ 3. the hint of the first visit
{
  const d = DEVICES[0]
  const { ctx, page, errors } = await open(d, { hintSeen: false })
  await page.goto(green + '/app/community', { waitUntil: 'networkidle0' })
  await page.waitForSelector('[data-rooms-row]', { timeout: 15000 })
  // watch the row for three seconds from the start
  const first = await page.evaluate(async () => {
    const row = document.querySelector('[data-rooms-row]')
    const seen = []
    const t0 = performance.now()
    let moves = 0
    let wasAway = false
    // how much of "הכול", the chosen room, is in sight at the worst moment
    const all = row.querySelector('[data-room="all"]')
    let allShown = Infinity
    while (performance.now() - t0 < 3400) {
      const x = Math.round(row.scrollLeft)
      seen.push(x)
      allShown = Math.min(allShown, Math.round(row.getBoundingClientRect().right - all.getBoundingClientRect().left))
      if (x < -20 && !wasAway) {
        moves++
        wasAway = true
      }
      if (x > -3) wasAway = false
      await new Promise((r) => requestAnimationFrame(r))
    }
    return { far: Math.min(...seen), end: Math.round(row.scrollLeft), moves, allShown, flag: localStorage.getItem('nadlanup-rooms-hint-v1'), pageY: Math.round(scrollY) }
  })
  check('first visit: the row moves a little to the left and comes back, once (a hint, not a jump: 30 to 60px), and "הכול" stays in sight the whole time', first.moves === 1 && first.far <= -30 && first.far >= -60 && first.end === 0 && first.pageY === 0 && first.allShown >= 16, first)
  check('first visit: it is remembered that the hint was shown', first.flag === '1', first.flag)
  await page.screenshot({ path: `${out}/iphone-3-after-hint.png` })
  // the same broker, the next visit: nothing moves
  await page.reload({ waitUntil: 'networkidle0' })
  await page.waitForSelector('[data-rooms-row]', { timeout: 15000 })
  const second = await page.evaluate(async () => {
    const row = document.querySelector('[data-rooms-row]')
    let far = 0
    const t0 = performance.now()
    while (performance.now() - t0 < 3000) {
      far = Math.min(far, Math.round(row.scrollLeft))
      await new Promise((r) => requestAnimationFrame(r))
    }
    return far
  })
  check('the next visit: the row does not move by itself again', second === 0, second)
  check('hint: no errors', errors.length === 0, errors)
  await ctx.close()

  // whoever asked their phone for less motion gets no hint at all
  const calm = await open(d, { hintSeen: false, motion: 'reduce' })
  await calm.page.goto(green + '/app/community', { waitUntil: 'networkidle0' })
  await calm.page.waitForSelector('[data-rooms-row]', { timeout: 15000 })
  const still = await calm.page.evaluate(async () => {
    const row = document.querySelector('[data-rooms-row]')
    let far = 0
    const t0 = performance.now()
    while (performance.now() - t0 < 3000) {
      far = Math.min(far, Math.round(row.scrollLeft))
      await new Promise((r) => requestAnimationFrame(r))
    }
    return far
  })
  check('less motion asked for: no hint, the row stays where it is', still === 0, still)
  await calm.ctx.close()
}

// ------------------------------------------------------------------ at night
for (const d of DEVICES.filter((x) => x.name !== 'iphone-small')) {
  const n = await open(d, { mode: 'night' })
  await feed(n.page)
  await n.page.screenshot({ path: `${out}/${d.name}-night-1-top.png` })
  await n.ctx.close()
}

await browser.close().catch(() => {})
console.log(fails ? `\n${fails} FAILED` : '\nALL CHECKS PASSED')
process.exit(fails ? 1 : 0)
