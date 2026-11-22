import { asset } from '../config'
import INDEX from './geo-index.json'

/**
 * Streets and neighbourhoods from a list, not typed freely (Itzik 22.11.2026), so every broker writes a place the
 * same way and the match compares like with like. The lists and the neighbourhood maps are built by
 * scripts/build-geo.mjs from two open sources (data.gov.il: "רשימת רחובות ישראל"; OpenStreetMap, ODbL) into
 * public/geo/<code>.json, one small file per city, fetched when the city is picked.
 */
export type CityPlaces = {
  city: string
  code: number
  streets: string[]
  hoods: string[]
  map?: { w: number; h: number; outline: string; hoods: { n: string; d: string; c: [number, number] }[]; credit: string }
}
type IndexRow = { code: number; streets: number; hoods: number; map: boolean; mapped: number; covered: number }
const index = INDEX as Record<string, IndexRow>

export const hasPlaces = (city: string) => !!index[city]
export const hasMap = (city: string) => !!index[city]?.map
/** the cities that have a map, and those whose neighbourhoods are picked from the list only */
export const mapCities = () => Object.keys(index).filter((c) => index[c].map)
export const listOnlyCities = () => Object.keys(index).filter((c) => !index[c].map)

const cache = new Map<string, Promise<CityPlaces | null>>()
export function loadPlaces(city: string): Promise<CityPlaces | null> {
  const row = index[city]
  if (!row) return Promise.resolve(null)
  if (!cache.has(city))
    cache.set(
      city,
      fetch(asset(`geo/${row.code}.json`))
        .then((r) => (r.ok ? (r.json() as Promise<CityPlaces>) : null))
        .catch(() => {
          cache.delete(city)
          return null
        }),
    )
  return cache.get(city)!
}

/* ---------------------------------------------------------------- one way of writing a name */

/** the key two spellings of one place share: "שכונת נווה צדק", "ש נוה צדק" and "נווה-צדק" are one. The same rule as
    scripts/build-geo.mjs */
export const nameKey = (s: string) =>
  s
    .replace(/\s+/g, ' ')
    .replace(/״/g, '"')
    .replace(/׳/g, "'")
    .trim()
    .replace(/^(שכונת|שכונה|שכ'|שכ|ש'|ש|רחוב|רח'|רח)\s+/, '')
    .replace(/^(שדרות|שדרת|שד')\s*/, 'שד ')
    .replace(/^(סמטת|סמטה|סמ')\s*/, 'סמ ')
    .replace(/^כיכר\s+/, 'ככר ')
    .replace(/["'`\-–־,.()]/g, ' ')
    .replace(/וו/g, 'ו')
    .replace(/יי/g, 'י')
    .replace(/\s+/g, ' ')
    .trim()

/** are these the same place, however each was written? */
export const samePlace = (a: string, b: string) => !!a && !!b && nameKey(a) === nameKey(b)

/** the names of a list that fit what was typed: the ones that start with it first */
export function findNames(list: string[], typed: string, max = 60): string[] {
  const k = nameKey(typed)
  if (!k) return []
  // the name starts with it, then one of its words does, then it is somewhere inside
  const tiers: string[][] = [[], [], []]
  for (const n of list) {
    const nk = nameKey(n)
    if (nk.startsWith(k)) tiers[0].push(n)
    else if (nk.split(' ').some((w) => w.startsWith(k))) tiers[1].push(n)
    else if (nk.includes(k)) tiers[2].push(n)
    if (tiers[0].length >= max) break
  }
  return tiers.flat().slice(0, max)
}

/**
 * A name that was typed freely before the lists existed: the name of the list it clearly is, or null. "Clearly" is
 * the same key, or one name inside the other when the shorter has at least 4 letters ("רמת אביב" in "רמת אביב ג").
 */
export function clearMatch(list: string[], free: string): string | null {
  const k = nameKey(free)
  if (!k) return null
  const exact = list.find((n) => nameKey(n) === k)
  if (exact) return exact
  if (k.length < 4) return null
  const near = list.filter((n) => {
    const nk = nameKey(n)
    return nk.startsWith(k + ' ') || k.startsWith(nk + ' ')
  })
  return near.length === 1 ? near[0] : null
}
