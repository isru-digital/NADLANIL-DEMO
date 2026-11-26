// Round 12, from Ofek's and Ariel's notes (26.11.2026), on a computer and on a phone, by day and by night:
// 1. the button on a "נכסים לשיתוף פעולה" post says "יש לי קונה", and does what it did;
// 2. the buyers' tab has no quick price buttons: the slider and the two boxes stay (the properties' tab keeps them);
// 3. a place is picked in one order: city, neighbourhood, street. The neighbourhood is locked until a city is picked
//    ("קודם בוחרים עיר"), shows the neighbourhoods of the picked city only, and groups them by city when there are
//    several: in the property form, the buyer form, the feed's filter and the sign-up page;
// 4. the "שיתוף עם הקהילה" window says where the post goes and what is not shown, shows the post as the feed will,
//    and its text field says it is text of the post.
// Usage: node scripts/round-12-check.mjs [outDir]     (BASE_GREEN overrides the address)
import puppeteer from 'puppeteer-core'
import { mkdirSync } from 'node:fs'

const green = process.env.BASE_GREEN ?? 'http://localhost:5240/NADLANIL-DEMO/green'
const out = process.argv[2] ?? '_shots/round-12'
mkdirSync(out, { recursive: true })
const browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--hide-scrollbars'] })
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
const results = []
const check = (name, ok, detail = '') => {
  const line = `${ok ? 'PASS' : 'FAIL'}  ${name}${ok || !detail ? '' : '  [' + (typeof detail === 'string' ? detail : JSON.stringify(detail)) + ']'}`
  results.push(line)
  if (!ok) console.error(line)
}
const PREVIEW = '6d5eaaca072bf02f647051d8688d1337a4ab7a6cb92a2a8b3924cf91fda89e8b'
const BANDS = ['עד 2 מיליון', '2 עד 4 מיליון', '4 עד 7 מיליון', '7 מיליון ומעלה']

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
      await wait(700)
    }
    const overflow = () => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
    /** what a place picker shows now */
    const picker = (id) =>
      page.evaluate((id) => {
        const p = document.querySelector(`[data-places="${id}"]`)
        if (!p) return null
        const rows = [...p.querySelectorAll('[data-list] [data-pick]')]
        return {
          lock: !!p.querySelector('[data-lock]'),
          msg: p.querySelector('[data-msg="city-first"]')?.textContent.trim() ?? null,
          search: p.querySelector('.pl-search input')?.dataset.f ?? null,
          kinds: [...p.querySelectorAll('.pl-kinds [data-kind]')].map((b) => `${b.dataset.kind}:${b.getAttribute('aria-checked')}`),
          groups: [...p.querySelectorAll('[data-list] [data-group]')].map((g) => g.dataset.group),
          of: rows.map((r) => r.dataset.of ?? ''),
          names: rows.map((r) => r.dataset.pick),
          chips: [...p.querySelectorAll('.pl-chip')].map((c) => `${c.dataset.chip}:${c.dataset.name}`),
          sticky: [...p.querySelectorAll('[data-list] [data-group]')].map((g) => getComputedStyle(g).position).join(),
          hoods: p.dataset.hoodValue,
        }
      }, id)

    /** the city names of a grouped list: no name of a neighbourhood over a city's name, at any scroll of the list */
    const cleanGroups = (id) =>
      page.evaluate(async (id) => {
        const list = document.querySelector(`[data-places="${id}"] [data-list]`)
        const max = list.scrollHeight - list.clientHeight
        const bad = []
        let seen = 0
        for (const top of [0, 20, 44, 90, Math.round(max / 2), max]) {
          list.scrollTop = top
          await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))
          const box = list.getBoundingClientRect()
          const rows = [...list.querySelectorAll('[data-pick]')].map((r) => ({ n: r.dataset.pick, r: r.getBoundingClientRect() }))
          for (const g of list.querySelectorAll('[data-group]')) {
            const a = g.getBoundingClientRect()
            if (a.bottom <= box.top || a.top >= box.bottom) continue
            seen++
            if (getComputedStyle(g).position !== 'static') bad.push(`${g.dataset.group}: ${getComputedStyle(g).position}`)
            if (a.height < 30) bad.push(`${g.dataset.group}: ${Math.round(a.height)}px high`)
            for (const row of rows) if (row.r.top < a.bottom - 0.5 && row.r.bottom > a.top + 0.5) bad.push(`${row.n} over ${g.dataset.group} at ${top}`)
          }
        }
        list.scrollTop = 0
        return { ok: bad.length === 0 && seen > 0, seen, bad: bad.slice(0, 4) }
      }, id)

    // ================================================================ 1. "יש לי קונה"
    await go('/app/community?topic=coop', 1900)
    let st = await page.evaluate(() => {
      const all = [...document.querySelectorAll('.ci-cta')]
      return { n: all.length, texts: [...new Set(all.map((b) => b.textContent.trim()))], old: document.body.textContent.includes('אני רוצה לשתף פעולה') }
    })
    check(`${tag}: 1. the button on a property post says "יש לי קונה"`, st.n > 0 && st.texts.join() === 'יש לי קונה' && !st.old, st)
    await shot('1-button', '.ci-cta')
    await click('.ci-cta')
    await wait(500)
    st = await page.evaluate(() => ({ sent: document.querySelector('.ci-cta.is-sent')?.textContent.trim() ?? null, pressed: document.querySelector('.ci-cta.is-sent')?.getAttribute('aria-pressed'), toast: document.body.textContent.includes('הפנייה נשלחה אל') }))
    check(`${tag}: 1. it does what it did: the approach is sent, and the button says so`, st.sent === 'הפנייה נשלחה' && st.pressed === 'true' && st.toast, st)
    await click('.ci-cta.is-sent')
    await wait(300)
    check(`${tag}: 1. a second press takes it back, and the button says "יש לי קונה" again`, await page.evaluate(() => !document.querySelector('.ci-cta.is-sent') && document.querySelector('.ci-cta').textContent.trim() === 'יש לי קונה'))

    // ================================================================ 2. no quick price buttons for buyers
    const bandsHere = () => page.evaluate(() => ({ bands: [...document.querySelectorAll('.flt-bands button')].map((b) => b.textContent.trim()), slider: !!document.querySelector('[data-filter="price"] input[type="range"], [data-filter="price"] [role="slider"]'), min: !!document.querySelector('[data-f="price-min"]'), max: !!document.querySelector('[data-f="price-max"]'), words: document.querySelector('[data-filters]')?.textContent ?? '' }))
    st = await bandsHere()
    check(`${tag}: 2. the properties' tab keeps its quick ranges`, st.bands.join() === BANDS.join() && st.slider && st.min && st.max, st.bands)
    await go('/app/community?topic=seeking', 1900)
    st = await bandsHere()
    check(`${tag}: 2. the buyers' tab has no quick price buttons`, st.bands.length === 0 && BANDS.every((b) => !st.words.includes(b)), st.bands)
    check(`${tag}: 2. the slider and the two boxes "החל מ" and "עד" are there`, st.slider && st.min && st.max && st.words.includes('החל מ') && st.words.includes('עד'))
    await click('[data-deal="rent"]')
    st = await bandsHere()
    check(`${tag}: 2. none for a rent either`, st.bands.length === 0 && st.slider && st.min && st.max, st.bands)
    await click('[data-deal="all"]')
    // the two boxes still filter
    const before = await page.evaluate(() => Number(document.querySelector('[data-count]').textContent))
    await type('[data-f="price-max"]', '1000000')
    await wait(900)
    const after = await page.evaluate(() => ({ n: Number(document.querySelector('[data-count]').textContent), v: document.querySelector('[data-f="price-max"]').value }))
    check(`${tag}: 2. "עד" still filters the buyers (${before} to ${after.n})`, after.v === '1,000,000' && after.n <= before, after)
    await shot('2-buyers-filter', '[data-filter="price"]')
    await page.evaluate(() => [...document.querySelectorAll('.flt-foot button')].find((b) => b.textContent.includes('ניקוי'))?.click())
    await wait(400)

    // ================================================================ 3a. the feed's filter: city, then neighbourhood
    for (const topic of ['seeking', 'coop']) {
      await go(`/app/community?topic=${topic}`, 1900)
      st = await page.evaluate(() => {
        const f = document.querySelector('[data-filters]')
        const els = [...f.querySelectorAll('[data-filter="city"], [data-filter="hood-locked"], [data-filter="hood"]')].map((e) => e.dataset.filter)
        return { els, msg: !!f.querySelector('[data-msg]') }
      })
      check(`${tag}: 3. filter (${topic}): the city comes first, and "שכונה" after it is locked`, st.els.join() === 'city,hood-locked' && !st.msg, st)
      await click('[data-filter="hood-locked"]')
      st = await page.evaluate(() => ({ msg: document.querySelector('[data-filters] [data-msg="city-first"]')?.textContent.trim() ?? null, role: document.querySelector('[data-filters] [data-msg="city-first"]')?.getAttribute('role') }))
      check(`${tag}: 3. filter (${topic}): a tap on it says "קודם בוחרים עיר"`, st.msg === 'קודם בוחרים עיר' && st.role === 'status', st)
      if (topic === 'seeking') await shot('3-filter-locked', '[data-filter="hood-locked"]')
      // every city: its own neighbourhoods only
      const cities = await page.evaluate(() => [...document.querySelectorAll('[data-filter="city"] option')].map((o) => o.value).filter(Boolean))
      const seen = {}
      for (const c of cities) {
        await page.select('[data-filter="city"]', c)
        await wait(200)
        seen[c] = await page.evaluate(() => [...document.querySelectorAll('[data-filter="hood"] option')].map((o) => ({ v: o.value, t: o.textContent })))
      }
      const withHoods = cities.filter((c) => seen[c].length > 1)
      check(`${tag}: 3. filter (${topic}): with a city picked the field opens, with that city's neighbourhoods only`, withHoods.length > 0 && cities.every((c) => seen[c].length >= 1 && seen[c][0].t === 'כל השכונות' && seen[c].slice(1).every((o) => o.v.startsWith(c + '|') && !o.t.includes(','))), Object.fromEntries(cities.map((c) => [c, seen[c].length])))
      const c0 = withHoods[0]
      await page.select('[data-filter="city"]', c0)
      await wait(200)
      await page.select('[data-filter="hood"]', seen[c0][1].v)
      await wait(700)
      const picked = await page.evaluate(() => ({ hood: document.querySelector('[data-filter="hood"]').value, n: Number(document.querySelector('[data-count]').textContent), msg: !!document.querySelector('[data-filters] [data-msg]') }))
      check(`${tag}: 3. filter (${topic}): a neighbourhood of ${c0} filters the list`, picked.hood === seen[c0][1].v && picked.n >= 1 && !picked.msg, picked)
      if (topic === 'seeking') await shot('3-filter-open', '[data-filter="hood"]')
      await page.select('[data-filter="city"]', '')
      await wait(500)
      st = await page.evaluate(() => ({ locked: !!document.querySelector('[data-filter="hood-locked"]'), open: !!document.querySelector('[data-filter="hood"]') }))
      check(`${tag}: 3. filter (${topic}): "כל הערים" locks the neighbourhood again and lets go of the one picked`, st.locked && !st.open, st)
    }
    check(`${tag}: 3. nothing scrolls sideways in the feed`, (await overflow()) <= 1)

    // ================================================================ 3b. the property form
    await go('/app/crm?v=properties', 1200)
    await click('[data-act="new-card"]')
    await page.waitForSelector('.ga-fields', { visible: true })
    await wait(400)
    if (!(await page.$('.ga [data-city="תל אביב"]'))) await click('.ga [data-act="more-cities"]')
    await click('.ga [data-city="תל אביב"]')
    await click('.ga [data-cat="home"]')
    await click('.ga .pf-kind[data-kind="דירה"]')
    await wait(500)
    let p = await picker('property')
    const cityFirst = await page.evaluate(() => {
      const city = document.querySelector('.ga [data-f="city"]')
      const place = document.querySelector('[data-places="property"]')
      return !!(city.compareDocumentPosition(place) & Node.DOCUMENT_POSITION_FOLLOWING)
    })
    check(`${tag}: 3. property form: city, then "שכונה", then "רחוב"; the neighbourhood is the open one`, cityFirst && p.kinds.join() === 'hood:true,street:false' && p.search === 'hood-search' && !p.lock, p)
    await type('[data-places="property"] [data-f="hood-search"]', 'נווה')
    p = await picker('property')
    check(`${tag}: 3. property form: the list is the neighbourhoods of the city picked (${p.names.length}), with no city headings for one city`, p.names.length > 1 && p.groups.length === 0 && p.names.every((n) => n.includes('נוה') || n.includes('נווה')), p.names.slice(0, 6))
    await shot('3-property-form', '[data-places="property"]')
    const hood = p.names[0]
    await click(`[data-places="property"] [data-pick="${hood}"]`)
    await click('[data-places="property"] [data-kind="street"]')
    await type('[data-places="property"] [data-f="street-search"]', 'דיזנגוף')
    await click('[data-places="property"] [data-pick="דיזנגוף"]')
    p = await picker('property')
    check(`${tag}: 3. property form: the chips are in the same order, neighbourhood then street`, p.chips.join() === `hood:${hood},street:דיזנגוף`, p.chips)
    const seenAs = await page.evaluate(() => document.querySelector('[data-seen] b')?.textContent ?? '')
    check(`${tag}: 3. property form: what the community sees is city, neighbourhood, street`, seenAs.indexOf('תל אביב') === 0 && seenAs.indexOf(hood) > 0 && seenAs.indexOf('דיזנגוף') > seenAs.indexOf(hood), seenAs)
    // another city: what was picked for the first one goes
    if (!(await page.$('.ga [data-city="רמת גן"]'))) await click('.ga [data-act="more-cities"]')
    await click('.ga [data-city="רמת גן"]')
    await wait(400)
    p = await picker('property')
    check(`${tag}: 3. property form: another city empties the neighbourhood and the street of the first`, p.chips.length === 0, p.chips)

    // ================================================================ 3c. the buyer form
    await go('/app/community?topic=seeking', 1500)
    await click('[data-act="add-buyer"]')
    await page.waitForSelector('.nc [data-places="buyer"]', { visible: true })
    await wait(400)
    p = await picker('buyer')
    const order = await page.evaluate(() => {
      const a = document.querySelector('.nc [data-f="cities"]')
      const b = document.querySelector('.nc [data-f="hoods"]')
      return !!(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING)
    })
    check(`${tag}: 3. buyer form: the cities come first, and the neighbourhood under them is locked`, order && p.lock && !p.search && p.msg === null, p)
    await click('[data-places="buyer"] [data-lock]')
    p = await picker('buyer')
    check(`${tag}: 3. buyer form: a tap on the locked field says "קודם בוחרים עיר"`, p.msg === 'קודם בוחרים עיר' && p.lock, p)
    await shot('3-buyer-locked', '[data-places="buyer"]')
    await click('.nc [data-city="תל אביב"]')
    await wait(500)
    p = await picker('buyer')
    check(`${tag}: 3. buyer form: a city opens it: "שכונה" first and open, "רחוב" second, and the note is gone`, !p.lock && p.msg === null && p.kinds.join() === 'hood:true,street:false' && p.search === 'hood-search', p)
    await type('[data-places="buyer"] [data-f="hood-search"]', 'רמת')
    p = await picker('buyer')
    check(`${tag}: 3. buyer form: one city, its neighbourhoods only, no headings`, p.names.length > 0 && p.groups.length === 0 && p.of.every((x) => x === ''), p.names.slice(0, 5))
    await click('.nc [data-city="רמת גן"]')
    await wait(700)
    await type('[data-places="buyer"] [data-f="hood-search"]', 'רמת')
    p = await picker('buyer')
    const runs = p.of.filter((c, i) => c !== p.of[i - 1])
    check(`${tag}: 3. buyer form: two cities: the neighbourhoods are grouped, each city under its name`, p.groups.join() === 'תל אביב,רמת גן' && runs.join() === 'תל אביב,רמת גן' && p.of.length > 2, { groups: p.groups, runs, n: p.of.length })
    check(`${tag}: 3. buyer form: every city's name is a clean line of its own, wherever the list is scrolled`, (await cleanGroups('buyer')).ok, await cleanGroups('buyer'))
    await shot('3-buyer-grouped', '[data-places="buyer"] [data-list]')
    const tlv = p.names[p.of.indexOf('תל אביב')]
    const rg = p.names[p.of.indexOf('רמת גן')]
    await click(`[data-places="buyer"] [data-of="תל אביב"][data-pick="${tlv}"]`)
    await click(`[data-places="buyer"] [data-of="רמת גן"][data-pick="${rg}"]`)
    p = await picker('buyer')
    check(`${tag}: 3. buyer form: one neighbourhood of each city is picked`, p.chips.join() === `hood:${tlv},hood:${rg}`, p.chips)
    check(`${tag}: 3. nothing scrolls sideways in the buyer form`, (await overflow()) <= 1)

    // ================================================================ 3d. the sign-up page
    await go('/kehila/join', 1500)
    st = await page.evaluate(() => {
      const f = document.querySelector('[data-f="areas"]')
      const cities = document.querySelector('.au-cities')
      return { open: f?.dataset.open, after: !!(cities.compareDocumentPosition(f) & Node.DOCUMENT_POSITION_FOLLOWING), label: f?.querySelector(':scope > span')?.textContent.replace(/\s+/g, ' ').trim(), free: !!f?.querySelector(':scope > input') }
    })
    p = await picker('signup')
    check(`${tag}: 3. sign-up: "שכונות ואזורים" comes after the cities and is closed until a city is ticked`, st.open === 'false' && st.after && st.label?.startsWith('שכונות ואזורים') && !st.free && p.lock && !p.search, { st, p })
    await click('[data-places="signup"] [data-lock]')
    p = await picker('signup')
    check(`${tag}: 3. sign-up: a tap on it says "קודם בוחרים עיר"`, p.msg === 'קודם בוחרים עיר', p)
    await shot('3-signup-locked', '[data-f="areas"]')
    await click('.au-cities [data-city="תל אביב"]')
    await wait(600)
    p = await picker('signup')
    check(`${tag}: 3. sign-up: ticking a city opens it, for neighbourhoods only`, !p.lock && p.search === 'hood-search' && p.kinds.length === 0 && p.msg === null, p)
    await type('[data-places="signup"] [data-f="hood-search"]', 'פלורנטין')
    p = await picker('signup')
    check(`${tag}: 3. sign-up: the neighbourhoods of the ticked city are offered`, p.names.includes('פלורנטין') && p.groups.length === 0, p.names)
    await click('[data-places="signup"] [data-pick="פלורנטין"]')
    await click('.au-cities [data-city="רמת גן"]')
    await wait(700)
    await type('[data-places="signup"] [data-f="hood-search"]', 'רמת')
    p = await picker('signup')
    check(`${tag}: 3. sign-up: two cities ticked: the neighbourhoods are grouped by city`, p.groups.join() === 'תל אביב,רמת גן' && p.of.filter((c, i) => c !== p.of[i - 1]).join() === 'תל אביב,רמת גן', p.groups)
    const clean = await cleanGroups('signup')
    check(`${tag}: 3. sign-up: every city's name is a clean line of its own, wherever the list is scrolled`, clean.ok, clean)
    await shot('3-signup-grouped', '[data-places="signup"] [data-list]')
    const rg2 = p.names[p.of.indexOf('רמת גן')]
    await click(`[data-places="signup"] [data-of="רמת גן"][data-pick="${rg2}"]`)
    // Enter in the search box must not send the form
    await page.focus('[data-places="signup"] [data-f="hood-search"]')
    await page.keyboard.press('Enter')
    await wait(400)
    st = await page.evaluate(() => ({ areas: document.querySelector('[data-f="areas"]').dataset.areas, errs: document.querySelectorAll('.au-err').length, sent: !!document.querySelector('[data-state="waiting"]') }))
    check(`${tag}: 3. sign-up: what was picked is what the request will carry, and Enter in the box sends nothing`, st.areas === `פלורנטין, ${rg2}` && st.errs === 0 && !st.sent, st)
    await shot('3-signup-open', '[data-f="areas"]')
    check(`${tag}: 3. nothing scrolls sideways in the sign-up page`, (await overflow()) <= 1)

    // ================================================================ 4. the share window
    await go('/app/community?topic=seeking', 1900)
    const posts = await page.evaluate(() => document.querySelectorAll('.fb.ci').length)
    const src = await page.evaluate(() => {
      const el = [...document.querySelectorAll('.fb.ci')].find((x) => x.querySelector('[data-act="share"]'))
      el.querySelector('[data-act="share"]').click()
      return { title: el.querySelector('h3, .fb-title')?.textContent.trim() ?? '' }
    })
    await page.waitForSelector('.modal [data-share]', { timeout: 8000 })
    await wait(600)
    const modal = () =>
      page.evaluate(() => {
        const m = document.querySelector('.modal')
        const pv = m.querySelector('[data-preview] .ci')
        const r = m.getBoundingClientRect()
        return {
          title: m.textContent.includes('שיתוף עם הקהילה'),
          where: m.querySelector('[data-where]')?.textContent.replace(/\s+/g, ' ').trim(),
          label: m.querySelector('[data-f="share-words"]')?.closest('label')?.querySelector('.field-label')?.textContent.trim(),
          hint: m.querySelector('.ga-words-hint')?.textContent.trim() ?? '',
          old: m.textContent.includes('רוצים להוסיף'),
          pvLabel: m.querySelector('[data-preview] .field-label')?.textContent.trim(),
          pv: pv ? pv.textContent.replace(/\s+/g, ' ') : null,
          pvActions: pv ? pv.querySelectorAll('[data-act="share"], .ci-cta').length : -1,
          fits: r.left >= -1 && r.right <= innerWidth + 1,
          go: [...m.querySelectorAll('.ga-go')].some((b) => b.textContent.includes('שיתוף בקהילה')),
        }
      })
    let m = await modal()
    check(`${tag}: 4. the window says where the post goes and what is not shown`, m.title && m.where === 'הפוסט יתפרסם בקהילה, בלשונית קונים. שם הלקוח והטלפון שלו לא יוצגו.', m.where)
    check(`${tag}: 4. the text field says it is text of the post`, m.label === 'טקסט שיופיע בפוסט (לא חובה)' && m.hint.includes('מופיע בתחילת הפוסט') && !m.old, { label: m.label, hint: m.hint })
    check(`${tag}: 4. a small preview of the post, as the feed will show it, in the broker's own name`, m.pvLabel === 'כך הפוסט ייראה בפיד' && !!m.pv && m.pv.includes('מאיה לנדאו') && m.pv.includes('שיתוף של פוסט מאת') && m.pvActions === 0 && m.fits && m.go, { pv: m.pv?.slice(0, 140), a: m.pvActions })
    await type('.modal [data-f="share-words"]', 'קונה רציני מאוד')
    m = await modal()
    check(`${tag}: 4. what is written shows in the preview at once, at the start of the post`, m.pv.includes('קונה רציני מאוד (שיתוף של פוסט מאת'), m.pv?.slice(0, 200))
    await page.evaluate(() => document.querySelector('.modal [data-where]').scrollIntoView({ block: 'start' }))
    await shot('4-share-window')
    await page.evaluate(() => document.querySelector('.modal [data-preview]').scrollIntoView({ block: 'center' }))
    await shot('4-share-preview')
    const previewText = await page.evaluate(() => document.querySelector('.modal [data-preview] .fb-text, .modal [data-preview] .ci-body, .modal [data-preview] p')?.textContent.replace(/\s+/g, ' ').trim() ?? '')
    await page.evaluate(() => [...document.querySelectorAll('.modal .ga-go')].find((b) => b.textContent.includes('שיתוף בקהילה')).click())
    await wait(1600)
    st = await page.evaluate(() => ({ n: document.querySelectorAll('.fb.ci').length, first: document.querySelector('.fb.ci')?.textContent.replace(/\s+/g, ' ') ?? '', modal: !!document.querySelector('.modal [data-share]'), tab: new URLSearchParams(location.search).get('topic') }))
    check(`${tag}: 4. the post goes up in the buyers' tab, as the preview showed it`, st.n === posts + 1 && !st.modal && st.tab === 'seeking' && st.first.includes('מאיה לנדאו') && st.first.includes('קונה רציני מאוד (שיתוף של פוסט מאת') && (!previewText || st.first.includes(previewText.slice(0, 40))), { n: st.n, posts, first: st.first.slice(0, 160), src })
    // a property post: the same window names the properties' tab
    await go('/app/community?topic=coop', 1900)
    await page.evaluate(() => [...document.querySelectorAll('.fb.ci')].find((x) => x.querySelector('[data-act="share"]')).querySelector('[data-act="share"]').click())
    await page.waitForSelector('.modal [data-share]', { timeout: 8000 })
    await wait(500)
    m = await modal()
    check(`${tag}: 4. sharing a property post names the properties' tab`, m.where === 'הפוסט יתפרסם בקהילה, בלשונית נכסים. שמות וטלפונים של לקוחות לא יוצגו.' && !!m.pv && m.fits, m.where)
    check(`${tag}: 4. nothing scrolls sideways with the window open`, (await overflow()) <= 1)

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
