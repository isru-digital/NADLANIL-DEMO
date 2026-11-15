import { connect } from 'cloudflare:sockets'

/**
 * Sends an e-mail from the Gmail box, through Gmail's own server, with an app password.
 * The password comes only from the Worker's secret GMAIL_APP_PASSWORD: it is never in the code, never logged and
 * never part of an error. With no password set, nothing is sent and the log says so ('no_password').
 * In local testing (TEST_MODE) the e-mail is kept in the "outbox" table instead of being sent.
 */
const b64 = (bytes) => {
  let s = ''
  for (const b of bytes) s += String.fromCharCode(b)
  return btoa(s)
}
const b64utf8 = (text) => b64(new TextEncoder().encode(text))
const wrap76 = (s) => s.replace(/(.{76})/g, '$1\r\n')
/** A header value with Hebrew in it. */
const word = (text) => (/^[\x20-\x7e]*$/.test(text) ? text : `=?UTF-8?B?${b64utf8(text)}?=`)
const clean = (s) => String(s).replace(/[\r\n]+/g, ' ').trim()

function message({ from, fromName, to, subject, html, text, replyTo }) {
  const boundary = `b${crypto.randomUUID().replace(/-/g, '')}`
  const id = `<${crypto.randomUUID()}@nadlanup>`
  return [
    `From: ${word(clean(fromName))} <${from}>`,
    `To: <${clean(to)}>`,
    `Reply-To: <${clean(replyTo || from)}>`,
    `Subject: ${word(clean(subject))}`,
    `Date: ${new Date().toUTCString().replace('GMT', '+0000')}`,
    `Message-ID: ${id}`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    '',
    `--${boundary}`,
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: base64',
    '',
    wrap76(b64utf8(text)),
    `--${boundary}`,
    'Content-Type: text/html; charset=UTF-8',
    'Content-Transfer-Encoding: base64',
    '',
    wrap76(b64utf8(html)),
    `--${boundary}--`,
    '',
  ].join('\r\n')
}

async function smtp(env, mail) {
  const user = env.MAIL_FROM
  // an app password is shown as four groups: the spaces are not part of it
  const pass = String(env.GMAIL_APP_PASSWORD).replace(/\s+/g, '')
  const socket = connect({ hostname: 'smtp.gmail.com', port: 465 }, { secureTransport: 'on', allowHalfOpen: false })
  const writer = socket.writable.getWriter()
  const reader = socket.readable.getReader()
  const enc = new TextEncoder()
  const dec = new TextDecoder()
  let buf = ''
  // a reply ends with a line that has a space after its code ("250 OK"); lines before it have a dash ("250-...")
  const reply = async () => {
    for (;;) {
      const lines = buf.split('\r\n')
      for (let i = 0; i < lines.length - 1; i++) {
        if (/^\d{3} /.test(lines[i])) {
          buf = lines.slice(i + 1).join('\r\n')
          return lines[i]
        }
      }
      const { value, done } = await reader.read()
      if (done) throw new Error('the mail server closed the connection')
      buf += dec.decode(value, { stream: true })
    }
  }
  // `what` names the step in an error, so a failure never repeats what was sent (the password is one of the things sent)
  const step = async (line, expect, what) => {
    if (line !== null) await writer.write(enc.encode(`${line}\r\n`))
    const r = await reply()
    if (!r.startsWith(String(expect))) throw new Error(`${what}: ${r.slice(0, 160)}`)
  }
  try {
    await step(null, 220, 'greeting')
    await step('EHLO nadlanup.workers.dev', 250, 'hello')
    await step('AUTH LOGIN', 334, 'sign-in')
    await step(btoa(user), 334, 'sign-in user')
    await step(btoa(pass), 235, 'sign-in password')
    await step(`MAIL FROM:<${user}>`, 250, 'sender')
    await step(`RCPT TO:<${clean(mail.to)}>`, 250, 'recipient')
    await step('DATA', 354, 'data')
    await step(`${message({ ...mail, from: user, fromName: env.MAIL_NAME || 'NadlanUP' })}\r\n.`, 250, 'message')
    await writer.write(enc.encode('QUIT\r\n')).catch(() => {})
  } finally {
    await socket.close().catch(() => {})
  }
}

const within = (ms, p) => Promise.race([p, new Promise((_, no) => setTimeout(() => no(new Error('the mail server did not answer in time')), ms))])

/**
 * Sends one e-mail and writes the outcome to the log. It never throws: a registration is kept even when its
 * e-mail could not go out, and the approvers' screen shows the failure.
 * @returns {'sent' | 'no_password' | 'failed' | 'test'}
 */
export async function sendMail(env, { to, subject, html, text, kind }) {
  const now = Date.now()
  let status = 'sent'
  let error = ''
  if (env.TEST_MODE === '1') {
    status = 'test'
    await env.DB.prepare('INSERT INTO outbox (to_email, subject, html, created_at) VALUES (?, ?, ?, ?)').bind(to, subject, html, now).run()
  } else if (!env.GMAIL_APP_PASSWORD) {
    status = 'no_password'
  } else {
    try {
      await within(20000, smtp(env, { to, subject, html, text }))
    } catch (e) {
      status = 'failed'
      error = String(e?.message ?? e).slice(0, 300)
    }
  }
  await env.DB.prepare('INSERT INTO mail_log (to_email, kind, status, error, created_at) VALUES (?, ?, ?, ?, ?)').bind(to, kind, status, error, now).run()
  return status
}
