/**
 * The e-mails and the small pages the server shows. Everything a broker typed is escaped before it is put in HTML.
 * E-mail HTML is tables and inline styles on purpose: that is what mail programs draw reliably, right to left too.
 */
export const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])

const COMMUNITY = 'מתווכים לעסקאות'
const ABOUT = 'הקהילה החינמית שמחברת בין מתווכים מכל הארץ, לשיתוף נכסים, איתור קונים, התייעצויות ויצירת הזדמנויות עסקיות.'
const GREEN = '#0a7a4f'
const DEEP = '#043b2b'
const INK = '#10241b'
const DIM = '#47604f'
const FONT = "'Heebo','Assistant',Arial,Helvetica,sans-serif"

const logo = (site) => `${site}/brand/nadlanup-light.png`
const work = (m) => (m.work === 'office' ? `במשרד: ${m.office_name}` : 'עצמאי')
const citiesOf = (m) => {
  try {
    return JSON.parse(m.cities).join(', ')
  } catch {
    return ''
  }
}

/** What the check of the licence number found (24.11.2026). */
export const licenseWord = (m) =>
  m.license_status === 'verified'
    ? 'אומת. השם מתוך רשם המתווכים'
    : m.license_status === 'not_found'
      ? 'לא נמצא במאגר. לבדוק ידנית'
      : m.license_status === 'unavailable'
        ? 'המאגר לא ענה. לבדוק ידנית'
        : 'לא נבדק'

/** The details a broker filled in, as rows (label, value). */
export const detailRows = (m) => [
  ['שם מלא', m.name],
  ['טלפון', m.phone],
  ['מייל', m.email],
  ['מספר רישיון תיווך', m.license],
  ['בדיקה מול רשם המתווכים', licenseWord(m)],
  ['עובד במשרד או עצמאי', work(m)],
  ['ערים', citiesOf(m)],
  ['שכונות ואזורים', m.areas || 'לא צוין'],
]

const button = (href, label, solid = true) =>
  `<a href="${esc(href)}" style="display:inline-block;padding:14px 30px;border-radius:999px;font-family:${FONT};font-size:17px;font-weight:700;text-decoration:none;${
    solid ? `background:${GREEN};color:#ffffff;border:2px solid ${GREEN};` : `background:#ffffff;color:${INK};border:2px solid #c9d8d0;`
  }">${esc(label)}</a>`

/** The frame every e-mail shares: the logo, a white card, a quiet footer. */
function frame(site, inner, { preheader = '', foot = '' } = {}) {
  return `<!doctype html>
<html lang="he" dir="rtl">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light only"></head>
<body style="margin:0;padding:0;background:#eef6f1;">
${preheader ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${esc(preheader)}</div>` : ''}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#eef6f1;">
<tr><td align="center" style="padding:28px 14px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;">
    <tr><td align="center" style="padding:6px 0 20px;">
      <img src="${esc(logo(site))}" alt="NadlanUP" width="168" style="display:block;width:168px;height:auto;border:0;">
    </td></tr>
    <tr><td dir="rtl" style="background:#ffffff;border-radius:22px;border:1px solid #d7e6dd;padding:32px 28px;font-family:${FONT};color:${INK};text-align:right;">
      ${inner}
    </td></tr>
    <tr><td dir="rtl" align="center" style="padding:18px 10px 0;font-family:${FONT};font-size:13px;line-height:1.6;color:#6b8275;text-align:center;">
      ${foot ? `${foot}<br>` : ''}${COMMUNITY}, מבית NadlanUP
    </td></tr>
  </table>
