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
  version: 1
  parent: ParentAccount | null
  child: Child | null
  measurements: Measurement[]
  schedule: Schedule
  sessions: WorkoutSession[]
  bests: Record<string, BestEntry>
  pinHash: string | null
  createdAt: string
}

export interface ChildSummary {
  id: string
  nickname: string
  age: number
  band: AgeBand
}
