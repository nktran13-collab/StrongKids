import type { AgeBand, Metric } from '../content/schema'
import type { SessionPlan } from './generator'

export type Sex = 'male' | 'female'

export interface ParentAccount {
  email: string
  consentedAt: string
}

export interface Child {
  id: string
  nickname: string
  birthYear: number
  birthMonth: number | null
  sex: Sex | null
  heightCm: number
  weightKg: number
  avatarKey: string
  createdAt: string
}

export interface Measurement {
  id: string
  childId: string
  dateKey: string
  heightCm: number
  weightKg: number
  createdAt: string
}

export interface Schedule {
  weekdays: number[]
  durationMin: 20 | 25 | 30
}

export interface ResultEntry {
  slug: string
  metric: Metric
  value: number
  itemKey: string
  round: number
  block: 'warmup' | 'main' | 'cooldown'
  achievedAt: string
  isNewBest: boolean
  previousBest?: number
}

export interface WorkoutSession {
  id: string
  childId: string
  dateKey: string
  plan: SessionPlan
  status: 'in_progress' | 'completed' | 'abandoned'
  startedAt: string
  completedAt?: string
  activeSec: number
  results: ResultEntry[]
  bestBefore: Record<string, number>
}

export interface BestEntry {
  value: number
  achievedAt: string
  metric: Metric
  direction: 'higher_better' | 'lower_better'
}

export interface AppData {
  version: 2
  parent: ParentAccount | null
  children: Child[]
  activeChildId: string | null
  measurements: Measurement[]
  /** Mỗi bé có lịch tập riêng, khoá theo childId. */
  schedules: Record<string, Schedule>
  sessions: WorkoutSession[]
  /** Kỷ lục tách theo từng bé: childId → `slug:metric` → kỷ lục. */
  bests: Record<string, Record<string, BestEntry>>
  pinHash: string | null
  createdAt: string
}

export interface ChildSummary {
  id: string
  nickname: string
  age: number
  band: AgeBand
}
