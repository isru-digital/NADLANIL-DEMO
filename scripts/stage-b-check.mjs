// Stage B of the three-layer upgrade (green version): the credits wallet of a community member, the monthly quota of
// an office member, the marks on the lab's tools, the simulated charge, the "no credits" and "quota used" screens,
// and the three-column comparison page.
// Usage: node scripts/stage-b-check.mjs [outDir]     (BASE_GREEN overrides the address)
import puppeteer from 'puppeteer-core'
import { mkdirSync } from 'node:fs'

const green = process.env.BASE_GREEN ?? 'http://localhost:5240/NADLANIL-DEMO/green'
const out = process.argv[2] ?? '_shots'
mkdirSync(out, { recursive: true })
const browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--hide-scrollbars'] })
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
const results = []
const check = (name, ok, detail = '') => results.push(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  [' + detail + ']' : ''}`)

const seen = (sel) => `[...document.querySelectorAll('${sel}')].find((n) => n.getBoundingClientRect().width > 0)`
const chipText = (page) => page.evaluate(`(${seen('.mb-chip')})?.textContent.replace(/\\s+/g, ' ').trim()`)
const wallet = (page) => page.evaluate(() => JSON.parse(localStorage.getItem('nadlanup-wallet-v1') ?? 'null'))
const flip = (page, v) => page.evaluate(`(${seen('.ms')}).querySelector('button[data-v="${v}"]').click()`)
const tile = (page, id) => page.evaluate((i) => document.querySelector(`.bl-tile[data-id="${i}"]`)?.click(), id)
const chips = (page) => page.evaluate(() => Object.fromEntries([...document.querySelectorAll('.bl-tile')].map((t) => [t.dataset.id, t.querySelector('.bl-chip')?.textContent.replace(/\s+/g, ' ').trim()])))
const ask = (page) =>
  page.evaluate(() => {
    const a = document.querySelector('.tl-ask')
    return a ? { kind: a.dataset.kind, title: document.querySelector('.modal-head')?.textContent ?? '', text: a.textContent.replace(/\s+/g, ' ') } : null
  })
const peekTitle = (page) => page.evaluate(() => document.querySelector('.bl-view .bl-title h2')?.textContent ?? null)
const toHub = (page) => page.evaluate(() => document.querySelector('.bl-hubbtn')?.click())

async function openHub(page, phone) {
  if (phone) {
    await page.evaluate(() => [...document.querySelectorAll('.bottom-link')].find((b) => b.textContent.includes('עוד'))?.click())
    await wait(700)
    await page.evaluate(() => [...document.querySelectorAll('.more-link')].find((b) => b.textContent.includes('מעבדת בטא'))?.click())
  } else {
    await page.evaluate(() => document.querySelector('.side-lab-link.is-all')?.click())
  }
  await wait(1100)
}
/** Opens a paid tool with credits and comes back to the hub. */
async function payFor(page, id, phone) {
  await tile(page, id)
  await wait(900)
  const a = await ask(page)
  if (a?.kind !== 'pay') return a
  await page.evaluate(() => document.querySelector('.tl-go')?.click())
  await wait(1300)
  if (id === 'room') {
    // the deal room has its own pop-up: closing it closes the lab, so the list is opened again
    await page.evaluate(() => document.querySelector('.dr-x')?.click())
    await wait(900)
    await openHub(page, phone)
  } else {
    await toHub(page)
    await wait(900)
  }
  return a
}

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
  await page.goto(green + '/', { waitUntil: 'load' })
  await page.evaluate(() => ['nadlanup-agent-v1', 'nadlanup-member-v1', 'nadlanup-wallet-v1'].forEach((k) => localStorage.removeItem(k)))
  await page.goto(green + '/app', { waitUntil: 'load' })
  await wait(1600)

  // ---- a community member: the wallet
  check(`${tag}: community member: a wallet of 12 credits in the top bar`, /^12 ?קרדיטים$/.test((await chipText(page)) ?? '') || (await chipText(page)) === '12', await chipText(page))
  check(`${tag}: no sideways overflow in the app`, (await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)) <= 1)
  await page.screenshot({ path: `${out}/b-${label}-1-app-community.png` })
  await page.evaluate(`(${seen('.mb-chip')}).click()`)
  await wait(800)
  let t = await page.evaluate(() => document.querySelector('.mb-sheet')?.textContent.replace(/\s+/g, ' ') ?? '')
  check(`${tag}: the wallet sheet: balance, what each tool costs, no price for a credit, a way to the comparison`, t.includes('מחיר קרדיט: מחיר יקבע') && t.includes('חדר עסקה משותף') && t.includes('3 קרדיטים') && t.includes('1 חינם בחודש') && !t.includes('₪') && (await page.evaluate(() => document.querySelector('.mb-cta')?.getAttribute('href')?.endsWith('/upgrade'))), t.slice(0, 120))
  await page.screenshot({ path: `${out}/b-${label}-2-wallet.png` })
  await page.evaluate(() => document.querySelector('.modal .icon-btn')?.click())
  await wait(600)

  // ---- the lab in layers
  await openHub(page, phone)
  let c = await chips(page)
  const groupsNow = await page.evaluate(() => [...document.querySelectorAll('.bl-group b')].map((b) => b.textContent))
  check(`${tag}: the lab is in two groups: free in the community, and advanced tools`, groupsNow.join('|') === 'חינם בקהילה|כלים מתקדמים', groupsNow.join('|'))
  check(`${tag}: free tools are marked free, paid ones "פתח בקרדיטים" with their cost, the urgent request "1 חינם בחודש"`, c.whatsapp === 'חינם בקהילה' && c.trust === 'חינם בקהילה' && c.voice === 'פתח בקרדיטים · 1' && c.room === 'פתח בקרדיטים · 3' && c.urgent === '1 חינם בחודש' && Object.keys(c).length === 10, JSON.stringify(c))
  await page.screenshot({ path: `${out}/b-${label}-3-lab-community.png` })

  await tile(page, 'whatsapp')
  await wait(1000)
  check(`${tag}: a free tool opens at once, with no charge`, (await peekTitle(page)) === 'מוואטסאפ למערכת' && !(await ask(page)) && (await page.evaluate(() => document.querySelector('.bl-badges')?.textContent.includes('חינם בקהילה'))) && (await wallet(page))?.credits !== 11)
  await toHub(page)
  await wait(900)

  await tile(page, 'voice')
  await wait(900)
  let a = await ask(page)
  check(`${tag}: a paid tool asks to confirm a demo charge: cost, balance before and after, no price`, a?.kind === 'pay' && a.title.includes('פתיחה בקרדיטים') && a.title.includes('חיוב דמו בלבד') && a.text.includes('קרדיט אחד') && /12\s*11/.test(a.text) && a.text.includes('מחיר יקבע') && !a.text.includes('₪'), JSON.stringify(a))
  check(`${tag}: the tool is not open yet (the list is still behind the question)`, (await peekTitle(page)) === 'מעבדת בטא')
  await page.screenshot({ path: `${out}/b-${label}-4-ask.png` })
  await page.evaluate(() => document.querySelector('.modal .icon-btn')?.click())
  await wait(800)
  check(`${tag}: cancelling charges nothing and stays in the list`, (await wallet(page)) === null || (await wallet(page)).credits === 12)
  check(`${tag}: ... and the list is still there`, (await peekTitle(page)) === 'מעבדת בטא' && !(await ask(page)))

  await tile(page, 'voice')
  await wait(900)
  await page.evaluate(() => document.querySelector('.tl-go')?.click())
  await wait(1300)
  check(`${tag}: confirming takes the credit and opens the tool`, (await wallet(page)).credits === 11 && (await peekTitle(page)) === 'הקלטה אחת, מודעה שלמה' && (await chipText(page)).startsWith('11'), JSON.stringify(await wallet(page)))
  check(`${tag}: the open tool says it was opened with credits`, await page.evaluate(() => document.querySelector('.bl-badges')?.textContent.includes('נפתח בקרדיטים')))
  await page.screenshot({ path: `${out}/b-${label}-5-opened.png` })
  await toHub(page)
  await wait(900)
  check(`${tag}: back in the list the tool is marked open, and opening it again is not charged twice`, (await chips(page)).voice === 'פתוח')
  await tile(page, 'voice')
  await wait(900)
  check(`${tag}: ... (no second charge)`, !(await ask(page)) && (await wallet(page)).credits === 11)
  await toHub(page)
  await wait(900)

  // the urgent request: one free a month, then credits
  await tile(page, 'urgent')
  await wait(1000)
  check(`${tag}: the first urgent request of the month is free`, (await peekTitle(page)) === 'בקשה בוערת' && !(await ask(page)) && (await wallet(page)).credits === 11 && (await wallet(page)).urgentFreeUsed === true)
  await toHub(page)
  await wait(900)
  check(`${tag}: after it the tool asks for credits`, (await chips(page)).urgent === 'פתח בקרדיטים · 1')
  await tile(page, 'urgent')
  await wait(900)
  a = await ask(page)
  check(`${tag}: ... and says the free one was used`, a?.kind === 'pay' && a.text.includes('הבקשה הבוערת החינמית של החודש כבר נוצלה'))
  await page.evaluate(() => document.querySelector('.modal .icon-btn')?.click())
  await wait(800)

  // spend down to nothing: room 3, pros 2, folder 2, radar 2, matchmaker 2 = 11
  for (const id of ['room', 'pros', 'folder', 'radar', 'matchmaker']) await payFor(page, id, phone)
  check(`${tag}: the balance goes down with every tool (11 credits spent)`, (await wallet(page)).credits === 0 && (await chipText(page)).startsWith('0'), JSON.stringify(await wallet(page)))
  await tile(page, 'wallet')
  await wait(900)
  a = await ask(page)
  check(`${tag}: with no credits left: a "לא נשארו קרדיטים" screen that leads to the comparison, with no price`, a?.kind === 'empty' && a.title.includes('לא נשארו קרדיטים') && a.text.includes('להשוואת המסלולים ולשדרוג למשרד') && !a.text.includes('₪'), JSON.stringify(a))
  await page.screenshot({ path: `${out}/b-${label}-6-empty.png` })
  await page.evaluate(() => document.querySelector('.tl-go')?.click())
  await wait(1600)

  // ---- the comparison page
  let st = await page.evaluate(() => ({
    path: location.pathname,
    cols: [...document.querySelectorAll('.up-col')].map((x) => [x.querySelector('b')?.textContent, x.querySelector('strong')?.textContent, x.querySelector('small')?.textContent]),
    you: [...document.querySelectorAll('.up-col')].filter((x) => x.querySelector('u')).map((x) => x.querySelector('b')?.textContent),
    groups: [...document.querySelectorAll('.up-group h2')].map((h) => h.firstChild.textContent.trim()),
    rows: document.querySelectorAll('.up-row').length,
    exclusive: [...document.querySelectorAll('.up-group:last-of-type .up-row')].length,
    cta: [...document.querySelectorAll('.up-cta a')].map((x) => x.getAttribute('href')),
    overflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    text: document.querySelector('.up')?.textContent ?? '',
  }))
  check(`${tag}: the "no credits" screen leads to the comparison page`, st.path.endsWith('/upgrade'))
  check(`${tag}: three columns: the community free, credits by use with no price, the office at 689 a month and 0%`, JSON.stringify(st.cols) === JSON.stringify([['הקהילה', 'חינם', 'תמיד'], ['קרדיטים', 'לפי שימוש', 'מחיר קרדיט: מחיר יקבע'], ['המשרד', '689 ₪ לחודש', '0% עמלה למשרד']]), JSON.stringify(st.cols))
  check(`${tag}: three groups of rows: the base, advanced tools, office only`, st.groups.join('|') === 'הבסיס|כלים מתקדמים|בלעדי למשרד' && st.rows === 23 && st.exclusive === 10, `${st.groups.join('|')} / ${st.rows} rows`)
  check(`${tag}: it marks the layer being viewed (the community), benefits are "בהקמה", and no invented price`, st.you.join() === 'הקהילה' && st.text.includes('בהקמה') && (st.text.match(/₪/g) ?? []).length === 2 && !/[\u2013\u2014]/.test(st.text), `${st.you.join()} / ${(st.text.match(/₪/g) ?? []).length} shekel signs`)
  check(`${tag}: its buttons lead to the free join, the app and the office join`, st.cta.length === 3 && st.cta[0].endsWith('/join/community') && st.cta[1].endsWith('/app') && st.cta[2].endsWith('/join/office'), st.cta.join(' '))
  check(`${tag}: no sideways overflow on the comparison`, st.overflowX <= 1, `${st.overflowX}px`)
  await page.screenshot({ path: `${out}/b-${label}-7-upgrade.png` })
  await page.evaluate(() => document.querySelectorAll('.up-group')[1]?.scrollIntoView({ block: 'start' }))
  await wait(900)
  await page.screenshot({ path: `${out}/b-${label}-8-upgrade-mid.png` })
  await page.evaluate(() => document.querySelector('.up-cta')?.scrollIntoView({ block: 'end' }))
  await wait(900)
  await page.screenshot({ path: `${out}/b-${label}-9-upgrade-end.png` })

  // the join pages lead there too
  await page.goto(green + '/join', { waitUntil: 'load' })
  await wait(1200)
  check(`${tag}: the join choice links to the comparison`, await page.evaluate(() => document.querySelector('.jc-compare')?.getAttribute('href')?.endsWith('/upgrade')))

  // ---- an office member: the quota
  await page.goto(green + '/app', { waitUntil: 'load' })
  await wait(1500)
  check(`${tag}: the wallet is kept after a reload`, (await chipText(page)).startsWith('0'))
  await flip(page, 'office')
  await wait(900)
  check(`${tag}: office member: the top bar shows the monthly quota instead of the wallet (3/10)`, (await chipText(page)).replace(/\s/g, '').startsWith('3/10'), await chipText(page))
  await page.screenshot({ path: `${out}/b-${label}-10-app-office.png` })
  await openHub(page, phone)
  c = await chips(page)
  check(`${tag}: office member: every advanced tool is "כלול במשרד", free ones stay free`, ['voice', 'room', 'urgent', 'radar', 'matchmaker', 'folder', 'wallet', 'pros'].every((id) => c[id] === 'כלול במשרד') && c.whatsapp === 'חינם בקהילה', JSON.stringify(c))
  await page.screenshot({ path: `${out}/b-${label}-11-lab-office.png` })
  await tile(page, 'wallet')
  await wait(1100)
  check(`${tag}: office member: a tool opens with no charge and counts in the quota (4/10)`, (await peekTitle(page)) === 'ארנק עמלות' && !(await ask(page)) && (await wallet(page)).quotaUsed === 4 && (await wallet(page)).credits === 0 && (await page.evaluate(() => document.querySelector('.bl-badges')?.textContent.includes('כלול במשרד'))))
  await toHub(page)
  await wait(800)
  for (const id of ['voice', 'urgent', 'radar', 'matchmaker', 'folder', 'pros']) {
    await tile(page, id)
    await wait(1000)
    await toHub(page)
    await wait(800)
  }
  check(`${tag}: the quota fills up (10/10)`, (await wallet(page)).quotaUsed === 10 && (await chipText(page)).replace(/\s/g, '').startsWith('10/10'), JSON.stringify(await wallet(page)))
  await tile(page, 'room')
  await wait(900)
  a = await ask(page)
  check(`${tag}: over the quota: a gentle note that it renews next month, with no price`, a?.kind === 'quota' && a.title.includes('המכסה החודשית נוצלה') && a.text.includes('מתחדשת בתחילת החודש הבא') && !a.text.includes('₪') && !a.text.includes('קרדיט'), JSON.stringify(a))
  await page.screenshot({ path: `${out}/b-${label}-12-quota.png` })
  await page.evaluate(() => document.querySelector('.tl-go')?.click())
  await wait(800)
  check(`${tag}: ... and the tools already opened this month stay open`, (await peekTitle(page)) === 'מעבדת בטא')
  await tile(page, 'voice')
  await wait(1000)
  check(`${tag}: ... (an opened one opens again)`, (await peekTitle(page)) === 'הקלטה אחת, מודעה שלמה' && !(await ask(page)))
  await page.keyboard.press('Escape')
  await wait(800)
  await page.evaluate(`(${seen('.mb-chip')}).click()`)
  await wait(800)
  t = await page.evaluate(() => document.querySelector('.mb-sheet')?.textContent.replace(/\s+/g, ' ') ?? '')
  check(`${tag}: the quota sheet: 10/10, what is included, renews every month, no price`, t.includes('10/10') && t.includes('נפתח החודש') && t.includes('המכסה מתחדשת בתחילת כל חודש') && !t.includes('₪'), t.slice(0, 100))
  await page.screenshot({ path: `${out}/b-${label}-13-quota-sheet.png` })
  await page.evaluate(() => document.querySelector('.modal .icon-btn')?.click())
  await wait(600)

  // the comparison knows who is looking
  await page.goto(green + '/upgrade', { waitUntil: 'load' })
  await wait(1300)
  st = await page.evaluate(() => ({ you: [...document.querySelectorAll('.up-col')].filter((x) => x.querySelector('u')).map((x) => x.querySelector('b')?.textContent), cta: document.querySelector('.up-cta .is-office a')?.textContent.trim() }))
  check(`${tag}: for an office member the comparison marks the office`, st.you.join() === 'המשרד' && st.cta.includes('לאזור החבר'), JSON.stringify(st))

  // ---- starting the demo again puts the wallet and the quota back
  await page.evaluate(() => document.querySelector('.dreset')?.click())
  await wait(700)
  await page.evaluate(() => [...document.querySelectorAll('.modal .btn')].find((b) => b.textContent.includes('כן, מחדש'))?.click())
  await wait(1500)
  const w = await wallet(page)
  check(`${tag}: "התחלה מחדש" puts back 12 credits and 3/10`, w.credits === 12 && w.quotaUsed === 3 && w.opened.length === 0 && w.openedOffice.length === 0 && w.urgentFreeUsed === false, JSON.stringify(w))

  check(`${tag}: no console errors`, errors.length === 0, errors.slice(0, 2).join(' | '))
  await page.close()
}

await browser.close().catch(() => {})
console.log(results.join('\n'))
console.log(results.some((r) => r.startsWith('FAIL')) ? '\nSOME CHECKS FAILED' : '\nALL CHECKS PASSED')
