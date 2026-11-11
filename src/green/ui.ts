import type { CommunityItem } from '../data/demo'

/**
 * The actions the green version makes work in the browser (stage D): a new CRM card, sharing a post, and pasting a
 * message from WhatsApp. Shared screens only ask for one of them to open; the pop-ups live in GreenActions.
 */
export type GreenAsk = { kind: 'card' } | { kind: 'share'; item: CommunityItem } | { kind: 'whatsapp' }

let open: ((ask: GreenAsk) => void) | null = null
const watchers = new Set<() => void>()

export const greenUi = {
  open(ask: GreenAsk) {
    open?.(ask)
  },
  /** something was published to the community: whatever sits over the page steps aside */
  published() {
    watchers.forEach((w) => w())
  },
  /** told when something was published (the lab closes itself, so the new post is in sight) */
  watch(fn: () => void) {
    watchers.add(fn)
    return () => {
      watchers.delete(fn)
    }
  },
  /** the pop-ups register here while they are mounted */
  bind(fn: (ask: GreenAsk) => void) {
    open = fn
    return () => {
      if (open === fn) open = null
    }
  },
}
