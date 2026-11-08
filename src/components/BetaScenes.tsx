import type { CSSProperties } from 'react'
import { BellRing, Check, Mic, ShieldCheck, Sparkles, Wallet } from 'lucide-react'
import { asset } from '../config'
import { brokers } from '../data/demo'
import { Avatar } from './ui'
import { MAP_CLIP, MAP_H, MAP_W, mapX, mapY } from './NetworkMap'

/**
 * The small animated pictures inside the beta lab's peek cards, one per idea. Each one shows the idea
 * in a few seconds. They play once when the card opens; all numbers are made up for the demo.
 */

const d = (s: number) => ({ '--d': `${s}s` }) as CSSProperties
const face = (i: number, size = 30) => <Avatar key={i} src={brokers[i].avatar} name="" size={size} />

/** 1. one recording, a whole ad */
export function VoiceScene() {
  return (
    <div className="bl-voice">
      <div className="bl-voice-in">
        <div className="bl-mic">
          <i aria-hidden />
          <Mic />
        </div>
        <div className="bl-wave" aria-hidden>
          {Array.from({ length: 26 }, (_, i) => (
            <i key={i} style={{ '--i': i, '--h': `${28 + ((i * 37) % 62)}%` } as CSSProperties} />
          ))}
        </div>
        <p className="bl-says">
          <span>וילה בהרצליה פיתוח, שבעה חדרים, בריכה וגינה, חניה לשלוש, מבקשים 14.9 מיליון.</span>
        </p>
        <ul className="bl-fieldchips">
          {['7 חדרים', 'הרצליה פיתוח', 'בריכה וגינה', 'חניה ל-3', "₪14.9 מ'"].map((t, i) => (
            <li key={t} style={d(1.5 + i * 0.35)}>
              {t}
            </li>
          ))}
        </ul>
      </div>
      <div className="bl-voice-out">
        <div className="bl-ad">
          <div className="bl-ad-photo">
            <img src={asset('img/prop-02.webp')} alt="" />
            <b>המודעה מוכנה</b>
          </div>
          <h4>וילה עם בריכה וגינה בהרצליה פיתוח</h4>
          <p>שבעה חדרים, חניה לשלוש, בריכה וגינה מטופחת. מבקשים 14.9 מיליון.</p>
          <div className="bl-ad-tags">
            <span>
              <Check /> פולדר מוכן
            </span>
            <span>
              <Check /> פורסם לקהילה
            </span>
          </div>
        </div>
        <div className="bl-hit">
          <span className="bl-faces">{[3, 4, 6].map((i) => face(i, 32))}</span>
          <b>3 קונים בקהילה מתאימים</b>
        </div>
      </div>
    </div>
  )
}

