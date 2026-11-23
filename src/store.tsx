import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import type { TopicId } from './config/topics'
import { CURRENT_BROKER_ID } from './config'
import { builderDefaults, canBump, communityItems as seedItems, crmItems as seedCrm, notices as seedNotices } from './data/demo'
import type { BuilderState, Comment, CommunityItem, CrmItem, CrmStatus, Notice } from './data/demo'

// Client-side demo state only. Nothing here talks to a server.

export type MatchAlert = {
  id: string
  /** 'found' = my property fits someone's saved search, 'incoming' = a new listing fits my saved search */
  kind: 'found' | 'incoming'
  title: string
  text: string
  topicId: TopicId
  itemId: string
  brokerId: string
}

type State = {
  /** post id -> the reaction I gave it (see config/reactions.ts) */
  liked: Record<string, string>
  items: CommunityItem[]
  crm: CrmItem[]
  /** CRM item id -> the community topic it was published to */
  publishedIds: Record<string, TopicId>
  interested: Record<string, boolean>
  remindersDone: Record<string, boolean>
  notices: Notice[]
  /** cities the broker follows in the community; empty = the whole country */
  myCities: string[]
  autoPublish: boolean
  onboarded: boolean
  builder: BuilderState
  pagePublished: boolean
}

const STORAGE_KEY = 'brokers-demo-state-v5'

const initial = (): State => ({
  liked: {},
  items: seedItems,
  crm: seedCrm,
  publishedIds: {},
  interested: {},
  remindersDone: {},
  notices: seedNotices,
  myCities: [],
  autoPublish: false,
  onboarded: false,
  builder: builderDefaults,
  pagePublished: false,
})

/**
 * The few properties of the demo that are marked "שת"פ מלא" with a "דוגמה" tag (Itzik 23.11.2026) are refreshed
 * onto what a browser already keeps, so a broker who was here before the mark existed sees them too. Only those two
 * marks are taken from the seed; everything else of the saved post (its likes, its comments, a lift) stays as it is,
 * and nothing is removed.
 */
const withSamples = (saved: CommunityItem[]): CommunityItem[] => {
  const marks = new Map(seedItems.filter((i) => i.property?.sample).map((i) => [i.id, i.property!]))
  return saved.map((it) => (it.property && marks.has(it.id) ? { ...it, property: { ...it.property, coopPct: marks.get(it.id)!.coopPct, sample: true } } : it))
}

const load = (): State => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const kept = { ...initial(), ...(JSON.parse(raw) as Partial<State>) }
      return { ...kept, items: withSamples(kept.items) }
    }
  } catch {
    /* storage unavailable: start clean */
  }
  return initial()
}

type Store = State & {
  /** set my reaction on a post; the same reaction again (or null) removes it */
  react: (itemId: string, reaction: string | null) => void
  addItem: (item: CommunityItem, sourceId?: string) => void
  /** "הקפצה למעלה" (22.11.2026): my own post goes to the top of the feed, once in two days */
  bumpItem: (id: string) => void
  addComment: (itemId: string, comment: Comment, parentIndex?: number) => void
  clearFresh: () => void
  toggleInterested: (itemId: string) => void
  moveCrm: (id: string, status: CrmStatus) => void
  addCrm: (item: CrmItem) => void
  toggleReminder: (id: string) => void
  addNotice: (notice: Notice) => void
  markNoticesRead: () => void
  setMyCities: (cities: string[]) => void
  setAutoPublish: (v: boolean) => void
  setOnboarded: (v: boolean) => void
  setBuilder: (patch: Partial<BuilderState>) => void
  setPagePublished: (v: boolean) => void
  reset: () => void
  toast: (message: string) => void
  toastMessage: string | null
  matchAlert: MatchAlert | null
  showMatch: (alert: MatchAlert | null) => void
}

