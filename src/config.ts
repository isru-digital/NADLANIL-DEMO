// The platform name is not decided yet. This is the ONLY place it is defined.
// Replace the value here once a name is chosen; never hardcode a name elsewhere.
export const PLATFORM_NAME = '[שם הפלטפורמה]'

/** Resolve a file in /public against the deployed base path. */
export const asset = (path: string) => `${import.meta.env.BASE_URL}${path.replace(/^\//, '')}`

/** The demo's signed-in broker (see data/demo.ts). */
export const CURRENT_BROKER_ID = 'b1'
