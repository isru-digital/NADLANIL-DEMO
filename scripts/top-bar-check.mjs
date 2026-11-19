// The thin top of the community feed (Itzik 19.11.2026): every line at the top pushes the posts down.
//  1. on a phone the app's top bar is one thin row: the name on the right; on the left the search, the bell and the
//     broker's picture
//  2. the name with "יציאה" is in the menu that the picture opens (with the way in for whoever is not signed in)
//  3. the search field and "כל הערים" left the page: the search icon opens a search screen, with the cities in it
//  4. "שדרג למשרד NadlanUP" left the top of the feed: it is in that menu, and once, quietly, among the posts
//  5. day / night is in that menu
// Nothing was removed. Against the LOCAL test server (for a real session) and the green dev server; saves screenshots.
// Usage: node scripts/top-bar-check.mjs [outDir]
import puppeteer from 'puppeteer-core'
import { mkdirSync } from 'node:fs'

const API = process.env.API ?? 'http://localhost:8787'
const ORIGIN = 'http://localhost:5240'
const green = 'http://localhost:5240/NADLANIL-DEMO/green'
if (!/^http:\/\/(localhost|127\.0\.0\.1)/.test(API)) throw new Error('local test server only')
const out = process.argv[2] ?? '_shots/top-bar'
mkdirSync(out, { recursive: true })
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
let fails = 0
const check = (name, ok, info) => {
  if (!ok) fails++
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok || info === undefined ? '' : '  [' + JSON.stringify(info) + ']'}`)
}
const api = async (path, { method = 'GET', body } = {}) => {
  const res = await fetch(API + path, { method, headers: { origin: ORIGIN, ...(body ? { 'content-type': 'application/json' } : {}) }, body: body ? JSON.stringify(body) : undefined })
  return res.json().catch(() => ({}))
}
const PHONE = { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true }
const DESK = { width: 1440, height: 900 }
const browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--hide-scrollbars'] })

// the one of two copies that is on screen (the icons are in the phone's bar and in the computer's top row)
const tap = (page, sel) => page.evaluate((s) => [...document.querySelectorAll(s)].find((e) => e.getBoundingClientRect().width > 0)?.click(), sel)
const closeAll = async (page) => {
  await page.keyboard.press('Escape')
  await wait(450)
}
async function fresh(vp, { mode = 'day', demo = true, session } = {}) {
  const ctx = await browser.createBrowserContext()
  const page = await ctx.newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push(String(e)))
  await page.setViewport(vp)
  await page.goto(green + '/about', { waitUntil: 'load' })
  await page.evaluate(
    (m, d, s) => {
      localStorage.setItem('nadlanup-mode-v1', JSON.stringify({ mode: m, until: Date.now() + 9e9 }))
      if (d) localStorage.setItem('nadlanup-demo-v1', '1')
      if (s) localStorage.setItem('nadlanup-session-v1', JSON.stringify(s))
    },
    mode,
    demo,
    session ?? null,
  )
  return { ctx, page, errors }
}
const feed = async (page, path = '/app/community') => {
  await page.goto(green + path, { waitUntil: 'networkidle0' })
  await page.waitForSelector('[data-welcome]', { timeout: 15000 })
  await wait(900)
}

for (const [dev, vp] of [
  ['phone', PHONE],
  ['desktop', DESK],
]) {
  const phone = dev === 'phone'
  const { ctx, page, errors } = await fresh(vp)
  await feed(page)

  // ---------------------------------------------------------------- 1. the top
  const top = await page.evaluate(() => {
    const seen = (el) => !!el && el.getBoundingClientRect().width > 0 && getComputedStyle(el).visibility !== 'hidden'
    const box = (el) => el.getBoundingClientRect()
    const bar = document.querySelector('.topbar')
    const ta = [...document.querySelectorAll('.ta')].find(seen)
    const row = ta?.closest('.topbar, .main-back')
    const btns = ta ? [...ta.querySelectorAll('button')] : []
    const brand = [...document.querySelectorAll('.topbar-brand, .sidebar-brand')].find(seen)
    const post = document.querySelector('.ci-wrap')
    return {
      barShown: seen(bar),
      barH: seen(bar) ? Math.round(box(bar).height) : 0,
      rowIs: row?.className.split(' ')[0],
      oneRow: !!ta && !!row && Math.abs(box(ta).top + box(ta).height / 2 - (box(row).top + box(row).height / 2)) <= 6,
      acts: btns.map((b) => b.dataset.act),
      // right to left: the search first, the picture last (at the far left)
      lefts: btns.map((b) => Math.round(box(b).left)),
      sizes: btns.map((b) => [Math.round(box(b).width), Math.round(box(b).height)]),
      labels: btns.map((b) => b.getAttribute('aria-label')),
      brand: brand?.textContent.replace(/\s+/g, ' ').trim(),
      brandRight: brand && ta ? box(brand).left > box(ta).right : false,
      back: seen(document.querySelector('.topbar .back-btn')),
      picture: !!ta?.querySelector('.ta-me .avatar'),
      gone: {
        searchField: seen(document.querySelector('.fbx-search')),
        citiesBtn: seen(document.querySelector('.fbx-pill')),
        header: !!document.querySelector('.fbx-top'),
        upgradeStrip: seen(document.querySelector('.upb')),
        dayNight: [...document.querySelectorAll('.dn, .dn-compact')].filter(seen).length,
        nameChip: [...document.querySelectorAll('.au-chip, .si-chip')].filter(seen).length,
      },
      h1: document.querySelector('.fbx-page > h1')?.textContent,
      postTop: post ? Math.round(box(post).top) : null,
      wide: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      dashes: /[\u2013\u2014]/.test(document.body.innerText),
    }
  })
  if (phone) {
    check('phone: the top bar is one thin row (60px at most)', top.barShown && top.barH <= 60 && top.rowIs === 'topbar' && top.oneRow, top)
    check('phone: the name "מתווכים לעסקאות" is on the right, with no back arrow before it on the feed', /מתווכים לעסקאות/.test(top.brand ?? '') && top.brandRight && !top.back, top)
    check('phone: the first post starts in the upper half of the screen (it was at 580px)', top.postTop !== null && top.postTop <= 440, top.postTop)
  } else {
    check('desktop: the icons are in the top row of the page, on its left', top.rowIs === 'main-back' && top.oneRow, top)
  }
  check(`${dev}: on the left, three small icons in this order: search, bell, the broker's picture`, top.acts.join() === 'open-search,open-notices,open-profile' && top.lefts[0] > top.lefts[1] && top.lefts[1] > top.lefts[2] && top.picture, top)
  check(`${dev}: each takes a full finger (44px) and says what it is to a screen reader`, top.sizes.every(([w, h]) => w >= 44 && h >= 44) && /חיפוש/.test(top.labels[0]) && /התראות/.test(top.labels[1]) && /החשבון של/.test(top.labels[2]), top)
  check(`${dev}: gone from the page: the search field, "כל הערים", the upgrade strip, the day / night switch, the name chip`, !top.gone.searchField && !top.gone.citiesBtn && !top.gone.header && !top.gone.upgradeStrip && top.gone.dayNight === 0 && top.gone.nameChip === 0, top.gone)
  check(`${dev}: the page keeps its title for screen readers, no sideways scroll, no long dashes`, top.h1 === 'קהילה' && top.wide <= 1 && !top.dashes, top)
  await page.screenshot({ path: `${out}/${dev}-1-top.png` })

  // ---------------------------------------------------------------- the bell
  const bell = await page.evaluate(() => {
    const b = [...document.querySelectorAll('.ta .bell')].find((e) => e.getBoundingClientRect().width > 0)
    return { n: b.querySelector('.bell-count')?.textContent ?? '', label: b.getAttribute('aria-label') }
  })
  await tap(page, '[data-act="open-notices"]')
  await wait(800)
  const notices = await page.evaluate(() => ({ title: document.querySelector('.modal h2')?.textContent, rows: document.querySelectorAll('.modal .notice').length || document.querySelectorAll('.modal li, .modal .notice-main').length, url: location.search }))
  check(`${dev}: the bell shows how many notices are new, and opens the notices`, Number(bell.n) >= 1 && bell.label === `התראות, ${bell.n} חדשות` && notices.title === 'התראות' && notices.rows >= 1 && !/open=/.test(notices.url), { bell, notices })
  await closeAll(page)

  // ---------------------------------------------------------------- 3. the search screen
  await tap(page, '[data-act="open-search"]')
  await page.waitForSelector('[data-search-screen]', { visible: true, timeout: 4000 })
  await wait(700)
  const scr = await page.evaluate(() => {
    const m = document.querySelector('.modal').getBoundingClientRect()
    const chips = [...document.querySelectorAll('[data-cities] .fsr-chip')]
    return {
      title: document.querySelector('.modal h2')?.textContent,
      full: Math.round(m.width) === innerWidth && Math.round(m.height) === innerHeight,
      size: [Math.round(m.width), Math.round(m.height)],
      focus: document.activeElement?.dataset.f,
      cities: chips.length,
      all: chips[0]?.textContent.trim(),
      allOn: chips[0]?.getAttribute('aria-pressed'),
      chipH: Math.min(...chips.map((c) => c.getBoundingClientRect().height)),
      hint: document.querySelector('.fsr-hint')?.textContent,
      btn: document.querySelector('[data-act="apply-search"]')?.textContent.trim(),
      url: location.search,
    }
  })
  check(`${dev}: the search icon opens "חיפוש בקהילה" ${phone ? 'on the whole screen' : 'as a window'}, ready to type`, scr.title === 'חיפוש בקהילה' && (phone ? scr.full : scr.size[0] <= 600) && scr.focus === 'search' && !/open=/.test(scr.url), scr)
  check(`${dev}: the cities are in it: "כל הארץ" chosen first, and every city as a chip`, scr.all === 'כל הארץ' && scr.allOn === 'true' && scr.cities >= 15 && scr.chipH >= 36 && !!scr.hint, scr)
  await page.screenshot({ path: `${out}/${dev}-2-search-empty.png` })

  await page.type('[data-f="search"]', 'חיפה', { delay: 30 })
  await wait(500)
  const words = await page.evaluate(() => ({
    n: Number(document.querySelector('[data-found]').dataset.found),
    hits: [...document.querySelectorAll('.fsr-hit')].map((h) => h.textContent),
    btn: document.querySelector('[data-act="apply-search"]')?.textContent.trim(),
  }))
  check(`${dev}: typing finds posts at once, each with "חיפה" in it, and the button says how many`, words.n >= 2 && words.hits.length === Math.min(words.n, 20) && words.btn === `הצגה בפיד (${words.n})`, { n: words.n, btn: words.btn })
  await page.screenshot({ path: `${out}/${dev}-3-search-words.png` })

  // a city narrows it
  await page.evaluate(() => document.querySelector('[data-cities] [data-city="חיפה"]').click())
  await wait(400)
  const city = await page.evaluate(() => ({
    on: document.querySelector('[data-cities] [data-city="חיפה"]').getAttribute('aria-pressed'),
    allOn: document.querySelector('[data-cities] [data-city=""]').getAttribute('aria-pressed'),
    n: Number(document.querySelector('[data-found]').dataset.found),
    clear: !!document.querySelector('[data-act="clear-cities"]'),
  }))
  check(`${dev}: choosing a city marks it, un-marks "כל הארץ", and narrows what is found`, city.on === 'true' && city.allOn === 'false' && city.n >= 1 && city.n <= words.n && city.clear, city)

  // "הצגה בפיד": the feed through the same search, and the search icon says a filter is on
  await page.evaluate(() => document.querySelector('[data-act="apply-search"]').click())
  await wait(900)
  const applied = await page.evaluate(() => {
    const seen = (el) => !!el && el.getBoundingClientRect().width > 0
    return {
      closed: !document.querySelector('[data-search-screen]'),
      bar: document.querySelector('.city-bar')?.textContent.replace(/\s+/g, ' ').trim(),
      posts: document.querySelectorAll('.fb.ci').length,
      dot: !![...document.querySelectorAll('[data-act="open-search"]')].find(seen)?.querySelector('.ta-dot'),
      label: [...document.querySelectorAll('[data-act="open-search"]')].find(seen)?.getAttribute('aria-label'),
      promo: document.querySelectorAll('[data-upgrade="post"]').length,
    }
  })
  check(`${dev}: "הצגה בפיד" shows the feed through the search, says by what, and marks the search icon`, applied.closed && /מוצג לפי/.test(applied.bar ?? '') && /חיפה/.test(applied.bar ?? '') && applied.posts === city.n && applied.dot && /מסונן לפי 1 ערים/.test(applied.label ?? ''), applied)
  await page.screenshot({ path: `${out}/${dev}-4-feed-filtered.png` })

  // a line of the search goes to its post; then clean up from inside the screen
  await tap(page, '[data-act="open-search"]')
  await page.waitForSelector('[data-search-screen]', { visible: true, timeout: 4000 })
  await wait(500)
  const kept = await page.evaluate(() => ({ q: document.querySelector('[data-f="search"]').value, on: document.querySelector('[data-cities] [data-city="חיפה"]').getAttribute('aria-pressed') }))
  check(`${dev}: opened again, the screen remembers the words and the city`, kept.q === 'חיפה' && kept.on === 'true', kept)
  const hitId = await page.evaluate(() => document.querySelector('.fsr-hit').dataset.hit)
  await page.evaluate(() => document.querySelector('.fsr-hit').click())
  await wait(1200)
  const went = await page.evaluate((id) => ({ closed: !document.querySelector('[data-search-screen]'), url: location.search, there: !!document.getElementById(`ci-${id}`) }), hitId)
  check(`${dev}: a tap on a line closes the screen and goes to that post`, went.closed && went.url.includes(`item=${hitId}`) && went.there, went)
  await tap(page, '[data-act="open-search"]')
  await page.waitForSelector('[data-search-screen]', { visible: true, timeout: 4000 })
  await wait(400)
  await page.evaluate(() => {
    document.querySelector('[data-act="clear-cities"]').click()
    document.querySelector('.fsr-field button').click()
  })
  await wait(400)
  const clean = await page.evaluate(() => ({ q: document.querySelector('[data-f="search"]').value, allOn: document.querySelector('[data-cities] [data-city=""]').getAttribute('aria-pressed'), btn: document.querySelector('[data-act="apply-search"]').textContent.trim() }))
  check(`${dev}: both are cleared from inside the screen`, clean.q === '' && clean.allOn === 'true' && clean.btn === 'סגירה', clean)
  await closeAll(page)

  // ---------------------------------------------------------------- 2, 4, 5. the menu of the picture
  await feed(page)
  await tap(page, '[data-act="open-profile"]')
  await page.waitForSelector('[data-profile-menu]', { visible: true, timeout: 4000 })
  await wait(600)
  const menu = await page.evaluate(() => {
    const m = document.querySelector('[data-profile-menu]')
    const box = document.querySelector('.modal').getBoundingClientRect()
    return {
      who: m.querySelector('.pfm-who strong')?.textContent,
      signin: m.querySelector('[data-signin="menu"]')?.getAttribute('href'),
      upgrade: { text: m.querySelector('[data-upgrade="menu"] b')?.textContent, to: m.querySelector('[data-upgrade="menu"]')?.getAttribute('href') },
      look: [...m.querySelectorAll('[data-look] button')].map((b) => ({ id: b.dataset.mode, t: b.textContent.trim(), on: b.getAttribute('aria-pressed'), h: Math.round(b.getBoundingClientRect().height) })),
      exit: !!m.querySelector('[data-act="sign-out"]'),
      rows: [...m.querySelectorAll('.pfm-row')].map((r) => Math.round(r.getBoundingClientRect().height)),
      bottom: Math.round(innerHeight - box.bottom),
      mode: document.documentElement.dataset.mode,
    }
  })
  check(`${dev}: the picture opens "החשבון שלי": who it is, and for whoever is not signed in the way in`, menu.who === 'מאיה לנדאו' && menu.signin?.endsWith('/kehila/login') && !menu.exit && menu.rows.every((h) => h >= 44), menu)
  check(`${dev}: "שדרג למשרד NadlanUP" is in the menu, and leads to the office's page`, menu.upgrade.text === 'שדרג למשרד NadlanUP' && menu.upgrade.to?.endsWith('/app/office'), menu.upgrade)
  check(`${dev}: day / night is in the menu: בהיר, כהה, לפי השעה`, menu.look.map((l) => l.t).join('|') === 'בהיר|כהה|לפי השעה' && menu.look.every((l) => l.h >= 44) && menu.look.filter((l) => l.on === 'true').length === 1, menu.look)
  if (phone) check('phone: the menu comes from the bottom of the screen', menu.bottom === 0, menu.bottom)
  await page.screenshot({ path: `${out}/${dev}-5-menu.png` })
  await page.evaluate(() => document.querySelector('[data-look] [data-mode="night"]').click())
  await wait(500)
  const night = await page.evaluate(() => ({ mode: document.documentElement.dataset.mode, on: document.querySelector('[data-look] [data-mode="night"]').getAttribute('aria-pressed') }))
  await page.screenshot({ path: `${out}/${dev}-6-menu-night.png` })
  await page.evaluate(() => document.querySelector('[data-look] [data-mode="day"]').click())
  await wait(400)
  const day = await page.evaluate(() => document.documentElement.dataset.mode)
  await page.evaluate(() => document.querySelector('[data-look] [data-mode="auto"]').click())
  await wait(400)
  const auto = await page.evaluate(() => ({ on: document.querySelector('[data-look] [data-mode="auto"]').getAttribute('aria-pressed'), stored: localStorage.getItem('nadlanup-mode-v1') }))
  check(`${dev}: "כהה" turns the site dark at once, "בהיר" light, and "לפי השעה" goes back to the clock`, night.mode === 'night' && night.on === 'true' && day === 'day' && auto.on === 'true' && auto.stored === null, { night, day, auto })
  await page.evaluate(() => document.querySelector('[data-upgrade="menu"]').click())
  await wait(1500)
  check(`${dev}: the menu's upgrade line opens the office's page`, (await page.evaluate(() => location.pathname)).endsWith('/app/office'))

  // ---------------------------------------------------------------- 4. one quiet post inside the feed
  await feed(page)
  const post = await page.evaluate(() => {
    const p = [...document.querySelectorAll('[data-upgrade="post"]')]
    const list = [...document.querySelector('.ci-list').children]
    const before = p[0] ? list.slice(0, list.indexOf(p[0])).filter((e) => e.querySelector('.fb.ci')).length : -1
    return { n: p.length, before, text: p[0]?.textContent.replace(/\s+/g, ' ').trim(), to: p[0]?.getAttribute('href'), h: p[0] ? Math.round(p[0].getBoundingClientRect().height) : 0, vh: innerHeight }
  })
  check(`${dev}: the upgrade is one quiet post inside the feed, once, after the fourth post, marked as the office's word`, post.n === 1 && post.before === 4 && /^מהמשרד/.test(post.text ?? '') && /שדרג למשרד NadlanUP/.test(post.text ?? '') && post.to?.endsWith('/app/office') && post.h >= 44 && post.h <= 110, post)
  await page.evaluate(() => document.querySelector('[data-upgrade="post"]').scrollIntoView({ block: 'center' }))
  await wait(600)
  await page.screenshot({ path: `${out}/${dev}-7-quiet-post.png` })
  await page.evaluate(() => document.querySelector('[data-room="coop"]').click())
  await wait(900)
  check(`${dev}: it is not repeated inside the rooms`, (await page.evaluate(() => document.querySelectorAll('[data-upgrade="post"]').length)) === 0)

  // ---------------------------------------------------------------- the icons on the app's other screens
  await page.goto(green + '/app/brokers', { waitUntil: 'networkidle0' })
  await wait(900)
  const other = await page.evaluate(() => ({ acts: [...document.querySelectorAll('.ta')].find((e) => e.getBoundingClientRect().width > 0)?.querySelectorAll('button').length, strip: !!document.querySelector('.upb') }))
  await tap(page, '[data-act="open-search"]')
  await page.waitForSelector('[data-search-screen]', { visible: true, timeout: 6000 }).catch(() => {})
  const fromOther = await page.evaluate(() => ({ path: location.pathname, open: !!document.querySelector('[data-search-screen]') }))
  check(`${dev}: the same three icons are on the app's other screens; the search goes to the feed and opens there`, other.acts === 3 && fromOther.path.endsWith('/app/community') && fromOther.open, { other, fromOther })
  await closeAll(page)
  if (phone) {
    // a screen that is not one of the main ones: the way back is in the bar
    const href = await page.evaluate(() => document.querySelector('a[href*="/app/property/"]')?.getAttribute('href'))
    if (href) {
      await page.goto('http://localhost:5240' + href, { waitUntil: 'networkidle0' })
      await wait(900)
      const inner = await page.evaluate(() => {
        const b = document.querySelector('.topbar .back-btn')
        const bar = document.querySelector('.topbar').getBoundingClientRect()
        return { back: !!b && b.getBoundingClientRect().width > 0, barH: Math.round(bar.height) }
      })
      check('phone: on a screen inside (a property) the bar has the way back, and is still one thin row', inner.back && inner.barH <= 60, inner)
    } else check('phone: a property link was found in the feed', false)
  }
  check(`${dev}: no errors`, errors.length === 0, errors)
  await ctx.close()

  // ---------------------------------------------------------------- at night
  {
    const n = await fresh(vp, { mode: 'night' })
    await feed(n.page)
    await n.page.screenshot({ path: `${out}/${dev}-night-1-top.png` })
    await tap(n.page, '[data-act="open-search"]')
    await n.page.waitForSelector('[data-search-screen]', { visible: true, timeout: 4000 })
    await n.page.type('[data-f="search"]', 'תל אביב', { delay: 20 })
    await wait(600)
    await n.page.screenshot({ path: `${out}/${dev}-night-2-search.png` })
    await n.ctx.close()
  }

  // ---------------------------------------------------------------- 2. signed in: the name and the way out
  {
    await api('/api/test/rate', { method: 'DELETE' })
    await api('/api/login', { method: 'POST', body: { email: 'itzik@test.local' } })
    const mail = (await api('/api/test/outbox')).outbox.filter((m) => m.to_email === 'itzik@test.local').at(-1)
    const s = await api('/api/session', { method: 'POST', body: { email: 'itzik@test.local', code: mail.subject.match(/^(\d{6})/)[1] } })
    const u = await fresh(vp, { demo: false, session: { token: s.token, member: s.member, staff: s.staff } })
    await feed(u.page)
    const bar = await u.page.evaluate(() => {
      const seen = (el) => !!el && el.getBoundingClientRect().width > 0
      const t = document.querySelector('.topbar')
      return { barH: seen(t) ? Math.round(t.getBoundingClientRect().height) : 0, chip: [...document.querySelectorAll('.au-chip')].filter(seen).length, label: [...document.querySelectorAll('[data-act="open-profile"]')].find(seen)?.getAttribute('aria-label'), signinRow: [...document.querySelectorAll('[data-signin]')].filter(seen).length }
    })
    check(`${dev}, signed in: the name with "יציאה" no longer takes a row${phone ? ' (the bar is one thin row)' : ''}; the picture carries the name`, bar.chip === 0 && (!phone || bar.barH <= 60) && /החשבון של/.test(bar.label ?? '') && bar.signinRow === 0, bar)
    await tap(u.page, '[data-act="open-profile"]')
    await u.page.waitForSelector('[data-profile-menu]', { visible: true, timeout: 4000 })
    await wait(500)
    const m = await u.page.evaluate(() => {
      const el = document.querySelector('[data-profile-menu]')
      return { who: el.querySelector('.pfm-who strong')?.textContent, admin: el.querySelector('[data-act="to-admin"]')?.getAttribute('href'), exit: el.querySelector('[data-act="sign-out"]')?.textContent.trim(), signin: !!el.querySelector('[data-signin]'), exitLast: el.lastElementChild?.dataset.act }
    })
    check(`${dev}, signed in: the menu says who is signed in, has "מסך הניהול" for staff, and "יציאה" at its foot (no "כניסה")`, !!m.who && m.who === s.staff?.name && m.admin?.endsWith('/kehila/admin') && m.exit === 'יציאה' && !m.signin && m.exitLast === 'sign-out', m)
    await u.page.screenshot({ path: `${out}/${dev}-8-menu-signed-in.png` })
    await u.page.evaluate(() => document.querySelector('[data-act="sign-out"]').click())
    await u.page.waitForFunction(() => location.pathname.endsWith('/kehila'), { timeout: 15000 }).catch(() => {})
    const outNow = await u.page.evaluate(() => ({ path: location.pathname, session: localStorage.getItem('nadlanup-session-v1') }))
    check(`${dev}, signed in: "יציאה" signs out and goes to the community's page`, outNow.path.endsWith('/kehila') && !outNow.session, outNow)
    check(`${dev}, signed in: no errors`, u.errors.length === 0, u.errors)
    await u.ctx.close()
  }
}

await browser.close().catch(() => {})
console.log(fails ? `\n${fails} FAILED` : '\nALL CHECKS PASSED')
process.exit(fails ? 1 : 0)
