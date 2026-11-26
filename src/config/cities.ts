import LIST from './cities-il.json'

/**
 * The cities and local councils of Israel (Itzik 26.11.2026: every city can be found by typing, the popular ones stay
 * as shortcuts). Built by scripts/build-cities.mjs from the state's open list on data.gov.il ("רשימת יישובים"): a
 * place that belongs to no regional council. No scraping.
 */
export const ALL_CITIES = LIST as string[]

/** one way of writing a name, for the search: "קרית" finds "קריית", "גת" finds "קריית גת", quotes and dashes do not count */
const key = (s: string) =>
  s
    .replace(/["'`׳״]/g, '')
    .replace(/[-–־]/g, ' ')
    .replace(/יי/g, 'י')
    .replace(/וו/g, 'ו')
    .replace(/\s+/g, ' ')
    .trim()

const KEYS = ALL_CITIES.map((c) => [c, key(c)] as const)

/** the cities a typed word finds: names that start with it first, then a word that starts with it, then the rest */
export function findCities(typed: string, limit = 8): string[] {
  const q = key(typed)
  if (!q) return []
  const starts: string[] = []
  const word: string[] = []
  const inside: string[] = []
  for (const [name, k] of KEYS) {
    if (k.startsWith(q)) starts.push(name)
    else if (k.includes(` ${q}`)) word.push(name)
    else if (k.includes(q)) inside.push(name)
  }
  return [...starts, ...word, ...inside].slice(0, limit)
}
