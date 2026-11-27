// Prompt 15 (Itzik 27.11.2026): properties and the client's card in the CRM. On a computer and on a phone, by day and by night:
// 1. "תיאור הנכס" on the property form: not a must, a few free lines, a note under it; a phone number or the owner's name
//    in it stops the save; it shows on the property's page and on the property's post in the community.
// 2. one kind of property only: picking another kind replaces the first; a record that carries several is read as its first.
// 3. the client's card in tabs (פרטים, מה מחפש, נכסים מתאימים, הערות) and "עריכה": a full form for everything, the phone too;
//    "הוסף טלפון" stays for a client with no phone.
// Usage: node scripts/prompt15-check.mjs [outDir]     (BASE_GREEN overrides the address)
import puppeteer from 'puppeteer-core'
import { mkdirSync } from 'node:fs'

const green = process.env.BASE_GREEN ?? 'http://localhost:5240/NADLANIL-DEMO/green'
const out = process.argv[2] ?? '_shots/prompt-15'
mkdirSync(out, { recursive: true })
const browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--hide-scrollbars'] })
process.on('unhandledRejection', async (e) => {
  console.error('CRASH', e)
  await browser.close().catch(() => {})
  process.exit(2)
})
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
const results = []
const check = (name, ok, detail = '') => {
  const line = `${ok ? 'PASS' : 'FAIL'}  ${name}${ok || detail === '' ? '' : '  [' + (typeof detail === 'string' ? detail : JSON.stringify(detail)) + ']'}`
  results.push(line)
  if (!ok) console.error(line)
}
const PREVIEW = '6d5eaaca072bf02f647051d8688d1337a4ab7a6cb92a2a8b3924cf91fda89e8b'
const DESC = 'דירה מוארת עם שלושה כיווני אוויר, משופצת מהיסוד.\nקרובה לפארק ולבתי הספר.'
const OWNER = 'דוד לוינסון'

/** the contrast of an element's text against the first solid background under it (WCAG ratio) */
const contrastOf = (page, sel) =>
  page.evaluate((s) => {
    const el = document.querySelector(s)
    if (!el) return null
    const rgb = (c) => (c.match(/[\d.]+/g) ?? []).map(Number)
    const lum = ([r, g, b]) => {
      const f = (v) => ((v /= 255) <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)
      return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)
    }
    const chain = []
    for (let n = el; n; n = n.parentElement) chain.unshift(getComputedStyle(n).backgroundColor)
    let bg = [255, 255, 255]
    for (const c of chain) {
      const [r, g, b, a = 1] = rgb(c)
      if (c === 'transparent' || a === 0) continue
      bg = [r * a + bg[0] * (1 - a), g * a + bg[1] * (1 - a), b * a + bg[2] * (1 - a)]
    }
    const [r, g, b, a = 1] = rgb(getComputedStyle(el).color)
    const fg = [r * a + bg[0] * (1 - a), g * a + bg[1] * (1 - a), b * a + bg[2] * (1 - a)]
    const [x, y] = [lum(fg), lum(bg)].sort((p, q) => q - p)
    return Math.round(((x + 0.05) / (y + 0.05)) * 100) / 100
  }, sel)

