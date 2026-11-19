// Whose name the app shows (Itzik 19.11.2026): "כשאני מחובר מופיע השם 'מאיה' במקום השם שלי".
// The demo was built around one example user (מאיה לנדאו). The rule this check holds the app to:
//  1. a real, signed-in person sees their own name everywhere: the feed, the top bar, the menu of the picture, the
//     posts and the comments they write, the picture (their initials). This goes for an approved broker and for one
//     of the staff who has no broker's card (that was the bug: staff were left in the example user's area)
//  2. nothing of the example user reaches a real person: not her name, not her photo, not her posts, not what she
//     "said" under other brokers' posts, not her page's draft, not her invented phone. On no screen of the app
//  3. the link a real broker sends a property's owner carries the broker's own name (it showed the example user)
//  4. the example user lives only in a presentation that was opened through /demo, and there is a way out of it.
//     On a device where somebody is signed in the presentation stays in its own tab
//  5. whoever is not signed in sees no person's name: the app is locked, and the public pages do not carry hers
//  6. the two sample pages built on the example user, /agent/demo and /o/p with no property in the link, exist
//     inside a presentation only (Itzik 19.11.2026). Anywhere else they lead away, and nothing links to them
// Against the LOCAL test server (real sessions, a real approval) and the green dev server; saves screenshots.
// Usage: node scripts/real-name-check.mjs [outDir]
import puppeteer from 'puppeteer-core'
import { mkdirSync } from 'node:fs'

