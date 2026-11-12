import { PLATFORM_NAME } from '../config'

/**
 * The free community has its own name and its own entry page (Itzik, 12.11.2026). The office is NadlanUP, on the main
 * address; the community will live on an address of its own (for example kehila.nadlanup.co.il). In the demo that
 * address is the /kehila path. These are the only places the community's words are written.
 */
export const COMMUNITY_NAME = 'מתווכים לעסקאות'
export const COMMUNITY_FROM = `מבית ${PLATFORM_NAME}`
export const COMMUNITY_SUB = ['נכסים', 'קונים', 'שיתופי פעולה']
export const COMMUNITY_DESC = 'הקהילה החינמית שמחברת בין מתווכים מכל הארץ, לשיתוף נכסים, איתור קונים, התייעצויות ויצירת הזדמנויות עסקיות.'

/** The community's own home: stands for its own address. */
export const COMMUNITY_HOME = '/kehila'
export const COMMUNITY_JOIN = '/kehila/join'
/** After entering, a community member lands in the feed, not in a dashboard. */
export const COMMUNITY_FEED = '/app/community'

/** The one call that leads from the community to the office's page. */
export const UPGRADE_LABEL = `שדרג למשרד ${PLATFORM_NAME}`
export const OFFICE_PAGE = '/join/office'
/** What a community member reads on the landing page builder and the digital folder. */
export const OFFICE_ONLY = 'זמין לחברי המשרד'
