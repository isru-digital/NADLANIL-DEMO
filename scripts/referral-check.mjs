// "שלח ללקוח בוואטסאפ" and "העבר למתווך בקהילה" (24.11.2026): a property goes to a buyer of the CRM through the broker's
// own WhatsApp (a wa.me link with a ready message, nothing sent by the site), and a buyer or a renter goes to a broker
// of the community who works in that city, for 25% or 50%. Checks: the message carries the city, the neighbourhood,
// the rooms, the price and a link, and never the owner's name or phone or the flat's number; the offer carries no
// client name or phone until the other broker says yes; the summary and the note are there on both sides; "+ לקוח חדש"
// opens the CRM's form and comes back to the open window with the new client picked; the buyer's page opens from the link.
// Usage: node scripts/referral-check.mjs [outDir]     (BASE_GREEN overrides the address; ONLY=phone for one device)
import puppeteer from 'puppeteer-core'
import { mkdirSync } from 'node:fs'

const green = process.env.BASE_GREEN ?? 'http://localhost:5240/NADLANIL-DEMO/green'
const out = process.argv[2] ?? '_shots/referral'
mkdirSync(out, { recursive: true })
const browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--hide-scrollbars'] })
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
const results = []
const check = (name, ok, detail = '') => {
  const line = `${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  [' + detail + ']' : ''}`
  results.push(line)
  if (!ok) console.error(line)
}
const NOTE = 'סיכום ההפניה אינו הסכם מחייב. מומלץ לחתום על הסכם שיתוף פעולה בכתב.'
const PHONE = /0\d{1,2}-?\d{3}-?\d{4}/
const devices = [
  { name: 'desktop', vp: { width: 1440, height: 900 } },
  { name: 'phone', vp: { width: 390, height: 844, isMobile: true, hasTouch: true } },
].filter((d) => !process.env.ONLY || d.name === process.env.ONLY)

