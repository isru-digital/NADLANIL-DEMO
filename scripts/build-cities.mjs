// Builds the list of the cities and local councils of Israel, for the search of a city (Itzik 26.11.2026: "ערים
// ומועצות"). Run it by hand when the list should be refreshed:
//   node scripts/build-cities.mjs
// It writes src/config/cities-il.json: the names, sorted.
//
// Source, open, no scraping: "רשימת יישובים", on data.gov.il (the state's open data). A place that belongs to no
// regional council (סמל_מועצה_איזורית = 0) is a city or a local council; kibbutzim, moshavim and the other places of
// the regional councils are left out, as asked.
import fs from 'node:fs'
import path from 'node:path'

const URL = 'https://data.gov.il/api/3/action/datastore_search?resource_id=5c78e9fa-c2e2-4771-93ff-7f400a12f7ba&limit=5000'
const OUT = path.resolve('src/config/cities-il.json')

/** rows of the list that are not a city or a council: tribes, a camp, a school, places with no council of their own */
const NOT_A_TOWN = /\(שבט\)|^(חברון|מחנה יתיר|מקווה ישראל|נווה אבות|שער שומרון|עוקבי \(בנו עוקבה\)|מסעודין אל-עזאזמה)$/
/** the name the app already uses, where the state writes it another way */
const APP_NAME = { 'תל אביב - יפו': 'תל אביב', 'מודיעין-מכבים-רעות': 'מודיעין', 'פקיעין (בוקייעה)': 'פקיעין', "ג'ש (גוש חלב)": "ג'ש (גוש חלב)" }
const clean = (s) => s.replace(/\s+/g, ' ').trim()
/** the app writes "קריית" (קריית אונו, קריית שמונה) */
const appName = (s) => APP_NAME[s] ?? s.replace(/^קרית /, 'קריית ')

const r = await fetch(URL, { headers: { 'user-agent': 'nadlanup-geo-build/1.0' } })
if (!r.ok) throw new Error(`data.gov.il: ${r.status}`)
const rows = (await r.json()).result.records
const names = [
  ...new Set(
    rows
      .filter((x) => Number(x['סמל_מועצה_איזורית']) === 0)
      .map((x) => clean(x['שם_ישוב']))
      .filter((n) => n && !NOT_A_TOWN.test(n))
      .map(appName),
  ),
].sort((a, b) => a.localeCompare(b, 'he'))
if (names.length < 150) throw new Error(`only ${names.length} names: the list looks broken, nothing written`)
fs.writeFileSync(OUT, JSON.stringify(names, null, 0).replace(/","/g, '",\n"').replace('["', '[\n"').replace('"]', '"\n]') + '\n')
console.log('places in the list:', rows.length, '| cities and councils written:', names.length, '->', path.relative('.', OUT))
