// Checks joining in the green look: /join is a choice (free community or the paid office), the community path is the
// existing onboarding, the office page has the price (689 a month, 3 month minimum), a working calculator, the
// comparison and the questions, and the agent area cannot be entered without paying. Also: the navy look is unchanged.
// Usage: node scripts/join-check.mjs [outDir]
import puppeteer from 'puppeteer-core'
import fs from 'node:fs'

const out = process.argv[2] ?? '_shots'
fs.mkdirSync(out, { recursive: true })
const green = process.env.BASE_GREEN ?? 'http://localhost:5240/NADLANIL-DEMO/green'
const navy = process.env.BASE_NAVY ?? 'http://localhost:5230/NADLANIL-DEMO'
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
      const el = document.querySelector(`.jo-calcs input[data-k="${k}"]`)
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
  await page.evaluate(() => localStorage.removeItem('nadlanup-agent-v1'))

  // the home page's join buttons lead to the choice
  await page.reload({ waitUntil: 'load' })
  await wait(1200)
  if (!phone) {
    check(`${tag}: the home menu has a "מחירים" link to the office page`, await page.evaluate(() => [...document.querySelectorAll('.hg-nav-links a')].some((a) => a.textContent === 'מחירים' && a.getAttribute('href')?.endsWith('/join/office'))))
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
  check(`${tag}: the community is free and the office is 689 a month, 3 months minimum`, st.free === 'חינם' && st.price === '₪689' && st.min.includes('3 חודשים'), `${st.free} / ${st.price} / ${st.min}`)
  check(`${tag}: the office says it is joined only after payment`, st.lock.includes('אחרי תשלום'))
  check(`${tag}: no sideways overflow on the choice`, st.overflowX <= 1, `${st.overflowX}px`)
  await page.screenshot({ path: `${out}/join-${label}-1-choice.png` })

  // the free way is the existing onboarding
  await click(page, '.jc-card:not(.is-office) .jc-cta', '')
  await wait(1400)
  check(`${tag}: the community path opens the existing onboarding`, await page.evaluate(() => location.pathname.endsWith('/join/community') && document.body.textContent.includes('נעים להכיר') && document.body.textContent.includes('ההצטרפות בחינם')))
  await page.goBack()
  await wait(1000)

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
  check(`${tag}: the office page has the price and the minimum`, st.path.endsWith('/join/office') && st.price === '₪689' && st.min.includes('3 חודשים'), JSON.stringify(st))
  check(`${tag}: it has six gains, a comparison table and questions`, st.gains === 6 && st.rows === 10 && st.faq === 5, `${st.gains} gains, ${st.rows} rows, ${st.faq} questions`)
  check(`${tag}: no sideways overflow on the office page`, st.overflowX <= 1, `${st.overflowX}px`)
  check(`${tag}: the bottom join bar ${phone ? 'shows on the phone' : 'is hidden on desktop'}`, phone ? st.sticky === 'flex' : st.sticky === 'none', st.sticky)
  await page.screenshot({ path: `${out}/join-${label}-2-office-top.png` })

  // the calculator: what is paid today (commissions, as before), what it costs here, and the difference
  await page.evaluate(() => document.getElementById('calc')?.scrollIntoView())
  await wait(1700)
  let c = await read(page)
  check(`${tag}: today's office: 6 deals x 30,000 x 20% = 36,000 for the last year`, c.today === '₪36,000' && c.todayLabel.includes('בשנה האחרונה'), JSON.stringify([c.today, c.todayLabel]))
  check(`${tag}: ours: 689 x 12 = 8,268, and the difference is 27,732`, c.ours === '₪8,268' && c.save && c.verdict.includes('₪27,732'), JSON.stringify([c.ours, c.verdict]))
  check(`${tag}: the cost per deal is shown for both (1,378 here, 6,000 today)`, c.facts.includes('₪1,378') && c.facts.includes('₪6,000'), c.facts)
  check(`${tag}: the bars show the difference (today full, ours about a quarter)`, c.bars[0] === 100 && c.bars[1] >= 20 && c.bars[1] <= 26, c.bars.join(','))
  check(`${tag}: one deal covers 43 months of the fee`, c.cover.includes('43') && c.cover.includes('₪30,000'), c.cover)
  await page.screenshot({ path: `${out}/join-${label}-3-calc.png` })

  await setRange(page, 'pct', 0)
  await wait(1200)
  c = await read(page)
  check(`${tag}: an independent broker (0%) gets an honest answer: the fee, and what it buys`, c.today === '₪0' && !c.save && c.verdict.includes('₪8,268') && c.verdict.includes('מותג משרד'), JSON.stringify([c.today, c.verdict]))
  await setRange(page, 'fixed', 2000)
  await wait(1200)
  c = await read(page)
  check(`${tag}: a fixed monthly fee counts (2,000 x 12 = 24,000 today, 15,732 stays)`, c.today === '₪24,000' && c.save && c.verdict.includes('₪15,732'), JSON.stringify([c.today, c.verdict]))
  await setRange(page, 'fixed', 0)
  await setRange(page, 'pct', 20)
  await setRange(page, 'months', 3)
  await wait(1300)
  c = await read(page)
  check(`${tag}: the minimum of 3 months: ours 2,067 against 9,000, 6,933 stays`, c.ours === '₪2,067' && c.today === '₪9,000' && c.verdict.includes('₪6,933') && c.todayLabel.includes('ב-3 חודשים'), JSON.stringify([c.ours, c.today, c.verdict]))
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
    return rows.length === 8 && rows.slice(0, 4).every((r) => r.querySelectorAll('.is-yes').length === 2) && rows.slice(4).every((r) => r.querySelectorAll('.is-no').length === 1 && r.querySelectorAll('.is-yes').length === 1)
  })
  check(`${tag}: the table shows the community has the base and the office has all of it`, tableOk)
  await click(page, '.jo-faq li:nth-child(2) button', '')
  await wait(500)
  check(`${tag}: the questions open and say there is no percentage of the commission`, await page.evaluate(() => document.querySelector('.jo-faq li.is-open')?.textContent.includes('לא. זה מחיר קבוע')))

  // the area is closed until payment, with no way around
  await page.goto(green + '/app/agent', { waitUntil: 'load' })
  await wait(1500)
  check(`${tag}: the agent area is closed before paying`, await page.evaluate(() => !!document.querySelector('.ag-gate') && !document.querySelector('.ag-wiz')))
  await page.goto(green + '/app/agent?start=1', { waitUntil: 'load' })
  await wait(1500)
  check(`${tag}: and there is no shortcut around the payment`, await page.evaluate(() => !!document.querySelector('.ag-gate') && !document.querySelector('.ag-wiz')))
  check(`${tag}: no console errors`, errors.length === 0, errors.slice(0, 2).join(' | '))
  await page.close()
}

// the navy look still has its own, single join page
{
  const page = await browser.newPage()
  await page.setViewport({ width: 1440, height: 900 })
  await page.goto(navy + '/join', { waitUntil: 'load' })
  await wait(1500)
  check('navy: /join is still the one onboarding, with no choice and no office', await page.evaluate(() => document.body.textContent.includes('נעים להכיר') && !document.querySelector('.jc') && !document.body.textContent.includes('689')))
  await page.close()
}

await browser.close().catch(() => {})
console.log(results.join('\n'))
console.log(results.some((r) => r.startsWith('FAIL')) ? '\nSOME CHECKS FAILED' : '\nALL CHECKS PASSED')
