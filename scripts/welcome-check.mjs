// The community feed's welcome (17.11.2026): a personal hello that changes with the hour, four big cards that go
// straight to the action, the four rooms clear at the top, and short lines on what sharing brings, with no numbers.
// Usage: node scripts/welcome-check.mjs [outDir]     (BASE_GREEN overrides the address)
import puppeteer from 'puppeteer-core'
import { mkdirSync } from 'node:fs'

const green = process.env.BASE_GREEN ?? 'http://localhost:5240/NADLANIL-DEMO/green'
const out = process.argv[2] ?? '_shots/welcome'
mkdirSync(out, { recursive: true })
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
const browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--hide-scrollbars'] })
let fails = 0
const check = (name, ok, info) => {
  if (!ok) fails++
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok || info === undefined ? '' : '  [' + JSON.stringify(info) + ']'}`)
}
const PREVIEW = '6d5eaaca072bf02f647051d8688d1337a4ab7a6cb92a2a8b3924cf91fda89e8b'
const tap = (page, sel) => page.$eval(sel, (el) => (el.scrollIntoView({ block: 'center' }), el.click()))
const CARDS = ['יש לי נכס ואני רוצה לשתף אותו עם מתווכים', 'יש לי קונה ואני רוצה למצוא לו דירה', 'יש לי מוכר בעיר אחרת ואני רוצה מתווך שם', 'אני רוצה לשאול או ללמוד']
const ROOMS = ['הכול', 'נכסים לשיתוף', 'מחפש לקונה', 'מתווך בעיר אחרת', 'ידע ושאלות']

const fresh = async (vp, iso) => {
  const page = await browser.newPage()
  await page.setViewport(vp)
  await page.evaluateOnNewDocument(
    (h, iso) => {
      try {
        localStorage.setItem('nadlanup-demo-v1', '1')
        localStorage.setItem('nadlanup-preview-v1', h)
        localStorage.setItem('nadlanup-mode-v1', JSON.stringify({ mode: 'day', until: 9e15 }))
      } catch {}
      if (iso) {
        // a fixed clock, to see the hello of each hour
        const Real = Date
        const t = new Real(iso).getTime()
        // eslint-disable-next-line no-global-assign
        Date = class extends Real {
          constructor(...a) {
            if (a.length) super(...a)
            else super(t)
          }
          static now() {
            return t
          }
        }
      }
    },
    PREVIEW,
    iso,
  )
  return page
}

// ---- the hello changes with the hour, by Israel's clock, exactly at the edges Itzik set (November: UTC+2)
for (const [il, iso, hello] of [
  ['04:59', '2026-11-17T02:59:00Z', 'לילה טוב'],
  ['05:00', '2026-11-17T03:00:00Z', 'בוקר טוב'],
  ['11:59', '2026-11-17T09:59:00Z', 'בוקר טוב'],
  ['12:00', '2026-11-17T10:00:00Z', 'צהריים טובים'],
  ['17:59', '2026-11-17T15:59:00Z', 'צהריים טובים'],
  ['18:00', '2026-11-17T16:00:00Z', 'ערב טוב'],
  ['21:59', '2026-11-17T19:59:00Z', 'ערב טוב'],
  ['22:00', '2026-11-17T20:00:00Z', 'לילה טוב'],
]) {
  const page = await fresh({ width: 1280, height: 860 }, iso)
  await page.goto(green + '/app/community', { waitUntil: 'networkidle0' })
  await wait(400)
  const g = await page.evaluate(() => {
    const h = document.querySelector('[data-greeting]')
    return { text: h?.textContent.trim(), icon: !!h?.querySelector('.wl-time svg'), emoji: /\p{Extended_Pictographic}/u.test(h?.textContent ?? '') }
  })
  check(`${il} in Israel: "${hello}, מאיה", with a small icon and no emoji`, g.text === `${hello}, מאיה` && g.icon && !g.emoji, g)
  await page.close()
}

for (const [tag, vp] of [
  ['desktop', { width: 1440, height: 900 }],
  ['phone', { width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }],
]) {
  const page = await fresh(vp)
  await page.goto(green + '/app/community', { waitUntil: 'networkidle0' })
  await wait(900)
  const w = await page.evaluate(() => {
    const vw = innerWidth
    return {
      ask: document.querySelector('.wl-ask')?.textContent.trim(),
      figures: document.querySelectorAll('.mast-fig').length,
      cards: [...document.querySelectorAll('[data-intent]')].map((c) => ({ t: c.querySelector('b')?.textContent, h: Math.round(c.getBoundingClientRect().height), icon: !!c.querySelector('svg') })),
      rooms: [...document.querySelectorAll('[data-room]')].map((r) => ({ t: r.textContent.trim(), h: Math.round(r.getBoundingClientRect().height), inside: r.getBoundingClientRect().left >= 0 && r.getBoundingClientRect().right <= vw })),
      values: [...document.querySelectorAll('[data-value]')].map((v) => v.textContent.trim()),
      wide: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    }
  })
  check(`${tag}: a personal hello and "מה רוצים לעשות היום?", the old figures are gone`, w.ask === 'מה רוצים לעשות היום?' && w.figures === 0, w)
  check(`${tag}: four big cards with an icon, in the right words`, JSON.stringify(w.cards.map((c) => c.t)) === JSON.stringify(CARDS) && w.cards.every((c) => c.h >= 80 && c.icon), w.cards)
  check(`${tag}: the four rooms at the top, clear and all on screen (and "הכול")`, JSON.stringify(w.rooms.map((r) => r.t)) === JSON.stringify(ROOMS) && w.rooms.every((r) => r.h >= 44 && r.inside), w.rooms)
  check(`${tag}: short lines on what sharing brings, along the page, with no numbers`, w.values.length >= 2 && w.values.every((v) => !/\d/.test(v)), w.values)
  check(`${tag}: no sideways scroll`, w.wide <= 1, w.wide)
  await page.screenshot({ path: `${out}/${tag}-1-welcome.png` })

  // ---- nothing floats over the cards; on a phone the day / night switch is a small button in the top bar
  const cover = await page.evaluate(() => {
    const hit = (a, b) => a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom
    const cards = [...document.querySelectorAll('[data-intent]')].map((c) => c.getBoundingClientRect())
    const floats = [...document.querySelectorAll('.dn, .dn-compact')].filter((e) => getComputedStyle(e).display !== 'none' && getComputedStyle(e).position === 'fixed').map((e) => e.getBoundingClientRect())
    const compact = document.querySelector('.dn-compact')
    return {
      covered: floats.some((f) => cards.some((c) => hit(f, c))),
      compact: !!compact && getComputedStyle(compact).display !== 'none',
      tagline: [...document.querySelectorAll('.side-principle > div')].map((d) => d.textContent.replace(/\s+/g, ' ').trim()),
      old: document.body.innerText.includes('גזירות'),
    }
  })
  check(`${tag}: nothing floats over the four cards`, !cover.covered, cover)
  if (tag === 'phone') {
    const before = await page.evaluate(() => document.documentElement.dataset.mode)
    await page.click('.dn-compact')
    await wait(400)
    const after = await page.evaluate(() => document.documentElement.dataset.mode)
    check(`phone: the small button in the top bar switches between light and dark`, cover.compact && before !== after, { before, after })
    await page.click('.dn-compact')
    await wait(300)
  } else {
    check(`desktop: the profile card says "0% עמלה למשרד" (no "גזירות")`, cover.tagline.some((t) => t.replace(/\s/g, '') === '0%עמלהלמשרד') && !cover.old, cover.tagline)
  }
  await page.evaluate(() => document.querySelector('.feed-value')?.scrollIntoView({ block: 'center' }))
  await wait(400)
  await page.screenshot({ path: `${out}/${tag}-2-value-line.png` })

  // ---- each card goes straight to its action
  for (const [intent, sel] of [
    ['property', '[data-picker="property"]'],
    ['buyer', '[data-picker="buyer"]'],
    ['referral', '[data-picker="referral"]'],
  ]) {
    await tap(page, `[data-intent="${intent}"]`)
    const ok = await page.waitForSelector(sel, { visible: true, timeout: 4000 }).then(() => true).catch(() => false)
    check(`${tag}: the "${intent}" card opens its action at once`, ok)
    if (intent === 'referral') await page.screenshot({ path: `${out}/${tag}-3-referral.png` })
    await page.keyboard.press('Escape')
    await wait(450)
  }
  await tap(page, '[data-intent="learn"]')
  await wait(700)
  const learn = await page.evaluate(() => {
    const m = document.querySelector('.modal')
    return { open: !!m, text: m?.textContent.replace(/\s+/g, ' ').slice(0, 200), area: !!m?.querySelector('textarea') }
  })
  check(`${tag}: "אני רוצה לשאול או ללמוד" opens a question in "שאלות וידע"`, learn.open && learn.area && /שאל|שאלות וידע/.test(learn.text), learn)
  await page.keyboard.press('Escape')
  await wait(450)

  // ---- the referral: a seller in another city, published and kept in the CRM
  await tap(page, '[data-intent="referral"]')
  await page.waitForSelector('[data-picker="referral"]', { visible: true })
  await tap(page, '[data-picker="referral"] [data-city="באר שבע"]')
  await page.type('[data-picker="referral"] [data-f="what"]', '3 חדרים, יורשים שרוצים למכור')
  await page.type('[data-picker="referral"] [data-f="name"]', 'יוסי ל.')
  await page.type('[data-picker="referral"] [data-f="phone"]', '052-555-0190')
  await tap(page, '[data-act="send-referral"]')
  await wait(1300)
  const ref = await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem('brokers-demo-state-v5') ?? '{}')
    const it = (s.items ?? []).find((x) => x.topicId === 'referrals' && x.authorId === 'b1' && x.referral?.toCity === 'באר שבע')
    const cl = JSON.parse(localStorage.getItem('nadlanup-clients-v1') ?? '[]').find((c) => c.name === 'יוסי ל.')
    return { it: it && { title: it.title, side: it.referral.side, json: JSON.stringify(it) }, cl: cl && { type: cl.type, phone: cl.phone }, url: location.search, toast: document.querySelector('.toast')?.textContent }
  })
  check(`${tag}: the referral is published in "הפניות" for באר שבע, and the seller is saved in the CRM`, !!ref.it && ref.it.side === 'seller' && /באר שבע/.test(ref.it.title) && ref.cl?.type === 'seller' && /topic=referrals/.test(ref.url) && /נשמרה ב-CRM/.test(ref.toast ?? ''), ref)
  check(`${tag}: the referral carries no name and no phone`, !!ref.it && !ref.it.json.includes('יוסי') && !ref.it.json.includes('0190'), ref.it?.title)

  // ---- the referrals room has one name everywhere: "מתווך בעיר אחרת"
  await page.goto(green + '/app/community?topic=referrals', { waitUntil: 'networkidle0' })
  await wait(900)
  const names = await page.evaluate(() => ({
    room: document.querySelector('[data-room="referrals"]')?.textContent.trim(),
    head: document.querySelector('.topic-head h2')?.textContent.trim(),
    rail: [...document.querySelectorAll('.comm-rail .rail-label, .rail-label')].map((x) => x.textContent.trim()).filter((t) => /הפני|בעיר אחרת/.test(t)),
    posts: [...new Set([...document.querySelectorAll('.fb.ci .fb-topic')].map((t) => t.textContent.trim()))],
    old: /הפניות בין מתווכים/.test(document.body.innerText),
  }))
  check(`${tag}: the referrals room is called "מתווך בעיר אחרת" everywhere (rooms, title, list, posts)`, names.room === 'מתווך בעיר אחרת' && names.head === 'מתווך בעיר אחרת' && names.posts.join() === 'מתווך בעיר אחרת' && names.rail.every((t) => t === 'מתווך בעיר אחרת') && !names.old, names)

  // ---- a room is one tap
  await page.goto(green + '/app/community', { waitUntil: 'networkidle0' })
  await wait(700)
  await tap(page, '[data-room="seeking"]')
  await wait(900)
  const room = await page.evaluate(() => ({ on: document.querySelector('[data-room="seeking"]')?.getAttribute('aria-pressed'), head: document.querySelector('.topic-head h2')?.textContent }))
  check(`${tag}: a room opens with one tap`, room.on === 'true' && room.head === 'מחפש לקונה', room)
  await page.close()
}

console.log(fails ? '\nSOME CHECKS FAILED' : '\nALL CHECKS PASSED')
await Promise.race([browser.close().catch(() => {}), wait(4000)])
process.exit(0)