for (const dev of devices) {
  const d = dev.name
  const page = await browser.newPage()
  await page.evaluateOnNewDocument(() => {
    try {
      localStorage.setItem('nadlanup-demo-v1', '1')
      localStorage.setItem('nadlanup-mode-v1', JSON.stringify({ mode: 'day', until: Date.now() + 9e9 }))
    } catch {}
    // the WhatsApp window is not opened: its address is kept for the check
    window.__opened = []
    window.open = (url) => {
      window.__opened.push(String(url))
      return null
    }
  })
  const errors = []
  page.on('pageerror', (e) => errors.push(String(e)))
  page.on('console', (m) => m.type() === 'error' && !/favicon|Failed to load resource/.test(m.text()) && errors.push(m.text()))
  await page.setViewport(dev.vp)
  await page.goto(green + '/', { waitUntil: 'load' })
  await page.evaluate(() => {
    const keep = ['nadlanup-demo-v1', 'nadlanup-mode-v1']
    Object.keys(localStorage).filter((k) => !keep.includes(k)).forEach((k) => localStorage.removeItem(k))
  })
  const click = async (sel) => {
    await page.waitForSelector(sel, { visible: true, timeout: 6000 })
    await page.evaluate((s) => {
      const el = document.querySelector(s)
      el.scrollIntoView({ block: 'center' })
      el.click()
    }, sel)
    await wait(450)
  }
  const shot = async (name) => {
    await wait(350)
    await page.screenshot({ path: `${out}/${d}-${name}.png` })
  }
  const overflow = () => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
  const sheetText = (sel) => page.evaluate((s) => document.querySelector(s)?.closest('.modal')?.innerText ?? '', sel)

  // ------------------------------------------------------------ an offer from another broker
  await page.goto(green + '/app/crm', { waitUntil: 'load' })
  await page.waitForSelector('[data-inbox]', { timeout: 8000 }).catch(() => {})
  await wait(800)
  let st = await page.evaluate(() => {
    const it = document.querySelector('[data-ref="rf-in-1"]')
    return {
      inbox: !!document.querySelector('[data-inbox]'),
      above: !!document.querySelector('[data-inbox]') && !!document.querySelector('.ct-wrap') && !!(document.querySelector('[data-inbox]').compareDocumentPosition(document.querySelector('.ct-wrap')) & Node.DOCUMENT_POSITION_FOLLOWING),
      status: it?.dataset.status,
      text: it?.innerText ?? '',
      title: it?.querySelector('.rf-card-title')?.textContent.trim(),
      facts: [...(it?.querySelectorAll('[data-fact]') ?? [])].map((x) => x.textContent.replace(/\s+/g, ' ').trim()),
      waiting: document.querySelector('[data-waiting]')?.dataset.waiting,
      accept: !!it?.querySelector('[data-act="accept-referral"]'),
      decline: !!it?.querySelector('[data-act="decline-referral"]'),
    }
  })
  check(`${d}: the referrals sit above the clients' table`, st.inbox && st.above)
  check(`${d}: an offer from another broker waits, "יש לי לקוח בעיר שלך", with a yes and a no`, st.status === 'pending' && st.title === 'יש לי לקוח בעיר שלך' && st.accept && st.decline && st.waiting === '1', JSON.stringify(st.title))
  check(`${d}: the offer says buyer, rooms, budget and neighbourhoods`, st.facts.length === 3 && st.facts[0].includes('קונה') && st.facts[0].includes('3 עד 4 חדרים') && st.facts[1].includes('תקציב') && st.facts[2].includes('לב העיר'), st.facts.join(' | '))
  check(`${d}: before a yes, no name and no phone of the client`, !st.text.includes('גלעד') && !PHONE.test(st.text) && st.text.includes('יוצגו אחרי שתאשרו'))
  check(`${d}: the note under the offer`, st.text.includes(NOTE))
  await shot('1-inbox')

  await click('[data-ref="rf-in-1"] [data-act="accept-referral"]')
  await wait(400)
  st = await page.evaluate(() => {
    const it = document.querySelector('[data-ref="rf-in-1"]')
    return {
      status: it?.dataset.status,
      name: it?.querySelector('[data-contact-name]')?.textContent.trim(),
      text: it?.innerText ?? '',
      sum: it?.querySelector('[data-summary]')?.innerText ?? '',
      row: [...document.querySelectorAll('.ct-table tbody tr')].some((tr) => tr.querySelector('.ct-name b')?.textContent.includes('גלעד ונטע')),
    }
  })
  check(`${d}: after a yes the name and the phone show`, st.status === 'accepted' && st.name === 'גלעד ונטע ר.' && st.text.includes('052-555-0161'), st.name)
  check(`${d}: the summary says the 25% and that both brokers got it`, st.sum.includes('סיכום ההפניה') && st.sum.includes('25%') && st.sum.includes('ענבל גולן') && st.sum.includes('לשני המתווכים'), st.sum.replace(/\s+/g, ' '))
  check(`${d}: the client entered my CRM`, st.row)
  await shot('2-accepted')

  // ------------------------------------------------------------ handing my client to another broker
  await click('.ct-table tr[data-id="k1"] .ct-name button')
  const referBtn = await page.evaluate(() => document.querySelector('[data-act="refer-client"]')?.textContent.trim() ?? '')
  check(`${d}: a buyer's window has "העבר למתווך בקהילה"`, referBtn.startsWith('העבר למתווך בקהילה'), referBtn)
  await click('[data-act="refer-client"]')
  await page.waitForSelector('[data-sheet="refer"]', { visible: true, timeout: 5000 }).catch(() => {})
  st = await page.evaluate(() => ({
    folded: document.querySelector('[data-sheet="refer"] [data-picker="folded"] .cp-row')?.dataset.id,
    city: document.querySelector('.rf-city.is-on')?.dataset.city,
    brokers: [...document.querySelectorAll('.rf-broker')].map((b) => b.dataset.broker),
    hoods: [...document.querySelectorAll('.rf-broker small')].map((x) => x.textContent.trim()),
  }))
  check(`${d}: the window opens on that client, in the client's city`, st.folded === 'k1' && st.city === 'תל אביב', `${st.folded} ${st.city}`)
  check(`${d}: the brokers who work in Tel Aviv, by the neighbourhoods of their profile, and not me`, st.brokers.join() === 'b15,b17' && st.hoods.every((h) => h.startsWith('שכונות עבודה:')), st.brokers.join())
  const few = await page.evaluate(() => ({ n: document.querySelectorAll('.rf-city[data-city]').length, more: !!document.querySelector('[data-act="more-cities"]') }))
  check(`${d}: a few cities first, the rest behind "עוד ערים"`, few.n <= 7 && few.more, JSON.stringify(few))
  await click('[data-act="more-cities"]')
  await click('.rf-city[data-city="פתח תקווה"]')
  st = await page.evaluate(() => [...document.querySelectorAll('.rf-broker')].map((b) => b.dataset.broker))
  check(`${d}: another city, other brokers`, st.join() === 'b12', st.join())
  await click('.rf-broker[data-broker="b12"]')
  const pcts = await page.evaluate(() => [...document.querySelectorAll('.rf-pct [data-pct]')].map((b) => b.dataset.pct + (b.getAttribute('aria-checked') === 'true' ? '*' : '')))
  check(`${d}: a referral fee of 25% or 50%, 25% to start`, pcts.join() === '25*,50', pcts.join())
  await click('.rf-pct [data-pct="50"]')
  st = await page.evaluate(() => {
    const card = document.querySelector('[data-sheet="refer"] [data-offer]')
    return { card: card?.innerText ?? '', pct: card?.querySelector('.rf-card-pct')?.textContent.trim(), note: document.querySelector('[data-sheet="refer"] [data-note="referral"]')?.textContent.trim() }
  })
  check(`${d}: the preview is the offer as the other broker sees it, with 50%`, st.card.includes('יש לי לקוח בעיר שלך') && st.card.includes('קונה') && st.card.includes('פתח תקווה') && st.pct?.includes('50%'), st.pct)
  check(`${d}: the offer has no name and no phone of the client`, !st.card.includes('רון') && !st.card.includes('מיכל') && !PHONE.test(st.card))
  check(`${d}: the note is in the window`, st.note === NOTE)
  check(`${d}: nothing scrolls sideways in the referral window`, (await overflow()) <= 1)
  await shot('3-refer')
  await click('[data-act="send-referral"]')
  st = await page.evaluate(() => ({ sent: document.querySelector('[data-sheet="refer-sent"]')?.dataset.status, title: document.querySelector('[data-sent-title]')?.textContent.trim() }))
  check(`${d}: sent, waiting for the other broker`, st.sent === 'pending' && st.title?.includes('ענבל גולן'), st.title)
  const stored = await page.evaluate(() => (JSON.parse(localStorage.getItem('nadlanup-referrals-v1') ?? '[]').find((r) => r.dir === 'out') ?? null))
  check(`${d}: what is kept of the offer has no name and no phone`, !!stored && !stored.contact && !JSON.stringify(stored).includes('רון') && !PHONE.test(JSON.stringify(stored)), JSON.stringify(stored))
  await shot('4-sent')
  await wait(5600)
  st = await page.evaluate(() => ({ sent: document.querySelector('[data-sheet="refer-sent"]')?.dataset.status, sum: document.querySelector('[data-sheet="refer-sent"] [data-summary]')?.innerText ?? '' }))
  const noToast = await page.evaluate(() => !document.querySelector('.toast')?.textContent.includes('אושרה'))
  check(`${d}: with the window open, the yes shows in it and not as a word on top`, noToast)
  check(`${d}: in the demo the other broker says yes, and the summary is there`, st.sent === 'accepted' && st.sum.includes('50%') && st.sum.includes('ענבל גולן') && st.sum.includes('יעברו אליך'), st.sum.replace(/\s+/g, ' '))
  await shot('5-agreed')
  await click('[data-act="refer-done"]')
  await wait(400)
  st = await page.evaluate(() => {
    const o = document.querySelector('[data-inbox] [data-dir="out"]')
    return { status: o?.dataset.status, text: o?.innerText ?? '' }
  })
  check(`${d}: my offer is in the referrals, agreed, with the summary`, st.status === 'accepted' && st.text.includes('50%') && st.text.includes('סיכום ההפניה'), st.text.replace(/\s+/g, ' ').slice(0, 120))

  // "+ לקוח חדש" inside the referral window
  await click('.ct-table tr[data-id="k3"] .ct-name button')
  await click('[data-act="refer-client"]')
  await click('[data-sheet="refer"] [data-act="change-client"]')
  await click('[data-sheet="refer"] [data-act="picker-new-client"]')
  st = await page.evaluate(() => ({ form: !!document.querySelector('[data-act="add-client"]'), sheet: !!document.querySelector('[data-sheet="refer"]') }))
  check(`${d}: "+ לקוח חדש" opens the client form in place of the window`, st.form && !st.sheet, JSON.stringify(st))
  await page.type('[data-f="name"]', 'לקוחה חדשה מהפניה')
  await page.type('[data-f="phone"]', '050-555-0177')
  await click('[data-act="add-client"]')
  await wait(500)
  st = await page.evaluate(() => {
    const r = document.querySelector('[data-sheet="refer"] [data-picker="folded"] .cp-row')
    return { sheet: !!document.querySelector('[data-sheet="refer"]'), name: r?.querySelector('b')?.textContent.trim() }
  })
  check(`${d}: and comes back to the referral window with the new client picked`, st.sheet && st.name === 'לקוחה חדשה מהפניה', JSON.stringify(st))
  await page.keyboard.press('Escape')
  await wait(500)

  // ------------------------------------------------------------ a property to a buyer, from the board
  await page.goto(green + '/app/crm?v=properties', { waitUntil: 'load' })
  await page.waitForSelector('.kan-card [data-act="send-to-buyer"]', { timeout: 8000 }).catch(() => {})
  await wait(600)
  const card = await page.evaluate(() => {
    const b = document.querySelector('.kan-card [data-act="send-to-buyer"]')
    const c = b?.closest('.kan-card')
    return { label: b?.textContent.trim(), count: document.querySelectorAll('.kan-card [data-act="send-to-buyer"]').length, cards: document.querySelectorAll('.kan-card').length, owner: c?.querySelector('.kan-client span')?.textContent.trim(), address: c?.querySelector('.kan-address span')?.textContent.trim() ?? '', area: c?.querySelector('.kan-meta span')?.textContent.trim() }
  })
  check(`${d}: every property card has "שלח ללקוח בוואטסאפ"`, card.label === 'שלח ללקוח בוואטסאפ' && card.count === card.cards && card.count > 0, `${card.count}/${card.cards}`)
  await click('.kan-card [data-act="send-to-buyer"]')
  await page.waitForSelector('[data-sheet="send-buyer"]', { visible: true, timeout: 5000 }).catch(() => {})
  st = await page.evaluate(() => ({
    open: document.querySelector('[data-sheet="send-buyer"] [data-picker]')?.dataset.picker,
    first: document.querySelector('[data-sheet="send-buyer"] .cp-row')?.dataset.act,
    rows: [...document.querySelectorAll('[data-sheet="send-buyer"] .cp-row[role="radio"]')].length,
    btn: document.querySelector('[data-act="open-whatsapp"]')?.disabled,
  }))
  check(`${d}: the window opens on the list of buyers, "+ לקוח חדש" first, and the button waits`, st.open === 'open' && st.first === 'picker-new-client' && st.rows >= 4 && st.btn === true, JSON.stringify(st))
  await shot('6-pick-buyer')
  await click('[data-sheet="send-buyer"] .cp-row[data-id="k1"]')
  const msg = await page.evaluate(() => document.querySelector('[data-f="wa-text"]')?.value ?? '')
  check(`${d}: the message has the city, the rooms, the price and a link to the property`, msg.includes('מיקום:') && msg.includes(card.area.split(',')[0].trim()) && /\d+(\.\d)? חדרים|מ"ר/.test(msg) && msg.includes('מחיר:') && msg.includes('/n/p?'), msg.replace(/\n/g, ' / '))
  check(`${d}: the message greets the buyer by first name`, msg.startsWith('היי רון,'), msg.split('\n')[0])
  check(`${d}: no owner's name, no phone and no flat number in the message`, !msg.includes(card.owner) && !PHONE.test(msg) && !/דירה \d/.test(msg) && (!card.address || !msg.includes(card.address)), card.owner)
  check(`${d}: nothing scrolls sideways in the WhatsApp window`, (await overflow()) <= 1)
  await shot('7-message')
  await click('[data-act="open-whatsapp"]')
  const opened = await page.evaluate(() => window.__opened.at(-1) ?? '')
  const text = decodeURIComponent(opened.split('?text=')[1] ?? '')
  check(`${d}: the broker's own WhatsApp opens on the buyer's chat with the message`, opened.startsWith('https://wa.me/972505550101?text=') && text === msg, opened.slice(0, 50))
  const toastText = await page.evaluate(() => document.querySelector('.toast')?.textContent.trim() ?? '')
  check(`${d}: it says the broker sends it`, toastText.includes('שולחים בעצמכם'), toastText)

  // "+ לקוח חדש" inside the WhatsApp window
  await click('.kan-card [data-act="send-to-buyer"]')
  await click('[data-sheet="send-buyer"] [data-act="picker-new-client"]')
  await page.type('[data-f="name"]', 'קונה חדש מהנכס')
  await page.type('[data-f="phone"]', '050-555-0188')
  await click('[data-act="add-client"]')
  await wait(500)
  st = await page.evaluate(() => ({ name: document.querySelector('[data-sheet="send-buyer"] [data-picker="folded"] b')?.textContent.trim(), msg: document.querySelector('[data-f="wa-text"]')?.value ?? '' }))
  check(`${d}: "+ לקוח חדש" comes back to the WhatsApp window with the new buyer picked`, st.name === 'קונה חדש מהנכס' && st.msg.startsWith('היי קונה,'), JSON.stringify(st.name))
  await page.keyboard.press('Escape')
  await wait(500)

  // ------------------------------------------------------------ from a match
  await page.goto(green + '/app/crm', { waitUntil: 'load' })
  await page.waitForSelector('.ct-table tr[data-id="k1"] [data-act="match"]', { timeout: 8000 }).catch(() => {})
  await click('.ct-table tr[data-id="k1"] [data-act="match"]')
  const fromMatch = await page.evaluate(() => [...document.querySelectorAll('.ct-matches [data-act="send-to-buyer"]')].length)
  check(`${d}: each property of a match has "שלח ללקוח בוואטסאפ"`, fromMatch > 0, String(fromMatch))
  await click('.ct-matches [data-act="send-to-buyer"]')
  st = await page.evaluate(() => ({ folded: document.querySelector('[data-sheet="send-buyer"] [data-picker="folded"] .cp-row')?.dataset.id, msg: document.querySelector('[data-f="wa-text"]')?.value ?? '' }))
  check(`${d}: from a match, the window opens on that buyer with the message ready`, st.folded === 'k1' && st.msg.includes('תל אביב'), st.folded)
  await page.keyboard.press('Escape')
  await wait(500)

  // ------------------------------------------------------------ the buyer's page
  const link = msg.match(/https?:\/\/\S+/)?.[0]
  await page.goto(link, { waitUntil: 'load' })
  await wait(900)
  st = await page.evaluate(() => ({ page: !!document.querySelector('[data-page="buyer"]'), title: document.querySelector('[data-buyer-title]')?.textContent.trim(), text: document.body.innerText }))
  check(`${d}: the link opens the property's page for the buyer`, st.page && !!st.title, st.title)
  check(`${d}: the buyer's page has no owner's name, phone or flat number`, !st.text.includes(card.owner) && !PHONE.test(st.text) && !/דירה \d/.test(st.text))
  check(`${d}: nothing scrolls sideways on the buyer's page`, (await overflow()) <= 1)
  await shot('8-buyer-page')

  // ------------------------------------------------------------ the feed stays clean
  await page.goto(green + '/app/community', { waitUntil: 'load' })
  await wait(1500)
  const feed = await page.evaluate(() => document.body.innerText)
  check(`${d}: no client's name or phone in the feed`, !['רון ומיכל', 'גלעד ונטע', 'לקוחה חדשה מהפניה', '555-0101', '555-0161'].some((w) => feed.includes(w)))

  check(`${d}: no errors on the page`, errors.length === 0, errors.slice(0, 2).join(' | '))
  await page.close()
}

await browser.close()
const failed = results.filter((l) => l.startsWith('FAIL'))
console.log(results.join('\n'))
console.log(`\n${results.length - failed.length} pass, ${failed.length} fail`)
console.log(failed.length ? 'SOME CHECKS FAILED' : 'ALL CHECKS PASSED')
process.exit(failed.length ? 1 : 0)
