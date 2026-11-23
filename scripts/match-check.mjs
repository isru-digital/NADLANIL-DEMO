// The match moment (17.11.2026): sharing a property checks the community at once and shows "נמצאו X התאמות!" with
// two cards that meet and a score each; the matches as cards to swipe (right "כן", left "לא מעניין אותי", buttons
// and arrow keys too); both sides yes = "יש התאמה!" and the chat opens with a ready first line; a buyer of another
// broker for a property of mine opens the window of "שים לב, יש התאמה עבורך בדרישת קונה" (23.11.2026, in place of
// the small notice for this one case); no match = "נודיע לך ברגע שתהיה התאמה". No street or house
// number anywhere in it. Saves screenshots, and with RECORD=1 recordings.
// Usage: node scripts/match-check.mjs [outDir]     (BASE_GREEN overrides the address)
import puppeteer from 'puppeteer-core'
import { mkdirSync, writeFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'

const green = process.env.BASE_GREEN ?? 'http://localhost:5240/NADLANIL-DEMO/green'
const out = process.argv[2] ?? '_shots/match'
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
const fresh = async (vp) => {
  const page = await browser.newPage()
  await page.setViewport(vp)
  await page.evaluateOnNewDocument((h) => {
    try {
      localStorage.setItem('nadlanup-demo-v1', '1')
      localStorage.setItem('nadlanup-preview-v1', h)
    } catch {}
  }, PREVIEW)
  await page.goto(green + '/', { waitUntil: 'load' })
  await page.evaluate((h) => {
    localStorage.clear()
    localStorage.setItem('nadlanup-demo-v1', '1')
    localStorage.setItem('nadlanup-preview-v1', h)
    localStorage.setItem('nadlanup-mode-v1', JSON.stringify({ mode: 'day', until: Date.now() + 9e9 }))
  }, PREVIEW)
  return page
}
/** a finger (or the mouse) drags the top card sideways */
const drag = async (page, dx, phone) => {
  const r = await page.$eval('.mm-card.is-top', (el) => {
    const b = el.getBoundingClientRect()
    return { x: b.left + b.width / 2, y: b.top + b.height * 0.6 }
  })
  if (phone) {
    await page.touchscreen.touchStart(r.x, r.y)
    for (let i = 1; i <= 10; i++) await page.touchscreen.touchMove(r.x + (dx * i) / 10, r.y + i), await wait(16)
    await page.touchscreen.touchEnd()
  } else {
    await page.mouse.move(r.x, r.y)
    await page.mouse.down()
    for (let i = 1; i <= 10; i++) await page.mouse.move(r.x + (dx * i) / 10, r.y + i), await wait(16)
    await page.mouse.up()
  }
}
/** shares the first property of my CRM that is not in the community yet, and gives back its CRM record */
const shareProperty = async (page) => {
  await page.goto(green + '/app/community?topic=coop', { waitUntil: 'networkidle0' })
  await wait(700)
  await tap(page, '[data-act="pick-property"]')
  await page.waitForSelector('[data-picker="property"]', { visible: true })
  // a home (an office matches office searches only)
  const id = await page.evaluate(() => {
    const crm = JSON.parse(localStorage.getItem('brokers-demo-state-v5')).crm
    return [...document.querySelectorAll('[data-picker="property"] .pk-row')].find((r) => !r.disabled && (crm.find((c) => c.id === r.dataset.pick)?.category ?? 'home') === 'home')?.dataset.pick
  })
  const rec = await page.evaluate((id) => JSON.parse(localStorage.getItem('brokers-demo-state-v5')).crm.find((c) => c.id === id), id)
  await tap(page, `[data-picker="property"] [data-pick="${id}"]`)
  return rec
}

for (const [tag, vp, phone] of process.env.RECORD === 'only' ? [] : [
  ['desktop', { width: 1440, height: 900 }, false],
  ['phone', { width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }, true],
]) {
  const page = await fresh(vp)
  const rec = await shareProperty(page)

  // ---- 1. the moment: two cards meet, "נמצאו X התאמות!", a score
  await page.waitForSelector('[data-match-screen="meet"]', { visible: true, timeout: 4000 })
  await wait(1700)
  const meet = await page.evaluate(() => ({
    title: document.querySelector('[data-match-title]')?.textContent.trim(),
    cards: document.querySelectorAll('.mm-meet-card').length,
    score: Number(document.querySelector('.mm-meet-score [data-score]')?.dataset.score ?? 0),
    faces: document.querySelectorAll('.mm-faces li').length,
    sub: document.querySelector('.mm-sub')?.textContent.trim(),
    text: document.querySelector('.mm').innerText,
    near: (() => {
      const [a, b] = [...document.querySelectorAll('.mm-meet-card')].map((e) => e.getBoundingClientRect())
      return a && b ? Math.round(Math.max(a.left, b.left) - Math.min(a.right, b.right)) : null
    })(),
  }))
  const n = Number(/נמצאו (\d+) התאמות!/.exec(meet.title ?? '')?.[1] ?? (meet.title === 'נמצאה התאמה אחת!' ? 1 : 0))
  check(`${tag}: "נמצאו X התאמות!" comes up with two cards that met (they overlap) and a score between them`, n > 0 && meet.cards === 2 && meet.near < 0 && meet.score >= 55 && meet.faces === Math.min(n, 5), { ...meet, text: undefined, n })
  check(`${tag}: it says what was checked: city, neighbourhood, kind, rooms, budget, parking, elevator, safe room`, meet.sub === 'לפי עיר, שכונה, סוג נכס, חדרים, תקציב, חניה, מעלית וממ"ד', meet.sub)
  check(`${tag}: no street or house number of my property on the screen`, !!rec && (!rec.address || !meet.text.includes(rec.address)), { address: rec?.address })
  await page.screenshot({ path: `${out}/${tag}-1-found.png` })

  // ---- 2. the cards to swipe
  await tap(page, '[data-act="see-matches"]')
  await page.waitForSelector('.mm-card.is-top', { visible: true })
  await wait(900)
  const card = await page.evaluate(() => {
    const c = document.querySelector('.mm-card.is-top')
    return {
      score: Number(c.dataset.score),
      ring: c.querySelector('.mm-ring b')?.textContent,
      reasons: c.querySelectorAll('.mm-reasons li').length,
      place: c.querySelector('.mm-card-place')?.textContent.trim(),
      who: c.querySelector('.mm-card-who b')?.textContent,
      count: document.querySelector('.mm-count')?.textContent.replace(/\s+/g, ' ').trim(),
      yes: document.querySelector('[data-act="match-yes"]')?.textContent.trim(),
      no: document.querySelector('[data-act="match-no"]')?.textContent.trim(),
      yesRight: document.querySelector('[data-act="match-yes"]').getBoundingClientRect().left > document.querySelector('[data-act="match-no"]').getBoundingClientRect().left,
      h: Math.round(document.querySelector('[data-act="match-yes"]').getBoundingClientRect().height),
      demo: document.querySelector('.mm-demo')?.textContent.trim(),
      text: document.querySelector('.mm').innerText,
      fits: (() => {
        const r = document.querySelector('.mm-buttons').getBoundingClientRect()
        return r.bottom <= innerHeight
      })(),
    }
  })
  check(`${tag}: each match is a card with its score ring, why it fits, the place and the broker`, card.score >= 55 && card.ring === `${card.score}%` && card.reasons >= 3 && !!card.place && !!card.who && card.count === `1 מתוך ${n}`, { ...card, text: undefined })
  check(`${tag}: "כן" on the right and "לא מעניין אותי" on the left, big, inside the screen`, card.yes === 'כן' && card.no === 'לא מעניין אותי' && card.yesRight && card.h >= 52 && card.fits, card)
  check(`${tag}: the played side is said on the screen ("דוגמה")`, /^דוגמה/.test(card.demo ?? ''), card.demo)
  check(`${tag}: the cards show the city and the neighbourhood only (no street of mine, no "רחוב")`, !/רחוב/.test(card.text) && (!rec.address || !card.text.includes(rec.address)), card.place)
  await page.screenshot({ path: `${out}/${tag}-2-deck.png` })

  // a drag that does not go far enough comes back
  await drag(page, 50, phone)
  await wait(700)
  const back = await page.evaluate(() => ({ id: document.querySelector('.mm-card.is-top')?.dataset.matchCard, count: document.querySelector('.mm-count')?.textContent.replace(/\s+/g, ' ').trim() }))
  check(`${tag}: a short drag springs back`, back.count === `1 מתוך ${n}`, back)

  // left = "לא מעניין אותי" (if there is more than one), then right = "כן" on a card that fits at 70 and up
  let cur = card.score
  if (n > 1) {
    await drag(page, -260, phone)
    await wait(800)
    cur = await page.evaluate(() => Number(document.querySelector('.mm-card.is-top')?.dataset.score ?? 0))
    const said = await page.evaluate(() => Object.values(JSON.parse(localStorage.getItem('nadlanup-match-v1') ?? '{}').said ?? {}))
    check(`${tag}: a swipe to the left is "לא מעניין אותי" and the next card comes up`, said.includes('no'), said)
  }
  await drag(page, 260, phone)
  await wait(900)
  const mutual = await page.evaluate(() => ({ on: !!document.querySelector('[data-mutual]'), title: document.querySelector('.mm-mutual-title')?.textContent, text: document.querySelector('.mm-mutual p')?.textContent.trim() }))
  check(`${tag}: a swipe to the right on a card the other broker likes too: a small "יש התאמה!"`, cur < 70 ? true : mutual.on && mutual.title === 'יש התאמה!', { cur, mutual })
  await wait(300)
  await page.screenshot({ path: `${out}/${tag}-3-mutual.png` })
  if (mutual.on) {
    // the chat opens by itself, with the first line ready
    await page.waitForSelector('[data-chat]', { visible: true, timeout: 5000 })
    await wait(600)
    const chat = await page.evaluate(() => ({ val: document.querySelector('[data-f="chat-input"]')?.value, strip: document.querySelector('[data-chat-property] b')?.textContent, buyer: !!document.querySelector('.cw-prop-ph.is-buyer'), quick: [...document.querySelectorAll('[data-quick]')].map((q) => q.textContent) }))
    check(`${tag}: then the chat opens with a ready first line about the match`, /^היי .+, ראיתי את (הקונה|השוכר) שלך\. יש לי נכס ב.+ שמתאים לו ב-\d+%\. מתי נוח לדבר\?$/.test(chat.val ?? '') && !!chat.strip && chat.buyer, chat)
    check(`${tag}: the chat's ready lines are about the buyer, not a property`, chat.quick[0] === 'הקונה עדיין מחפש?', chat.quick)
    await page.screenshot({ path: `${out}/${tag}-4-chat.png` })
    await page.keyboard.press('Enter')
    await wait(300)
    const sent = await page.evaluate(() => [...document.querySelectorAll('[data-msg="me"] .cw-bubble span')].map((b) => b.textContent))
    check(`${tag}: the first line goes out as it is with Enter`, sent.length === 1 && /^היי /.test(sent[0]), sent)
    await tap(page, '[data-act="close-chat"]')
    await wait(400)
  }
  // the keys: the left arrow is "לא עכשיו", through to the end
  for (let k = 0; k < 10; k++) {
    const st = await page.evaluate(() => document.querySelector('[data-match-screen]')?.dataset.matchScreen)
    if (st !== 'deck') break
    await page.keyboard.press('ArrowLeft')
    await wait(500)
  }
  const done = await page.evaluate(() => ({ on: !!document.querySelector('[data-match-done]'), text: document.querySelector('[data-match-done] .mm-sub')?.textContent.trim() }))
  check(`${tag}: after the last card, "עברת על כל ההתאמות"`, done.on, done)
  await page.screenshot({ path: `${out}/${tag}-5-done.png` })
  await tap(page, '[data-act="done-match"]')
  const t0 = Date.now()
  await page.waitForFunction(() => !document.querySelector('[data-match-screen]'), { timeout: 5000 }).catch(() => {})
  const left = { el: !!(await page.$('[data-match-screen]')), ms: Date.now() - t0 }
  check(`${tag}: the screen closes`, !left.el && left.ms < 600, left)

  // ---- 3. a buyer of another broker for my property: the window of "שים לב, יש התאמה עבורך בדרישת קונה"
  await page.waitForSelector('[data-offer]', { visible: true, timeout: 12000 })
  await wait(700)
  const note = await page.evaluate(() => {
    const el = document.querySelector('[data-offer]')
    const r = el.getBoundingClientRect()
    return {
      title: document.querySelector('[data-offer-title]')?.textContent.replace(/\s+/g, ' ').trim(),
      need: document.querySelector('[data-offer-need]')?.textContent.replace(/\s+/g, ' ').trim(),
      yes: document.querySelector('[data-act="offer-yes"]')?.textContent.trim(),
      inside: r.left >= 0 && r.right <= innerWidth && r.bottom <= innerHeight + 1,
      text: el.innerText,
      bell: Number(document.querySelector('.bell-count')?.textContent ?? 0),
    }
  })
  check(`${tag}: the window "שים לב, יש התאמה עבורך בדרישת קונה" comes up, with the bell counting it too`, /^שים לב, יש התאמה עבורך בדרישת (קונה|שוכר)$/.test(note.title ?? '') && !!note.need && note.yes === 'כן' && note.inside && note.bell >= 1, note)
  check(`${tag}: the window has no street either`, !rec.address || !note.text.includes(rec.address))
  await page.screenshot({ path: `${out}/${tag}-6-notice.png` })
  await tap(page, '[data-act="offer-yes"]')
  await page.waitForSelector('[data-offer="open"]', { visible: true, timeout: 3000 })
  await wait(400)
  await page.screenshot({ path: `${out}/${tag}-7-have.png` })
  await tap(page, '[data-act="offer-message"]')
  await page.waitForSelector('[data-chat]', { visible: true })
  await wait(500)
  const c2 = await page.evaluate(() => document.querySelector('[data-f="chat-input"]')?.value)
  check(`${tag}: "כן" opens the broker's details, and "שליחת הודעה" opens the chat with a first line`, /^היי .+ שמתאים לו ב-\d+%/.test(c2 ?? ''), c2)
  await tap(page, '[data-act="close-chat"]')
  await wait(300)
  const free = await page.evaluate(() => [[0.5, 0.5], [0.2, 0.8], [0.8, 0.3]].every(([x, y]) => !document.elementFromPoint(innerWidth * x, innerHeight * y)?.closest('.mm, .mm-mutual-wrap, .mm-notice, .mm-offer-wrap, .cw')))
  check(`${tag}: once everything is closed, nothing is left over the page`, free)

  // the notice in the list answers too, and opens the chat the second time
  await tap(page, '.bell')
  await wait(600)
  const li = await page.evaluate(() => [...document.querySelectorAll('.notice-list li.has-pair')].map((l) => ({ t: l.querySelector('strong')?.textContent, b: l.querySelector('[data-act="notice-have"]')?.textContent }))[0])
  check(`${tag}: in the notices the match has its own button (now "לצ'אט")`, !!li && li.b === "לצ'אט", li)
  await page.screenshot({ path: `${out}/${tag}-8-list.png` })

  const wide = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
  check(`${tag}: no sideways scroll`, wide <= 1, { wide })
  await page.close()

  // ---- 4. nothing fits yet: "נודיע לך ברגע שתהיה התאמה"
  const p2 = await fresh(vp)
  await p2.goto(green + '/app/community', { waitUntil: 'networkidle0' })
  await wait(500)
  await p2.evaluate(() => {
    const s = JSON.parse(localStorage.getItem('brokers-demo-state-v5'))
    s.items = s.items.filter((i) => i.topicId !== 'seeking')
    localStorage.setItem('brokers-demo-state-v5', JSON.stringify(s))
  })
  await shareProperty(p2)
  await p2.waitForSelector('[data-match-screen="meet"]', { visible: true, timeout: 4000 })
  await wait(1200)
  const none = await p2.evaluate(() => ({ title: document.querySelector('[data-match-title]')?.textContent.trim(), sub: document.querySelector('[data-match-none]')?.textContent.trim(), cards: document.querySelectorAll('.mm-meet-card').length }))
  check(`${tag}: nothing fits: "אין עדיין התאמה" and "נודיע לך ברגע שתהיה התאמה"`, none.title === 'אין עדיין התאמה' && none.sub === 'נודיע לך ברגע שתהיה התאמה' && none.cards === 1, none)
  await p2.screenshot({ path: `${out}/${tag}-9-none.png` })
  await tap(p2, '[data-act="ok-none"]')
  await p2.waitForSelector('[data-offer]', { visible: true, timeout: 12000 })
  check(`${tag}: and when a fitting buyer comes in, the window says so`, true)
  await p2.close()
}

// ---- recordings: share, the cards meet, swipe, "יש התאמה!", the chat; then the notice and "יש לי"
if (process.env.RECORD === '1' || process.env.RECORD === 'only') {
  for (const [tag, vp, phone] of [
    ['desktop', { width: 1280, height: 800 }, false],
    ['phone', { width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }, true],
  ]) {
    const page = await fresh(vp)
    await page.goto(green + '/app/community?topic=coop', { waitUntil: 'networkidle0' })
    await wait(700)
    const dir = `${out}/frames-${tag}`
    mkdirSync(dir, { recursive: true })
    const times = []
    let n = 0
    let stop = false
    const shoot = (async () => {
      while (!stop) {
        times.push(Date.now())
        await page.screenshot({ path: `${dir}/f${String(n++).padStart(4, '0')}.jpg`, type: 'jpeg', quality: 84, optimizeForSpeed: true })
      }
    })()
    await wait(600)
    await tap(page, '[data-act="pick-property"]')
    await page.waitForSelector('[data-picker="property"]', { visible: true })
    await wait(900)
    const id = await page.evaluate(() => {
      const crm = JSON.parse(localStorage.getItem('brokers-demo-state-v5')).crm
      return [...document.querySelectorAll('[data-picker="property"] .pk-row')].find((r) => !r.disabled && (crm.find((c) => c.id === r.dataset.pick)?.category ?? 'home') === 'home')?.dataset.pick
    })
    await tap(page, `[data-picker="property"] [data-pick="${id}"]`)
    await page.waitForSelector('[data-match-screen="meet"]', { visible: true, timeout: 4000 })
    await wait(2600)
    await tap(page, '[data-act="see-matches"]')
    await wait(1400)
    const many = await page.evaluate(() => document.querySelectorAll('.mm-card').length > 1)
    if (many) {
      await drag(page, -260, phone)
      await wait(1000)
    }
    await drag(page, 260, phone)
    await wait(1200)
    await page.waitForSelector('[data-chat]', { visible: true, timeout: 6000 }).catch(() => {})
    await wait(1200)
    await page.keyboard.press('Enter')
    await wait(4600)
    await tap(page, '[data-act="close-chat"]').catch(() => {})
    await wait(600)
    for (let k = 0; k < 10; k++) {
      const st = await page.evaluate(() => document.querySelector('[data-match-screen]')?.dataset.matchScreen)
      if (st !== 'deck') break
      await page.keyboard.press('ArrowLeft')
      await wait(600)
    }
    await wait(900)
    await tap(page, '[data-act="done-match"]').catch(() => {})
    await page.waitForSelector('[data-match-notice]', { visible: true, timeout: 9000 }).catch(() => {})
    await wait(1800)
    await tap(page, '[data-act="match-have"]').catch(() => {})
    await wait(4400)
    stop = true
    await shoot
    times.push(Date.now())
    let txt = ''
    for (let k = 0; k < n; k++) txt += `file 'f${String(k).padStart(4, '0')}.jpg'\nduration ${((times[k + 1] - times[k]) / 1000).toFixed(3)}\n`
    txt += `file 'f${String(n - 1).padStart(4, '0')}.jpg'\n`
    writeFileSync(`${dir}/list.txt`, txt)
    execFileSync('ffmpeg', ['-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', `${dir}/list.txt`, '-vf', `fps=30,scale=${tag === 'phone' ? 780 : 1280}:-2`, '-c:v', 'libx264', '-crf', '21', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', `${out}/rec-${tag}.mp4`])
    await page.close()
  }
  console.log('recordings saved')
}

console.log(fails ? '\nSOME CHECKS FAILED' : '\nALL CHECKS PASSED')
await Promise.race([browser.close().catch(() => {}), wait(4000)])
process.exit(0)
