// The office's page for a community member (17.11.2026): "המשרד" and "שדרג למשרד NadlanUP" open a page that speaks to
// the feeling (independence, a back behind you, not alone, a business of your own), not a list of the community's
// features. 0% to the office and 100% to the broker, said clearly; the envelope (Yad2 and Madlan ads, guidance,
// branding, tools) by the price list; a clear button to join and one to be called back. No invented numbers or
// reviews, no dashes. Saves screenshots.
// Usage: node scripts/office-story-check.mjs [outDir]     (BASE_GREEN overrides the address)
import puppeteer from 'puppeteer-core'
import { mkdirSync } from 'node:fs'

const green = process.env.BASE_GREEN ?? 'http://localhost:5240/NADLANIL-DEMO/green'
const out = process.argv[2] ?? '_shots/office-story'
mkdirSync(out, { recursive: true })
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
const browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--hide-scrollbars'] })
let fails = 0
const check = (name, ok, info) => {
  if (!ok) fails++
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok || info === undefined ? '' : '  [' + JSON.stringify(info) + ']'}`)
}
const PREVIEW = '6d5eaaca072bf02f647051d8688d1337a4ab7a6cb92a2a8b3924cf91fda89e8b'
const tap = (page, sel) => page.$eval(sel, (el) => (el.scrollIntoView({ block: 'center' }), el.click()))
const fresh = async (vp, mode = 'day') => {
  const page = await browser.newPage()
  await page.setViewport(vp)
  await page.evaluateOnNewDocument((h) => {
    try {
      localStorage.setItem('nadlanup-demo-v1', '1')
      localStorage.setItem('nadlanup-preview-v1', h)
    } catch {}
  }, PREVIEW)
  await page.goto(green + '/', { waitUntil: 'load' })
  await page.evaluate(
    (h, mode) => {
      localStorage.clear()
      localStorage.setItem('nadlanup-demo-v1', '1')
      localStorage.setItem('nadlanup-preview-v1', h)
      localStorage.setItem('nadlanup-mode-v1', JSON.stringify({ mode, until: Date.now() + 9e9 }))
    },
    PREVIEW,
    mode,
  )
  return page
}
/** the page scrolled so that an element's top is near the top of the screen, then a screenshot */
const shotAt = async (page, sel, path, offset = 20) => {
  await page.evaluate(
    (sel, offset) => {
      const el = document.querySelector(sel)
      window.scrollTo({ top: el.getBoundingClientRect().top + scrollY - offset, behavior: 'instant' })
    },
    sel,
    offset,
  )
  await wait(900)
  await page.screenshot({ path })
}
// 24.11.2026: no prices on this page any more (Itzik); none of these may show
const PRICES = ['549', '887', '1,219', 'מע"מ לחודש', 'דמי חבר', 'מחירון', 'חבילות מדלן']

for (const [tag, vp, phone] of [
  ['desktop', { width: 1440, height: 900 }, false],
  ['phone', { width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }, true],
]) {
  const page = await fresh(vp)

  // ---- 1. "המשרד" in the menu
  await page.goto(green + '/app/community', { waitUntil: 'networkidle0' })
  await wait(600)
  const navSel = phone ? '.bottom-nav a[href$="/app/office"]' : '.sidebar a[href$="/app/office"]'
  await tap(page, navSel)
  await page.waitForSelector('[data-office-story]', { visible: true, timeout: 5000 })
  await wait(400)
  const first = await page.evaluate(() => ({
    path: location.pathname,
    list: !!document.querySelector('.of-grid'),
    h1: document.querySelector('.os-hero h1')?.innerText.replace(/\s+/g, ' ').trim(),
  }))
  check(`${tag}: "המשרד" in the menu opens the office's page, not the list of locked tools`, first.path.endsWith('/app/office') && !first.list && /העסק שלכם/.test(first.h1 ?? ''), first)
  await wait(3000)
  const hero = await page.evaluate(() => {
    const s = document.querySelector('.os-split')
    const join = document.querySelector('[data-act="join-hero"]')
    const call = document.querySelector('[data-act="ask-info"][data-where="hero"]')
    const r = join.getBoundingClientRect()
    return {
      share: Number(s.dataset.share),
      broker: s.querySelector('.is-broker b')?.textContent + ' ' + s.querySelector('.is-broker span')?.textContent,
      office: s.querySelector('.is-office b')?.textContent + ' ' + s.querySelector('.is-office span')?.textContent,
      label: s.getAttribute('aria-label'),
      join: join.textContent.trim(),
      call: call?.textContent.trim(),
      joinH: Math.round(r.height),
      joinVisible: r.top >= 0 && r.bottom <= innerHeight + (innerWidth < 600 ? 400 : 0),
    }
  })
  check(`${tag}: "0% עמלה למשרד, 100% עמלה למתווך" in big numbers (it slides there from half-and-half)`, hero.share === 100 && hero.broker === '100% עמלה למתווך' && hero.office === '0% עמלה למשרד' && hero.label === 'מכל עסקה: 0% עמלה למשרד, 100% עמלה למתווך', hero)
  check(`${tag}: a clear button to join and one to ask for details ("מעוניינים לקבל מידע? לחצו כאן"), big`, hero.join === 'אני רוצה להצטרף' && hero.call === 'מעוניינים לקבל מידע? לחצו כאן' && hero.joinH >= 52, hero)
  await page.evaluate(() => scrollTo(0, 0))
  await wait(300)
  await page.screenshot({ path: `${out}/${tag}-1-hero.png` })

  // ---- 2. what the page says
  const all = await page.evaluate(() => {
    const root = document.querySelector('[data-office-story]')
    const heads = [...root.querySelectorAll('h1, h2, h3')].map((h) => h.innerText.replace(/\s+/g, ' ').trim())
    return {
      text: root.innerText,
      heads,
      feel: [...root.querySelectorAll('.os-feel-card em')].map((e) => e.textContent),
      env: [...root.querySelectorAll('.os-env-card h3')].map((e) => e.textContent),
      plans: [...root.querySelectorAll('.os-plan')].map((e) => e.querySelector('.os-plan-name').textContent + ' ' + e.querySelector('b').textContent.replace(/\s+/g, ' ').trim()),
      wide: document.documentElement.scrollWidth > innerWidth + 1,
      ask: !!root.querySelector('[data-section="ask"] [data-act="ask-info"]'),
    }
  })
  check(`${tag}: it speaks to the feeling: עצמאות, ביטחון, לא לבד, עסק משלכם`, all.feel.join('|') === 'עצמאות|ביטחון|לא לבד|עסק משלכם', all.feel)
  // the Madlan packs carried prices, and left with them (24.11.2026)
  check(`${tag}: the envelope: פרסום (יד2), ליווי, מיתוג, כלים`, all.env.join('|') === 'פרסום|ליווי|מיתוג|כלים וידע' && /יד2/.test(all.text) && /אריאל/.test(all.text), all.env)
  check(`${tag}: no price on the page: no plan prices, no Madlan packs, no "דמי חבר", no ₪`, PRICES.every((p) => !all.text.includes(p)) && !all.text.includes('₪') && all.plans.length === 0, PRICES.filter((p) => all.text.includes(p)))
  check(`${tag}: the fee reads "0% עמלה למשרד, 100% עמלה למתווך", and the ask for details stands where the prices were`, (all.text.match(/0% עמלה למשרד, 100% עמלה למתווך/g) ?? []).length >= 3 && all.ask, all.ask)
  check(`${tag}: no dashes in the copy`, !/[\u2013\u2014]/.test(all.text), all.text.match(/.{0,20}[\u2013\u2014].{0,20}/)?.[0])
  check(`${tag}: no headline ends with a full stop`, all.heads.every((h) => !/\.$/.test(h)), all.heads)
  check(`${tag}: no reviews, no counts of members or deals`, !/ממליצ|ביקורת|★|לקוחות מרוצים|מתווכים כבר|\d+\+? מתווכים/.test(all.text), all.text.match(/.{0,20}(ממליצ|ביקורת|מתווכים כבר).{0,20}/)?.[0])
  check(`${tag}: no sideways scroll`, !all.wide)

  await shotAt(page, '.os-truth', `${out}/${tag}-2-truth.png`)
  await shotAt(page, '.os-feel', `${out}/${tag}-3-feel.png`)
  await shotAt(page, '.os-env', `${out}/${tag}-4-envelope.png`)
  if (phone) await shotAt(page, '.os-env-card.is-guide', `${out}/${tag}-4b-envelope.png`, 80)
  await shotAt(page, '.os-ask', `${out}/${tag}-5-ask.png`)
  await shotAt(page, '.os-final', `${out}/${tag}-6-final.png`, phone ? 120 : 160)

  // ---- 3. "מעוניינים לקבל מידע? לחצו כאן" opens the leads form of the office page (24.11.2026; it took the place of
  // the demo's "שיחזרו אליי"; scripts/leads-check.mjs sends one to the server)
  await tap(page, '[data-act="ask-info"][data-where="hero"]')
  await page.waitForSelector('[data-sheet="lead"]', { visible: true })
  await wait(500)
  const form = await page.evaluate(() => ({
    fields: [...document.querySelectorAll('[data-sheet="lead"] [data-lead]')].map((e) => e.dataset.lead),
    inView: (() => {
      const r = document.querySelector('[data-act="send-lead"]').getBoundingClientRect()
      return r.bottom <= innerHeight + 2 && r.top >= 0
    })(),
  }))
  check(`${tag}: the leads form: name, phone, city and a note, its button in view`, form.fields.join() === 'name,phone,city,note' && form.inView, form)
  await page.screenshot({ path: `${out}/${tag}-7-lead-form.png` })
  await tap(page, '[data-act="send-lead"]')
  await wait(300)
  const err = await page.evaluate(() => ({ n: document.querySelectorAll('[data-sheet="lead"] .ld-err').length, done: document.querySelector('[data-sheet="lead"]')?.dataset.state === 'done' }))
  check(`${tag}: sending it empty: a word under each required field, nothing sent`, err.n === 3 && !err.done, err)
  await page.keyboard.press('Escape')
  await wait(600)
  check(`${tag}: Escape closes it`, !(await page.$('[data-sheet="lead"]')))

  // ---- 4. "אני רוצה להצטרף" opens the joining at once
  await tap(page, '[data-act="join-final"]')
  await page.waitForFunction(() => location.pathname.endsWith('/join/office'), { timeout: 5000 })
  await page.waitForSelector('[role="dialog"]', { visible: true, timeout: 5000 }).catch(() => {})
  await wait(700)
  const joined = await page.evaluate(() => ({ path: location.pathname, search: location.search, dialog: !!document.querySelector('[role="dialog"]') }))
  check(`${tag}: "אני רוצה להצטרף" goes to the office's joining, open at once`, joined.path.endsWith('/join/office') && joined.search === '' && joined.dialog, joined)
  await page.screenshot({ path: `${out}/${tag}-9-join.png` })

  // ---- 5. "שדרג למשרד NadlanUP" from the feed leads to the same page
  await page.goto(green + '/app/community', { waitUntil: 'networkidle0' })
  await wait(600)
  // 19.11.2026: the strip above the feed is gone; the same call is one quiet post among the posts (and a line of
  // the profile menu, see scripts/top-bar-check.mjs)
  const hasBanner = await page.$('[data-upgrade="post"]')
  if (hasBanner) {
    await tap(page, '[data-upgrade="post"]')
    await page.waitForSelector('[data-office-story]', { visible: true, timeout: 5000 }).catch(() => {})
  }
  const viaBanner = await page.evaluate(() => ({ path: location.pathname, story: !!document.querySelector('[data-office-story]') }))
  check(`${tag}: "שדרג למשרד NadlanUP" in the community opens the same page`, !!hasBanner && viaBanner.story && viaBanner.path.endsWith('/app/office'), viaBanner)

  // ---- 6. the community's own page: its button leads to the page standing alone
  await page.goto(green + '/kehila', { waitUntil: 'networkidle0' })
  await wait(500)
  const pitch = await page.$('[data-act="office-pitch"]')
  if (pitch) await tap(page, '[data-act="office-pitch"]')
  await page.waitForSelector('[data-office-story]', { visible: true, timeout: 5000 }).catch(() => {})
  const alone = await page.evaluate(() => ({ path: location.pathname, story: !!document.querySelector('[data-office-story].is-standalone'), wide: document.documentElement.scrollWidth > innerWidth + 1 }))
  check(`${tag}: on the community's page, "שדרג למשרד" opens the page on its own`, !!pitch && alone.story && alone.path.endsWith('/office') && !alone.wide, alone)

  // ---- 7. an office member still gets his office
  await page.evaluate(() => localStorage.setItem('nadlanup-member-v1', 'office'))
  await page.goto(green + '/app/office', { waitUntil: 'networkidle0' })
  await wait(500)
  const office = await page.evaluate(() => ({ story: !!document.querySelector('[data-office-story]'), list: !!document.querySelector('.of-grid') }))
  check(`${tag}: an office member still gets "המשרד שלי" with his tools`, !office.story && office.list, office)
  await page.close()

  // ---- 8. by night
  const night = await fresh(vp, 'night')
  await night.goto(green + '/app/office', { waitUntil: 'networkidle0' })
  await wait(3200)
  await night.screenshot({ path: `${out}/${tag}-10-night.png` })
  await shotAt(night, '.os-feel', `${out}/${tag}-11-night-feel.png`)
  const nt = await night.evaluate(() => {
    const h = document.querySelector('.os-feel-card h3')
    const c = getComputedStyle(h).color
    const bg = getComputedStyle(document.querySelector('.os-feel-card')).backgroundColor
    return { c, bg }
  })
  check(`${tag}: by night the cards are dark with light text`, /rgb\((2[0-9]{2}|1[6-9][0-9])/.test(nt.c) && !/rgb\(255, 255, 255\)/.test(nt.bg), nt)
  await night.close()
}

console.log(fails ? '\nSOME CHECKS FAILED' : '\nALL CHECKS PASSED')
await Promise.race([browser.close().catch(() => {}), wait(4000)])
process.exit(0)
