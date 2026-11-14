// The office's price list (green version, 14.11.2026): three plans, the Madlan packages and the terms, written
// exactly as they were given; the calculator and the simulated joining go by the plan that was picked, with Madlan on
// top; and the old single fee of 689 is gone from every screen.
// Usage: node scripts/pricing-check.mjs [outDir]     (BASE_GREEN overrides the address)
import puppeteer from 'puppeteer-core'
import { mkdirSync } from 'node:fs'

const green = process.env.BASE_GREEN ?? 'http://localhost:5240/NADLANIL-DEMO/green'
const out = process.argv[2] ?? '_shots/pricing'
mkdirSync(out, { recursive: true })
const browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--hide-scrollbars'] })
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
const results = []
const check = (name, ok, detail = '') => {
  const line = `${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  [' + detail + ']' : ''}`
  results.push(line)
  console.error(line)
}
const clean = (s) => (s ?? '').replace(/\s+/g, ' ').trim()

// the price list, word for word
const BASIC = [
  'חתימה טובה|שווי 50 ₪ בחודש',
  "קהילה מלאה בחינם עם כל הפיצ'רים|שווי 199 ₪ בחודש",
  'ליווי שבועי - פגישה אישית עם אריאל|שווי 350 ₪',
  'ספריית ידע: תיק פרזנטציה מלא, קורס פייסבוק ממומן, תסריטי שיחות, טיפול בהתנגדויות, התנהלות נכונה מול קונים ועוד|שווי 2,500 ₪',
  'תוכנית עסקית מותאמת אישית עם יעדים שבועיים, חודשיים ושנתיים|',
  'השתייכות למשרד בפריסה ארצית + דף עסקי ממותג תחת שם המשרד|',
  'מענה לכל עזרה מקצועית|',
  'ללא מודעות יד2|',
]
const VAT = '₪ + מע"מ לחודש'

const list = (page) =>
  page.evaluate(() => {
    const clean = (s) => (s ?? '').replace(/\s+/g, ' ').trim()
    const sec = document.querySelector('#pricing')
    return {
      title: clean(sec?.querySelector('.jo-head h2')?.textContent),
      sub: clean(sec?.querySelector('.jo-head p')?.textContent),
      plans: [...(sec?.querySelectorAll('.prc-plan article') ?? [])].map((a) => ({
        id: a.dataset.plan,
        name: clean(a.querySelector('h3').textContent),
        price: clean(a.querySelector('.prc-price').textContent),
        lines: [...a.querySelectorAll('li')].map((li) => {
          const worth = clean(li.querySelector('em')?.textContent)
          const span = li.querySelector('span').cloneNode(true)
          span.querySelector('em')?.remove()
          return `${clean(span.textContent)}|${worth}`
        }),
        x: Math.round(a.getBoundingClientRect().left),
        y: Math.round(a.getBoundingClientRect().top + scrollY),
      })),
      madlanTitle: clean(document.querySelector('[data-box="madlan"]')?.closest('.prc-box').querySelector('h3').textContent),
      madlan: [...document.querySelectorAll('[data-box="madlan"] tr')].map((tr) => `${clean(tr.querySelector('th').textContent)} - ${clean(tr.querySelector('td').textContent)}`),
      termsTitle: clean(document.querySelector('[data-box="terms"]')?.closest('.prc-box').querySelector('h3').textContent),
      terms: [...document.querySelectorAll('[data-box="terms"] tr')].map((tr) => `${clean(tr.querySelector('th').textContent)}: ${clean(tr.querySelector('td').textContent)}`),
      all: clean(sec?.querySelector('.prc-all')?.textContent),
      ov: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    }
  })
const calc = (page) =>
  page.evaluate(() => {
    const clean = (s) => (s ?? '').replace(/\s+/g, ' ').trim()
    const box = document.querySelector('.jo-ours')
    return {
      plan: clean(box.querySelector('[data-fact="plan"]')?.textContent),
      madlan: clean(box.querySelector('[data-fact="madlan"]')?.textContent),
      sum: clean(box.querySelector('[data-fact="sum"]')?.textContent),
      total: clean(box.querySelector('.jo-total .jo-big')?.textContent),
      months: Number(box.querySelector('[data-k="months"]').value),
      min: Number(box.querySelector('[data-k="months"]').min),
      extra: box.querySelector('.prc-extra')?.dataset.extra ?? null,
      ads: clean(box.querySelector('.prc-extra em')?.textContent),
    }
  })
