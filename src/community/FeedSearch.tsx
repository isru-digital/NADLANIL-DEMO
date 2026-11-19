import { useEffect, useRef } from 'react'
import { Check, MapPin, Search, X } from 'lucide-react'
import { topicById } from '../config/topics'
import { brokerById } from '../data/demo'
import type { CommunityItem } from '../data/demo'
import { Avatar, Modal } from '../components/ui'
import '../styles/top-actions.css'

/**
 * The search screen of the feed (Itzik 19.11.2026). The search field and the "כל הערים" button used to stand at the
 * top of the feed all the time and pushed the posts down; now the search icon of the top bar opens this screen, with
 * the same two things in it: the words to look for, and the cities to see. What is found is listed here at once; a
 * tap on a line goes to that post in the feed, and "הצגה בפיד" shows the feed through the same search.
 */
const SHOWN = 20

export default function FeedSearch({
  open,
  onClose,
  query,
  onQuery,
  cities,
  mine,
  countIn,
  onCity,
  onClearCities,
  found,
  onPick,
  onApply,
}: {
  open: boolean
  onClose: () => void
  query: string
  onQuery: (q: string) => void
  /** every city, and the ones chosen */
  cities: string[]
  mine: string[]
  countIn: (city: string) => number
  onCity: (city: string) => void
  onClearCities: () => void
  /** what the words and the cities find, in every room */
  found: CommunityItem[]
  onPick: (it: CommunityItem) => void
  onApply: () => void
}) {
  const field = useRef<HTMLInputElement>(null)
  useEffect(() => {
    if (!open) return
    const t = window.setTimeout(() => field.current?.focus(), 120)
    return () => window.clearTimeout(t)
  }, [open])

  const q = query.trim()
  const active = !!q || mine.length > 0
  return (
    <Modal open={open} onClose={onClose} title="חיפוש בקהילה">
      <div className="fsr" data-search-screen>
        <form
          className="fsr-field"
          role="search"
          onSubmit={(e) => {
            e.preventDefault()
            onApply()
          }}
        >
          <Search aria-hidden />
          <input
            ref={field}
            type="search"
            value={query}
            onChange={(e) => onQuery(e.target.value)}
            placeholder="עיר, מתווך, נכס"
            aria-label="חיפוש בקהילה"
            enterKeyHint="search"
            autoComplete="off"
            data-f="search"
          />
          {query && (
            <button type="button" onClick={() => onQuery('')} aria-label="ניקוי החיפוש">
              <X aria-hidden />
            </button>
          )}
        </form>

        {/* the cities to see: the same choice "כל הערים" opened before */}
        <section className="fsr-cities" aria-label="סינון לפי עיר">
          <h3>
            <MapPin aria-hidden /> ערים
            {mine.length > 0 && (
              <button type="button" className="fsr-clear" onClick={onClearCities} data-act="clear-cities">
                ניקוי
              </button>
            )}
          </h3>
          <div className="fsr-chips" data-cities>
            <button type="button" className="fsr-chip" aria-pressed={mine.length === 0} onClick={onClearCities} data-city="">
              כל הארץ
            </button>
            {cities.map((c) => {
              const on = mine.includes(c)
              return (
                <button key={c} type="button" className="fsr-chip" role="checkbox" aria-checked={on} aria-pressed={on} onClick={() => onCity(c)} data-city={c}>
                  {on && <Check aria-hidden />}
                  {c}
                  <b className="num">{countIn(c)}</b>
                </button>
              )
            })}
          </div>
        </section>

        {/* what is found */}
        <section className="fsr-found" aria-live="polite" data-found={active ? found.length : ''}>
          {!active ? (
            <p className="fsr-hint">כותבים עיר, שם של מתווך או נכס. אפשר גם לבחור ערים, ולראות רק מה שקשור אליהן.</p>
          ) : found.length === 0 ? (
            <p className="fsr-hint is-none">לא נמצאו פוסטים. אפשר לנסות מילה אחרת, או להסיר ערים.</p>
          ) : (
            <>
              <h3>
                <b className="num">{found.length}</b> {found.length === 1 ? 'פוסט נמצא' : 'פוסטים נמצאו'}
              </h3>
              <ul>
                {found.slice(0, SHOWN).map((it) => {
                  const b = brokerById(it.authorId)
                  const t = topicById(it.topicId)
                  return (
                    <li key={it.id}>
                      <button type="button" className="fsr-hit" onClick={() => onPick(it)} data-hit={it.id}>
                        <Avatar src={b.avatar} name={b.name} size={40} />
                        <span>
                          <strong>{it.title ?? it.body}</strong>
                          <small>
                            {b.name} · {t.name} · {it.city}
                          </small>
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ul>
              {found.length > SHOWN && <p className="fsr-more">ועוד {found.length - SHOWN}. כולם מוצגים בפיד.</p>}
            </>
          )}
        </section>

        <div className="fsr-foot">
          <button type="button" className="btn btn-gold btn-lg" onClick={onApply} data-act="apply-search">
            {active ? `הצגה בפיד (${found.length})` : 'סגירה'}
          </button>
        </div>
      </div>
    </Modal>
  )
}