/** 3. an urgent request */
export function UrgentScene() {
  const offers = [
    { i: 1, t: "יש לי: 4 חדרים ברמת גן, ₪3.1 מ'", d: 2.2 },
    { i: 2, t: "יש לי: 4 חדרים בגבעתיים, ₪3.2 מ'", d: 3.2 },
    { i: 5, t: "יש לי: דירת גן, 4 חדרים, ₪3.0 מ'", d: 4.2 },
  ]
  return (
    <div className="bl-urgent">
      <div className="bl-req">
        <i className="bl-pulse" aria-hidden />
        <i className="bl-pulse is-2" aria-hidden />
        <div className="bl-req-card">
          <span className="bl-req-kicker">
            <BellRing /> בקשה בוערת
          </span>
          <strong>4 חדרים ברמת גן, עד ₪3.2 מ'</strong>
          <div className="bl-timer">
            <span className="num">59:48</span>
            <small>נשארו לתשובות</small>
            <i aria-hidden />
          </div>
        </div>
      </div>
      <ul className="bl-offers">
        {offers.map((o) => (
          <li key={o.i} style={d(o.d)}>
            {face(o.i, 36)}
            <span>{o.t}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

/** 4. the demand radar */
const heat = [
  { lon: 34.8, lat: 32.07, r: 78, k: 1 },
  { lon: 34.99, lat: 32.79, r: 52, k: 0.7 },
  { lon: 35.21, lat: 31.77, r: 56, k: 0.8 },
  { lon: 34.79, lat: 31.25, r: 46, k: 0.55 },
  { lon: 34.85, lat: 32.33, r: 44, k: 0.6 },
]
export function RadarScene() {
  return (
    <div className="bl-radar">
      <div className="bl-map">
        <div className="bl-land" style={{ clipPath: MAP_CLIP, WebkitClipPath: MAP_CLIP }} />
        {heat.map((h, i) => (
          <i
            key={i}
            className="bl-heat"
            style={
              {
                left: `${(mapX(h.lon) / MAP_W) * 100}%`,
                top: `${(mapY(h.lat) / MAP_H) * 100}%`,
                '--r': `${h.r}px`,
                '--k': h.k,
                ...d(0.3 + i * 0.35),
              } as CSSProperties
            }
          />
        ))}
      </div>
      <div className="bl-radar-card">
        <span className="bl-kick">רמת גן, 4 חדרים</span>
        <div className="bl-gap">
          <div>
            <b className="num">14</b>
            <small>קונים מחפשים</small>
          </div>
          <div>
            <b className="num">2</b>
            <small>נכסים בקהילה</small>
          </div>
        </div>
        <div className="bl-gapbar" aria-hidden>
          <i />
        </div>
        <p>הזדמנות: יש ביקוש ואין מספיק נכסים.</p>
        <small className="bl-demo">נתוני דמו, אנונימי ומצטבר</small>
      </div>
    </div>
  )
}

/** 5. the matchmaker */
export function MatchmakerScene() {
  return (
    <div className="bl-mm">
      <div className="bl-mm-side">
        <span className="bl-kick">אצלך</span>
        {face(0, 54)}
        <strong>3 קונים</strong>
        <small>4 חדרים בגבעתיים</small>
      </div>
      <div className="bl-mm-core">
        <svg viewBox="0 0 120 120" aria-hidden>
          <circle className="bl-ring-bg" cx="60" cy="60" r="50" />
          <circle className="bl-ring-fg" cx="60" cy="60" r="50" />
        </svg>
        <div>
          <b className="num">92</b>
          <small>התאמה</small>
        </div>
      </div>
      <div className="bl-mm-side is-b">
        <span className="bl-kick">אצלו</span>
        {face(7, 54)}
        <strong>2 נכסים</strong>
        <small>4 חדרים בגבעתיים</small>
      </div>
      <p className="bl-mm-why">
        <Sparkles /> למה אתם מתאימים: הקונים שלך מחפשים בדיוק מה שיש לו.
      </p>
    </div>
  )
}

/** 6. from WhatsApp to the system */
export function WhatsappScene() {
  return (
    <div className="bl-wa">
      <div className="bl-wa-chat" aria-hidden>
        <div className="bl-wa-b">
          <b>אלון</b>דירת 4 חדרים בגבעתיים, 3.69, שת"פ
        </div>
        <div className="bl-wa-b is-pick">
          <b>אני</b>דרוש: 5 חדרים עם מחסן, חניה בטאבו ונוף לים. לקונה חם!
        </div>
        <div className="bl-wa-b">
          <b>איתי</b>להשכרה 3 חדרים ברמת גן
        </div>
      </div>
      <div className="bl-wa-arrow" aria-hidden>
        <Sparkles />
      </div>
      <div className="bl-wa-card">
        <span className="bl-kick">בקשת חיפוש, מסודרת</span>
        <strong>5 חדרים, עד ₪9.5 מ'</strong>
        <ul>
          {['מחסן', 'חניה בטאבו', 'נוף לים'].map((t, i) => (
            <li key={t} style={d(1.6 + i * 0.35)}>
              {t}
            </li>
          ))}
        </ul>
        <div className="bl-wa-hit" style={d(3)}>
          <Check /> נמצאה התאמה בקהילה
        </div>
      </div>
    </div>
  )
}

/** 7. the reliability badge */
export function TrustScene() {
  const rows = [
    { l: 'זמן תגובה', v: 'פחות משעה', w: 92 },
    { l: 'שת"פים שנסגרו', v: '8 מתוך 10', w: 80 },
    { l: 'ביטולים והיעלמויות', v: 'כמעט אפס', w: 96 },
    { l: 'עמלה שולמה בזמן', v: 'תמיד', w: 100 },
  ]
  return (
    <div className="bl-trust">
      <div className="bl-trust-who">
        <span className="bl-trust-av">
          {face(0, 72)}
          <i>
            <ShieldCheck />
          </i>
        </span>
        <strong>מאיה לנדאו</strong>
        <em>מהימנה</em>
      </div>
      <ul className="bl-meters">
        {rows.map((r, i) => (
          <li key={r.l}>
            <span>
              {r.l} <b>{r.v}</b>
            </span>
            <i style={{ ...d(0.4 + i * 0.25), '--w': `${r.w}%` } as CSSProperties} />
          </li>
        ))}
      </ul>
      <small className="bl-demo">נתוני דמו. חבר חדש מקבל תג "חדש", לא ציון נמוך.</small>
    </div>
  )
}

/** 8. the folder that feels */
export function FolderScene() {
  const rows = [
    { t: 'וילה עם בריכה', n: 3, w: 92 },
    { t: 'פנטהאוז בצפון הישן', n: 1, w: 38 },
    { t: 'דירת גן ברמת אביב', n: 1, w: 24 },
  ]
  return (
    <div className="bl-folder">
      <div className="bl-toast">
        <span>
          <BellRing />
        </span>
        <div>
          <b>הלקוחה חזרה שלוש פעמים לוילה</b>
          <small>זה הזמן להרים טלפון</small>
        </div>
      </div>
      <ul className="bl-interest">
        {rows.map((r, i) => (
          <li key={r.t}>
            <span>
              {r.t}
              <small>{r.n === 1 ? 'נפתח פעם אחת' : `נפתח ${r.n} פעמים`}</small>
            </span>
            <i style={{ ...d(0.4 + i * 0.3), '--w': `${r.w}%` } as CSSProperties} />
          </li>
        ))}
      </ul>
      <small className="bl-demo">מדד עניין לכל נכס בפולדר. נתוני דמו.</small>
    </div>
  )
}

/** 9. the commission wallet */
export function WalletScene() {
  const bars = [
    { m: 'אוק', h: 62, solid: true },
    { m: 'נוב', h: 86, solid: true, now: true },
    { m: 'דצמ', h: 70 },
    { m: 'ינו', h: 54 },
  ]
  return (
    <div className="bl-wallet">
      <div className="bl-net">
        <span className="bl-kick">
          <Wallet /> נטו בכיס החודש
        </span>
        <b className="num">₪48,200</b>
        <em>
          אל תיגע: <span className="num">₪13,500</span> למע"מ ולמס
        </em>
      </div>
      <div className="bl-bars" aria-hidden>
        {bars.map((b, i) => (
          <div key={b.m} className={`${b.solid ? 'is-solid' : ''}${b.now ? ' is-now' : ''}`}>
            <i style={{ ...d(0.3 + i * 0.2), '--h': `${b.h}%` } as CSSProperties} />
            <small>{b.m}</small>
          </div>
        ))}
      </div>
      <ul className="bl-pipe">
        <li>
          <span>הצעה בהרצליה</span>
          <b className="num">50%</b>
        </li>
        <li>
          <span>ביקור ברמת גן</span>
          <b className="num">25%</b>
        </li>
      </ul>
      <small className="bl-demo">הערכה לפי ההגדרות שלך, לא ייעוץ מס. נתוני דמו.</small>
    </div>
  )
}

/** 10. an appraiser or lawyer within the hour */
export function ProsScene() {
  const quotes = [
    { who: 'שמאי מקרקעין', price: '₪1,400', note: 'ביקור מחר', d: 1.8, k: 'ש' },
    { who: 'עורך דין נדל"ן', price: '₪900', note: 'בדיקת חוזה', d: 2.8, k: 'ע' },
    { who: 'שמאי מקרקעין', price: '₪1,550', note: 'ביקור היום', d: 3.8, k: 'ש' },
  ]
  return (
    <div className="bl-pros">
      <div className="bl-pros-ask">
        <span className="bl-kick">בקשה</span>
        <strong>הערכת שווי, וילה בהרצליה פיתוח</strong>
        <small>הצעות מגיעות תוך שעה</small>
      </div>
      <ul>
        {quotes.map((q, i) => (
          <li key={i} style={d(q.d)}>
            <i>{q.k}</i>
            <span>
              {q.who}
              <small>{q.note}</small>
            </span>
            <b className="num">{q.price}</b>
            <em>מחיר קהילה</em>
          </li>
        ))}
      </ul>
      <small className="bl-demo">נתוני דמו.</small>
    </div>
  )
}
