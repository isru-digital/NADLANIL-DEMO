// The community's sign-up, end to end, in a real browser against the LOCAL test server (server/, TEST_MODE=1:
// e-mails go to the outbox table, nothing is really sent): the form, the waiting screen, the locked door, the
// approver's two buttons, the welcome e-mail's entry, the broker's own area (not the example user's), signing out
// and in, the rejection with its reason, the demo link, and the approvers' screen with a test registrant.
// Needs:  server/ -> npx wrangler dev --port 8787 --local      and the site's dev server on :5240
// Usage: node scripts/signup-check.mjs [outDir]
import puppeteer from 'puppeteer-core'
import { mkdirSync } from 'node:fs'

const green = 'http://localhost:5240/NADLANIL-DEMO/green'
const API = 'http://localhost:8787'
const ORIGIN = 'http://localhost:5240'
const out = process.argv[2] ?? '_shots/signup-flow'
mkdirSync(out, { recursive: true })
const browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--hide-scrollbars'] })
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
const run = Date.now().toString(36) // fresh addresses on every run, so the check can be run again and again
const results = []
const check = (name, ok, detail = '') => {
  const line = `${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  [' + detail + ']' : ''}`
  results.push(line)
  console.error(line)
}
const clean = (s) => (s ?? '').replace(/\s+/g, ' ').trim()
const outbox = async () => (await (await fetch(API + '/api/test/outbox', { headers: { origin: ORIGIN } })).json()).outbox
const lastTo = async (email) => (await outbox()).filter((m) => m.to_email === email).at(-1)
const links = (html) => [...html.matchAll(/href="([^"]+)"/g)].map((m) => m[1].replace(/&amp;/g, '&'))
const text = (page) => page.evaluate(() => document.body.innerText.replace(/\s+/g, ' '))
const path = (page) => page.evaluate(() => location.pathname.replace(/^\/NADLANIL-DEMO(\/green)?/, '') + location.search)
const stateOf = (page) => page.evaluate(() => document.querySelector('[data-state]')?.dataset.state ?? null)
const fresh = async (vp) => {
  // a clean browser each time: a different person, or the same person on another device
  const ctx = await browser.createBrowserContext()
  const page = await ctx.newPage()
  await page.setViewport(vp)
  await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }])
  await page.goto(green + '/', { waitUntil: 'load' })
  await page.evaluate(() => localStorage.setItem('nadlanup-mode-v1', JSON.stringify({ mode: 'day', until: Date.now() + 9e9 })))
  return { ctx, page }
}
const fill = async (page, sel, value) => {
  await page.evaluate((s) => { const i = document.querySelector(s); i.focus(); i.select?.() }, sel)
  await page.keyboard.press('Backspace')
  await page.type(sel, value)
}

// a real finger scrolls first: the floating day/night button must not sit over what is being pressed
const tap = async (page, sel) => {
  await page.evaluate((x) => document.querySelector(x).scrollIntoView({ block: 'center' }), sel)
  await wait(150)
  await page.click(sel)
}

await fetch(API + '/api/test/outbox', { method: 'DELETE', headers: { origin: ORIGIN } })

