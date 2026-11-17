// The property page's actions (17.11.2026): one big "יש לי קונה לנכס" (no more "שיתוף פעולה"), a window that says
// it was sent with the broker's phone and a call button, a messenger-style chat (a docked window on a computer, the
// whole screen on a phone: bubbles, time, "נקרא", the property's photo on top), and the property's broker hears it:
// a notice and a number on the bell. Also saves screenshots, and with RECORD=1 short recordings.
// Usage: node scripts/chat-check.mjs [outDir]     (BASE_GREEN overrides the address)
import puppeteer from 'puppeteer-core'
import { mkdirSync, writeFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'

const green = process.env.BASE_GREEN ?? 'http://localhost:5240/NADLANIL-DEMO/green'
const out = process.argv[2] ?? '_shots/chat'
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

for (const [tag, vp, phone] of process.env.RECORD === 'only' ? [] : [
  ['desktop', { width: 1440, height: 900 }, false],
  ['phone', { width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }, true],
]) {
  const page = await fresh(vp)
  await page.goto(green + '/app/property/p1', { waitUntil: 'networkidle0' })
  await wait(800)
  const acts = await page.evaluate(() => ({
    coop: !!document.querySelector('[data-act="coop"]'),
    old: /שיתוף פעולה/.test(document.querySelector('.pp-actions')?.innerText ?? ''),
    buyer: document.querySelector('[data-act="buyer"]')?.textContent.trim(),
    h: Math.round(document.querySelector('[data-act="buyer"]')?.getBoundingClientRect().height ?? 0),
    chat: document.querySelector('[data-act="open-chat"]')?.textContent.trim(),
  }))
  check(`${tag}: one big "יש לי קונה לנכס" in place of "שיתוף פעולה", and "התחלת צ'אט" stays`, !acts.coop && !acts.old && acts.buyer === 'יש לי קונה לנכס' && acts.h >= 52 && acts.chat === "התחלת צ'אט", acts)
  await page.evaluate(() => document.querySelector('.pp-actions').scrollIntoView({ block: 'center' }))
  await wait(200)
  await page.screenshot({ path: `${out}/${tag}-1-page.png` })

  // ---- the window: sent, the phone, and a call button
  await tap(page, '[data-act="buyer"]')
  await page.waitForSelector('[data-sent-window]', { visible: true })
  await wait(400)
  const win = await page.evaluate(() => {
    const m = document.querySelector('[data-sent-window]').closest('.modal')
    return {
      title: m?.querySelector('h2, .modal-title')?.textContent.trim(),
      text: document.querySelector('[data-sent-window] p')?.textContent.trim(),
      phone: document.querySelector('[data-phone]')?.textContent.trim(),
      call: document.querySelector('[data-act="call"]')?.getAttribute('href'),
    }
  })
  check(`${tag}: "ההודעה נשלחה!" with the words, the broker's phone and a call button`, win.title === 'ההודעה נשלחה!' && win.text === 'המתווך יודע שיש לך קונה לנכס שלו. אפשר גם ליצור איתו קשר ישירות:' && /^05\d-555-02\d\d$/.test(win.phone ?? '') && win.call === `tel:${win.phone.replace(/-/g, '')}`, win)
  await page.screenshot({ path: `${out}/${tag}-2-sent.png` })
  await page.keyboard.press('Escape')
  await wait(500)
  const after = await page.evaluate(() => ({ btn: document.querySelector('[data-act="buyer"]')?.textContent.trim(), saved: JSON.parse(localStorage.getItem('brokers-demo-state-v5') ?? '{}').interested?.['buyer:p1'] }))
  check(`${tag}: the button now says it was sent`, after.btn === 'עדכנת שיש לך קונה לנכס' && after.saved === true, after)

  // ---- the chat
  await tap(page, '[data-act="open-chat"]')
  await page.waitForSelector('[data-chat]', { visible: true })
  await wait(500)
  const box = await page.evaluate(() => {
    const r = document.querySelector('[data-chat]').getBoundingClientRect()
    return { w: Math.round(r.width), h: Math.round(r.height), left: Math.round(r.left), bottom: Math.round(r.bottom), vw: innerWidth, vh: innerHeight, thumb: !!document.querySelector('[data-chat-property] img'), title: document.querySelector('[data-chat-property] b')?.textContent, quick: document.querySelectorAll('[data-quick]').length }
  })
  const placed = phone ? box.w === box.vw && box.h === box.vh : box.w <= 400 && box.bottom === box.vh && box.left < box.vw / 2
  check(`${tag}: the chat is ${phone ? 'the whole screen' : 'a small window docked at the bottom corner'}, with the property's photo on top`, placed && box.thumb && !!box.title && box.quick === 3, box)
  await page.type('[data-f="chat-input"]', 'היי, יש לי קונה רציני לנכס')
  await page.keyboard.press('Enter')
  await wait(300)
  let c = await page.evaluate(() => ({
    mine: [...document.querySelectorAll('[data-msg="me"] .cw-bubble span')].map((b) => b.textContent),
    time: document.querySelector('[data-msg="me"] time')?.textContent,
    status: document.querySelector('.cw-read')?.textContent.trim(),
  }))
  check(`${tag}: my message is a bubble with its time, and "נשלח"`, c.mine.includes('היי, יש לי קונה רציני לנכס') && /^\d{2}:\d{2}$/.test(c.time ?? '') && c.status === 'נשלח', c)
  await wait(1500)
  c = await page.evaluate(() => ({ status: document.querySelector('.cw-read')?.textContent.trim(), typing: !!document.querySelector('[data-typing]') }))
  check(`${tag}: a moment later it says "נקרא", and the broker is typing`, c.status === 'נקרא' && c.typing, c)
  await wait(2200)
  c = await page.evaluate(() => ({ theirs: [...document.querySelectorAll('[data-msg="them"] .cw-bubble span')].map((b) => b.textContent), face: !!document.querySelector('[data-msg="them"] .cw-face .avatar, [data-msg="them"] .cw-face img') }))
  check(`${tag}: the broker's answer comes in a bubble of its own, with a small face`, c.theirs.length === 1 && c.face, c)
  await page.screenshot({ path: `${out}/${tag}-3-chat.png` })
  await tap(page, '[data-act="close-chat"]')
  await wait(400)
  check(`${tag}: the chat closes`, !(await page.$('[data-chat]')))
  await page.goto(green + '/app/property/p1', { waitUntil: 'networkidle0' })
  await wait(600)
  await tap(page, '[data-act="open-chat"]')
  await wait(500)
  const kept = await page.evaluate(() => document.querySelectorAll('[data-msg]').length)
  check(`${tag}: the talk is still there when it opens again`, kept >= 2, kept)
  await tap(page, '[data-act="close-chat"]')

  // ---- the property's broker hears it: a notice and the bell
  await page.goto(green + '/app/community?topic=coop', { waitUntil: 'networkidle0' })
  await wait(700)
  await tap(page, '[data-act="pick-property"]')
  await page.waitForSelector('[data-picker="property"]', { visible: true })
  const first = await page.evaluate(() => [...document.querySelectorAll('[data-picker="property"] .pk-row')].find((r) => !r.disabled)?.dataset.pick)
  await tap(page, `[data-picker="property"] [data-pick="${first}"]`)
  // the match screen comes up first (scripts/match-check.mjs covers it): closed here
  await page.waitForSelector('[data-match-screen]', { visible: true, timeout: 4000 }).catch(() => {})
  await tap(page, '[data-act="close-match"]').catch(() => {})
  await wait(900)
  const before = await page.evaluate(() => Number(document.querySelector('.bell-count')?.textContent ?? 0))
  await wait(7600)
  const bell = await page.evaluate(() => ({ n: Number(document.querySelector('.bell-count')?.textContent ?? 0), toast: document.querySelector('.toast')?.textContent }))
  check(`${tag}: when another broker has a buyer for my property, the bell gets a number and a notice pops up`, bell.n === before + 1 && /יש קונה לנכס שלך/.test(bell.toast ?? ''), { before, bell })
  await page.evaluate(() => document.querySelector('.bell')?.scrollIntoView({ block: 'center' }))
  await wait(200)
  await page.screenshot({ path: `${out}/${tag}-4-bell.png` })
  await tap(page, '.bell')
  await wait(600)
  const list = await page.evaluate(() => [...document.querySelectorAll('.notice-list li strong')].map((s) => s.textContent.trim()))
  check(`${tag}: the notice reads "יש קונה לנכס שלך", marked as an example`, list.some((t) => t.startsWith('יש קונה לנכס שלך') && t.includes('דוגמה')), list)
  await page.screenshot({ path: `${out}/${tag}-5-notices.png` })
  const mineId = await page.evaluate(() => JSON.parse(localStorage.getItem('brokers-demo-state-v5')).notices.find((n) => n.kind === 'interest')?.itemId)
  await page.goto(green + `/app/property/${mineId}`, { waitUntil: 'networkidle0' })
  await wait(600)
  const own = await page.evaluate(() => ({ list: document.querySelector('[data-interest]')?.textContent, buyerBtn: !!document.querySelector('[data-act="buyer"]') }))
  check(`${tag}: on my own property page I see who has a buyer (and no "יש לי קונה לנכס" for myself)`, /יש קונה/.test(own.list ?? '') && !own.buyerBtn, own)

  const wide = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
  check(`${tag}: no sideways scroll`, wide <= 1, { wide })
  await page.close()
}

// ---- short recordings: the button, the window, the chat
if (process.env.RECORD === '1' || process.env.RECORD === 'only') {
  for (const [tag, vp] of [
    ['desktop', { width: 1280, height: 800 }],
    ['phone', { width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }],
  ]) {
    const page = await fresh(vp)
    await page.goto(green + '/app/property/p5', { waitUntil: 'networkidle0' })
    await page.evaluate(() => document.querySelector('.pp-actions').scrollIntoView({ block: 'center' }))
    await wait(400)
    const dir = `${out}/frames-${tag}`
    mkdirSync(dir, { recursive: true })
    const times = []
    let n = 0
    let stop = false
    const shoot = (async () => {
      while (!stop) {
        times.push(Date.now())
        await page.screenshot({ path: `${dir}/f${String(n++).padStart(4, '0')}.jpg`, type: 'jpeg', quality: 86, optimizeForSpeed: true })
      }
    })()
    await wait(700)
    await tap(page, '[data-act="buyer"]')
    await wait(2200)
    await page.keyboard.press('Escape')
    await wait(900)
    await tap(page, '[data-act="open-chat"]')
    await page.waitForSelector('[data-quick]', { visible: true, timeout: 6000 })
    await wait(700)
    await tap(page, '[data-quick="יש לי קונה רציני לנכס"]')
    await wait(5200)
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
