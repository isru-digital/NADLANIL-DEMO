// "עריכת פרופיל" (Itzik 20.11.2026): in the menu that the picture opens, a signed-in person edits how they appear.
//  1. the first row under the name is "עריכת פרופיל"; the row, the picture and the name all open the edit screen
//  2. the screen: a round picture (from the gallery or the camera, cut to a circle, made small), a display name or
//     nickname, a phone, the cities and neighbourhoods of work (neighbourhoods are optional), and one "שמירה"
//  3. the change is everywhere at once, with no reload: the top bar, the menu, the feed, the person's own posts
//  4. with no picture the initials show, as before
//  5. nothing goes to the server: it is kept in this browser, per person (the server needs Itzik's approval first)
//  6. the phone is never shown in the feed
//  7. the example account of a presentation has no edit row; nothing else in the menu was removed
//  8. on the home page the agent card of nobody shows a plain figure, not a question mark
// Against the LOCAL test server (real sessions) and the green dev server; saves screenshots.
// Usage: node scripts/profile-edit-check.mjs [outDir]      ONLY=phone or ONLY=desktop runs one of the two
import puppeteer from 'puppeteer-core'
import { mkdirSync } from 'node:fs'

const API = process.env.API ?? 'http://localhost:8787'
const ORIGIN = 'http://localhost:5240'
const green = 'http://localhost:5240/NADLANIL-DEMO/green'
if (!/^http:\/\/(localhost|127\.0\.0\.1)/.test(API)) throw new Error('local test server only')
const out = process.argv[2] ?? '_shots/profile-edit'
mkdirSync(out, { recursive: true })
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
let fails = 0
const check = (name, ok, info) => {
  if (!ok) fails++
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok || info === undefined ? '' : '  [' + JSON.stringify(info) + ']'}`)
}
const api = async (path, { method = 'GET', body, token } = {}) => {
  const res = await fetch(API + path, {
    method,
    headers: { origin: ORIGIN, ...(body ? { 'content-type': 'application/json' } : {}), ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  })
  return res.json().catch(() => ({}))
}
async function signIn(email) {
  await api('/api/test/rate', { method: 'DELETE' })
  await api('/api/login', { method: 'POST', body: { email } })
  const mail = (await api('/api/test/outbox')).outbox.filter((m) => m.to_email === email).at(-1)
  const s = await api('/api/session', { method: 'POST', body: { email, code: mail.subject.match(/^(\d{6})/)[1] } })
  return { token: s.token, member: s.member, staff: s.staff }
}

// ---------------------------------------------------------------- two real people (both invented, local only)
const staff = await signIn('itzik@test.local')
const STAFF = staff.staff?.name
const BROKER = { name: 'נועם אלון', phone: '052-555-0177', email: `noam-${Date.now()}@test.local`, license: '2718281', work: 'office', office_name: 'אלון נכסים', cities: ['חיפה', 'נתניה'], areas: 'כרמל' }
await api('/api/test/rate', { method: 'DELETE' })
await api('/api/register', { method: 'POST', body: BROKER })
const asked = (await api('/api/admin/members', { token: staff.token })).members?.find((m) => m.email === BROKER.email)
await api(`/api/admin/members/${asked?.id}/approve`, { method: 'POST', token: staff.token })
const broker = await signIn(BROKER.email)
check('setup: one of the staff and an approved broker are signed in', !!staff.token && !!STAFF && !staff.member && broker.member?.name === BROKER.name, { staff, broker })

const PHONE = { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true }
const DESK = { width: 1440, height: 900 }
const browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--hide-scrollbars'] })

const tap = (page, sel) => page.evaluate((s) => [...document.querySelectorAll(s)].find((e) => e.getBoundingClientRect().width > 0)?.click(), sel)
const clickText = (page, sel, text) => page.evaluate((s, t) => [...document.querySelectorAll(s)].find((el) => el.textContent.includes(t))?.click(), sel, text)
const closeAll = async (page) => {
  await page.keyboard.press('Escape')
  await wait(450)
}
async function fresh(vp, { mode = 'day', demoFlag = false, session } = {}) {
  const ctx = await browser.createBrowserContext()
  const page = await ctx.newPage()
  const errors = []
  const writes = []
  page.on('pageerror', (e) => errors.push(String(e)))
  // what leaves the browser for the server, other than reading
  page.on('request', (r) => r.url().startsWith(API) && r.method() !== 'GET' && r.method() !== 'OPTIONS' && writes.push(`${r.method()} ${new URL(r.url()).pathname}`))
  await page.setViewport(vp)
  await page.goto(green + '/about', { waitUntil: 'load' })
  await page.evaluate(
    (m, d, s) => {
      localStorage.setItem('nadlanup-mode-v1', JSON.stringify({ mode: m, until: Date.now() + 9e9 }))
      localStorage.setItem('nadlanup-rooms-hint-v1', '1')
      if (d) localStorage.setItem('nadlanup-demo-v1', '1')
      if (s) localStorage.setItem('nadlanup-session-v1', JSON.stringify(s))
    },
    mode,
    demoFlag,
    session ?? null,
  )
  return { ctx, page, errors, writes }
}
const feed = async (page) => {
  await page.goto(green + '/app/community', { waitUntil: 'load' })
  await page.waitForSelector('[data-welcome]', { timeout: 15000 })
  await wait(1500)
}
const openMenu = async (page) => {
  await tap(page, '[data-act="open-profile"]')
  await page.waitForSelector('[data-profile-menu]', { visible: true, timeout: 5000 })
  await wait(500)
}
const openEdit = async (page, by = '[data-act="edit-profile"]') => {
  await openMenu(page)
  await tap(page, by)
  await page.waitForSelector('[data-profile-edit]', { visible: true, timeout: 5000 })
  await wait(600)
}
/** Puts a file in one of the two hidden inputs, as the gallery or the camera would. */
const giveFile = (page, sel, kind = 'photo') =>
  page.evaluate(
    async (s, kind) => {
      let file
      if (kind === 'text') file = new File(['not a picture'], 'note.txt', { type: 'text/plain' })
      else if (kind === 'portrait') {
        // for the screenshots: one of the demo's own invented faces, as a picture from the gallery would be
        const blob = await (await fetch('/NADLANIL-DEMO/green/img/broker-06.webp')).blob()
        file = new File([blob], 'me.webp', { type: 'image/webp' })
      } else {
        // 800 x 400: the left half red, the right half blue, so the cut can be read back
        const c = document.createElement('canvas')
        c.width = 800
        c.height = 400
        const x = c.getContext('2d')
        x.fillStyle = '#e00000'
        x.fillRect(0, 0, 400, 400)
        x.fillStyle = '#0000e0'
        x.fillRect(400, 0, 400, 400)
        const blob = await new Promise((r) => c.toBlob(r, 'image/png'))
        file = new File([blob], 'photo.png', { type: 'image/png' })
      }
      const dt = new DataTransfer()
      dt.items.add(file)
      const input = document.querySelector(s)
      input.files = dt.files
      input.dispatchEvent(new Event('change', { bubbles: true }))
    },
    sel,
    kind,
  )
/** A saved picture, read back: its size and the colour of a few of its points. */
const readPhoto = (page, src, points) =>
  page.evaluate(
    async (src, points) => {
      const im = new Image()
      im.src = src
      await im.decode()
      const c = document.createElement('canvas')
      c.width = im.naturalWidth
      c.height = im.naturalHeight
      const x = c.getContext('2d')
      x.drawImage(im, 0, 0)
      const name = ([r, , b]) => (r > 170 && b < 90 ? 'red' : b > 170 && r < 90 ? 'blue' : 'other')
      return { w: im.naturalWidth, h: im.naturalHeight, kb: Math.round((src.length * 0.75) / 1024), colours: points.map(([a, b]) => name([...x.getImageData(a, b, 1, 1).data])) }
    },
    src,
    points,
  )
/** Types into a field of the screen in place of what is there (the field is brought clear of the save bar first). */
const setField = async (page, name, text) => {
  await page.evaluate((n) => {
    const el = document.querySelector(`[data-profile-edit] [data-f="${n}"]`)
    el.scrollIntoView({ block: 'center' })
    el.focus()
    el.select()
  }, name)
  await page.keyboard.press('Backspace')
  if (text) await page.keyboard.type(text)
}
const same = (a, b) => [...a].sort().join() === [...b].sort().join()
/** Picks a neighbourhood of work the way a person would: a few letters, then the name from the list (23.11.2026) */
const pickHood = async (page, name) => {
  await page.evaluate(() => {
    const el = document.querySelector('[data-places="profile"] [data-f="hood-search"]')
    el.scrollIntoView({ block: 'center' })
    el.focus()
    el.select()
  })
  await page.keyboard.press('Backspace')
  await page.keyboard.type(name)
  await new Promise((r) => setTimeout(r, 700))
  return page.evaluate((n) => {
    const hit = [...document.querySelectorAll('[data-places="profile"] [data-pick]')].find((b) => b.dataset.pick === n)
    if (hit) hit.click()
    else document.querySelector('[data-places="profile"] [data-act="manual"]')?.click()
    return !!hit
  }, name)
}
const formNow = (page) =>
  page.evaluate(() => {
    const f = document.querySelector('[data-profile-edit]')
    if (!f) return null
    const box = (el) => el.getBoundingClientRect()
    const save = f.querySelector('[data-act="save-profile"]')
    return {
      name: f.querySelector('[data-f="name"]').value,
      phone: f.querySelector('[data-f="phone"]').value,
      // since 23.11.2026 the neighbourhoods are picked from the cities' lists, not typed freely
      areas: (f.querySelector('[data-places="profile"]')?.dataset.hoodValue ?? '').split('|').filter(Boolean).join(', '),
      cities: [...f.querySelectorAll('[data-city][aria-checked="true"]')].map((b) => b.dataset.city),
      photo: f.querySelector('.pfe-face img').dataset.photo,
      src: f.querySelector('.pfe-face img').getAttribute('src'),
      errors: Object.fromEntries([...f.querySelectorAll('[data-err]')].map((e) => [e.dataset.err, e.textContent.trim()])),
      focus: document.activeElement?.dataset?.f ?? null,
      saves: f.querySelectorAll('button[type="submit"]').length,
      saveInView: !!save && box(save).bottom <= innerHeight + 1 && box(save).top >= 0,
      small: [...f.querySelectorAll('.pfe-pill, .pfe-chip, .btn, .input, .pfe-face')].filter((e) => box(e).width > 0 && box(e).height < 43.5).map((e) => `${e.className} ${Math.round(box(e).height)}`),
      wide: f.scrollWidth - f.clientWidth,
      labels: [...f.querySelectorAll('.pfe-field > span, .pfe-field > legend')].map((e) => e.textContent.replace(/\s+/g, ' ').trim()),
      privacy: f.querySelector('.pfe-private')?.textContent.trim(),
      note: f.querySelector('.pfe-note')?.textContent.trim(),
      title: f.closest('.modal')?.querySelector('h2')?.textContent.trim(),
      dashes: /[\u2013\u2014]/.test(f.innerText),
    }
  })
/** Who the app says is here: the top bar, the side of the app, and the person's own posts in the feed. */
const whoIsHere = (page, postBody) =>
  page.evaluate((body) => {
    const seen = (el) => !!el && el.getBoundingClientRect().width > 0
    const kind = (src) => (src?.startsWith('data:image/jpeg') ? 'photo' : src?.startsWith('data:image/svg') ? 'initials' : (src ?? null))
    const me = [...document.querySelectorAll('.ta-me')].find(seen)
    const post = body ? [...document.querySelectorAll('.fb.ci')].find((x) => x.textContent.includes(body)) : null
    const side = [...document.querySelectorAll('.side-user')].find(seen)
    return {
      label: me?.getAttribute('aria-label'),
      picture: kind(me?.querySelector('img')?.getAttribute('src')),
      side: side?.querySelector('strong')?.textContent.trim() ?? null,
      sidePicture: kind(side?.querySelector('img')?.getAttribute('src')),
      share: kind(document.querySelector('[data-welcome] img')?.getAttribute('src')),
      post: post?.querySelector('.fb-name')?.textContent.replace(/\s+/g, ' ').trim() ?? null,
      postPicture: kind(post?.querySelector('img')?.getAttribute('src')),
      postCity: post?.querySelector('.fb-city')?.textContent.trim() ?? null,
    }
  }, postBody ?? null)
const publish = async (page, body) => {
  await tap(page, '[data-act="share"]')
  await page.waitForSelector('[data-share-sheet]', { visible: true })
  await tap(page, '[data-intent="post"]')
  await page.waitForSelector('#composer-text', { visible: true })
  await page.type('#composer-text', body)
  await clickText(page, '.composer-modal .btn-gold', 'פרסום')
  await wait(1500)
}

const people = [
  { tag: 'staff', session: staff, was: STAFF, role: 'צוות הקהילה', key: 's:itzik@test.local', phone: '', cities: [], areas: '', areasAfter: 'נווה שאנן, אחוזה', now: 'איציק מהצוות', newPhone: '054-555-0123' },
  { tag: 'broker', session: broker, was: BROKER.name, role: `מתווך, ${BROKER.office_name}`, key: `m:${broker.member?.id}`, phone: BROKER.phone, cities: BROKER.cities, areas: BROKER.areas, areasAfter: 'כרמל, נווה שאנן, אחוזה', now: 'נועם א.', newPhone: '054-555-0188' },
]
for (const [dev, vp] of [
  ['phone', PHONE],
  ['desktop', DESK],
].filter(([d]) => !process.env.ONLY || process.env.ONLY === d)) {
  for (const p of people) {
    const t = `${dev}, ${p.tag}`
    const { ctx, page, errors, writes } = await fresh(vp, { session: p.session })
    const shot = (n) => page.screenshot({ path: `${out}/${dev}-${p.tag}-${n}.png` })
    await feed(page)
    const POST = `פוסט של ${p.tag} מלפני העריכה`
    await publish(page, POST)

    // ---------------------------------------------------------------- 1. the menu
    await openMenu(page)
    const menu = await page.evaluate(() => {
      const m = document.querySelector('[data-profile-menu]')
      const kids = [...m.children]
      const row = m.querySelector('[data-act="edit-profile"]')
      return {
        order: kids.slice(0, 2).map((k) => k.dataset.act ?? k.className),
        whoIsButton: m.querySelector('.pfm-who')?.tagName === 'BUTTON',
        text: row?.querySelector('b')?.textContent.trim(),
        h: row ? Math.round(row.getBoundingClientRect().height) : 0,
        rest: ['[data-upgrade="menu"]', '[data-look]', '[data-act="sign-out"]'].map((s) => !!m.querySelector(s)),
        admin: !!m.querySelector('[data-act="to-admin"]'),
        last: m.lastElementChild?.dataset.act,
      }
    })
    check(`${t}: "עריכת פרופיל" is the first row under the name, a full touch size`, menu.order.join() === 'edit-profile-who,edit-profile' && menu.text === 'עריכת פרופיל' && menu.h >= 44, menu)
    check(`${t}: nothing else left the menu (upgrade, day or night, the way out${p.tag === 'staff' ? ', the approvers\' screen' : ''})`, menu.rest.every(Boolean) && menu.admin === (p.tag === 'staff') && menu.last === 'sign-out', menu)
    await shot('1-menu')
    await closeAll(page)

    // the row, the picture and the name each open the screen
    const ways = []
    for (const by of ['[data-act="edit-profile"]', '[data-act="edit-profile-who"] .avatar', '[data-act="edit-profile-who"] strong']) {
      await openMenu(page)
      await tap(page, by)
      const opened = !!(await page.waitForSelector('[data-profile-edit]', { visible: true, timeout: 4000 }).catch(() => null))
      await wait(400)
      ways.push(opened && !(await page.$('[data-profile-menu]')))
      await closeAll(page)
    }
    check(`${t}: the row, the picture and the name each open the edit screen (and the menu steps aside)`, ways.every(Boolean), ways)

    // ---------------------------------------------------------------- 2. the screen
    await openEdit(page)
    let f = await formNow(page)
    check(`${t}: the screen opens with what the person has now`, f.title === 'עריכת פרופיל' && f.name === p.was && f.phone === p.phone && f.areas === p.areas && same(f.cities, p.cities) && f.photo === 'initials' && f.src.startsWith('data:image/svg'), f)
    check(
      `${t}: a picture, a name, a phone, cities, neighbourhoods (optional), and one "שמירה" that is always in reach`,
      f.labels.join(' | ') === 'שם תצוגה או כינוי | טלפון | ערים שעובדים בהן | שכונות עבודה לא חובה' && f.saves === 1 && f.saveInView && f.small.length === 0 && f.wide <= 1 && !f.dashes,
      f,
    )
    check(`${t}: it says the phone is not shown in the feed, and that the details stay on this device for now`, f.privacy === 'לא מוצג לאחרים בפיד.' && f.note === 'בינתיים הפרטים נשמרים במכשיר הזה בלבד.', { p: f.privacy, n: f.note })
    await shot('2-edit-screen')

    // a name is needed; a phone that is typed must be whole
    await setField(page, 'name', '')
    await setField(page, 'phone', '123')
    await tap(page, '[data-act="save-profile"]')
    await wait(400)
    f = await formNow(page)
    const untouched = await page.evaluate((k) => localStorage.getItem(`nadlanup-profile-v1:${k}`), p.key)
    check(`${t}: without a name, or with a short phone, nothing is saved: the reason is under the field and the first one is ready to type`, !!f && !!f.errors.name && !!f.errors.phone && f.focus === 'name' && untouched === null, { f, untouched })
    await shot('3-errors')

    // ---------------------------------------------------------------- the picture: not a picture, then the cut
    await giveFile(page, '[data-f="photo-gallery"]', 'text')
    await wait(400)
    f = await formNow(page)
    check(`${t}: a file that is not a picture is refused with a clear line`, !!f && /לא תמונה/.test(f.errors.photo ?? '') && f.photo === 'initials', f?.errors)

    const inputs = await page.evaluate(() => ['photo-gallery', 'photo-camera'].map((n) => { const i = document.querySelector(`[data-f="${n}"]`); return { accept: i.accept, capture: i.getAttribute('capture') } }))
    check(`${t}: one button opens the gallery and the other the camera`, inputs[0].accept === 'image/*' && inputs[0].capture === null && inputs[1].accept === 'image/*' && inputs[1].capture === 'user', inputs)

    await giveFile(page, '[data-f="photo-camera"]')
    await page.waitForSelector('[data-crop] [data-stage] img', { visible: true, timeout: 5000 })
    await wait(500)
    const stage = await page.evaluate(() => {
      const s = document.querySelector('[data-stage]')
      const r = s.getBoundingClientRect()
      const im = s.querySelector('img').getBoundingClientRect()
      return { x: r.left + r.width / 2, y: r.top + r.height / 2, side: Math.round(r.width), square: Math.abs(r.width - r.height) < 1, ring: getComputedStyle(s.querySelector('.pfe-ring')).borderRadius, covers: im.left <= r.left + 0.5 && im.right >= r.right - 0.5 && im.top <= r.top + 0.5 && im.bottom >= r.bottom - 0.5, imgW: Math.round(im.width), wide: document.documentElement.scrollWidth - document.documentElement.clientWidth }
    })
    check(`${t}: the picture opens under a round window that it always covers`, stage.square && stage.ring === '50%' && stage.covers && stage.imgW === stage.side * 2 && stage.wide <= 1, stage)
    // dragged 60 px to the right: more of the left (red) half comes into the window
    await page.mouse.move(stage.x, stage.y)
    await page.mouse.down()
    await page.mouse.move(stage.x + 30, stage.y, { steps: 4 })
    await page.mouse.move(stage.x + 60, stage.y, { steps: 4 })
    await page.mouse.up()
    // ... and far beyond the edge: it stops where the picture ends
    await page.mouse.move(stage.x, stage.y)
    await page.mouse.down()
    await page.mouse.move(stage.x + 900, stage.y + 500, { steps: 6 })
    await page.mouse.up()
    const held = await page.evaluate(() => {
      const s = document.querySelector('[data-stage]').getBoundingClientRect()
      const im = document.querySelector('[data-stage] img').getBoundingClientRect()
      return { covers: im.left <= s.left + 0.5 && im.right >= s.right - 0.5 && im.top <= s.top + 0.5 && im.bottom >= s.bottom - 0.5, atEdge: Math.abs(im.left - s.left) < 1 }
    })
    check(`${t}: dragged past its edge the picture stops, still covering the window`, held.covers && held.atEdge, held)
    // back to 60 px right of the middle, with the keyboard too (5 steps of 12 px to the left from the edge: 132 - 60 = 72 = 6 steps)
    await page.focus('[data-stage]')
    for (let i = 0; i < 6; i++) await page.keyboard.press('ArrowLeft')
    await wait(200)
    await tap(page, '[data-act="crop-done"]')
    await page.waitForSelector('[data-profile-edit]', { visible: true, timeout: 5000 })
    await wait(400)
    f = await formNow(page)
    // 60 px in a window of 264 is about 73 px in a picture of 320: the border between red and blue is at 160 + 73
    const cut = f.photo === 'own' ? await readPhoto(page, f.src, [[40, 160], [200, 160], [225, 160], [245, 160], [300, 160], [200, 20], [200, 300]]) : null
    check(`${t}: the cut is what was in the window: a small square picture (320 px, a few dozen KB at most)`, !!cut && f.src.startsWith('data:image/jpeg') && cut.w === 320 && cut.h === 320 && cut.kb <= 60 && cut.colours.join() === 'red,red,red,blue,blue,red,red', cut)
    const round = await page.evaluate(() => getComputedStyle(document.querySelector('.pfe-face img')).borderRadius)
    check(`${t}: it is shown round, with a way to take it off`, round === '50%' && !!(await page.$('[data-act="remove-photo"]')), round)

    // the zoom: bigger with the slider, and never smaller than the window
    await giveFile(page, '[data-f="photo-gallery"]')
    await page.waitForSelector('[data-crop] [data-stage] img', { visible: true, timeout: 5000 })
    await wait(300)
    await page.evaluate(() => document.querySelector('.pfe-zoom button[aria-label="הגדלה"]').click())
    await wait(200)
    const zoomed = await page.evaluate(() => ({ w: Math.round(document.querySelector('[data-stage] img').getBoundingClientRect().width), v: Number(document.querySelector('[data-f="zoom"]').value), min: document.querySelector('[data-f="zoom"]').min, minus: document.querySelector('.pfe-zoom button[aria-label="הקטנה"]').disabled }))
    check(`${t}: the picture can be made bigger`, zoomed.v === 1.25 && zoomed.w === Math.round(stage.side * 2 * 1.25) && zoomed.min === '1' && !zoomed.minus, zoomed)
    await tap(page, '[data-act="crop-cancel"]')
    await page.waitForSelector('[data-profile-edit]', { visible: true, timeout: 5000 })
    f = await formNow(page)
    check(`${t}: "ביטול" in the cut keeps the picture that was chosen before`, f.photo === 'own' && f.src.startsWith('data:image/jpeg'))
    // a face in place of the two colours, for the pictures of this check
    await giveFile(page, '[data-f="photo-gallery"]', 'portrait')
    await page.waitForSelector('[data-crop] [data-stage] img', { visible: true, timeout: 5000 })
    await wait(600)
    await shot('4-crop')
    await tap(page, '[data-act="crop-done"]')
    await page.waitForSelector('[data-profile-edit]', { visible: true, timeout: 5000 })
    await wait(300)

    // ---------------------------------------------------------------- 3. save: everywhere at once, with no reload
    await setField(page, 'name', p.now)
    await setField(page, 'phone', p.newPhone)
    if (p.tag === 'broker') await tap(page, '[data-city="נתניה"]') // one city off
    await setField(page, 'other-city', 'קריית אתא')
    await page.keyboard.press('Enter')
    const fromList = [await pickHood(page, 'נווה שאנן'), await pickHood(page, 'אחוזה')]
    await wait(300)
    f = await formNow(page)
    check(`${t}: the lines of "what is wrong" leave once the fields are put right`, Object.keys(f.errors).length === 0, f.errors)
    const CITIES = p.tag === 'broker' ? ['חיפה', 'קריית אתא'] : ['קריית אתא']
    check(`${t}: a city that is not in the list is added from the field`, same(f.cities, CITIES), f.cities)
    const clear = await page.evaluate(() => {
      const el = document.querySelector('[data-places="profile"] [data-f="hood-search"]').getBoundingClientRect()
      const bar = document.querySelector('.pfe-foot').getBoundingClientRect()
      return { field: Math.round(el.bottom), bar: Math.round(bar.top), ok: el.bottom <= bar.top + 14 }
    })
    check(`${t}: the box being typed in is not under the save bar`, clear.ok, clear)
    // a city whose list the site has (חיפה) gives the names from the list; one with no list (קריית אתא) keeps what was typed
    check(`${t}: the neighbourhoods are picked, each one a chip, and what was there before stays`, f.areas === p.areasAfter && (p.tag !== 'broker' || fromList.every(Boolean)), { fromList, areas: f.areas, want: p.areasAfter })
    await shot('5-filled')
    await page.evaluate(() => (window.__sameDocument = true))
    const sessionBefore = await page.evaluate(() => localStorage.getItem('nadlanup-session-v1'))
    writes.length = 0
    await tap(page, '[data-act="save-profile"]')
    await wait(1400)
    const after = await page.evaluate((k) => ({
      same: window.__sameDocument === true,
      closed: !document.querySelector('[data-profile-edit]'),
      toast: document.querySelector('.toast')?.textContent ?? '',
      kept: JSON.parse(localStorage.getItem(`nadlanup-profile-v1:${k}`) ?? 'null'),
      path: location.pathname,
    }), p.key)
    check(`${t}: "שמירה" closes the screen and says "הפרופיל נשמר", on the same page with no reload`, after.same && after.closed && after.toast.includes('הפרופיל נשמר') && after.path.endsWith('/app/community'), after)
    let here = await whoIsHere(page, POST)
    check(
      `${t}: at once the top bar, the share line${dev === 'desktop' ? ', the side of the app' : ''} and the person's own post carry the new name and picture`,
      here.label === `החשבון של ${p.now}` && here.picture === 'photo' && here.share === 'photo' && here.post?.startsWith(p.now) && here.postPicture === 'photo' && (dev !== 'desktop' || (here.side === p.now && here.sidePicture === 'photo')),
      here,
    )
    await shot('6-saved-feed')
    await openMenu(page)
    const m2 = await page.evaluate(() => {
      const m = document.querySelector('[data-profile-menu]')
      return { name: m.querySelector('.pfm-who strong')?.textContent.trim(), role: m.querySelector('.pfm-who small')?.textContent.trim(), photo: m.querySelector('.pfm-who img')?.getAttribute('src')?.slice(0, 15) }
    })
    check(`${t}: the menu too`, m2.name === p.now && m2.role === p.role && m2.photo === 'data:image/jpeg', m2)
    await shot('7-saved-menu')
    await closeAll(page)

    // ---------------------------------------------------------------- 5. in this browser only
    const sessionAfter = await page.evaluate(() => localStorage.getItem('nadlanup-session-v1'))
    const onServer = await api('/api/me', { token: p.session.token })
    check(
      `${t}: nothing was sent to the server: what the person signed up with is as it was there`,
      writes.length === 0 && JSON.parse(sessionAfter).token === JSON.parse(sessionBefore).token && (p.tag === 'staff' ? onServer.staff?.name === p.was : onServer.member?.name === p.was && onServer.member?.phone === p.phone),
      { writes, onServer },
    )
    check(`${t}: it is kept in this browser under the person's own key`, after.kept?.name === p.now && after.kept?.phone === p.newPhone && after.kept?.cities.join() === CITIES.join() && after.kept?.areas === p.areasAfter && after.kept?.photo.startsWith('data:image/jpeg'), { ...after.kept, photo: after.kept?.photo?.slice(0, 20) })

    // ---------------------------------------------------------------- 6. the phone stays out of the feed
    const digits = p.newPhone.replace(/\D/g, '')
    const leak = async () =>
      page.evaluate((d) => {
        const flat = (s) => s.replace(/\D/g, '')
        const hits = []
        if (flat(document.body.innerText).includes(d)) hits.push('text')
        document.querySelectorAll('body *').forEach((el) => {
          for (const a of el.attributes) if (a.value.length < 400 && flat(a.value).includes(d)) hits.push(`${el.tagName.toLowerCase()}[${a.name}]`)
        })
        return hits
      }, digits)
    const leaks = {}
    for (const path of ['/app/community', '/app/brokers']) {
      await page.goto(green + path, { waitUntil: 'load' })
      await wait(1300)
      const h = await leak()
      if (h.length) leaks[path] = h
    }
    check(`${t}: the phone is not in the feed and not in the list of brokers`, Object.keys(leaks).length === 0, leaks)

    // ---------------------------------------------------------------- after a reload, and a new post
    await feed(page)
    here = await whoIsHere(page, POST)
    check(`${t}: after the page is loaded again the new name and picture are still there`, here.label === `החשבון של ${p.now}` && here.picture === 'photo' && here.post?.startsWith(p.now) && here.postPicture === 'photo', here)
    const POST2 = `פוסט של ${p.tag} אחרי העריכה`
    await publish(page, POST2)
    here = await whoIsHere(page, POST2)
    check(`${t}: a new post is signed with the new name and picture, in the person's first city`, here.post?.startsWith(p.now) && here.postPicture === 'photo' && here.postCity === CITIES[0], here)
    if (dev === 'desktop') {
      await page.goto(green + '/app/brokers', { waitUntil: 'load' })
      await wait(1300)
      const card = await page.evaluate((n) => [...document.querySelectorAll('.broker-card, [class*="broker"]')].some((c) => c.textContent.includes(n)), p.now)
      check(`${t}: the list of brokers ${p.tag === 'broker' ? 'shows the broker under the new name' : 'still does not list one of the staff'}`, card === (p.tag === 'broker'), card)
      await feed(page)
    }

    // ---------------------------------------------------------------- 4. the picture taken off: the initials are back
    await openEdit(page, '[data-act="edit-profile-who"]')
    f = await formNow(page)
    check(`${t}: the screen opens again with what was saved`, f.name === p.now && f.phone === p.newPhone && same(f.cities, CITIES) && f.areas === p.areasAfter && f.photo === 'own', { ...f, src: f.src.slice(0, 20) })
    await tap(page, '[data-act="remove-photo"]')
    await wait(200)
    await tap(page, '[data-act="save-profile"]')
    await wait(1300)
    here = await whoIsHere(page, POST2)
    check(`${t}: with the picture taken off, the initials show everywhere again`, here.label === `החשבון של ${p.now}` && here.picture === 'initials' && here.share === 'initials' && here.postPicture === 'initials', here)

    // ---------------------------------------------------------------- per person: somebody else on this device
    const other = people.find((x) => x !== p)
    await page.evaluate((s) => localStorage.setItem('nadlanup-session-v1', JSON.stringify(s)), other.session)
    await feed(page)
    const theirs = await whoIsHere(page)
    await page.evaluate((s) => localStorage.setItem('nadlanup-session-v1', JSON.stringify(s)), p.session)
    await feed(page)
    const mineAgain = await whoIsHere(page, POST2)
    check(`${t}: somebody else who signs in on this device is themselves; back in, the person's own edit is there`, theirs.label === `החשבון של ${other.was}` && mineAgain.label === `החשבון של ${p.now}` && mineAgain.post?.startsWith(p.now), { theirs, mineAgain })

    check(`${t}: no script error on the way`, errors.length === 0, errors)
    await ctx.close()
  }

  // ---------------------------------------------------------------- night: the screen and the cut
  {
    const { ctx, page } = await fresh(vp, { mode: 'night', session: broker })
    await feed(page)
    await openEdit(page)
    await page.screenshot({ path: `${out}/${dev}-night-edit.png` })
    const ink = await page.evaluate(() => {
      const lum = (c) => {
        const [r, g, b] = c.match(/[\d.]+/g).map(Number).map((v) => (v / 255 <= 0.03928 ? v / 255 / 12.92 : ((v / 255 + 0.055) / 1.055) ** 2.4))
        return 0.2126 * r + 0.7152 * g + 0.0722 * b
      }
      const bg = getComputedStyle(document.querySelector('.modal')).backgroundColor
      const ratio = (el) => {
        const a = lum(getComputedStyle(el).color)
        const b = lum(bg)
        return Math.round(((Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)) * 10) / 10
      }
      return { label: ratio(document.querySelector('.pfe-field > span')), hint: ratio(document.querySelector('.pfe-field small')), pill: ratio(document.querySelector('.pfe-pill')) }
    })
    check(`${dev}, night: the labels, the hints and the picture's buttons read well`, ink.label >= 4.5 && ink.hint >= 4.5 && ink.pill >= 4.5, ink)
    await ctx.close()
  }

  // ---------------------------------------------------------------- 7. the example account of a presentation
  {
    const { ctx, page } = await fresh(vp, { demoFlag: true })
    await feed(page)
    await openMenu(page)
    const demoMenu = await page.evaluate(() => {
      const m = document.querySelector('[data-profile-menu]')
      return { edit: !!m.querySelector('[data-act="edit-profile"]'), who: m.querySelector('.pfm-who')?.tagName, name: m.querySelector('.pfm-who strong')?.textContent.trim(), signIn: !!m.querySelector('[data-signin="menu"]') }
    })
    check(`${dev}, the demo: the example account has no "עריכת פרופיל", and the rest of its menu is as it was`, !demoMenu.edit && demoMenu.who === 'DIV' && demoMenu.name === 'מאיה לנדאו' && demoMenu.signIn, demoMenu)
    await ctx.close()
  }

  // ---------------------------------------------------------------- 8. the home page: nobody's agent card
  {
    const { ctx, page } = await fresh(vp)
    await page.goto(green + '/', { waitUntil: 'load' })
    await wait(1400)
    await page.evaluate(() => document.querySelector('.agt-pv')?.scrollIntoView({ block: 'center' }))
    await wait(1400)
    const card = await page.evaluate(() => {
      const c = document.querySelector('.agt-pv .agp-mini-photo')
      const fig = c?.querySelector('[data-nobody]')
      const r = fig?.getBoundingClientRect()
      const b = c?.getBoundingClientRect()
      const h = document.querySelector('.agt-pv h3')
      const lum = (c) => {
        const [r, g, b] = c.match(/[\d.]+/g).map(Number).map((v) => (v / 255 <= 0.03928 ? v / 255 / 12.92 : ((v / 255 + 0.055) / 1.055) ** 2.4))
        return 0.2126 * r + 0.7152 * g + 0.0722 * b
      }
      // the card is white by day: the name's ink must be dark on it
      const ink = h ? lum(getComputedStyle(h).color) : 1
      return { ink: Math.round(ink * 100) / 100, figure: !!fig, mark: c?.textContent.includes('?'), fills: !!r && !!b && Math.abs(r.width - b.width) < 1 && Math.abs(r.height - b.height) < 1, fill: fig ? getComputedStyle(fig).fill : null, name: document.querySelector('.agt-pv h3')?.textContent.trim() }
    })
    check(`${dev}, a visitor: the agent card on the home page shows a plain figure, not a question mark`, card.figure && !card.mark && card.fills && card.name === 'השם שלכם יופיע כאן' && card.ink < 0.2, card)
    await page.screenshot({ path: `${out}/${dev}-home-agent-card.png` })
    await ctx.close()
  }
}

console.log(fails ? `\n${fails} CHECK(S) FAILED` : '\nALL CHECKS PASSED')
// on Windows closing the browser can fail while it removes its temporary profile: the verdict is already printed
process.on('uncaughtException', () => process.exit(fails ? 1 : 0))
await Promise.race([browser.close().catch(() => {}), wait(5000)])
process.exit(fails ? 1 : 0)
