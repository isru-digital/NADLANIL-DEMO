// The three bugs Ofek and Ariel found (26.11.2026), on a computer and on a phone:
// 1. the "אין עדיין התאמה" window came up on every entry. Now it comes once for a property or a buyer, never again
//    after "הבנתי" or X, not after a refresh and not after going out and in again; a real match is shown once for each
//    match. The cause is checked too: photos that filled the browser's storage (the post was never saved, so it was
//    published again on every entry). A photo is now kept once.
// 2. the search in the CRM: the clients' table by name, phone, city and neighbourhood, as one types, together with
//    the types; the properties' board by title, city, neighbourhood and street; and a friendly "לא נמצאו לקוחות" with
//    "ניקוי חיפוש".
// 3. a client with no phone in "שליחה ללקוח בוואטסאפ": grey, cannot be picked, a small "חסר טלפון", and "הוסף טלפון"
//    that keeps the number on the client's card; the same on the client's own window.
// Usage: node scripts/bugs-11-check.mjs [outDir]     (BASE_GREEN overrides the address)
import puppeteer from 'puppeteer-core'
import { mkdirSync } from 'node:fs'

const green = process.env.BASE_GREEN ?? 'http://localhost:5240/NADLANIL-DEMO/green'
const out = process.argv[2] ?? '_shots/bugs-11'
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
const STATE = 'brokers-demo-state-v5'
const NAME = 'אריאל בדיקה'
const PHONE = '050-555-0177'

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
    await page.evaluateOnNewDocument(() => {
      window.__opened = []
      window.open = (u) => (window.__opened.push(String(u)), null)
    })
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
    const shot = async (name) => {
      await wait(350)
      await page.screenshot({ path: `${out}/${d}-${mode}-${name}.png` })
    }
    const type = async (sel, text) => {
      await page.$eval(sel, (el) => (el.focus(), el.select?.()))
      await page.keyboard.press('Backspace')
      await page.keyboard.type(text)
      await wait(350)
    }
    /** the match window that is up now: its headline, or null */
    const windowUp = () => page.evaluate(() => document.querySelector('[data-match-screen]')?.getAttribute('aria-label') ?? null)
    const enter = async (path = '/app') => {
      await page.goto(green + path, { waitUntil: 'load' })
      await wait(3200)
      return windowUp()
    }

    // ================================================================ 1. the match window, once
    if (mode === 'day') {
      check(`${tag}: 1. a plain entry opens no match window`, (await enter()) === null)
      check(`${tag}: 1. and a second entry opens none either`, (await enter()) === null)

      // a property of the broker's own, in a town nobody is looking in: it goes up, and there is no match
      await page.evaluate((key) => {
        const s = JSON.parse(localStorage.getItem(key))
        const base = s.crm.find((x) => x.kind === 'property')
        s.crm.unshift({ ...base, id: 'own-none', title: 'דירת בדיקה בקרית שמונה', city: 'קרית שמונה', area: 'קרית שמונה', neighborhood: undefined, street: undefined, image: undefined, images: undefined })
        localStorage.setItem(key, JSON.stringify(s))
      }, STATE)
      const first = await enter()
      check(`${tag}: 1. a new property with no match: "אין עדיין התאמה" comes up`, first === 'אין עדיין התאמה', first)
      await shot('1-no-match-window')
      await page.evaluate(() => document.querySelector('[data-act="ok-none"]').click())
      await wait(600)
      check(`${tag}: 1. "הבנתי" closes it`, (await windowUp()) === null)
      check(`${tag}: 1. after a refresh it does not come back`, (await enter()) === null)
      await page.goto(green + '/', { waitUntil: 'load' })
      await wait(500)
      check(`${tag}: 1. after going out to the site and in again it does not come back`, (await enter()) === null)
      const tab = await ctx.newPage()
      await tab.setViewport(dev.vp)
      await tab.goto(green + '/app', { waitUntil: 'load' })
      await wait(3200)
      check(`${tag}: 1. in a new tab of the same browser it does not come back`, (await tab.evaluate(() => document.querySelector('[data-match-screen]')?.getAttribute('aria-label') ?? null)) === null)
      await tab.close()
      // the same property going up again (as it did when the storage was full) does not bring the window back
      await page.evaluate((key) => {
        const s = JSON.parse(localStorage.getItem(key))
        delete s.publishedIds['own-none']
        s.items = s.items.filter((i) => i.sourceId !== 'own-none')
        localStorage.setItem(key, JSON.stringify(s))
      }, STATE)
      check(`${tag}: 1. the same property published again: the window stays closed`, (await enter()) === null)

      // the cause: photos that fill the storage. Three photos of 1.4 MB each on one property, written the way the
      // site keeps them now (the first photo once). With the photo of the post as well, as it was kept before, the
      // storage was over its limit and the post was never saved
      await page.evaluate((key) => {
        const s = JSON.parse(localStorage.getItem(key))
        const base = s.crm.find((x) => x.kind === 'property')
        const photo = (n) => 'data:image/jpeg;base64,' + String(n).repeat(1400000)
        s.crm.unshift({ ...base, id: 'own-big', title: 'דירה עם תמונות כבדות במטולה', city: 'מטולה', area: 'מטולה', neighborhood: undefined, street: undefined, image: '@first-photo', images: [photo(1), photo(2), photo(3)] })
        localStorage.setItem(key, JSON.stringify(s))
      }, STATE)
      const big = await enter()
      check(`${tag}: 1. a property with heavy photos: the window comes up once`, big === 'אין עדיין התאמה', big)
      await page.evaluate(() => document.querySelector('[data-act="close-match"]').click())
      await wait(600)
      const kept = await page.evaluate((key) => {
        const raw = localStorage.getItem(key)
        const s = JSON.parse(raw)
        return { published: !!s.publishedIds['own-big'], post: s.items.some((i) => i.sourceId === 'own-big'), size: raw.length }
      }, STATE)
      check(`${tag}: 1. its post is saved now (a photo is kept once, the storage is not full)`, kept.published && kept.post && kept.size < 4_400_000, kept)
      check(`${tag}: 1. X closed it, and after a refresh it does not come back`, (await enter()) === null)
      check(`${tag}: 1. nor after one more entry`, (await enter()) === null)
      await page.goto(green + '/app/crm?v=properties', { waitUntil: 'load' })
      await wait(1500)
      const photoBack = await page.evaluate(() => [...document.querySelectorAll('.kan-card')].find((c) => c.textContent.includes('מטולה'))?.querySelector('img')?.src.startsWith('data:image/jpeg') ?? false)
      check(`${tag}: 1. the photo is still on the property's card after the refresh`, photoBack)
      // the heavy property leaves, so the rest of the check has room
      await page.evaluate((key) => {
        const s = JSON.parse(localStorage.getItem(key))
        s.crm = s.crm.filter((c) => c.id !== 'own-big')
        s.items = s.items.filter((i) => i.sourceId !== 'own-big')
        localStorage.setItem(key, JSON.stringify(s))
      }, STATE)

      // a real match: a property that fits what another broker's buyer is looking for
      const made = await page.evaluate((key) => {
        const s = JSON.parse(localStorage.getItem(key))
        const base = s.crm.find((x) => x.kind === 'property')
        const seeker = s.items.find((i) => i.search && i.authorId !== base.authorId && i.search.deal !== 'rent' && !i.search.kinds?.length && i.topicId === 'seeking')
        if (!seeker) return null
        const q = seeker.search
        s.crm.unshift({ ...base, id: 'own-fit', title: `דירת ${q.roomsMin} חדרים שמתאימה`, city: q.cities[0], area: q.cities[0], neighborhood: q.neighborhoods?.[0], street: undefined, rooms: String(q.roomsMin), price: Math.round(q.budget * 0.95), parking: 1, extras: q.wants, category: 'home', ptype: 'דירה', image: undefined, images: undefined, renewal: undefined })
        localStorage.setItem(key, JSON.stringify(s))
        return { city: q.cities[0], seeker: seeker.id }
      }, STATE)
      const hit = await enter()
      check(`${tag}: 1. a property that fits a buyer in the community: a match window comes up`, !!made && /^נמצא/.test(hit ?? ''), { made, hit })
      await shot('1-match-window')
      await page.evaluate(() => document.querySelector('[data-act="close-match"]').click())
      await wait(600)
      check(`${tag}: 1. after a refresh the same match is not shown again`, (await enter()) === null)
      await page.evaluate((key) => {
        const s = JSON.parse(localStorage.getItem(key))
        delete s.publishedIds['own-fit']
        s.items = s.items.filter((i) => i.sourceId !== 'own-fit')
        localStorage.setItem(key, JSON.stringify(s))
      }, STATE)
      check(`${tag}: 1. the same property published again with the same match: nothing comes up`, (await enter()) === null)
      // a new buyer of another broker that fits: a new match, shown once
      await page.evaluate(
        (key, seekerId) => {
          const s = JSON.parse(localStorage.getItem(key))
          const seeker = s.items.find((i) => i.id === seekerId)
          s.items.unshift({ ...seeker, id: 'seeker-new', title: `${seeker.title} (חדש)`, likes: 0, comments: [] })
          delete s.publishedIds['own-fit']
          s.items = s.items.filter((i) => i.sourceId !== 'own-fit')
          localStorage.setItem(key, JSON.stringify(s))
        },
        STATE,
        made?.seeker,
      )
      const again = await enter()
      check(`${tag}: 1. a new match for that property is shown, the one new match alone`, again === 'נמצאה התאמה אחת!', again)
      await page.evaluate(() => document.querySelector('[data-act="close-match"]').click())
      await wait(500)
      check(`${tag}: 1. and that one is not shown a second time`, (await enter()) === null)
    }

    // ================================================================ 2. the search of the CRM
    await page.goto(green + '/app/crm?v=clients', { waitUntil: 'networkidle0' })
    await wait(900)
    // a client called אריאל, kept with no phone (it is the client of part 3 as well)
    await page.evaluate(() => [...document.querySelectorAll('button')].find((b) => b.textContent.trim().startsWith('לקוח חדש'))?.click())
    await page.waitForSelector('.nc [data-f="name"]', { visible: true, timeout: 8000 })
    await wait(400)
    await type('.nc [data-f="name"]', NAME)
    await page.evaluate(() => [...document.querySelectorAll('.modal button')].find((b) => b.textContent.trim() === 'הוספת הלקוח').click())
    await wait(1000)
    const rows = () => page.evaluate(() => [...document.querySelectorAll('.ct-table tbody tr')].map((tr) => tr.querySelector('.ct-name b')?.textContent.trim()))
    const all = await rows()
    const S = '[data-f="client-search"]'
    await type(S, 'אריאל')
    const byName = await rows()
    check(`${tag}: 2. typing "אריאל" leaves the client called אריאל alone`, byName.length === 1 && byName[0] === NAME && all.length > 5, { all: all.length, byName })
    await shot('2-search-name')
    await type(S, 'ארי')
    check(`${tag}: 2. it filters while typing, from the first letters`, (await rows()).join() === NAME)
    await type(S, '  אריאל  בדיקה ')
    check(`${tag}: 2. spaces around the words do not matter`, (await rows()).join() === NAME)
    await type(S, '0101')
    const byPhone = await rows()
    check(`${tag}: 2. by phone: "0101" finds רון ומיכל ק.`, byPhone.length === 1 && byPhone[0].startsWith('רון ומיכל'), byPhone)
    await type(S, '050-555-0101')
    check(`${tag}: 2. by a whole phone number with dashes`, (await rows()).length === 1)
    await type(S, 'רמת גן')
    const byCity = await rows()
    check(`${tag}: 2. by city: "רמת גן" finds the clients looking there`, byCity.length >= 1 && byCity.length < all.length && byCity.includes('נועה כ.'), byCity)
    await type(S, 'פלורנטין')
    const byHood = await rows()
    check(`${tag}: 2. by neighbourhood: "פלורנטין" finds רון ומיכל ק.`, byHood.length === 1 && byHood[0].startsWith('רון ומיכל'), byHood)
    // together with the types
    await type(S, 'תל אביב')
    const cityAll = await rows()
    await page.evaluate(() => document.querySelector('.ct-chip[data-type="buyer"]').click())
    await wait(400)
    const cityBuyers = await page.evaluate(() => [...document.querySelectorAll('.ct-table tbody tr')].map((tr) => tr.querySelector('.ct-type')?.textContent.trim()))
    check(`${tag}: 2. the search works together with the type: "תל אביב" and "קונים" shows buyers only`, cityBuyers.length >= 1 && cityBuyers.length <= cityAll.length && cityBuyers.every((t) => t === 'קונה'), { cityAll: cityAll.length, cityBuyers })
    // nothing found: a friendly word and a way back
    await page.evaluate(() => document.querySelector('.ct-chip[data-type="buyer"]').click())
    await wait(300)
    await type(S, 'זזזלאקיים')
    const none = await page.evaluate(() => {
      const box = document.querySelector('[data-empty="clients"]')
      const btn = box?.querySelector('[data-act="clear-search"]')
      return { title: box?.querySelector('b')?.textContent.trim() ?? null, btn: btn?.textContent.trim() ?? null, btnH: Math.round(btn?.getBoundingClientRect().height ?? 0), rows: document.querySelectorAll('.ct-table tbody tr').length, over: document.documentElement.scrollWidth - document.documentElement.clientWidth }
    })
    check(`${tag}: 2. nothing found: "לא נמצאו לקוחות" with "ניקוי חיפוש", big enough for a thumb, nothing scrolls sideways`, none.title === 'לא נמצאו לקוחות' && none.btn === 'ניקוי חיפוש' && none.btnH >= 44 && none.rows === 0 && none.over <= 1, none)
    await page.$eval('[data-empty="clients"]', (el) => el.scrollIntoView({ block: 'center', behavior: 'instant' }))
    await shot('2-search-empty')
    await page.evaluate(() => document.querySelector('[data-empty="clients"] [data-act="clear-search"]').click())
    await wait(400)
    const back = await page.evaluate((s) => ({ rows: document.querySelectorAll('.ct-table tbody tr').length, q: document.querySelector(s).value, empty: !!document.querySelector('[data-empty="clients"]') }), S)
    check(`${tag}: 2. "ניקוי חיפוש" empties the field and every client is back`, back.rows === all.length && back.q === '' && !back.empty, back)

    // the properties' board. One property with a neighbourhood and a street of its own is put in first (marked as
    // already published, so nothing goes up to the community and no window opens)
    await page.evaluate((key) => {
      const s = JSON.parse(localStorage.getItem(key))
      const base = s.crm.find((x) => x.kind === 'property')
      s.crm.unshift({ ...base, id: 'own-street', title: 'דירת גן שקטה', city: 'כפר סבא', area: 'כפר סבא', neighborhood: 'הדרים הירוקה', street: 'האלונים', image: undefined, images: undefined })
      s.publishedIds['own-street'] = 'coop'
      localStorage.setItem(key, JSON.stringify(s))
    }, STATE)
    await page.goto(green + '/app/crm?v=properties', { waitUntil: 'networkidle0' })
    await wait(900)
    const B = '[data-f="board-search"]'
    const cards = () => page.evaluate(() => [...document.querySelectorAll('.kan-card')].filter((c) => c.getBoundingClientRect().height > 0).length)
    const props = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)).crm.filter((c) => c.kind === 'property').map((c) => ({ title: c.title, city: c.city, hood: c.neighborhood ?? '', street: c.street ?? '', area: c.area ?? '' })), STATE)
    const hay = (p) => [p.title, p.city, p.hood, p.street, p.area].join(' ')
    const total = await cards()
    const withStreet = props.find((p) => p.street)
    const withHood = props.find((p) => p.hood)
    const city = props[0].city
    for (const [what, term] of [
      ['city', city],
      ['title', props[0].title],
      ['neighbourhood', withHood?.hood],
      ['street', withStreet?.street],
    ]) {
      if (!term) {
        check(`${tag}: 2. board, by ${what}: the demo has a property with one`, false, 'none in the demo')
        continue
      }
      await type(B, term)
      const want = props.filter((p) => hay(p).includes(term)).length
      const got = await cards()
      check(`${tag}: 2. board, by ${what}: "${term}" shows the ${want} that fit`, got === want && want >= 1 && got <= total, { got, want, total })
    }
    await type(B, city)
    await shot('2-board-search')
    // together with the category
    const catCount = await page.evaluate(() => {
      const chip = [...document.querySelectorAll('.crm-cats .ct-chip[data-cat]')].find((c) => c.dataset.cat !== 'all' && Number(c.querySelector('b')?.textContent) > 0)
      chip?.click()
      return chip ? Number(chip.querySelector('b').textContent) : null
    })
    await wait(400)
    check(`${tag}: 2. board: the search works together with the category`, catCount !== null && (await cards()) === catCount, { catCount, shown: await cards() })
    await page.evaluate(() => document.querySelector('.crm-cats .ct-chip[data-cat="all"]')?.click())
    await type(B, 'זזזלאקיים')
    const noProp = await page.evaluate(() => {
      const box = document.querySelector('[data-empty="board"]')
      const btn = box?.querySelector('[data-act="clear-search"]')
      return { title: box?.querySelector('b')?.textContent.trim() ?? null, btn: btn?.textContent.trim() ?? null, btnH: Math.round(btn?.getBoundingClientRect().height ?? 0), over: document.documentElement.scrollWidth - document.documentElement.clientWidth }
    })
    check(`${tag}: 2. board, nothing found: "לא נמצאו נכסים" with "ניקוי חיפוש"`, noProp.title === 'לא נמצאו נכסים' && noProp.btn === 'ניקוי חיפוש' && noProp.btnH >= 44 && noProp.over <= 1 && (await cards()) === 0, noProp)
    await page.evaluate(() => document.querySelector('[data-empty="board"] [data-act="clear-search"]').click())
    await wait(400)
    check(`${tag}: 2. board: "ניקוי חיפוש" brings every property back`, (await cards()) === total, { shown: await cards(), total })

    // ================================================================ 3. a client with no phone, in the WhatsApp window
    await page.evaluate(() => document.querySelector('[data-act="send-to-buyer"]').click())
    await page.waitForSelector('[data-sheet="send-buyer"] [data-picker="open"]', { visible: true, timeout: 8000 })
    await wait(600)
    const row = await page.evaluate((n) => {
      const r = [...document.querySelectorAll('[data-sheet="send-buyer"] .cp-row')].find((x) => x.textContent.includes(n))
      const add = r?.querySelector('[data-act="add-phone-row"]')
      const other = [...document.querySelectorAll('[data-sheet="send-buyer"] .cp-row[role="radio"]')]
      r?.scrollIntoView({ block: 'center', behavior: 'instant' })
      return {
        off: r?.classList.contains('is-off') ?? false,
        isButton: r?.tagName === 'BUTTON',
        disabled: r?.getAttribute('aria-disabled'),
        tag: r?.querySelector('[data-tag="no-phone"]')?.textContent.trim() ?? null,
        add: add?.textContent.trim() ?? null,
        addH: Math.round(add?.getBoundingClientRect().height ?? 0),
        grey: r ? getComputedStyle(r.querySelector('.cp-text')).opacity : null,
        last: r ? !r.nextElementSibling || r.nextElementSibling.classList.contains('is-off') : false,
        others: other.length,
        over: r ? r.scrollWidth - r.clientWidth : 99,
      }
    }, NAME)
    check(`${tag}: 3. a client with no phone is grey and is not a button to pick, after the ones that can be picked`, row.off && !row.isButton && row.disabled === 'true' && Number(row.grey) <= 0.6 && row.last && row.others >= 1 && row.over <= 1, row)
    check(`${tag}: 3. it says "חסר טלפון" and has a small "הוסף טלפון", big enough for a thumb`, row.tag === 'חסר טלפון' && row.add === 'הוסף טלפון' && row.addH >= 44, row)
    await shot('3-no-phone-row')
    // a press on the grey row picks nothing
    await page.evaluate((n) => [...document.querySelectorAll('[data-sheet="send-buyer"] .cp-row')].find((x) => x.textContent.includes(n)).querySelector('.cp-text').click(), NAME)
    await wait(400)
    const stays = await page.evaluate(() => ({ open: !!document.querySelector('[data-picker="open"]'), preview: !!document.querySelector('[data-preview]'), btn: document.querySelector('[data-act="open-whatsapp"]')?.disabled }))
    check(`${tag}: 3. a press on the grey row picks nobody, and the WhatsApp button stays closed`, stays.open && !stays.preview && stays.btn === true, stays)
    // "הוסף טלפון": the number is asked for, kept on the card, and the client is picked
    await page.evaluate((n) => [...document.querySelectorAll('[data-sheet="send-buyer"] .cp-row')].find((x) => x.textContent.includes(n)).querySelector('[data-act="add-phone-row"]').click(), NAME)
    await page.waitForSelector('[data-f="ask-phone"]', { visible: true, timeout: 8000 })
    await wait(400)
    await shot('3-add-phone')
    await type('[data-f="ask-phone"]', PHONE)
    await page.evaluate(() => document.querySelector('[data-act="ask-phone-save"]').click())
    await page.waitForSelector('[data-sheet="send-buyer"] [data-picker="folded"]', { visible: true, timeout: 8000 })
    await wait(500)
    const added = await page.evaluate((n) => ({
      picked: document.querySelector('[data-picker="folded"] .cp-text b')?.textContent.trim(),
      preview: !!document.querySelector('[data-preview]'),
      btn: document.querySelector('[data-act="open-whatsapp"]')?.disabled,
      saved: JSON.parse(localStorage.getItem('nadlanup-clients-v1') ?? '[]').find((c) => c.name === n)?.phone ?? null,
    }), NAME)
    check(`${tag}: 3. "הוסף טלפון" keeps the number on the client's card, and the client is picked with the message ready`, added.picked === NAME && added.preview && added.btn === false && added.saved === PHONE, added)
    await page.evaluate(() => document.querySelector('[data-act="open-whatsapp"]').click())
    await wait(500)
    const sent = await page.evaluate(() => window.__opened)
    check(`${tag}: 3. WhatsApp opens on that client's number`, sent.length === 1 && sent[0].startsWith('https://wa.me/972505550177?text='), sent.map((u) => u.slice(0, 40)))

    // the same on the client's own window: a second client with no phone
    await page.goto(green + '/app/crm?v=clients', { waitUntil: 'networkidle0' })
    await wait(800)
    await page.evaluate(() => [...document.querySelectorAll('button')].find((b) => b.textContent.trim().startsWith('לקוח חדש'))?.click())
    await page.waitForSelector('.nc [data-f="name"]', { visible: true, timeout: 8000 })
    await wait(400)
    await type('.nc [data-f="name"]', 'אופק בדיקה')
    await page.evaluate(() => [...document.querySelectorAll('.modal button')].find((b) => b.textContent.trim() === 'הוספת הלקוח').click())
    await wait(1000)
    await page.evaluate(() => [...document.querySelectorAll('.ct-table tbody tr')].find((x) => x.textContent.includes('אופק בדיקה'))?.click())
    await page.waitForSelector('.ct-det', { visible: true, timeout: 8000 })
    await wait(500)
    const det = await page.evaluate(() => {
      const s = document.querySelector('.ct-det [data-act="send-client"]')
      const add = s?.querySelector('[data-act="send-add-phone"]')
      return { off: s?.classList.contains('is-off') ?? false, isButton: s?.tagName === 'BUTTON', tag: s?.querySelector('[data-tag="no-phone"]')?.textContent.trim() ?? null, add: add?.textContent.trim() ?? null, addH: Math.round(add?.getBoundingClientRect().height ?? 0), over: s ? s.scrollWidth - s.clientWidth : 99 }
    })
    check(`${tag}: 3. the client's window: "שליחה ללקוח" is grey and not a button, with "חסר טלפון" and "הוסף טלפון"`, det.off && !det.isButton && det.tag === 'חסר טלפון' && det.add === 'הוסף טלפון' && det.addH >= 44 && det.over <= 1, det)
    await shot('3-client-window')
    const before = await page.evaluate(() => window.__opened.length)
    await page.evaluate(() => document.querySelector('.ct-det [data-act="send-client"] .ct-send-word').click())
    await wait(400)
    check(`${tag}: 3. a press on the grey line sends nothing and asks nothing`, (await page.evaluate(() => window.__opened.length)) === before && !(await page.$('[data-f="ask-phone"]')))
    await page.evaluate(() => document.querySelector('[data-act="send-add-phone"]').click())
    await page.waitForSelector('[data-f="ask-phone"]', { visible: true, timeout: 8000 })
    await type('[data-f="ask-phone"]', '052-555-0188')
    await page.evaluate(() => document.querySelector('[data-act="ask-phone-save"]').click())
    await wait(900)
    const detAfter = await page.evaluate(() => ({ isButton: document.querySelector('.ct-det [data-act="send-client"]')?.tagName === 'BUTTON', phone: document.querySelector('.ct-det-phone')?.textContent.trim() ?? null, opened: window.__opened.length }))
    check(`${tag}: 3. with the number kept, "שליחה ללקוח" is a button again, and nothing was sent by itself`, detAfter.isButton && detAfter.phone === '052-555-0188' && detAfter.opened === before, detAfter)

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
