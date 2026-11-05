import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import {
  builderDefaults,
  crmItems as seedCrm,
  posts as seedPosts,
  sharedBoard as seedBoard,
} from './data/demo'
import type { BoardCard, BuilderState, CrmItem, CrmStatus, Post } from './data/demo'

// Client-side demo state only. Nothing here talks to a server.
type State = {
  liked: Record<string, boolean>
  posts: Post[]
  board: BoardCard[]
  crm: CrmItem[]
  publishedIds: Record<string, boolean>
  interested: Record<string, boolean>
  remindersDone: Record<string, boolean>
  builder: BuilderState
  pagePublished: boolean
}

const STORAGE_KEY = 'brokers-demo-state-v3'

const initial = (): State => ({
  liked: {},
  posts: seedPosts,
  board: seedBoard,
  crm: seedCrm,
  publishedIds: {},
  interested: {},
  remindersDone: {},
  builder: builderDefaults,
  pagePublished: false,
})

const load = (): State => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return { ...initial(), ...JSON.parse(raw) }
  } catch {
    /* storage unavailable: start clean */
  }
  return initial()
}

type Store = State & {
  toggleLike: (postId: string) => void
  addPost: (post: Post) => void
  moveCrm: (id: string, status: CrmStatus) => void
  publishToBoard: (card: BoardCard, sourceId: string) => void
  clearFresh: () => void
  toggleInterested: (cardId: string) => void
  toggleReminder: (id: string) => void
  setBuilder: (patch: Partial<BuilderState>) => void
  setPagePublished: (v: boolean) => void
  reset: () => void
  toast: (message: string) => void
  toastMessage: string | null
}

const Ctx = createContext<Store | null>(null)

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<State>(load)
  const [toastMessage, setToastMessage] = useState<string | null>(null)
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
      toggleLike: (postId: string) =>
        setState((s) => ({ ...s, liked: { ...s.liked, [postId]: !s.liked[postId] } })),
      addPost: (post: Post) => setState((s) => ({ ...s, posts: [post, ...s.posts] })),
      moveCrm: (id: string, status: CrmStatus) =>
        setState((s) => ({
          ...s,
          crm: s.crm.map((it) => (it.id === id ? { ...it, status, updated: 'עודכן עכשיו' } : it)),
        })),
      publishToBoard: (card: BoardCard, sourceId: string) =>
        setState((s) => ({
          ...s,
          board: [card, ...s.board.map((c) => ({ ...c, fresh: false }))],
          publishedIds: { ...s.publishedIds, [sourceId]: true },
        })),
      clearFresh: () =>
        setState((s) =>
          s.board.some((c) => c.fresh) ? { ...s, board: s.board.map((c) => ({ ...c, fresh: false })) } : s,
        ),
      toggleInterested: (cardId: string) =>
        setState((s) => ({ ...s, interested: { ...s.interested, [cardId]: !s.interested[cardId] } })),
      toggleReminder: (id: string) =>
        setState((s) => ({ ...s, remindersDone: { ...s.remindersDone, [id]: !s.remindersDone[id] } })),
      setBuilder: (patch: Partial<BuilderState>) =>
        setState((s) => ({ ...s, builder: { ...s.builder, ...patch } })),
      setPagePublished: (v: boolean) => setState((s) => ({ ...s, pagePublished: v })),
      reset: () => setState(initial()),
    }),
    [],
  )

  const value = useMemo(
    () => ({ ...state, ...actions, toast, toastMessage }),
    [state, actions, toast, toastMessage],
  )

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useStore() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useStore must be used inside StoreProvider')
  return ctx
}
