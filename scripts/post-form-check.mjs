// The form of a new post and a new property (Itzik 22.11.2026), four changes, on a computer and a phone, by day and
// by night, in the open demo on the green dev server:
//   1. a story and a post are separate: a story shows in the row of stories only, a post in the feed only, and one
//      small switch in each ("לפרסם גם כפוסט בפיד" / "להעלות גם כסטורי", off by default) puts it in both
//   2. the street is shown to every broker; the building's number only with "להציג מספר בניין" (off by default);
//      the flat's number and the full address stay with the broker who put the property in
//   3. "ממ"ק" is in the list of extras next to "ממ"ד", on the post, on the property's page, in the buyer's must-haves
//      and in the match
//   4. the kind of property in two steps (מגורים / מסחרי, then one of that group's list), the same list in the form,
//      the community's filter, the CRM, the buyer's form and the match; older kinds are read as the closest one
//   5. the price in one box, typed (22.11.2026, in place of the slider: grouped while typed, kept exactly, a price
//      that is a zero short is offered times a thousand) and 6. "עמלת שת"פ", a must,
//      0% to 1% every 0.05%, shown as a red tag on the post's photo and the property's page (22.11.2026)
// Nothing here touches a server: the demo keeps everything in this browser. Saves screenshots.
// Usage: node scripts/post-form-check.mjs [outDir]     (BASE_GREEN overrides the address; ONLY=phone|desktop)
import puppeteer from 'puppeteer-core'
import { mkdirSync } from 'node:fs'
import path from 'node:path'

const green = process.env.BASE_GREEN ?? 'http://localhost:5240/NADLANIL-DEMO/green'
const out = process.argv[2] ?? '_shots/post-form'
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
const HOME = ['דירה', 'דירת גן', 'פנטהאוז', 'מיני פנטהאוז', 'דירת גג', 'דופלקס', "קוטג'", 'בית פרטי', 'וילה', 'בית דו משפחתי', 'סטודיו', 'יחידת דיור', 'מרתף', 'סאבלט', 'מגרש']
const BIZ = ['שטח מסחרי', 'משרד', 'בניין משרדים', 'חנות', 'מבנה מסחרי', 'מגרש', 'מרפאה', 'חלל עבודה משותף', 'אולם אירועים', 'מחסן', 'מבנה תעשייה', 'מלונאות', 'צימר', 'בית אבות ודיור מוגן', 'תחנת דלק', 'עסק למכירה']
const PHOTO = path.resolve('public/img/prop-05.webp')
const DEVICES = [
  ['desktop', { width: 1366, height: 900 }],
  ['phone', { width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }],
].filter(([n]) => !process.env.ONLY || process.env.ONLY === n)

