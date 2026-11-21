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
  await t.type('.ga [data-f="hood"]', 'נווה שאנן')
  await t.type('.ga [data-f="street"]', 'הרצל')
  await t.type('.ga [data-f="house"]', '12')
  await t.type('.ga [data-f="apt"]', '7')
  await t.click('.ga [data-rooms="5"]')
  await t.type('.ga [data-f="price"]', '4200000')

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
    fields: ['hood', 'street', 'house', 'apt'].map((f) => !!document.querySelector(`.ga [data-f="${f}"]`)),
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
  await saveCard(t)
  const TITLE = 'פנטהאוז 5 חדרים בחיפה'
  const card = await page.evaluate((title) => {
    const c = [...document.querySelectorAll('.kan-card')].find((x) => x.querySelector('h3')?.textContent.trim() === title)
    return c ? { tag: c.querySelector('.kan-top .tag')?.dataset.kind, cat: c.querySelector('.kan-top .tag')?.dataset.cat, exact: c.querySelector('[data-exact]')?.textContent.replace(/\s+/g, ' ').trim(), note: c.innerText.includes('ממ"ק') } : null
  }, TITLE)
  check(`${dev}: the CRM card: its tag is the kind, and the broker's own line has the full address with the flat`, card && card.tag === 'פנטהאוז' && card.cat === 'home' && card.exact === 'הרצל 12, דירה 7, נווה שאנן' && card.note, card)
  await t.shot(`${dev}-6-crm-card`)

  await page.goto(green + '/app/community?topic=coop', { waitUntil: 'networkidle0' })
  await wait(800)
  let post = await myPost(page, TITLE)
  check(`${dev}: in the feed: the city, the neighbourhood and the street; no building number, no flat`, post && post.place.includes('חיפה - נווה שאנן, רחוב הרצל') && post.street === ', רחוב הרצל' && !/הרצל\s*12/.test(post.text) && !post.text.includes('דירה 7'), post)
  check(`${dev}: the post carries its kind, and "ממ"ק" among what the property has`, post && post.kind === 'פנטהאוז' && post.extras.includes('ממ"ק') && post.extras.includes('ממ"ד'), post)
  await page.evaluate((id) => document.getElementById(`ci-${id}`)?.scrollIntoView({ block: 'center' }), post?.id)
  await wait(400)
  await t.shot(`${dev}-7-post-in-feed`)
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
  await t.shot(`${dev}-8-property-page`)

  // a commercial one, with the building's number shown
  await openCard(t)
  await t.click('.ga [data-cat="business"]')
  await wait(400)
  await t.click('.ga .pf-kind[data-kind="משרד"]')
  if (!(await page.$('.ga [data-city="חיפה"]'))) await t.click('.ga [data-act="more-cities"]')
  await t.click('.ga [data-city="חיפה"]')
  await t.type('.ga [data-f="hood"]', 'הדר')
  await t.type('.ga [data-f="street"]', 'שדרות הנשיא')
  await t.type('.ga [data-f="house"]', '40')
  await t.type('.ga [data-f="apt"]', '3')
  await t.type('.ga [data-f="sqm"]', '120')
  await t.type('.ga [data-f="price"]', '1900000')
  await t.click('[data-toggle="house-no"]')
  const seen2 = await page.evaluate(() => document.querySelector('[data-seen] b').textContent.trim())
  check(`${dev}: a street that already says what it is ("שדרות...") is not called "רחוב" again`, seen2 === 'חיפה - הדר, שדרות הנשיא 40', seen2)
  await saveCard(t)
  const OFFICE = 'משרד 120 מ"ר בחיפה'
  await page.goto(green + '/app/community?topic=coop', { waitUntil: 'networkidle0' })
  await wait(800)
  const office = await myPost(page, OFFICE)
  check(`${dev}: with the switch on, the feed shows the building's number too, and still not the flat`, office && office.street === ', שדרות הנשיא 40' && office.kind === 'משרד' && !office.text.includes('דירה 3'), office)

  // ---------------------------------------------------------------- 4. the same list in the community's filter
  const filter = await page.evaluate(() => {
    const s = document.querySelector('[data-filter="kind"]')
    return s ? { groups: [...s.querySelectorAll('optgroup')].map((g) => ({ label: g.label, kinds: [...g.querySelectorAll('option')].slice(1).map((o) => o.textContent.trim()) })), first: s.options[0].textContent } : null
  })
  check(`${dev}: the community's filter has "סוג נכס" with the same two lists`, filter && filter.groups.length === 2 && filter.groups[0].label === 'מגורים' && filter.groups[0].kinds.join('|') === HOME.join('|') && filter.groups[1].label === 'מסחרי' && filter.groups[1].kinds.join('|') === BIZ.join('|'), filter)
  const kindsShown = () => page.evaluate(() => ({ kinds: [...document.querySelectorAll('article .fb-kind')].map((k) => k.dataset.kind), titles: [...document.querySelectorAll('article h3')].map((h) => h.textContent.trim()), count: Number(document.querySelector('[data-count]')?.textContent) }))
  const all = await kindsShown()
  check(`${dev}: every property in the feed has a kind of the list (older words were read as the closest one), none was lost`, all.kinds.length >= 13 && all.kinds.every((k) => HOME.includes(k) || BIZ.includes(k)), all.kinds)
  await page.select('[data-filter="kind"]', 'home|פנטהאוז')
  await wait(500)
  let f = await kindsShown()
  check(`${dev}: the filter by one kind: only penthouses, mine among them`, f.kinds.length >= 1 && f.kinds.every((k) => k === 'פנטהאוז') && f.titles.includes(TITLE) && f.count === f.kinds.length, f)
  await t.shot(`${dev}-9-filter-kind`)
  await page.select('[data-filter="kind"]', 'business|')
  await wait(500)
  f = await kindsShown()
  check(`${dev}: the filter by the whole group "מסחרי": commercial kinds only, my office among them`, f.kinds.length >= 1 && f.kinds.every((k) => BIZ.includes(k)) && f.titles.includes(OFFICE) && !f.titles.includes(TITLE), f)
  await page.select('[data-filter="kind"]', 'business|חנות')
  await wait(500)
  f = await kindsShown()
  check(`${dev}: a kind nobody posted shows nothing, and says so with a count of 0`, f.kinds.length === 0 && f.count === 0, f)
  await page.select('[data-filter="kind"]', '')
  await wait(400)

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
  await t.type('.ga [data-f="price"]', '3100000')
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

  check(`${dev}: no errors, and nothing was asked of any address outside this computer (no server, nothing of Yad2)`, t.errors.length === 0 && t.outside.length === 0, { errors: t.errors.slice(0, 3), outside: [...new Set(t.outside)] })
  await t.ctx.close()

  // =================================================================== by day and by night: every word can be read
  for (const mode of ['day', 'night']) {
    const n = await fresh(vp, mode)
    await openCard(n)
    await n.click('.ga [data-cat="home"]')
    await wait(400)
    await n.click('.ga .pf-kind[data-kind="דירה"]')
    await n.type('.ga [data-f="street"]', 'הרצל')
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
