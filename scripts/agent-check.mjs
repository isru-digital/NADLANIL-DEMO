// Checks "הסוכן שלנו" (green look only): the entry in the sidebar, the gate and the simulated payment, the 15-question
// wizard (validation, a real photo upload, the quick fill), the dashboard, and the agent's public page (content, SEO
// tags). Also checks the navy look has none of it. Saves screenshots of every stage.
// Usage: node scripts/agent-check.mjs [outDir]
import puppeteer from 'puppeteer-core'
import fs from 'node:fs'
import path from 'node:path'

const out = process.argv[2] ?? '_shots'
fs.mkdirSync(out, { recursive: true })
const green = process.env.BASE_GREEN ?? 'http://localhost:5240/NADLANIL-DEMO/green'
const navy = process.env.BASE_NAVY ?? 'http://localhost:5230/NADLANIL-DEMO'
const photo = path.resolve('public/img/broker-02.webp')
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
  await page.goto(green + '/app', { waitUntil: 'load' })
  await page.evaluate(() => {
    localStorage.removeItem('nadlanup-agent-v1')
    localStorage.removeItem('nadlanup-member-v1')
  })
  await page.reload({ waitUntil: 'load' })
  await wait(1400)

  // entry
  if (phone) {
    await click(page, '.bottom-link', 'עוד')
    await wait(600)
    check(`${tag}: "הסוכן שלנו" is in the more sheet`, await page.evaluate(() => [...document.querySelectorAll('.more-link')].some((l) => l.textContent.includes('הסוכן שלנו'))))
    await click(page, '.more-link', 'הסוכן שלנו')
  } else {
    check(`${tag}: "הסוכן שלנו" is in the sidebar`, await page.evaluate(() => [...document.querySelectorAll('.side-link')].some((l) => l.textContent.includes('הסוכן שלנו'))))
    await click(page, '.side-link', 'הסוכן שלנו')
  }
  await wait(1200)
  check(`${tag}: closed to a community member (the gate, with no price)`, await page.evaluate(() => !!document.querySelector('.ag-gate') && document.querySelector('.ag-gate').textContent.includes('האזור כלול במשרד ונפתח לחברי המשרד') && !document.querySelector('.ag-gate').textContent.includes('689')))
  await page.screenshot({ path: `${out}/agent-${label}-1-gate.png` })

  // the area is closed: its button leads to the office page, where the (simulated) joining is
  await click(page, '.ag-gate-cta .btn', 'להצטרפות')
  await wait(1600)
  check(`${tag}: the gate leads to the office pricing page`, await page.evaluate(() => location.pathname.endsWith('/join/office') && !!document.querySelector('.jo-hero')))
  await page.screenshot({ path: `${out}/agent-${label}-2-office.png` })
  await click(page, '.jo-hero .btn-white', 'להצטרפות')
  await wait(900)
  await page.screenshot({ path: `${out}/agent-${label}-2b-pay.png` })
  check(`${tag}: joining is a simulation with no card fields`, await page.evaluate(() => !!document.querySelector('.jo-pay') && document.querySelectorAll('.jo-pay input[type=text], .jo-pay input[type=tel], .jo-pay input[type=number]').length === 0 && document.body.textContent.includes('בדמו אין חיוב אמיתי')))
  check(`${tag}: the joining shows 0% to the office and 689 a month`, await page.evaluate(() => { const t = document.querySelector('.jo-sum')?.textContent ?? ''; return t.includes('0%') && t.includes('689 ₪ לחודש') && !t.includes('2,067') }))
  check(`${tag}: joining needs the terms to be approved`, await page.evaluate(() => document.querySelector('.jo-go')?.disabled === true))
  await page.evaluate(() => document.querySelector('.jo-agree input')?.click())
  await wait(300)
  await click(page, '.jo-go', '')
  await wait(2400)
  check(`${tag}: the joining completes`, await page.evaluate(() => !!document.querySelector('.jo-done')))
  await click(page, '.jo-done .btn', 'מתחילים')
  await wait(1000)
  let st = await page.evaluate(() => ({
    wiz: !!document.querySelector('.ag-wiz'),
    title: document.querySelector('.ag-step h2')?.textContent,
    n: document.querySelector('.ag-prog')?.getAttribute('aria-label'),
    nextDisabled: [...document.querySelectorAll('.ag-nav .btn-gold')].pop()?.disabled,
  }))
  check(`${tag}: the questionnaire starts at question 1 of 15`, st.wiz && /שאלה 1 מתוך 15/.test(st.n), `${st.title}, ${st.n}`)
  check(`${tag}: next is disabled until a name is typed`, st.nextDisabled === true)
  await page.screenshot({ path: `${out}/agent-${label}-3-q1.png` })

  // real answers for the first questions
  await page.type('.ag-field input', 'דנה כהן')
  await click(page, '.ag-chip', 'מתווכת')
  await wait(200)
  await click(page, '.ag-nav .btn-gold', 'הבא')
  await wait(700)
  // the photo: a real upload
  const input = await page.$('input[type=file][accept="image/*"]')
  await input.uploadFile(photo)
  await wait(1500)
  check(
    `${tag}: an uploaded photo shows in the form`,
    await page.evaluate(() => !!document.querySelector('.ag-drop img')),
  )
  await page.screenshot({ path: `${out}/agent-${label}-4-photo.png` })
  await click(page, '.ag-nav .btn-gold', 'הבא')
  await wait(600)
  // licence: skip, then years, then areas
  await click(page, '.ag-nav .btn-quiet', 'לדלג')
  await wait(600)
  await click(page, '.ag-nav .btn-gold', 'הבא')
  await wait(600)
  st = await page.evaluate(() => ({ title: document.querySelector('.ag-step h2')?.textContent, next: [...document.querySelectorAll('.ag-nav .btn-gold')].pop()?.disabled }))
  check(`${tag}: areas needs at least one pick`, st.title.includes('איפה') && st.next === true, st.title)
  await click(page, '.ag-chip', 'תל אביב')
  await click(page, '.ag-chip', 'ירושלים')
  await wait(500)
  check(`${tag}: picking areas lights them on the map`, phone || (await page.evaluate(() => document.querySelectorAll('.agm-node.is-on').length)) >= 2)
  await page.screenshot({ path: `${out}/agent-${label}-5-areas.png` })

  // the quick fill, then the last question
  await click(page, '.ag-fill', '')
  await wait(900)
  st = await page.evaluate(() => ({
    n: document.querySelector('.ag-prog')?.getAttribute('aria-label'),
    phone: document.querySelector('.ag-field input')?.value,
    nextDisabled: [...document.querySelectorAll('.ag-nav .btn-gold')].pop()?.disabled,
  }))
  check(`${tag}: quick fill jumps to the last question, filled`, /שאלה 15 מתוך 15/.test(st.n) && st.phone.length > 8 && st.nextDisabled === false, JSON.stringify(st))
  await page.screenshot({ path: `${out}/agent-${label}-6-last.png` })
  await click(page, '.ag-nav .btn-gold', 'לבנות')
  await wait(1500)
  check(`${tag}: a building screen plays`, await page.evaluate(() => !!document.querySelector('.ag-making')))
  await page.screenshot({ path: `${out}/agent-${label}-7-making.png` })
  await wait(3600)
  st = await page.evaluate(() => ({
    dash: !!document.querySelector('.ag-dash'),
    h1: document.querySelector('.ag-dash h1')?.textContent,
    serp: !!document.querySelector('.ag-serp'),
    checks: document.querySelectorAll('.ag-checks li').length,
  }))
  check(`${tag}: dashboard of the finished page`, st.dash && st.h1.includes('מאיה') && st.serp && st.checks === 4, JSON.stringify(st))
  await page.screenshot({ path: `${out}/agent-${label}-8-dashboard.png`, fullPage: true })

  // the public page
  await click(page, '.ag-dash-cta a', 'לפתיחת הדף')
  await wait(2400)
  st = await page.evaluate(() => ({
    path: decodeURIComponent(location.pathname),
    h1: document.querySelector('.agp-hero h1')?.textContent,
    title: document.title,
    ld: (() => {
      try {
        return JSON.parse(document.getElementById('agent-ld')?.textContent ?? '{}')
      } catch {
        return {}
      }
    })(),
    desc: document.querySelector('meta[name="description"]')?.content ?? '',
    sections: document.querySelectorAll('.agp-section').length,
    overflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    img: !!document.querySelector('.agp-arch img'),
  }))
  check(`${tag}: the page lives at the broker's name in the address`, st.path.includes('/agent/מאיה-לנדאו'), st.path)
  check(`${tag}: the page shows the name, a photo and its sections`, st.h1 === 'מאיה לנדאו' && st.img && st.sections >= 6, `${st.h1}, ${st.sections} sections`)
  check(`${tag}: title and description are set for search`, st.title.includes('מאיה לנדאו') && st.title.includes('מתווכת') && st.desc.includes('מאיה'), `${st.title}`)
  const graph = st.ld['@graph'] ?? []
  const agent = graph.find((x) => x['@type'] === 'RealEstateAgent')
  check(`${tag}: structured data has the agent, the breadcrumb and the questions`, agent?.name === 'מאיה לנדאו' && agent.areaServed?.length > 0 && graph.some((x) => x['@type'] === 'BreadcrumbList') && graph.find((x) => x['@type'] === 'FAQPage')?.mainEntity?.length === 4, graph.map((x) => x['@type']).join(','))
  const extra = await page.evaluate(() => ({
    crumbs: [...document.querySelectorAll('.agp-crumbs li')].map((l) => l.textContent.trim()),
    stats: [...document.querySelectorAll('.agp-stats dt')].map((d) => d.textContent.trim()),
    vcard: !!document.querySelector('.agp-contact-links button'),
    bar: (() => { const b = document.querySelector('.agp-actions'); return b ? getComputedStyle(b).display : 'none' })(),
    chip: document.querySelector('.agp-chip.is-a')?.textContent.trim(),
  }))
  check(`${tag}: a visible breadcrumb ends with the broker's name`, extra.crumbs.length === 3 && extra.crumbs[2] === 'מאיה לנדאו', extra.crumbs.join(' | '))
  check(`${tag}: the counters end on the real numbers`, extra.stats.join(',') === '11+,3,3', extra.stats.join(','))
  check(`${tag}: the first chip says the licence is approved`, extra.chip.includes('רישיון מתווך מאושר'), extra.chip)
  check(`${tag}: save-contact button exists`, extra.vcard)
  check(`${tag}: the quick contact bar ${phone ? 'shows on the phone' : 'is hidden on desktop'}`, phone ? extra.bar === 'grid' : extra.bar === 'none', extra.bar)
  await page.evaluate(() => document.getElementById('areas')?.scrollIntoView())
  await wait(900)
  check(`${tag}: the nav follows the section in view`, await page.evaluate(() => document.querySelector('.agp-nav nav a.is-on')?.getAttribute('href') === '#areas'))
  check(`${tag}: no sideways overflow on the page`, st.overflowX <= 1, `${st.overflowX}px`)
  await page.screenshot({ path: `${out}/agent-${label}-9-page-top.png` })
  // let the reveal-on-scroll sections show before the full-page picture
  await page.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight; y += 500) {
      window.scrollTo(0, y)
      await new Promise((r) => setTimeout(r, 120))
    }
    window.scrollTo(0, 0)
  })
  await wait(600)
  await page.screenshot({ path: `${out}/agent-${label}-10-page-full.png`, fullPage: true })

  check(`${tag}: no console errors`, errors.length === 0, errors.slice(0, 2).join(' | '))
  await page.close()
}