/** the contrast of an element's words against what is really behind them (the layers under it, put together) */
const CONTRAST = `(sel, root) => {
  const parse = (c) => {
    let m = c.match(/rgba?\\(([^)]+)\\)/)
    if (m) { const p = m[1].split(/[ ,/]+/).filter(Boolean).map(Number); return [p[0], p[1], p[2], p[3] ?? 1] }
    m = c.match(/color\\(srgb ([^)]+)\\)/)
    if (m) { const p = m[1].split(/[ /]+/).filter(Boolean).map(Number); return [p[0] * 255, p[1] * 255, p[2] * 255, p[3] ?? 1] }
    return [0, 0, 0, 0]
  }
  const over = (top, under) => under.map((v, i) => v * (1 - top[3]) + top[i] * top[3])
  const lum = (c) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4 }; return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]) }
  const el = (root ?? document).querySelector(sel)
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

async function fresh(vp, mode) {
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
  await page.evaluate((m) => {
    localStorage.clear()
    localStorage.setItem('nadlanup-demo-v1', '1')
    localStorage.setItem('nadlanup-mode-v1', JSON.stringify({ mode: m, until: Date.now() + 9e9 }))
  }, mode)
  const click = async (sel) => {
    await page.waitForSelector(sel, { visible: true, timeout: 8000 })
    await page.$eval(sel, (el) => el.scrollIntoView({ block: 'center' }))
    await wait(120)
    await page.$eval(sel, (el) => el.click())
    await wait(260)
  }
  const type = async (sel, text) => {
    await page.waitForSelector(sel, { visible: true, timeout: 8000 })
    await page.$eval(sel, (el) => el.scrollIntoView({ block: 'center' }))
    await page.click(sel, { clickCount: 3 })
    await page.keyboard.press('Backspace')
    await page.type(sel, text)
  }
  const contrast = (sel) => page.evaluate(`(${CONTRAST})(${JSON.stringify(sel)})`)
  const shot = (name) => page.screenshot({ path: `${out}/${name}.png` })
  return { ctx, page, errors, outside, click, type, contrast, shot }
}

const openCard = async (t) => {
  await t.page.goto(green + '/app/crm?v=properties', { waitUntil: 'networkidle0' })
  await wait(500)
  await t.click('[data-act="new-card"]')
  await t.page.waitForSelector('.ga-fields', { visible: true })
  await wait(450)
}
const saveCard = async (t) => {
  await t.click('.ga-go')
  await wait(900)
}
/** my post in the room of properties, by its title */
const myPost = (page, title) =>
  page.evaluate((title) => {
    const a = [...document.querySelectorAll('article')].find((x) => x.querySelector('h3')?.textContent.trim() === title)
    if (!a) return null
    return {
      id: a.id.replace('ci-', ''),
      place: a.querySelector('.fb-embed-kicker')?.textContent.replace(/\s+/g, ' ').trim(),
      street: a.querySelector('[data-street]')?.textContent.replace(/\s+/g, ' ').trim() ?? null,
      kind: a.querySelector('.fb-kind')?.dataset.kind,
      extras: [...a.querySelectorAll('.fb-extras li')].map((l) => l.textContent.trim()),
      text: a.innerText,
    }
  }, title)
const storyRow = (page) =>
  page.evaluate(() => ({
    n: document.querySelectorAll('.stories [data-story]').length,
    ids: [...document.querySelectorAll('.stories [data-story]')].map((b) => b.dataset.story),
    first: document.querySelector('.stories [data-story]')?.getAttribute('aria-label') ?? '',
    add: document.querySelector('.stories [data-act="new-story"]')?.textContent.trim(),
  }))
const feedHas = (page, words) => page.evaluate((w) => [...document.querySelectorAll('article')].some((a) => a.innerText.includes(w)), words)
// ---- the price and "עמלת שת"פ" (22.11.2026)
const setPrice = async (t, value) => {
  await t.page.waitForSelector('.ga [data-f="price"]', { visible: true })
  await t.page.$eval('.ga [data-f="price"]', (el) => el.scrollIntoView({ block: 'center' }))
  await t.click('.ga [data-f="price"]')
  // the box holds the price that is there: it is cleared first
  await t.page.$eval('.ga [data-f="price"]', (el) => el.select())
  await t.page.keyboard.press('Backspace')
  if (String(value) !== '0') await t.page.type('.ga [data-f="price"]', String(value))
  await wait(200)
}
/** "+" once picks the slider's waiting point (0.5%); then `steps` more "+" (or "−" when negative) */
const pickCoop = async (t, steps = 0) => {
  await t.click('.ga [data-slider="coop"] [data-step="more"]')
  for (let i = 0; i < Math.abs(steps); i++) await t.click(`.ga [data-slider="coop"] [data-step="${steps > 0 ? 'more' : 'less'}"]`)
}
const priceState = (page) =>
  page.evaluate(() => {
    const f = document.querySelector('.ga [data-f="price-field"]')
    const i = f?.querySelector('[data-f="price"]')
    return {
      value: f?.dataset.priceValue ?? null,
      shown: i?.value ?? null,
      caret: i?.selectionStart ?? null,
      say: f?.querySelector('[data-price-say]')?.textContent.trim() ?? null,
      lift: f?.querySelector('[data-act="price-x1000"]')?.textContent.replace(/\s+/g, ' ').trim() ?? null,
      clear: !!f?.querySelector('[data-act="price-clear"]'),
      slider: !!f?.querySelector('[data-slider="price"]'),
      label: f?.querySelector('.field-label')?.textContent.trim() ?? null,
    }
  })
const coopState = (page) =>
  page.evaluate(() => {
    const f = document.querySelector('.ga [data-f="coop"]')
    const th = f?.querySelector('[data-thumb]')
    return { show: f?.querySelector('[data-coop-show]')?.textContent.trim(), now: Number(th?.getAttribute('aria-valuenow')), max: Number(th?.getAttribute('aria-valuemax')), line: f?.querySelector('[data-coop-line]')?.textContent.trim(), marks: [...(f?.querySelectorAll('.ss-marks span') ?? [])].map((s) => s.textContent.trim()), err: f?.querySelector('[data-err="coop"]')?.textContent.trim() ?? null, label: f?.querySelector('.field-label')?.textContent.trim(), steps: [...(f?.querySelectorAll('.ss-step') ?? [])].map((b) => Math.round(b.getBoundingClientRect().height)) }
  })
/** drags the round handle by a number of stops, with a finger on a phone and a mouse on a computer */
const slide = async (t, which, steps, touch) => {
  const { page } = t
  await page.$eval(`.ga [data-slider="${which}"] [data-track]`, (el) => el.scrollIntoView({ block: 'center' }))
  await wait(350)
  const g = await page.evaluate((w) => {
    const h = document.querySelector(`.ga [data-slider="${w}"] [data-track]`)
    const th = h.querySelector('[data-thumb]')
    const r = h.getBoundingClientRect()
    const b = th.getBoundingClientRect()
    return { x: b.left + b.width / 2, y: b.top + b.height / 2, per: r.width / Number(th.getAttribute('aria-valuemax')), rtl: getComputedStyle(h).direction === 'rtl', top: document.querySelector('.modal')?.scrollTop ?? 0, win: scrollY }
  }, which)
  const dx = steps * g.per * (g.rtl ? -1 : 1)
  const parts = 10
  if (touch) {
    await page.touchscreen.touchStart(g.x, g.y)
    for (let i = 1; i <= parts; i++) await page.touchscreen.touchMove(g.x + (dx * i) / parts, g.y + (i % 2 ? 1 : -1))
    await page.touchscreen.touchEnd()
  } else {
    await page.mouse.move(g.x, g.y)
    await page.mouse.down()
    for (let i = 1; i <= parts; i++) await page.mouse.move(g.x + (dx * i) / parts, g.y + (i % 2 ? 1 : -1))
    await page.mouse.up()
  }
  await wait(250)
  const after = await page.evaluate((w) => {
    const th = document.querySelector(`.ga [data-slider="${w}"] [data-thumb]`).getBoundingClientRect()
    return { x: th.left + th.width / 2, top: document.querySelector('.modal')?.scrollTop ?? 0, win: scrollY }
  }, which)
  return { finger: g.x + dx, thumb: after.x, per: g.per, moved: Math.abs(after.top - g.top) + Math.abs(after.win - g.win) }
}
/** a finger that goes up the page and starts on the slider's track, away from the handle */
const swipeOver = async (t, which, touch) => {
  const { page } = t
  await page.$eval(`.ga [data-slider="${which}"] [data-track]`, (el) => el.scrollIntoView({ block: 'center' }))
  await wait(300)
  const g = await page.evaluate((w) => {
    const r = document.querySelector(`.ga [data-slider="${w}"] [data-track]`).getBoundingClientRect()
    return { x: r.right - r.width * 0.75, y: r.top + r.height / 2 }
  }, which)
  if (touch) {
    await page.touchscreen.touchStart(g.x, g.y)
    for (let i = 1; i <= 10; i++) await page.touchscreen.touchMove(g.x + (i % 2 ? 2 : -2), g.y - i * 14)
    await page.touchscreen.touchEnd()
  } else {
    await page.mouse.move(g.x, g.y)
    await page.mouse.down()
    for (let i = 1; i <= 10; i++) await page.mouse.move(g.x + (i % 2 ? 2 : -2), g.y - i * 14)
    await page.mouse.up()
  }
  await wait(300)
}
/** taps the track at a share of its length from where it starts (0 the least, 1 the most) */
const tapTrack = async (t, which, frac, touch) => {
  const { page } = t
  await page.$eval(`.ga [data-slider="${which}"] [data-track]`, (el) => el.scrollIntoView({ block: 'center' }))
  await wait(300)
  const g = await page.evaluate((w, f) => {
    const h = document.querySelector(`.ga [data-slider="${w}"] [data-track]`)
    const r = h.getBoundingClientRect()
    const rtl = getComputedStyle(h).direction === 'rtl'
    return { x: rtl ? r.right - r.width * f : r.left + r.width * f, y: r.top + r.height / 2 }
  }, which, frac)
  if (touch) {
    await page.touchscreen.touchStart(g.x, g.y)
    await page.touchscreen.touchEnd()
  } else await page.mouse.click(g.x, g.y)
  await wait(300)
}
/** where the red tag sits on a photo: inside it, in its corner, away from the price tag, and small */
const tagOnPhoto = (page, sel) =>
  page.evaluate((sel) => {
    const tag = document.querySelector(sel)
    if (!tag) return null
    const photo = tag.parentElement.getBoundingClientRect()
    const r = tag.getBoundingClientRect()
    const price = tag.closest('.fb-prop')?.querySelector('.fb-facts > strong')?.getBoundingClientRect()
    const deal = tag.parentElement.querySelector('.pp-deal')?.getBoundingClientRect()
    const hit = (a, b) => !!a && !!b && a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom
    return {
      text: tag.textContent.replace(/\s+/g, ' ').trim(),
      inside: r.left >= photo.left - 0.5 && r.right <= photo.right + 0.5 && r.top >= photo.top - 0.5 && r.bottom <= photo.bottom + 0.5,
      corner: r.left - photo.left < 30 && r.top - photo.top < 30,
      share: Math.round(((r.width * r.height) / (photo.width * photo.height)) * 1000) / 10,
      overPrice: hit(r, price),
      overDeal: hit(r, deal),
      font: parseFloat(getComputedStyle(tag).fontSize),
      bg: getComputedStyle(tag).backgroundColor,
    }
  }, sel)
/** picks a kind in the community's filter, and waits until the list has followed it (once it missed, 22.11.2026) */
const pickKind = async (page, v) => {
  for (let i = 0; i < 3; i++) {
    await page.select('[data-filter="kind"]', v)
    const ok = await page
      .waitForFunction((v) => document.querySelector('[data-filter="kind"]')?.value === v && document.querySelectorAll('article').length === Number(document.querySelector('[data-count]')?.textContent), { timeout: 3000 }, v)
      .then(() => true)
      .catch(() => false)
    if (ok) break
  }
  await wait(400)
}
/** picks a street or a neighbourhood from the city's list (since 22.11.2026 they are not typed freely): the exact
    name when the list has it, added by hand otherwise, so the names in this check stay the same */
const pickPlace = async (page, kind, name, scope = '') => {
  const nap = (ms) => new Promise((r) => setTimeout(r, ms))
  await page.evaluate((s, k) => document.querySelector(`${s} [data-places] [data-kind="${k}"]`)?.click(), scope, kind)
  await nap(200)
  const box = `${scope} [data-places] [data-f="${kind}-search"]`
  await page.waitForSelector(box, { visible: true, timeout: 8000 })
  await page.$eval(box, (el) => {
    el.scrollIntoView({ block: 'center' })
    el.focus()
    el.select()
  })
  await page.keyboard.press('Backspace')
  await page.type(box, name)
  await page
    .waitForFunction((s) => !!document.querySelector(`${s} [data-places] [data-list] [data-pick]`) || document.querySelector(`${s} [data-places] .pl-none`)?.textContent === 'לא נמצא ברשימה.', { timeout: 8000 }, scope)
    .catch(() => {})
  await nap(200)
  const hit = await page.evaluate(
    (s, n) => {
      const b = [...document.querySelectorAll(`${s} [data-places] [data-pick]`)].find((x) => x.dataset.pick === n)
      if (b) b.click()
      else document.querySelector(`${s} [data-places] [data-act="manual"]`)?.click()
      return !!b
    },
    scope,
    name,
  )
  await nap(250)
  return hit
}
const toAll = async (t) => {
  await t.page.goto(green + '/app/community', { waitUntil: 'networkidle0' })
  await wait(700)
}

for (const [dev, vp] of DEVICES) {
  // =================================================================== by day: the whole of it
  const t = await fresh(vp, 'day')
  const { page } = t

  // ---------------------------------------------------------------- 4. the kind of property, in two steps
  await openCard(t)
  let form = await page.evaluate(() => {
    const groups = [...document.querySelectorAll('.ga [data-f="category"] .pf-group')]
    return {
      label: document.querySelector('.ga [data-f="category"] .field-label')?.textContent.trim(),
      groups: groups.map((g) => g.textContent.trim()),
      h: groups.map((g) => Math.round(g.getBoundingClientRect().height)),
      w: groups.map((g) => Math.round(g.getBoundingClientRect().width)),
      pressed: groups.map((g) => g.getAttribute('aria-pressed')),
      kinds: document.querySelectorAll('.ga .pf-kind').length,
      wide: document.querySelector('.modal-body.ga').scrollWidth - document.querySelector('.modal-body.ga').clientWidth,
    }
  })
  check(`${dev}: step 1 is two big buttons, "מגורים" and "מסחרי", none picked, and no list of kinds yet`, form.groups.join('|') === 'מגורים|מסחרי' && form.h.every((h) => h >= 70) && form.w.every((w) => w >= 120) && form.pressed.every((p) => p === 'false') && form.kinds === 0 && form.wide <= 1, form)
  await t.shot(`${dev}-1-step1`)
  await saveCard(t)
  let err = await page.evaluate(() => ({ text: document.querySelector('[data-err="kind"]')?.textContent.trim(), open: !!document.querySelector('.ga-fields') }))
  check(`${dev}: saving with no kind is stopped at the field, in plain words`, err.open && err.text === 'בוחרים קודם: מגורים או מסחרי.', err)

  await t.click('.ga [data-cat="home"]')
  await wait(350)
  const homeList = await page.evaluate(() => ({ list: [...document.querySelectorAll('.ga .pf-kind')].map((b) => b.textContent.trim()), h: Math.min(...[...document.querySelectorAll('.ga .pf-kind')].map((b) => b.getBoundingClientRect().height)), q: document.querySelector('#pf-kinds-label')?.textContent, rooms: !!document.querySelector('.ga [data-f="rooms"]') }))
  check(`${dev}: step 2, "מגורים": the fifteen kinds, in order, each a full finger high`, homeList.list.join('|') === HOME.join('|') && homeList.h >= 44 && homeList.rooms, homeList)
  await t.shot(`${dev}-2-home-kinds`)
  await saveCard(t)
  err = await page.evaluate(() => document.querySelector('[data-err="kind"]')?.textContent.trim())
  check(`${dev}: a group with no kind picked is not enough either`, err === 'בוחרים איזה נכס זה מהרשימה.', err)
  await t.click('.ga [data-cat="business"]')
  await wait(450)
  const bizList = await page.evaluate(() => ({ list: [...document.querySelectorAll('.ga .pf-kind')].map((b) => b.textContent.trim()), sqm: !!document.querySelector('.ga [data-f="sqm"]'), rooms: !!document.querySelector('.ga [data-f="rooms"]'), extras: [...document.querySelectorAll('.ga [aria-label="תוספות"] .ga-pick')].map((b) => b.textContent.trim()) }))
  check(`${dev}: step 2, "מסחרי": the sixteen kinds, in order; a size in square metres in place of rooms`, bizList.list.join('|') === BIZ.join('|') && bizList.sqm && !bizList.rooms, bizList)
  check(`${dev}: "ממ"ק" is among a commercial property's extras too`, bizList.extras.includes('ממ"ק'), bizList.extras)
  await t.shot(`${dev}-3-business-kinds`)

  // a home: a penthouse in חיפה, with the full address and the two safe rooms
  await t.click('.ga [data-cat="home"]')
  await wait(400)
  await t.click('.ga .pf-kind[data-kind="פנטהאוז"]')
  const city = await page.$('.ga [data-city="חיפה"]')
  if (!city) await t.click('.ga [data-act="more-cities"]')
  await t.click('.ga [data-city="חיפה"]')
  await pickPlace(page, 'hood', 'נווה שאנן', '.ga')
  await pickPlace(page, 'street', 'הרצל', '.ga')
  await t.type('.ga [data-f="house"]', '12')
  await t.type('.ga [data-f="apt"]', '7')
  await t.click('.ga [data-rooms="5"]')
  await setPrice(t, '4200000')
  const pr0 = await priceState(page)
  check(`${dev}: a typed price is grouped in the box, "4,200,000", and kept as 4200000`, pr0.shown === '4,200,000' && pr0.value === '4200000' && pr0.say === '4.2 מיליון שקלים', pr0)

  // ---------------------------------------------------------------- 3. ממ"ק, next to ממ"ד
  const extras = await page.evaluate(() => [...document.querySelectorAll('.ga [aria-label="תוספות"] .ga-pick')].map((b) => b.textContent.trim()))
  check(`${dev}: "ממ"ק" is in the list of extras, right after "ממ"ד"`, extras.includes('ממ"ק') && extras.indexOf('ממ"ק') === extras.indexOf('ממ"ד') + 1, extras)
  for (const x of ['ממ"ד', 'ממ"ק', 'מעלית']) {
    await page.evaluate((x) => [...document.querySelectorAll('.ga [aria-label="תוספות"] .ga-pick')].find((b) => b.textContent.trim() === x).click(), x)
    await wait(120)
  }

  // ---------------------------------------------------------------- 2. the street, and the building's number
  let addr = await page.evaluate(() => ({
    toggle: document.querySelector('[data-toggle="house-no"]')?.getAttribute('aria-checked'),
    label: document.querySelector('[data-toggle="house-no"] b')?.textContent.trim(),
    role: document.querySelector('[data-toggle="house-no"]')?.getAttribute('role'),
    h: Math.round(document.querySelector('[data-toggle="house-no"]').getBoundingClientRect().height),
    seen: document.querySelector('[data-seen] b')?.textContent.trim(),
    note: document.querySelector('.ga-address .ga-private')?.textContent.trim(),
    // since 22.11.2026 the street and the neighbourhood are picked from the city's lists (scripts/places-check.mjs)
    fields: [!!document.querySelector('.ga [data-places="property"]'), ...['house', 'apt'].map((f) => !!document.querySelector(`.ga [data-f="${f}"]`))],
  }))
  check(`${dev}: a small switch "להציג מספר בניין" next to the address, off by default, a full finger high`, addr.label === 'להציג מספר בניין' && addr.toggle === 'false' && addr.role === 'switch' && addr.h >= 44 && addr.fields.every(Boolean), addr)
  check(`${dev}: off: "כך יראו המתווכים" shows the city, the neighbourhood and the street, without the number`, addr.seen === 'חיפה - נווה שאנן, רחוב הרצל' && addr.note.includes('מספר הדירה והכתובת המלאה נשמרים רק אצלכם'), addr)
  await t.click('[data-toggle="house-no"]')
  addr = await page.evaluate(() => ({ toggle: document.querySelector('[data-toggle="house-no"]').getAttribute('aria-checked'), seen: document.querySelector('[data-seen] b').textContent.trim() }))
  check(`${dev}: on: the building's number joins it; the flat's number never does`, addr.toggle === 'true' && addr.seen === 'חיפה - נווה שאנן, רחוב הרצל 12', addr)
  await t.shot(`${dev}-4-address-number-on`)
  await t.click('[data-toggle="house-no"]')
  await page.$eval('.ga [data-f="address"]', (el) => el.scrollIntoView({ block: 'center' }))
  await wait(250)
  await t.shot(`${dev}-5-address-number-off`)

  const story0 = await page.evaluate(() => ({ on: document.querySelector('[data-toggle="as-story"]')?.getAttribute('aria-checked'), label: document.querySelector('[data-toggle="as-story"] b')?.textContent.trim() }))
  check(`${dev}: the property form has "להעלות גם כסטורי", off by default`, story0.label === 'להעלות גם כסטורי' && story0.on === 'false', story0)
  // ---------------------------------------------------------------- 6. "עמלת שת"פ", a must
  let coop = await coopState(page)
  check(`${dev}: "עמלת שת"פ" is in the form, marked "חובה", nothing chosen yet; its slider has 21 stops with 0%, 0.5% and 1% under it`, coop.label?.startsWith('עמלת שת"פ') && coop.label.includes('חובה') && coop.show === 'בוחרים אחוז' && coop.max === 20 && coop.marks.join('|') === '0%|0.5%|1%' && coop.steps.every((h) => h >= 44), coop)
  await saveCard(t)
  coop = await coopState(page)
  const inView = await page.evaluate(() => { const r = document.querySelector('.ga [data-f="coop"]').getBoundingClientRect(); return r.top < innerHeight && r.bottom > 0 && !!document.querySelector('.ga-fields') })
  check(`${dev}: a property cannot be saved without "עמלת שת"פ": it says so at the field, and brings the field into view`, coop.err === 'בוחרים עמלת שת"פ לפני השמירה. אפשר גם 0%.' && inView, { coop, inView })
  await t.shot(`${dev}-15-coop-missing`)
  await pickCoop(t)
  coop = await coopState(page)
  check(`${dev}: "+" picks 0.5%, in big, and the line under it says it in shekels at this price`, coop.show === '0.5%' && coop.now === 10 && coop.line === 'בנכס של 4,200,000 ₪ זה בערך 21,000 ₪' && coop.err === null, coop)
  await t.click('.ga [data-slider="coop"] [data-step="more"]')
  let c1 = (await coopState(page)).show
  await t.click('.ga [data-slider="coop"] [data-step="less"]')
  await t.click('.ga [data-slider="coop"] [data-step="less"]')
  let c2 = await coopState(page)
  check(`${dev}: "+" and "−" move it by 0.05%`, c1 === '0.55%' && c2.show === '0.45%' && c2.line === 'בנכס של 4,200,000 ₪ זה בערך 18,900 ₪', { c1, c2 })
  const d1 = await slide(t, 'coop', 3, dev === 'phone')
  c1 = await coopState(page)
  check(`${dev}: dragging the handle by three stops moves it by 0.15%, and the handle stays under the ${dev === 'phone' ? 'finger' : 'mouse'}`, c1.show === '0.6%' && Math.abs(d1.thumb - d1.finger) <= d1.per * 0.6 + 2 && d1.moved === 0, { c1: c1.show, d1 })
  await page.$eval('.ga [data-slider="coop"] [data-thumb]', (el) => el.focus())
  await page.keyboard.press('End')
  c1 = (await coopState(page)).show
  await page.keyboard.press('Home')
  c2 = await coopState(page)
  check(`${dev}: from the keyboard: End is 1%, Home is 0% (0% is a choice too)`, c1 === '1%' && c2.show === '0%' && c2.line === 'בנכס של 4,200,000 ₪ זה בערך 0 ₪', { c1, c2: c2.show })
  for (let i = 0; i < 10; i++) await page.keyboard.press('ArrowUp')
  await wait(150)
  coop = await coopState(page)
  check(`${dev}: ten steps up from 0% is 0.5%`, coop.show === '0.5%', coop.show)
  await page.$eval('.ga [data-f="coop"]', (el) => el.scrollIntoView({ block: 'center' }))
  await wait(250)
  await t.shot(`${dev}-16-coop-chosen`)
  await saveCard(t)
  const TITLE = 'פנטהאוז 5 חדרים בחיפה'
  const card = await page.evaluate((title) => {
    const c = [...document.querySelectorAll('.kan-card')].find((x) => x.querySelector('h3')?.textContent.trim() === title)
    return c ? { tag: c.querySelector('.kan-top .tag')?.dataset.kind, cat: c.querySelector('.kan-top .tag')?.dataset.cat, exact: c.querySelector('[data-exact]')?.textContent.replace(/\s+/g, ' ').trim(), note: c.innerText.includes('ממ"ק') } : null
  }, TITLE)
  check(`${dev}: the CRM card: its tag is the kind, and the broker's own line has the full address with the flat`, card && card.tag === 'פנטהאוז' && card.cat === 'home' && card.exact === 'הרצל 12, דירה 7, נווה שאנן' && card.note, card)
  const crmCoop = await page.evaluate((title) => [...document.querySelectorAll('.kan-card')].find((x) => x.querySelector('h3')?.textContent.trim() === title)?.querySelector('.coop-badge')?.textContent.replace(/\s+/g, ' ').trim() ?? null, TITLE)
  check(`${dev}: the CRM card shows "עמלת שת"פ 0.5%"`, crmCoop === 'עמלת שת"פ 0.5%', crmCoop)
  await t.shot(`${dev}-6-crm-card`)

  await page.goto(green + '/app/community?topic=coop', { waitUntil: 'networkidle0' })
  await wait(800)
  let post = await myPost(page, TITLE)
  check(`${dev}: in the feed: the city, the neighbourhood and the street; no building number, no flat`, post && post.place.includes('חיפה - נווה שאנן, רחוב הרצל') && post.street === ', רחוב הרצל' && !/הרצל\s*12/.test(post.text) && !post.text.includes('דירה 7'), post)
  check(`${dev}: the post carries its kind, and "ממ"ק" among what the property has`, post && post.kind === 'פנטהאוז' && post.extras.includes('ממ"ק') && post.extras.includes('ממ"ד'), post)
  await page.evaluate((id) => document.getElementById(`ci-${id}`)?.scrollIntoView({ block: 'center' }), post?.id)
  await wait(400)
  const feedCoop = await page.evaluate((id) => {
    const a = document.getElementById(`ci-${id}`)
    return { tag: a?.querySelector('.coop-badge')?.textContent.replace(/\s+/g, ' ').trim() ?? null, line: !!a?.querySelector('.coop-badge.is-line'), old: document.querySelector('main')?.innerText.includes('חלוקת עמלה') }
  }, post?.id)
  check(`${dev}: the post says "עמלת שת"פ 0.5%" in red (no photo here: in the line of facts), and "חלוקת עמלה" is nowhere in the feed`, feedCoop.tag === 'עמלת שת"פ 0.5%' && feedCoop.line && feedCoop.old === false, feedCoop)
  await t.shot(`${dev}-7-post-in-feed`)
  // 0% is not "nothing": it is said in words, in light green, and never in the red of a fee (Itzik 23.11.2026)
  const setCoop = async (pct) => {
    await page.evaluate(
      (id, p) => {
        const s = JSON.parse(localStorage.getItem('brokers-demo-state-v5') ?? '{}')
        const it = (s.items ?? []).find((x) => x.id === id)
        if (it?.property) it.property.coopPct = p
        localStorage.setItem('brokers-demo-state-v5', JSON.stringify(s))
      },
      post?.id,
      pct,
    )
    await page.reload({ waitUntil: 'networkidle0' })
    await wait(900)
    await page.evaluate((id) => document.getElementById(`ci-${id}`)?.scrollIntoView({ block: 'center' }), post?.id)
    await wait(300)
  }
  await setCoop(0)
  const fullTag = await page.evaluate((id) => {
    const b = document.getElementById(`ci-${id}`)?.querySelector('.coop-badge')
    if (!b) return null
    const css = getComputedStyle(b)
    return { text: b.textContent.replace(/\s+/g, ' ').trim(), full: b.classList.contains('is-full'), bg: css.backgroundColor, said: b.dataset.coop }
  }, post?.id)
  const fullInk = await t.contrast(`#ci-${post?.id} .coop-badge`)
  check(`${dev}: a property with 0% says "שת"פ מלא" in a light green, not "0%" in red, and can be read`, fullTag?.text === 'שת"פ מלא' && fullTag.full && fullTag.said === '0' && fullTag.bg === 'rgb(200, 240, 220)' && fullInk >= 4.5, { fullTag, fullInk })
  await t.shot(`${dev}-7b-coop-full`)
  await setCoop(0.5)
  // what is kept of the post itself (this is all another broker's browser would ever get)
  const kept = await page.evaluate((id) => {
    const s = JSON.parse(localStorage.getItem('brokers-demo-state-v5') ?? '{}')
    const it = (s.items ?? []).find((x) => x.id === id)
    return it ? { street: it.property.street, houseNo: it.property.houseNo ?? null, json: JSON.stringify(it), show: it.show } : null
  }, post?.id)
  check(`${dev}: the post itself holds the street only: not the number, not the flat, not the owner`, kept && kept.street === 'הרצל' && kept.houseNo === null && !kept.json.includes('aptNo') && !kept.json.includes('"7"') && !kept.json.includes('בעל הנכס'), kept)
  check(`${dev}: a property with the story switch off is a post only`, kept && kept.show === 'feed', kept?.show)

  await page.goto(`${green}/app/property/${post?.id}`, { waitUntil: 'networkidle0' })
  await wait(600)
  const pp = await page.evaluate(() => ({
    area: document.querySelector('.pp-area')?.textContent.replace(/\s+/g, ' ').trim(),
    exact: document.querySelector('[data-exact] b')?.textContent.trim(),
    exactNote: document.querySelector('[data-exact] small')?.textContent.trim(),
    kind: document.querySelector('.pp-price [data-kind]')?.dataset.kind,
    group: document.querySelector('.pp-price [data-kind]')?.dataset.group,
    extra: [...document.querySelectorAll('.pp-extra li')].map((l) => l.textContent.trim()),
  }))
  check(`${dev}: the property's page: the street for everyone, the full address marked as mine alone`, pp.area === 'חיפה - נווה שאנן, רחוב הרצל' && pp.exact === 'הרצל 12, דירה 7, נווה שאנן, חיפה' && pp.exactNote.includes('רק אתם רואים') && pp.exactNote.includes('בלי מספר הבניין'), pp)
  check(`${dev}: the property's page shows the kind and "ממ"ק"`, pp.kind === 'פנטהאוז' && pp.group === 'home' && pp.extra.includes('ממ"ק'), pp)
  const ppCoop = await page.evaluate(() => ({ tag: document.querySelector('.pp-main .coop-badge')?.textContent.replace(/\s+/g, ' ').trim() ?? null, line: document.querySelector('[data-coop-line]')?.textContent.replace(/\s+/g, ' ').trim() ?? null, old: document.body.innerText.includes('חלוקת עמלה') }))
  check(`${dev}: the property's page: the red tag on the main picture, and "עמלת שת"פ 0.5%, בערך 21,000 ₪" in place of "חלוקת עמלה"`, ppCoop.tag === 'עמלת שת"פ 0.5%' && ppCoop.line === 'עמלת שת"פ 0.5%, בערך 21,000 ₪' && !ppCoop.old, ppCoop)
  const ppTag = await tagOnPhoto(page, '.pp-main .coop-badge')
  check(`${dev}: on the page's picture the tag sits in a corner, away from "למכירה", and covers little of it`, ppTag && ppTag.inside && ppTag.corner && !ppTag.overDeal && ppTag.share < 8 && ppTag.font >= 13, ppTag)
  await t.shot(`${dev}-8-property-page`)
  // a property published before the fee existed: no number is made up for it
  await page.goto(`${green}/app/property/p1`, { waitUntil: 'networkidle0' })
  await wait(600)
  const oldOne = await page.evaluate(() => ({ title: document.querySelector('.pp h1')?.textContent.trim(), tag: !!document.querySelector('.coop-badge'), line: !!document.querySelector('[data-coop-line]'), old: document.body.innerText.includes('חלוקת עמלה') }))
  check(`${dev}: an older property shows no fee at all: no red tag, no line, and not the old "חלוקת עמלה"`, !!oldOne.title && !oldOne.tag && !oldOne.line && !oldOne.old, oldOne)

  // a commercial one, with the building's number shown
  await openCard(t)
  await t.click('.ga [data-cat="business"]')
  await wait(400)
  await t.click('.ga .pf-kind[data-kind="משרד"]')
  if (!(await page.$('.ga [data-city="חיפה"]'))) await t.click('.ga [data-act="more-cities"]')
  await t.click('.ga [data-city="חיפה"]')
  await pickPlace(page, 'hood', 'הדר', '.ga')
  await pickPlace(page, 'street', 'שדרות הנשיא', '.ga')
  await t.type('.ga [data-f="house"]', '40')
  await t.type('.ga [data-f="apt"]', '3')
  await t.type('.ga [data-f="sqm"]', '120')
  await setPrice(t, '1900000')
  // "עמלת שת"פ" from the keyboard: 0%, then fifteen steps up
  await page.$eval('.ga [data-slider="coop"] [data-thumb]', (el) => el.focus())
  await page.keyboard.press('Home')
  for (let i = 0; i < 15; i++) await page.keyboard.press('ArrowUp')
  await wait(150)
  await t.click('[data-toggle="house-no"]')
  const seen2 = await page.evaluate(() => document.querySelector('[data-seen] b').textContent.trim())
  check(`${dev}: a street that already says what it is ("שדרות...") is not called "רחוב" again`, seen2 === 'חיפה - הדר, שדרות הנשיא 40', seen2)
  await saveCard(t)
  const OFFICE = 'משרד 120 מ"ר בחיפה'
  await page.goto(green + '/app/community?topic=coop', { waitUntil: 'networkidle0' })
  await wait(800)
  const office = await myPost(page, OFFICE)
  check(`${dev}: with the switch on, the feed shows the building's number too, and still not the flat`, office && office.street === ', שדרות הנשיא 40' && office.kind === 'משרד' && !office.text.includes('דירה 3'), office)

  const officeCoop = await page.evaluate((title) => [...document.querySelectorAll('article')].find((a) => a.querySelector('h3')?.textContent.trim() === title)?.querySelector('.coop-badge')?.textContent.replace(/\s+/g, ' ').trim() ?? null, OFFICE)
  check(`${dev}: a commercial property carries its own fee: "עמלת שת"פ 0.75%"`, officeCoop === 'עמלת שת"פ 0.75%', officeCoop)

  // ---------------------------------------------------------------- 4. the same list in the community's filter
  const filter = await page.evaluate(() => {
    const s = document.querySelector('[data-filter="kind"]')
    return s ? { groups: [...s.querySelectorAll('optgroup')].map((g) => ({ label: g.label, kinds: [...g.querySelectorAll('option')].slice(1).map((o) => o.textContent.trim()) })), first: s.options[0].textContent } : null
  })
  check(`${dev}: the community's filter has "סוג נכס" with the same two lists`, filter && filter.groups.length === 2 && filter.groups[0].label === 'מגורים' && filter.groups[0].kinds.join('|') === HOME.join('|') && filter.groups[1].label === 'מסחרי' && filter.groups[1].kinds.join('|') === BIZ.join('|'), filter)
  const kindsShown = () => page.evaluate(() => ({ kinds: [...document.querySelectorAll('article .fb-kind')].map((k) => k.dataset.kind), titles: [...document.querySelectorAll('article h3')].map((h) => h.textContent.trim()), count: Number(document.querySelector('[data-count]')?.textContent) }))
  const all = await kindsShown()
  check(`${dev}: every property in the feed has a kind of the list (older words were read as the closest one), none was lost`, all.kinds.length >= 13 && all.kinds.every((k) => HOME.includes(k) || BIZ.includes(k)), all.kinds)
  await pickKind(page, 'home|פנטהאוז')
  let f = await kindsShown()
  check(`${dev}: the filter by one kind: only penthouses, mine among them`, f.kinds.length >= 1 && f.kinds.every((k) => k === 'פנטהאוז') && f.titles.includes(TITLE) && f.count === f.kinds.length, f)
  await t.shot(`${dev}-9-filter-kind`)
  await pickKind(page, 'business|')
  f = await kindsShown()
  check(`${dev}: the filter by the whole group "מסחרי": commercial kinds only, my office among them`, f.kinds.length >= 1 && f.kinds.every((k) => BIZ.includes(k)) && f.titles.includes(OFFICE) && !f.titles.includes(TITLE), f)
  await pickKind(page, 'business|חנות')
  f = await kindsShown()
  check(`${dev}: a kind nobody posted shows nothing, and says so with a count of 0`, f.kinds.length === 0 && f.count === 0, f)
  await pickKind(page, '')

  // older records: the demo's own properties were written before the list
  const old = await page.evaluate(() => {
    const by = (t) => [...document.querySelectorAll('article')].find((a) => a.querySelector('h3')?.textContent.includes(t))?.querySelector('.fb-kind')?.dataset.kind
    return { duplex: by('דו משפחתי'), tower: by('במגדל ליד הים'), garden: by('דירת גן 5 חדרים'), house: by('בית פרטי 6 חדרים') }
  })
  check(`${dev}: older kinds are read as the closest one: "דו משפחתי" as "בית דו משפחתי", "דירה במגדל" as "דירה"`, old.duplex === 'בית דו משפחתי' && old.tower === 'דירה' && old.garden === 'דירת גן' && old.house === 'בית פרטי', old)
  await page.goto(green + '/app/crm?v=properties', { waitUntil: 'networkidle0' })
  await wait(500)
  const board = await page.evaluate(() => ({
    cats: [...document.querySelectorAll('.crm-cats [data-cat]')].map((b) => b.textContent.replace(/\d+/g, '').trim()),
    tags: [...document.querySelectorAll('.kan-card .kan-top .tag')].map((x) => x.dataset.kind),
    shop: [...document.querySelectorAll('.kan-card')].find((c) => c.querySelector('h3')?.textContent.includes('חנות 45'))?.querySelector('.kan-top .tag')?.dataset.kind,
    n: document.querySelectorAll('.kan-card').length,
  }))
  check(`${dev}: the CRM: the board is filtered by "מגורים" / "מסחרי", and every card's tag is a kind of the list`, board.cats.join('|') === 'הכול|מגורים|מסחרי' && board.tags.every((k) => HOME.includes(k) || BIZ.includes(k)) && board.shop === 'חנות' && board.n >= 8, board)

  // ---------------------------------------------------------------- 4 + 3. the buyer's form
  await page.goto(green + '/app/community?topic=seeking', { waitUntil: 'networkidle0' })
  await wait(700)
  await t.click('[data-act="add-buyer"]')
  await page.waitForSelector('.nc [data-f="kinds"]', { visible: true })
  await wait(400)
  let nc = await page.evaluate(() => ({
    groups: [...document.querySelectorAll('.nc [data-group]')].map((g) => `${g.textContent.trim()}:${g.getAttribute('aria-pressed')}`),
    kinds: [...document.querySelectorAll('.nc [data-kinds] .nc-pick')].map((b) => b.textContent.trim()),
    on: [...document.querySelectorAll('.nc [data-kinds] .nc-pick[aria-pressed="true"]')].map((b) => b.textContent.trim()),
    must: [...document.querySelectorAll('.nc [data-must]')].map((b) => b.dataset.must),
    rooms: !!document.querySelector('.nc [data-f="rooms"]'),
  }))
  check(`${dev}: the buyer's form: the same two steps and the same list of homes, "דירה" picked to start from`, nc.groups.join('|') === 'מגורים:true|מסחרי:false' && nc.kinds.join('|') === HOME.join('|') && nc.on.join() === 'דירה' && nc.rooms, nc)
  check(`${dev}: the buyer's must-haves have "ממ"ק" next to "ממ"ד"`, nc.must.includes('ממ"ק') && nc.must.indexOf('ממ"ק') === nc.must.indexOf('ממ"ד') + 1, nc.must)
  await t.click('.nc [data-group="business"]')
  nc = await page.evaluate(() => ({ kinds: [...document.querySelectorAll('.nc [data-kinds] .nc-pick')].map((b) => b.textContent.trim()), rooms: !!document.querySelector('.nc [data-f="rooms"]'), wide: document.querySelector('.nc').scrollWidth - document.querySelector('.nc').clientWidth }))
  check(`${dev}: "מסחרי" in the buyer's form: the sixteen commercial kinds, and no rooms`, nc.kinds.join('|') === BIZ.join('|') && !nc.rooms && nc.wide <= 1, nc)
  await page.$eval('.nc [data-f="kinds"]', (el) => el.scrollIntoView({ block: 'center' }))
  await wait(250)
  await t.shot(`${dev}-10-buyer-form`)
  await t.click('.nc [data-kinds] [data-kind="משרד"]')
  await t.click('.nc [data-must="ממ\\"ק"]')
  await t.type('.nc [data-f="name"]', 'לקוח בדיקה')
  await t.type('.nc [data-f="phone"]', '050-555-0188')
  if (!(await page.$('.nc [data-city="חיפה"]'))) await page.evaluate(() => [...document.querySelectorAll('.nc button')].find((b) => b.textContent.trim() === 'עוד ערים')?.click())
  await wait(200)
  await t.click('.nc [data-city="חיפה"]')
  await page.evaluate(() => document.querySelector('.nc')?.closest('form')?.requestSubmit())
  await wait(1200)
  const buyer = await page.evaluate(() => {
    const a = [...document.querySelectorAll('article')].find((x) => x.querySelector('h3')?.textContent.includes('משרד'))
    const s = JSON.parse(localStorage.getItem('brokers-demo-state-v5') ?? '{}')
    const it = (s.items ?? []).find((x) => x.search && x.title?.includes('משרד') && x.fresh !== undefined)
    return { title: a?.querySelector('h3')?.textContent.trim(), text: a?.innerText ?? '', search: it?.search }
  })
  check(`${dev}: the buyer's post says the kind, carries the group, and never the client's name or phone`, buyer.title === 'מחפש לקונה: משרד בחיפה' && buyer.search?.group === 'business' && buyer.search?.kinds.join() === 'משרד' && buyer.search?.wants.includes('ממ"ק') && !buyer.text.includes('לקוח בדיקה') && !buyer.text.includes('0188'), buyer)

  // ---------------------------------------------------------------- 4 + 3. the match, on the code itself
  const unit = await page.evaluate(async () => {
    const src = [...document.querySelectorAll('script[type="module"]')].map((s) => s.src).find((s) => /main-green/.test(s))
    const root = src.slice(0, src.indexOf('/src/'))
    const { scoreOf } = await import(`${root}/src/community/match.ts`)
    const { kindOf, kindTitle } = await import(`${root}/src/config/propertyTypes.ts`)
    const { publicPlace, lockScreenPlace } = await import(`${root}/src/community/place.ts`)
    const P = (o) => ({ area: 'חיפה - נווה שאנן', rooms: '5', price: 4000000, split: '', ...o })
    const S = (o) => ({ cities: ['חיפה'], roomsMin: 4, roomsMax: 5, budget: 4500000, wants: [], ...o })
    const kindOk = (r) => r && r.reasons.find((x) => /פנטהאוז|דירת גן|משרד|חנות|דירה|מגרש/.test(x.label))?.ok
    const pent = P({ kind: 'פנטהאוז', group: 'home' })
    const officeP = P({ kind: 'משרד', group: 'business', rooms: '', sqm: 120 })
    return {
      same: kindOk(scoreOf('חיפה', pent, S({ kinds: ['פנטהאוז'], group: 'home' }))),
      other: kindOk(scoreOf('חיפה', pent, S({ kinds: ['דירת גן'], group: 'home' }))),
      lower: scoreOf('חיפה', pent, S({ kinds: ['פנטהאוז'], group: 'home' })).score > scoreOf('חיפה', pent, S({ kinds: ['דירת גן'], group: 'home' })).score,
      homeVsBiz: scoreOf('חיפה', pent, S({ kinds: ['משרד'], group: 'business' })),
      bizVsHome: scoreOf('חיפה', officeP, S({ kinds: ['דירה'], group: 'home' })),
      office: kindOk(scoreOf('חיפה', officeP, S({ kinds: ['משרד'], group: 'business' }))),
      officeVsShop: kindOk(scoreOf('חיפה', officeP, S({ kinds: ['חנות'], group: 'business' }))),
      // records from before the list: an old commercial post against an old commercial search, an old home against "דירה"
      oldBiz: !!scoreOf('חיפה', P({ kind: 'משרדי/עסקי', rooms: '', area: 'חיפה - הדר · 120 מ"ר' }), S({ kinds: ['משרדי/עסקי'] })),
      oldBizVsHome: scoreOf('חיפה', P({ kind: 'משרדי/עסקי', rooms: '', area: 'חיפה - הדר · 120 מ"ר' }), S({ kinds: ['דירה'] })),
      oldHome: kindOk(scoreOf('חיפה', P({ kind: 'דירה במגדל' }), S({ kinds: ['דירה'] }))),
      // the plot of land is in both lists: the group tells them apart
      plot: [scoreOf('חיפה', P({ kind: 'מגרש', group: 'home', rooms: '' }), S({ kinds: ['מגרש'], group: 'business' })), !!scoreOf('חיפה', P({ kind: 'מגרש', group: 'business', rooms: '' }), S({ kinds: ['מגרש'], group: 'business' }))],
      mamak: [scoreOf('חיפה', P({ kind: 'דירה', group: 'home', extra: ['ממ"ק'] }), S({ wants: ['ממ"ק'] })).reasons.find((x) => x.label === 'ממ"ק')?.ok, scoreOf('חיפה', P({ kind: 'דירה', group: 'home', extra: ['ממ"ד'] }), S({ wants: ['ממ"ק'] })).reasons.find((x) => x.label === 'ממ"ק')?.ok],
      maps: [kindOf({ oldCategory: 'business', title: 'חנות 45 מ"ר ברחוב ראשי' }), kindOf({ oldCategory: 'office', title: 'נכס משרדי/עסקי 80 מ"ר' }), kindOf({ kind: 'דירה להשכרה', title: 'להשכרה: 2 חדרים' }), kindOf({ kind: 'מיני פנטהאוז' }), kindOf({ title: 'קוטג׳ 5 חדרים', kind: "קוטג'" })].map((k) => `${k.group}:${k.kind}`),
      titles: [kindTitle('home', 'דירה', { rooms: 4, city: 'חיפה' }), kindTitle('home', 'וילה', { rooms: 6, city: 'חיפה' }), kindTitle('home', 'מגרש', { sqm: 500, city: 'חדרה' }), kindTitle('business', 'חנות', { sqm: 45, city: 'חולון' })],
      // the street: an older card gives nothing; a new one gives the street, and the number only when asked
      place: [publicPlace({ street: 'הרצל', houseNo: '12' }), publicPlace({ street: 'הרצל', houseNo: '12', showHouseNo: false }), publicPlace({ street: 'הרצל', houseNo: '12', showHouseNo: true })].map((p) => JSON.stringify(p)),
      lock: lockScreenPlace({ area: 'חיפה - נווה שאנן' }),
    }
  })
  check(`${dev}: the match by the new kind: the kind that was asked for fits, another kind of the group fits less`, unit.same === true && unit.other === false && unit.lower === true && unit.office === true && unit.officeVsShop === false, unit)
  check(`${dev}: the match never crosses the groups: a home is no answer to a commercial search, nor the other way`, unit.homeVsBiz === null && unit.bizVsHome === null && unit.oldBizVsHome === null && unit.plot[0] === null && unit.plot[1] === true, unit)
  check(`${dev}: the match still reads what was saved before the list`, unit.oldBiz === true && unit.oldHome === true, unit)
  check(`${dev}: the match counts "ממ"ק" as its own must-have (a "ממ"ד" is not one)`, unit.mamak[0] === true && unit.mamak[1] === false, unit.mamak)
  check(`${dev}: older kinds map to the closest kind of the list`, unit.maps.join('|') === "business:חנות|business:שטח מסחרי|home:דירה|home:מיני פנטהאוז|home:קוטג'", unit.maps)
  check(`${dev}: titles are made of the kind`, unit.titles.join('|') === 'דירת 4 חדרים בחיפה|וילה 6 חדרים בחיפה|מגרש 500 מ"ר בחדרה|חנות 45 מ"ר בחולון', unit.titles)
  check(`${dev}: a card saved before the new rule gives no street; a new one gives the street, and the number only when asked`, unit.place.join('|') === '{}|{"street":"הרצל"}|{"street":"הרצל","houseNo":"12"}', unit.place)
  check(`${dev}: what a lock-screen notice may carry is the city and the neighbourhood only`, unit.lock === 'חיפה - נווה שאנן', unit.lock)

  // ---------------------------------------------------------------- 1. a story and a post are separate
  await toAll(t)
  const row0 = await storyRow(page)
  check(`${dev}: the row of stories is there, and its first tile is "סטורי חדש"`, row0.n >= 3 && row0.add === 'סטורי חדש', row0)
  const me = await page.evaluate(() => document.querySelector('.stories .story-add img')?.getAttribute('src') ?? '')
  await t.click('[data-act="new-story"]')
  await page.waitForSelector('[data-composer="story"]', { visible: true })
  await wait(450)
  let comp = await page.evaluate(() => ({
    title: document.querySelector('.modal h2, .modal-title, .modal header')?.textContent.trim(),
    head: document.querySelector('.pf-story-head')?.textContent.trim(),
    toggle: document.querySelector('[data-toggle="also-post"] b')?.textContent.trim(),
    on: document.querySelector('[data-toggle="also-post"]')?.getAttribute('aria-checked'),
    hint: document.querySelector('[data-toggle="also-post"] small')?.textContent.trim(),
    topics: !!document.querySelector('.composer-topics'),
    upload: document.querySelector('[data-act="upload-photo"]')?.textContent.trim(),
    go: document.querySelector('[data-act="publish"]')?.textContent.trim(),
    wide: document.querySelector('.composer-modal').scrollWidth - document.querySelector('.composer-modal').clientWidth,
  }))
  check(`${dev}: a new story: its own window, with "לפרסם גם כפוסט בפיד" off by default`, comp.title?.includes('סטורי חדש') && comp.toggle === 'לפרסם גם כפוסט בפיד' && comp.on === 'false' && comp.hint.includes('בשורת הסטורי בלבד') && !comp.topics && comp.upload === 'העלאת תמונה' && comp.go === 'העלאת הסטורי' && comp.wide <= 1, comp)
  await t.click('[data-act="publish"]')
  const noPhoto = await page.evaluate(() => ({ err: document.querySelector('[data-err="story-photo"]')?.textContent.trim(), open: !!document.querySelector('[data-composer="story"]') }))
  check(`${dev}: a story with no picture is not sent, and says why`, noPhoto.open && noPhoto.err?.startsWith('סטורי הוא תמונה'), noPhoto)
  await (await page.$('[data-f="post-photo"]')).uploadFile(PHOTO)
  await page.waitForSelector('[data-own-photo] img', { visible: true, timeout: 15000 })
  await wait(300)
  const ownPhoto = await page.evaluate(() => ({ src: document.querySelector('[data-own-photo] img').src.slice(0, 22), kb: Math.round(document.querySelector('[data-own-photo] img').src.length / 1024), err: !!document.querySelector('[data-err="story-photo"]') }))
  check(`${dev}: the broker's own picture is taken from the device and made small before it is kept`, ownPhoto.src === 'data:image/jpeg;base64' && ownPhoto.kb < 700 && !ownPhoto.err, ownPhoto)
  const CAP1 = `סטורי בלבד ${dev}`
  await t.type('#composer-text', CAP1)
  await t.shot(`${dev}-11-new-story`)
  await t.click('[data-act="publish"]')
  await wait(1300)
  const row1 = await storyRow(page)
  const inFeed1 = await feedHas(page, CAP1)
  check(`${dev}: the story is in the row of stories, first, and NOT in the feed`, row1.n === row0.n + 1 && !row0.ids.includes(row1.ids[0]) && !inFeed1, { before: row0.n, after: row1.n, inFeed1 })
  await page.goto(green + '/app/community?topic=posts', { waitUntil: 'networkidle0' })
  await wait(600)
  check(`${dev}: ... nor in the room of posts`, !(await feedHas(page, CAP1)))
  await toAll(t)
  await page.$eval('.stories', (el) => el.scrollIntoView({ block: 'center' }))
  await wait(300)
  await t.shot(`${dev}-12-story-row`)
  await page.evaluate(() => document.querySelector('.stories [data-story]').click())
  await page.waitForSelector('.story-view', { visible: true })
  await wait(500)
  const viewer = await page.evaluate(() => ({ text: document.querySelector('.story-view footer h3')?.textContent.trim(), tag: document.querySelector('.story-view footer .tag')?.textContent.trim(), toPost: !!document.querySelector('.story-view footer .btn') }))
  check(`${dev}: the story opens with its words, marked "סטורי", and offers no post to go to`, viewer.text === CAP1 && viewer.tag === 'סטורי' && !viewer.toPost, viewer)
  await t.shot(`${dev}-13-story-open`)
  await page.keyboard.press('Escape')
  await wait(400)

  // a story that is a post too
  await t.click('[data-act="new-story"]')
  await page.waitForSelector('[data-composer="story"]', { visible: true })
  await wait(400)
  await (await page.$('[data-f="post-photo"]')).uploadFile(PHOTO)
  await page.waitForSelector('[data-own-photo] img', { visible: true, timeout: 15000 })
  const CAP2 = `סטורי וגם פוסט ${dev}`
  await t.type('#composer-text', CAP2)
  await t.click('[data-toggle="also-post"]')
  const both = await page.evaluate(() => ({ on: document.querySelector('[data-toggle="also-post"]').getAttribute('aria-checked'), topics: !!document.querySelector('.composer-topics'), hint: document.querySelector('[data-toggle="also-post"] small')?.textContent.trim() }))
  check(`${dev}: turning the switch on asks for the post's topic too`, both.on === 'true' && both.topics && both.hint.includes('גם כפוסט בפיד'), both)
  await t.click('[data-act="publish"]')
  await wait(1300)
  const row2 = await storyRow(page)
  check(`${dev}: with the switch on, the story is in the row of stories AND in the feed`, row2.n === row1.n + 1 && (await feedHas(page, CAP2)), { n: row2.n })

  // a post: in the feed only, even with a picture
  await t.click('[data-act="share"]')
  await page.waitForSelector('[data-share-sheet]', { visible: true })
  await wait(350)
  await t.click('[data-share-sheet] [data-intent="post"]')
  await page.waitForSelector('[data-composer="post"]', { visible: true })
  await wait(450)
  comp = await page.evaluate(() => ({ toggle: document.querySelector('[data-toggle="also-story"] b')?.textContent.trim(), on: document.querySelector('[data-toggle="also-story"]')?.getAttribute('aria-checked'), hint: document.querySelector('[data-toggle="also-story"] small')?.textContent.trim(), h: Math.round(document.querySelector('[data-toggle="also-story"]').getBoundingClientRect().height), topics: !!document.querySelector('.composer-topics') }))
  check(`${dev}: a new post: "להעלות גם כסטורי", off by default, a full finger high`, comp.toggle === 'להעלות גם כסטורי' && comp.on === 'false' && comp.hint.includes('בפיד בלבד') && comp.h >= 44 && comp.topics, comp)
  const CAP3 = `פוסט בלבד ${dev}`
  await t.type('#composer-text', CAP3)
  await t.click('.composer-add [aria-label="תמונה"]')
  await wait(450)
  await page.evaluate(() => document.querySelector('.composer-photos [aria-label="בחירת תמונה לדוגמה"]').click())
  await wait(250)
  await t.shot(`${dev}-14-new-post`)
  await t.click('[data-act="publish"]')
  // the window closes once it is published (it missed once on a computer: tried again, never twice published)
  if (!(await page.waitForSelector('[data-composer]', { hidden: true, timeout: 2500 }).then(() => true).catch(() => false))) await t.click('[data-act="publish"]')
  await wait(1300)
  await toAll(t)
  const row3 = await storyRow(page)
  check(`${dev}: the post, picture and all, is in the feed and NOT in the row of stories`, (await feedHas(page, CAP3)) && row3.n === row2.n, { before: row2.n, after: row3.n })

  // a post that is a story too: it needs a picture
  await t.click('[data-act="share"]')
  await page.waitForSelector('[data-share-sheet]', { visible: true })
  await wait(350)
  await t.click('[data-share-sheet] [data-intent="post"]')
  await page.waitForSelector('[data-composer="post"]', { visible: true })
  await wait(450)
  const CAP4 = `פוסט וגם סטורי ${dev}`
  await t.type('#composer-text', CAP4)
  await t.click('[data-toggle="also-story"]')
  await t.click('[data-act="publish"]')
  const need = await page.evaluate(() => ({ err: document.querySelector('[data-err="story-photo"]')?.textContent.trim(), open: !!document.querySelector('[data-composer="post"]'), photos: !!document.querySelector('.composer-photos') }))
  check(`${dev}: a post that is a story too asks for a picture before it goes`, need.open && need.photos && need.err?.startsWith('סטורי הוא תמונה'), need)
  await page.evaluate(() => document.querySelector('.composer-photos [aria-label="בחירת תמונה לדוגמה"]').click())
  await wait(250)
  await t.click('[data-act="publish"]')
  await wait(1300)
  await toAll(t)
  const row4 = await storyRow(page)
  check(`${dev}: with the switch on, the post is in the feed AND in the row of stories`, (await feedHas(page, CAP4)) && row4.n === row3.n + 1, { before: row3.n, after: row4.n })
  const shows = await page.evaluate((caps) => {
    const s = JSON.parse(localStorage.getItem('brokers-demo-state-v5') ?? '{}')
    return caps.map((c) => (s.items ?? []).find((x) => x.body === c)?.show)
  }, [CAP1, CAP2, CAP3, CAP4])
  check(`${dev}: what is kept says where each one shows: a story, both, a post, both`, shows.join('|') === 'story|both|feed|both', shows)
  check(`${dev}: nothing that was in the feed or in the stories before was removed`, row4.n === row0.n + 3 && me.length > 0, { before: row0.n, after: row4.n })

  // a property that is a story too
  await openCard(t)
  await t.click('.ga [data-cat="home"]')
  await wait(350)
  await t.click('.ga .pf-kind[data-kind="דירת גן"]')
  await setPrice(t, '3100000')
  await pickCoop(t)
  await page.$eval('.ga [data-slider="coop"] [data-thumb]', (el) => el.focus())
  await page.keyboard.press('End')
  await t.click('[data-toggle="as-story"]')
  await saveCard(t)
  const warn = await page.evaluate(() => ({ text: document.querySelector('[data-warn="as-story"]')?.textContent.trim(), open: !!document.querySelector('.ga-fields') }))
  check(`${dev}: a property as a story needs a photo, and says so at the switch`, warn.open && warn.text?.startsWith('סטורי הוא תמונה'), warn)
  await (await page.$('.ga [data-f="photos"]')).uploadFile(PHOTO)
  await wait(1800)
  await saveCard(t)
  await toAll(t)
  const row5 = await storyRow(page)
  const GARDEN = 'דירת גן 4 חדרים בפתח תקווה'
  const garden = await page.evaluate((title) => {
    const s = JSON.parse(localStorage.getItem('brokers-demo-state-v5') ?? '{}')
    const it = (s.items ?? []).find((x) => x.title === title && x.authorId === 'b1')
    return { show: it?.show, id: it?.id, image: !!it?.image }
  }, GARDEN)
  check(`${dev}: a property with the story switch on is a post in the feed and a story too`, garden.show === 'both' && garden.image && row5.ids.includes(garden.id) && row5.n === row4.n + 1, { garden, n: row5.n })

  // the red tag on the post's photo
  await page.goto(green + '/app/community?topic=coop', { waitUntil: 'networkidle0' })
  await wait(800)
  await page.evaluate((id) => document.getElementById(`ci-${id}`)?.scrollIntoView({ block: 'center' }), garden.id)
  await wait(500)
  const feedTag = await tagOnPhoto(page, `#ci-${garden.id} .coop-badge`)
  check(`${dev}: on the post's photo the red tag "עמלת שת"פ 1%" sits in the corner, not over the price tag, and covers little of the picture`, feedTag && feedTag.text === 'עמלת שת"פ 1%' && feedTag.inside && feedTag.corner && !feedTag.overPrice && feedTag.share < 8 && feedTag.font >= 13 && feedTag.bg === 'rgb(198, 40, 40)', feedTag)
  await t.shot(`${dev}-17-coop-on-photo`)
  await page.goto(`${green}/app/property/${garden.id}`, { waitUntil: 'networkidle0' })
  await wait(700)
  await t.shot(`${dev}-18-coop-property-page`)

  // ---------------------------------------------------------------- 5. the price, typed into one box
  await openCard(t)
  await t.click('.ga [data-cat="home"]')
  await wait(350)
  await t.click('.ga .pf-kind[data-kind="דירה"]')
  await page.$eval('.ga [data-f="price-field"]', (el) => el.scrollIntoView({ block: 'center' }))
  await wait(250)
  let pr = await priceState(page)
  const hole = await page.evaluate(() => {
    const i = document.querySelector('.ga [data-f="price"]')
    return { mode: i?.inputMode, type: i?.type, hint: i?.placeholder, size: parseFloat(getComputedStyle(i).fontSize), tall: i?.getBoundingClientRect().height, label: document.querySelector('.ga label[for="pf-price"]')?.getAttribute('for'), named: i?.getAttribute('aria-label') }
  })
  check(`${dev}: the price is one box with a number keyboard, nothing to drag, and its name is tied to it`, pr.label === 'מחיר' && !pr.slider && pr.shown === '' && pr.value === '' && hole.mode === 'numeric' && hole.hint === '2,790,000' && hole.size >= 16 && hole.tall >= 44 && hole.label === 'pf-price' && hole.named === 'מחיר הנכס, בשקלים', { pr, hole })
  check(`${dev}: until a price is written, the line under the box says what to do, and there is nothing to clear`, pr.say === 'כותבים את הסכום בספרות, והוא יסתדר לבד.' && !pr.clear && pr.lift === null, pr)
  await t.shot(`${dev}-19-price-empty`)
  // the digits are grouped while they are typed
  await t.click('.ga [data-f="price"]')
  await page.type('.ga [data-f="price"]', '2790')
  const mid = await priceState(page)
  await page.type('.ga [data-f="price"]', '000')
  pr = await priceState(page)
  check(`${dev}: the digits are grouped as they are typed: 2790 is "2,790", and 2790000 is "2,790,000"`, mid.shown === '2,790' && pr.shown === '2,790,000' && pr.value === '2790000', { mid: mid.shown, pr })
  check(`${dev}: under the box the size is said in words, so a zero that is short is seen: "2.79 מיליון שקלים"`, pr.say === '2.79 מיליון שקלים' && pr.clear, pr)
  check(`${dev}: the caret stays at the end of what was typed (the grouping does not throw it to the front)`, pr.caret === pr.shown.length, { caret: pr.caret, shown: pr.shown })
  await t.shot(`${dev}-20-price-typed`)
  // a digit put in the middle: the caret stays right after it
  await page.$eval('.ga [data-f="price"]', (el) => el.setSelectionRange(1, 1))
  await page.keyboard.type('5')
  const inside = await priceState(page)
  check(`${dev}: a digit written inside the number keeps its place: "25,790,000", the caret right after the 5`, inside.shown === '25,790,000' && inside.value === '25790000' && inside.caret === 2, inside)
  // nothing but digits, and never more than can be kept
  await setPrice(t, 'abc1,2a3')
  const only = await priceState(page)
  await setPrice(t, '123456789012')
  const big = await priceState(page)
  check(`${dev}: only digits are taken ("abc1,2a3" is 123), and the most that can be written is 999,999,999`, only.value === '123' && big.shown === '999,999,999' && big.value === '999999999', { only: only.shown, big: big.shown })
  // a price that is a zero short: the full amount, one tap away
  await setPrice(t, '2790')
  const low = await priceState(page)
  await t.shot(`${dev}-21-price-x1000`)
  await t.click('.ga [data-act="price-x1000"]')
  await wait(200)
  const lifted = await priceState(page)
  check(`${dev}: a price under 100,000 ₪ is offered times a thousand, and one tap writes it in`, low.lift === 'התכוונתם ל-2,790,000 ₪?' && lifted.shown === '2,790,000' && lifted.value === '2790000' && lifted.lift === null, { low: low.lift, lifted })
  // what was typed is kept exactly, and the X empties the box
  await setPrice(t, '2379000')
  pr = await priceState(page)
  check(`${dev}: a price that is on no round step (2,379,000) is kept exactly as it was typed`, pr.shown === '2,379,000' && pr.value === '2379000' && pr.say === '2.38 מיליון שקלים', pr)
  await t.click('.ga [data-act="price-clear"]')
  await wait(200)
  const empty = await priceState(page)
  check(`${dev}: the X empties the box, and the box is ready to write into again`, empty.shown === '' && empty.value === '' && !empty.clear && (await page.evaluate(() => document.activeElement === document.querySelector('.ga [data-f="price"]'))), empty)
  await setPrice(t, '30000000')
  const top = await priceState(page)
  check(`${dev}: a big price is written the same way: "30,000,000", and said as "30 מיליון שקלים"`, top.shown === '30,000,000' && top.value === '30000000' && top.say === '30 מיליון שקלים', top)
  const stops = await page.evaluate(async () => {
    const src = [...document.querySelectorAll('script[type="module"]')].map((s) => s.src).find((s) => /main-green/.test(s))
    const root = src.slice(0, src.indexOf('/src/'))
    const c = await import(`${root}/src/config/coop.ts`)
    return {
      digits: [c.priceDigits('2,790,000'), c.priceDigits('abc'), c.priceDigits('999999999999')],
      groups: [c.priceGroups(2790000), c.priceGroups(0)],
      words: [c.priceWords(2790000), c.priceWords(1000000), c.priceWords(850000), c.priceWords(2379000), c.priceWords(0)],
      coop: c.COOP_STOPS.map(c.coopText).join(' '),
      amount: [c.coopAmount(2_500_000, 0.5), c.coopAmount(2_479_000, 0.45), c.coopAmount(1_000_000, 0)],
      old: [c.hasCoop(undefined), c.hasCoop(null), c.hasCoop(0), c.hasCoop(0.5), c.hasCoop(1.5)],
    }
  })
  check(`${dev}: the price is read as a plain number, grouped and said in words, the same everywhere`, stops.digits.join() === '2790000,0,999999999' && stops.groups.join() === '2,790,000,' && stops.words.join('|') === '2.79 מיליון שקלים|מיליון שקלים|850 אלף שקלים|2.38 מיליון שקלים|', stops)
  await setPrice(t, '2225000')
  check(`${dev}: the fee's stops are 0% to 1% every 0.05%, and its shekels are rounded to 100 ₪`, stops.coop === '0% 0.05% 0.1% 0.15% 0.2% 0.25% 0.3% 0.35% 0.4% 0.45% 0.5% 0.55% 0.6% 0.65% 0.7% 0.75% 0.8% 0.85% 0.9% 0.95% 1%' && stops.amount.join() === '12500,11200,0' && stops.old.join() === 'false,false,true,true,false', stops)
  // a tap on the fee's track puts the handle there
  await tapTrack(t, 'coop', 1, dev === 'phone')
  coop = await coopState(page)
  check(`${dev}: a tap on the fee's track (with no drag) puts the handle there: 1%`, coop.show === '1%', coop.show)
  await t.click('.ga [data-slider="coop"] [data-step="more"]')
  check(`${dev}: "+" stops at 1%`, (await coopState(page)).show === '1%' && (await page.$eval('.ga [data-slider="coop"] [data-step="more"]', (b) => b.disabled)))
  // the exact price again, and a home a buyer of the demo is looking for: the match screen shows the fee
  await setPrice(t, '2379000')
  for (let i = 0; i < 10; i++) await t.click('.ga [data-slider="coop"] [data-step="less"]')
  await t.click('.ga [data-parking="1"]')
  await page.evaluate(() => [...document.querySelectorAll('.ga [aria-label="תוספות"] .ga-pick')].find((b) => b.textContent.trim() === 'מעלית').click())
  await t.click('.ga-go')
  await page.waitForSelector('[data-match-screen]', { visible: true, timeout: 6000 }).catch(() => {})
  await wait(1500)
  const mm = await page.evaluate(() => ({ open: !!document.querySelector('[data-match-screen]'), mine: document.querySelector('.mm-meet-card.is-mine .coop-badge')?.textContent.replace(/\s+/g, ' ').trim() ?? null, price: document.querySelector('.mm-meet-card.is-mine strong')?.textContent.trim() }))
  check(`${dev}: the match screen shows my property with its "עמלת שת"פ 0.5%"`, mm.open && mm.mine === 'עמלת שת"פ 0.5%', mm)
  await t.shot(`${dev}-22-match-coop`)
  await page.$eval('[data-act="close-match"]', (b) => b.click()).catch(() => {})
  await wait(600)
  const exact = await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem('brokers-demo-state-v5') ?? '{}')
    const card = (s.crm ?? []).find((c) => c.price === 2379000)
    const post = card && (s.items ?? []).find((x) => x.sourceId === card.id)
    const tag = [...document.querySelectorAll('.kan-card')].find((c) => c.querySelector('h3')?.textContent.trim() === card?.title)?.querySelector('.coop-badge')?.textContent.replace(/\s+/g, ' ').trim()
    return { card: card ? { price: card.price, coop: card.coopPct } : null, post: post ? { price: post.property.price, coop: post.property.coopPct, split: post.property.split ?? null } : null, tag }
  })
  check(`${dev}: what is kept: the price exactly as typed and the fee, on the card and on the post (with no old "חלוקת עמלה")`, exact.card?.price === 2379000 && exact.card?.coop === 0.5 && exact.post?.price === 2379000 && exact.post?.coop === 0.5 && exact.post?.split === null, exact)
  check(`${dev}: the CRM card shows "עמלת שת"פ 0.5%"`, exact.tag === 'עמלת שת"פ 0.5%', exact.tag)
  await page.evaluate((p) => [...document.querySelectorAll('.kan-card')].find((c) => c.textContent.includes('2.38'))?.scrollIntoView({ block: 'center' }), 0)
  await wait(300)
  await t.shot(`${dev}-23-crm-coop`)

  // the WhatsApp confirmation of a property asks for the fee too
  await page.goto(green + '/app/community', { waitUntil: 'networkidle0' })
  await wait(700)
  await page.evaluate(async () => {
    const src = [...document.querySelectorAll('script[type="module"]')].map((s) => s.src).find((s) => /main-green/.test(s))
    const { greenUi } = await import(`${src.slice(0, src.indexOf('/src/'))}/src/green/ui.ts`)
    greenUi.open({ kind: 'whatsapp' })
  })
  await page.waitForSelector('.ga-samples', { visible: true, timeout: 8000 })
  await page.evaluate(() => [...document.querySelectorAll('.ga-samples .tl-alt')].find((b) => b.textContent.includes('נכס לדוגמה')).click())
  await wait(250)
  await t.click('.ga-go')
  await page.waitForSelector('.ga [data-f="coop"]', { visible: true, timeout: 8000 })
  const waPrice = await priceState(page)
  await page.evaluate(() => document.querySelector('.ga-actions .btn-gold').click())
  await wait(400)
  const waErr = await coopState(page)
  check(`${dev}: from a WhatsApp message: the price (2,650,000) is in the box, and the property is not published without "עמלת שת"פ"`, waPrice.shown === '2,650,000' && waPrice.value === '2650000' && waErr.err === 'בוחרים עמלת שת"פ לפני השמירה. אפשר גם 0%.' && !!(await page.$('.ga-actions')), { waPrice: waPrice.shown, err: waErr.err })
  await pickCoop(t, 1)
  await page.evaluate(() => document.querySelector('.ga-actions .btn-gold').click())
  await wait(1500)
  const waPost = await page.evaluate(() => {
    const id = new URLSearchParams(location.search).get('item')
    return { id, tag: document.getElementById(`ci-${id}`)?.querySelector('.coop-badge')?.textContent.replace(/\s+/g, ' ').trim() ?? null }
  })
  check(`${dev}: ... with it, it goes up with "עמלת שת"פ 0.55%"`, waPost.tag === 'עמלת שת"פ 0.55%', waPost)

  check(`${dev}: no errors, and nothing was asked of any address outside this computer (no server, nothing of Yad2)`, t.errors.length === 0 && t.outside.length === 0, { errors: t.errors.slice(0, 3), outside: [...new Set(t.outside)] })
  await t.ctx.close()

  // =================================================================== by day and by night: every word can be read
  for (const mode of ['day', 'night']) {
    const n = await fresh(vp, mode)
    await openCard(n)
    await n.click('.ga [data-cat="home"]')
    await wait(400)
    await n.click('.ga .pf-kind[data-kind="דירה"]')
    await pickPlace(n.page, 'street', 'הרצל', '.ga')
    await n.type('.ga [data-f="house"]', '12')
    await n.click('[data-toggle="house-no"]')
    await n.click('[data-toggle="as-story"]')
    await saveCard(n) // a story with no photo: the warning shows
    const at = await n.page.evaluate(() => document.documentElement.dataset.mode)
    const ratios = {}
    for (const [name, sel] of [
      ['the field\'s name', '.ga [data-f="category"] .field-label'],
      ['a group, not picked', '.ga .pf-group[aria-pressed="false"]'],
      ['a group, picked', '.ga .pf-group[aria-pressed="true"]'],
      ['a kind, not picked', '.ga .pf-kind[aria-pressed="false"]'],
      ['a kind, picked', '.ga .pf-kind[aria-pressed="true"]'],
      ['the question above the kinds', '.ga .pf-kinds-in > span'],
      ['a switch\'s name (on)', '.ga [data-toggle="house-no"] b'],
      ['a switch\'s line (on)', '.ga [data-toggle="house-no"] small'],
      ['the warning at the story switch', '.ga [data-warn="as-story"]'],
      ['"כך יראו": the address', '.ga [data-seen] b'],
      ['"כך יראו": its name', '.ga [data-seen] > span'],
      ['the line about what stays private', '.ga .ga-address .ga-private'],
      ['the line under the price box', '.ga [data-price-say]'],
      ['the price box itself', '.ga [data-f="price"]'],
      ['"עמלת שת"פ": its name', '.ga [data-f="coop"] .field-label'],
      ['"חובה"', '.ga [data-f="coop"] .pf-must'],
      ['the percent, not chosen', '.ga [data-coop-show]'],
      ['the line under the percent', '.ga [data-coop-line]'],
      ['the marks under the fee', '.ga [data-f="coop"] .ss-marks span'],
      ['"בוחרים עמלת שת"פ"', '.ga [data-err="coop"]'],
    ]) ratios[name] = await n.contrast(sel)
    const low = Object.entries(ratios).filter(([, r]) => r === null || r < 4.5)
    check(`${dev}, ${mode}: every word of the property form can be read (4.5 to 1 at least)`, at === mode && low.length === 0, { at, low, ratios })
    await n.page.$eval('.ga [data-f="category"]', (el) => el.scrollIntoView({ block: 'start' }))
    await wait(300)
    await n.shot(`${dev}-${mode}-form-kinds`)
    await n.page.$eval('.ga [data-f="address"]', (el) => el.scrollIntoView({ block: 'center' }))
    await wait(300)
    await n.shot(`${dev}-${mode}-form-address`)
    await n.page.$eval('[data-toggle="as-story"]', (el) => el.scrollIntoView({ block: 'center' }))
    await wait(300)
    await n.shot(`${dev}-${mode}-form-story-switch`)
    await n.page.$eval('.ga [data-f="coop"]', (el) => el.scrollIntoView({ block: 'center' }))
    await wait(300)
    await n.shot(`${dev}-${mode}-form-price-coop-empty`)
    // chosen: the big numbers and the red tag
    await setPrice(n, '2475000')
    await pickCoop(n)
    const r3 = {}
    for (const [name, sel] of [
      ['the price, written', '.ga [data-f="price"]'],
      ['the price in words', '.ga [data-price-say]'],
      ['the "₪" of the box', '.ga .pf-cur'],
      ['the percent, chosen', '.ga [data-coop-show]'],
      ['the shekels under it', '.ga [data-coop-line]'],
    ]) r3[name] = await n.contrast(sel)
    await n.page.$eval('.ga [data-f="price-field"]', (el) => el.scrollIntoView({ block: 'start' }))
    await wait(300)
    await n.shot(`${dev}-${mode}-form-price-coop`)
    await n.click('[data-toggle="as-story"]')
    await saveCard(n)
    await n.page.goto(green + '/app/community?topic=coop', { waitUntil: 'networkidle0' })
    await wait(800)
    await n.page.evaluate(() => document.querySelector('article .coop-badge')?.closest('article')?.scrollIntoView({ block: 'center' }))
    await wait(400)
    r3['the red tag'] = await n.contrast('article .coop-badge')
    const low3 = Object.entries(r3).filter(([, r]) => r === null || r < 4.5)
    check(`${dev}, ${mode}: the chosen price, the percent, its shekels and the red tag can be read`, low3.length === 0, { low3, r3 })
    await n.shot(`${dev}-${mode}-feed-coop-tag`)

    await toAll(n)
    await n.click('[data-act="new-story"]')
    await n.page.waitForSelector('[data-composer="story"]', { visible: true })
    await wait(450)
    await n.click('[data-act="publish"]')
    const r2 = {}
    for (const [name, sel] of [
      ['the story\'s line', '.composer-modal .pf-story-head'],
      ['"העלאת תמונה"', '.composer-modal .pf-upload'],
      ['the story switch\'s name', '.composer-modal [data-toggle="also-post"] b'],
      ['the story switch\'s line', '.composer-modal [data-toggle="also-post"] small'],
      ['"סטורי הוא תמונה"', '.composer-modal [data-err="story-photo"]'],
    ]) r2[name] = await n.contrast(sel)
    const low2 = Object.entries(r2).filter(([, r]) => r === null || r < 4.5)
    check(`${dev}, ${mode}: every word of the story window can be read`, low2.length === 0, { low2, r2 })
    await n.shot(`${dev}-${mode}-story-window`)
    check(`${dev}, ${mode}: no errors`, n.errors.length === 0, n.errors.slice(0, 2))
    await n.ctx.close()
  }
}

console.log(fails ? `\nSOME CHECKS FAILED (${fails} of ${total})` : `\nALL CHECKS PASSED (${total})`)
await Promise.race([browser.close().catch(() => {}), wait(4000)])
process.exit(fails ? 1 : 0)