for (const dev of [{ name: 'desktop', vp: { width: 1440, height: 900 } }, { name: 'phone', vp: { width: 390, height: 844, isMobile: true, hasTouch: true } }]) {
  const d = dev.name
  const phone = d === 'phone'
  const who = phone ? { name: 'נועה ברק', email: `noa-${run}@test.local` } : { name: 'דנה כהן', email: `dana-${run}@test.local` }
  await fetch(API + '/api/test/rate', { method: 'DELETE', headers: { origin: ORIGIN } })
  const { ctx, page } = await fresh(dev.vp)
  const errors = []
  page.on('pageerror', (e) => errors.push(String(e)))
  const shot = async (name) => {
    await wait(350)
    await page.screenshot({ path: `${out}/${d}-${name}.png` })
  }

  // ---------------------------------------------------------------- 1. the door is closed
  await page.goto(green + '/app/community', { waitUntil: 'load' })
  await wait(1200)
  check(`${d} a visitor cannot open the community: a locked page, with the way to sign up`, (await stateOf(page)) === 'locked' && !(await page.evaluate(() => !!document.querySelector('.fbx-page, .shell'))) && (await text(page)).includes('הקהילה פתוחה למתווכים שאושרו'))
  await shot('1-locked')
  await page.goto(green + '/app/crm', { waitUntil: 'load' })
  await wait(900)
  check(`${d} ... every screen inside is closed the same way`, (await stateOf(page)) === 'locked')
  await page.goto(green + '/kehila', { waitUntil: 'load' })
  await wait(1200)
  check(`${d} "כניסה לחברים" on the community's page leads to signing in, not inside`, await page.evaluate(() => [...document.querySelectorAll('.kh-cta a')].some((a) => a.textContent.includes('כניסה לחברים') && a.pathname.endsWith('/kehila/login'))))

  // ---------------------------------------------------------------- 2. the form: every field is required
  await page.goto(green + '/kehila/join', { waitUntil: 'load' })
  await wait(1200)
  const labels = await page.evaluate(() => [...document.querySelectorAll('.au-field > span, .au-field > legend')].map((x) => x.textContent.replace('*', '').replace(/\s+/g, ' ').trim()))
  check(`${d} the form asks for: name, phone, e-mail, licence number, office or independent, cities, and neighbourhoods marked optional`, ['שם מלא', 'טלפון', 'מייל', 'מספר רישיון תיווך', 'עובדים במשרד או עצמאים?', 'ערים שאתם עובדים בהן', 'שכונות ואזורים רשות'].every((l) => labels.includes(l)), labels.join(' | '))
  await tap(page, '[data-act="register"]')
  await wait(500)
  let errs = await page.evaluate(() => ({ n: document.querySelectorAll('.au-err').length, focus: document.activeElement?.dataset.f, sent: !!document.querySelector('[data-state="waiting"]'), city: !!document.querySelector('#err-cities'), areas: !!document.querySelector('#err-areas'), areasRequired: document.querySelector('[data-f="areas"]').required }))
  check(`${d} an empty form is not sent: an error under each required field, and the first one gets the cursor`, errs.n === 6 && errs.focus === 'name' && !errs.sent, JSON.stringify(errs))
  check(`${d} the city is required, the neighbourhoods are not (Itzik 18.11.2026)`, errs.city && !errs.areas && !errs.areasRequired, JSON.stringify(errs))
  await shot('2-form-errors')
  await fill(page, '[data-f="name"]', who.name)
  await fill(page, '[data-f="phone"]', '052-555-0142')
  await fill(page, '[data-f="email"]', who.email)
  await fill(page, '[data-f="license"]', '3141592')
  await tap(page, '[data-v="office"]')
  await tap(page, '[data-act="register"]')
  await wait(400)
  check(`${d} "במשרד" asks for the office's name too`, await page.evaluate(() => !!document.querySelector('#err-office_name') && !document.querySelector('[data-state="waiting"]')))
  await fill(page, '[data-f="office_name"]', 'כהן נכסים')
  await page.evaluate(() => document.querySelector('[data-city="רמת גן"]')?.click())
  await fill(page, '[data-f="other-city"]', 'ראש העין')
  await page.keyboard.press('Enter')
  await fill(page, '[data-f="areas"]', 'כפר גנים, אם המושבות')
  await wait(300)
  const picked = await page.evaluate(() => [...document.querySelectorAll('.au-cities button.is-on')].map((b) => b.textContent.trim()))
  check(`${d} cities: from the list, and one written by hand`, picked.join() === 'רמת גן,ראש העין', picked.join())
  check(`${d} nothing scrolls sideways in the form`, (await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)) <= 1)
  await page.evaluate(() => window.scrollTo(0, 0))
  await shot('3-form-filled')

  // ---------------------------------------------------------------- 3. after sending: the waiting screen
  await tap(page, '[data-act="register"]')
  await page.waitForSelector('[data-state="waiting"]', { timeout: 15000 })
  let t = await text(page)
  check(`${d} after sending: "היי ${who.name}, קיבלנו את הפרטים שלך ואנחנו בודקים אותם. אחרי אישור תקבל מייל עם אישור כניסה."`, t.includes(`היי ${who.name}, קיבלנו את הפרטים שלך ואנחנו בודקים אותם`) && t.includes('אחרי אישור תקבל מייל עם אישור כניסה.'), t.slice(0, 200))
  await shot('4-waiting')
  await page.reload({ waitUntil: 'load' })
  await wait(1000)
  check(`${d} the waiting screen is still there after a reload`, (await stateOf(page)) === 'waiting')
  await page.goto(green + '/app/community', { waitUntil: 'load' })
  await wait(1000)
  check(`${d} until he is approved he cannot enter`, (await stateOf(page)) === 'locked')
  await page.goto(green + '/kehila/login', { waitUntil: 'load' })
  await wait(900)
  await fill(page, '[data-f="email"]', who.email)
  await tap(page, '[data-act="login"]')
  await page.waitForSelector('[data-state="sent"]', { timeout: 15000 })
  check(`${d} ... and asking for a sign-in link sends him nothing yet`, !(await lastTo(who.email)))

  // ---------------------------------------------------------------- 4. the approver says yes, from the e-mail
  const ask = (await outbox()).filter((m) => m.to_email === 'ofek@test.local' && m.subject.includes(who.name)).at(-1)
  check(`${d} the approver got the e-mail with the broker's details`, !!ask && ask.html.includes('כהן נכסים') && ask.html.includes('רמת גן, ראש העין') && ask.html.includes('3141592'))
  const approver = await browser.newPage()
  await approver.setViewport(dev.vp)
  await approver.goto(links(ask.html).find((l) => l.includes('a=yes')), { waitUntil: 'load' })
  await approver.waitForFunction(() => document.body.innerText.includes('אושר'), { timeout: 15000 })
  check(`${d} one click on "כן, לאשר" approves`, (await approver.evaluate(() => document.body.innerText)).includes(`${who.name} אושר`))
  await approver.screenshot({ path: `${out}/${d}-5-approved-page.png` })
  await approver.goto(links((await outbox()).filter((m) => m.to_email === 'ariel@test.local' && m.subject.includes(who.name)).at(-1).html).find((l) => l.includes('a=no')), { waitUntil: 'load' })
  await wait(600)
  check(`${d} the other approver's buttons then say "הבקשה כבר טופלה"`, (await approver.evaluate(() => document.body.innerText)).includes('הבקשה כבר טופלה'))
  await approver.close()

  // ---------------------------------------------------------------- 5. the welcome e-mail lets him in, as himself
  const welcome = await lastTo(who.email)
  const enter = links(welcome.html).find((l) => l.includes('/kehila/enter?t='))
  check(`${d} the broker got "ברוכים הבאים" with an entry button`, welcome.subject.includes('ברוכים הבאים') && !!enter)
  await page.goto(enter, { waitUntil: 'load' })
  await page.waitForFunction(() => location.pathname.endsWith('/app/community'), { timeout: 20000 })
  await wait(2200)
  t = await text(page)
  const inside = await page.evaluate(() => ({
    feed: !!document.querySelector('.fbx-page'),
    // 19.11.2026: the name with "יציאה" is in the menu that the broker's picture opens; the picture carries the name
    chip: ([...document.querySelectorAll('[data-act="open-profile"]')].find((e) => e.getBoundingClientRect().width > 0)?.getAttribute('aria-label') ?? '').replace(/^החשבון של /, '') || null,
    demoSwitch: !!document.querySelector('.ms'),
    resetTab: !!document.querySelector('.dreset'),
    me: document.querySelector('.me-card .me-body strong')?.textContent.trim() ?? document.querySelector('.side-user strong')?.textContent.trim() ?? null,
    avatar: (document.querySelector('.side-user img, .me-card img, .composer-row img')?.getAttribute('src') ?? '').slice(0, 18),
  }))
  check(`${d} the entry button signs him in and lands in the feed`, inside.feed && (await path(page)) === '/app/community')
  check(`${d} the app is his: his name, his initials, and no trace of the example user`, (phone || inside.chip === who.name) && inside.me === who.name && inside.avatar.startsWith('data:image/svg') && !t.includes('מאיה לנדאו'), JSON.stringify(inside))
  check(`${d} a real broker has no demo switch and no "start again" tab`, !inside.demoSwitch && !inside.resetTab)
  await shot('6-inside-as-member')

  // ---------------------------------------------------------------- 6. the bug: what he uploads is his, in his own area
  await page.goto(green + '/app/crm', { waitUntil: 'load' })
  await wait(1500)
  check(`${d} his clients list starts empty (not the example user's clients)`, await page.evaluate(() => document.querySelectorAll('.ct-table tbody tr').length === 0 && !document.body.innerText.includes('רון ומיכל')))
  await page.goto(green + '/app/crm?v=properties', { waitUntil: 'load' })
  await wait(1500)
  check(`${d} his properties board starts empty (not the example user's properties)`, await page.evaluate(() => document.querySelectorAll('.kan-card').length === 0))
  await page.evaluate(() => document.querySelector('[data-act="new-card"]')?.click())
  await wait(800)
  // a property needs its kind since 22.11.2026: "מגורים", then "דירה"
  await page.evaluate(() => document.querySelector('.ga [data-cat="home"]')?.click())
  await wait(500)
  await page.evaluate(() => document.querySelector('.ga .pf-kind[data-kind="דירה"]')?.click())
  await wait(200)
  // "עמלת שת"פ" is a must since 22.11.2026: its "+" picks 0.5% (post-form-check walks the slider itself)
  await page.evaluate(() => document.querySelector('[data-slider="coop"] [data-step="more"]')?.click())
  await wait(200)
  await page.evaluate(() => [...document.querySelectorAll('.ga-go')].find((x) => x.textContent.includes('הוספה ל-CRM')).click())
  await wait(1600)
  const mine = await page.evaluate(() => ({ cards: [...document.querySelectorAll('.kan-card h3')].map((h) => h.textContent.trim()), published: document.body.innerText.includes('פורסם בקהילה') }))
  check(`${d} a property he uploads lands on his own board`, mine.cards.length === 1 && mine.cards[0].includes('פתח תקווה') && mine.published, JSON.stringify(mine))
  await shot('7-his-property')
  await page.goto(green + '/app/community?topic=coop', { waitUntil: 'load' })
  await wait(2000)
  const post = await page.evaluate(() => {
    const p = [...document.querySelectorAll('.fb.ci')].find((c) => c.querySelector('.ci-mine'))
    return { there: !!p, author: p?.querySelector('.fb-name strong')?.textContent.trim() ?? null, all: document.body.innerText.includes('מאיה לנדאו') }
  })
  check(`${d} ... and in the community it is published under his name, not the example user's`, post.there && post.author === who.name && !post.all, JSON.stringify(post))
  await shot('8-his-post')

  // ---------------------------------------------------------------- 7. out, and in again with a new link
  await page.goto(green + '/app/community', { waitUntil: 'load' })
  await wait(1500)
  // the way out: the picture in the top bar, then "יציאה" at the foot of its menu
  await page.evaluate(() => [...document.querySelectorAll('[data-act="open-profile"]')].find((e) => e.getBoundingClientRect().width > 0)?.click())
  await page.waitForSelector('[data-profile-menu] [data-act="sign-out"]', { visible: true, timeout: 5000 })
  await wait(400)
  await page.evaluate(() => document.querySelector('[data-profile-menu] [data-act="sign-out"]').click())
  await page.waitForFunction(() => location.pathname.endsWith('/kehila'), { timeout: 15000 })
  await page.goto(green + '/app/community', { waitUntil: 'load' })
  await wait(1000)
  check(`${d} after signing out the door is closed again`, (await stateOf(page)) === 'locked')
  await page.goto(enter, { waitUntil: 'load' })
  await page.waitForSelector('[data-state="enter-failed"]', { timeout: 15000 })
  check(`${d} the old entry button does not work a second time`, (await text(page)).includes('כבר שימש'))
  await page.goto(green + '/kehila/login', { waitUntil: 'load' })
  await wait(900)
  await fill(page, '[data-f="email"]', who.email)
  await tap(page, '[data-act="login"]')
  await page.waitForSelector('[data-state="sent"]', { timeout: 15000 })
  await shot('9-login-sent')
  const again = await lastTo(who.email)
  await page.goto(links(again.html).find((l) => l.includes('/kehila/enter?t=')), { waitUntil: 'load' })
  await page.waitForFunction(() => location.pathname.endsWith('/app/community'), { timeout: 20000 })
  await page.goto(green + '/app/crm?v=properties', { waitUntil: 'load' })
  await wait(1500)
  check(`${d} a new sign-in link brings him back, and his property is still there`, /^\d{6} הוא קוד הכניסה שלך$/.test(again.subject) && (await page.evaluate(() => document.querySelectorAll('.kan-card').length)) === 1)

  // ---------------------------------------------------------------- 8. the demo link keeps the example user apart
  await page.goto(green + '/demo', { waitUntil: 'load' })
  await page.waitForFunction(() => location.pathname.endsWith('/app/community') || location.pathname.endsWith('/app'), { timeout: 20000 })
  await wait(2000)
  // 16.11.2026: inside, the community looks live: no switch and no "start again" tab; the way to the office member's
  // view is in the small demo line at the foot of the page
  const demoView = await page.evaluate(() => ({ foot: !!document.querySelector('[data-foot] [data-v="office"]'), maya: document.body.innerText.includes('מאיה לנדאו'), sw: !!document.querySelector('.ms'), reset: !!document.querySelector('.dreset') }))
  check(`${d} the demo link opens the open demo: the example user, and the office member's view from the line at the foot`, demoView.foot && demoView.maya && !demoView.sw && !demoView.reset, JSON.stringify(demoView))
  await page.goto(green + '/app/crm?v=properties', { waitUntil: 'load' })
  await wait(1500)
  check(`${d} ... with the example user's own properties, and without the broker's`, await page.evaluate(() => document.querySelectorAll('.kan-card').length >= 6 && !document.body.innerText.includes(' בפתח תקווה') ))
  if (!phone) await shot('10-demo-mode')
  await ctx.close()

  // ---------------------------------------------------------------- 9. no: a reason, a polite e-mail, and no entry
  const other = phone ? { name: 'אבי מור', email: `avi-${run}@test.local` } : { name: 'יוסי לוי', email: `yossi-${run}@test.local` }
  const b = await fresh(dev.vp)
  await b.page.goto(green + '/kehila/join', { waitUntil: 'load' })
  await wait(1000)
  await fill(b.page, '[data-f="name"]', other.name)
  await fill(b.page, '[data-f="phone"]', '050-555-0177')
  await fill(b.page, '[data-f="email"]', other.email)
  await fill(b.page, '[data-f="license"]', '2718281')
  await tap(b.page, '[data-v="solo"]')
  await b.page.evaluate(() => document.querySelector('[data-city="נתניה"]')?.click())
  await fill(b.page, '[data-f="areas"]', 'קריית שרת')
  await tap(b.page, '[data-act="register"]')
  await b.page.waitForSelector('[data-state="waiting"]', { timeout: 15000 }).catch(async (e) => {
    console.error('second sign-up stuck:', await b.page.evaluate(() => [...document.querySelectorAll('.au-err, .au-fail, [role="alert"]')].map((x) => x.textContent).join(' | ')))
    throw e
  })
  const ask2 = (await outbox()).filter((m) => m.to_email === 'ofek@test.local' && m.subject.includes(other.name)).at(-1)
  const no = await browser.newPage()
  await no.setViewport(dev.vp)
  await no.goto(links(ask2.html).find((l) => l.includes('a=no')), { waitUntil: 'load' })
  await wait(700)
  check(`${d} "לא" opens a small page for a short reason`, await no.evaluate(() => !!document.querySelector('textarea#reason')))
  await no.screenshot({ path: `${out}/${d}-11-reject-reason.png` })
  await no.type('#reason', 'לא הצלחנו לאמת את מספר הרישיון.')
  await Promise.all([no.waitForNavigation({ waitUntil: 'load' }), no.click('button[type="submit"]')])
  check(`${d} the request is rejected`, (await no.evaluate(() => document.body.innerText)).includes('הבקשה נדחתה'))
  await no.close()
  const sorry = await lastTo(other.email)
  check(`${d} the broker gets a polite e-mail with the reason`, !!sorry && sorry.html.includes('לא הצלחנו לאמת את מספר הרישיון.') && sorry.html.includes('תודה שביקשת להצטרף'))
  await b.page.goto(green + '/app/community', { waitUntil: 'load' })
  await wait(1000)
  check(`${d} ... and he stays outside`, (await stateOf(b.page)) === 'locked')

  // the rejection e-mail's "להרשמה מחדש": on the same device, which still remembers the waiting screen
  const againLink = links(sorry.html).find((l) => l.includes('/kehila/join?again=1'))
  check(`${d} the rejection e-mail has a "להרשמה מחדש" button`, !!againLink && sorry.html.includes('>להרשמה מחדש</a>'))
  await b.page.goto(againLink, { waitUntil: 'load' })
  await wait(1000)
  const reForm = await b.page.evaluate(() => ({
    form: !!document.querySelector('form.au-card [data-act="register"]'),
    waiting: !!document.querySelector('[data-state="waiting"]'),
    name: document.querySelector('[data-f="name"]')?.value,
    email: document.querySelector('[data-f="email"]')?.value,
  }))
  check(`${d} it opens the form, not the old waiting screen, with his name and address filled in`, reForm.form && !reForm.waiting && reForm.name === other.name && reForm.email === other.email, JSON.stringify(reForm))
  await wait(350)
  await b.page.screenshot({ path: `${out}/${d}-11b-sign-up-again.png` })
  await fetch(API + '/api/test/rate', { method: 'DELETE', headers: { origin: ORIGIN } })
  await fill(b.page, '[data-f="phone"]', '050-555-0177')
  await fill(b.page, '[data-f="license"]', '2718281')
  await tap(b.page, '[data-v="solo"]')
  await b.page.evaluate(() => document.querySelector('[data-city="נתניה"]')?.click())
  await fill(b.page, '[data-f="areas"]', 'קריית שרת')
  await tap(b.page, '[data-act="register"]')
  await b.page.waitForSelector('[data-state="waiting"]', { timeout: 15000 })
  const asks = (await outbox()).filter((m) => m.to_email === 'ofek@test.local' && m.subject.includes(other.name))
  check(`${d} he signs up again with the same address: back to waiting, and the approvers are asked again`, asks.length === 2 && (await stateOf(b.page)) === 'waiting')
  // the new request is decided like any other (rejected again, so the approvers' screen below still has one)
  const no3 = await browser.newPage()
  await no3.goto(links(asks.at(-1).html).find((l) => l.includes('a=no')), { waitUntil: 'load' })
  await no3.waitForSelector('textarea#reason', { timeout: 10000 })
  await no3.type('#reason', 'לא הצלחנו לאמת את מספר הרישיון.')
  await Promise.all([no3.waitForNavigation({ waitUntil: 'load' }), no3.click('button[type="submit"]')])
  check(`${d} the new request can be decided again`, (await no3.evaluate(() => document.body.innerText)).includes('הבקשה נדחתה'))
  await no3.close()
  await b.ctx.close()

  check(`${d} no page errors`, errors.length === 0, errors.slice(0, 2).join(' | '))
}

