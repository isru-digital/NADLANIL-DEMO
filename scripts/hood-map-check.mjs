// The map of neighbourhoods, made clear and big (Itzik 23.11.2026):
//   1. how it looks and how it works: the map fills the window and the city is drawn large, a neighbourhood is a
//      soft green with an edge and the one picked is the site's green, the parts with no boundary in the open data
//      are a hatch with a line that says so, names show where there is room and on the one under the mouse, the
//      zoom buttons are big, the credit is readable, and the line at the top says the right thing for a property
//      and for a client
//   2. several neighbourhoods: in a client's form every tap adds one and a second tap lets it go, each is a chip,
//      the button counts them and is off while nothing is picked; the map and the list of the search say the same.
//      A property keeps one neighbourhood: it is in one place.
// Tel Aviv and Ramat Gan, day and night, computer and phone.
// Usage: node scripts/hood-map-check.mjs [outDir]     (BASE_GREEN overrides the address)
import puppeteer from 'puppeteer-core'
import { mkdirSync } from 'node:fs'

const green = process.env.BASE_GREEN ?? 'http://localhost:5240/NADLANIL-DEMO/green'
const out = process.argv[2] ?? '_shots/hood-map'
mkdirSync(out, { recursive: true })
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
let fails = 0
let total = 0
const check = (name, ok, info) => {
  total++
  if (!ok) fails++
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok || info === undefined ? '' : '  [' + JSON.stringify(info).slice(0, 400) + ']'}`)
}
/** the contrast of an element's words against what is behind them */
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

const browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--hide-scrollbars'] })

const mapState = (page) =>
  page.evaluate(() => {
    const m = document.querySelector('[data-hood-map]')
    if (!m) return null
    const on = [...m.querySelectorAll('[data-hood][aria-checked="true"]')]
    const stage = m.querySelector('[data-map-stage]')
    const city = m.querySelector('.hm-city')
    const sr = stage.getBoundingClientRect()
    const cr = city.getBoundingClientRect()
    const zoom = [...m.querySelectorAll('.hm-zoom button')].map((b) => Math.round(Math.min(b.getBoundingClientRect().width, b.getBoundingClientRect().height)))
    const ok = m.querySelector('[data-act="map-done"]')
    const hood = m.querySelector('.hm-hood:not(.is-on)')
    return {
      city: m.dataset.hoodMap,
      hoods: m.querySelectorAll('[data-hood]').length,
      labels: m.querySelectorAll('[data-label]').length,
      on: on.map((p) => p.dataset.hood),
      onFill: on[0] ? getComputedStyle(on[0]).fill : null,
      hoodFill: hood ? getComputedStyle(hood).fill : null,
      hoodStroke: hood ? getComputedStyle(hood).stroke : null,
      gapFill: getComputedStyle(city).fill,
      legend: m.querySelector('[data-map-legend]')?.innerText.replace(/\s+/g, ' ').trim(),
      tip: m.querySelector('[data-map-tip]')?.innerText.replace(/\s+/g, ' ').trim(),
      chips: [...m.querySelectorAll('[data-map-chip]')].map((c) => c.dataset.mapChip),
      ok: ok?.textContent.trim(),
      okOff: !!ok?.disabled,
      okVisible: (() => {
        const b = ok?.getBoundingClientRect()
        return !!b && b.bottom <= innerHeight + 1 && b.top >= 0
      })(),
      // how much of the window the map's stage takes, and how big the city is drawn inside it
      stageShare: Math.round((sr.height / innerHeight) * 100),
      cityShare: Math.round((Math.max(cr.width / sr.width, cr.height / sr.height)) * 100),
      zoom,
      credit: m.querySelector('.hm-credit')?.textContent,
      creditSize: parseFloat(getComputedStyle(m.querySelector('.hm-credit')).fontSize),
      scale: Number(m.querySelector('[data-map-stage] svg')?.dataset.scale),
      touch: getComputedStyle(stage).touchAction,
    }
  })
/** a point inside a neighbourhood of the map, on screen */
const hoodPoint = (page, name) =>
  page.evaluate((n) => {
    const p = [...document.querySelectorAll('[data-hood-map] [data-hood]')].find((x) => x.dataset.hood === n)
    if (!p) return null
    const svg = p.ownerSVGElement
    const bb = p.getBBox()
    const pt = svg.createSVGPoint()
    for (let i = 0; i <= 8; i++)
      for (let j = 0; j <= 8; j++) {
        pt.x = bb.x + (bb.width * (i === 0 ? 4 : i)) / 8
        pt.y = bb.y + (bb.height * (j === 0 ? 4 : j)) / 8
        if (p.isPointInFill(pt)) {
          const s = pt.matrixTransform(p.getScreenCTM())
          if (document.elementFromPoint(s.x, s.y) === p) return { x: s.x, y: s.y }
        }
      }
    return null
  }, name)
const tapAt = async (page, pt, touch) => {
  if (touch) await page.touchscreen.tap(pt.x, pt.y)
  else await page.mouse.click(pt.x, pt.y)
  await wait(320)
}
/** taps a neighbourhood by name; gives back its name when it was really hit */
const tapHood = async (page, name, touch) => {
  const pt = await hoodPoint(page, name)
  if (!pt) return null
  await tapAt(page, pt, touch)
  return name
}

for (const [dev, vp] of [
  ['desktop', { width: 1440, height: 900 }],
  ['phone', { width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }],
]) {
  const touch = dev === 'phone'
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
    const click = async (sel) => {
      await page.waitForSelector(sel, { visible: true, timeout: 8000 })
      await page.$eval(sel, (el) => (el.scrollIntoView({ block: 'center' }), el.click()))
      await wait(300)
    }

    /* ============================================================ 1. a property: one neighbourhood, Tel Aviv */
    await page.goto(green + '/app/crm?v=properties', { waitUntil: 'load' })
    await wait(1300)
    await click('[data-act="new-card"]')
    await page.waitForSelector('.ga-fields', { visible: true })
    await wait(500)
    if (!(await page.$('.ga [data-city="תל אביב"]'))) await click('.ga [data-act="more-cities"]')
    await click('.ga [data-city="תל אביב"]')
    await click('[data-places="property"] [data-kind="hood"]')
    const btn = await page.evaluate(() => {
      const b = document.querySelector('[data-places="property"] [data-act="open-map"]')
      const r = b.getBoundingClientRect()
      const s = getComputedStyle(b)
      return { text: b.innerText.replace(/\s+/g, ' ').trim(), h: Math.round(r.height), icon: !!b.querySelector('svg'), paint: s.backgroundImage + ' ' + s.backgroundColor, ink: s.color }
    })
    check(`${dev} ${mode}: "בחירה מהמפה" is a full button with a map on it, not a pale line`, btn.text.startsWith('בחירה מהמפה') && btn.h >= 48 && btn.icon && /gradient|rgb\(/.test(btn.paint) && btn.ink === 'rgb(255, 255, 255)', btn)
    await shot('1-button')

    await click('[data-places="property"] [data-act="open-map"]')
    await page.waitForSelector('[data-hood-map]', { visible: true, timeout: 8000 })
    await wait(800)
    let m = await mapState(page)
    check(`${dev} ${mode}: the map of תל אביב fills the window and the city is drawn large`, m.city === 'תל אביב' && m.hoods >= 50 && m.stageShare >= 55 && m.cityShare >= 70, { ...m, legend: undefined, tip: undefined })
    // a green of the site: its green channel is the strongest of the three, by day and by night, and never the old blue
    const isGreen = (c) => {
      const p = (c ?? '').match(/rgba?\(([^)]+)\)/)?.[1].split(/[ ,/]+/).filter(Boolean).map(Number)
      return !!p && p[1] > p[0] + 30 && p[1] > p[2] + 20
    }
    check(`${dev} ${mode}: a neighbourhood is a soft green with an edge of its own, and nothing is blue`, isGreen(m.hoodFill) && isGreen(m.hoodStroke) && !/31, 95, 207/.test(`${m.hoodFill} ${m.hoodStroke}`), { fill: m.hoodFill, stroke: m.hoodStroke })
    check(`${dev} ${mode}: the parts with no boundary in the open data are a hatch, with a line that says so`, m.gapFill.includes('hm-gap') && m.legend.includes('אין גבול שכונה במפה הפתוחה') && m.legend.includes('נבחרה'), { gapFill: m.gapFill, legend: m.legend })
    check(`${dev} ${mode}: the line at the top is about the property, and says how to move the map`, m.tip.includes('השכונה שבה נמצא הנכס') && m.tip.includes('בגרירה'), m.tip)
    check(`${dev} ${mode}: names are drawn on the neighbourhoods that have room (${m.labels} of ${m.hoods})`, m.labels >= 15, { labels: m.labels, hoods: m.hoods })
    check(`${dev} ${mode}: the zoom buttons are big enough for a thumb, and the credit to OpenStreetMap is readable`, m.zoom.length === 2 && m.zoom.every((z) => z >= 48) && m.credit.includes('OpenStreetMap') && m.creditSize >= 11.5, { zoom: m.zoom, credit: m.credit, size: m.creditSize })
    const creditInk = await page.evaluate(`(${CONTRAST})('.hm-credit')`)
    check(`${dev} ${mode}: and its words can really be read (${creditInk}:1)`, creditInk >= 4.5, creditInk)
    check(`${dev} ${mode}: with nothing picked the button is off`, m.ok === 'בוחרים שכונה' && m.okOff && m.okVisible, { ok: m.ok, off: m.okOff })
    check(`${dev} ${mode}: the fingers move the map, never the page`, m.touch === 'none')
    await shot('2-map')

    // the name of a neighbourhood too small for a label comes up under the mouse (a computer) or the finger
    const quiet = await page.evaluate(() => {
      const named = new Set([...document.querySelectorAll('[data-label]')].map((t) => t.dataset.label))
      return [...document.querySelectorAll('[data-hood]')].map((h) => h.dataset.hood).find((n) => !named.has(n)) ?? null
    })
    const near = quiet ? await (async () => {
      const pt = await hoodPoint(page, quiet)
      if (!pt) return null
      if (touch) await page.touchscreen.tap(pt.x, pt.y)
      else await page.mouse.move(pt.x, pt.y)
      await wait(400)
      return page.evaluate((n) => {
        const h = [...document.querySelectorAll('[data-hood]')].find((x) => x.dataset.hood === n)
        return { lit: h?.getAttribute('class') ?? '', label: !!document.querySelector(`[data-label="${CSS.escape(n)}"]`) }
      }, quiet)
    })() : null
    check(`${dev} ${mode}: a small neighbourhood says its name when it is touched or pointed at ("${quiet}")`, !!near && near.label && /is-(near|on)/.test(near.lit), near)
    await shot('3-near')
    // on a phone that touch also picked it: back to nothing picked, so what follows starts clean
    for (const n of (await mapState(page)).on) await tapHood(page, n, touch)

    // zooming in brings more names
    const before = (await mapState(page)).labels
    await click('[data-act="zoom-in"]')
    await click('[data-act="zoom-in"]')
    await wait(500)
    const zoomed = await mapState(page)
    check(`${dev} ${mode}: making the map bigger brings more names (${before} to ${zoomed.labels})`, zoomed.scale > 1.9 && zoomed.labels > before, { before, after: zoomed.labels, scale: zoomed.scale })
    await shot('4-zoomed')
    await click('[data-act="zoom-out"]')
    await click('[data-act="zoom-out"]')
    await wait(400)

    // a property keeps one neighbourhood: a second one takes its place
    const names = await page.evaluate(() => [...document.querySelectorAll('[data-hood-map] [data-hood]')].map((x) => x.dataset.hood))
    const two = []
    for (const n of names) {
      if ((await hoodPoint(page, n)) && two.push(n) === 2) break
    }
    await tapHood(page, two[0], touch)
    m = await mapState(page)
    const onFill = m.onFill
    check(`${dev} ${mode}: a tap paints the neighbourhood in the site's green and the button counts it`, m.on.join() === two[0] && isGreen(onFill) && !/0\.[0-9]+\)$/.test(onFill ?? '') && m.ok === 'אישור שכונה אחת' && !m.okOff, { on: m.on, onFill, ok: m.ok })
    await tapHood(page, two[1], touch)
    m = await mapState(page)
    check(`${dev} ${mode}: for a property a second neighbourhood takes the place of the first`, m.on.join() === two[1], m.on)
    await tapHood(page, two[1], touch)
    m = await mapState(page)
    check(`${dev} ${mode}: tapping it again lets it go, and the button goes off`, m.on.length === 0 && m.okOff, { on: m.on, off: m.okOff })
    await click('[data-act="close-map"]')
    await wait(400)

    /* ============================================================ 2. a client: several neighbourhoods */
    await page.goto(green + '/app/crm?v=clients', { waitUntil: 'load' })
    await wait(1300)
    await page.evaluate(() => [...document.querySelectorAll('button')].find((b) => b.innerText.trim() === 'לקוח חדש')?.click())
    await page.waitForSelector('.nc', { visible: true, timeout: 8000 })
    await wait(600)
    await page.evaluate(() => [...document.querySelectorAll('.nc-pick')].find((b) => b.textContent.trim() === 'תל אביב')?.click())
    await wait(500)
    await click('[data-places="buyer"] [data-kind="hood"]')
    const btn2 = await page.evaluate(() => document.querySelector('[data-places="buyer"] [data-act="open-map"]')?.innerText.replace(/\s+/g, ' ').trim())
    check(`${dev} ${mode}: in a client's form the button says several may be picked`, btn2?.includes('אפשר כמה שכונות'), btn2)
    await click('[data-places="buyer"] [data-act="open-map"]')
    await page.waitForSelector('[data-hood-map]', { visible: true, timeout: 8000 })
    await wait(800)
    m = await mapState(page)
    check(`${dev} ${mode}: the line at the top is about the client, and never about "הנכס"`, m.tip.includes('הלקוח') && !m.tip.includes('הנכס'), m.tip)
    const three = []
    for (const n of names) {
      if ((await hoodPoint(page, n)) && three.push(n) === 3) break
    }
    for (const n of three) await tapHood(page, n, touch)
    m = await mapState(page)
    check(`${dev} ${mode}: every tap adds a neighbourhood: three picked, three chips, "אישור 3 שכונות"`, m.on.length === 3 && three.every((n) => m.on.includes(n)) && m.chips.length === 3 && m.ok === 'אישור 3 שכונות', { on: m.on, chips: m.chips, ok: m.ok })
    await shot('5-three')
    await tapHood(page, three[1], touch)
    m = await mapState(page)
    check(`${dev} ${mode}: a tap on one that was picked lets it go, and the count follows`, m.on.length === 2 && !m.on.includes(three[1]) && m.ok === 'אישור 2 שכונות', { on: m.on, ok: m.ok })
    // the chip's X takes one off too
    await page.evaluate(() => document.querySelector('[data-map-chip] [data-act="map-chip-off"]')?.click())
    await wait(400)
    m = await mapState(page)
    check(`${dev} ${mode}: the X on a chip takes that one off the map as well`, m.on.length === 1 && m.chips.length === 1, { on: m.on, chips: m.chips })
    await click('[data-act="map-done"]')
    await wait(600)
    const kept = await page.evaluate(() => {
      const p = document.querySelector('[data-places="buyer"]')
      return { value: p.dataset.hoodValue, chips: [...p.querySelectorAll('[data-chip="hood"]')].map((c) => c.dataset.name) }
    })
    check(`${dev} ${mode}: what was picked on the map is in the field`, kept.chips.length === 1 && kept.value === kept.chips.join('|'), kept)
    // one more from the list of the search, and the map knows it
    await page.evaluate(() => {
      const el = document.querySelector('[data-places="buyer"] [data-f="hood-search"]')
      el.scrollIntoView({ block: 'center' })
      el.focus()
      const set = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set
      set.call(el, 'נווה צדק')
      el.dispatchEvent(new Event('input', { bubbles: true }))
    })
    await wait(700)
    const added = await page.evaluate(() => {
      const row = document.querySelector('[data-places="buyer"] [data-list] [data-pick]')
      row?.click()
      return row?.dataset.pick ?? null
    })
    await wait(500)
    await click('[data-places="buyer"] [data-act="open-map"]')
    await page.waitForSelector('[data-hood-map]', { visible: true, timeout: 8000 })
    await wait(700)
    m = await mapState(page)
    check(`${dev} ${mode}: a neighbourhood picked from the search is marked on the map too (the two are one)`, !!added && m.on.includes(added) && m.on.length === 2 && m.ok === 'אישור 2 שכונות', { added, on: m.on, ok: m.ok })
    await shot('6-synced')
    await click('[data-act="close-map"]')
    await wait(400)

    /* ============================================================ 3. Ramat Gan */
    await page.goto(green + '/app/crm?v=properties', { waitUntil: 'load' })
    await wait(1300)
    await click('[data-act="new-card"]')
    await page.waitForSelector('.ga-fields', { visible: true })
    await wait(500)
    if (!(await page.$('.ga [data-city="רמת גן"]'))) await click('.ga [data-act="more-cities"]')
    await click('.ga [data-city="רמת גן"]')
    await click('[data-places="property"] [data-kind="hood"]')
    await click('[data-places="property"] [data-act="open-map"]')
    await page.waitForSelector('[data-hood-map]', { visible: true, timeout: 8000 })
    await wait(800)
    m = await mapState(page)
    check(`${dev} ${mode}: the map of רמת גן is drawn the same way, with its own neighbourhoods and names`, m.city === 'רמת גן' && m.hoods >= 15 && m.labels >= 8 && m.cityShare >= 70 && m.gapFill.includes('hm-gap'), { ...m, legend: undefined, tip: undefined })
    const rg = await page.evaluate(() => [...document.querySelectorAll('[data-hood-map] [data-hood]')].map((x) => x.dataset.hood))
    const one = rg.find(async (n) => !!(await hoodPoint(page, n))) ?? rg[0]
    await tapHood(page, one, touch)
    m = await mapState(page)
    check(`${dev} ${mode}: and a neighbourhood of it can be picked`, m.on.length === 1, { on: m.on })
    await shot('7-ramat-gan')
    await click('[data-act="close-map"]')
    await wait(300)

    check(`${dev} ${mode}: nothing scrolls sideways`, (await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)) <= 1)
    check(`${dev} ${mode}: no page errors`, errors.length === 0, errors.slice(0, 2))
    await ctx.close()
  }
}

console.log(`\n${total - fails} passed, ${fails} failed`)
console.log(fails ? 'SOME CHECKS FAILED' : 'ALL CHECKS PASSED')
await Promise.race([browser.close().catch(() => {}), wait(4000)])
process.exit(0)