</td></tr>
</table>
</body>
</html>`
}

const h1 = (t) => `<h1 style="margin:0 0 12px;font-family:${FONT};font-size:26px;line-height:1.25;font-weight:700;color:${INK};">${t}</h1>`
const p = (t, extra = '') => `<p style="margin:0 0 14px;font-family:${FONT};font-size:17px;line-height:1.6;color:${DIM};${extra}">${t}</p>`

const table = (rows) =>
  `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:18px 0 24px;border:1px solid #d7e6dd;border-radius:14px;border-collapse:separate;overflow:hidden;">${rows
    .map(
      ([k, v], i) =>
        `<tr><td dir="rtl" style="padding:11px 14px;font-family:${FONT};font-size:15px;color:${DIM};text-align:right;width:44%;${i ? 'border-top:1px solid #e6efe9;' : ''}">${esc(k)}</td><td dir="rtl" style="padding:11px 14px;font-family:${FONT};font-size:15px;font-weight:700;color:${INK};text-align:right;${i ? 'border-top:1px solid #e6efe9;' : ''}">${esc(v) || '&nbsp;'}</td></tr>`,
    )
    .join('')}</table>`

// ---------------------------------------------------------------- the e-mails

/** To an approver: someone asked to join. Two buttons, each a one-time link. */
export function approvalMail({ site, approver, member, yes, no, hours }) {
  const subject = `${member.is_test ? '(בדיקה) ' : ''}בקשת הצטרפות לקהילה: ${member.name}`
  const html = frame(
    site,
    `${h1(`היי ${esc(approver.name)},`)}
     ${p(`המתווך <b style="color:${INK};">${esc(member.name)}</b> מעוניין להצטרף לקהילה. האם אתה מאשר?`)}
     ${member.is_test ? p('זו בקשת בדיקה, שנוצרה ממסך הניהול.', 'font-size:14px;color:#8a5a00;') : ''}
     ${table(detailRows(member))}
     <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 6px;"><tr>
       <td style="padding-left:10px;">${button(yes, 'כן, לאשר')}</td>
       <td>${button(no, 'לא', false)}</td>
     </tr></table>`,
    { preheader: `${member.name} מעוניין להצטרף לקהילה`, foot: `הכפתורים בתוקף ל-${hours} שעות, ופועלים פעם אחת. אחר כך אפשר לטפל בבקשה ממסך הניהול.` },
  )
  const text = [`היי ${approver.name},`, `המתווך ${member.name} מעוניין להצטרף לקהילה. האם אתה מאשר?`, '', ...detailRows(member).map(([k, v]) => `${k}: ${v}`), '', `כן, לאשר: ${yes}`, `לא: ${no}`].join('\n')
  return { subject, html, text }
}

/** To the broker: approved. One button that signs him in. */
export function welcomeMail({ site, member, enter }) {
  const subject = `ברוכים הבאים לקהילת ${COMMUNITY}`
  const html = frame(
    site,
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 22px;"><tr><td align="center" style="background:${DEEP};background-image:linear-gradient(140deg,${DEEP},${GREEN});border-radius:18px;padding:30px 20px;">
       <div style="font-family:${FONT};font-size:15px;font-weight:700;color:#9ff0c9;">ברוכים הבאים</div>
       <div style="font-family:${FONT};font-size:34px;line-height:1.15;font-weight:700;color:#ffffff;padding-top:6px;">${COMMUNITY}</div>
       <div style="font-family:${FONT};font-size:14px;color:#d6f3e4;padding-top:4px;">מבית NadlanUP</div>
     </td></tr></table>
     ${h1(`היי ${esc(member.name)}, אושרת`)}
     ${p('הבקשה שלך להצטרף לקהילה אושרה. מעכשיו אפשר להיכנס.')}
     ${p(ABOUT)}
     <div style="padding:10px 0 4px;">${button(enter, 'כניסה לקהילה')}</div>`,
    { preheader: 'הבקשה שלך אושרה. מעכשיו אפשר להיכנס לקהילה.', foot: 'כפתור הכניסה בתוקף ל-7 ימים ופועל פעם אחת. אחר כך אפשר לבקש קישור כניסה חדש בדף הכניסה של הקהילה.' },
  )
  const text = [`היי ${member.name}, אושרת.`, 'הבקשה שלך להצטרף לקהילה אושרה. מעכשיו אפשר להיכנס.', '', ABOUT, '', `כניסה לקהילה: ${enter}`].join('\n')
  return { subject, html, text }
}

