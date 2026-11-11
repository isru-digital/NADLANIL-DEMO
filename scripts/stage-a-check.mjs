// Stage A of the three-layer upgrade (green version): the second line of the name next to the logo, no price
// outside the calculator's example, the about page, the typos, and the "community member / office member" switch.
// Usage: node scripts/stage-a-check.mjs [outDir]     (BASE_GREEN / BASE_NAVY override the addresses)
import puppeteer from 'puppeteer-core'
import { mkdirSync } from 'node:fs'

const green = process.env.BASE_GREEN ?? 'http://localhost:5240/NADLANIL-DEMO/green'
const navy = process.env.BASE_NAVY ?? 'http://localhost:5230/NADLANIL-DEMO'
const out = process.argv[2] ?? '_shots'
mkdirSync(out, { recursive: true })
const browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--hide-scrollbars'] })
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
const results = []
const check = (name, ok, detail = '') => results.push(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  [' + detail + ']' : ''}`)
const SUB = 'המתווכים החופשיים'

// what a visitor can read on the page, without the calculator (the one place the example fee stays)
const pageText = (page, dropCalc = false) =>
  page.evaluate((drop) => {
    const b = document.body.cloneNode(true)
    b.querySelectorAll('script, style').forEach((n) => n.remove())
    if (drop) b.querySelector('#calc')?.remove()
    return b.textContent
  }, dropCalc)
const visibleSwitch = (page) =>
  page.evaluate(() => {
    const el = [...document.querySelectorAll('.ms')].find((n) => n.getBoundingClientRect().width > 0)
    return el ? { m: el.dataset.m, pressed: el.querySelector('button[aria-pressed="true"]')?.textContent.trim(), count: [...document.querySelectorAll('.ms')].filter((n) => n.getBoundingClientRect().width > 0).length } : null
  })
const flip = (page, v) =>
  page.evaluate((val) => {
    const el = [...document.querySelectorAll('.ms')].find((n) => n.getBoundingClientRect().width > 0)
    el.querySelector(`button[data-v="${val}"]`).click()
  }, v)

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
  await page.evaluate(() => {
    localStorage.removeItem('nadlanup-agent-v1')
    localStorage.removeItem('nadlanup-member-v1')
  })
  await page.reload({ waitUntil: 'load' })
  await wait(1500)

  // ---- the name
  let st = await page.evaluate(() => ({
    title: document.title,
    navSub: document.querySelector('.hg-nav .logo-sub')?.textContent,
    pill: document.querySelector('.hg-pill-sub')?.textContent,
    final: document.querySelector('.hg-final-sub')?.textContent,
    foot: document.querySelector('.home-foot .logo-sub')?.textContent,
    about: [...document.querySelectorAll('.hg-nav-links a, .foot-links a')].filter((a) => a.textContent === 'אודות' && a.getAttribute('href')?.endsWith('/about')).length,
    overflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth,
  }))
  check(`${tag}: home: "${SUB}" under the logo in the menu, in the hero, in the closing panel and in the footer`, st.navSub === SUB && st.pill === SUB && st.final === SUB && st.foot === SUB, JSON.stringify(st))
  check(`${tag}: home: the tab title carries both lines of the name`, st.title.startsWith('NadlanUP | ' + SUB), st.title)
  check(`${tag}: home: links to the about page (menu and footer)`, st.about === 2, String(st.about))
  check(`${tag}: home: no price and no sideways overflow`, !(await pageText(page)).includes('689') && st.overflowX <= 1, `${st.overflowX}px`)
  await page.screenshot({ path: `${out}/a-${label}-1-home.png` })

  // ---- joining: no price
  await page.goto(green + '/join', { waitUntil: 'load' })
  await wait(1300)
  let t = await pageText(page)
  check(`${tag}: join: the logo has its second line, the office shows 0% and "מחיר יקבע", no 689`, (await page.evaluate(() => document.querySelector('.jc-top .logo-sub')?.textContent)) === SUB && t.includes('מחיר יקבע') && !t.includes('689') && !t.includes('אחרי תשלום') && (await page.evaluate(() => document.querySelector('.jc-card.is-office .jc-price b')?.textContent)) === '0%')
  await page.screenshot({ path: `${out}/a-${label}-2-join.png` })

  await page.goto(green + '/join/office', { waitUntil: 'load' })
  await wait(1500)
  t = await pageText(page, true)
  check(`${tag}: office page: no 689 and no "3 חודשים" outside the calculator, placeholders instead`, !t.includes('689') && !t.includes('3 חודשים') && !t.includes('2,067') && t.includes('מחיר יקבע') && t.includes('0% עמלה למשרד'), '')
  const whole = await pageText(page)
  check(`${tag}: office page: the calculator keeps its example fee and says it is an example`, whole.includes('חישוב לדוגמה לפי דמי חבר של 689 ₪ לחודש. המחיר הסופי יקבע.'))
  check(`${tag}: office page: typos fixed ("מכם", "ב-NadlanUP")`, !whole.includes('ממכם') && whole.includes('לוקחים מכם') && whole.includes('ב-NadlanUP') && !/[א-ת]NadlanUP/.test(whole))
  check(`${tag}: office page: no long dashes`, !/[\u2013\u2014]/.test(whole))
  await page.screenshot({ path: `${out}/a-${label}-3-office.png` })

  // ---- the simulated joining has no amount, and makes the visitor an office member
  await page.evaluate(() => [...document.querySelectorAll('.jo-hero .btn')].find((b) => b.textContent.includes('להצטרפות למשרד'))?.click())
  await wait(900)
  st = await page.evaluate(() => ({ sum: document.querySelector('.jo-sum')?.textContent ?? '', commit: document.querySelector('.jo-commit')?.textContent ?? '', disabled: document.querySelector('.jo-go')?.disabled }))
  check(`${tag}: joining: no amount, "מחיר יקבע", commitment "יקבע", and the terms must be approved`, !/\d{3}/.test(st.sum) && st.sum.includes('מחיר יקבע') && st.sum.includes('0%') && st.commit === 'תקופת התחייבות - יקבע' && st.disabled === true, JSON.stringify(st))
  await page.screenshot({ path: `${out}/a-${label}-4-join-modal.png` })
  await page.evaluate(() => document.querySelector('.jo-agree input')?.click())
  await wait(200)
  await page.evaluate(() => document.querySelector('.jo-go')?.click())
  await wait(2400)
  check(`${tag}: joining: a welcome, with no word about payment`, await page.evaluate(() => { const d = document.querySelector('.jo-done')?.textContent ?? ''; return d.includes('ברוכים הבאים למשרד') && !d.includes('תשלום') }))
  await page.evaluate(() => document.querySelector('.jo-done .btn')?.click())
  await wait(1800)
  st = await page.evaluate(() => ({ path: location.pathname, wiz: !!document.querySelector('.ag-wiz'), member: localStorage.getItem('nadlanup-member-v1') }))
  check(`${tag}: joining: lands in the questionnaire as an office member`, st.path.endsWith('/app/agent') && st.wiz && st.member === 'office', JSON.stringify(st))

  // ---- the switch
  let sw = await visibleSwitch(page)
  check(`${tag}: the switch is in the top bar, once, and shows "חבר משרד"`, sw?.count === 1 && sw.m === 'office' && sw.pressed === 'חבר משרד', JSON.stringify(sw))
  await flip(page, 'community')
  await wait(900)
  sw = await visibleSwitch(page)
  check(`${tag}: switching to "חבר קהילה" closes the agent area (the gate, with no price)`, sw.m === 'community' && (await page.evaluate(() => !!document.querySelector('.ag-gate') && !document.querySelector('.ag-wiz') && !document.body.textContent.includes('689'))), JSON.stringify(sw))
  await page.screenshot({ path: `${out}/a-${label}-5-app-community.png` })
  await page.reload({ waitUntil: 'load' })
  await wait(1400)
  check(`${tag}: the choice is kept after a reload`, (await visibleSwitch(page))?.m === 'community' && (await page.evaluate(() => !!document.querySelector('.ag-gate'))))
  await flip(page, 'office')
  await wait(900)
  check(`${tag}: switching to "חבר משרד" opens it at once`, (await visibleSwitch(page))?.m === 'office' && (await page.evaluate(() => !!document.querySelector('.ag-wiz') && !document.querySelector('.ag-gate'))))
  await page.reload({ waitUntil: 'load' })
  await wait(1400)
  check(`${tag}: and that is kept after a reload too`, (await visibleSwitch(page))?.m === 'office' && (await page.evaluate(() => localStorage.getItem('nadlanup-member-v1') === 'office')))
  await page.goto(green + '/app', { waitUntil: 'load' })
  await wait(1600)
  st = await page.evaluate(() => ({
    sub: [...document.querySelectorAll('.sidebar .logo-sub, .topbar .logo-sub')].filter((n) => n.getBoundingClientRect().width > 0).map((n) => n.textContent),
    badge: [...document.querySelectorAll('.ms-badge')].filter((n) => n.getBoundingClientRect().width > 0).length,
    overflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth,
  }))
  check(`${tag}: app: the logo has its second line, no sideways overflow`, st.sub.length === 1 && st.sub[0] === SUB && st.overflowX <= 1, JSON.stringify(st))
  if (!phone) check(`${tag}: app: an office member has the "חבר משרד" mark next to the name`, st.badge === 1, String(st.badge))
  await page.screenshot({ path: `${out}/a-${label}-6-app-office.png` })
  await flip(page, 'community')
  await wait(700)
  if (!phone) check(`${tag}: app: the mark goes away for a community member`, (await page.evaluate(() => document.querySelectorAll('.ms-badge').length)) === 0)

  // ---- about
  await page.goto(green + '/about', { waitUntil: 'load' })
  await wait(1500)
  st = await page.evaluate(() => ({
    path: location.pathname,
    tags: [...document.querySelectorAll('.ab .jo-tag')].map((n) => n.textContent),
    h1: document.querySelector('.ab h1')?.textContent,
    split: document.querySelector('.ab-split')?.textContent,
    team: document.querySelector('#team')?.textContent ?? '',
    sub: document.querySelector('.ab .jc-top .logo-sub')?.textContent,
    overflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth,
  }))
  t = await pageText(page)
  check(`${tag}: about: the page exists with its four headings`, st.path.endsWith('/about') && ['מי אנחנו', 'מה אנחנו עושים', 'מאיפה באנו ולאן הולכים', 'הצוות'].every((h) => st.tags.includes(h)), JSON.stringify(st.tags))
  check(`${tag}: about: the name with its second line, and 0% / 100%`, st.h1.includes('NadlanUP') && st.h1.includes(SUB) && st.split.includes('0%') && st.split.includes('100%') && st.sub === SUB, st.h1)
  check(`${tag}: about: no invented facts: no years, no counts, no prices, team names "ימולאו בהמשך"`, st.team.includes('השמות ימולאו בהמשך') && !/\d{2,}(?!%)/.test(t.replace(/100%/g, '')) && !t.includes('₪') && !/[\u2013\u2014]/.test(t), '')
  check(`${tag}: about: no sideways overflow`, st.overflowX <= 1, `${st.overflowX}px`)
  await page.screenshot({ path: `${out}/a-${label}-7-about.png` })
  for (const [id, n] of [['what', 8], ['road', 9], ['team', 10]]) {
    await page.evaluate((i) => document.getElementById(i)?.scrollIntoView({ block: 'start' }), id)
    await wait(1400)
    await page.screenshot({ path: `${out}/a-${label}-${n}-about-${id}.png` })
  }

  // ---- the agent page's feminine form
  await page.evaluate(() =>
    localStorage.setItem('nadlanup-agent-v1', JSON.stringify({ stage: 'ready', step: 0, paidAt: '2026-11-09T10:00:00.000Z', profile: { name: 'דנה כהן', gender: 'f', style: 'warm', years: 7, areas: ['tlv'], specialties: ['יוקרה'], clients: ['משפחות'], languages: ['עברית'], phone: '050-1234567' } })),
  )
  await page.goto(`${green}/agent/${encodeURIComponent('דנה-כהן')}`, { waitUntil: 'load' })
  await wait(1500)
  t = await pageText(page)
  check(`${tag}: agent page: "מחפשת ומסננת", not "מסנןת"`, t.includes('ואני מחפשת ומסננת בשבילכם') && !t.includes('מסנןת'))
  await page.evaluate(() => localStorage.removeItem('nadlanup-agent-v1'))

  check(`${tag}: no console errors`, errors.length === 0, errors.slice(0, 2).join(' | '))
  await page.close()
}

// the navy version is frozen: none of this is in it
{
  const page = await browser.newPage()
  await page.setViewport({ width: 1440, height: 900 })
  await page.goto(navy + '/app', { waitUntil: 'load' })
  await wait(1500)
  check('navy: no switch, no second line under the logo', await page.evaluate(() => !document.querySelector('.ms') && !document.querySelector('.logo-sub')))
  await page.goto(navy + '/about', { waitUntil: 'load' })
  await wait(1500)
  check('navy: no about page (it goes back home)', await page.evaluate(() => !document.querySelector('.ab')))
  check('navy: the tab title is unchanged', (await page.title()) === 'NadlanUP - הדבר הבא בעולם המתווכים', await page.title())
  await page.close()
}

await browser.close().catch(() => {})
console.log(results.join('\n'))
console.log(results.some((r) => r.startsWith('FAIL')) ? '\nSOME CHECKS FAILED' : '\nALL CHECKS PASSED')
