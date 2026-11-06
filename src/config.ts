// The platform name. This is the ONLY place it is defined: change it here and
// it changes everywhere. Never hardcode a name elsewhere.
// "המתווך IL" is a working name for now (decided 06.11.2026), not final.
export const PLATFORM_NAME = 'המתווך IL'

/** The two-part slogan shown under the name. Each part starts with its number. */
export const PLATFORM_TAGLINE = ['100% גב קהילתי', '0% גזירות בעמלה']

/** Resolve a file in /public against the deployed base path. */
export const asset = (path: string) => `${import.meta.env.BASE_URL}${path.replace(/^\//, '')}`

/** The demo's signed-in broker (see data/demo.ts). */
export const CURRENT_BROKER_ID = 'b1'