/**
 * To the broker: not approved, with the approver's short reason and a way to sign up again.
 * Written to look like the two e-mails that reach the inbox (a personal subject, a real button to the site, a full
 * plain-text twin) and with no hidden preview text, the trick a spam filter weighs most in a short e-mail.
 */
export const againUrl = (site) => `${site}/kehila/join?again=1`
export function rejectMail({ site, member, reason }) {
  const again = againUrl(site)
  const subject = `${member.name}, הבקשה שלך להצטרף ל${COMMUNITY}`
  const html = frame(
    site,
    `${h1(`היי ${esc(member.name)},`)}
     ${p('תודה שביקשת להצטרף לקהילה. עברנו על הפרטים, ולצערנו לא נוכל לאשר את הבקשה בשלב הזה.')}
     <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:6px 0 20px;"><tr><td dir="rtl" style="background:#f3f8f5;border-right:4px solid ${GREEN};border-radius:12px;padding:14px 16px;font-family:${FONT};text-align:right;">
       <div style="font-size:13px;font-weight:700;color:${DIM};">הסיבה</div>
       <div style="font-size:17px;line-height:1.55;color:${INK};padding-top:4px;white-space:pre-line;">${esc(reason)}</div>
     </td></tr></table>
     ${p('אם תיקנת את מה שחסר, אפשר להירשם שוב עם אותה כתובת מייל. הבקשה החדשה תגיע אלינו ונבדוק אותה מחדש.')}
     <div style="padding:6px 0 18px;">${button(again, 'להרשמה מחדש')}</div>
     ${p('יש שאלה? אפשר פשוט להשיב למייל הזה.', 'font-size:15px;margin:0;')}`,
    { foot: 'קהילה חינמית למתווכי נדל"ן עם רישיון.' },
  )
  const text = [
    `היי ${member.name},`,
    '',
    'תודה שביקשת להצטרף לקהילה. עברנו על הפרטים, ולצערנו לא נוכל לאשר את הבקשה בשלב הזה.',
    '',
    `הסיבה: ${reason}`,
    '',
    'אם תיקנת את מה שחסר, אפשר להירשם שוב עם אותה כתובת מייל. הבקשה החדשה תגיע אלינו ונבדוק אותה מחדש.',
    `להרשמה מחדש: ${again}`,
    '',
    'יש שאלה? אפשר פשוט להשיב למייל הזה.',
    '',
    `${COMMUNITY}, מבית NadlanUP`,
  ].join('\n')
  return { subject, html, text }
}

/** A sign-in link, for a broker or for staff. */
export function loginMail({ site, name, enter, minutes, code, codeMinutes }) {
  // the code leads the subject, so a phone can show it and offer it on the keyboard (Itzik 18.11.2026)
  const subject = code ? `${code} הוא קוד הכניסה שלך` : 'קישור הכניסה שלך'
  const digits = code
    ? `<div dir="ltr" style="margin:6px 0 20px;padding:18px 10px;border-radius:18px;background:#eef8f2;border:1px solid #cfe6d9;text-align:center;">
         <div style="font-family:${FONT};font-size:14px;font-weight:700;color:${DIM};margin-bottom:6px;" dir="rtl">קוד הכניסה שלך</div>
         <div style="font-family:'SF Mono',Menlo,Consolas,'Courier New',monospace;font-size:38px;line-height:1.1;font-weight:800;letter-spacing:10px;color:${DEEP};">${esc(code)}</div>
       </div>`
    : ''
  const html = frame(
    site,
    `${h1(`היי ${esc(name)},`)}
     ${code ? p('ביקשת להיכנס. באפליקציה מקלידים את הקוד, ובמחשב אפשר פשוט ללחוץ על הכפתור. בלי סיסמה.') : p('ביקשת להיכנס. לחיצה על הכפתור מכניסה אותך, בלי סיסמה.')}
     ${digits}
     <div style="padding:4px 0 4px;">${button(enter, 'כניסה בלחיצה')}</div>`,
    {
      preheader: code ? `${code} הוא קוד הכניסה שלך. הוא בתוקף ל-${codeMinutes} דקות.` : 'קישור הכניסה שביקשת.',
      foot: code
        ? `הקוד בתוקף ל-${codeMinutes} דקות והקישור ל-${minutes} דקות, וכל אחד מהם פועל פעם אחת. לא ביקשת להיכנס? אפשר להתעלם מהמייל הזה.`
        : `הקישור בתוקף ל-${minutes} דקות ופועל פעם אחת. אם לא ביקשת להיכנס, אפשר להתעלם מהמייל הזה.`,
    },
  )
  const text = [
    `היי ${name},`,
    ...(code ? ['ביקשת להיכנס. קוד הכניסה שלך:', code, '', `הקוד בתוקף ל-${codeMinutes} דקות ופועל פעם אחת.`, '', 'או בלחיצה על הקישור:'] : ['ביקשת להיכנס. הקישור הבא מכניס אותך, בלי סיסמה:']),
    enter,
    '',
    `הקישור בתוקף ל-${minutes} דקות ופועל פעם אחת.`,
  ].join('\n')
  return { subject, html, text }
}

