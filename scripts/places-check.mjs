// Streets and neighbourhoods from a list or from the map (Itzik 22.11.2026), on a computer and a phone, in the open
// demo on the green dev server:
//   1. the list: the city as a blue chip, "רחוב" / "שכונה", a letter opens a list with boxes to tick, a choice is a
//      blue chip with an X; a property has one of each; "לא מצאתי, להוסיף ידנית" keeps a name marked "ידני"
//   2. the map: the city's neighbourhoods; a tap paints one in the site's green and adds it, a second tap lets it
//      go (the whole look of the map is checked by scripts/hood-map-check.mjs, 23.11.2026); "אישור N
//      שכונות" at the bottom; one finger moves the map, two fingers zoom it, the page does not scroll
//   3. where: the property form, the buyer's form (several of each, two cities), the feed's filter, the match
//   5. a name typed freely before the lists stays; when it is clearly one of the list, the list's name is offered
//   and by day and by night every word, chip and label can be read. Nothing here touches a server. Saves screenshots.
// Usage: node scripts/places-check.mjs [outDir]     (BASE_GREEN overrides the address; ONLY=phone|desktop)
import puppeteer from 'puppeteer-core'
import { mkdirSync, readFileSync } from 'node:fs'

const green = process.env.BASE_GREEN ?? 'http://localhost:5240/NADLANIL-DEMO/green'
const out = process.argv[2] ?? '_shots/places'
mkdirSync(out, { recursive: true })
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
const browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--hide-scrollbars'] })
process.on('uncaughtException', () => {})
let fails = 0
let total = 0
const check = (name, ok, info) => {
  total++
  if (!ok) fails++
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok || info === undefined ? '' : '  [' + JSON.stringify(info).slice(0, 600) + ']'}`)
}
const INDEX = JSON.parse(readFileSync('src/config/geo-index.json', 'utf8'))
const DEVICES = [
  ['desktop', { width: 1366, height: 900 }],
  ['phone', { width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }],
].filter(([n]) => !process.env.ONLY || process.env.ONLY === n)

const CONTRAST = `(sel) => {
  const parse = (c) => {
    let m = c.match(/rgba?\\(([^)]+)\\)/)
    if (m) { const p = m[1].split(/[ ,/]+/).filter(Boolean).map(Number); return [p[0], p[1], p[2], p[3] ?? 1] }
    m = c.match(/color\\(srgb ([^)]+)\\)/)
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
  const ink = over(parse(getComputedStyle(el).color), bg)
  const a = lum(ink), b = lum(bg)
  return Math.round(((Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)) * 10) / 10
}`

async function fresh(vp, mode = 'day', before) {
  const ctx = await browser.createBrowserContext()
  const page = await ctx.newPage()
  const errors = []
  const outside = []
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 160)))
  page.on('request', (r) => {
    const u = new URL(r.url())
    if (!/^(localhost|127\.0\.0\.1|fonts\.googleapis\.com|fonts\.gstatic\.com)$/.test(u.hostname) && !/^(data|blob):/.test(u.protocol)) outside.push(u.hostname)
  })
  await page.setViewport(vp)
  await page.goto(green + '/about', { waitUntil: 'load' })
  await page.evaluate(
    (m, b) => {
      localStorage.clear()
      localStorage.setItem('nadlanup-demo-v1', '1')
      // the map in this check is the flat one (the fallback, drawn by the page itself): the 3D map, which asks
      // OpenFreeMap for tiles, is checked by scripts/hood-map-check.mjs (part 4)
      localStorage.setItem('nadlanup-map-flat', '1')
      localStorage.setItem('nadlanup-mode-v1', JSON.stringify({ mode: m, until: Date.now() + 9e9 }))
      if (b) for (const [k, v] of Object.entries(b)) localStorage.setItem(k, v)
    },
    mode,
    before ?? null,
  )
  const click = async (sel) => {
    await page.waitForSelector(sel, { visible: true, timeout: 8000 })
    await page.$eval(sel, (el) => el.scrollIntoView({ block: 'center' }))
    await wait(120)
    await page.$eval(sel, (el) => el.click())
    await wait(260)
  }
  return { ctx, page, errors, outside, click, contrast: (sel) => page.evaluate(`(${CONTRAST})(${JSON.stringify(sel)})`), shot: (n) => page.screenshot({ path: `${out}/${n}.png` }) }
}
const openCard = async (t, city) => {
  await t.page.goto(green + '/app/crm?v=properties', { waitUntil: 'networkidle0' })
  await wait(500)
  await t.click('[data-act="new-card"]')
  await t.page.waitForSelector('.ga-fields', { visible: true })
  await wait(400)
  if (city) {
    if (!(await t.page.$(`.ga [data-city="${city}"]`))) await t.click('.ga [data-act="more-cities"]')
    await t.click(`.ga [data-city="${city}"]`)
  }
}
const typeIn = async (t, sel, text) => {
  await t.page.waitForSelector(sel, { visible: true, timeout: 8000 })
  await t.page.$eval(sel, (el) => {
    el.scrollIntoView({ block: 'center' })
    el.focus()
    el.select()
  })
  await t.page.keyboard.press('Backspace')
  await t.page.type(sel, text)
  await t.page.waitForFunction((s) => !!document.querySelector(s)?.closest('[data-places]')?.querySelector('[data-list] [data-pick], .pl-none'), { timeout: 8000 }, sel).catch(() => {})
  await wait(250)
}
const picker = (page, id) =>
  page.evaluate((id) => {
    const p = document.querySelector(`[data-places="${id}"]`)
    if (!p) return null
    return {
      cities: [...p.querySelectorAll('.pl-city')].map((c) => c.textContent.trim()),
      kinds: [...p.querySelectorAll('.pl-kinds [data-kind]')].map((b) => `${b.dataset.kind}:${b.getAttribute('aria-checked')}`),
      rows: [...p.querySelectorAll('[data-list] [data-pick]')].map((b) => ({ n: b.dataset.pick, on: b.getAttribute('aria-selected'), box: !!b.querySelector('.pl-box'), city: b.querySelector('small')?.textContent ?? null, h: Math.round(b.getBoundingClientRect().height) })),
      list: (() => {
        const l = p.querySelector('[data-list]')
        return l ? { max: parseFloat(getComputedStyle(l).maxHeight), scroll: l.scrollHeight > l.clientHeight } : null
      })(),
      chips: [...p.querySelectorAll('[data-chip]')].map((c) => `${c.dataset.chip}:${c.dataset.name}${c.querySelector('em') ? ':' + c.querySelector('em').textContent : ''}`),
      chipBg: p.querySelector('[data-chip]') ? getComputedStyle(p.querySelector('[data-chip]')).backgroundColor : null,
      cityBg: p.querySelector('.pl-city') ? getComputedStyle(p.querySelector('.pl-city')).backgroundColor : null,
      manual: p.querySelector('[data-act="manual"]')?.textContent.trim() ?? null,
      map: !!p.querySelector('[data-act="open-map"]'),
      offer: p.querySelector('[data-offer]')?.dataset.offer ?? null,
      street: p.dataset.streetValue,
      hood: p.dataset.hoodValue,
    }
  }, id)
const pickRow = (page, id, name) => page.evaluate((id, n) => [...document.querySelectorAll(`[data-places="${id}"] [data-pick]`)].find((b) => b.dataset.pick === n)?.click(), id, name)
const mapState = (page) =>
  page.evaluate(() => {
    const m = document.querySelector('[data-hood-map]')
    if (!m) return null
    const on = [...m.querySelectorAll('[data-hood][aria-checked="true"]')]
    return {
      city: m.dataset.hoodMap,
      hoods: m.querySelectorAll('[data-hood]').length,
      on: on.map((p) => p.dataset.hood),
      fill: on[0] ? getComputedStyle(on[0]).fill : null,
      chips: [...m.querySelectorAll('[data-map-chip]')].map((c) => c.dataset.mapChip),
      ok: m.querySelector('[data-act="map-done"]')?.textContent.trim(),
      okVisible: (() => {
        const b = m.querySelector('[data-act="map-done"]')?.getBoundingClientRect()
        return !!b && b.bottom <= innerHeight + 1 && b.top >= 0
      })(),
      scale: Number(m.querySelector('[data-map-stage] svg')?.dataset.scale),
      transform: m.querySelector('[data-map-stage] svg')?.style.transform,
      credit: m.querySelector('.hm-credit')?.textContent,
      labels: m.querySelectorAll('.hm-label').length,
      touch: getComputedStyle(m.querySelector('[data-map-stage]')).touchAction,
    }
  })
/** a point inside a neighbourhood of the map, on screen: its label's place (the centre), or the middle of its box */
const hoodPoint = (page, name) =>
  page.evaluate((n) => {
    const p = [...document.querySelectorAll('[data-hood-map] [data-hood]')].find((x) => x.dataset.hood === n)
    if (!p) return null
    const svg = p.ownerSVGElement
    const bb = p.getBBox()
    // a point that is really inside the shape: try the centre of its box, then a grid over the box
    const pt = svg.createSVGPoint()
    for (let i = 0; i <= 8; i++)
      for (let j = 0; j <= 8; j++) {
        pt.x = bb.x + (bb.width * (i === 0 ? 4 : i)) / 8
        pt.y = bb.y + (bb.height * (j === 0 ? 4 : j)) / 8
        if (p.isPointInFill(pt)) {
          const s = pt.matrixTransform(p.getScreenCTM())
          const top = document.elementFromPoint(s.x, s.y)
          if (top === p) return { x: s.x, y: s.y }
        }
      }
    return null
  }, name)
const tapAt = async (page, pt, touch) => {
  if (touch) await page.touchscreen.tap(pt.x, pt.y)
  else await page.mouse.click(pt.x, pt.y)
  await wait(300)
}

for (const [dev, vp] of DEVICES) {
  const touch = dev === 'phone'
  const t = await fresh(vp)
  const { page } = t

  // ---------------------------------------------------------------- the data
  const cities = Object.keys(INDEX)
  check(`${dev}: the lists are there for all ${cities.length} cities of the platform, from the open sources`, cities.length >= 31 && cities.every((c) => INDEX[c].streets > 20 && INDEX[c].hoods > 3), cities.filter((c) => !(INDEX[c].streets > 20 && INDEX[c].hoods > 3)))
  check(`${dev}: a map for the cities whose neighbourhoods OpenStreetMap draws (${cities.filter((c) => INDEX[c].map).join(', ')})`, cities.some((c) => INDEX[c].map) && INDEX['תל אביב'].map)
  // 23.11.2026: maps for ראשון לציון, בת ים and חולון too, with the few boundaries OpenStreetMap has there (the rest is
  // the hatch, and picked from the list); every map also in longitude and latitude, for the 3D map
  const files = Object.fromEntries(cities.filter((c) => INDEX[c].map).map((c) => [c, JSON.parse(readFileSync(`public/geo/${INDEX[c].code}.json`, 'utf8'))]))
  const NEW = ['ראשון לציון', 'בת ים', 'חולון']
  check(`${dev}: ראשון לציון, בת ים and חולון have a map now (${NEW.map((c) => `${c} ${INDEX[c].mapped}`).join(', ')} boundaries from OpenStreetMap), and still the full list (${NEW.map((c) => INDEX[c].hoods).join(', ')})`, NEW.every((c) => INDEX[c].map && files[c]?.map && files[c].map.hoods.length === INDEX[c].mapped && INDEX[c].hoods >= 20), NEW.map((c) => INDEX[c]))
  check(`${dev}: every map has its 3D shapes (longitude, latitude), the same neighbourhoods as the flat one, each with a spot for its name`, Object.values(files).every((f) => f.map.geo && f.map.geo.outline.length > 10 && f.map.geo.hoods.length === f.map.hoods.length && f.map.geo.hoods.every((h, i) => h.n === f.map.hoods[i].n && h.r.length > 3 && h.l.length === 2)), Object.keys(files).filter((c) => !files[c].map.geo))
  check(`${dev}: the OpenStreetMap files hold OpenStreetMap only: no official layer mixed in (that would be a file of its own, public/geo/official)`, Object.values(files).every((f) => f.map.source !== 'official' && /OpenStreetMap/.test(f.map.credit)) && cities.every((c) => !INDEX[c].official))

  // ---------------------------------------------------------------- 1. the list, in the property form
  await openCard(t, 'תל אביב')
  await t.click('.ga [data-cat="home"]')
  await t.click('.ga .pf-kind[data-kind="דירה"]')
  await page.$eval('[data-places="property"]', (el) => el.scrollIntoView({ block: 'start' }))
  let p = await picker(page, 'property')
  check(`${dev}: the address starts from the city as a blue chip, with "רחוב" and "שכונה" under it`, p && p.cities.join() === 'תל אביב' && p.cityBg === 'rgb(31, 95, 207)' && p.kinds.join() === 'street:true,hood:false' && !p.list, p)
  await typeIn(t, '[data-places="property"] [data-f="street-search"]', 'ד')
  p = await picker(page, 'property')
  check(`${dev}: one letter opens a list to scroll, with a box to tick by each name, a finger high`, p.rows.length > 10 && p.rows.every((r) => r.box && r.h >= 44) && p.list.max <= 300 && p.list.scroll && p.manual?.startsWith('לא מצאתי, להוסיף ידנית'), { n: p.rows.length, list: p.list, manual: p.manual })
  await typeIn(t, '[data-places="property"] [data-f="street-search"]', 'דיזנ')
  p = await picker(page, 'property')
  check(`${dev}: more letters, fewer names: "דיזנגוף" first`, p.rows[0]?.n === 'דיזנגוף' && p.rows.length <= 6, p.rows.map((r) => r.n))
  await t.shot(`${dev}-1-street-list`)
  await pickRow(page, 'property', 'דיזנגוף')
  await wait(250)
  p = await picker(page, 'property')
  check(`${dev}: the street picked is a blue chip, and the list closes`, p.chips.join() === 'street:דיזנגוף' && p.chipBg === 'rgb(31, 95, 207)' && !p.list && p.street === 'דיזנגוף', p)
  await typeIn(t, '[data-places="property"] [data-f="street-search"]', 'אבן גבירול')
  await pickRow(page, 'property', 'אבן גבירול')
  await wait(250)
  p = await picker(page, 'property')
  check(`${dev}: a property has one street: a second one takes the place of the first`, p.chips.join() === 'street:אבן גבירול', p.chips)
  await t.click('[data-places="property"] [data-kind="hood"]')
  await typeIn(t, '[data-places="property"] [data-f="hood-search"]', 'צפון')
  p = await picker(page, 'property')
  const north = p.rows.find((r) => r.n.startsWith('הצפון הישן'))?.n
  check(`${dev}: "שכונה" searches the neighbourhoods`, p.kinds.join() === 'street:false,hood:true' && !!north, p.rows.map((r) => r.n))
  await pickRow(page, 'property', north)
  await wait(250)
  p = await picker(page, 'property')
  check(`${dev}: one street and one neighbourhood, two blue chips`, p.chips.join() === `street:אבן גבירול,hood:${north}` && p.hood === north, p.chips)
  const seen = await page.evaluate(() => document.querySelector('[data-seen] b')?.textContent.trim())
  check(`${dev}: "כך יראו המתווכים" follows the list's names`, seen === `תל אביב - ${north}, רחוב אבן גבירול`, seen)
  await t.shot(`${dev}-2-two-chips`)
  // X removes; a name by hand
  await page.evaluate(() => document.querySelector('[data-places="property"] [data-chip="street"] [data-act="remove-chip"]').click())
  await wait(200)
  p = await picker(page, 'property')
  check(`${dev}: the X on a chip removes it`, p.chips.join() === `hood:${north}` && p.street === '', p.chips)
  await t.click('[data-places="property"] [data-kind="street"]')
  await typeIn(t, '[data-places="property"] [data-f="street-search"]', 'סמטת הבדיקה')
  p = await picker(page, 'property')
  check(`${dev}: a name the list does not have: "לא נמצא ברשימה", and the way to add it by hand`, p.rows.length === 0 && p.manual === 'לא מצאתי, להוסיף ידנית: סמטת הבדיקה', p)
  await t.click('[data-places="property"] [data-act="manual"]')
  p = await picker(page, 'property')
  check(`${dev}: a name added by hand is a chip marked "ידני"`, p.chips.includes('street:סמטת הבדיקה:ידני'), p.chips)
  await t.shot(`${dev}-3-manual`)
  // saved: the names, and which one was by hand
  await t.click('.ga [data-slider="coop"] [data-step="more"]')
  await t.click('.ga-go')
  await wait(1200)
  await page.$eval('[data-act="close-match"]', (b) => b.click()).catch(() => {})
  const kept = await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem('brokers-demo-state-v5') ?? '{}')
    const c = (s.crm ?? []).find((x) => x.street === 'סמטת הבדיקה')
    const post = c && (s.items ?? []).find((x) => x.sourceId === c.id)
    return c ? { hood: c.neighborhood, manual: c.placeManual, area: post?.property.area, street: post?.property.street } : null
  })
  check(`${dev}: saved: the neighbourhood of the list, the street by hand marked so, and the post says "תל אביב - ..."`, kept && kept.hood === north && kept.manual?.join() === 'סמטת הבדיקה' && kept.area === `תל אביב - ${north}` && kept.street === 'סמטת הבדיקה', kept)

  // ---------------------------------------------------------------- 2. the map, for one neighbourhood (a property)
  await openCard(t, 'תל אביב')
  await t.click('.ga [data-cat="home"]')
  await t.click('.ga .pf-kind[data-kind="דירה"]')
  await t.click('[data-places="property"] [data-kind="hood"]')
  p = await picker(page, 'property')
  check(`${dev}: "בחירה מהמפה" is offered for Tel Aviv`, p.map)
  const scrollBefore = await page.evaluate(() => document.querySelector('.modal')?.scrollTop ?? 0)
  await t.click('[data-places="property"] [data-act="open-map"]')
  await page.waitForSelector('[data-hood-map]', { visible: true, timeout: 8000 })
  await wait(700)
  let m = await mapState(page)
  check(`${dev}: the map of Tel Aviv: its neighbourhoods drawn, the credit to OpenStreetMap, the button in reach and off while nothing is picked, fingers for the map only`, m.city === 'תל אביב' && m.hoods >= 20 && m.credit?.includes('OpenStreetMap') && m.ok === 'בוחרים שכונה' && m.okVisible && m.touch === 'none', m)
  await t.shot(`${dev}-4-map`)
  const names = await page.evaluate(() => [...document.querySelectorAll('[data-hood-map] [data-hood]')].map((x) => x.dataset.hood))
  // two neighbourhoods that can be hit on screen
  const pts = []
  for (const n of names) {
    const pt = await hoodPoint(page, n)
    if (pt && pt.y > 140 && pt.y < vp.height - 160) pts.push([n, pt])
    if (pts.length === 2) break
  }
  await tapAt(page, pts[0][1], touch)
  m = await mapState(page)
  check(`${dev}: a tap paints the neighbourhood in the site's green and adds it`, m.on.join() === pts[0][0] && m.chips.join() === pts[0][0] && /rgb\(1?[0-9]{1,2}, 1[0-9]{2}, [0-9]{2,3}\)/.test(m.fill ?? '') && m.ok === 'אישור שכונה אחת', m)
  await tapAt(page, (await hoodPoint(page, pts[1][0])) ?? pts[1][1], touch)
  m = await mapState(page)
  check(`${dev}: for a property a second neighbourhood takes the place of the first`, m.on.join() === pts[1][0], m.on)
  await tapAt(page, (await hoodPoint(page, pts[1][0])) ?? pts[1][1], touch)
  m = await mapState(page)
  check(`${dev}: a second tap on it lets it go`, m.on.length === 0 && m.ok === 'בוחרים שכונה', m)
  // moving and zooming
  const stage = await page.$eval('[data-map-stage]', (el) => {
    const r = el.getBoundingClientRect()
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 }
  })
  const pageY = await page.evaluate(() => scrollY)
  if (touch) {
    await page.touchscreen.touchStart(stage.x, stage.y)
    for (let i = 1; i <= 8; i++) await page.touchscreen.touchMove(stage.x + i * 6, stage.y + i * 10)
    await page.touchscreen.touchEnd()
  } else {
    await page.mouse.move(stage.x, stage.y)
    await page.mouse.down()
    for (let i = 1; i <= 8; i++) await page.mouse.move(stage.x + i * 6, stage.y + i * 10)
    await page.mouse.up()
  }
  await wait(300)
  m = await mapState(page)
  const moved = m.transform
  check(`${dev}: a drag moves the map, picks nothing, and the page under it stays`, /translate\((?!0px, 0px)/.test(moved) && m.on.length === 0 && (await page.evaluate(() => scrollY)) === pageY, { moved, on: m.on })
  if (touch) {
    // two fingers, in a page of their own: the browser keeps the test's two touches afterwards, and would eat the
    // taps that follow (seen 22.11.2026: no pointer events at all after it)
    const z = await fresh(vp)
    await openCard(z, 'תל אביב')
    await z.click('[data-places="property"] [data-kind="hood"]')
    await z.click('[data-places="property"] [data-act="open-map"]')
    await z.page.waitForSelector('[data-hood-map]', { visible: true, timeout: 8000 })
    await wait(600)
    const zs = await z.page.$eval('[data-map-stage]', (el) => {
      const r = el.getBoundingClientRect()
      return { x: r.left + r.width / 2, y: r.top + r.height / 2 }
    })
    const cdp = await z.page.createCDPSession()
    const a = { x: zs.x - 30, y: zs.y }
    const b = { x: zs.x + 30, y: zs.y }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ ...a, id: 1 }, { ...b, id: 2 }] })
    for (let i = 1; i <= 8; i++) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: a.x - i * 12, y: a.y, id: 1 }, { x: b.x + i * 12, y: b.y, id: 2 }] })
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
    await wait(300)
    const zm = await mapState(z.page)
    check(`${dev}: two fingers apart zoom the map in, and pick nothing`, zm.scale > 1.8 && zm.on.length === 0, { scale: zm.scale })
    await z.shot(`${dev}-4b-map-zoomed`)
    await z.ctx.close()
    await t.click('[data-act="zoom-in"]')
    m = await mapState(page)
  } else {
    await page.mouse.move(stage.x, stage.y)
    await page.mouse.wheel({ deltaY: -300 })
    await wait(300)
    m = await mapState(page)
    check(`${dev}: the mouse wheel zooms the map in`, m.scale > 1.1, m.scale)
  }
  const zoomed = m.scale
  await t.click('[data-act="zoom-out"]')
  m = await mapState(page)
  check(`${dev}: "−" zooms out, and more names show as the map grows`, m.scale < zoomed, { from: zoomed, to: m.scale })
  // pick one and confirm
  await t.click('[data-act="zoom-out"]')
  await t.click('[data-act="zoom-out"]')
  const pick = pts[0]
  const pt2 = await hoodPoint(page, pick[0])
  await tapAt(page, pt2, touch)
  await t.shot(`${dev}-5-map-picked`)
  await t.click('[data-act="map-done"]')
  await wait(300)
  p = await picker(page, 'property')
  const scrollAfter = await page.evaluate(() => document.querySelector('.modal')?.scrollTop ?? 0)
  check(`${dev}: "אישור" brings the neighbourhood to the form as a chip, and the form is where it was`, !(await page.$('[data-hood-map]')) && p.chips.join() === `hood:${pick[0]}` && Math.abs(scrollAfter - scrollBefore) < 400, { chips: p.chips, scrollBefore, scrollAfter })

  // ---------------------------------------------------------------- 3. the buyer: several, from two cities, list and map
  await page.goto(green + '/app/community?topic=seeking', { waitUntil: 'networkidle0' })
  await wait(700)
  await t.click('[data-act="add-buyer"]')
  await page.waitForSelector('.nc [data-places="buyer"]', { visible: true })
  await wait(300)
  p = await picker(page, 'buyer')
  check(`${dev}: the buyer's form asks for a city first`, p.cities.length === 0 && !!(await page.$eval('[data-places="buyer"]', (e) => e.textContent.includes('בוחרים קודם עיר'))), p)
  await t.click('.nc [data-city="תל אביב"]')
  await t.click('.nc [data-city="רמת גן"]')
  await wait(400)
  await t.click('[data-places="buyer"] [data-kind="hood"]')
  await typeIn(t, '[data-places="buyer"] [data-f="hood-search"]', 'נחלת')
  p = await picker(page, 'buyer')
  const nahalat = p.rows.find((r) => r.n === 'נחלת יצחק')
  check(`${dev}: two cities: each name in the list says its city`, p.cities.join() === 'תל אביב,רמת גן' && !!nahalat && nahalat.city === 'תל אביב', p.rows.slice(0, 4))
  await pickRow(page, 'buyer', 'נחלת יצחק')
  await typeIn(t, '[data-places="buyer"] [data-f="hood-search"]', 'בורס')
  p = await picker(page, 'buyer')
  const bursa = p.rows.find((r) => r.city === 'רמת גן')?.n
  await pickRow(page, 'buyer', bursa)
  await wait(200)
  p = await picker(page, 'buyer')
  check(`${dev}: a buyer may have several neighbourhoods; the list stays open, ticked`, p.chips.join() === `hood:נחלת יצחק,hood:${bursa}` && p.rows.find((r) => r.n === bursa)?.on === 'true', p.chips)
  await t.click('[data-places="buyer"] [data-kind="street"]')
  await typeIn(t, '[data-places="buyer"] [data-f="street-search"]', 'ביאליק')
  p = await picker(page, 'buyer')
  const bialik = p.rows.filter((r) => r.n === 'ביאליק')
  await page.evaluate(() => [...document.querySelectorAll('[data-places="buyer"] [data-pick]')].filter((b) => b.dataset.pick === 'ביאליק').forEach((b) => b.click()))
  await wait(250)
  p = await picker(page, 'buyer')
  check(`${dev}: and several streets`, bialik.length >= 1 && p.chips.filter((c) => c.startsWith('street:')).length >= 1, p.chips)
  await t.click('[data-places="buyer"] [data-kind="hood"]')
  await t.click('[data-places="buyer"] [data-act="open-map"]')
  await page.waitForSelector('[data-hood-map]', { visible: true, timeout: 8000 })
  await wait(700)
  m = await mapState(page)
  const already = m.on.slice()
  const morePts = []
  for (const n of names) {
    if (already.includes(n)) continue
    const pt = await hoodPoint(page, n)
    if (pt && pt.y > 140 && pt.y < vp.height - 160) morePts.push([n, pt])
    if (morePts.length === 2) break
  }
  if (process.env.DEBUG) {
    console.log('morePts', JSON.stringify(morePts))
    await page.evaluate(() => { window.__ev = []; for (const k of ['pointerdown', 'pointerup', 'pointercancel']) document.addEventListener(k, (e) => window.__ev.push(k + ':' + e.pointerId + ':' + (e.target.getAttribute?.('data-hood') ?? e.target.tagName)), true) })
  }
  for (const [n0, pt] of morePts) await tapAt(page, (await hoodPoint(page, n0)) ?? pt, touch)
  if (process.env.DEBUG) console.log('events', await page.evaluate(() => window.__ev.join(' ')))
  m = await mapState(page)
  check(`${dev}: on the map a buyer picks several; the button counts them: "אישור ${m.on.length} שכונות"`, m.on.length === already.length + 2 && m.ok === `אישור ${m.on.length} שכונות` && already.includes('נחלת יצחק'), { already, on: m.on, ok: m.ok })
  await t.shot(`${dev}-6-map-several`)
  await t.click('[data-act="map-done"]')
  p = await picker(page, 'buyer')
  check(`${dev}: what was picked on the map joins the chips; the other city's neighbourhood stays`, morePts.every(([n]) => p.chips.includes(`hood:${n}`)) && p.chips.includes(`hood:${bursa}`), p.chips)
  await page.$eval('[data-places="buyer"]', (el) => el.scrollIntoView({ block: 'start' }))
  await wait(250)
  await t.shot(`${dev}-7-buyer`)
  await page.type('.nc [data-f="name"]', 'לקוח בדיקה')
  await page.type('.nc [data-f="phone"]', '050-555-0177')
  await page.evaluate(() => document.querySelector('.nc')?.closest('form')?.requestSubmit())
  await wait(1300)
  const search = await page.evaluate((n) => {
    const s = JSON.parse(localStorage.getItem('brokers-demo-state-v5') ?? '{}')
    const it = (s.items ?? []).find((x) => x.search?.neighborhoods?.includes(n))
    return it ? { hoods: it.search.neighborhoods, streets: it.search.streets ?? [], text: document.body.innerText.includes('לקוח בדיקה') } : null
  }, 'נחלת יצחק')
  check(`${dev}: the buyer's search keeps the names of the lists, streets too, and never the name`, search && search.hoods.includes(bursa) && search.streets.includes('ביאליק') && !search.text, search)

  // ---------------------------------------------------------------- 3. the feed's filter by neighbourhood
  await page.goto(green + '/app/community?topic=coop', { waitUntil: 'networkidle0' })
  await wait(800)
  const opts = await page.evaluate(() => [...document.querySelectorAll('[data-filter="hood"] option')].map((o) => ({ v: o.value, t: o.textContent })))
  const target = opts.find((o) => o.t.startsWith('נווה שאנן'))
  check(`${dev}: the feed's filter has "שכונה", from the posts`, opts.length > 3 && opts[0].t === 'כל השכונות' && !!target, opts.slice(0, 5))
  await page.select('[data-filter="hood"]', target.v)
  await page.waitForFunction(() => document.querySelectorAll('article').length === Number(document.querySelector('[data-count]')?.textContent), { timeout: 3000 }).catch(() => {})
  await wait(400)
  const f = await page.evaluate(() => ({ places: [...document.querySelectorAll('article .pf-place')].map((x) => x.textContent.trim()), count: Number(document.querySelector('[data-count]')?.textContent) }))
  check(`${dev}: filtering by "נווה שאנן" shows its posts only`, f.count >= 1 && f.places.length === f.count && f.places.every((x) => x.includes('נווה שאנן')), f)
  await page.evaluate(() => document.querySelector('[data-filters]')?.scrollIntoView({ block: 'start' }))
  await wait(250)
  await t.shot(`${dev}-8-feed-filter`)

  // ---------------------------------------------------------------- the match, and one way of writing a name
  const unit = await page.evaluate(async () => {
    const src = [...document.querySelectorAll('script[type="module"]')].map((s) => s.src).find((s) => /main-green/.test(s))
    const root = src.slice(0, src.indexOf('/src/'))
    const { nameKey, samePlace, clearMatch, findNames } = await import(`${root}/src/config/places.ts`)
    const { scoreOf } = await import(`${root}/src/community/match.ts`)
    const P = (o) => ({ area: 'חיפה - נווה שאנן', rooms: '4', price: 2150000, split: '', kind: 'דירה', group: 'home', ...o })
    const S = (o) => ({ cities: ['חיפה'], roomsMin: 4, roomsMax: 4, budget: 2000000, wants: [], ...o })
    const hood = (r) => r?.reasons.find((x) => /שכונה/.test(x.label))
    const street = (r) => r?.reasons.find((x) => /רחוב/.test(x.label))
    return {
      same: [samePlace('נוה שאנן', 'שכונת נווה שאנן'), samePlace('שד הנשיא', 'שדרות הנשיא'), samePlace('ככר דיזנגוף', 'כיכר דיזנגוף'), samePlace('הדר', 'הדר עליון')],
      keys: nameKey('ש\' רמת-אביב ג'),
      clear: [clearMatch(['נווה שאנן', 'הדר עליון', 'הדר מערב'], 'נוה שאנן'), clearMatch(['הדר עליון', 'הדר מערב'], 'הדר'), clearMatch(['רמת אביב ג'], 'רמת אביב')],
      find: findNames(['דיזנגוף', 'ככר דיזנגוף', 'דיזנגוף סנטר', 'אלנבי'], 'דיז'),
      hoodOk: hood(scoreOf('חיפה', P({}), S({ neighborhoods: ['שכונת נוה שאנן'] })))?.ok,
      hoodNo: hood(scoreOf('חיפה', P({}), S({ neighborhoods: ['הדר'] })))?.ok,
      streetOk: [street(scoreOf('חיפה', P({ street: 'שד הנשיא' }), S({ streets: ['שדרות הנשיא'] })))?.ok, scoreOf('חיפה', P({ street: 'שד הנשיא' }), S({ streets: ['שדרות הנשיא'] })).score > scoreOf('חיפה', P({ street: 'הרצל' }), S({ streets: ['שדרות הנשיא'] })).score],
      streetNone: street(scoreOf('חיפה', P({ street: 'הרצל' }), S({})))?.label ?? null,
    }
  })
  check(`${dev}: one way of writing a name: "נוה" and "שכונת נווה", "שד" and "שדרות", "ככר" and "כיכר" are one; "הדר" is not "הדר עליון"`, unit.same.join() === 'true,true,true,false' && unit.keys === 'רמת אביב ג', unit)
  check(`${dev}: an old free name is matched only when it is clear (one name of the list, not two)`, unit.clear[0] === 'נווה שאנן' && unit.clear[1] === null && unit.clear[2] === 'רמת אביב ג', unit.clear)
  check(`${dev}: the list puts the names that start with the letters first`, unit.find.join() === 'דיזנגוף,דיזנגוף סנטר,ככר דיזנגוף', unit.find)
  check(`${dev}: the match reads the names one way: "נוה שאנן" asked, "נווה שאנן" found`, unit.hoodOk === true && unit.hoodNo === false, unit)
  check(`${dev}: the match counts the buyer's streets, and says nothing of streets when none were asked`, unit.streetOk.join() === 'true,true' && unit.streetNone === null, unit)

  // ---------------------------------------------------------------- 5. a name typed freely before the lists
  check(`${dev}: no errors, nothing asked of another address`, t.errors.length === 0 && t.outside.length === 0, { errors: t.errors.slice(0, 2), outside: [...new Set(t.outside)] })
  await t.ctx.close()
  const old = await fresh(vp, 'day', { 'nadlanup-crm-draft-v1': JSON.stringify({ card: { kind: 'property', city: 'חיפה', hood: 'נוה שאנן', street: 'רח הרצל', category: 'home', ptype: 'דירה' }, client: '', photos: [], at: Date.now() }) })
  await openCard(old)
  await old.page.$eval('[data-places="property"]', (el) => el.scrollIntoView({ block: 'start' }))
  await wait(800)
  let o = await picker(old.page, 'property')
  check(`${dev}: names written before the lists stay as they were, marked "מלפני", and the list's name is offered`, o.chips.includes('street:רח הרצל:מלפני') && o.chips.includes('hood:נוה שאנן:מלפני') && o.offer, o)
  await old.shot(`${dev}-9-old-names`)
  for (let i = 0; i < 3; i++) {
    await old.page.evaluate(() => document.querySelector('[data-places="property"] [data-offer]')?.click())
    await wait(300)
  }
  o = await picker(old.page, 'property')
  check(`${dev}: a tap on the offer puts the list's name in its place`, o.hood !== 'נוה שאנן' && !o.chips.some((c) => c.includes('מלפני')), o.chips)
  await old.ctx.close()

  // ---------------------------------------------------------------- by day and by night
  for (const mode of ['day', 'night']) {
    const n = await fresh(vp, mode)
    await openCard(n, 'תל אביב')
    await n.click('[data-places="property"] [data-kind="hood"]')
    // a neighbourhood the map itself knows, so the chip on the map below can be read too
    await typeIn(n, '[data-places="property"] [data-f="hood-search"]', 'נווה אביבים')
    await pickRow(n.page, 'property', 'נווה אביבים')
    await typeIn(n, '[data-places="property"] [data-f="hood-search"]', 'רמת')
    const r = {}
    for (const [name, sel] of [
      ['the city chip', '[data-places="property"] .pl-city'],
      ['a chosen chip', '[data-places="property"] [data-chip]'],
      ['"רחוב" / "שכונה"', '[data-places="property"] .pl-kinds button'],
      ['a name in the list', '[data-places="property"] .pl-row-name'],
      ['"לא מצאתי"', '[data-places="property"] [data-act="manual"]'],
      ['"בחירה מהמפה"', '[data-places="property"] [data-act="open-map"]'],
    ])
      r[name] = await n.contrast(sel)
    await n.page.$eval('[data-places="property"]', (el) => el.scrollIntoView({ block: 'start' }))
    await wait(250)
    await n.shot(`${dev}-${mode}-list`)
    await n.click('[data-places="property"] [data-act="open-map"]')
    await n.page.waitForSelector('[data-hood-map]', { visible: true })
    await wait(600)
    for (const [name, sel] of [
      ['the map\'s title', '[data-hood-map] .hm-top strong'],
      ['the tip', '[data-hood-map] .hm-tip'],
      ['the credit', '[data-hood-map] .hm-credit'],
      ['a chip on the map', '[data-hood-map] [data-map-chip]'],
    ])
      r[name] = await n.contrast(sel)
    const labels = await n.page.evaluate(() => {
      const l = document.querySelector('[data-hood-map] .hm-label')
      const s = l && getComputedStyle(l)
      return s ? { fill: s.fill, stroke: s.stroke, width: s.strokeWidth } : null
    })
    const low = Object.entries(r).filter(([, v]) => v === null || v < 4.5)
    check(`${dev}, ${mode}: every word of the picker and the map can be read (4.5 to 1), and the names on the map have a halo`, low.length === 0 && labels && labels.width !== '0px', { low, r, labels })
    await n.shot(`${dev}-${mode}-map`)
    check(`${dev}, ${mode}: no errors`, n.errors.length === 0, n.errors.slice(0, 2))
    await n.ctx.close()
  }
}

console.log(fails ? `\nSOME CHECKS FAILED (${fails} of ${total})` : `\nALL CHECKS PASSED (${total})`)
await Promise.race([browser.close().catch(() => {}), wait(4000)])
process.exit(fails ? 1 : 0)