// ---------------------------------------------------------------- 10. the approvers' screen (desktop and phone)
for (const dev of [{ name: 'desktop', vp: { width: 1440, height: 900 } }, { name: 'phone', vp: { width: 390, height: 844, isMobile: true, hasTouch: true } }]) {
  const d = dev.name
  await fetch(API + '/api/test/rate', { method: 'DELETE', headers: { origin: ORIGIN } })
  const { ctx, page } = await fresh(dev.vp)
  await page.goto(green + '/kehila/admin', { waitUntil: 'load' })
  await wait(900)
  check(`${d} the approvers' screen is closed to a visitor, and shows nothing`, (await stateOf(page)) === 'admin-locked' && !(await text(page)).includes(`dana-${run}@test.local`))
  await page.goto(green + '/kehila/login', { waitUntil: 'load' })
  await wait(900)
  await fill(page, '[data-f="email"]', 'itzik@test.local')
  await tap(page, '[data-act="login"]')
  await page.waitForSelector('[data-state="sent"]', { timeout: 15000 })
  await page.goto(links((await lastTo('itzik@test.local')).html).find((l) => l.includes('/kehila/enter?t=')), { waitUntil: 'load' })
  await page.waitForFunction(() => location.pathname.endsWith('/kehila/admin'), { timeout: 20000 })
  // the screen opens on its overview; the requests are in their own tab
  const view = async (v) => {
    await page.waitForSelector(`[data-view="${v}"]`, { timeout: 15000 })
    await page.evaluate((x) => document.querySelector(`[data-view="${x}"]`).click(), v)
    await page.waitForFunction((x) => document.querySelector('[data-view-shown]')?.dataset.viewShown === x, { timeout: 5000 }, v)
    await wait(300)
  }
  await view('requests')
  await page.waitForSelector('.ad-tabs', { timeout: 15000 })
  await wait(1200)
  const tabs = async () => page.evaluate(() => Object.fromEntries([...document.querySelectorAll('.ad-tabs button')].map((b) => [b.dataset.tab, Number(b.querySelector('b').textContent)])))
  let n = await tabs()
  check(`${d} staff sign in with a link and see the requests by status`, n.approved >= 1 && n.rejected >= 1, JSON.stringify(n))
  await page.evaluate(() => document.querySelector('[data-tab="approved"]').click())
  await wait(400)
  check(`${d} an approved request shows its details and who approved it`, await page.evaluate(() => [...document.querySelectorAll('.ad-row')].some((r) => r.textContent.includes('3141592') && r.textContent.includes('על ידי אופק'))))
  await page.evaluate(() => document.querySelector('[data-tab="rejected"]').click())
  await wait(400)
  check(`${d} a rejected request shows its reason`, (await text(page)).includes('לא הצלחנו לאמת את מספר הרישיון.'))
  await page.screenshot({ path: `${out}/${d}-12-admin-rejected.png` })

  // a test registrant, all the way through from this screen
  const tester = `tester-${d}-${run}@test.local`
  await view('tools')
  await fill(page, '[data-f="test-name"]', 'בדיקה של איציק')
  await fill(page, '[data-f="test-email"]', tester)
  await page.evaluate(() => document.querySelector('[data-act="make-test"]').scrollIntoView({ block: 'center' }))
  await tap(page, '[data-act="make-test"]')
  await page.waitForFunction(() => document.querySelector('.ad-note')?.textContent.includes('נרשם הבדיקה נוצר'), { timeout: 15000 })
  await wait(700)
  await view('requests')
  n = await tabs()
  const testAsk = await lastTo('itzik@test.local')
  check(`${d} "נרשם בדיקה" creates a waiting request, and its approval e-mail goes only to whoever made it`, n.pending >= 1 && testAsk.subject.startsWith('(בדיקה)') && !(await outbox()).some((m) => m.to_email === 'ofek@test.local' && m.subject.includes('בדיקה של איציק')), JSON.stringify(n))
  await page.evaluate(() => window.scrollTo(0, 0))
  await wait(300)
  await page.screenshot({ path: `${out}/${d}-13-admin-pending.png` })
  await page.evaluate(() => [...document.querySelectorAll('.ad-row')].find((r) => r.textContent.includes('בדיקה של איציק')).querySelector('[data-act="approve"]').click())
  await page.waitForFunction(() => document.querySelector('.ad-note')?.textContent.includes('אושר'), { timeout: 15000 })
  check(`${d} a request can be approved from the screen, and the welcome e-mail goes out`, (await lastTo(tester)).subject.includes('ברוכים הבאים'))

  // and a rejection from the screen
  await view('tools')
  await fill(page, '[data-f="test-name"]', 'בדיקת דחייה')
  await fill(page, '[data-f="test-email"]', 'r-' + tester)
  await tap(page, '[data-act="make-test"]')
  await page.waitForFunction(() => document.querySelector('.ad-note')?.textContent.includes('נרשם הבדיקה נוצר'), { timeout: 15000 })
  await wait(600)
  await view('requests')
  await page.evaluate(() => [...document.querySelectorAll('.ad-row')].find((r) => r.textContent.includes('בדיקת דחייה')).querySelector('[data-act="reject"]').click())
  await wait(600)
  await page.type('[data-f="reason"]', 'בדיקה של מסלול הדחייה.')
  await wait(200)
  check(`${d} typing the reason keeps the cursor in the box`, await page.evaluate(() => document.activeElement?.dataset.f === 'reason' && document.activeElement.value === 'בדיקה של מסלול הדחייה.'))
  await page.screenshot({ path: `${out}/${d}-14-admin-reject.png` })
  await tap(page, '[data-act="confirm-reject"]')
  await page.waitForFunction(() => document.querySelector('.ad-note')?.textContent.includes('נדחתה'), { timeout: 15000 })
  check(`${d} a request can be rejected from the screen, with a reason, and the polite e-mail goes out`, (await lastTo('r-' + tester)).html.includes('בדיקה של מסלול הדחייה.'))

  // the list of approvers
  await view('tools')
  await fill(page, '[data-f="staff-name"]', 'רותי')
  await fill(page, '[data-f="staff-email"]', `ruti-${d}-${run}@test.local`)
  await tap(page, '[data-act="add-staff"]')
  await page.waitForFunction(() => document.querySelector('.ad-note')?.textContent.includes('נוסף לרשימת המאשרים'), { timeout: 15000 })
  const added = await page.waitForFunction((m) => document.querySelector('[data-box="staff"]')?.textContent.includes(m), { timeout: 8000 }, `ruti-${d}-${run}@test.local`).then(() => true, () => false)
  check(`${d} an approver can be added from the screen`, added)
  await page.evaluate(() => document.querySelector('[data-box="staff"]').scrollIntoView({ block: 'center' }))
  await wait(300)
  await page.screenshot({ path: `${out}/${d}-15-admin-staff.png` })
  await page.evaluate(() => [...document.querySelectorAll('.ad-team li')].find((li) => li.textContent.includes('ruti-'))?.querySelector('button')?.click())
  await wait(900)
  check(`${d} nothing scrolls sideways on the approvers' screen`, (await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)) <= 1)

  // a broker cannot open this screen
  await ctx.close()
}

const fails = results.filter((r) => r.startsWith('FAIL')).length
console.log(`\n${results.length - fails} passed, ${fails} failed`)
console.log(fails ? 'SOME CHECKS FAILED' : 'ALL CHECKS PASSED')
await Promise.race([browser.close().catch(() => {}), wait(4000)])
process.exit(0)