for (const dev of [
  { name: 'desktop', vp: { width: 1440, height: 900 } },
  { name: 'phone', vp: { width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 } },
]) {
  const d = dev.name
  const phone = d === 'phone'
  for (const mode of ['day', 'night']) {
    const t = `${d} ${mode}`
    const page = await browser.newPage()
    const errors = []
    page.on('pageerror', (e) => errors.push(String(e)))
    page.on('console', (m) => m.type() === 'error' && !/favicon|Failed to load resource/.test(m.text()) && errors.push(m.text()))
    await page.evaluateOnNewDocument(() => {
      try {
        localStorage.setItem('nadlanup-demo-v1', '1')
      } catch {}
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
    const shot = async (name, sel) => {
      if (sel) await page.$eval(sel, (el) => el.scrollIntoView({ block: 'center', behavior: 'instant' })).catch(() => {})
      await wait(350)
      await page.screenshot({ path: `${out}/${d}-${mode}-${name}.png` })
    }
    /** writes into a box as a person does: everything in it is marked, deleted, and the new words are typed */
    const write = async (sel, text) => {
      await page.$eval(sel, (el) => {
        el.scrollIntoView({ block: 'center', behavior: 'instant' })
        el.focus()
        el.select?.()
      })
      await page.keyboard.press('Backspace')
      if (text) await page.type(sel, text)
      await wait(150)
    }
    const click = (sel) =>
      page.$eval(sel, (el) => {
        el.scrollIntoView({ block: 'center', behavior: 'instant' })
        el.click()
      })
    const state = () => page.evaluate(() => JSON.parse(localStorage.getItem('brokers-demo-state-v5') ?? '{}'))
    const clientOf = (id) => page.evaluate((i) => JSON.parse(localStorage.getItem('nadlanup-clients-v1') ?? '[]').find((c) => c.id === i) ?? null, id)
    const sideways = () => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)

    // =============================================================== 1 + 2. the property form
    await page.goto(green + '/app/crm?v=properties', { waitUntil: 'networkidle0' })
    await wait(800)
    await click('[data-act="new-card"]')
    await page.waitForSelector('.ga-fields', { visible: true })
    await wait(450)

    // ---- 2. one kind only
    await click('.ga [data-cat="home"]')
    await wait(450)
    await click('.ga .pf-kind[data-kind="דירה"]')
    await click('.ga .pf-kind[data-kind="פנטהאוז"]')
    await wait(200)
    const homeKinds = await page.evaluate(() => [...document.querySelectorAll('.ga .pf-kind[aria-pressed="true"]')].map((b) => b.dataset.kind))
    check(`${t}: the property form keeps one kind: picking "פנטהאוז" after "דירה" leaves only "פנטהאוז"`, JSON.stringify(homeKinds) === JSON.stringify(['פנטהאוז']), homeKinds)
    await click('.ga [data-cat="business"]')
    await wait(450)
    const none = await page.evaluate(() => document.querySelectorAll('.ga .pf-kind[aria-pressed="true"]').length)
    await click('.ga .pf-kind[data-kind="משרד"]')
    await click('.ga .pf-kind[data-kind="חנות"]')
    await wait(200)
    const bizKinds = await page.evaluate(() => [...document.querySelectorAll('.ga .pf-kind[aria-pressed="true"]')].map((b) => b.dataset.kind))
    check(`${t}: the same in "מסחרי": the list starts with nothing picked, and one kind stays ("חנות")`, none === 0 && JSON.stringify(bizKinds) === JSON.stringify(['חנות']), { none, bizKinds })
    await click('.ga [data-cat="home"]')
    await wait(450)
    await click('.ga .pf-kind[data-kind="דירה"]')
    await page.evaluate(() => document.querySelector('[data-slider="coop"] [data-step="more"]')?.click())
    await wait(200)

    // ---- 1. the description
    const field = await page.evaluate(() => {
      const f = document.querySelector('.ga [data-f="desc"]')
      const ta = f?.querySelector('textarea')
      const cs = ta ? getComputedStyle(ta) : null
      return {
        label: f?.querySelector('.field-label')?.textContent.replace(/\s+/g, ' ').trim(),
        note: f?.querySelector('[data-note="desc"]')?.textContent.trim(),
        rows: ta?.rows,
        h: ta ? Math.round(ta.getBoundingClientRect().height) : 0,
        font: cs ? parseFloat(cs.fontSize) : 0,
        required: ta?.required,
        max: ta?.maxLength,
        described: ta?.getAttribute('aria-describedby') === f?.querySelector('[data-note="desc"]')?.id,
        labelled: !!ta?.id && f?.querySelector('label')?.htmlFor === ta.id,
        err: !!f?.querySelector('[data-err="desc"]'),
      }
    })
    check(`${t}: the form has "תיאור הנכס", marked "(לא חובה)", a box of a few lines`, field.label === 'תיאור הנכס (לא חובה)' && field.rows >= 3 && field.h >= 100 && field.required === false, field)
    check(`${t}: the note under it says no phone and no client's name, and belongs to the box (label and description)`, /בלי טלפון/.test(field.note ?? '') && /שם של לקוח/.test(field.note ?? '') && field.described && field.labelled && !field.err, field)
    check(`${t}: the box's letters are 16px or more (no zoom on a phone) and it has a length limit`, field.font >= 16 && field.max > 0 && field.max <= 1000, field)
    const noteC = await contrastOf(page, '.ga [data-note="desc"]')
    check(`${t}: the note reads (4.5:1 or more)`, noteC >= 4.5, noteC)

    const before = (await state()).crm?.length ?? 0
    // a phone number in it: said at once, and the property is not saved
    await write('.ga [data-f="desc-text"]', 'דירה יפה, לפרטים 050-555-0142')
    const phoneErr = await page.evaluate(() => ({ err: document.querySelector('.ga [data-err="desc"]')?.textContent.trim(), alert: document.querySelector('.ga [data-err="desc"]')?.getAttribute('role'), invalid: document.querySelector('.ga [data-f="desc-text"]')?.getAttribute('aria-invalid') }))
    check(`${t}: a phone number in the description is said right at the box`, /טלפון/.test(phoneErr.err ?? '') && phoneErr.alert === 'alert' && phoneErr.invalid === 'true', phoneErr)
    const errC = await contrastOf(page, '.ga [data-err="desc"]')
    check(`${t}: the message reads (4.5:1 or more)`, errC >= 4.5, errC)
    if (mode === 'day') await shot('1-desc-phone', '.ga [data-f="desc"]')
    await click('.ga-go')
    await wait(700)
    const stopped = { open: !!(await page.$('.ga-fields')), crm: (await state()).crm?.length ?? 0 }
    check(`${t}: with a phone number in the description the property is not saved`, stopped.open && stopped.crm === before, stopped)

    // the owner's name in it: said when saving is tried, and the property is not saved
    await write('.ga input[placeholder="לדוגמה: משפחת כהן"]', OWNER)
    await write('.ga [data-f="desc-text"]', `הדירה של ${OWNER}, מוארת ושקטה`)
    const quiet = !(await page.$('.ga [data-err="desc"]'))
    await click('.ga-go')
    await wait(700)
    const nameErr = await page.evaluate(() => document.querySelector('.ga [data-err="desc"]')?.textContent.trim() ?? '')
    const stopped2 = { open: !!(await page.$('.ga-fields')), crm: (await state()).crm?.length ?? 0 }
    check(`${t}: the owner's name in the description stops the save, with a message at the box`, quiet && /שם בעל הנכס/.test(nameErr) && stopped2.open && stopped2.crm === before, { quiet, nameErr, stopped2 })

    // a proper description: saved
    await write('.ga [data-f="desc-text"]', DESC)
    const clean = await page.evaluate(() => ({ err: !!document.querySelector('.ga [data-err="desc"]'), count: document.querySelector('.ga [data-count]')?.textContent.trim() }))
    check(`${t}: a description with no phone and no name has no message, and the counter follows the typing`, !clean.err && clean.count === `${DESC.length}/600`, clean)
    await shot('2-desc-form', '.ga [data-f="desc"]')
    await click('.ga-go')
    await wait(1100)
    await page.$eval('[data-act="close-match"]', (b) => b.click()).catch(() => {})
    await wait(500)
    const st = await state()
    const card = st.crm?.find((c) => c.desc)
    const post = st.items?.find((it) => it.sourceId === card?.id)
    check(`${t}: the property is saved with its description, and with one kind ("דירה")`, !!card && card.desc === DESC && card.ptype === 'דירה' && typeof card.ptype === 'string', card && { desc: card.desc, ptype: card.ptype })
    check(`${t}: the property's post in the community carries the description`, !!post && post.desc === DESC && post.property?.kind === 'דירה', post && { desc: post.desc, kind: post.property?.kind })
    // what the community reads of the post: everything but its ids (they are made of the clock's digits)
    const { id: _id, sourceId: _src, ...seen } = post ?? {}
    const seenText = JSON.stringify(seen)
    check(`${t}: the owner's name is in the broker's own card only, never in the post, and the post has no phone number`, card?.client === OWNER && !!post && !seenText.includes(OWNER) && !/(?<!\d)0\d{1,2}[\s-]?\d{3}[\s-]?\d{4}(?!\d)/.test(seenText), { owner: card?.client, seenText: seenText.slice(0, 300) })

    // ---- the post in the community
    await page.goto(green + `/app/community?topic=coop&item=${post?.id}`, { waitUntil: 'networkidle0' })
    await wait(1200)
    const inFeed = await page.evaluate((id) => {
      const a = document.getElementById(`ci-${id}`)
      a?.scrollIntoView({ block: 'center', behavior: 'instant' })
      const p = a?.querySelector('[data-desc]')
      const cs = p ? getComputedStyle(p) : null
      return {
        found: !!a,
        text: p?.textContent ?? '',
        lines: cs?.whiteSpace,
        tall: p ? p.getBoundingClientRect().height > parseFloat(cs.lineHeight) * 1.5 : false,
        fixed: /נכס חדש אצלי/.test(a?.textContent ?? ''),
        cut: p ? p.scrollWidth > p.clientWidth + 1 : true,
        font: cs ? parseFloat(cs.fontSize) : 0,
      }
    }, post?.id)
    check(`${t}: the post shows the description in the broker's words, in place of the fixed line`, inFeed.found && inFeed.text === DESC && !inFeed.fixed, inFeed)
    check(`${t}: its lines are kept (two lines stay two), nothing is cut, 16px or more`, inFeed.lines === 'pre-line' && inFeed.tall && !inFeed.cut && inFeed.font >= 16, inFeed)
    const feedC = await contrastOf(page, `#ci-${post?.id} [data-desc]`)
    check(`${t}: the description on the post reads (4.5:1 or more)`, feedC >= 4.5, feedC)
    const others = await page.evaluate(() => {
      const cards = [...document.querySelectorAll('article[id^="ci-"]')].filter((a) => a.querySelector('.fb-prop') && !a.querySelector('[data-desc]'))
      return { n: cards.length, withText: cards.filter((a) => a.querySelector('.fb-text')).length }
    })
    check(`${t}: a property with no description keeps the line it always had`, others.n > 0 && others.withText === others.n, others)
    check(`${t}: the feed does not scroll sideways`, (await sideways()) <= 0)
    await shot('3-desc-post', `#ci-${post?.id} [data-desc]`)

    // ---- the property's page
    await page.goto(green + `/app/property/${post?.id}`, { waitUntil: 'networkidle0' })
    await wait(900)
    const onPage = await page.evaluate(() => {
      const b = document.querySelector('.pp [data-desc]')
      const p = b?.querySelector('p')
      return { head: b?.querySelector('h2')?.textContent.trim(), text: p?.textContent ?? '', lines: p ? getComputedStyle(p).whiteSpace : '', body: !!document.querySelector('.pp .pp-body'), font: p ? parseFloat(getComputedStyle(p).fontSize) : 0 }
    })
    check(`${t}: the property's page has "תיאור הנכס" with the same words, lines kept`, onPage.head === 'תיאור הנכס' && onPage.text === DESC && onPage.lines === 'pre-line' && !onPage.body && onPage.font >= 16, onPage)
    const pageC = await contrastOf(page, '.pp [data-desc] p')
    const headC = await contrastOf(page, '.pp [data-desc] h2')
    check(`${t}: on the page the description and its title read (4.5:1 or more)`, pageC >= 4.5 && headC >= 4.5, { pageC, headC })
    check(`${t}: the property's page does not scroll sideways`, (await sideways()) <= 0)
    await shot('4-desc-page', '.pp [data-desc]')
    await page.goto(green + '/app/property/p1', { waitUntil: 'networkidle0' })
    await wait(700)
    const p1 = await page.evaluate(() => ({ body: (document.querySelector('.pp .pp-body')?.textContent ?? '').length > 0, desc: !!document.querySelector('.pp [data-desc]') }))
    check(`${t}: a property with no description: its page is as it was`, p1.body && !p1.desc, p1)

    // ---- 2. records of the demo that carry several kinds are read as their first one
    await page.evaluate(() => {
      const s = JSON.parse(localStorage.getItem('brokers-demo-state-v5'))
      const base = s.crm.find((c) => c.kind === 'property' && c.desc)
      const mk = (id, ptype) => ({ ...base, id, ptype, title: `נכס בדיקה ${id}`, desc: undefined, image: undefined, images: undefined })
      s.crm = [mk('multi-a', 'פנטהאוז, דירת גן, דופלקס'), mk('multi-b', ['דופלקס', 'דירה']), ...s.crm]
      localStorage.setItem('brokers-demo-state-v5', JSON.stringify(s))
    })
    await page.goto(green + '/app/crm?v=properties', { waitUntil: 'networkidle0' })
    await wait(1300)
    const st2 = await state()
    const posts = ['multi-a', 'multi-b'].map((id) => st2.items?.find((it) => it.sourceId === id)?.property?.kind ?? null)
    const tags = await page.evaluate(() => [...document.querySelectorAll('[data-kind]')].map((x) => x.dataset.kind))
    check(`${t}: a property saved with several kinds gets its first: "פנטהאוז" and "דופלקס", on the card and on the post`, JSON.stringify(posts) === JSON.stringify(['פנטהאוז', 'דופלקס']) && tags.includes('פנטהאוז') && tags.includes('דופלקס') && !tags.some((k) => /,/.test(k ?? '')), { posts, tags: tags.slice(0, 6) })

    // =============================================================== 3. the client's card
    await page.goto(green + '/app/crm', { waitUntil: 'networkidle0' })
    await wait(900)
    const open = async (id) => {
      await page.$eval(`.ct-table tbody tr[data-id="${id}"] .ct-name button`, (b) => b.click())
      await page.waitForSelector('.ct-det', { visible: true, timeout: 8000 })
      await wait(450)
    }
    const tabOn = () => page.evaluate(() => ({ on: [...document.querySelectorAll('.ct-det [role="tab"][aria-selected="true"]')].map((b) => b.dataset.tab), panel: document.querySelector('.ct-det [role="tabpanel"]')?.dataset.panel }))
    const tab = async (id) => {
      await click(`.ct-det [data-tab="${id}"]`)
      await wait(320)
    }
    await open('k1')
    const tabs = await page.evaluate(() => {
      const list = document.querySelector('.ct-det [role="tablist"]')
      const bs = [...(list?.querySelectorAll('[role="tab"]') ?? [])]
      return {
        labels: bs.map((b) => b.textContent.replace(/\d+/g, '').trim()),
        ids: bs.map((b) => b.dataset.tab),
        hs: bs.map((b) => Math.round(b.getBoundingClientRect().height)),
        ws: bs.map((b) => Math.round(b.getBoundingClientRect().width)),
        icons: bs.every((b) => (b.querySelector('svg')?.getBoundingClientRect().width ?? 0) > 0),
        named: !!list?.getAttribute('aria-label'),
        fitsInRow: list ? list.scrollWidth <= list.clientWidth + 1 : false,
        cut: bs.some((b) => b.scrollWidth > b.clientWidth + 1),
      }
    })
    check(`${t}: a buyer's card has four tabs: פרטים, מה מחפש, נכסים מתאימים, הערות`, JSON.stringify(tabs.labels) === JSON.stringify(['פרטים', 'מה מחפש', 'נכסים מתאימים', 'הערות']) && tabs.named && (phone || tabs.icons), tabs)
    check(`${t}: every tab is big enough for a thumb (44px), all four fit in the row, no word is cut`, tabs.hs.every((h) => h >= 44) && tabs.ws.every((w) => w >= 44) && tabs.fitsInRow && !tabs.cut, tabs)
    const first = await tabOn()
    const det = await page.evaluate(() => ({
      phone: document.querySelector('.ct-det .ct-det-phone')?.textContent.trim(),
      send: !!document.querySelector('.ct-det [data-act="send-client"]'),
      refer: !!document.querySelector('.ct-det [data-act="refer-client"]'),
      summary: !!document.querySelector('.ct-det [data-summary]'),
      note: !!document.querySelector('.ct-det input.input'),
      type: document.querySelector('.ct-det .ct-head .ct-type')?.textContent.trim(),
      edit: document.querySelector('.ct-det [data-act="edit-client"]')?.textContent.trim(),
      editH: Math.round(document.querySelector('.ct-det [data-act="edit-client"]')?.getBoundingClientRect().height ?? 0),
    }))
    check(`${t}: the card opens on "פרטים": the phone, "שליחה ללקוח" and the referral, and nothing of the other tabs`, JSON.stringify(first.on) === JSON.stringify(['details']) && first.panel === 'details' && det.phone === '050-555-0101' && det.send && det.refer && !det.summary && !det.note, { first, det })
    check(`${t}: the head keeps the kind of client and an "עריכה" button, 44px high`, det.type === 'קונה' && det.edit === 'עריכה' && det.editH >= 44, det)
    const selC = await contrastOf(page, '.ct-det [role="tab"][aria-selected="true"]')
    const restC = await contrastOf(page, '.ct-det [role="tab"][aria-selected="false"]')
    const editC = await contrastOf(page, '.ct-det [data-act="edit-client"]')
    check(`${t}: the tabs and "עריכה" read (4.5:1 or more)`, selC >= 4.5 && restC >= 4.5 && editC >= 4.5, { selC, restC, editC })
    await shot('5-client-details')

    await tab('search')
    const srch = await page.evaluate(() => ({
      on: document.querySelector('.ct-det [role="tabpanel"]')?.dataset.panel,
      about: document.querySelector('.ct-det [data-about]')?.innerText.replace(/\s+/g, ' ') ?? '',
      summary: !!document.querySelector('.ct-det [data-summary]'),
      renewal: document.querySelector('.ct-det [data-f="client-renewal"]')?.getAttribute('aria-checked'),
      phone: !!document.querySelector('.ct-det .ct-det-phone'),
      labelled: document.querySelector('.ct-det [role="tabpanel"]')?.getAttribute('aria-labelledby'),
    }))
    check(`${t}: "מה מחפש" shows what the buyer looks for and the urban renewal switch, and only that`, srch.on === 'search' && (srch.summary || /תל אביב/.test(srch.about)) && srch.renewal === 'false' && !srch.phone && srch.labelled === 'ct-tab-search', srch)
    if (mode === 'day') await shot('6-client-search')

    await tab('fits')
    const fits = await page.evaluate(() => {
      const p = document.querySelector('.ct-det [role="tabpanel"]')
      return { on: p?.dataset.panel, rows: p?.querySelectorAll('[data-fit-row]').length ?? 0, empty: !!p?.querySelector('[data-fit-empty]'), all: p?.querySelector('[data-act="match-all"]')?.textContent.trim() ?? '', allH: Math.round(p?.querySelector('[data-act="match-all"]')?.getBoundingClientRect().height ?? 0), phones: /0\d{1,2}-?\d{3}-?\d{4}/.test(p?.textContent ?? ''), n: document.querySelector('.ct-det [data-tab="fits"] .ct-tab-n')?.textContent.trim() ?? '' }
    })
    check(`${t}: "נכסים מתאימים" lists the fitting properties, their number is on the tab, and no phone number is shown`, fits.on === 'fits' && fits.rows > 0 && !fits.empty && fits.n === String(fits.rows) && !fits.phones, fits)
    check(`${t}: one button opens the matches, 44px high`, fits.all === 'פתיחת ההתאמות' && fits.allH >= 44, fits)
    // the green button at the foot of the card is gone (Itzik 27.11.2026): the tab replaces it
    const foot = await page.evaluate(() => ({ match: document.querySelectorAll('.ct-det-foot [data-act="match"]').length, text: document.querySelector('.ct-det-foot')?.textContent ?? '', all: document.querySelectorAll('.ct-det [data-act="match-all"]').length }))
    check(`${t}: the foot of the card has no matches button, the tab holds the only one`, foot.match === 0 && !/מתאימים/.test(foot.text) && /סגירה/.test(foot.text) && foot.all === 1, foot)
    if (mode === 'day') await shot('7-client-fits')

    await tab('notes')
    const noteOn = await page.evaluate(() => ({ on: document.querySelector('.ct-det [role="tabpanel"]')?.dataset.panel, input: !!document.querySelector('.ct-det input.input'), h: Math.round(document.querySelector('.ct-det input.input')?.getBoundingClientRect().height ?? 0) }))
    await write('.ct-det input.input', 'לחזור אחרי החג')
    await wait(300)
    const noted = await clientOf('k1')
    check(`${t}: "הערות" holds the note, and it is saved while typing (the cursor stays in the box)`, noteOn.on === 'notes' && noteOn.input && noteOn.h >= 44 && noted?.note === 'לחזור אחרי החג' && (await page.evaluate(() => document.activeElement?.matches('.ct-det input.input'))), { noteOn, note: noted?.note })
    check(`${t}: the tab stays where it was while the note is typed`, (await tabOn()).panel === 'notes')

    // the arrows of the keyboard walk the tabs (Hebrew: the left arrow is the next tab)
    await page.focus('.ct-det [data-tab="notes"]')
    await page.keyboard.press('ArrowRight')
    await wait(250)
    const back = await tabOn()
    await page.keyboard.press('Home')
    await wait(250)
    const home = await tabOn()
    await page.keyboard.press('ArrowLeft')
    await wait(250)
    const next = await page.evaluate(() => ({ panel: document.querySelector('.ct-det [role="tabpanel"]')?.dataset.panel, focus: document.activeElement?.dataset.tab, stops: [...document.querySelectorAll('.ct-det [role="tab"]')].filter((b) => b.tabIndex === 0).length }))
    check(`${t}: the keyboard's arrows move between the tabs, the focus goes with them, and only the open tab is a Tab stop`, back.panel === 'fits' && home.panel === 'details' && next.panel === 'search' && next.focus === 'search' && next.stops === 1, { back, home, next })
    check(`${t}: the card itself does not scroll sideways`, await page.evaluate(() => document.querySelector('.ct-det').scrollWidth <= document.querySelector('.ct-det').clientWidth + 1))

    // ---- "עריכה": the full form
    await click('.ct-det [data-act="edit-client"]')
    await page.waitForSelector('[data-form="edit-client"]', { visible: true, timeout: 8000 })
    await wait(500)
    const form = await page.evaluate(() => {
      const f = document.querySelector('[data-form="edit-client"]')
      const modal = f?.closest('.modal, [role="dialog"]')
      return {
        title: modal?.querySelector('h2, .modal-title')?.textContent.trim(),
        name: f?.querySelector('[data-f="name"]')?.value,
        phone: f?.querySelector('[data-f="phone"]')?.value,
        type: f?.querySelector('[data-type][aria-checked="true"]')?.dataset.type,
        cities: [...(f?.querySelectorAll('[data-f="cities"] [aria-pressed="true"]') ?? [])].map((b) => b.dataset.city),
        kinds: [...(f?.querySelectorAll('[data-kinds] [aria-pressed="true"]') ?? [])].map((b) => b.dataset.kind),
        max: f?.querySelector('[data-budget="max"]')?.textContent.trim(),
        note: f?.querySelector('[data-f="note"]')?.value,
        save: document.querySelector('[data-act="save-client"]')?.textContent.trim(),
        add: !!document.querySelector('[data-act="add-client"]'),
      }
    })
    check(`${t}: "עריכה" opens "עריכת לקוח", filled with the client: name, phone, kind, city, kind of property, budget and note`, form.title === 'עריכת לקוח' && form.name === 'רון ומיכל ק.' && form.phone === '050-555-0101' && form.type === 'buyer' && form.cities.includes('תל אביב') && JSON.stringify(form.kinds) === JSON.stringify(['דירה']) && /3\.2/.test(form.max ?? '') && form.note === 'לחזור אחרי החג', form)
    check(`${t}: its button says "שמירת השינויים" (not "הוספת הלקוח")`, form.save === 'שמירת השינויים' && !form.add, form)
    await shot('8-client-edit')

    // a phone that is too short is not saved
    await write('[data-form="edit-client"] [data-f="phone"]', '052-55')
    await click('[data-act="save-client"]')
    await wait(400)
    const short = { err: await page.evaluate(() => document.querySelector('[data-form="edit-client"] .ct-err')?.textContent.trim() ?? ''), open: !!(await page.$('[data-form="edit-client"]')), phone: (await clientOf('k1'))?.phone }
    check(`${t}: a phone that is too short is said and not saved`, /קצר/.test(short.err) && short.open && short.phone === '050-555-0101', short)

    await write('[data-form="edit-client"] [data-f="phone"]', '052-555-0177')
    await write('[data-form="edit-client"] [data-f="name"]', 'רון ומיכל קורן')
    await click('[data-form="edit-client"] [data-f="cities"] [data-city="רמת גן"]')
    await write('[data-form="edit-client"] [data-f="note"]', 'אישור משכנתה ביד')
    await click('[data-act="save-client"]')
    await wait(900)
    const saved = await clientOf('k1')
    const shown = await page.evaluate(() => ({
      form: !!document.querySelector('[data-form="edit-client"]'),
      card: !!document.querySelector('.ct-det'),
      title: document.querySelector('.ct-det')?.closest('.modal, [role="dialog"]')?.querySelector('h2, .modal-title')?.textContent.trim(),
      row: document.querySelector('.ct-table tbody tr[data-id="k1"] .ct-name b')?.textContent.trim(),
    }))
    check(`${t}: saving changes the name, the phone, the cities and the note of the client`, saved?.name === 'רון ומיכל קורן' && saved.phone === '052-555-0177' && saved.cities.includes('תל אביב') && saved.cities.includes('רמת גן') && saved.note === 'אישור משכנתה ביד', saved && { name: saved.name, phone: saved.phone, cities: saved.cities, note: saved.note })
    check(`${t}: what was not touched stays as it was: the budget (3.2 million), the neighbourhoods, the kind, the stage`, saved?.sum === 3200000 && saved.neighborhoods?.length === 4 && JSON.stringify(saved.kinds) === JSON.stringify(['דירה']) && saved.stage === 'new' && saved.type === 'buyer' && saved.crmId === 'c7', saved && { sum: saved.sum, hoods: saved.neighborhoods?.length, kinds: saved.kinds, stage: saved.stage })
    check(`${t}: the form closes, the card under it and the table show the new name`, !shown.form && shown.card && shown.title === 'רון ומיכל קורן' && shown.row === 'רון ומיכל קורן', shown)
    await tab('details')
    check(`${t}: "פרטים" shows the new phone`, (await page.evaluate(() => document.querySelector('.ct-det .ct-det-phone')?.textContent.trim())) === '052-555-0177')

    // the phone can be taken off in the form, and "הוסף טלפון" is still there for a client with no phone
    await click('.ct-det [data-act="edit-client"]')
    await page.waitForSelector('[data-form="edit-client"]', { visible: true, timeout: 8000 })
    await wait(450)
    await write('[data-form="edit-client"] [data-f="phone"]', '')
    await click('[data-act="save-client"]')
    await wait(900)
    await tab('details')
    const noPhone = await page.evaluate(() => ({
      saved: JSON.parse(localStorage.getItem('nadlanup-clients-v1') ?? '[]').find((c) => c.id === 'k1')?.phone,
      add: document.querySelector('.ct-det [data-act="add-phone"]')?.textContent.trim(),
      link: document.querySelector('.ct-det [data-act="send-add-phone"]')?.textContent.trim(),
      tag: document.querySelector('.ct-det [data-tag="no-phone"]')?.textContent.trim(),
    }))
    check(`${t}: a client with no phone still has "הוסף טלפון" on the card`, noPhone.saved === '' && noPhone.link === 'הוסף טלפון' && noPhone.tag === 'חסר טלפון' && !!noPhone.add, noPhone)
    if (mode === 'day') await shot('9-client-no-phone')
    await click('.ct-det [data-act="send-add-phone"]')
    await wait(500)
    const asks = !!(await page.$('[data-f="ask-phone"]'))
    check(`${t}: "הוסף טלפון" still asks for the number`, asks)
    await page.keyboard.press('Escape')
    await wait(400)
    if (await page.$('.ct-det')) {
      await page.keyboard.press('Escape')
      await wait(450)
    }

    // ---- a seller: its own tabs, and the edit form of a short kind of client
    await open('k2')
    const sTabs = await page.evaluate(() => [...document.querySelectorAll('.ct-det [role="tab"]')].map((b) => b.textContent.replace(/\d+/g, '').trim()))
    await tab('search')
    const sAbout = await page.evaluate(() => ({ about: document.querySelector('.ct-det [data-about]')?.innerText.replace(/\s+/g, ' ') ?? '', renewal: !!document.querySelector('.ct-det [data-f="client-renewal"]') }))
    check(`${t}: a seller's card has no "קונים מתאימים" button at its foot`, await page.evaluate(() => !!document.querySelector('.ct-det-foot') && !document.querySelector('.ct-det-foot [data-act="match"]') && !/מתאימים/.test(document.querySelector('.ct-det-foot').textContent)))
    check(`${t}: a seller's card: פרטים, על הנכס, קונים מתאימים, הערות; "על הנכס" says what there is, with no renewal switch`, JSON.stringify(sTabs) === JSON.stringify(['פרטים', 'על הנכס', 'קונים מתאימים', 'הערות']) && /גבעתיים/.test(sAbout.about) && /3\.65/.test(sAbout.about) && !sAbout.renewal, { sTabs, sAbout })
    await click('.ct-det [data-act="edit-client"]')
    await page.waitForSelector('[data-form="edit-client"]', { visible: true, timeout: 8000 })
    await wait(450)
    const sForm = await page.evaluate(() => {
      const f = document.querySelector('[data-form="edit-client"]')
      return { more: !!f?.querySelector('[data-edit-more]'), about: f?.querySelector('[data-f="about"]')?.value, sum: f?.querySelector('[data-f="sum"]')?.value, rooms: f?.querySelector('[data-f="rooms-one"]')?.value, cities: [...(f?.querySelectorAll('[data-f="cities"] [aria-pressed="true"]') ?? [])].map((b) => b.dataset.city), search: !!f?.querySelector('[data-search]'), phone: f?.querySelector('[data-f="phone"]')?.value }
    })
    check(`${t}: a seller's edit form has all of the card: the line about them, the city, the rooms, the price and the phone`, sForm.more && sForm.about === 'מוכר 4 חדרים בגבעתיים' && sForm.sum === '3650000' && sForm.rooms === '4' && JSON.stringify(sForm.cities) === JSON.stringify(['גבעתיים']) && !sForm.search && sForm.phone === '052-555-0102', sForm)
    await write('[data-form="edit-client"] [data-f="sum"]', '3700000')
    await write('[data-form="edit-client"] [data-f="about"]', 'דירת 4 חדרים בגבעתיים, למכירה')
    if (phone || mode === 'day') await shot('10-seller-edit', '[data-form="edit-client"] [data-edit-more]')
    await click('[data-act="save-client"]')
    await wait(900)
    const s2 = await clientOf('k2')
    check(`${t}: the seller's price and line are saved, the rest stays (the phone, the kind, the exclusive mark)`, s2?.sum === 3700000 && s2.about === 'דירת 4 חדרים בגבעתיים, למכירה' && s2.phone === '052-555-0102' && s2.type === 'seller' && s2.backToOwner === true && s2.rooms === 4, s2 && { sum: s2.sum, about: s2.about, phone: s2.phone, rooms: s2.rooms })
    await page.keyboard.press('Escape')
    await wait(450)

    // ---- the card opens on "פרטים" again for the next client, and the new client form is as it was
    await open('k3')
    check(`${t}: the next client's card opens on "פרטים" again`, (await tabOn()).panel === 'details')
    await page.keyboard.press('Escape')
    await wait(450)
    await click('[data-act="new-client"]')
    await page.waitForSelector('[data-form="new-client"]', { visible: true, timeout: 8000 })
    await wait(400)
    const fresh = await page.evaluate(() => ({ name: document.querySelector('[data-form="new-client"] [data-f="name"]')?.value, add: document.querySelector('[data-act="add-client"]')?.textContent.trim(), note: !!document.querySelector('[data-form="new-client"] [data-f="note"]'), more: !!document.querySelector('[data-form="new-client"] [data-edit-more]') }))
    check(`${t}: "לקוח חדש" is as it was: empty, "הוספת הלקוח", none of the edit form's extra boxes`, fresh.name === '' && fresh.add === 'הוספת הלקוח' && !fresh.note && !fresh.more, fresh)
    check(`${t}: the clients page does not scroll sideways`, (await sideways()) <= 0)

    check(`${t}: no errors in the page`, errors.length === 0, errors.slice(0, 3))
    await page.close()
  }
}

const failed = results.filter((r) => r.startsWith('FAIL')).length
console.log(results.join('\n'))
console.log(`\n${results.length - failed}/${results.length} passed`)
console.log(failed ? 'SOME CHECKS FAILED' : 'ALL CHECKS PASSED')
await browser.close().catch(() => {})
process.exit(failed ? 1 : 0)