const API = process.env.API ?? 'http://localhost:8787'
const ORIGIN = 'http://localhost:5240'
const green = 'http://localhost:5240/NADLANIL-DEMO/green'
if (!/^http:\/\/(localhost|127\.0\.0\.1)/.test(API)) throw new Error('local test server only')
const out = process.argv[2] ?? '_shots/real-name'
mkdirSync(out, { recursive: true })
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
let fails = 0
const check = (name, ok, info) => {
  if (!ok) fails++
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok || info === undefined ? '' : '  [' + JSON.stringify(info) + ']'}`)
}
const api = async (path, { method = 'GET', body, token } = {}) => {
  const res = await fetch(API + path, {
    method,
    headers: { origin: ORIGIN, ...(body ? { 'content-type': 'application/json' } : {}), ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  })
  return res.json().catch(() => ({}))
}
/** A real session, the way a person gets one: the 6-digit code from the e-mail (kept in the local outbox). */
async function signIn(email) {
  await api('/api/test/rate', { method: 'DELETE' })
  await api('/api/login', { method: 'POST', body: { email } })
  const mail = (await api('/api/test/outbox')).outbox.filter((m) => m.to_email === email).at(-1)
  const s = await api('/api/session', { method: 'POST', body: { email, code: mail.subject.match(/^(\d{6})/)[1] } })
  return { token: s.token, member: s.member, staff: s.staff }
}

// ---------------------------------------------------------------- the two real people (both invented, local only)
const staff = await signIn('itzik@test.local')
const STAFF = staff.staff?.name
check('setup: one of the staff is signed in, with no broker\'s card', !!staff.token && !!STAFF && !staff.member, staff)

const BROKER = { name: 'נועם אלון', phone: '052-555-0177', email: `noam-${Date.now()}@test.local`, license: '2718281', work: 'office', office_name: 'אלון נכסים', cities: ['חיפה', 'נשר'], areas: 'כרמל, נווה שאנן' }
await api('/api/test/rate', { method: 'DELETE' })
await api('/api/register', { method: 'POST', body: BROKER })
const asked = (await api('/api/admin/members', { token: staff.token })).members?.find((m) => m.email === BROKER.email)
await api(`/api/admin/members/${asked?.id}/approve`, { method: 'POST', token: staff.token })
const broker = await signIn(BROKER.email)
check('setup: a broker signed up, was approved, and is signed in', !!broker.token && broker.member?.name === BROKER.name && !broker.staff, broker)

const PHONE = { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true }
const DESK = { width: 1440, height: 900 }
const browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--hide-scrollbars'] })

const tap = (page, sel) => page.evaluate((s) => [...document.querySelectorAll(s)].find((e) => e.getBoundingClientRect().width > 0)?.click(), sel)
const clickText = (page, sel, text) => page.evaluate((s, t) => [...document.querySelectorAll(s)].find((el) => el.textContent.includes(t))?.click(), sel, text)
const closeAll = async (page) => {
  await page.keyboard.press('Escape')
  await wait(450)
}
async function fresh(vp, { demoFlag = false, session } = {}) {
  const ctx = await browser.createBrowserContext()
  const page = await ctx.newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push(String(e)))
  await page.setViewport(vp)
  await page.goto(green + '/about', { waitUntil: 'load' })
  await page.evaluate(
    (d, s) => {
      localStorage.setItem('nadlanup-mode-v1', JSON.stringify({ mode: 'day', until: Date.now() + 9e9 }))
      localStorage.setItem('nadlanup-rooms-hint-v1', '1')
      if (d) localStorage.setItem('nadlanup-demo-v1', '1')
      if (s) localStorage.setItem('nadlanup-session-v1', JSON.stringify(s))
    },
    demoFlag,
    session ?? null,
  )
  return { ctx, page, errors }
}
const open = async (page, path, ms = 1300) => {
  await page.goto(green + path, { waitUntil: 'load' })
  await wait(ms)
}

/**
 * Everything of the example user that a person could meet on the screen that is open: her name in any text, and in
 * any attribute (a label for screen readers, a placeholder, a value, a link), and her photo.
 */
const HER = 'מאיה|לנדאו|maya|broker-01'
const scan = (page) =>
  page.evaluate((src) => {
    const re = new RegExp(src, 'i')
    const hits = []
    const walk = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
    while (walk.nextNode()) {
      const n = walk.currentNode
      if (re.test(n.nodeValue) && !n.parentElement.closest('script, style')) hits.push('text: ' + n.nodeValue.trim().slice(0, 70))
    }
    document.querySelectorAll('body *').forEach((el) => {
      if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) if (re.test(el.value)) hits.push(`${el.tagName.toLowerCase()} value: ${el.value.slice(0, 70)}`)
      for (const a of el.attributes) if (!/^(d|class|style|points)$/.test(a.name) && a.value.length < 3000 && re.test(a.value)) hits.push(`${el.tagName.toLowerCase()}[${a.name}]: ${a.value.slice(0, 70)}`)
    })
    return [...new Set(hits)]
  }, HER)

const scanName = (page) => scan(page).then((h) => h.filter((x) => /מאיה|לנדאו|maya/i.test(x)))
const pathOf = (page) => page.evaluate(() => location.pathname.replace(/^\/NADLANIL-DEMO\/green/, '') || '/')
const sampleLinks = (page) => page.evaluate(() => document.querySelectorAll('a[href$="/agent/demo"]').length)
/** A link to the owner's page as the demo makes it, and as a broker's link was before 19.11.2026: no name in it. */
const BARE_LINK = '/o/p?' + new URLSearchParams({ t: 'דירת 4 חדרים בפתח תקווה', a: 'כפר גנים', c: 'פתח תקווה', r: '4', p: '2650000', d: '2026-11-19', b: 'b1' })

/** Who the app says is here, wherever it says it. */
const whoIsHere = (page) =>
  page.evaluate(() => {
    const seen = (el) => !!el && el.getBoundingClientRect().width > 0
    const txt = (el) => el?.textContent.replace(/\s+/g, ' ').trim() ?? null
    const me = [...document.querySelectorAll('.ta-me')].find(seen)
    return {
      state: document.querySelector('[data-state]')?.dataset.state ?? null,
      label: me?.getAttribute('aria-label') ?? null,
      picture: me?.querySelector('img')?.getAttribute('src')?.slice(0, 24) ?? txt(me),
      side: txt([...document.querySelectorAll('.side-user strong')].find(seen)),
      sideRole: txt([...document.querySelectorAll('.side-user > div > span')].find(seen)),
      card: txt([...document.querySelectorAll('.me-body strong')].find(seen)),
    }
  })

// ================================================================ 1 + 2 + 3: a real person, on a phone and a computer
const people = [
  { tag: 'staff', session: staff, name: STAFF, role: 'צוות הקהילה', who: 'staff', key: 's:itzik@test.local', admin: true },
  { tag: 'broker', session: broker, name: BROKER.name, role: `מתווך, ${BROKER.office_name}`, who: 'member', key: `m:${broker.member?.id}`, admin: false },
]
// ONLY=phone or ONLY=desktop runs one of the two (a quick look while working); a full run is both
for (const [dev, vp] of [
  ['phone', PHONE],
  ['desktop', DESK],
].filter(([d]) => !process.env.ONLY || process.env.ONLY === d)) {
  for (const p of people) {
    const t = `${dev}, ${p.tag}`
    // the worst case: a presentation of the demo was once opened on this device, and its mark is still there
    const { ctx, page, errors } = await fresh(vp, { demoFlag: true, session: p.session })
    await open(page, '/app/community', 1800)
    await page.waitForSelector('[data-welcome]', { timeout: 15000 })
    const shot = (n) => page.screenshot({ path: `${out}/${dev}-${p.tag}-${n}.png` })

    // ---------------------------------------------------------------- the feed and the top of the app
    let here = await whoIsHere(page)
    check(`${t}: the top bar's picture is of "${p.name}"`, here.label === `החשבון של ${p.name}` && /^data:image\/svg/.test(here.picture ?? ''), here)
    if (dev === 'desktop') check(`${t}: the side of the app carries "${p.name}" and "${p.role}"`, here.side === p.name && here.sideRole === p.role && (here.card === null || here.card === p.name), here)
    const mark = await page.evaluate(() => ({ demo: localStorage.getItem('nadlanup-demo-v1'), area: localStorage.getItem('nadlanup-area-of') }))
    check(`${t}: an old presentation's mark does not turn them into the example user, and it is cleared`, mark.demo === null && mark.area === p.key, mark)
    let hits = await scan(page)
    check(`${t}: the feed has nothing of the example user`, hits.length === 0, hits)
    await shot('1-feed')

    // ---------------------------------------------------------------- the menu of the picture
    await tap(page, '[data-act="open-profile"]')
    await wait(600)
    const menu = await page.evaluate(() => {
      const m = document.querySelector('[data-profile-menu]')
      return {
        who: m?.dataset.who,
        title: m?.closest('.modal')?.querySelector('h2, .modal-title')?.textContent.trim(),
        name: m?.querySelector('.pfm-who strong')?.textContent.trim(),
        role: m?.querySelector('.pfm-who small')?.textContent.trim(),
        picture: m?.querySelector('.pfm-who img')?.getAttribute('src')?.slice(0, 14),
        admin: !!m?.querySelector('[data-act="to-admin"]'),
        signIn: !!m?.querySelector('[data-signin="menu"]'),
        out: !!m?.querySelector('[data-act="sign-out"]'),
        leaveDemo: !!m?.querySelector('[data-act="leave-demo"]'),
      }
    })
    check(
      `${t}: the menu says "${p.name}", "${p.role}", with the way out and no way "back from the demo"`,
      menu.who === p.who && menu.title === 'החשבון שלי' && menu.name === p.name && menu.role === p.role && menu.picture === 'data:image/svg' && menu.admin === p.admin && !menu.signIn && menu.out && !menu.leaveDemo,
      menu,
    )
    hits = await scan(page)
    check(`${t}: the menu has nothing of the example user`, hits.length === 0, hits)
    await shot('2-menu')
    await closeAll(page)

    // ---------------------------------------------------------------- a post they publish
    const POST = `בדיקה של ${p.tag} ב-${dev}: מישהו מכיר שמאי טוב באזור?`
    await tap(page, '[data-act="share"]')
    await page.waitForSelector('[data-share-sheet]', { visible: true })
    await tap(page, '[data-intent="post"]')
    await page.waitForSelector('#composer-text', { visible: true })
    const author = await page.evaluate(() => ({ name: document.querySelector('.composer-author strong')?.textContent.trim(), img: document.querySelector('.composer-author img')?.getAttribute('src')?.slice(0, 14) }))
    check(`${t}: the window of a new post is under "${p.name}"`, author.name === p.name && author.img === 'data:image/svg', author)
    await page.type('#composer-text', POST)
    await clickText(page, '.composer-modal .btn-gold', 'פרסום')
    await wait(1500)
    const post = await page.evaluate((body) => {
      const el = [...document.querySelectorAll('.fb.ci')].find((x) => x.textContent.includes(body))
      el?.scrollIntoView({ block: 'center' })
      const s = JSON.parse(localStorage.getItem('brokers-demo-state-v5') ?? '{}')
      return { name: el?.querySelector('.fb-name')?.textContent.replace(/\s+/g, ' ').trim(), img: el?.querySelector('img')?.getAttribute('src')?.slice(0, 14), kept: (s.items ?? []).some((x) => x.body === body && x.authorId === 'b1') }
    }, POST)
    check(`${t}: the post they publish is signed "${p.name}", with their picture`, !!post.name?.startsWith(p.name) && post.img === 'data:image/svg' && post.kept, post)
    await wait(700)
    await shot('3-my-post')

    // ---------------------------------------------------------------- a comment they write under somebody's post
    const SAY = `תגובה של ${p.tag}: אשמח לפרטים`
    await page.evaluate((mine) => {
      const el = [...document.querySelectorAll('.fb.ci')].find((x) => !x.textContent.includes(mine) && x.querySelector('.fb-action'))
      el?.scrollIntoView({ block: 'center' })
      ;[...(el?.querySelectorAll('.fb-action') ?? [])].find((b) => b.textContent.includes('תגוב'))?.click()
    }, POST)
    await wait(900)
    const typed = await page.evaluate(() => {
      const i = [...document.querySelectorAll('.fb-reply input')].find((x) => x.getBoundingClientRect().width > 0)
      i?.focus()
      return !!i
    })
    await page.keyboard.type(SAY)
    await page.keyboard.press('Enter')
    await wait(900)
    const said = await page.evaluate((body) => {
      const c = [...document.querySelectorAll('.fb-comment')].find((x) => x.textContent.includes(body))
      return { by: c?.querySelector('strong')?.textContent.replace(/\s+/g, ' ').trim(), img: c?.querySelector('img')?.getAttribute('src')?.slice(0, 14), reply: document.querySelector('.fb-reply img')?.getAttribute('src')?.slice(0, 14) }
    }, SAY)
    check(`${t}: a comment they write is signed "${p.name}"`, typed && !!said.by?.startsWith(p.name) && said.img === 'data:image/svg' && said.reply === 'data:image/svg', { typed, ...said })

    // ---------------------------------------------------------------- what is kept for them in this browser
    const kept = await page.evaluate((post, say) => {
      const s = JSON.parse(localStorage.getItem('brokers-demo-state-v5') ?? '{}')
      const flat = (list) => (list ?? []).flatMap((c) => [c, ...flat(c.replies)])
      return {
        hers: (s.items ?? []).filter((x) => x.authorId === 'b1' && x.body !== post).map((x) => x.id),
        herWords: (s.items ?? []).flatMap((x) => flat(x.comments)).filter((c) => c.authorId === 'b1' && c.body !== say).map((c) => c.body),
        others: (s.items ?? []).filter((x) => x.authorId !== 'b1').length,
        page: s.builder?.name,
        pageYears: s.builder?.years,
        reviews: s.builder?.testimonialIds?.length,
        crm: (s.crm ?? []).length,
        clients: JSON.parse(localStorage.getItem('nadlanup-clients-v1') ?? 'null')?.length,
      }
    }, POST, SAY)
    check(
      `${t}: their area is their own: none of her posts, none of her comments, no invented page, clients or properties`,
      kept.hers.length === 0 && kept.herWords.length === 0 && kept.others > 20 && kept.page === p.name && kept.pageYears === 0 && kept.reviews === 0 && kept.crm === 0 && kept.clients === 0,
      kept,
    )

    // ---------------------------------------------------------------- an area that was opened before the fix
    if (p.tag === 'broker') {
      await page.evaluate(() => {
        const s = JSON.parse(localStorage.getItem('brokers-demo-state-v5'))
        const other = s.items.find((x) => x.authorId !== 'b1')
        other.comments = [...(other.comments ?? []), { authorId: 'b1', time: 'לפני 4 שעות', body: 'מגיע לך. עבודה יפה.' }, { authorId: 'b1', time: 'עכשיו', body: 'תגובה אמיתית שלי' }]
        s.builder = { ...s.builder, name: 'מאיה לנדאו', years: 11, testimonialIds: ['t1', 't2', 't3'] }
        localStorage.setItem('brokers-demo-state-v5', JSON.stringify(s))
      })
      await open(page, '/app/community', 1500)
      const old = await page.evaluate(() => {
        const s = JSON.parse(localStorage.getItem('brokers-demo-state-v5') ?? '{}')
        const all = (s.items ?? []).flatMap((x) => x.comments ?? []).filter((c) => c.authorId === 'b1').map((c) => c.body)
        return { herWords: all.includes('מגיע לך. עבודה יפה.'), mine: all.includes('תגובה אמיתית שלי'), page: s.builder?.name, reviews: s.builder?.testimonialIds?.length }
      })
      check(`${t}: an area from before the fix is cleaned: her comment and her page go, the broker's own comment stays`, !old.herWords && old.mine && old.page === p.name && old.reviews === 0, old)
    }

    // ---------------------------------------------------------------- every screen of the app, and the public ones
    for (const path of ['/app', '/app/community?topic=wins', '/app/community?open=search', '/app/brokers', '/app/crm', '/app/builder', '/app/folder', '/app/agent', '/app/office', '/', '/kehila', '/upgrade', '/office', '/about', '/install']) {
      await open(page, path)
      hits = await scan(page)
      check(`${t}: ${path} has nothing of the example user`, hits.length === 0, hits)
      if (path === '/app/brokers' || path === '/app/agent') await shot(path.replace(/\W+/g, '-').slice(1))
      if (path === '/') {
        const tpl = await page.evaluate(() => [...new Set([...document.querySelectorAll('[data-tpl-name]')].map((b) => b.textContent))])
        check(`${t}: the small sample page on the home page carries their own first name`, tpl.length === 1 && tpl[0] === p.name.split(' ')[0], tpl)
      }
      if (path === '/' || path === '/app/agent') check(`${t}: ${path} does not offer the example user's sample page`, (await sampleLinks(page)) === 0)
    }
    // ---------------------------------------------------------------- 6. the two sample pages are the demo's
    await open(page, '/agent/demo')
    let at = await pathOf(page)
    hits = await scan(page)
    check(`${t}: /agent/demo leads to where their own page is made, with nothing of the example user`, at === '/app/agent' && hits.length === 0, { at, hits })
    await open(page, '/o/p')
    at = await pathOf(page)
    hits = await scan(page)
    check(`${t}: /o/p with no property leads to the community's page, with nothing of the example user`, at === '/kehila' && hits.length === 0, { at, hits })

    // ---------------------------------------------------------------- the deal room's look-only picture
    // (a community member has no beta lab in the app; the deal room opens from the home page, "לצפייה בדמו")
    await open(page, '/', 1500)
    await page.evaluate(() => {
      const b = document.querySelector('.op-demo')
      b?.scrollIntoView({ block: 'center' })
      b?.click()
    })
    await page.waitForSelector('.dr-req', { timeout: 6000 }).catch(() => {})
    await wait(900)
    const room = await page.evaluate(() => ({ who: document.querySelector('.dr-req .dr-who > div > b')?.textContent.trim(), sub: document.querySelector('.dr-req .dr-who small')?.textContent.trim(), ok: document.querySelector('.dr-ok-a')?.textContent.trim() }))
    hits = await scan(page)
    check(`${t}: in the deal room's picture "me" is ${p.name}, written without a gender, with nothing of the example user`, room.who === p.name && room.ok === 'אישרת' && !/מתווכת/.test(room.sub ?? '') && hits.length === 0, { room, hits })
    await shot('4-deal-room')
    // the second scene (the shared room with its chat) opens once the match has played
    await page.waitForSelector('.dr-go.is-ready', { timeout: 12000 }).catch(() => {})
    await page.evaluate(() => document.querySelector('.dr-go.is-ready')?.click())
    await wait(4200)
    const chat = await page.evaluate(() => [...document.querySelectorAll('.dr-msg')].map((m) => m.textContent))
    hits = await scan(page)
    check(`${t}: the room's chat greets ${p.name.split(' ')[0]}, and "my" line has no gender`, chat.length === 3 && chat[0].startsWith(`היי ${p.name.split(' ')[0]},`) && chat[1] === 'מעולה, נגיע יחד.' && hits.length === 0, { chat, hits })

    // ---------------------------------------------------------------- 3. the link a broker sends a property's owner
    if (p.tag === 'broker') {
      await open(page, '/app/crm', 1600)
      await clickText(page, '.seg .seg-btn', 'נכסים')
      await wait(500)
      await page.evaluate(() => document.querySelector('[data-act="new-card"]')?.click())
      await wait(800)
      await clickText(page, '.ga-from-wa', 'למלא מהודעת וואטסאפ')
      await wait(400)
      await clickText(page, '.ga-paste .tl-alt', 'הודעה לדוגמה')
      await wait(300)
      await clickText(page, '.ga-paste .btn', 'למלא מההודעה')
      await wait(500)
      await clickText(page, '.ga-go', 'הוספה ל-CRM')
      await wait(1600)
      await open(page, '/app/crm', 1500)
      await clickText(page, '.seg .seg-btn', 'נכסים')
      await wait(500)
      await page.evaluate(() => document.querySelector('.kan-card [data-act="owner-link"]')?.click())
      await wait(800)
      const url = await page.evaluate(() => document.querySelector('.ol-url input')?.value ?? '')
      const q = new URL(url || 'http://x/').searchParams
      check(`${t}: the owner's link carries the broker's own name and title`, url.includes('/o/p?') && q.get('n') === p.name && q.get('j') === p.role, url)
      // the owner opens it on another phone, where nobody is signed in
      const far = await browser.createBrowserContext()
      const op = await far.newPage()
      await op.setViewport(vp)
      await op.goto(url, { waitUntil: 'load' })
      await wait(1200)
      const seen = await op.evaluate(() => ({ name: document.querySelector('[data-broker-name]')?.textContent.trim(), block: document.querySelector('.own-broker')?.textContent.replace(/\s+/g, ' ').trim() }))
      const far_hits = await scan(op)
      check(`${t}: on the owner's phone the page says "${p.name}" handles the property, not the example user`, seen.name === p.name && !!seen.block?.includes(p.role) && far_hits.length === 0, { seen, far_hits })
      await op.evaluate(() => document.querySelector('.own-broker')?.scrollIntoView({ block: 'center' }))
      await wait(400)
      await op.screenshot({ path: `${out}/${dev}-owner-page.png` })
      await far.close()
    }

    check(`${t}: no script error on the way`, errors.length === 0, errors)
    await ctx.close()
  }

  // ================================================================ 4. the example user: only in a presentation
  {
    const { ctx, page } = await fresh(vp)
    await page.goto(green + '/demo', { waitUntil: 'load' })
    await page.waitForSelector('.ta-me', { timeout: 20000 })
    await open(page, '/app/community', 1600)
    const here = await whoIsHere(page)
    check(`${dev}, /demo: the presentation still has the example user`, here.label === 'החשבון של מאיה לנדאו', here)
    await tap(page, '[data-act="open-profile"]')
    await wait(600)
    const menu = await page.evaluate(() => {
      const m = document.querySelector('[data-profile-menu]')
      return { who: m?.dataset.who, title: m?.closest('.modal')?.querySelector('h2, .modal-title')?.textContent.trim(), name: m?.querySelector('.pfm-who strong')?.textContent.trim(), signIn: !!m?.querySelector('[data-signin="menu"]'), out: !!m?.querySelector('[data-act="sign-out"]'), leave: m?.querySelector('[data-act="leave-demo"] b')?.textContent.trim() }
    })
    check(`${dev}, /demo: its menu says it is an example account, and has the way out of the presentation`, menu.who === 'demo' && menu.title === 'חשבון לדוגמה' && menu.name === 'מאיה לנדאו' && menu.signIn && !menu.out && menu.leave === 'יציאה מההדגמה', menu)
    await page.screenshot({ path: `${out}/${dev}-demo-menu.png` })
    await closeAll(page)
    await open(page, '/agent/demo')
    const samplePage = await page.evaluate(() => document.querySelector('.agp-hero h1')?.textContent.trim())
    await page.screenshot({ path: `${out}/${dev}-demo-agent-sample.png` })
    await open(page, '/o/p')
    const ownerSample = await page.evaluate(() => ({ foot: document.querySelector('.own-foot')?.textContent ?? '', broker: document.querySelector('[data-broker-name]')?.textContent.trim() }))
    await open(page, '/app/agent')
    const offered = await sampleLinks(page)
    await open(page, '/')
    const offeredHome = await sampleLinks(page)
    check(`${dev}, /demo: the two sample pages are there, with the example user, and the demo offers them`, samplePage === 'מאיה לנדאו' && ownerSample.foot.includes('עמוד לדוגמה') && ownerSample.broker === 'מאיה לנדאו' && offered === 1 && offeredHome === 1, { samplePage, ownerSample, offered, offeredHome })
    await open(page, '/app/community', 1600)
    await tap(page, '[data-act="open-profile"]')
    await wait(600)
    await Promise.all([page.waitForNavigation({ waitUntil: 'load' }), tap(page, '[data-act="leave-demo"]')])
    await wait(900)
    const left = await page.evaluate(() => ({ path: location.pathname, mark: localStorage.getItem('nadlanup-demo-v1'), tab: sessionStorage.getItem('nadlanup-demo-v1') }))
    check(`${dev}, /demo: the way out leads to the community's page and ends the presentation`, left.path.endsWith('/kehila') && left.mark === null && left.tab === null, left)

    // ---------------------------------------------------------------- 5. whoever is not signed in
    await open(page, '/app/community')
    const locked = await whoIsHere(page)
    const hits = await scan(page)
    check(`${dev}, a visitor: the app is locked, with no person's name and no picture`, locked.state === 'locked' && locked.label === null && locked.side === null && hits.length === 0, { locked, hits })
    await page.screenshot({ path: `${out}/${dev}-visitor-locked.png` })
    await open(page, '/')
    const tpl = await page.evaluate(() => [...new Set([...document.querySelectorAll('[data-tpl-name]')].map((b) => b.textContent))])
    check(`${dev}, a visitor: the small sample page on the home page says "השם שלך"`, tpl.length === 1 && tpl[0] === 'השם שלך', tpl)
    check(`${dev}, a visitor: the home page does not offer the example user's sample page`, (await sampleLinks(page)) === 0)
    const named = []
    for (const path of ['/', '/kehila', '/kehila/join', '/kehila/login', '/join', '/join/office', '/upgrade', '/office', '/about', '/install']) {
      await open(page, path, 1000)
      const h = await scanName(page)
      if (h.length) named.push({ path, h })
    }
    check(`${dev}, a visitor: no public page carries the example user's name`, named.length === 0, named)
    // the deal room's picture on the home page: "me" is nobody by name
    await open(page, '/', 1500)
    await page.evaluate(() => {
      const b = document.querySelector('.op-demo')
      b?.scrollIntoView({ block: 'center' })
      b?.click()
    })
    await page.waitForSelector('.dr-req', { timeout: 6000 }).catch(() => {})
    await wait(900)
    const room = await page.evaluate(() => ({ who: document.querySelector('.dr-req .dr-who > div > b')?.textContent.trim(), ok: document.querySelector('.dr-ok-a')?.textContent.trim(), photo: !!document.querySelector('.dr-req .dr-who img') }))
    await page.screenshot({ path: `${out}/${dev}-visitor-deal-room.png` })
    await page.waitForSelector('.dr-go.is-ready', { timeout: 12000 }).catch(() => {})
    await page.evaluate(() => document.querySelector('.dr-go.is-ready')?.click())
    await wait(4200)
    const chat = await page.evaluate(() => [...document.querySelectorAll('.dr-msg')].map((m) => m.textContent))
    // (her face is still one of the invented brokers' faces in a row on the home page behind the window: her name is nowhere)
    const roomHits = await scanName(page)
    check(`${dev}, a visitor: in the deal room's picture "me" has no name and no photo`, room.who === 'מתווך מהקהילה' && room.ok === 'אישרת' && !room.photo && chat[0]?.startsWith('היי, ') && chat[1] === 'מעולה, נגיע יחד.' && roomHits.length === 0, { room, chat, roomHits })
    // 6. the two sample pages, and a link to the owner's page that names no broker
    await open(page, '/agent/demo')
    const a1 = await pathOf(page)
    await open(page, '/o/p')
    const a2 = await pathOf(page)
    check(`${dev}, a visitor: /agent/demo leads to the home page and /o/p with no property to the community's page`, a1 === '/' && a2 === '/kehila', { a1, a2 })
    await open(page, BARE_LINK)
    const bare = await page.evaluate(() => ({ card: document.querySelector('.own-card')?.textContent.includes('דירת 4 חדרים בפתח תקווה') ?? false, broker: !!document.querySelector('.own-broker') }))
    const bareHits = await scan(page)
    check(`${dev}, a visitor: an owner's link with no broker's name shows the property and names nobody`, bare.card && !bare.broker && bareHits.length === 0, { bare, bareHits })
    await ctx.close()
  }

  // ================================================================ 4b. a presentation on a device where somebody is signed in
  {
    const { ctx, page } = await fresh(vp, { session: staff })
    await page.goto(green + '/demo', { waitUntil: 'load' })
    await page.waitForSelector('.ta-me', { timeout: 20000 })
    await open(page, '/app/community', 1600)
    const inTab = await whoIsHere(page)
    // another tab of the same browser, and the app the next time it is opened
    const other = await ctx.newPage()
    await other.setViewport(vp)
    await other.goto(green + '/app/community', { waitUntil: 'load' })
    await wait(1600)
    const elsewhere = await whoIsHere(other)
    const hits = await scan(other)
    check(`${dev}, signed in + /demo: the presentation stays in its tab; every other tab is "${STAFF}"`, inTab.label === 'החשבון של מאיה לנדאו' && elsewhere.label === `החשבון של ${STAFF}` && hits.length === 0, { inTab, elsewhere, hits })
    await other.close()
    await open(page, '/app/community', 1600)
    await tap(page, '[data-act="open-profile"]')
    await wait(600)
    const menu = await page.evaluate(() => {
      const m = document.querySelector('[data-profile-menu]')
      return { who: m?.dataset.who, name: m?.querySelector('.pfm-who strong')?.textContent.trim(), admin: !!m?.querySelector('[data-act="to-admin"]'), signIn: !!m?.querySelector('[data-signin="menu"]'), out: !!m?.querySelector('[data-act="sign-out"]'), leave: m?.querySelector('[data-act="leave-demo"] b')?.textContent.trim() }
    })
    check(`${dev}, signed in + /demo: the example account's menu offers "חזרה לחשבון שלי" and nothing of the real account`, menu.who === 'demo' && menu.name === 'מאיה לנדאו' && !menu.admin && !menu.signIn && !menu.out && menu.leave === 'חזרה לחשבון שלי', menu)
    await Promise.all([page.waitForNavigation({ waitUntil: 'load' }), tap(page, '[data-act="leave-demo"]')])
    await wait(1600)
    const back = await whoIsHere(page)
    const still = await page.evaluate(() => !!localStorage.getItem('nadlanup-session-v1'))
    check(`${dev}, signed in + /demo: it leads back to the app under "${STAFF}", still signed in`, back.label === `החשבון של ${STAFF}` && still, { back, still })
    // the presentation kept the example user's things apart: the staff's own post is still theirs
    const after = await scan(page)
    check(`${dev}, signed in + /demo: back in the account, nothing of the presentation is left`, after.length === 0, after)
    await ctx.close()
  }
}

console.log(fails ? `\n${fails} CHECK(S) FAILED` : '\nALL CHECKS PASSED')
// on Windows closing the browser can fail while it removes its temporary profile: the verdict is already printed
process.on('uncaughtException', () => process.exit(fails ? 1 : 0))
await Promise.race([browser.close().catch(() => {}), wait(5000)])
process.exit(fails ? 1 : 0)