/** To staff: someone asked for details on the office page (24.11.2026). Staff only: it carries a name and a phone. */
export function leadMail({ site, person, lead, test }) {
  const when = new Date(lead.created_at).toLocaleString('he-IL', { timeZone: 'Asia/Jerusalem', dateStyle: 'short', timeStyle: 'short' })
  const rows = [
    ['שם', lead.name],
    ['טלפון', lead.phone],
    ['עיר', lead.city],
    ['הערה', lead.note || 'לא נכתבה הערה'],
    ['מתי', when],
  ]
  const subject = `${test ? '(בדיקה) ' : ''}ליד חדש מהאתר: ${lead.name}, ${lead.city}`
  const html = frame(
    site,
    `${h1(`היי ${esc(person.name)},`)}
     ${p('מישהו השאיר פרטים בדף ההצטרפות למשרד, וביקש לקבל מידע.')}
     ${test ? p('זה ליד של בדיקה מהשרת המקומי.', 'font-size:14px;color:#8a5a00;') : ''}
     ${table(rows)}
     <div style="padding:4px 0 4px;">${button(`${site}/kehila/admin#leads`, 'לכל הלידים')}</div>`,
    { preheader: `${lead.name} מ${lead.city} ביקש לקבל מידע`, foot: 'הפרטים של הליד מיועדים לצוות בלבד.' },
  )
  const text = [`היי ${person.name},`, 'מישהו השאיר פרטים בדף ההצטרפות למשרד, וביקש לקבל מידע.', '', ...rows.map(([k, v]) => `${k}: ${v}`), '', `לכל הלידים: ${site}/kehila/admin#leads`].join('\n')
  return { subject, html, text }
}

// ---------------------------------------------------------------- the small pages the buttons open

