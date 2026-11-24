// Stage B of the three-layer upgrade (green version): what a community member sees (no wallet since 16.11.2026), the
// monthly quota of an office member, the marks on the lab's tools, the simulated charge, the "no credits" and "quota used" screens,
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
// the view switch: in the top bar for an office member, in the line at the foot of the page for a community member
const flip = (page, v) => page.evaluate(`((${seen('.ms')})?.querySelector('button[data-v="${v}"]') ?? document.querySelector('[data-foot] button[data-v="${v}"]')).click()`)
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
  try {
  const page = await browser.newPage()
  await page.evaluateOnNewDocument(() => { try { localStorage.setItem('nadlanup-demo-v1', '1') } catch {} }) // the community is closed to visitors: these checks walk the open demo
  const errors = []
  page.on('console', (m) => m.type() === 'error' && !/404/.test(m.text()) && errors.push(m.text()))
  page.on('pageerror', (e) => errors.push(String(e)))
  await page.setViewport(vp)
  await page.goto(green + '/', { waitUntil: 'load' })
  await page.evaluate(() => ['nadlanup-agent-v1', 'nadlanup-member-v1', 'nadlanup-wallet-v1'].forEach((k) => localStorage.removeItem(k)))
  await page.goto(green + '/app', { waitUntil: 'load' })
  await wait(1600)

  // ---- a community member: since 16.11.2026 they see the community, not the demo's controls (MemberBar.tsx): no
  // wallet of credits and no view switch in the top bar, and no lab. The credits screens below the lab can't be
  // reached by a community member any more, so they are not walked here; the office part further down still is.
  const cm = await page.evaluate(() => {
    const seen = (sel) => [...document.querySelectorAll(sel)].some((n) => n.getBoundingClientRect().width > 0)
    return { path: location.pathname, wallet: seen('.mb-chip'), switch: seen('.ms'), lab: seen('.side-lab'), foot: document.querySelector('[data-foot] button[data-v]')?.dataset.v ?? null }
  })
  check(`${tag}: community member: the community, with no credits wallet, no view switch and no lab`, cm.path.endsWith('/app/community') && !cm.wallet && !cm.switch && !cm.lab, JSON.stringify(cm))
  check(`${tag}: community member: the way to the office view is in the line at the foot of the page`, cm.foot === 'office', JSON.stringify(cm))
  check(`${tag}: no sideways overflow in the app`, (await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)) <= 1)
  await page.screenshot({ path: `${out}/b-${label}-1-app-community.png` })
  await page.goto(green + '/upgrade', { waitUntil: 'load' })
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
  check(`${tag}: the comparison page opens`, st.path.endsWith('/upgrade'))
  check(`${tag}: three columns: the community free, credits by use with no price, the office at 689 a month and 0%`, JSON.stringify(st.cols) === JSON.stringify([['מתווכים לעסקאות', 'חינם', 'הקהילה, תמיד'], ['קרדיטים', 'לפי שימוש', 'מחיר קרדיט: מחיר יקבע'], ['המשרד', 'החל מ-549 ₪ + מע"מ לחודש', '0% עמלה למשרד']]), JSON.stringify(st.cols))
  check(`${tag}: three groups of rows: the base, advanced tools, office only`, st.groups.join('|') === 'הבסיס|כלים מתקדמים|בלעדי למשרד' && st.rows === 24 && st.exclusive === 12, `${st.groups.join('|')} / ${st.rows} rows`)
  check(`${tag}: it marks the layer being viewed (the community), benefits are "בהקמה", and no invented price`, st.you.join() === 'מתווכים לעסקאות' && st.text.includes('בהקמה') && (st.text.match(/₪/g) ?? []).length === 2 && !/[\u2013\u2014]/.test(st.text), `${st.you.join()} / ${(st.text.match(/₪/g) ?? []).length} shekel signs`)
  check(`${tag}: its buttons lead to the free join, the app and the office join`, st.cta.length === 3 && st.cta[0].endsWith('/kehila/join') && st.cta[1].endsWith('/app') && st.cta[2].endsWith('/join/office'), st.cta.join(' '))
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
  await flip(page, 'office')
  await wait(900)
  check(`${tag}: office member: the top bar shows the monthly quota instead of the wallet (3/10)`, (await chipText(page)).replace(/\s/g, '').startsWith('3/10'), await chipText(page))
  await page.screenshot({ path: `${out}/b-${label}-10-app-office.png` })
  await openHub(page, phone)
  const c = await chips(page)
  check(`${tag}: office member: every advanced tool is "כלול במשרד", free ones stay free`, ['voice', 'room', 'urgent', 'radar', 'matchmaker', 'folder', 'wallet', 'pros'].every((id) => c[id] === 'כלול במשרד') && c.whatsapp === 'חינם בקהילה', JSON.stringify(c))
  await page.screenshot({ path: `${out}/b-${label}-11-lab-office.png` })
  await tile(page, 'wallet')
  await wait(1100)
  check(`${tag}: office member: a tool opens with no charge and counts in the quota (4/10)`, (await peekTitle(page)) === 'ארנק עמלות' && !(await ask(page)) && (await wallet(page)).quotaUsed === 4 && (await wallet(page)).credits === 12 && (await page.evaluate(() => document.querySelector('.bl-badges')?.textContent.includes('כלול במשרד'))))
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
  const a = await ask(page)
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
  const t = await page.evaluate(() => document.querySelector('.mb-sheet')?.textContent.replace(/\s+/g, ' ') ?? '')
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
  } catch (e) {
    check(`${tag}: ran to the end`, false, String(e).slice(0, 300))
  }
}

await browser.close().catch(() => {})
console.log(results.join('\n'))
console.log(results.some((r) => r.startsWith('FAIL')) ? '\nSOME CHECKS FAILED' : '\nALL CHECKS PASSED')
