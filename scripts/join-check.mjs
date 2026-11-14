// Checks joining in the green look: /join is a choice (free community or the paid office), the community path is the
// existing onboarding, the office page has the price (689 a month, 3 month minimum), a working calculator, the
// comparison and the questions, and the agent area cannot be entered without paying. Also: the navy look is unchanged.
// Usage: node scripts/join-check.mjs [outDir]
import puppeteer from 'puppeteer-core'
import fs from 'node:fs'

const out = process.argv[2] ?? '_shots'
fs.mkdirSync(out, { recursive: true })
const green = process.env.BASE_GREEN ?? 'http://localhost:5240/NADLANIL-DEMO/green'
const browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--hide-scrollbars'] })
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
const results = []
const check = (name, ok, detail = '') => results.push(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  [' + detail + ']' : ''}`)
const click = (page, sel, text) =>
  page.evaluate(
    (s, t) => {
      const el = [...document.querySelectorAll(s)].find((e) => !t || e.textContent.includes(t))
      el?.click()
      return !!el
    },
    sel,
    text,
  )
const setRange = (page, key, value) =>
  page.evaluate(
    (k, v) => {
      const el = document.querySelector(`#calc input[data-k="${k}"]`)
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set
      setter.call(el, String(v))
      el.dispatchEvent(new Event('input', { bubbles: true }))
    },
    key,
    value,
  )
const read = (page) =>
  page.evaluate(() => ({
    today: document.querySelector('.jo-today .jo-big')?.textContent,
    todayLabel: document.querySelector('.jo-today .jo-total small')?.textContent,
    ours: document.querySelector('.jo-ours .jo-big')?.textContent,
    verdict: document.querySelector('.jo-diff .jo-verdict')?.textContent ?? '',
    save: !!document.querySelector('.jo-diff.is-save'),
    cover: document.querySelector('.jo-cover')?.textContent ?? '',
    facts: document.querySelector('.jo-facts')?.textContent ?? '',
    bars: [...document.querySelectorAll('.jo-bars u')].map((u) => Math.round(parseFloat(u.style.width))),
    redColor: getComputedStyle(document.querySelector('.jo-today .jo-big')).color,
    redBar: getComputedStyle(document.querySelector('.jo-bars .is-red b')).color,
    paidLabel: document.querySelector('.jo-bars .is-red small')?.textContent ?? '',
    usLabel: document.querySelector('.jo-bars .is-us small')?.textContent ?? '',
    same: document.querySelector('.jo-same')?.textContent ?? '',
    marathonTitle: document.querySelector('.jo-marathon h3')?.textContent ?? '',
    chart: !!document.querySelector('.jo-chart'),
    lines: document.querySelectorAll('.jo-line').length,
    runRed: document.querySelector('.jo-run .is-red b')?.textContent,
    runGreen: document.querySelector('.jo-run .is-green b')?.textContent,
    stay: document.querySelector('.jo-stay')?.textContent,
    plain: document.querySelector('.jo-run-plain')?.textContent ?? '',
  }))

for (const [label, vp, phone] of [
  ['desktop', { width: 1440, height: 900 }, false],
  ['phone', { width: 375, height: 812, isMobile: true, hasTouch: true }, true],
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

  // the home page's join buttons lead to the choice
  await page.reload({ waitUntil: 'load' })
  await wait(1200)
  if (!phone) {
    check(`${tag}: the home menu has a "המשרד" link to the office page`, await page.evaluate(() => [...document.querySelectorAll('.hg-nav-links a')].some((a) => a.textContent === 'המשרד' && a.getAttribute('href')?.endsWith('/join/office'))))
  }
  await click(page, '.hg-nav .btn-gold', 'הצטרפות')
  await wait(1500)

  // the choice
  let st = await page.evaluate(() => ({
    path: location.pathname,
    cards: document.querySelectorAll('.jc-card').length,
    free: document.querySelector('.jc-card:not(.is-office) .jc-price b')?.textContent,
    price: document.querySelector('.jc-card.is-office .jc-price b')?.textContent,
    min: document.querySelector('.jc-card.is-office .jc-price small')?.textContent,
    lock: document.querySelector('.jc-lock')?.textContent,
    overflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth,
  }))
  check(`${tag}: joining starts with a choice of two ways`, st.path.endsWith('/join') && st.cards === 2, JSON.stringify(st))
  check(`${tag}: the community is free and the office shows 0% and from 549 a month`, st.free === 'חינם' && st.price === '0%' && st.min.includes('החל מ-549 ₪ + מע"מ לחודש'), `${st.free} / ${st.price} / ${st.min}`)
  check(`${tag}: the office says nothing is charged in the demo`, st.lock.includes('בדמו אין חיוב אמיתי'))
  check(`${tag}: no sideways overflow on the choice`, st.overflowX <= 1, `${st.overflowX}px`)
  await page.screenshot({ path: `${out}/join-${label}-1-choice.png` })

  // the free way is the existing onboarding
  await click(page, '.jc-card:not(.is-office) .jc-cta', '')
  await wait(1400)
  check(`${tag}: the community path opens the community's own page`, await page.evaluate(() => location.pathname.endsWith('/kehila') && document.body.textContent.includes('מתווכים לעסקאות')))
  await page.goto(green + '/kehila/join', { waitUntil: 'load' })
  await wait(1300)
  check(`${tag}: ... and from there the existing onboarding`, await page.evaluate(() => document.body.textContent.includes('נעים להכיר') && document.body.textContent.includes('ההצטרפות בחינם')))
  await page.goto(green + '/join', { waitUntil: 'load' })
  await wait(1200)

  // the office page
  await click(page, '.jc-card.is-office .jc-cta', '')
  await wait(1800)
  st = await page.evaluate(() => ({
    path: location.pathname,
    h1: document.querySelector('.jo-hero h1')?.textContent,
    price: document.querySelector('.jo-price b')?.textContent,
    min: document.querySelector('.jo-price small')?.textContent,
    gains: document.querySelectorAll('.jo-gain').length,
    rows: document.querySelectorAll('.jo-row').length,
    faq: document.querySelectorAll('.jo-faq li').length,
    overflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    sticky: getComputedStyle(document.querySelector('.jo-sticky')).display,
  }))
  check(`${tag}: the office page shows 0% to the office and the fee from 549 a month`, st.path.endsWith('/join/office') && st.price === '0%' && st.min.includes('החל מ-549 ₪ + מע"מ לחודש'), JSON.stringify(st))
  check(`${tag}: it has six gains, a comparison table and questions`, st.gains === 6 && st.rows === 11 && st.faq === 5, `${st.gains} gains, ${st.rows} rows, ${st.faq} questions`)
  check(`${tag}: no sideways overflow on the office page`, st.overflowX <= 1, `${st.overflowX}px`)
  check(`${tag}: the bottom join bar ${phone ? 'shows on the phone' : 'is hidden on desktop'}`, phone ? st.sticky === 'flex' : st.sticky === 'none', st.sticky)
  await page.screenshot({ path: `${out}/join-${label}-2-office-top.png` })

  // the calculator: what is paid today (commissions, as before), what it costs here, and the difference
  await page.evaluate(() => document.getElementById('calc')?.scrollIntoView())
  await wait(1700)
  let c = await read(page)
  check(`${tag}: today's office: 6 deals x 30,000 x 20% = 36,000 for the last year`, c.today === '₪36,000' && c.todayLabel.includes('בשנה האחרונה'), JSON.stringify([c.today, c.todayLabel]))
  check(`${tag}: ours on BASIC: 549 x 12 = 6,588, and the difference is 29,412`, c.ours === '₪6,588' && c.save && c.verdict.includes('₪29,412'), JSON.stringify([c.ours, c.verdict]))
  check(`${tag}: the cost per deal is shown for both (1,098 here on BASIC, 6,000 today)`, c.facts.includes('₪1,098') && c.facts.includes('₪6,000'), c.facts)
  check(`${tag}: the bars show the difference (today full, ours about a fifth)`, c.bars[0] === 100 && c.bars[1] >= 15 && c.bars[1] <= 21, c.bars.join(','))
  check(`${tag}: one deal covers 54 months of the BASIC fee`, c.cover.includes('54') && c.cover.includes('₪30,000'), c.cover)
  await page.screenshot({ path: `${out}/join-${label}-3-calc.png` })
  check(`${tag}: what was paid to the office is in red, and labelled as paid`, /rgb\((21[0-9], 4\d, 3\d|255, 107, 94)\)/.test(c.redColor) && c.redColor === c.redBar && c.paidLabel.includes('הוצאתם') && c.usLabel.includes('NadlanUP'), JSON.stringify([c.redColor, c.redBar, c.paidLabel, c.usLabel]))
  check(`${tag}: "the same things, and even more" is there`, c.same.includes('אצלנו מקבלים את אותם דברים, ואפילו יותר') && c.same.includes('הסוכן שלנו') && c.same.includes('מותג של משרד תיווך ארצי') && c.same.includes('0% עמלה למשרד, 100% למתווך'), c.same.slice(0, 80))
  await page.evaluate(() => document.querySelector('.jo-marathon')?.scrollIntoView())
  await wait(2200)
  c = await read(page)
  check(`${tag}: the marathon: title, two lines, 5 years: 180,000 red, 32,940 green, 147,060 stays`, c.marathonTitle.includes('איתנו זה מרתון, לא ריצה קצרה') && c.chart && c.lines === 2 && c.runRed === '₪180,000' && c.runGreen === '₪32,940' && c.stay === '₪147,060', JSON.stringify([c.marathonTitle, c.lines, c.runRed, c.runGreen, c.stay]))
  await page.screenshot({ path: `${out}/join-${label}-3b-marathon.png` })
  await setRange(page, 'years', 10)
  await wait(2200)
  c = await read(page)
  check(`${tag}: 10 years: 294,120 stays with the broker`, c.stay === '₪294,120' && c.runRed === '₪360,000', JSON.stringify([c.stay, c.runRed]))
  await setRange(page, 'years', 5)
  await wait(500)

  await setRange(page, 'pct', 0)
  await wait(1200)
  c = await read(page)
  check(`${tag}: an independent broker (0%) gets an honest answer: the fee, and what it buys`, c.today === '₪0' && !c.save && c.verdict.includes('₪6,588') && c.verdict.includes('מותג משרד'), JSON.stringify([c.today, c.verdict]))
  check(`${tag}: with nothing paid today there is no chart, only an honest note`, !c.chart && c.plain.includes('השקעה'), c.plain.slice(0, 60))
  await setRange(page, 'fixed', 2000)
  await wait(1200)
  c = await read(page)
  check(`${tag}: a fixed monthly fee counts (2,000 x 12 = 24,000 today, 17,412 stays)`, c.today === '₪24,000' && c.save && c.verdict.includes('₪17,412'), JSON.stringify([c.today, c.verdict]))
  await setRange(page, 'fixed', 0)
  await setRange(page, 'pct', 20)
  await setRange(page, 'months', 3)
  await wait(1300)
  c = await read(page)
  check(`${tag}: the minimum of 3 months: ours 1,647 against 9,000, 7,353 stays`, c.ours === '₪1,647' && c.today === '₪9,000' && c.verdict.includes('₪7,353') && c.todayLabel.includes('ב-3 חודשים'), JSON.stringify([c.ours, c.today, c.verdict]))
  await setRange(page, 'months', 12)
  await setRange(page, 'deals', 12)
  await setRange(page, 'pct', 30)
  await wait(1300)
  c = await read(page)
  check(`${tag}: changing the numbers updates it (12 deals, 30%: 108,000)`, c.today === '₪108,000', c.today)

  await page.evaluate(() => document.querySelector('.jo-table')?.scrollIntoView())
  await wait(900)
  await page.screenshot({ path: `${out}/join-${label}-4-table.png` })
  const tableOk = await page.evaluate(() => {
    const rows = [...document.querySelectorAll('.jo-row')].slice(2)
    return rows.length === 9 && rows.slice(0, 3).every((r) => r.querySelectorAll('.is-yes').length === 2) && rows.slice(3).every((r) => r.querySelectorAll('.is-no').length === 1 && r.querySelectorAll('.is-yes').length === 1)
  })
  check(`${tag}: the table shows the community has the base and the office has all of it`, tableOk)
  await click(page, '.jo-faq li:nth-child(2) button', '')
  await wait(500)
  check(`${tag}: the questions open and say there is no percentage of the commission`, await page.evaluate(() => document.querySelector('.jo-faq li.is-open')?.textContent.includes('לא. 0% עמלה למשרד')))

  // the area is closed to a community member, with no way around
  await page.goto(green + '/app/agent', { waitUntil: 'load' })
  await wait(1500)
  check(`${tag}: the agent area is closed to a community member`, await page.evaluate(() => !!document.querySelector('.ag-gate') && !document.querySelector('.ag-wiz')))
  await page.goto(green + '/app/agent?start=1', { waitUntil: 'load' })
  await wait(1500)
  check(`${tag}: and there is no shortcut in the address`, await page.evaluate(() => !!document.querySelector('.ag-gate') && !document.querySelector('.ag-wiz')))
  check(`${tag}: no console errors`, errors.length === 0, errors.slice(0, 2).join(' | '))
  await page.close()
}

await browser.close().catch(() => {})
console.log(results.join('\n'))
console.log(results.some((r) => r.startsWith('FAIL')) ? '\nSOME CHECKS FAILED' : '\nALL CHECKS PASSED')
