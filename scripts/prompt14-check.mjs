// Prompt 14 (Itzik 27.11.2026): three features of the community, on a computer and a phone, by day and by night, in the
// open demo on the green dev server:
//   1. "הצעת נכס" on every buyer's post: a window of my properties, the fitting ones first; the one picked goes to the
//      buyer's broker as a small property card in the chat. With no fitting property: a clear line and "הוספת נכס".
//   2. a buyer in a city I do not work in: straight to a broker of that city (a list, one is picked, a chat opens), or
//      to the whole community, with the tag "הפניה מעיר אחרת" on the post.
//   3. "פורסם לפני X" on every post, and "הקפצה" in place of the "כבר בקהילה" mark: to the top of the feed, the time is
//      updated, once in 24 hours; pressed again, it says when.
// A client's name or phone never shows. Nothing here touches a server. Saves screenshots.
// Usage: node scripts/prompt14-check.mjs [outDir]     (BASE_GREEN overrides the address; ONLY=phone|desktop)
import puppeteer from 'puppeteer-core'
import { mkdirSync } from 'node:fs'

const green = process.env.BASE_GREEN ?? 'http://localhost:5240/NADLANIL-DEMO/green'
const out = process.argv[2] ?? '_shots/prompt-14'
mkdirSync(out, { recursive: true })
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
const browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--hide-scrollbars'] })
// a step that throws ends the run with its reason, and never leaves the browser open behind it
process.on('unhandledRejection', async (e) => {
  console.log(`FAIL  the run stopped: ${String(e).slice(0, 300)}`)
  await browser.close().catch(() => {})
  process.exit(1)
})
let fails = 0
let total = 0
const check = (name, ok, info) => {
  total++
  if (!ok) fails++
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok || info === undefined ? '' : '  [' + JSON.stringify(info) + ']'}`)
}
const DEVICES = [
  ['desktop', { width: 1366, height: 900 }],
  ['phone', { width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }],
].filter(([n]) => !process.env.ONLY || process.env.ONLY === n)
const HOUR = 60 * 60 * 1000
const PHONE = /0\d{1,2}-?\d{3}-?\d{4}/

/** the contrast of an element's words against what is really behind them (the layers under it, put together) */
const CONTRAST = `(sel) => {
  const parse = (c) => {
    let m = c.match(/rgba?[(]([^)]+)[)]/)
    if (m) { const p = m[1].split(/[ ,/]+/).filter(Boolean).map(Number); return [p[0], p[1], p[2], p[3] ?? 1] }
    m = c.match(/color[(]srgb ([^)]+)[)]/)
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
  const fg = over(parse(getComputedStyle(el).color), bg)
  const a = lum(fg), b = lum(bg)
  return Math.round(((Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)) * 100) / 100
}`

async function open(vp, mode) {
  const ctx = await browser.createBrowserContext()
  const page = await ctx.newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 160)))
  await page.setViewport(vp)
  await page.goto(green + '/about', { waitUntil: 'load' })
  await page.evaluate((m) => {
    localStorage.clear()
    localStorage.setItem('nadlanup-demo-v1', '1')
    localStorage.setItem('nadlanup-mode-v1', JSON.stringify({ mode: m, until: Date.now() + 9e9 }))
  }, mode)
  const feed = async (q = '') => {
    await page.goto(green + '/app/community' + q, { waitUntil: 'networkidle2' })
    await page.waitForSelector('.ci-list article', { timeout: 20000 })
    await wait(700)
  }
  const click = async (sel) => {
    await page.waitForSelector(sel, { visible: true, timeout: 8000 })
    await page.$eval(sel, (el) => el.scrollIntoView({ block: 'center' }))
    await wait(150)
    await page.$eval(sel, (el) => el.click())
    await wait(450)
  }
  const patch = async (fn) => {
    await page.evaluate((src) => {
      const s = JSON.parse(localStorage.getItem('brokers-demo-state-v5') ?? '{}')
      // eslint-disable-next-line no-new-func
      new Function('s', src)(s)
      localStorage.setItem('brokers-demo-state-v5', JSON.stringify(s))
    }, fn)
  }
  const state = () => page.evaluate(() => JSON.parse(localStorage.getItem('brokers-demo-state-v5') ?? '{}'))
  const toast = () => page.evaluate(() => document.querySelector('.toast')?.textContent.trim() ?? '')
  const contrast = (sel) => page.evaluate(`(${CONTRAST})(${JSON.stringify(sel)})`)
  const focus = async (sel) => {
    for (let i = 0; i < 2; i++) {
      await page.$eval(sel, (el) => el.scrollIntoView({ block: 'center' }))
      await wait(400)
      await page.evaluate(() => Promise.race([
        Promise.all([...document.images].filter((im) => !im.complete).map((im) => new Promise((r) => { im.onload = im.onerror = r }))),
        new Promise((r) => setTimeout(r, 2500)),
      ]))
      await wait(200)
    }
  }
  const shot = (name) => page.screenshot({ path: `${out}/${name}.png` })
  const sideways = () => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
  return { ctx, page, errors, feed, click, patch, state, toast, contrast, focus, shot, sideways }
}

for (const [device, vp] of DEVICES) {
  for (const mode of ['day', 'night']) {
    const t = `${device} ${mode}`
    const d = await open(vp, mode)
    const name = (n) => `${device}-${mode}-${n}`

    // ================================================================ 1. "הצעת נכס" on a buyer's post
    await d.feed('?topic=seeking')
    const buttons = await d.page.evaluate(() => {
      const cards = [...document.querySelectorAll('.ci-list article')].filter((a) => a.querySelector('.fb-search'))
      const others = cards.filter((a) => !a.querySelector('.ci-mine'))
      const b = others.map((a) => a.querySelector('[data-act="offer-property"]'))
      return {
        cards: others.length,
        withButton: b.filter(Boolean).length,
        text: [...new Set(b.filter(Boolean).map((x) => x.textContent.trim()))],
        h: Math.min(...b.filter(Boolean).map((x) => x.getBoundingClientRect().height)),
        mine: cards.filter((a) => a.querySelector('.ci-mine')).some((a) => a.querySelector('[data-act="offer-property"]')),
        old: others.filter((a) => /יש לי נכס מתאים/.test(a.textContent) || a.querySelector('.fb-search .ci-cta')).length,
        perCard: Math.max(...others.map((a) => a.querySelectorAll('.fb-search .fb-embed-cta button').length)),
      }
    })
    check(`${t}: every buyer's post of another broker has "הצעת נכס"`, buttons.cards >= 5 && buttons.withButton === buttons.cards && buttons.text.join() === 'הצעת נכס', buttons)
    check(`${t}: the old "יש לי נכס מתאים" button is gone: one button on a buyer's post`, buttons.old === 0 && buttons.perCard === 1, buttons)
    check(`${t}: a thumb hits the button (44px), and my own buyer's post has none`, buttons.h >= 44 && buttons.mine === false, buttons)
    await d.focus('#ci-s8')
    const offerLook = await d.page.evaluate(() => {
      const b = document.querySelector('#ci-s8 [data-act="offer-property"]')
      const cs = getComputedStyle(b)
      return { primary: b.classList.contains('btn-gold'), color: cs.color, weight: Number(cs.fontWeight), size: parseFloat(cs.fontSize), icon: !!b.querySelector('svg') }
    })
    check(`${t}: "הצעת נכס" is the post's main button: the site's green, white bold words, an icon`, offerLook.primary && offerLook.weight >= 600 && offerLook.size >= 14 && offerLook.icon, offerLook)
    await d.shot(name('1-offer-button'))

    // the window: my properties, the fitting ones first
    await d.click('#ci-s8 [data-act="offer-property"]')
    await d.page.waitForSelector('[data-offer-window="s8"]', { visible: true, timeout: 8000 })
    await wait(500)
    const st0 = await d.state()
    const clientsOfMine = [...new Set((st0.crm ?? []).map((c) => c.client).filter((x) => x && x.length > 2))]
    const win = await d.page.evaluate(() => {
      const w = document.querySelector('[data-offer-window]')
      const rows = [...w.querySelectorAll('[data-offer]')].map((r) => ({ id: r.dataset.offer, fits: r.dataset.fits, text: r.textContent, h: r.getBoundingClientRect().height, tag: !!r.querySelector('[data-fit]') }))
      return { rows, need: w.querySelector('[data-need]')?.textContent ?? '', text: w.textContent, empty: !!w.querySelector('[data-empty]'), title: document.querySelector('.modal h2, .modal-title, .modal header')?.textContent ?? '' }
    })
    const fitsOrder = win.rows.map((r) => r.fits).join('')
    check(`${t}: the window lists my properties, and says what the buyer looks for`, win.rows.length >= 4 && /רמת גן/.test(win.need) && /חדרים/.test(win.need) && /₪/.test(win.need), { rows: win.rows.length, need: win.need })
    check(`${t}: the fitting properties come first, each marked "מתאים לקונה"`, /^1+0*$/.test(fitsOrder) && win.rows.filter((r) => r.fits === '1').every((r) => r.tag) && win.rows.filter((r) => r.fits === '0').every((r) => !r.tag) && !win.empty, fitsOrder)
    check(`${t}: each row says the place, the rooms and the price`, win.rows.every((r) => /₪/.test(r.text) && r.h >= 64), win.rows.map((r) => r.text.slice(0, 40)))
    check(`${t}: no client's name and no phone in the window`, !PHONE.test(win.text) && clientsOfMine.every((n) => !win.text.includes(n)), clientsOfMine.filter((n) => win.text.includes(n)))
    check(`${t}: nothing scrolls sideways with the window open`, (await d.sideways()) <= 1)
    await d.shot(name('2-offer-window'))

    // one is picked: it goes to the buyer's broker as a small card in the chat
    const picked = win.rows[0]
    await d.click(`[data-offer="${picked.id}"]`)
    await d.page.waitForSelector('[data-chat="s8"] [data-chat-card]', { visible: true, timeout: 8000 })
    await wait(600)
    const chat = await d.page.evaluate(() => {
      const c = document.querySelector('[data-chat="s8"]')
      const card = c.querySelector('[data-chat-card]')
      return { label: c.getAttribute('aria-label'), card: card.textContent, from: card.closest('[data-msg]')?.dataset.msg, cards: c.querySelectorAll('[data-chat-card]').length, window: !!document.querySelector('[data-offer-window]'), text: c.textContent }
    })
    check(`${t}: the window closes and the chat with the buyer's broker opens`, chat.window === false && /צ'אט עם/.test(chat.label ?? ''), chat.label)
    check(`${t}: the property is in the chat as a small card of mine: title, place, price`, chat.cards === 1 && chat.from === 'me' && /₪/.test(chat.card) && chat.card.length > 12, chat.card)
    check(`${t}: no client's name and no phone in the chat`, !PHONE.test(chat.text) && clientsOfMine.every((n) => !chat.text.includes(n)))
    const cardC = await d.contrast('[data-chat-card] b')
    check(`${t}: the card's words read (4.5:1 or more)`, cardC >= 4.5, cardC)
    await d.page.waitForSelector('[data-chat="s8"] [data-msg="them"]', { timeout: 9000 }).catch(() => {})
    const answered = await d.page.evaluate(() => document.querySelectorAll('[data-chat="s8"] [data-msg="them"]').length)
    check(`${t}: the other broker answers about the property (the demo's automatic answer)`, answered === 1, answered)
    await wait(400)
    await d.shot(name('3-offer-chat'))
    await d.click('[data-act="close-chat"]')

    // the same property again: it is not sent twice
    await d.click('#ci-s8 [data-act="offer-property"]')
    await d.click(`[data-offer="${picked.id}"]`)
    await d.page.waitForSelector('[data-chat="s8"]', { visible: true, timeout: 8000 })
    await wait(500)
    const twice = await d.page.evaluate(() => document.querySelectorAll('[data-chat="s8"] [data-chat-card]').length)
    check(`${t}: the same property is not sent twice to the same buyer`, twice === 1, twice)
    await d.click('[data-act="close-chat"]')

    // a buyer nothing of mine fits: a clear line, and "הוספת נכס"
    await d.click('#ci-s5 [data-act="offer-property"]')
    await d.page.waitForSelector('[data-offer-window="s5"] [data-empty]', { visible: true, timeout: 8000 })
    await wait(400)
    const none = await d.page.evaluate(() => {
      const w = document.querySelector('[data-offer-window]')
      const b = w.querySelector('[data-act="add-property"]')
      return { line: w.querySelector('[data-empty] b')?.textContent, add: b?.textContent.trim(), h: b?.getBoundingClientRect().height, fits: w.querySelectorAll('[data-fits="1"]').length, rest: w.querySelectorAll('[data-list="rest"] [data-offer]').length }
    })
    check(`${t}: with no fitting property there is a clear line and "הוספת נכס"`, none.line === 'אין לך כרגע נכס שמתאים לקונה הזה' && none.add === 'הוספת נכס' && none.h >= 44 && none.fits === 0, none)
    check(`${t}: my other properties are still there to send`, none.rest >= 4, none.rest)
    const emptyC = await d.contrast('[data-empty] p')
    check(`${t}: the line of the empty state reads`, emptyC >= 4.5, emptyC)
    await d.shot(name('4-offer-empty'))
    await d.click('[data-act="add-property"]')
    await wait(500)
    check(`${t}: "הוספת נכס" closes the window and opens the new property form`, await d.page.evaluate(() => !document.querySelector('[data-offer-window]') && !!document.querySelector('.modal, [role="dialog"]')))
    await d.page.keyboard.press('Escape')
    await wait(300)

    // ================================================================ 2. a buyer in a city I do not work in
    await d.feed('?topic=seeking')
    await d.click('[data-act="pick-buyer"]')
    await d.page.waitForSelector('[data-picker="buyer"] [data-pick="k4"]', { visible: true, timeout: 8000 })
    await d.click('[data-picker="buyer"] [data-pick="k4"]')
    await d.page.waitForSelector('[data-other-city-ask]', { visible: true, timeout: 8000 })
    await wait(400)
    const ask = await d.page.evaluate(() => {
      const a = document.querySelector('[data-other-city-ask]')
      return { text: a.textContent, opts: [...a.querySelectorAll('.oc-opt b')].map((b) => b.textContent.trim()), h: Math.min(...[...a.querySelectorAll('.oc-opt')].map((o) => o.getBoundingClientRect().height)) }
    })
    check(`${t}: a buyer in a city I do not work in opens two choices`, /רמת השרון/.test(ask.text) && ask.opts.join('|') === 'הפניה ישירה למתווך מהעיר|פרסום לכל הקהילה' && ask.h >= 64, ask)
    check(`${t}: nothing was published yet`, !(await d.state()).items.some((it) => it.sourceId === 'client:k4'))
    check(`${t}: the question shows no client's name and no phone`, !/אבירם/.test(ask.text) && !PHONE.test(ask.text), ask.text)
    const askC = await d.contrast('[data-other-city-ask] .oc-opt small')
    check(`${t}: the choices read (4.5:1 or more)`, askC >= 4.5, askC)

    // a: straight to a broker of that city
    await d.click('[data-act="refer-direct"]')
    const brokers = await d.page.evaluate(() => [...document.querySelectorAll('[data-brokers] [data-broker]')].map((b) => ({ id: b.dataset.broker, text: b.textContent, h: b.getBoundingClientRect().height })))
    check(`${t}: the first choice lists brokers who work in that city`, brokers.length >= 1 && brokers.every((b) => /רמת השרון|הרצליה/.test(b.text) && b.h >= 56) && !brokers.some((b) => b.id === 'b1'), brokers.map((b) => b.text))
    check(`${t}: nothing scrolls sideways in the question`, (await d.sideways()) <= 1)
    await d.shot(name('5-other-city-ask'))
    await d.click(`[data-broker="${brokers[0].id}"]`)
    await d.page.waitForSelector(`[data-chat="ref-k4-${brokers[0].id}"]`, { visible: true, timeout: 8000 })
    await wait(500)
    const ref = await d.page.evaluate(() => {
      const c = document.querySelector('[data-chat^="ref-k4-"]')
      return { text: c.textContent, input: c.querySelector('[data-f="chat-input"]').value, head: c.querySelector('[data-chat-property]')?.textContent ?? '', ask: !!document.querySelector('[data-other-city-ask]') }
    })
    check(`${t}: one is picked and a chat opens, with a ready first line about the buyer`, ref.ask === false && /רמת השרון/.test(ref.input) && /הפניה/.test(ref.input), ref.input)
    check(`${t}: the chat shows what the buyer looks for, never the name or the phone`, /רמת השרון/.test(ref.head) && !/אבירם/.test(ref.text + ref.input) && !PHONE.test(ref.text + ref.input), ref.head)
    check(`${t}: the direct referral publishes nothing in the feed`, !(await d.state()).items.some((it) => it.sourceId === 'client:k4'))
    await d.shot(name('6-other-city-chat'))
    await d.click('[data-act="close-chat"]')

    // b: to the whole community, with the tag
    await d.click('[data-act="pick-buyer"]')
    await d.click('[data-picker="buyer"] [data-pick="k4"]')
    await d.page.waitForSelector('[data-other-city-ask]', { visible: true, timeout: 8000 })
    await d.click('[data-act="publish-all"]')
    await wait(1300)
    const st1 = await d.state()
    const post = st1.items.find((it) => it.sourceId === 'client:k4')
    check(`${t}: "פרסום לכל הקהילה" publishes the buyer in "מחפש לקונה"`, !!post && post.topicId === 'seeking' && post.otherCity === true && /topic=seeking/.test(await d.page.evaluate(() => location.search)), post?.title)
    const card = await d.page.evaluate((id) => {
      const a = document.querySelector(`#ci-${CSS.escape(id)}`)
      return a ? { tag: a.querySelector('[data-other-city]')?.textContent.trim(), text: a.textContent, first: document.querySelector('.ci-list article')?.id === a.id } : null
    }, post?.id ?? 'x')
    check(`${t}: the post carries the tag "הפניה מעיר אחרת"`, card?.tag === 'הפניה מעיר אחרת', card?.tag)
    check(`${t}: the post shows no client's name and no phone`, !!card && !/אבירם/.test(card.text) && !PHONE.test(card.text))
    const tagC = await d.contrast(`#ci-${post?.id} [data-other-city]`)
    check(`${t}: the tag reads (4.5:1 or more)`, tagC >= 4.5, tagC)
    await d.focus(`#ci-${post?.id}`)
    await d.shot(name('7-other-city-post'))

    // a buyer in a city I do work in is published as always: no question, no tag
    await d.click('[data-act="pick-buyer"]')
    await d.click('[data-picker="buyer"] [data-pick="k1"]')
    await wait(1300)
    const st2 = await d.state()
    const own = st2.items.find((it) => it.sourceId === 'client:k1')
    check(`${t}: a buyer in my own city is published at once, with no question and no tag`, !!own && !own.otherCity && (await d.page.evaluate(() => !document.querySelector('[data-other-city-ask]'))) && (await d.page.evaluate((id) => !document.querySelector(`#ci-${CSS.escape(id)} [data-other-city]`), own?.id ?? 'x')), own?.title)

    // ================================================================ 3. "פורסם לפני X" and "הקפצה"
    await d.patch(`s.items = s.items.map((it) => (it.id === 's1' ? { ...it, at: Date.now() - ${3 * HOUR + 60000} } : it.id === 's8' ? { ...it, at: Date.now() - ${48 * HOUR + 60000} } : it))`)
    await d.feed('?topic=seeking')
    const times = await d.page.evaluate(() => ({
      all: [...document.querySelectorAll('.ci-list article')].map((a) => a.querySelector('[data-posted]')?.textContent.trim() ?? ''),
      s1: document.querySelector('#ci-s1 [data-posted]')?.textContent.trim(),
      s8: document.querySelector('#ci-s8 [data-posted]')?.textContent.trim(),
    }))
    check(`${t}: every post says how long ago it was published`, times.all.length >= 6 && times.all.every((x) => /^פורסם (עכשיו|לפני \S+)/.test(x)), times.all.filter((x) => !/^פורסם (עכשיו|לפני \S+)/.test(x)))
    check(`${t}: "פורסם לפני 3 שעות" and "פורסם לפני יומיים"`, times.s1 === 'פורסם לפני 3 שעות' && times.s8 === 'פורסם לפני יומיים', times)
    const postedC = await d.contrast('#ci-s1 [data-posted]')
    check(`${t}: the time reads (4.5:1 or more)`, postedC >= 4.5, postedC)

    // in the list of my buyers, the published one carries "הקפצה" in place of "כבר בקהילה"
    await d.click('[data-act="pick-buyer"]')
    await d.page.waitForSelector('[data-picker="buyer"] [data-pick="k4"] [data-act="bump"]', { visible: true, timeout: 8000 })
    const row = await d.page.evaluate(() => {
      const r = document.querySelector('[data-picker="buyer"] [data-pick="k4"]')
      const b = r.querySelector('[data-act="bump"]')
      return { text: r.textContent, bump: b.textContent.trim(), ready: b.dataset.ready, h: b.getBoundingClientRect().height, old: /כבר בקהילה/.test(document.querySelector('[data-picker="buyer"]').textContent) }
    })
    check(`${t}: "הקפצה" is there in place of the "כבר בקהילה" mark`, row.bump === 'הקפצה' && row.old === false && row.h >= 44, row)
    const bumpC = await d.contrast('[data-picker="buyer"] [data-pick="k4"] [data-act="bump"]')
    check(`${t}: "הקפצה" reads (4.5:1 or more)`, bumpC >= 4.5, bumpC)
    await d.shot(name('8-bump-in-list'))
    // published a moment ago: it waits its 24 hours, and says when
    await d.click('[data-picker="buyer"] [data-pick="k4"] [data-act="bump"]')
    const early = { toast: await d.toast(), bumped: (await d.state()).items.find((it) => it.sourceId === 'client:k4').bumpedAt ?? null }
    check(`${t}: pressed before 24 hours passed, it says when it will be possible`, early.toast === 'אפשר להקפיץ שוב בעוד 24 שעות' && early.bumped === null, early)
    await d.page.keyboard.press('Escape')
    await wait(300)

    // a day later it lifts: to the top of the feed, and the time is updated
    await d.patch(`s.items = s.items.map((it) => (it.sourceId === 'client:k4' ? { ...it, at: Date.now() - ${25 * HOUR}, fresh: false } : it))`)
    await d.feed('?topic=seeking')
    const mineId = post?.id
    const before = await d.page.evaluate((id) => ({ posted: document.querySelector(`#ci-${CSS.escape(id)} [data-posted]`)?.textContent.trim(), first: document.querySelector('.ci-list article')?.id, bump: document.querySelector(`#ci-${CSS.escape(id)} [data-act="bump"]`)?.textContent.trim(), ready: document.querySelector(`#ci-${CSS.escape(id)} [data-act="bump"]`)?.dataset.ready }), mineId)
    check(`${t}: a day later my post says "פורסם לפני יום", is no longer first, and "הקפצה" is ready`, before.posted === 'פורסם לפני יום' && before.first !== `ci-${mineId}` && before.bump === 'הקפצה' && before.ready === '1', before)
    await d.focus(`#ci-${mineId}`)
    await d.shot(name('9-bump-ready'))
    await d.click(`#ci-${mineId} [data-act="bump"]`)
    await wait(600)
    const lifted = await d.page.evaluate((id) => ({ first: document.querySelector('.ci-list article')?.id, posted: document.querySelector(`#ci-${CSS.escape(id)} [data-posted]`)?.textContent.trim(), mark: document.querySelector(`#ci-${CSS.escape(id)} [data-bumped]`)?.textContent.trim(), ready: document.querySelector(`#ci-${CSS.escape(id)} [data-act="bump"]`)?.dataset.ready, toast: document.querySelector('.toast')?.textContent.trim() }), mineId)
    check(`${t}: "הקפצה" lifts the post to the top of the feed and updates the time`, lifted.first === `ci-${mineId}` && lifted.posted === 'פורסם עכשיו' && lifted.mark === 'הוקפץ' && lifted.toast === 'הפוסט עלה לראש הפיד', lifted)
    await d.click(`#ci-${mineId} [data-act="bump"]`)
    const second = { toast: await d.toast(), ready: lifted.ready }
    check(`${t}: a second lift within 24 hours is refused, with the time it will be possible`, second.toast === 'אפשר להקפיץ שוב בעוד 24 שעות' && second.ready === '0', second)
    const others = await d.page.evaluate(() => [...document.querySelectorAll('.ci-list article')].filter((a) => !a.querySelector('.ci-mine')).some((a) => a.querySelector('[data-act="bump"]')))
    check(`${t}: only the one who published sees "הקפצה"`, others === false)
    const waitC = await d.contrast(`#ci-${mineId} [data-act="bump"]`)
    check(`${t}: the waiting "הקפצה" still reads`, waitC >= 4.5, waitC)
    check(`${t}: nothing scrolls sideways in the feed`, (await d.sideways()) <= 1)
    await d.focus(`#ci-${mineId}`)
    await d.shot(name('10-bump-lifted'))

    check(`${t}: no error on the page`, d.errors.length === 0, d.errors)
    await d.ctx.close()
  }
}

await browser.close().catch(() => {})
console.log(`\n${total - fails} passed, ${fails} failed`)
console.log(fails ? 'SOME CHECKS FAILED' : 'ALL CHECKS PASSED')
process.exit(fails ? 1 : 0)
