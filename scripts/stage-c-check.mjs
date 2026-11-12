// Stage C of the three-layer upgrade (green version): "המשרד שלי" and the eight things only the office gives.
// A community member sees every one closed (what it gives and the way to upgrade, never the screen); an office member
// opens them all. Also the verified mark next to names in the feed and the index.
// Usage: node scripts/stage-c-check.mjs [outDir]     (BASE_GREEN overrides the address)
import puppeteer from 'puppeteer-core'
import { mkdirSync } from 'node:fs'

const green = process.env.BASE_GREEN ?? 'http://localhost:5240/NADLANIL-DEMO/green'
const out = process.argv[2] ?? '_shots'
mkdirSync(out, { recursive: true })
const browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--hide-scrollbars'] })
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
const results = []
const check = (name, ok, detail = '') => results.push(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  [' + detail + ']' : ''}`)

const ids = ['leads', 'report', 'pitch', 'growth', 'deal', 'assistant', 'benefits', 'badge']
// what each screen is made of: none of it may be on the page for a community member
const body = { leads: '.of-leads', report: '.of-paper', pitch: '.of-picks', growth: '.of-goals', deal: '.of-line', assistant: '.of-chat', benefits: '.of-benefits', badge: '.of-order' }
const txt = (page, sel = '.of') => page.evaluate((s) => document.querySelector(s)?.textContent.replace(/\s+/g, ' ') ?? '', sel)
const overflow = (page) => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
const clickText = (page, sel, text) => page.evaluate((s, t) => [...document.querySelectorAll(s)].find((e) => e.textContent.includes(t))?.click(), sel, text)

for (const [label, vp, phone] of [
  ['desktop', { width: 1440, height: 900 }, false],
  ['phone', { width: 390, height: 844, isMobile: true, hasTouch: true }, true],
]) {
  const tag = `green ${label}`
  const page = await browser.newPage()
  const errors = []
  page.on('console', (m) => m.type() === 'error' && !/404/.test(m.text()) && errors.push(m.text()))
  page.on('pageerror', (e) => errors.push(String(e)))
  await page.setViewport(vp)
  const go = async (path, ms = 1400) => {
    await page.goto(green + path, { waitUntil: 'load' })
    await wait(ms)
  }
  const shot = (n) => page.screenshot({ path: `${out}/c-${label}-${n}.png` })
  await go('/', 300)
  await page.evaluate(() => ['nadlanup-agent-v1', 'nadlanup-member-v1', 'nadlanup-wallet-v1'].forEach((k) => localStorage.removeItem(k)))

  // ---- a community member: the list, all closed
  await go('/app')
  if (phone) {
    await clickText(page, '.bottom-link', 'עוד')
    await wait(600)
    check(`${tag}: "המשרד שלי" is in the more sheet`, await page.evaluate(() => [...document.querySelectorAll('.more-link')].some((l) => l.textContent.includes('המשרד שלי'))))
    await clickText(page, '.more-link', 'המשרד שלי')
  } else {
    check(`${tag}: "המשרד שלי" is in the sidebar`, await page.evaluate(() => [...document.querySelectorAll('.side-link')].some((l) => l.textContent.includes('המשרד שלי'))))
    await clickText(page, '.side-link', 'המשרד שלי')
  }
  await wait(1300)
  let st = await page.evaluate(() => ({
    path: location.pathname,
    cards: document.querySelectorAll('.of-card').length,
    locked: document.querySelectorAll('.of-card.is-locked').length,
    chips: [...new Set([...document.querySelectorAll('.of-chip')].map((c) => c.textContent.trim()))],
    banner: document.querySelector('.of-banner')?.textContent ?? '',
    cta: document.querySelector('.of-banner-cta a')?.getAttribute('href') ?? '',
  }))
  check(`${tag}: community member: nine cards, all closed and marked "בלעדי למשרד", with the way to the comparison`, st.path.endsWith('/app/office') && st.cards === 9 && st.locked === 9 && st.chips.join() === 'בלעדי למשרד' && st.banner.includes('כחבר קהילה') && st.cta.endsWith('/upgrade'), JSON.stringify(st))
  check(`${tag}: no sideways overflow on the hub`, (await overflow(page)) <= 1)
  await shot('1-hub-community')

  for (const id of ids) {
    await go(`/app/office/${id}`, 900)
    st = await page.evaluate((sel) => ({ locked: !!document.querySelector('.of-locked'), body: !!document.querySelector(sel), cta: [...document.querySelectorAll('.of-locked-cta a')].map((a) => a.getAttribute('href')), points: document.querySelectorAll('.of-locked li').length }), body[id])
    check(`${tag}: community member: "${id}" is closed: what it gives and an upgrade, not the screen`, st.locked && !st.body && st.points === 3 && st.cta.length === 2 && st.cta[0].endsWith('/upgrade') && st.cta[1].endsWith('/join/office') && (await overflow(page)) <= 1, JSON.stringify(st))
    if (id === 'leads') await shot('2-locked')
  }

  // the mark next to names: the visitor has none as a community member, the sample office brokers do
  await go('/app/brokers')
  const marksCommunity = await page.evaluate(() => document.querySelectorAll('.broker-over .ms-badge').length)
  await go('/app/community', 1800)
  const feedCommunity = await page.evaluate(() => ({ marks: document.querySelectorAll('.fb-name .ms-badge').length, mine: [...document.querySelectorAll('.fb-name')].filter((n) => n.textContent.includes('מאיה לנדאו') && n.querySelector('.ms-badge')).length }))

  // ---- an office member
  await page.evaluate(() => localStorage.setItem('nadlanup-member-v1', 'office'))
  await go('/app/office')
  st = await page.evaluate(() => ({
    locked: document.querySelectorAll('.of-card.is-locked').length,
    chips: [...document.querySelectorAll('.of-card')].map((c) => `${c.dataset.id}:${c.querySelector('.of-chip')?.textContent.trim()}`),
    banner: document.querySelector('.of-banner.is-in')?.textContent ?? '',
  }))
  check(`${tag}: office member: everything is open, the benefits say "בהקמה"`, st.locked === 0 && st.banner.includes('הכול פתוח') && st.chips.filter((c) => c.endsWith(':פתוח')).length === 8 && st.chips.includes('benefits:בהקמה'), JSON.stringify(st.chips))
  await shot('3-hub-office')

  // 1. leads
  await go('/app/office/leads')
  st = await page.evaluate(() => ({ leads: document.querySelectorAll('.of-leads li').length, mine: document.querySelectorAll('.of-leads li:not(.is-other)').length, stats: [...document.querySelectorAll('.of-stats b')].map((b) => b.textContent), areas: document.querySelectorAll('.of-areas li').length, map: !!document.querySelector('.agm') }))
  check(`${tag}: leads: a board of five leads (three for this broker), the week's numbers, and the map by area`, st.leads === 5 && st.mine === 3 && st.stats.join() === '14,3,40' && st.areas === 5 && st.map, JSON.stringify(st))
  await clickText(page, '.of-leads .btn', 'לקחת את הליד')
  await wait(700)
  check(`${tag}: leads: taking a lead works in the demo`, await page.evaluate(() => document.querySelector('.of-leads li.is-taken .btn')?.textContent.includes('אצלך') && document.querySelectorAll('.of-stats b')[1].textContent === '2'))
  check(`${tag}: leads: it says it is a simulation with no real connection`, (await txt(page)).includes('אין חיבור אמיתי ליד2, למדלן או לספקי פרסום') && (await overflow(page)) <= 1)
  await shot('4-leads')

  // 2. the report
  await go('/app/office/report')
  st = await page.evaluate(() => ({ kpis: [...document.querySelectorAll('.of-kpis b')].map((b) => b.textContent), bars: document.querySelectorAll('.of-bars span').length, logo: document.querySelector('.of-paper header img')?.naturalWidth > 0, msgIn: !!document.querySelector('.of-msg.is-in') }))
  check(`${tag}: report: views, inquiries and visits, a chart of the week, in the office's brand`, st.kpis.join() === '312,9,4' && st.bars === 7 && st.logo && !st.msgIn, JSON.stringify(st))
  await clickText(page, '.of-phone-wrap .btn', 'לשלוח עכשיו למוכר')
  await wait(800)
  check(`${tag}: report: "נשלח למוכר" shows the message as the seller gets it`, await page.evaluate(() => !!document.querySelector('.of-msg.is-in') && document.querySelector('.of-phone-wrap .btn').textContent.includes('נשלח למוכר')))
  check(`${tag}: report: no sideways overflow`, (await overflow(page)) <= 1)
  await shot('5-report')

  // 3. the pitch
  await go('/app/office/pitch')
  check(`${tag}: pitch: three properties from the CRM to choose from`, (await page.evaluate(() => document.querySelectorAll('.of-picks button').length)) === 3 && (await page.evaluate(() => !!document.querySelector('.of-deck-empty'))))
  await clickText(page, '.of-make', 'ליצור מצגת')
  await wait(900)
  check(`${tag}: pitch: it shows the work in steps`, await page.evaluate(() => document.querySelectorAll('.of-deck-busy li').length === 3))
  await wait(3600)
  st = await page.evaluate(() => ({ cover: !!document.querySelector('.of-slide.is-cover'), title: document.querySelector('.of-slide h3')?.textContent, nav: document.querySelector('.of-deck-nav span')?.textContent }))
  check(`${tag}: pitch: a branded deck of four slides, starting with the property`, st.cover && st.title === 'דירת גן 4 חדרים' && st.nav.replace(/\s+/g, ' ').includes('שקף 1 מתוך 4'), JSON.stringify(st))
  await shot('6-pitch-cover')
  await page.evaluate(() => document.querySelector('.of-deck-nav button:last-child')?.click())
  await wait(900)
  check(`${tag}: pitch: a price range, marked as a simulated estimate`, (await txt(page, '.of-slide')).includes('טווח מחיר מומלץ') && (await txt(page, '.of-slide')).includes('הערכה מדומה') && (await txt(page)).includes('אין מודל AI אמיתי'))
  await shot('7-pitch-price')
  await page.evaluate(() => document.querySelector('.of-deck-nav button:last-child')?.click())
  await wait(900)
  check(`${tag}: pitch: a marketing plan of four weeks, no overflow`, (await page.evaluate(() => document.querySelectorAll('.of-plan li').length)) === 4 && (await overflow(page)) <= 1)

  // 4. growth
  await go('/app/office/growth')
  st = await page.evaluate(() => ({ goals: document.querySelectorAll('.of-goals li').length, cal: document.querySelectorAll('.of-cal li').length, mentor: document.querySelector('.of-mentor')?.textContent ?? '', tasks: document.querySelectorAll('.of-tasks input').length, done: document.querySelectorAll('.of-tasks input:checked').length }))
  check(`${tag}: growth: three goals, a calendar of sessions, and a mentor with no invented name`, st.goals === 3 && st.cal === 3 && st.mentor.includes('שם ימולא בהמשך') && st.tasks === 3 && st.done === 1, JSON.stringify(st))
  await page.evaluate(() => document.querySelectorAll('.of-tasks input')[1].click())
  await wait(300)
  check(`${tag}: growth: a task can be ticked, no overflow`, (await page.evaluate(() => document.querySelectorAll('.of-tasks input:checked').length)) === 2 && (await overflow(page)) <= 1)
  await shot('8-growth')

  // 5. the deal
  await go('/app/office/deal')
  st = await page.evaluate(() => ({ steps: document.querySelectorAll('.of-line li').length, done: document.querySelectorAll('.of-line li.is-done').length, now: document.querySelectorAll('.of-line li.is-now').length, docs: document.querySelectorAll('.of-docs li').length, who: document.querySelector('.of-deal-who')?.textContent ?? '' }))
  check(`${tag}: deal: a line of six steps (two done, one in work), the documents, and the office's deal manager`, st.steps === 6 && st.done === 2 && st.now === 1 && st.docs === 4 && st.who.includes('מנהלת העסקה, מצוות המשרד') && st.who.includes('שם ימולא בהמשך'), JSON.stringify(st))
  check(`${tag}: deal: it says contracts need a lawyer and the demo signature has no legal force`, (await txt(page)).includes('החוזים דורשים אישור עורך דין. לחתימה בדמו אין תוקף משפטי'))
  await shot('9-deal')
  await clickText(page, '.of-sign .btn', 'לנסות חתימה דיגיטלית')
  await wait(2400)
  check(`${tag}: deal: the signing is a simulation, and says so`, await page.evaluate(() => !!document.querySelector('.of-sign-pad path') && document.querySelector('.modal')?.textContent.includes('אין לזה תוקף משפטי') && document.querySelector('.of-sign-law')?.textContent.includes('דורשים אישור עורך דין')))
  await shot('10-deal-sign')
  await clickText(page, '.of-signer .btn', 'לאשר חתימה')
  await wait(900)
  check(`${tag}: deal: after it the signing step is done, no overflow`, (await page.evaluate(() => document.querySelectorAll('.of-line li.is-done').length === 3 && document.querySelector('.of-sign .btn').textContent.includes('נחתם, בדמו'))) && (await overflow(page)) <= 1)

  // 6. the assistant
  await go('/app/office/assistant', 6600)
  st = await page.evaluate(() => ({ bubbles: document.querySelectorAll('.of-bubble:not(.is-typing)').length, slots: document.querySelectorAll('.of-slots button').length, on: document.querySelectorAll('.of-got-card.is-on').length }))
  check(`${tag}: assistant: the chat plays by itself and offers two times`, st.bubbles === 4 && st.slots === 2 && st.on === 0, JSON.stringify(st))
  await page.evaluate(() => document.querySelector('.of-slots button')?.click())
  await wait(900)
  st = await page.evaluate(() => ({ bubbles: document.querySelectorAll('.of-bubble:not(.is-typing)').length, on: document.querySelectorAll('.of-got-card.is-on').length, last: [...document.querySelectorAll('.of-bubble.is-bot')].pop()?.textContent ?? '', got: document.querySelector('.of-got')?.textContent ?? '' }))
  check(`${tag}: assistant: picking a time sets the meeting and hands the broker a lead`, st.bubbles === 6 && st.on === 2 && st.last.includes('נקבע: יום ג\' 18:00') && st.got.includes('ביקור בנכס, יום ג\' 18:00'), JSON.stringify(st))
  check(`${tag}: assistant: it says the chat is simulated, no overflow`, (await txt(page)).includes('בדמו אין מודל AI אמיתי') && (await overflow(page)) <= 1)
  await shot('11-assistant')

  // 7. benefits
  await go('/app/office/benefits')
  st = await page.evaluate(() => ({ items: document.querySelectorAll('.of-benefits li').length, soon: document.querySelectorAll('.of-benefits em').length, text: document.querySelector('.of')?.textContent ?? '' }))
  check(`${tag}: benefits: all marked "בהקמה", with no supplier names and no prices`, st.items === 4 && st.soon === 4 && st.text.includes('ההטבות בהקמה: אין עדיין ספקים, מחירים או תנאים') && !st.text.includes('₪') && !/\d+%/.test(st.text), `${st.items} items`)
  await clickText(page, '.of-benefits .btn', 'מעניין אותי')
  await wait(400)
  check(`${tag}: benefits: interest can be marked, no overflow`, (await page.evaluate(() => document.querySelectorAll('.of-benefits li.is-on').length)) === 1 && (await overflow(page)) <= 1)
  await shot('12-benefits')

  // 8. the mark
  await go('/app/office/badge')
  st = await page.evaluate(() => ({ order: [...document.querySelectorAll('.of-order li')].map((l) => l.classList.contains('is-office')), id: !!document.querySelector('.of-id .ms-badge') }))
  check(`${tag}: mark: office members come first in a match`, st.id && st.order.join() === 'true,true,false,false' && (await overflow(page)) <= 1, st.order.join())
  await shot('13-badge')
  await go('/app/brokers')
  const marksOffice = await page.evaluate(() => document.querySelectorAll('.broker-over .ms-badge').length)
  check(`${tag}: mark: in the index the visitor gets it only as an office member (3 sample brokers, then 4)`, marksCommunity === 3 && marksOffice === 4, `${marksCommunity} / ${marksOffice}`)
  await shot('14-index')
  await go('/app/community', 1800)
  const feedOffice = await page.evaluate(() => ({ marks: document.querySelectorAll('.fb-name .ms-badge').length, mine: [...document.querySelectorAll('.fb-name')].filter((n) => n.textContent.includes('מאיה לנדאו') && n.querySelector('.ms-badge')).length }))
  check(`${tag}: mark: and in the feed next to the names`, feedCommunity.marks > 0 && feedCommunity.mine === 0 && feedOffice.marks >= feedCommunity.marks, JSON.stringify([feedCommunity, feedOffice]))
  await shot('15-feed')

  // the comparison's office rows lead to the screens
  await go('/upgrade')
  check(`${tag}: the comparison's office-only rows lead to their screens`, (await page.evaluate(() => [...document.querySelectorAll('.up-link')].map((a) => a.getAttribute('href')).filter((h) => h.includes('/app/office/') || h.endsWith('/app/agent')).length)) === 9)

  check(`${tag}: no console errors`, errors.length === 0, errors.slice(0, 2).join(' | '))
  await page.close()
}

await browser.close().catch(() => {})
console.log(results.join('\n'))
console.log(results.some((r) => r.startsWith('FAIL')) ? '\nSOME CHECKS FAILED' : '\nALL CHECKS PASSED')
