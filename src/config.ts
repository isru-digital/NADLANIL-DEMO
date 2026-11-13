// The platform name. This is the ONLY place it is defined: change it here and
// it changes everywhere. Never hardcode a name elsewhere.
// "NadlanUP" is the name (decided 08.11.2026, replacing the working name "המתווך IL").
export const PLATFORM_NAME = 'NadlanUP'

/** The two-part slogan shown under the name. Each part starts with its number. */
export const PLATFORM_TAGLINE = ['100% גב קהילתי', '0% גזירות בעמלה']

/** Resolve a file in /public against the deployed base path. A full address (a photo held in the browser, a web link) is left as it is. */
export const asset = (path: string) => (/^(data:|blob:|https?:)/.test(path) ? path : `${import.meta.env.BASE_URL}${path.replace(/^\//, '')}`)

/** The logo mark file for this build's look (gold on navy, or green). */
export const LOGO_FILE = __THEME__ === 'green' ? 'logo-green.png' : 'logo.png'

/** The demo's signed-in broker (see data/demo.ts). */
export const CURRENT_BROKER_ID = 'b1'
