// The top of the community feed, light (Itzik 19.11.2026): like a social feed on a phone. The hello of the hour, the
// four big cards, the yellow line and the numbered row of topics are gone from the top; in their place one thin line
// (the broker's picture and "מה תרצה לשתף היום?") that opens a sheet from the bottom with four clear choices, each
// going on to the form that was already there. Under it the rooms, as one thin row of small round chips (19.11.2026):
// the chosen one in full green, the others a light grey, "הכול" first; swiped sideways on a phone, one line on a
// computer, and stuck to the top while the feed is scrolled. On a phone the first post is seen without scrolling.
// Nothing that the cards led to was removed.
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
const CHOICES = ['נכס לשיתוף', 'מחפש לקונה', 'מתווך בעיר אחרת', 'שאלה']
const ROOMS = ['הכול', 'נכסים לשיתוף', 'מחפש לקונה', 'מתווך בעיר אחרת', 'ידע ושאלות']
const SHORT = ['הכול', 'נכסים', 'קונים', 'עיר אחרת', 'שאלות']
// on a phone the row is swiped, so the full names are there, and after them the two topics that have no room
// "פוסטים" left the row on 22.11.2026 (Itzik), so one topic with no room of its own is left at the end
const PHONE_ROW = [...ROOMS, 'עסקאות שנסגרו']

const fresh = async (vp, mode = 'day') => {
  const page = await browser.newPage()
  await page.setViewport(vp)
  await page.evaluateOnNewDocument(
    (h, m) => {
      try {
        localStorage.setItem('nadlanup-demo-v1', '1')
        localStorage.setItem('nadlanup-preview-v1', h)
        localStorage.setItem('nadlanup-mode-v1', JSON.stringify({ mode: m, until: 9e15 }))
        // the first visit's hint moves the row for a moment (scripts/rooms-row-check.mjs walks it): seen already here
        localStorage.setItem('nadlanup-rooms-hint-v1', '1')
      } catch {}
    },
    PREVIEW,
    mode,
  )
  return page
}
// the share sheet, opened from the line
const openSheet = async (page) => {
  await tap(page, '[data-act="share"]')
  await page.waitForSelector('[data-share-sheet]', { visible: true, timeout: 4000 })
  await wait(450)
}
const closeAll = async (page) => {
  await page.keyboard.press('Escape')
  await wait(450)
}