const pickIn = (page, scope, attr, id) => page.evaluate((s, a, i) => document.querySelector(`${s} .prc-choose [data-${a}="${i}"]`).click(), scope, attr, id)

for (const dev of [{ name: 'desktop', vp: { width: 1440, height: 900 } }, { name: 'phone', vp: { width: 390, height: 844, isMobile: true, hasTouch: true } }]) {
  const d = dev.name
  const page = await browser.newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push(String(e)))
  await page.setViewport(dev.vp)
  await page.goto(green + '/', { waitUntil: 'load' })
  await page.evaluate(() => {
    localStorage.clear()
    localStorage.setItem('nadlanup-mode-v1', JSON.stringify({ mode: 'day', until: Date.now() + 9e9 }))
  })
  await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }])
  await page.goto(green + '/join/office', { waitUntil: 'load' })
  await wait(1800)

  // ---- 1. the price list, word for word
  const l = await list(page)
  check(`${d} the title and the line under it`, l.title === 'מחירון NadlanUP - מסלולי חברות' && l.sub === 'כל המחירים חודשיים ולפני מע"מ.', `${l.title} / ${l.sub}`)
  check(`${d} three plans with their prices: BASIC 549, PLUS 887, PRO 1,219`, l.plans.map((p) => `${p.name} ${p.price}`).join(' | ') === `BASIC 549 ${VAT} | PLUS 887 ${VAT} | PRO 1,219 ${VAT}`, l.plans.map((p) => `${p.name} ${p.price}`).join(' | '))
  check(`${d} BASIC: the eight lines, word for word, with the values next to them`, JSON.stringify(l.plans[0].lines) === JSON.stringify(BASIC), JSON.stringify(l.plans[0].lines.filter((x, i) => x !== BASIC[i])))
  check(`${d} PLUS and PRO: all of BASIC, and 5 or 10 Yad2 ads`, l.plans[1].lines.join(';') === 'כל שירותי BASIC|;5 מודעות יד2|' && l.plans[2].lines.join(';') === 'כל שירותי BASIC|;10 מודעות יד2|', `${l.plans[1].lines.join(';')} / ${l.plans[2].lines.join(';')}`)
  const side = l.plans[0].y === l.plans[1].y && l.plans[1].y === l.plans[2].y
  check(d === 'desktop' ? 'desktop the three cards stand side by side' : 'phone the three cards stand one under the other', d === 'desktop' ? side : l.plans[0].y < l.plans[1].y && l.plans[1].y < l.plans[2].y && l.plans[0].x === l.plans[1].x)
  check(`${d} the Madlan table, word for word`, l.madlanTitle === 'חבילות מדלן - בתשלום נוסף' && l.madlan.join(' ; ') === `5 מודעות מדלן - 265 ${VAT} ; 10 מודעות מדלן - 390 ${VAT} ; תוספת של 5 מודעות - 125 ${VAT}`, l.madlan.join(' ; '))
  check(`${d} the terms, word for word`, l.termsTitle === 'תנאי ההתקשרות' && l.terms.join(' ; ') === 'חברות במשרד: התחייבות מינימלית ל-3 חודשים ; פרסום ביד2: התחייבות ל-3 חודשים ; פרסום במדלן: התחייבות ל-6 חודשים ; עמלות תיווך: 100% נשארות אצל הסוכן ; דמי הצטרפות: ללא עלות', l.terms.join(' ; '))
  check(`${d} every plan includes "הסוכן שלנו" and what the office included`, l.all.includes('בכל המסלולים') && l.all.includes('הסוכן שלנו'), l.all)
  check(`${d} nothing scrolls sideways`, l.ov <= 1, `${l.ov}px`)
  await page.evaluate(() => document.querySelector('#pricing').scrollIntoView({ block: 'start' }))
  await wait(500)
  await page.screenshot({ path: `${out}/${d}-1-plans.png` })
  await page.evaluate(() => document.querySelector('.prc-below').scrollIntoView({ block: 'center' }))
  await wait(400)
  await page.screenshot({ path: `${out}/${d}-2-madlan-terms.png` })

  // ---- 2. the old fee is gone, on this page and on the others
  const whole = clean(await page.evaluate(() => document.body.innerText))
  check(`${d} the office page: no 689, no "יקבע", and the short line says "החל מ-549 ₪ + מע"מ לחודש"`, !whole.includes('689') && !whole.includes('יקבע') && whole.includes('החל מ-549 ₪ + מע"מ לחודש'))

  // ---- 3. the calculator goes by the plan, with Madlan on top
  await page.evaluate(() => document.querySelector('#calc').scrollIntoView({ block: 'start' }))
  await wait(500)
  let c = await calc(page)
  check(`${d} the calculator starts on BASIC, 12 months: 549 × 12`, c.plan === `מסלול BASIC: 549 ${VAT}` && c.sum === '549 × 12, לפני מע"מ' && c.total === '₪6,588' && c.min === 3 && !c.madlan, JSON.stringify(c))
  await pickIn(page, '.jo-ours', 'plan', 'pro')
  await wait(900)
  c = await calc(page)
  check(`${d} choosing PRO: 1,219 × 12`, c.plan === `מסלול PRO: 1,219 ${VAT}` && c.sum === '1,219 × 12, לפני מע"מ' && c.total === '₪14,628', JSON.stringify(c))
  await pickIn(page, '.jo-ours', 'plan', 'plus')
  await pickIn(page, '.jo-ours', 'madlan', 'm10')
  await wait(400)
  await page.evaluate(() => { const b = document.querySelector('.jo-ours [data-act="extra-more"]'); b.click(); b.click() })
  await wait(900)
  c = await calc(page)
  // PLUS 887 + Madlan 10 ads 390 + two extras of 125 = 1,527 a month
  check(`${d} PLUS with 10 Madlan ads and two extras: 887 + 390 + 2 × 125 = 1,527 a month, 20 ads`, c.plan === `מסלול PLUS: 887 ${VAT}` && c.madlan === `מדלן, 20 מודעות: 640 ${VAT}` && c.sum === '1,527 × 12, לפני מע"מ' && c.total === '₪18,324' && c.extra === '2' && c.ads.includes('20'), JSON.stringify(c))
  check(`${d} with Madlan the calculator does not go under 6 months`, c.min === 6)
  await page.evaluate(() => document.querySelector('.jo-ours').scrollIntoView({ block: 'center' }))
  await wait(400)
  await page.screenshot({ path: `${out}/${d}-3-calculator.png` })
  await page.evaluate(() => { const b = document.querySelector('.jo-ours [data-act="extra-less"]'); b.click() })
  await pickIn(page, '.jo-ours', 'madlan', 'none')
  await wait(600)
  c = await calc(page)
  check(`${d} taking Madlan off removes its extras too`, !c.madlan && c.sum === '887 × 12, לפני מע"מ' && c.min === 3 && c.extra === null, JSON.stringify(c))

  // ---- 4. joining: pick a plan, add Madlan, no charge
  await page.evaluate(() => document.querySelector('.prc-plan article[data-plan="pro"] [data-act="pick-plan"]').click())
  await wait(900)
  await pickIn(page, '.jo-pay', 'madlan', 'm5')
  await wait(300)
  await page.evaluate(() => document.querySelector('.jo-pay [data-act="extra-more"]').click())
  await wait(500)
  const j = await page.evaluate(() => {
    const clean = (s) => (s ?? '').replace(/\s+/g, ' ').trim()
    return {
      on: clean(document.querySelector('.jo-pay .prc-opts.is-plans button.is-on b')?.textContent),
      sum: [...document.querySelectorAll('.jo-pay [data-sum] > div')].map((r) => `${clean(r.querySelector('dt').textContent)}=${clean(r.querySelector('dd').textContent)}`),
      terms: [...document.querySelectorAll('.jo-pay [data-terms] li')].map((x) => clean(x.textContent)),
      disabled: document.querySelector('.jo-go')?.disabled,
      note: clean(document.querySelector('.modal')?.textContent).includes('בדמו אין חיוב אמיתי'),
      fits: (() => { const m = document.querySelector('.jo-pay').getBoundingClientRect(); return m.left >= 0 && m.right <= innerWidth })(),
    }
  })
  // PRO 1,219 + Madlan 5 ads 265 + one extra 125 = 1,609
  check(`${d} joining opens on the plan that was clicked (PRO), and adds Madlan with an extra`, j.on === 'PRO' && j.sum.join(' ; ') === `מסלול PRO=1,219 ${VAT} ; 5 מודעות מדלן=265 ${VAT} ; תוספת של 5 מודעות × 1=125 ${VAT} ; עמלה למשרד=0% ; דמי הצטרפות=ללא עלות ; סך הכול לחודש=1,609 ${VAT} ; חיוב היום=אין, זה דמו`, j.sum.join(' ; '))
  check(`${d} joining shows the terms that apply: membership, Yad2 and Madlan`, j.terms.join(' ; ') === 'חברות במשרד: התחייבות מינימלית ל-3 חודשים ; פרסום ביד2: התחייבות ל-3 חודשים ; פרסום במדלן: התחייבות ל-6 חודשים', j.terms.join(' ; '))
  check(`${d} joining: no real charge, the terms must be approved, and the window fits`, j.note && j.disabled === true && j.fits)
  await page.screenshot({ path: `${out}/${d}-4-joining.png` })
  await page.evaluate(() => document.querySelector('.jo-agree input').click())
  await wait(200)
  await page.evaluate(() => document.querySelector('.jo-go').click())
  await wait(2400)
  await page.evaluate(() => document.querySelector('.jo-done .btn')?.click())
  await wait(1800)
  const after = await page.evaluate(() => ({ path: location.pathname, member: localStorage.getItem('nadlanup-member-v1'), plan: JSON.parse(localStorage.getItem('nadlanup-plan-v1') ?? '{}') }))
  check(`${d} after joining: an office member on PRO with Madlan, in the questionnaire`, after.path.endsWith('/app/agent') && after.member === 'office' && after.plan.plan === 'pro' && after.plan.madlan === 'm5' && after.plan.extra === 1, JSON.stringify(after))
  await page.goto(green + '/app/office', { waitUntil: 'load' })
  await wait(1500)
  check(`${d} the office area names the member's plan`, clean(await page.evaluate(() => document.querySelector('.of-banner.is-in')?.textContent)).includes('מסלול PRO'))

  // ---- 5. the old fee is gone everywhere; credits still have no price
  await page.evaluate(() => localStorage.setItem('nadlanup-member-v1', 'community'))
  for (const r of ['/', '/join', '/join/office', '/upgrade', '/kehila', '/about', '/app/office', '/app/agent', '/app/community']) {
    await page.goto(green + r, { waitUntil: 'load' })
    await wait(1300)
    const t = clean(await page.evaluate(() => document.body.innerText))
    check(`${d} ${r}: no 689 anywhere`, !t.includes('689'), t.match(/.{0,30}689.{0,30}/)?.[0] ?? '')
    if (r === '/join') check(`${d} the choice of a way to join says "החל מ-549 ₪ + מע"מ לחודש"`, t.includes('החל מ-549 ₪ + מע"מ לחודש'))
    if (r === '/upgrade') {
      check(`${d} the comparison: the office from 549, and a credit still has no price ("מחיר יקבע")`, t.includes('החל מ-549 ₪ + מע"מ לחודש') && t.includes('מחיר קרדיט: מחיר יקבע'))
      check(`${d} the comparison: nothing scrolls sideways`, (await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)) <= 1)
      await page.screenshot({ path: `${out}/${d}-5-upgrade.png` })
    }
  }

  check(`${d} no page errors`, errors.length === 0, errors.slice(0, 2).join(' | '))
  await page.close()
}

console.log(results.some((r) => r.startsWith('FAIL')) ? '\nSOME CHECKS FAILED' : '\nALL CHECKS PASSED')
await Promise.race([browser.close().catch(() => {}), wait(4000)])
process.exit(0)
