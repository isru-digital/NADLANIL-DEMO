// "שלח ללקוח בוואטסאפ" and "העבר למתווך בקהילה" (24.11.2026): a property goes to a buyer of the CRM through the broker's
// own WhatsApp (a wa.me link with a ready message, nothing sent by the site), and a buyer or a renter goes to a broker
// of the community who works in that city, for 25% or 50%. Checks: the message carries the city, the neighbourhood,
// the rooms, the price and a link, and never the owner's name or phone or the flat's number; the offer carries no
// client name or phone; "מעוניין, בוא נדבר" opens a chat with a ready message and "המשך בוואטסאפ" (wa.me to the referring
// broker), and the client's name and phone show nowhere until the referring broker taps "שלח את פרטי הלקוח" and answers
// "לשלוח?" (25.11.2026); the summary and the note come only after both agreed, and the statuses show on both sides; "+ לקוח חדש"
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

  // ------------------------------------------------------------ an offer from another broker (25.11.2026: a chat)
  // what must never show before ענבל, the referring broker, sends the details: the client's name and phone
  const CLIENT_IN = ['גלעד', '052-555-0161', '0525550161']
  const leaks = () => page.evaluate((words) => {
    const t = document.body.innerText
    const hrefs = [...document.querySelectorAll('a[href]')].map((a) => a.getAttribute('href')).join(' ')
    return words.filter((w) => t.includes(w) || hrefs.includes(w.replace(/-/g, '')))
  }, CLIENT_IN)
  await page.goto(green + '/app/crm', { waitUntil: 'load' })
  await page.waitForSelector('[data-inbox]', { timeout: 8000 }).catch(() => {})
  await wait(800)
  let st = await page.evaluate(() => {
    const it = document.querySelector('[data-ref="rf-in-1"]')
    return {
      inbox: !!document.querySelector('[data-inbox]'),
      head: document.querySelector('[data-inbox] .rfi-head h2')?.textContent.trim(),
      above: !!document.querySelector('[data-inbox]') && !!document.querySelector('.ct-wrap') && !!(document.querySelector('[data-inbox]').compareDocumentPosition(document.querySelector('.ct-wrap')) & Node.DOCUMENT_POSITION_FOLLOWING),
      status: it?.dataset.status,
      pill: it?.querySelector('[data-ref-status]')?.textContent.trim(),
      text: it?.innerText ?? '',
      title: it?.querySelector('.rf-card-title')?.textContent.trim(),
      facts: [...(it?.querySelectorAll('[data-fact]') ?? [])].map((x) => x.textContent.replace(/\s+/g, ' ').trim()),
      waiting: document.querySelector('[data-waiting]')?.dataset.waiting,
      yes: it?.querySelector('[data-act="interested"]')?.textContent.trim(),
      no: it?.querySelector('[data-act="not-for-me"]')?.textContent.trim(),
    }
  })
  check(`${d}: the referrals sit above the clients' table, under "שיתופי פעולה"`, st.inbox && st.above && st.head?.startsWith('שיתופי פעולה'), st.head)
  check(`${d}: an offer from another broker, "ממתינה לתגובה", with "מעוניין, בוא נדבר" and "לא מתאים לי"`, st.status === 'pending' && st.pill === 'ממתינה לתגובה' && st.title === 'יש לי לקוח בעיר שלך' && st.yes === 'מעוניין, בוא נדבר' && st.no === 'לא מתאים לי' && st.waiting === '1', `${st.pill} | ${st.yes} | ${st.no}`)
  check(`${d}: the offer says buyer, rooms, budget and neighbourhoods`, st.facts.length === 3 && st.facts[0].includes('קונה') && st.facts[0].includes('3 עד 4 חדרים') && st.facts[1].includes('תקציב') && st.facts[2].includes('לב העיר'), st.facts.join(' | '))
  check(`${d}: before anything, no name and no phone of the client`, (await leaks()).length === 0 && !PHONE.test(st.text))
  check(`${d}: the note under the offer`, st.text.includes(NOTE))
  await page.evaluate(() => { const el = document.querySelector('[data-inbox]'); window.scrollTo(0, el.getBoundingClientRect().top + scrollY - 70) })
  await shot('1-inbox')

  // "מעוניין, בוא נדבר": the chat opens with the ready message in its box
  await click('[data-ref="rf-in-1"] [data-act="interested"]')
  await page.waitForSelector('[data-chat-ref="rf-in-1"]', { visible: true, timeout: 5000 }).catch(() => {})
  await wait(500)
  const OPENER = 'היי ענבל, זה מאיה לנדאו. קיבלתי את הודעת ההפניה שלך לגבי קונה שמחפש 3-4 חדרים בתקציב 3.2-3.8 מיליון בתל אביב - לב העיר, הצפון הישן. מבחינתי אני מסכים/ה שאם נבצע עסקה עם הלקוח הזה, אעביר לך עמלת הפניה של 25%. אשמח לאישורך ולקבלת פרטי הלקוח 🙂'
  st = await page.evaluate(() => {
    const c = document.querySelector('[data-chat-ref="rf-in-1"]')
    return {
      open: !!c,
      status: c?.dataset.status,
      pill: c?.querySelector('[data-ref-status]')?.textContent.trim(),
      box: c?.querySelector('[data-f="ref-chat-input"]')?.value ?? '',
      sent: c?.querySelectorAll('[data-msg="me"]').length ?? -1,
      wa: c?.querySelector('[data-act="continue-whatsapp"]')?.textContent.trim(),
      share: !!c?.querySelector('[data-act="share-details"]'),
      lock: c?.querySelector('[data-locked]')?.textContent.trim() ?? '',
      contact: !!c?.querySelector('[data-contact]'),
      sum: !!c?.querySelector('[data-summary]'),
      brokerPhone: !!c?.querySelector('[data-broker-phone]'),
      text: document.body.innerText,
    }
  })
  check(`${d}: "מעוניין, בוא נדבר" opens a chat with ענבל, status "בשיחה"`, st.open && st.status === 'talking' && st.pill === 'בשיחה', st.pill)
  check(`${d}: the ready message is in the box, not sent: names both brokers, the rooms, the budget, the place and the 25%`, st.box === OPENER && st.sent === 0, st.box.slice(0, 60))
  check(`${d}: the chat says the details are locked, and only ענבל can send them`, st.lock.includes('לא נחשפים') && st.lock.includes('ענבל גולן') && !st.contact && !st.sum && !st.share, st.lock)
  check(`${d}: after "מעוניין": still no name and no phone of the client anywhere`, (await leaks()).length === 0, (await leaks()).join())
  check(`${d}: ענבל's phone is not on the screen before "המשך בוואטסאפ"`, st.wa === 'המשך בוואטסאפ' && !st.brokerPhone && !st.text.includes('555-0212'), st.wa)
  check(`${d}: nothing scrolls sideways with the chat open`, (await overflow()) <= 1)
  await shot('2-chat-ready')

  // "המשך בוואטסאפ": ענבל's own WhatsApp with the same message; nothing is sent by the site
  const before = await page.evaluate(() => window.__opened.length)
  await click('[data-chat-ref="rf-in-1"] [data-act="continue-whatsapp"]')
  st = await page.evaluate(() => ({ n: window.__opened.length, url: window.__opened.at(-1) ?? '', phone: document.querySelector('[data-broker-phone]')?.textContent.trim() ?? '', mine: document.querySelectorAll('[data-chat-ref="rf-in-1"] [data-msg="me"]').length }))
  const waText = decodeURIComponent(st.url.split('?text=')[1] ?? '')
  check(`${d}: "המשך בוואטסאפ" opens wa.me to ענבל's phone with the same message`, st.n === before + 1 && st.url.startsWith('https://wa.me/972505550212?text=') && waText === OPENER, st.url.slice(0, 40))
  check(`${d}: only after the tap, ענבל's phone shows to the one who said yes; the chat sent nothing by itself`, st.phone.includes('050-555-0212') && st.mine === 0, st.phone)
  check(`${d}: and still no name and no phone of the client`, (await leaks()).length === 0)

  // the ready message is sent: ענבל answers, and the details come only when ענבל sends them
  await click('[data-chat-ref="rf-in-1"] [data-act="send-ref-chat"]')
  st = await page.evaluate(() => ({ mine: [...document.querySelectorAll('[data-chat-ref="rf-in-1"] [data-msg="me"] .cw-bubble span')].map((x) => x.textContent), box: document.querySelector('[data-f="ref-chat-input"]')?.value }))
  check(`${d}: the message is sent into the chat, the box is empty`, st.mine.length === 1 && st.mine[0] === OPENER && st.box === '', String(st.mine.length))
  await wait(2900)
  st = await page.evaluate(() => ({ them: document.querySelectorAll('[data-chat-ref="rf-in-1"] [data-msg="them"]').length, contact: !!document.querySelector('[data-chat-ref="rf-in-1"] [data-contact]'), sum: !!document.querySelector('[data-chat-ref="rf-in-1"] [data-summary]') }))
  check(`${d}: ענבל answers; until the details are sent, no client name or phone and no summary`, st.them >= 1 && !st.contact && !st.sum && (await leaks()).length === 0, JSON.stringify(st))
  await page.waitForSelector('[data-chat-ref="rf-in-1"] [data-contact]', { timeout: 6000 }).catch(() => {})
  await wait(700)
  st = await page.evaluate(() => {
    const c = document.querySelector('[data-chat-ref="rf-in-1"]')
    return {
      status: c?.dataset.status,
      pill: c?.querySelector('[data-ref-status]')?.textContent.trim(),
      name: c?.querySelector('[data-contact-name]')?.textContent.trim(),
      phone: c?.querySelector('[data-contact-phone]')?.textContent.trim(),
      from: c?.querySelector('.rfc-contact-row')?.dataset.msg,
      sum: c?.querySelector('[data-summary]')?.innerText ?? '',
      sfrom: c?.querySelector('[data-sum="from"]')?.textContent.trim(),
      sto: c?.querySelector('[data-sum="to"]')?.textContent.trim(),
      spct: c?.querySelector('[data-sum="pct"]')?.textContent.trim(),
    }
  })
  check(`${d}: ענבל sends the details: the name and the phone, in the chat, status "פרטים נשלחו"`, st.status === 'shared' && st.pill === 'פרטים נשלחו' && st.from === 'them' && st.name === 'גלעד ונטע ר.' && st.phone === '052-555-0161', `${st.name} ${st.phone}`)
  check(`${d}: both agreed, so the summary: from ענבל, to me, 25%, and the note`, st.sfrom === 'ענבל גולן' && st.sto === 'מאיה לנדאו' && st.spct?.startsWith('25%') && st.sum.includes(NOTE), `${st.sfrom} > ${st.sto} ${st.spct}`)
  await shot('3-details-in')
  await click('[data-act="close-ref-chat"]')
  st = await page.evaluate(() => {
    const it = document.querySelector('[data-ref="rf-in-1"]')
    return {
      pill: it?.querySelector('[data-ref-status]')?.textContent.trim(),
      text: it?.innerText ?? '',
      tel: it?.querySelectorAll('a[href^="tel:"], a[href*="wa.me"]').length,
      sum: !!it?.querySelector('[data-summary]'),
      row: [...document.querySelectorAll('.ct-table tbody tr')].some((tr) => tr.querySelector('.ct-name b')?.textContent.includes('גלעד ונטע')),
    }
  })
  check(`${d}: the card in "שיתופי פעולה": "פרטים נשלחו" and the summary; no client phone and no WhatsApp to the client on it`, st.pill === 'פרטים נשלחו' && st.sum && st.tel === 0 && !st.text.includes('052-555-0161'), `${st.pill} tel=${st.tel}`)
  check(`${d}: the client entered my CRM when the details came`, st.row)

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
  await shot('4-refer')
  await click('[data-act="send-referral"]')
  st = await page.evaluate(() => ({ sent: document.querySelector('[data-sheet="refer-sent"]')?.dataset.status, pill: document.querySelector('[data-sheet="refer-sent"] [data-ref-status]')?.textContent.trim(), title: document.querySelector('[data-sent-title]')?.textContent.trim() }))
  check(`${d}: sent: "נשלחה", the offer is with ענבל`, st.sent === 'sent' && st.pill === 'נשלחה' && st.title?.includes('ענבל גולן'), `${st.pill} ${st.title}`)
  const stored = await page.evaluate(() => (JSON.parse(localStorage.getItem('nadlanup-referrals-v2') ?? '[]').find((r) => r.dir === 'out') ?? null))
  check(`${d}: what is kept of the offer has no name and no phone`, !!stored && !stored.contact && !JSON.stringify(stored).includes('רון') && !PHONE.test(JSON.stringify(stored)), JSON.stringify(stored).slice(0, 80))
  await wait(1700)
  st = await page.evaluate(() => document.querySelector('[data-sheet="refer-sent"] [data-ref-status]')?.textContent.trim())
  check(`${d}: then "ממתינה לתגובה"`, st === 'ממתינה לתגובה', st)
  await shot('5-sent')
  await wait(3900)
  st = await page.evaluate(() => ({ sent: document.querySelector('[data-sheet="refer-sent"]')?.dataset.status, title: document.querySelector('[data-sent-title]')?.textContent.trim(), btn: document.querySelector('[data-sheet="refer-sent"] [data-act="open-ref-chat"]')?.textContent.trim(), sum: !!document.querySelector('[data-sheet="refer-sent"] [data-summary]') }))
  const noToast = await page.evaluate(() => !document.querySelector('.toast')?.textContent.includes('רוצה לדבר'))
  check(`${d}: ענבל is interested: "בשיחה", a button to the chat, no summary yet`, st.sent === 'talking' && st.title?.includes('רוצה לדבר') && st.btn?.includes('לשיחה עם ענבל') && !st.sum, `${st.title} | ${st.btn}`)
  check(`${d}: with the window open, it shows in it and not as a word on top`, noToast)
  await click('[data-sheet="refer-sent"] [data-act="open-ref-chat"]')
  await page.waitForSelector('[data-chat-ref] [data-msg="them"]', { visible: true, timeout: 6000 }).catch(() => {})
  await wait(400)
  const outId = await page.evaluate(() => document.querySelector('[data-chat-ref]')?.dataset.chatRef)
  const C = `[data-chat-ref="${outId}"]`
  const CLIENT_OUT = ['050-555-0101', '0505550101']
  const outLeak = () => page.evaluate((s, words) => {
    const c = document.querySelector(s)
    const t = c?.innerText ?? ''
    const hrefs = [...(c?.querySelectorAll('a[href]') ?? [])].map((a) => a.getAttribute('href')).join(' ')
    return words.filter((w) => t.includes(w) || hrefs.includes(w))
  }, C, CLIENT_OUT)
  st = await page.evaluate((s) => {
    const c = document.querySelector(s)
    return {
      first: c?.querySelector('[data-msg="them"] .cw-bubble span')?.textContent ?? '',
      share: c?.querySelector('[data-act="share-details"]')?.textContent.trim(),
      wa: !!c?.querySelector('[data-act="continue-whatsapp"]'),
      lock: c?.querySelector('[data-locked]')?.textContent.trim() ?? '',
      contact: !!c?.querySelector('[data-contact]'),
      sum: !!c?.querySelector('[data-summary]'),
    }
  }, C)
  check(`${d}: in my chat, ענבל's message: to me, 50%, Petah Tikva, and the yes to the fee`, st.first.startsWith('היי מאיה, זה ענבל גולן.') && st.first.includes('50%') && st.first.includes('פתח תקווה') && st.first.includes('אני מסכים/ה'), st.first.slice(0, 50))
  check(`${d}: only I, the referring broker, have "שלח את פרטי הלקוח"; nothing of the client sent yet`, st.share === 'שלח את פרטי הלקוח' && !st.wa && !st.contact && !st.sum && st.lock.includes('אצלך') && (await outLeak()).length === 0, st.share)
  await click(`${C} [data-act="share-details"]`)
  st = await page.evaluate(() => ({ q: document.querySelector('[data-confirm="share"] h3')?.textContent.replace(/\s+/g, ' ').trim(), yes: document.querySelector('[data-act="confirm-share"]')?.textContent.trim(), no: document.querySelector('[data-act="cancel-share"]')?.textContent.trim() }))
  check(`${d}: before sending, the question "לשלוח את שם הלקוח והטלפון לענבל גולן?"`, st.q === 'לשלוח את שם הלקוח והטלפון לענבל גולן?' && st.yes === 'כן, לשלוח' && st.no === 'עוד לא', st.q)
  await shot('6-confirm')
  await click('[data-act="cancel-share"]')
  await wait(400)
  st = await page.evaluate((s) => ({ ask: !!document.querySelector('[data-confirm="share"]'), contact: !!document.querySelector(`${s} [data-contact]`), status: document.querySelector(s)?.dataset.status }), C)
  check(`${d}: "עוד לא" sends nothing`, !st.ask && !st.contact && st.status === 'talking', JSON.stringify(st))
  await click(`${C} [data-act="share-details"]`)
  await click('[data-act="confirm-share"]')
  await wait(600)
  st = await page.evaluate((s) => {
    const c = document.querySelector(s)
    return {
      status: c?.dataset.status,
      from: c?.querySelector('.rfc-contact-row')?.dataset.msg,
      name: c?.querySelector('[data-contact-name]')?.textContent.trim(),
      share: !!c?.querySelector('[data-act="share-details"]'),
      sfrom: c?.querySelector('[data-sum="from"]')?.textContent.trim(),
      sto: c?.querySelector('[data-sum="to"]')?.textContent.trim(),
      spct: c?.querySelector('[data-sum="pct"]')?.textContent.trim(),
      note: c?.querySelector('[data-summary] [data-note]')?.textContent.trim(),
    }
  }, C)
  check(`${d}: "כן, לשלוח": the details go into the chat from me, status "פרטים נשלחו"`, st.status === 'shared' && st.from === 'me' && st.name === 'רון ומיכל ק.' && !st.share, JSON.stringify(st.name))
  check(`${d}: both agreed: the summary, from me to ענבל, 50%, with the note`, st.sfrom === 'מאיה לנדאו' && st.sto === 'ענבל גולן' && st.spct?.startsWith('50%') && st.note === NOTE, `${st.sfrom} > ${st.sto} ${st.spct}`)
  await wait(2700)
  await shot('7-shared')
  await click(`${C} [data-act="mark-closed"]`)
  await click('[data-act="close-ref-chat"]')
  await page.keyboard.press('Escape')
  await wait(500)
  st = await page.evaluate((id) => {
    const o = document.querySelector(`[data-inbox] [data-ref="${id}"]`)
    return { pill: o?.querySelector('[data-ref-status]')?.textContent.trim(), text: o?.innerText ?? '', sum: !!o?.querySelector('[data-summary]') }
  }, outId)
  check(`${d}: my offer in "שיתופי פעולה": "נסגרה", with the summary, and no client phone on the card`, st.pill === 'נסגרה' && st.sum && !st.text.includes('555-0101'), st.pill)
  await page.evaluate(() => { const el = document.querySelector('[data-inbox]'); window.scrollTo(0, el.getBoundingClientRect().top + scrollY - 70) })
  await shot('8-inbox-after')

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
  await shot('9-pick-buyer')
  await click('[data-sheet="send-buyer"] .cp-row[data-id="k1"]')
  const msg = await page.evaluate(() => document.querySelector('[data-f="wa-text"]')?.value ?? '')
  check(`${d}: the message has the city, the rooms, the price and a link to the property`, msg.includes('מיקום:') && msg.includes(card.area.split(',')[0].trim()) && /\d+(\.\d)? חדרים|מ"ר/.test(msg) && msg.includes('מחיר:') && msg.includes('/n/p?'), msg.replace(/\n/g, ' / '))
  check(`${d}: the message greets the buyer by first name`, msg.startsWith('היי רון,'), msg.split('\n')[0])
  check(`${d}: no owner's name, no phone and no flat number in the message`, !msg.includes(card.owner) && !PHONE.test(msg) && !/דירה \d/.test(msg) && (!card.address || !msg.includes(card.address)), card.owner)
  check(`${d}: nothing scrolls sideways in the WhatsApp window`, (await overflow()) <= 1)
  await shot('10-message')
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
  await shot('11-buyer-page')

  // ------------------------------------------------------------ the feed stays clean
  await page.goto(green + '/app/community', { waitUntil: 'load' })
  await wait(1500)
  const feed = await page.evaluate(() => document.body.innerText)
  check(`${d}: no client's name or phone in the feed`, !['רון ומיכל', 'גלעד ונטע', 'לקוחה חדשה מהפניה', '555-0101', '555-0161', '555-0212'].some((w) => feed.includes(w)))

  check(`${d}: no errors on the page`, errors.length === 0, errors.slice(0, 2).join(' | '))
  await page.close()
}

// the results first: on Windows, Chrome's leftover profile files sometimes refuse to go when it closes
const failed = results.filter((l) => l.startsWith('FAIL'))
console.log(results.join('\n'))
console.log(`\n${results.length - failed.length} pass, ${failed.length} fail`)
console.log(failed.length ? 'SOME CHECKS FAILED' : 'ALL CHECKS PASSED')
await browser.close().catch(() => {})
process.exit(failed.length ? 1 : 0)
