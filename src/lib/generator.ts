import { poolFor } from '../content/catalog'
import type { AgeBand, Block, Category, Exercise, Metric } from '../content/schema'
import { isoWeekday } from './date'

export type Focus = 'energy' | 'strong' | 'play' | 'free'

export interface PlanStep {
  key: string
  kind: 'work' | 'rest' | 'break'
  slug: string
  block: Block
  round: number
  durationSec: number
}

export interface SessionPlan {
  band: AgeBand
  durationMin: number
  focus: Focus
  title: string
  subtitle: string
  steps: PlanStep[]
  mainSlugs: string[]
  estimatedSec: number
  createdAt: string
}

export const FOCUS_INFO: Record<
  Focus,
  { title: string; subtitle: string; categories: Category[] }
> = {
  energy: {
    title: 'Năng lượng rộn ràng',
    subtitle: 'Tim đập vui, cơ thể bừng tỉnh',
    categories: ['cardio', 'coordination'],
  },
  strong: {
    title: 'Cơ thể khoẻ mạnh',
    subtitle: 'Sức mạnh nhỏ, tự tin lớn',
    categories: ['strength', 'balance'],
  },
  play: {
    title: 'Chơi vui hết cỡ',
    subtitle: 'Vừa chơi vừa vận động',
    categories: ['game', 'coordination'],
  },
  free: {
    title: 'Buổi tập tự do',
    subtitle: 'Vận động theo cách bé thích',
    categories: ['cardio', 'strength', 'balance', 'coordination', 'game'],
  },
}

export function focusForDate(dateKey: string): Focus {
  const weekday = isoWeekday(dateKey)
  if (weekday === 1 || weekday === 2) return 'energy'
  if (weekday === 3 || weekday === 4) return 'strong'
  if (weekday === 5 || weekday === 6) return 'play'
  return 'free'
}

export function hashString(value: string): number {
  let hash = 2166136261
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

export function mulberry32(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function sampleExercises(
  pool: Exercise[],
  count: number,
  focus: Focus,
  recentSlugs: string[],
  rng: () => number,
): Exercise[] {
  const remaining = [...pool]
  const chosen: Exercise[] = []
  const boosted = new Set(FOCUS_INFO[focus].categories)

  while (chosen.length < count && remaining.length > 0) {
    const weights = remaining.map((exercise) => {
      let weight = boosted.has(exercise.category) ? 2.1 : 1
      if (recentSlugs.includes(exercise.slug)) weight *= 0.18
      if (chosen.some((item) => item.category === exercise.category)) weight *= 0.72
      return weight
    })
    const total = weights.reduce((sum, weight) => sum + weight, 0)
    let roll = rng() * total
    let index = 0
    for (let i = 0; i < weights.length; i += 1) {
      roll -= weights[i]
      if (roll <= 0) {
        index = i
        break
      }
    }
    chosen.push(remaining[index])
    remaining.splice(index, 1)
  }
  return chosen
}

function estimateMain(
  mains: Exercise[],
  band: AgeBand,
  rounds: number,
): number {
  const perRound = mains.reduce((sum, exercise) => {
    const params = exercise.ageParams[band]
    if (!params) return sum
    return sum + params.workSec + params.restSec
  }, 0)
  return perRound * rounds + Math.max(0, rounds - 1) * 60
}

export function stepTarget(exercise: Exercise, band: AgeBand): Metric {
  return exercise.ageParams[band] ? exercise.metric : 'reps'
}

export interface BuildPlanOptions {
  childId: string
  band: AgeBand
  durationMin: number
  dateKey: string
  recentSlugs?: string[]
}

export function buildSessionPlan(options: BuildPlanOptions): SessionPlan {
  const { childId, band, durationMin, dateKey } = options
  const focus = focusForDate(dateKey)
  const recentSlugs = options.recentSlugs ?? []
  const targetSec = durationMin * 60
  const warmupCount = 3
  const cooldownCount = 3

  let best:
    | { mains: Exercise[]; rounds: number; warmups: Exercise[]; cooldowns: Exercise[]; diff: number }
    | null = null

  for (const mainCount of [4, 5, 6]) {
    for (const rounds of [2, 3, 4]) {
      const rng = mulberry32(
        hashString(`${childId}|${dateKey}|${mainCount}|${rounds}|${band}`),
      )
      const warmups = sampleExercises(
        poolFor(band, 'warmup'),
        warmupCount,
        focus,
        [],
        rng,
      )
      const cooldowns = sampleExercises(
        poolFor(band, 'cooldown'),
        cooldownCount,
        focus,
        [],
        rng,
      )
      const mains = sampleExercises(
        poolFor(band, 'main'),
        mainCount,
        focus,
        recentSlugs,
        rng,
      )
      const estimate =
        3 * (45 + 10) +
        3 * (40 + 5) +
        estimateMain(mains, band, rounds)
      const diff = Math.abs(estimate - targetSec)
      if (!best || diff < best.diff) {
        best = { mains, rounds, warmups, cooldowns, diff }
      }
    }
  }

  if (!best) throw new Error('Không đủ bài tập để tạo buổi tập')

  const steps: PlanStep[] = []
  const pushStep = (
    kind: PlanStep['kind'],
    slug: string,
    block: Block,
    round: number,
    durationSec: number,
  ) => {
    steps.push({
      key: `${kind}-${block}-${round}-${slug}-${steps.length}`,
      kind,
      slug,
      block,
      round,
      durationSec: Math.max(1, Math.round(durationSec)),
    })
  }

  best.warmups.forEach((exercise) => {
    pushStep('work', exercise.slug, 'warmup', 1, 45)
    pushStep('rest', exercise.slug, 'warmup', 1, 10)
  })

  for (let round = 1; round <= best.rounds; round += 1) {
    best.mains.forEach((exercise) => {
      const params = exercise.ageParams[band]
      if (!params) return
      pushStep('work', exercise.slug, 'main', round, params.workSec)
      pushStep('rest', exercise.slug, 'main', round, params.restSec)
    })
    if (round < best.rounds) {
      pushStep('break', best.mains[0].slug, 'main', round, 60)
    }
  }

  best.cooldowns.forEach((exercise) => {
    pushStep('work', exercise.slug, 'cooldown', 1, 40)
    pushStep('rest', exercise.slug, 'cooldown', 1, 5)
  })

  const estimatedSec = steps.reduce((sum, step) => sum + step.durationSec, 0)
  const info = FOCUS_INFO[focus]

  return {
    band,
    durationMin,
    focus,
    title: info.title,
    subtitle: info.subtitle,
    steps,
    mainSlugs: best.mains.map((exercise) => exercise.slug),
    estimatedSec,
    createdAt: new Date().toISOString(),
  }
}

export function countMainExercises(plan: SessionPlan): number {
  return plan.mainSlugs.length
}

export function estimateMinutes(plan: SessionPlan): number {
  return Math.round(plan.estimatedSec / 60)
}
