import { Handshake, Heart, Lightbulb, ThumbsUp, Trophy } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { TopicId } from './topics'

// Reactions on community posts. Vector icons only (no emoji), tuned for brokers.
export type ReactionId = 'like' | 'love' | 'bravo' | 'useful' | 'deal'

export type Reaction = { id: ReactionId; label: string; icon: LucideIcon; color: string }

export const reactions: Reaction[] = [
  { id: 'like', label: 'אהבתי', icon: ThumbsUp, color: '#c9a24b' },
  { id: 'love', label: 'מעולה', icon: Heart, color: '#f08aa0' },
  { id: 'bravo', label: 'כל הכבוד', icon: Trophy, color: '#74d3a8' },
  { id: 'useful', label: 'מועיל', icon: Lightbulb, color: '#93b6f9' },
  { id: 'deal', label: 'בעניין', icon: Handshake, color: '#c3b1f4' },
]

export const reactionById = (id: string) => reactions.find((r) => r.id === id) ?? reactions[0]

/** Which reactions a topic's posts typically collect (demo seed for the summary row). */
export const topicReactions: Record<TopicId, ReactionId[]> = {
  coop: ['deal', 'like'],
  referrals: ['deal', 'like'],
  seeking: ['like', 'deal'],
  knowledge: ['useful', 'like', 'love'],
  posts: ['like', 'love', 'useful'],
  wins: ['bravo', 'love', 'like'],
}
