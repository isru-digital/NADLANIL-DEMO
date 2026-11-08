import { Handshake, HelpCircle, MessagesSquare, Radar, Repeat2, Trophy } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

// ---------------------------------------------------------------------------
// נושאי הקהילה (ערוצים). זו הרשימה היחידה: כדי להוסיף נושא מוסיפים כאן שורה.
// הסדר כאן הוא הסדר שבו הנושאים מוצגים בקהילה.
// ---------------------------------------------------------------------------

export type TopicId = 'coop' | 'referrals' | 'seeking' | 'knowledge' | 'posts' | 'wins'

/** Which card layout a topic uses. */
export type TopicKind = 'property' | 'referral' | 'search' | 'post'

export type Topic = {
  id: TopicId
  name: string
  /** short label for chips and tags */
  short: string
  description: string
  icon: LucideIcon
  kind: TopicKind
  tone: 'gold' | 'blue' | 'green' | 'violet'
  /** CRM item kinds that can be moved into this topic ("פרסם בקהילה") */
  fromCrm: ('property' | 'client')[]
  /** members can write directly in the topic */
  compose: boolean
  /** label of the main action on a card in this topic */
  cta: string
}

export const topics: Topic[] = [
  {
    id: 'coop',
    name: 'נכסים לשיתוף פעולה',
    short: 'שיתוף פעולה',
    description: 'נכסים שמתווכים פתחו לשיתוף פעולה. מתווכים מהאזור רואים ופונים.',
    icon: Handshake,
    kind: 'property',
    tone: 'gold',
    fromCrm: ['property'],
    compose: false,
    cta: 'אני רוצה לשתף פעולה',
  },
  {
    id: 'referrals',
    name: 'הפניות בין מתווכים',
    short: 'הפניה',
    description: 'מעבירים קונה או מוכר למתווך שמכיר את העיר האחרת.',
    icon: Repeat2,
    kind: 'referral',
    tone: 'violet',
    fromCrm: ['client', 'property'],
    compose: false,
    cta: 'אני באזור הזה',
  },
  {
    id: 'seeking',
    name: 'מחפש לקונה',
    short: 'מחפש לקונה',
    description: 'בקשות חיפוש שנשמרות. כשמתפרסם נכס מתאים, קופצת התראה.',
    icon: Radar,
    kind: 'search',
    tone: 'blue',
    fromCrm: ['client'],
    compose: false,
    cta: 'יש לי נכס מתאים',
  },
  {
    id: 'knowledge',
    name: 'שאלות וידע',
    short: 'שאלות וידע',
    description: 'התייעצויות על משא ומתן, גיוס בלעדיות ופולואפ למוכרים.',
    icon: HelpCircle,
    kind: 'post',
    tone: 'blue',
    fromCrm: [],
    compose: true,
    cta: '',
  },
  {
    id: 'posts',
    name: 'פוסטים ושיתוף',
    short: 'פוסט',
    description: 'מה שעובר עליכם בשטח: שיתופים, מחשבות ותמיכה.',
    icon: MessagesSquare,
    kind: 'post',
    tone: 'gold',
    fromCrm: [],
    compose: true,
    cta: '',
  },
  {
    id: 'wins',
    name: 'עסקאות שנסגרו והצלחות',
    short: 'הצלחה',
    description: 'סגרתם עסקה? זה המקום לספר ולפרגן.',
    icon: Trophy,
    kind: 'post',
    tone: 'green',
    fromCrm: [],
    compose: true,
    cta: '',
  },
]

export const topicById = (id: TopicId) => topics.find((t) => t.id === id) ?? topics[0]

/**
 * נוסח ההפניה הסטנדרטי ("תצורת הפנייה סטנדרטית של 25%").
 * מוצג בדמו כהצעה בלבד, בלי שום תוקף משפטי. לשנות כאן אם הנוסח המוסכם שונה.
 */
export const REFERRAL_TERMS = 'הפניה סטנדרטית: 25% דמי הפניה'
export const REFERRAL_DISCLAIMER = 'נוסח הצעה לדוגמה בלבד. אין לו תוקף משפטי.'
