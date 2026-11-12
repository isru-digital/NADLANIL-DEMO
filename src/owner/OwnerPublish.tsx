import { useCallback, useEffect, useState } from 'react'
import { Check, Copy, ExternalLink, Link2, Lock, Megaphone } from 'lucide-react'
import { CURRENT_BROKER_ID } from '../config'
import { COMMUNITY_NAME } from '../config/community'
import { crmItems } from '../data/demo'
import type { CommunityItem, CrmItem } from '../data/demo'
import { useStore } from '../store'
import { Modal } from '../components/ui'
import { dateHe, ownerActions, ownerLink, usePublishDates, viewersIn } from './ownerLink'
import '../styles/owner.css'

/** The properties the demo starts with. Anything else in the CRM was put there by the broker. */
const seed = new Set(crmItems.map((x) => x.id))
/** Being published right now (the store updates a moment later). */
const pending = new Set<string>()

/**
 * What the community sees of a property: the property itself and a fixed line. The owner's name, the owner's phone
 * and the broker's internal note are not read here at all.
 */
const postOf = (item: CrmItem, authorId: string): CommunityItem => ({
  id: `m-${item.id}-${Date.now()}`,
  topicId: 'coop',
  authorId,
  time: 'עכשיו',
  likes: 0,
  comments: [],
  sourceId: item.id,
  city: item.city,
  title: item.title,
  body: 'נכס חדש אצלי. פתוח לשיתוף פעולה עם מתווך שיש לו קונה מתאים.',
  image: item.image,
  property: { area: item.area, rooms: item.rooms, price: item.price, split: 'חלוקת עמלה שווה', showPrice: true },
  fresh: true,
})

/**
 * Every property the broker puts in the CRM (the new card form, the pull from Yad2, the first property of the
 * joining steps) goes up to the community by itself, in the property's own area. Renders nothing.
 */
export function AutoPublish() {
  const { crm, publishedIds, addItem } = useStore()
  useEffect(() => {
    crm.forEach((item) => {
      if (item.kind !== 'property') return
      if (publishedIds[item.id]) return ownerActions.stamp(item.id)
      if (seed.has(item.id) || pending.has(item.id)) return
      pending.add(item.id)
      addItem(postOf(item, CURRENT_BROKER_ID), item.id)
    })
  }, [crm, publishedIds, addItem])
  return null
}

/** The line at the top of the properties board, in place of the old on / off switch. */
export function AutoPublishNote() {
  return (
    <div className="ol-note" data-note="auto-publish">
      <span className="ol-note-ico">
        <Megaphone />
      </span>
      <span>
        <strong>כל נכס שעולה ל-CRM מתפרסם אוטומטית בקהילה, באזור של הנכס</strong>
        <small>
          <Lock /> שם בעל הנכס, הטלפון שלו וההערות הפנימיות לא מתפרסמים אף פעם.
        </small>
      </span>
    </div>
  )
}

/** On a published property's card: the link for the owner. The broker copies it and sends it himself. */
export function OwnerLinkButton({ item, publishedTo }: { item: CrmItem; publishedTo?: string }) {
  const dates = usePublishDates()
  const { toast } = useStore()
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const close = useCallback(() => setOpen(false), [])
  if (item.kind !== 'property' || !publishedTo) return null
  const date = dates[item.id]
  const url = ownerLink(item, date, CURRENT_BROKER_ID)

  const copy = async () => {
    let ok = false
    try {
      await navigator.clipboard.writeText(url)
      ok = true
    } catch {
      // no clipboard here (an old browser, or a page that is not secure): the older way, from the selected field
      const field = document.querySelector<HTMLInputElement>('.ol-url input')
      field?.focus()
      field?.select()
      try {
        ok = document.execCommand('copy')
      } catch {
        ok = false
      }
    }
    setCopied(ok)
    // never say "copied" when it was not: the link stays selected, ready for a manual copy
    toast(ok ? 'הקישור הועתק. שולחים אותו לבעל הנכס בעצמכם.' : 'הקישור מסומן. העתיקו אותו ושלחו לבעל הנכס בעצמכם.')
  }

  return (
    <>
      <button
        type="button"
        className="btn btn-sm ol-btn"
        data-act="owner-link"
        onClick={() => {
          setCopied(false)
          setOpen(true)
        }}
      >
        <Link2 />
        קישור לבעל הנכס
      </button>
      <Modal open={open} onClose={close} title="קישור לבעל הנכס" subtitle="עמוד קטן שמראה לבעל הנכס שהנכס פורסם. מעתיקים ושולחים לו בעצמכם.">
        <div className="modal-body ol" data-id={item.id}>
          <ul className="ol-facts">
            <li>
              <span>הנכס</span>
              <b>{item.title}</b>
            </li>
            <li>
              <span>פורסם ב</span>
              <b>קהילת {COMMUNITY_NAME}</b>
            </li>
            <li>
              <span>תאריך הפרסום</span>
              <b className="num">{date ? dateHe(date) : 'היום'}</b>
            </li>
            <li>
              <span>מתווכים באזור שרואים אותו</span>
              <b>
                <span className="num">{viewersIn(item.city)}</span> <em>נתון דמו</em>
              </b>
            </li>
          </ul>
          <label className="ol-url">
            <span>הקישור</span>
            <input className="input ltr" readOnly value={url} onFocus={(e) => e.currentTarget.select()} />
          </label>
          <p className="ol-private">
            <Lock /> בעמוד מופיע הנכס בלבד. שם בעל הנכס, הטלפון שלו וההערות הפנימיות לא נמצאים בו.
          </p>
        </div>
        <div className="modal-foot">
          <button className="btn btn-gold" data-act="copy-owner-link" onClick={copy}>
            {copied ? <Check /> : <Copy />}
            {copied ? 'הקישור הועתק' : 'העתקת הקישור'}
          </button>
          <a className="btn btn-ghost" href={url} target="_blank" rel="noreferrer" data-act="open-owner-link">
            <ExternalLink />
            צפייה בעמוד
          </a>
        </div>
      </Modal>
    </>
  )
}