const Ctx = createContext<Store | null>(null)

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<State>(load)
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const [matchAlert, setMatchAlert] = useState<MatchAlert | null>(null)
  const toastTimer = useRef<number>()

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch {
      /* ignore */
    }
  }, [state])

  const toast = useCallback((message: string) => {
    setToastMessage(message)
    window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToastMessage(null), 3400)
  }, [])

  const actions = useMemo(
    () => ({
      react: (itemId: string, reaction: string | null) =>
        setState((s) => {
          const liked = { ...s.liked }
          if (!reaction || liked[itemId] === reaction) delete liked[itemId]
          else liked[itemId] = reaction
          return { ...s, liked }
        }),
      addItem: (item: CommunityItem, sourceId?: string) =>
        setState((s) => ({
          ...s,
          // the moment it was published (22.11.2026): it is what puts the post at the top of the feed, and what the
          // two days before it may be lifted are counted from. Every way of publishing passes through here.
          items: [{ at: Date.now(), ...item }, ...s.items.map((c) => (c.fresh ? { ...c, fresh: false } : c))],
          publishedIds: sourceId ? { ...s.publishedIds, [sourceId]: item.topicId } : s.publishedIds,
        })),
      /**
       * "הקפצה למעלה": the post goes to the top of the feed, as if it were published now. Its own date does not move.
       * The two days are asked here as well, not only of the button, so that a second press (or two devices at once)
       * cannot lift it early.
       */
      bumpItem: (id: string) =>
        setState((s) => ({
          ...s,
          items: s.items.map((it) => (it.id === id && it.authorId === CURRENT_BROKER_ID && canBump(it) ? { ...it, bumpedAt: Date.now() } : it)),
        })),
      addComment: (itemId: string, comment: Comment, parentIndex?: number) =>
        setState((s) => ({
          ...s,
          items: s.items.map((it) => {
            if (it.id !== itemId) return it
            if (parentIndex == null) return { ...it, comments: [...it.comments, comment] }
            return {
              ...it,
              comments: it.comments.map((c, i) =>
                i === parentIndex ? { ...c, replies: [...(c.replies ?? []), comment] } : c,
              ),
            }
          }),
        })),
      clearFresh: () =>
        setState((s) =>
          s.items.some((c) => c.fresh) ? { ...s, items: s.items.map((c) => ({ ...c, fresh: false })) } : s,
        ),
      toggleInterested: (itemId: string) =>
        setState((s) => ({ ...s, interested: { ...s.interested, [itemId]: !s.interested[itemId] } })),
      moveCrm: (id: string, status: CrmStatus) =>
        setState((s) => ({
          ...s,
          crm: s.crm.map((it) => (it.id === id ? { ...it, status, updated: 'עודכן עכשיו' } : it)),
        })),
      addCrm: (item: CrmItem) => setState((s) => ({ ...s, crm: [item, ...s.crm] })),
      toggleReminder: (id: string) =>
        setState((s) => ({ ...s, remindersDone: { ...s.remindersDone, [id]: !s.remindersDone[id] } })),
      addNotice: (notice: Notice) => setState((s) => ({ ...s, notices: [notice, ...s.notices] })),
      markNoticesRead: () =>
        setState((s) =>
          s.notices.some((n) => !n.read) ? { ...s, notices: s.notices.map((n) => ({ ...n, read: true })) } : s,
        ),
      setMyCities: (myCities: string[]) => setState((s) => ({ ...s, myCities })),
      setAutoPublish: (autoPublish: boolean) => setState((s) => ({ ...s, autoPublish })),
      setOnboarded: (onboarded: boolean) => setState((s) => ({ ...s, onboarded })),
      setBuilder: (patch: Partial<BuilderState>) =>
        setState((s) => ({ ...s, builder: { ...s.builder, ...patch } })),
      setPagePublished: (v: boolean) => setState((s) => ({ ...s, pagePublished: v })),
      reset: () => {
        setMatchAlert(null)
        setState(initial())
      },
    }),
    [],
  )

  const value = useMemo(
    () => ({ ...state, ...actions, toast, toastMessage, matchAlert, showMatch: setMatchAlert }),
    [state, actions, toast, toastMessage, matchAlert],
  )

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useStore() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useStore must be used inside StoreProvider')
  return ctx
}
