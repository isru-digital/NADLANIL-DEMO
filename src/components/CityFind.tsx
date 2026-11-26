import { useState } from 'react'
import { Check, Search, X } from 'lucide-react'
import { findCities } from '../config/cities'
import '../styles/city-find.css'

/**
 * The search of a city, wherever a city is picked (Itzik 26.11.2026): the popular cities stay as shortcuts next to
 * it, and typing here finds any city or local council of Israel. One box and one look in every form.
 * `picked` are the cities already chosen (they show with a tick); `many` keeps the box open after a pick.
 */
export function CityFind({ id, picked, onPick, many = false }: { id: string; picked: string[]; onPick: (city: string) => void; many?: boolean }) {
  const [typed, setTyped] = useState('')
  const hits = findCities(typed)
  const pick = (c: string) => {
    onPick(c)
    if (!many) setTyped('')
  }
  return (
    <div className="cf" data-city-find={id}>
      <label className="cf-box">
        <Search aria-hidden />
        <span className="sr-only">חיפוש עיר, כל הערים בישראל</span>
        <input
          type="search"
          className="input"
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          onKeyDown={(e) => {
            // Enter picks the first city found, and never sends the form around the box
            if (e.key !== 'Enter') return
            e.preventDefault()
            if (hits[0]) pick(hits[0])
          }}
          placeholder="חיפוש עיר, כל הערים בישראל"
          autoComplete="off"
          enterKeyHint="search"
          data-f="city-find-all"
        />
        {typed && (
          <button type="button" className="cf-clear" aria-label="ניקוי החיפוש" onClick={() => setTyped('')}>
            <X aria-hidden />
          </button>
        )}
      </label>
      {typed.trim() && (
        <div className="cf-hits" role="group" aria-label="ערים שנמצאו" data-hits>
          {hits.map((c) => {
            const on = picked.includes(c)
            return (
              <button key={c} type="button" className="cf-hit" aria-pressed={on} onClick={() => pick(c)} data-city-hit={c}>
                <span className="cf-tick">{on && <Check aria-hidden />}</span>
                {c}
              </button>
            )
          })}
          {hits.length === 0 && (
            <p className="cf-none" role="status" data-none>
              לא נמצאה עיר בשם הזה. כדאי לבדוק את האיות.
            </p>
          )}
        </div>
      )}
    </div>
  )
}