const pageCss = `
  *{box-sizing:border-box}
  body{margin:0;min-height:100vh;background:radial-gradient(120% 60% at 50% 0%,#e6f6ee,#f6fbf8 60%);font-family:${FONT};color:${INK};display:grid;place-items:center;padding:24px 16px}
  main{width:100%;max-width:520px;background:#fff;border:1px solid #d7e6dd;border-radius:24px;padding:30px 26px;box-shadow:0 30px 60px -40px rgba(4,59,43,.5)}
  img{display:block;width:150px;height:auto;margin:0 auto 22px}
  h1{margin:0 0 10px;font-size:27px;line-height:1.2;font-weight:800}
  p{margin:0 0 14px;font-size:17px;line-height:1.6;color:${DIM}}
  dl{margin:16px 0 22px;border:1px solid #d7e6dd;border-radius:14px;overflow:hidden}
  dl div{display:flex;justify-content:space-between;gap:14px;padding:10px 14px;font-size:15px}
  dl div+div{border-top:1px solid #e6efe9}
  dt{color:${DIM}} dd{margin:0;font-weight:700;text-align:left}
  label{display:block;font-size:15px;font-weight:700;margin-bottom:8px}
  textarea{width:100%;min-height:120px;padding:12px 14px;border:1.5px solid #c9d8d0;border-radius:14px;font:inherit;font-size:17px;line-height:1.5;color:${INK};resize:vertical}
  textarea:focus{outline:0;border-color:${GREEN};box-shadow:0 0 0 3px rgba(10,122,79,.18)}
  button,.btn{display:inline-flex;align-items:center;justify-content:center;min-height:52px;padding:0 28px;border-radius:999px;border:2px solid ${GREEN};background:${GREEN};color:#fff;font:inherit;font-size:17px;font-weight:800;cursor:pointer;text-decoration:none}
  button.quiet,.btn.quiet{background:#fff;color:${INK};border-color:#c9d8d0}
  .row{display:flex;flex-wrap:wrap;gap:10px;margin-top:6px}
  .mark{width:60px;height:60px;border-radius:50%;display:grid;place-items:center;margin:0 auto 16px;background:linear-gradient(150deg,#07643f,#0fa46b);color:#fff;font-size:30px;font-weight:900}
  .mark.grey{background:#e6efe9;color:${DIM}}
  .err{color:#b3261e;font-size:15px;font-weight:700}
  small{display:block;margin-top:16px;font-size:13.5px;color:#6b8275;text-align:center}
`

function page(site, title, body) {
  return `<!doctype html>
<html lang="he" dir="rtl">
<head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow"><meta name="referrer" content="no-referrer">
<title>${esc(title)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link href="https://fonts.googleapis.com/css2?family=Heebo:wght@400;700;800;900&display=swap" rel="stylesheet">
<style>${pageCss}</style>
</head>
<body><main>
<img src="${esc(logo(site))}" alt="NadlanUP">
${body}
<small>${COMMUNITY}, מבית NadlanUP</small>
</main></body></html>`
}

const details = (m) => `<dl>${detailRows(m).map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>`

/**
 * "כן, לאשר" was clicked in the e-mail. The approval itself is a POST: the page sends it by itself as soon as it
 * opens, so one click is enough for a person, while a program that only fetches the link changes nothing.
 */
export const approveConfirmPage = ({ site, member, action }) =>
  page(
    site,
    'אישור הצטרפות',
    `<h1>מאשרים את ${esc(member.name)}?</h1>
     <p>רגע, מאשרים את הבקשה...</p>
     ${details(member)}
     <form method="post" action="${esc(action)}" id="f"><input type="hidden" name="a" value="yes">
       <div class="row"><button type="submit">כן, לאשר</button></div>
     </form>
     <script>document.getElementById('f').submit()</script>`,
  )

/** "לא" was clicked: a short reason, then the polite e-mail goes out. */
export const rejectFormPage = ({ site, member, action, error = '', reason = '' }) =>
  page(
    site,
    'דחיית בקשה',
    `<h1>לא לאשר את ${esc(member.name)}</h1>
     <p>כותבים סיבה קצרה. המתווך יקבל מייל מנומס עם הסיבה הזו.</p>
     ${details(member)}
     <form method="post" action="${esc(action)}"><input type="hidden" name="a" value="no">
       <label for="reason">הסיבה</label>
       <textarea id="reason" name="reason" maxlength="600" required placeholder="למשל: לא הצלחנו לאמת את מספר הרישיון">${esc(reason)}</textarea>
       ${error ? `<p class="err" role="alert">${esc(error)}</p>` : ''}
       <div class="row"><button type="submit">שליחה ודחיית הבקשה</button></div>
     </form>`,
  )

export const donePage = ({ site, title, text, mark = '✓', grey = false, link }) =>
  page(
    site,
    title,
    `<div class="mark${grey ? ' grey' : ''}" aria-hidden="true">${mark}</div>
     <h1 style="text-align:center">${esc(title)}</h1>
     <p style="text-align:center">${esc(text)}</p>
     ${link ? `<div class="row" style="justify-content:center"><a class="btn quiet" href="${esc(link.href)}">${esc(link.label)}</a></div>` : ''}`,
  )
