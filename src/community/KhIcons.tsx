/**
 * The community page's own icons: one hand for all of them. A 32 grid, a 1.8 line in the ink colour, round ends,
 * and one warm gold shape behind the drawing (the "--khi-warm" colour). Drawn for this page, not taken from a set.
 */
import type { ReactNode } from 'react'

type P = { className?: string }
const Svg = ({ className, children }: P & { children: ReactNode }) => (
  <svg className={`khi ${className ?? ''}`} viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
    {children}
  </svg>
)
const Warm = ({ cx, cy, r }: { cx: number; cy: number; r: number }) => <circle cx={cx} cy={cy} r={r} className="khi-warm" stroke="none" />

/** a house, with a key at its door */
export const IconHome = (p: P) => (
  <Svg {...p}>
    <Warm cx={21} cy={20} r={8} />
    <path d="M5 15 16 6l11 9" />
    <path d="M8 13v13h16V13" />
    <circle cx="16" cy="19.5" r="2.4" />
    <path d="M16 21.9V26" />
  </Svg>
)
/** a buyer: a person, and a lens looking for the right home */
export const IconBuyer = (p: P) => (
  <Svg {...p}>
    <Warm cx={22} cy={21} r={7.5} />
    <circle cx="12" cy="10" r="4.2" />
    <path d="M4.5 26c.6-5.2 3.6-8 7.5-8 1.6 0 3 .4 4.1 1.2" />
    <circle cx="22" cy="21" r="4.2" />
    <path d="m25.1 24.1 3 3" />
  </Svg>
)
/** two rings joined: two brokers, one deal */
export const IconDeal = (p: P) => (
  <Svg {...p}>
    <Warm cx={16} cy={16} r={6} />
    <circle cx="12" cy="16" r="7" />
    <circle cx="20" cy="16" r="7" />
    <path d="M16 11.2v9.6" strokeDasharray="1.6 2.2" />
  </Svg>
)
/** the feed: two speech bubbles */
export const IconFeed = (p: P) => (
  <Svg {...p}>
    <Warm cx={22} cy={20} r={7} />
    <path d="M5 8.5A3.5 3.5 0 0 1 8.5 5h10A3.5 3.5 0 0 1 22 8.5v5a3.5 3.5 0 0 1-3.5 3.5H12l-5 4v-4.4A3.5 3.5 0 0 1 5 13.5z" />
    <path d="M25 13.6a3 3 0 0 1 2 2.9v4.3a3 3 0 0 1-2 2.8V27l-3.6-3h-5.2a3 3 0 0 1-2.8-2" />
  </Svg>
)
/** the brokers' index: cards of people */
export const IconIndex = (p: P) => (
  <Svg {...p}>
    <Warm cx={11} cy={12} r={6.5} />
    <rect x="4" y="6" width="17" height="21" rx="3.5" />
    <circle cx="12.5" cy="13" r="3" />
    <path d="M8 22c.6-2.6 2.3-4 4.5-4s3.9 1.4 4.5 4" />
    <path d="M24.5 9v16M28 12v10" />
  </Svg>
)
/** the CRM: columns of cards */
export const IconCrm = (p: P) => (
  <Svg {...p}>
    <Warm cx={20} cy={11} r={6.5} />
    <rect x="4" y="5" width="7" height="12" rx="2" />
    <rect x="13" y="5" width="7" height="18" rx="2" />
    <rect x="22" y="5" width="6" height="9" rx="2" />
    <path d="M4 27h24" />
  </Svg>
)
/** from a chat to the system: a bubble with an arrow into a box */
export const IconChatIn = (p: P) => (
  <Svg {...p}>
    <Warm cx={10} cy={11} r={6.5} />
    <path d="M4 10a5 5 0 0 1 5-5h4a5 5 0 0 1 0 10h-2l-4 3v-3.3A5 5 0 0 1 4 10z" />
    <path d="M17 20h6m0 0-2.5-2.5M23 20l-2.5 2.5" />
    <rect x="15" y="15" width="13" height="12" rx="3" />
  </Svg>
)
/** a landing page */
export const IconPage = (p: P) => (
  <Svg {...p}>
    <Warm cx={20} cy={20} r={7} />
    <rect x="4" y="5" width="24" height="22" rx="3.5" />
    <path d="M4 10.5h24" />
    <path d="M8.5 15h9M8.5 19h6" />
    <rect x="18" y="15" width="6" height="7" rx="1.5" />
  </Svg>
)
/** a digital folder */
export const IconFolder = (p: P) => (
  <Svg {...p}>
    <Warm cx={12} cy={18} r={7} />
    <path d="M4 9a3 3 0 0 1 3-3h5l3 3h10a3 3 0 0 1 3 3v11a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3z" />
    <path d="M11 17.5h10M11 21.5h6" />
  </Svg>
)
/** a pin on a map, for a city */
export const IconPin = (p: P) => (
  <Svg {...p}>
    <path d="M16 28s-8.5-7.2-8.5-14a8.5 8.5 0 0 1 17 0c0 6.8-8.5 14-8.5 14z" />
    <circle cx="16" cy="14" r="3" />
  </Svg>
)