for (const [tag, vp] of [
  ['desktop', { width: 1440, height: 900 }],
  ['phone', { width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }],
]) {
  const phone = tag === 'phone'
  const page = await fresh(vp)
  const errors = []
  page.on('pageerror', (e) => errors.push(String(e)))
  await page.goto(green + '/app/community', { waitUntil: 'networkidle0' })
  await wait(900)
  const w = await page.evaluate(() => {
    const vw = document.documentElement.clientWidth
    const seen = (el) => !!el && el.getBoundingClientRect().width > 0 && getComputedStyle(el).display !== 'none'
    const box = (el) => el?.getBoundingClientRect()
    const share = document.querySelector('.wl-share')
    const field = document.querySelector('[data-act="share"]')
    const rooms = [...document.querySelectorAll('[data-room]')].filter(seen)
    const post = document.querySelector('.ci-wrap')
    const nav = document.querySelector('.bottom-nav')
    const navTop = nav && getComputedStyle(nav).display !== 'none' ? nav.getBoundingClientRect().top : innerHeight
    return {
      gone: {
        hello: !!document.querySelector('[data-greeting], .wl-hello'),
        ask: document.body.innerText.includes('מה רוצים לעשות היום'),
        cards: document.querySelectorAll('.wl-card, .wl-cards').length,
        banner: !!document.querySelector('.wl-value') || [...document.querySelectorAll('.wl *')].some((e) => e.textContent.includes('יותר שיתופים, יותר עסקאות')),
        oldLine: seen(document.querySelector('.composer-pill')),
        numbers: seen(document.querySelector('.comm-rail')),
      },
      share: { text: field?.textContent.trim(), h: Math.round(box(field)?.height ?? 0), avatar: !!share?.querySelector('img, .avatar'), blockH: Math.round(box(share)?.height ?? 0) },
      rooms: rooms.map((r) => ({
        id: r.dataset.room,
        label: r.getAttribute('aria-label') ?? r.innerText.trim(),
        shown: r.innerText.trim(),
        h: Math.round(box(r).height),
        tap: Math.round(box(r).height + 2 * Math.abs(parseFloat(getComputedStyle(r, '::after').top) || 0)),
        round: parseFloat(getComputedStyle(r).borderRadius) >= box(r).height / 2,
        on: r.getAttribute('aria-pressed') === 'true',
        bg: getComputedStyle(r).backgroundColor,
        ink: getComputedStyle(r).color,
        top: Math.round(box(r).top),
        left: Math.round(box(r).left),
        right: Math.round(box(r).right),
      })),
      row: (() => {
        const nav = document.querySelector('[data-rooms]')
        const row = document.querySelector('[data-rooms-row]')
        const share = document.querySelector('.wl-share')
        return {
          h: Math.round(box(nav).height),
          sticky: getComputedStyle(nav).position,
          swipes: row.scrollWidth > row.clientWidth + 1,
          left: Math.round(box(row).left),
          right: Math.round(box(row).right),
          underShare: box(nav).top >= box(share).bottom - 1,
          vw,
        }
      })(),
      post: post ? { top: Math.round(box(post).top), navTop: Math.round(navTop), scrolled: Math.round(scrollY) } : null,
      values: [...document.querySelectorAll('.feed-value')].map((v) => v.textContent.trim()),
      addTile: (() => {
        const t = document.querySelector('.story-add strong')
        if (!t) return null
        const tile = t.closest('.story-add').getBoundingClientRect()
        const r = t.getBoundingClientRect()
        return { text: t.textContent.trim(), color: getComputedStyle(t).color, bg: getComputedStyle(t.closest('.story-add')).backgroundColor, inside: r.top >= tile.top && r.bottom <= tile.bottom + 0.5 }
      })(),
      dashes: /[\u2013\u2014]/.test(document.body.innerText),
      wide: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    }
  })
  check(`${tag}: gone from the top: the hello, "מה רוצים לעשות היום?", the four big cards, the yellow line, the old "מה חדש אצלך" line`, !w.gone.hello && !w.gone.ask && w.gone.cards === 0 && !w.gone.banner && !w.gone.oldLine, w.gone)
  if (phone) check('phone: the numbered row of topics is gone', !w.gone.numbers, w.gone)
  check(`${tag}: one thin line: the broker's picture and "מה תרצה לשתף היום?"`, w.share.text === 'מה תרצה לשתף היום?' && w.share.avatar && w.share.h >= 44 && w.share.blockH <= 76, w.share)
  const grey = w.rooms.filter((r) => !r.on)
  check(`${tag}: the rooms are small round chips in one thin row, under the share line`, w.rooms.every((r) => r.h <= 40 && r.round && r.top === w.rooms[0].top) && w.row.h <= 52 && w.row.underShare, { row: w.row, h: w.rooms.map((r) => r.h) })
  check(`${tag}: small to the eye, full to the finger: each chip takes a tap 44px high`, w.rooms.every((r) => r.tap >= 44), w.rooms.map((r) => r.tap))
  check(`${tag}: "הכול" is first and chosen: full green with white words; the others are one light grey`, w.rooms[0].id === 'all' && w.rooms[0].on && w.rooms[0].bg === 'rgb(10, 122, 79)' && w.rooms[0].ink === 'rgb(255, 255, 255)' && w.rooms[0].right >= Math.max(...w.rooms.map((r) => r.right)) && grey.length === w.rooms.length - 1 && grey.every((r) => r.bg === grey[0].bg && /rgba\(.*, 0\.0\d+\)/.test(r.bg)), w.rooms.map((r) => [r.id, r.on, r.bg, r.ink]))
  if (phone) {
    check('phone: the row is swiped sideways: the full names, then the topic with no room of its own; the page itself does not slide', w.rooms.map((r) => r.shown).join('|') === PHONE_ROW.join('|') && w.row.swipes && w.wide <= 1, { row: w.row, names: w.rooms.map((r) => r.shown) })
    check('phone: it opens with "הכול" in full view at the start of the row', w.rooms[0].right <= w.row.vw && w.rooms[0].left >= 0, w.rooms[0])
    check('phone: the first post is seen without scrolling (its top is well above the bottom bar)', !!w.post && w.post.scrolled === 0 && w.post.navTop - w.post.top >= 120, w.post)
  } else {
    const names = w.rooms.map((r) => r.shown).join('|')
    check('desktop: the row fits in one line, five chips, nothing to swipe and none outside it', (names === SHORT.join('|') || names === ROOMS.join('|')) && !w.row.swipes && w.rooms.every((r) => r.left >= w.row.left - 0.5 && r.right <= w.row.right + 0.5), { row: w.row, rooms: w.rooms.map((r) => [r.shown, r.left, r.right]) })
    check('desktop: the first post is seen without scrolling', !!w.post && w.post.top < 900 - 150, w.post)
  }
  check(`${tag}: each room keeps its full name for a screen reader and on hover`, w.rooms.slice(0, 5).map((r) => r.label).join('|') === ROOMS.join('|'), w.rooms.map((r) => r.label))
  check(`${tag}: the short lines between the posts are still there, with no numbers`, w.values.length >= 1 && w.values.every((v) => !/\d/.test(v)), w.values)
  check(`${tag}: no sideways scroll, no long dashes`, w.wide <= 1 && !w.dashes, w)
  check(`${tag}: the "סטורי חדש" tile shows its words (dark on the light card, inside the tile)`, !!w.addTile && w.addTile.text === 'סטורי חדש' && w.addTile.color !== w.addTile.bg && w.addTile.color !== 'rgb(255, 255, 255)' && w.addTile.inside, w.addTile)
  await page.screenshot({ path: `${out}/${tag}-1-feed.png` })

  // ---- nothing floats over the line; on a phone the day / night switch is a small button in the top bar
  const cover = await page.evaluate(() => {
    const hit = (a, b) => a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom
    const a = document.querySelector('.wl').getBoundingClientRect()
    const b = document.querySelector('[data-rooms]').getBoundingClientRect()
    const line = { left: Math.min(a.left, b.left), right: Math.max(a.right, b.right), top: a.top, bottom: b.bottom }
    const floats = [...document.querySelectorAll('.dn, .dn-compact')].filter((e) => getComputedStyle(e).display !== 'none' && getComputedStyle(e).position === 'fixed').map((e) => e.getBoundingClientRect())
    const compact = document.querySelector('.dn-compact')
    return {
      covered: floats.some((f) => hit(f, line)),
      compact: !!compact && getComputedStyle(compact).display !== 'none',
      tagline: [...document.querySelectorAll('.side-principle > div')].map((d) => d.textContent.replace(/\s+/g, ' ').trim()),
      old: document.body.innerText.includes('גזירות'),
    }
  })
  check(`${tag}: nothing floats over the share line and the rooms`, !cover.covered, cover)
  if (phone) {
    // 19.11.2026: light or dark is chosen in the menu that the broker's picture opens (scripts/top-bar-check.mjs
    // walks it); nothing of it is left in the top bar or floating over the feed
    const sw = await page.evaluate(() => [...document.querySelectorAll('.dn, .dn-compact')].filter((e) => e.getBoundingClientRect().width > 0).length)
    check('phone: no day / night switch in the top bar or over the feed (it is in the profile menu)', sw === 0 && !cover.compact, { sw, compact: cover.compact })
  } else {
    // the small 0% / 100% box left the side menu on 27.11.2026 (scripts/prompt16-check.mjs walks it)
    check('desktop: the side menu has no 0% / 100% box, and no "גזירות"', cover.tagline.length === 0 && !cover.old, cover.tagline)
  }

  // ---- the line opens the sheet: four clear choices, from the bottom on a phone
  await openSheet(page)
  const sheet = await page.evaluate(() => {
    const m = document.querySelector('.modal')
    const r = m.getBoundingClientRect()
    return {
      title: m.querySelector('h2')?.textContent.trim(),
      choices: [...m.querySelectorAll('.wl-choice')].map((c) => ({ t: c.querySelector('b').textContent.trim(), line: c.querySelector('small').textContent.trim(), icon: !!c.querySelector('svg'), h: Math.round(c.getBoundingClientRect().height) })),
      also: [...m.querySelectorAll('.wl-also button')].map((b) => ({ t: b.textContent.trim(), h: Math.round(b.getBoundingClientRect().height) })),
      bottom: Math.round(innerHeight - r.bottom),
      width: Math.round(r.width),
      h: Math.round(r.height),
      vh: innerHeight,
      emoji: /\p{Extended_Pictographic}/u.test(m.textContent),
    }
  })
  check(`${tag}: the sheet is titled "מה תרצה לשתף היום?" and has the four choices, in order, each with an icon and a line`, sheet.title === 'מה תרצה לשתף היום?' && sheet.choices.map((c) => c.t).join('|') === CHOICES.join('|') && sheet.choices.every((c) => c.icon && c.line && c.h >= 56) && !sheet.emoji, sheet)
  check(`${tag}: what the old line also offered is still here, quieter: עדכון, תמונה, עסקה שנסגרה`, sheet.also.map((a) => a.t).join('|') === 'עדכון|תמונה|עסקה שנסגרה' && sheet.also.every((a) => a.h >= 44), sheet.also)
  if (phone) check('phone: the sheet comes from the bottom, small (under two thirds of the screen), full width', sheet.bottom === 0 && sheet.width === 390 && sheet.h <= sheet.vh * 0.67, sheet)
  else check('desktop: the sheet is a small window', sheet.width <= 600 && sheet.h <= 620, sheet)
  await page.screenshot({ path: `${out}/${tag}-2-sheet.png` })
  await closeAll(page)
  check(`${tag}: Escape closes the sheet`, !(await page.$('[data-share-sheet]')))

  // ---- each choice goes on to the form that was already there
  for (const [intent, sel] of [
    ['property', '[data-picker="property"]'],
    ['buyer', '[data-picker="buyer"]'],
    ['referral', '[data-picker="referral"]'],
  ]) {
    await openSheet(page)
    await tap(page, `[data-intent="${intent}"]`)
    const ok = await page.waitForSelector(sel, { visible: true, timeout: 4000 }).then(() => true).catch(() => false)
    // the sheet fades out while the form comes in: count the windows once that is over
    await wait(600)
    const one = await page.evaluate(() => document.querySelectorAll('.modal').length)
    check(`${tag}: "${intent}" in the sheet opens its form, and the sheet steps aside`, ok && one === 1, { ok, one })
    if (intent === 'property') await page.screenshot({ path: `${out}/${tag}-3-property-form.png` })
    await closeAll(page)
  }
  for (const [intent, want] of [
    ['learn', /שאל|שאלות וידע|ידע/],
    ['post', /./],
    ['photo', /./],
    ['win', /עסק/],
  ]) {
    await openSheet(page)
    await tap(page, `[data-intent="${intent}"]`)
    await wait(800)
    const c = await page.evaluate(() => {
      const m = document.querySelector('.modal')
      return { open: !!m, share: !!m?.querySelector('[data-share-sheet]'), text: m?.textContent.replace(/\s+/g, ' ').slice(0, 160), area: !!m?.querySelector('textarea') }
    })
    check(`${tag}: "${intent}" in the sheet opens the post window`, c.open && !c.share && c.area && want.test(c.text), c)
    await closeAll(page)
  }

  // ---- the referral: a seller in another city, published and kept in the CRM (as before, now from the sheet)
  await openSheet(page)
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
  check(`${tag}: the referral is published for באר שבע, and the seller is saved in the CRM`, !!ref.it && ref.it.side === 'seller' && /באר שבע/.test(ref.it.title) && ref.cl?.type === 'seller' && /topic=referrals/.test(ref.url) && /נשמרה ב-CRM/.test(ref.toast ?? ''), ref)
  check(`${tag}: the referral carries no name and no phone`, !!ref.it && !ref.it.json.includes('יוסי') && !ref.it.json.includes('0190'), ref.it?.title)

  // ---- the post that was just published: its "חדש" mark covers nothing, and the topic's name reads (19.11.2026)
  await page.evaluate(() => document.querySelector('.fb.ci.is-fresh')?.scrollIntoView({ block: 'center' }))
  await wait(700)
  const mark = await page.evaluate(() => {
    const post = document.querySelector('.fb.ci.is-fresh')
    const m = post?.querySelector('.fb-new')
    if (!m) return null
    const hit = (a, b) => a.left < b.right - 0.5 && b.left < a.right - 0.5 && a.top < b.bottom - 0.5 && b.top < a.bottom - 0.5
    const r = m.getBoundingClientRect()
    const topic = post.querySelector('.fb-topic')
    const others = [...post.querySelectorAll('.fb-name > *, .fb-meta > *, .fb-menu')].filter((e) => e !== m)
    const lin = (v) => (v / 255 <= 0.03928 ? v / 255 / 12.92 : ((v / 255 + 0.055) / 1.055) ** 2.4)
    const lum = (c) => {
      const [x, y, z] = c.match(/[\d.]+/g).map(Number)
      return 0.2126 * lin(x) + 0.7152 * lin(y) + 0.0722 * lin(z)
    }
    const a = lum(getComputedStyle(topic).color)
    const b = lum(getComputedStyle(post).backgroundColor)
    return {
      text: m.textContent.trim(),
      inMeta: !!m.closest('.fb-meta'),
      covers: others.filter((e) => hit(r, e.getBoundingClientRect())).map((e) => e.className || e.tagName),
      inside: r.left >= post.getBoundingClientRect().left && r.right <= post.getBoundingClientRect().right,
      topic: topic.textContent.trim(),
      contrast: Math.round(((Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)) * 10) / 10,
    }
  })
  check(`${tag}: a post just published carries "חדש" in the line under the name, over nothing`, !!mark && mark.text === 'חדש' && mark.inMeta && mark.covers.length === 0 && mark.inside, mark)
  check(`${tag}: the topic's name on it ("מתווך בעיר אחרת") reads clearly on the white post (4.5 to 1 at least)`, !!mark && mark.topic === 'מתווך בעיר אחרת' && mark.contrast >= 4.5, mark)
  await page.screenshot({ path: `${out}/${tag}-6-fresh-post.png` })

  // ---- the referrals room has one name everywhere: "מתווך בעיר אחרת"
  await page.goto(green + '/app/community?topic=referrals', { waitUntil: 'networkidle0' })
  await wait(900)
  const names = await page.evaluate(() => ({
    room: document.querySelector('[data-room="referrals"]')?.getAttribute('aria-label'),
    on: document.querySelector('[data-room="referrals"]')?.getAttribute('aria-pressed'),
    line: !!document.querySelector('[data-act="share"]'),
    // the room's page opens with the finder, titled "מציאת מתווך בעיר אחרת" (17.11.2026)
    head: document.querySelector('[data-finder] h2, .topic-head h2')?.textContent.trim(),
    rail: [...document.querySelectorAll('.comm-rail .rail-label, .rail-label')].map((x) => x.textContent.trim()).filter((t) => /הפני|בעיר אחרת/.test(t)),
    posts: [...new Set([...document.querySelectorAll('.fb.ci .fb-topic')].map((t) => t.textContent.trim()))],
    old: /הפניות בין מתווכים/.test(document.body.innerText),
  }))
  check(`${tag}: the referrals room is called "מתווך בעיר אחרת" everywhere (rooms, list, posts), its page "מציאת מתווך בעיר אחרת"`, names.room === 'מתווך בעיר אחרת' && names.on === 'true' && names.head === 'מציאת מתווך בעיר אחרת' && names.posts.join() === 'מתווך בעיר אחרת' && names.rail.every((t) => t === 'מתווך בעיר אחרת') && !names.old, names)
  check(`${tag}: inside a room the share line and the rooms stay at the top`, names.line)

  // ---- a room is one tap, as before
  await page.goto(green + '/app/community', { waitUntil: 'networkidle0' })
  await wait(700)
  await tap(page, '[data-room="seeking"]')
  await wait(900)
  const room = await page.evaluate(() => ({ on: document.querySelector('[data-room="seeking"]')?.getAttribute('aria-pressed'), head: document.querySelector('.topic-head h2')?.textContent, pressed: document.querySelectorAll('[data-room][aria-pressed="true"]').length }))
  check(`${tag}: a room opens with one tap, and only its chip is green`, room.on === 'true' && room.head === 'מחפש לקונה' && room.pressed === 1, room)
  await tap(page, '[data-room="seeking"]')
  await wait(700)
  check(`${tag}: a tap on the chosen room goes back to "הכול"`, await page.evaluate(() => document.querySelector('[data-room="all"]').getAttribute('aria-pressed') === 'true'))

  // ---- the row stays at the top while the feed is scrolled: thin, under the app's top bar, and it still works
  await page.evaluate(() => window.scrollTo({ top: 1400, behavior: 'instant' }))
  await wait(700)
  const stuck = await page.evaluate(() => {
    const nav = document.querySelector('[data-rooms]').getBoundingClientRect()
    const bar = document.querySelector('.topbar')
    const barBottom = bar && getComputedStyle(bar).display !== 'none' ? Math.round(bar.getBoundingClientRect().bottom) : 0
    const share = document.querySelector('.wl-share').getBoundingClientRect()
    // what is drawn in the middle of the row: the row itself or one of its chips, never a post
    const top = document.elementFromPoint(nav.left + nav.width / 2, nav.top + nav.height / 2)
    return { y: Math.round(scrollY), top: Math.round(nav.top), barBottom, h: Math.round(nav.height), shareGone: share.bottom < barBottom + 1, onTop: !!top?.closest('[data-rooms]'), bg: getComputedStyle(document.querySelector('[data-rooms]')).backgroundColor }
  })
  check(`${tag}: scrolled down, the row is stuck at the top (under the app's bar on a phone), thin, over the posts`, stuck.y > 1000 && (stuck.top === stuck.barBottom || stuck.top === stuck.barBottom - 1) && stuck.h <= 52 && stuck.shareGone && stuck.onTop && !/rgba\(.*, 0(\.\d+)?\)$/.test(stuck.bg), stuck)
  await page.screenshot({ path: `${out}/${tag}-4-stuck.png` })
  await tap(page, '[data-room="coop"]')
  await wait(900)
  const fromStuck = await page.evaluate(() => ({ on: document.querySelector('[data-room="coop"]').getAttribute('aria-pressed'), url: location.search }))
  check(`${tag}: a chip works from the stuck row too`, fromStuck.on === 'true' && /topic=coop/.test(fromStuck.url), fromStuck)
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }))
  await wait(400)

  if (phone) {
    // the chips past the edge: swipe the row, tap, and the chosen chip is brought into sight
    await page.evaluate(() => document.querySelector('[data-room="wins"]').click())
    await wait(1100)
    const wins = await page.evaluate(() => {
      const row = document.querySelector('[data-rooms-row]').getBoundingClientRect()
      const c = document.querySelector('[data-room="wins"]')
      const r = c.getBoundingClientRect()
      return { url: location.search, on: c.getAttribute('aria-pressed'), inSight: r.left >= row.left - 1 && r.right <= row.right + 1, head: document.querySelector('.topic-head h2')?.textContent.trim() }
    })
    check('phone: the topics with no room of their own are chips at the end of the row; choosing one opens it and brings its chip into sight', /topic=wins/.test(wins.url) && wins.on === 'true' && wins.inSight && /עסקאות/.test(wins.head ?? ''), wins)
    await page.screenshot({ path: `${out}/${tag}-5-far-chip.png` })
  } else {
    const rail = await page.evaluate(() => ({ list: [...document.querySelectorAll('.comm-rail .rail-btn')].filter((b) => b.getBoundingClientRect().width > 0).length, extra: [...document.querySelectorAll('.wl-room.is-extra')].filter((b) => b.getBoundingClientRect().width > 0).length }))
    check('desktop: the side list still has every topic (so the two extra chips are not shown here)', rail.list >= 7 && rail.extra === 0, rail)
  }
  check(`${tag}: no errors`, errors.length === 0, errors)
  await page.close()

  // ---- at night
  const night = await fresh(vp, 'night')
  await night.goto(green + '/app/community', { waitUntil: 'networkidle0' })
  await wait(900)
  await night.screenshot({ path: `${out}/${tag}-night-1-feed.png` })
  await openSheet(night)
  await night.screenshot({ path: `${out}/${tag}-night-2-sheet.png` })
  await night.close()
}

console.log(fails ? '\nSOME CHECKS FAILED' : '\nALL CHECKS PASSED')
await Promise.race([browser.close().catch(() => {}), wait(4000)])
process.exit(0)