// the sample page works without registering, and a missing name says so
{
  const page = await browser.newPage()
  await page.setViewport({ width: 1440, height: 900 })
  await page.goto(green + '/agent/demo', { waitUntil: 'load' })
  await wait(1800)
  check('green: /agent/demo shows the sample page', await page.evaluate(() => document.querySelector('.agp-hero h1')?.textContent === 'מאיה לנדאו'))
  await page.goto(green + '/agent/nobody', { waitUntil: 'load' })
  await wait(1500)
  check('green: an unknown name says the page was not found', await page.evaluate(() => document.body.textContent.includes('הדף לא נמצא')))
  await page.close()
}

// the home page shows the questionnaire at the opening and links straight into it
for (const [label, vp] of [
  ['desktop', { width: 1440, height: 900 }],
  ['phone', { width: 375, height: 812, isMobile: true, hasTouch: true }],
]) {
  const page = await browser.newPage()
  await page.setViewport(vp)
  await page.goto(green + '/', { waitUntil: 'load' })
  await page.evaluate(() => localStorage.removeItem('nadlanup-agent-v1'))
  await page.reload({ waitUntil: 'load' })
  await wait(1500)
  const h = await page.evaluate(() => ({
    section: !!document.getElementById('agent'),
    title: document.querySelector('#agent h2')?.textContent,
    nav: [...document.querySelectorAll('.hg-nav-links a')].some((a) => a.getAttribute('href') === '#agent'),
    sample: !!document.querySelector('#agent .agt-q'),
    chips: document.querySelectorAll('#agent .agt-q li').length,
    overflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth,
  }))
  check(`home ${label}: the agent section with the questionnaire is on the opening page`, h.section && h.title === 'הסוכן שלנו' && h.sample && h.chips >= 4, JSON.stringify(h))
  if (label === 'desktop') check('home desktop: the top menu links to it', h.nav)
  check(`home ${label}: no sideways overflow`, h.overflowX <= 1, `${h.overflowX}px`)
  await page.evaluate(() => document.getElementById('agent')?.scrollIntoView())
  await wait(1800)
  await page.screenshot({ path: `${out}/agent-home-${label}.png` })
  await click(page, '#agent .agt-cta a', 'להצטרפות למשרד')
  await wait(1800)
  const w = await page.evaluate(() => ({ path: location.pathname, office: !!document.querySelector('.jo-hero'), wiz: !!document.querySelector('.ag-wiz') }))
  check(`home ${label}: the button leads to the office page and not around the payment`, w.office && w.path.endsWith('/join/office') && !w.wiz, JSON.stringify(w))
  await page.close()
}

// the navy look has none of it
{
  const page = await browser.newPage()
  await page.setViewport({ width: 1440, height: 900 })
  await page.goto(navy + '/app', { waitUntil: 'load' })
  await wait(1500)
  const n = await page.evaluate(() => ({
    link: [...document.querySelectorAll('.side-link')].some((l) => l.textContent.includes('הסוכן שלנו')),
    count: document.querySelectorAll('.side-nav .side-link').length,
  }))
  check('navy: no "הסוכן שלנו" entry, the sidebar is unchanged', !n.link && n.count === 6, JSON.stringify(n))
  await page.goto(navy + '/agent/demo', { waitUntil: 'load' })
  await wait(1500)
  check('navy: /agent/demo does not exist (goes home)', await page.evaluate(() => !document.querySelector('.agp') && location.pathname.replace(/\/$/, '').endsWith('NADLANIL-DEMO')))
  await page.close()
}

await browser.close().catch(() => {})
console.log(results.join('\n'))
console.log(results.some((r) => r.startsWith('FAIL')) ? '\nSOME CHECKS FAILED' : '\nALL CHECKS PASSED')
