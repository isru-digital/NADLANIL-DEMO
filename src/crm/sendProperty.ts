import { formatPriceShort } from '../data/demo'
import type { CrmItem } from '../data/demo'
import type { Client, Match } from './clients'

/**
 * "שלח ללקוח בוואטסאפ" (24.11.2026): the broker picks a buyer of the CRM, and their own WhatsApp opens on a wa.me link
 * with a ready message: the city, the neighbourhood, the rooms, the price and a link to the property. The broker reads
 * it and sends it. Nothing is sent by the site and nothing connects to WhatsApp.
 *
 * The address rule: the message and the link never carry the owner's name or phone, the street's building number or
 * the flat's number. City and neighbourhood only.
 */
export type SendProp = {
  id: string
  title: string
  city: string
  hood: string
  /** '' for a property measured in square metres */
  rooms: string
  sqm?: number
  price: number
  rent: boolean
  image?: string
}

/** The neighbourhood of a CRM card: its own field, or what follows the city in "פתח תקווה, כפר גנים". */
const hoodOfCard = (it: CrmItem) => it.neighborhood?.trim() || (it.area.includes(',') ? it.area.split(',').slice(1).join(',').trim() : '')

export const fromCard = (it: CrmItem): SendProp => {
  const commercial = !!it.category && it.category !== 'home'
  return {
    id: it.id,
    title: it.title,
    city: it.city,
    hood: hoodOfCard(it),
    rooms: commercial ? '' : it.rooms,
    sqm: it.sqm,
    price: it.price,
    // the board has no deal field: a monthly sum is a rent
    rent: it.price > 0 && it.price < 60000,
    image: it.image,
  }
}

export const fromMatch = (m: Match): SendProp => ({ id: m.id, title: m.title, city: m.city, hood: '', rooms: String(m.rooms), price: m.sum, rent: !!m.rent })

export const priceWords = (p: Pick<SendProp, 'price' | 'rent'>) => (p.rent ? `${p.price.toLocaleString('he-IL')} ₪ לחודש` : formatPriceShort(p.price).replace("מ' ₪", 'מיליון ₪').replace("א' ₪", 'אלף ₪'))

export const BUYER_PATH = '/n/p'

/** The page the buyer opens: the property, and the name of the broker who sent it. Nothing of the owner. */
export function buyerLink(p: SendProp, by?: { name: string }) {
  const q = new URLSearchParams({ t: p.title, c: p.city, p: String(p.price) })
  if (p.hood) q.set('h', p.hood)
  if (p.rooms) q.set('r', p.rooms)
  else if (p.sqm) q.set('s', String(p.sqm))
  if (p.rent) q.set('m', '1')
  // only a picture of the demo's own folder: an uploaded photo is too big for a link
  if (p.image && /^img\/[\w.-]+$/.test(p.image)) q.set('i', p.image)
  if (by?.name) q.set('n', by.name.slice(0, 60))
  return `${location.origin}${import.meta.env.BASE_URL.replace(/\/$/, '')}${BUYER_PATH}?${q.toString()}`
}

/** "רון" of "רון ומיכל ק.", and nothing for "משפחת אבירם" (the greeting then has no name). */
const firstName = (name: string) => {
  const w = name.trim().split(/\s+/)[0] ?? ''
  return w === 'משפחת' || w.length < 2 ? '' : w
}

/** The message, as the buyer reads it in WhatsApp. */
export function messageFor(p: SendProp, cl: Pick<Client, 'name'> | null, link: string, me?: string) {
  const hi = cl && firstName(cl.name) ? `היי ${firstName(cl.name)},` : 'היי,'
  const where = p.hood ? `${p.city}, ${p.hood}` : p.city
  const size = p.rooms ? `${p.rooms} חדרים` : p.sqm ? `${p.sqm} מ"ר` : ''
  return [
    `${hi} יש לי נכס שיכול להתאים לך:`,
    '',
    `*${p.title}*`,
    `מיקום: ${where}`,
    ...(size ? [`גודל: ${size}`] : []),
    `מחיר: ${priceWords(p)}`,
    '',
    `לפרטים ותמונות: ${link}`,
    ...(me ? ['', me] : []),
  ].join('\n')
}

/** The broker's own WhatsApp, on the buyer's chat with the message written. With no phone, WhatsApp asks to whom. */
export function waLink(phone: string, text: string) {
  const digits = phone.replace(/\D/g, '').replace(/^0/, '972')
  return `https://wa.me/${digits.length >= 11 ? digits : ''}?text=${encodeURIComponent(text)}`
}
