import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { getExercise } from '../content/catalog'
import { bandForChild } from '../lib/age'
import { todayKey } from '../lib/date'
import { buildSessionPlan, type SessionPlan } from '../lib/generator'
import type {
  AppData,
  BestEntry,
  Child,
  Measurement,
  ResultEntry,
  Schedule,
  Sex,
  WorkoutSession,
} from '../lib/types'

const STORAGE_KEY = 'strongkids.data.v1'

function uid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return `id-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

export function hashPin(pin: string): string {
  let hash = 5381
  for (let i = 0; i < pin.length; i += 1) {
    hash = (hash * 33) ^ pin.charCodeAt(i)
  }
  return (hash >>> 0).toString(36)
}

function emptyData(): AppData {
  return {
    version: 1,
    parent: null,
    child: null,
    measurements: [],
    schedule: { weekdays: [1, 3, 5], durationMin: 25 },
    sessions: [],
    bests: {},
    pinHash: null,
    createdAt: new Date().toISOString(),
  }
}

function bestKey(slug: string, metric: string): string {
  return `${slug}:${metric}`
}

function loadData(): AppData {
  if (typeof localStorage === 'undefined') return emptyData()
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return emptyData()
    const parsed = JSON.parse(raw) as AppData
    if (parsed.version !== 1) return emptyData()
    return { ...emptyData(), ...parsed }
  } catch {
    return emptyData()
  }
}

function persist(data: AppData) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch {
    // Bộ nhớ đầy hoặc trình duyệt chặn: app vẫn chạy trong phiên hiện tại.
  }
}

function addResultToBests(
  bests: Record<string, BestEntry>,
  result: ResultEntry,
  direction: 'higher_better' | 'lower_better',
): Record<string, BestEntry> {
  if (result.value <= 0) return bests
  const key = bestKey(result.slug, result.metric)
  const current = bests[key]
  const better =
    !current ||
    (direction === 'higher_better'
      ? result.value > current.value
      : result.value < current.value)
  if (!better) return bests
  return {
    ...bests,
    [key]: {
      value: result.value,
      achievedAt: result.achievedAt,
      metric: result.metric,
      direction,
    },
  }
}

function makeDemoData(): AppData {
  const now = new Date()
  const today = todayKey(now)
  const childId = uid()
  const band = '8-9'
  const schedule: Schedule = { weekdays: [1, 3, 5], durationMin: 25 }
  const child: Child = {
    id: childId,
    nickname: 'Miu',
    birthYear: now.getFullYear() - 8,
    birthMonth: 5,
    sex: 'female',
    heightCm: 128,
    weightKg: 27.5,
    avatarKey: 'panda',
    createdAt: new Date(now.getTime() - 30 * 86_400_000).toISOString(),
  }

  const sessions: WorkoutSession[] = []
  const bests: Record<string, BestEntry> = {}

  const scheduledPast: string[] = []
  for (let i = 1; i <= 14 && scheduledPast.length < 2; i += 1) {
    const date = new Date(now)
    date.setDate(now.getDate() - i)
    const key = todayKey(date)
    const weekday = date.getDay() === 0 ? 7 : date.getDay()
    if (schedule.weekdays.includes(weekday)) scheduledPast.unshift(key)
  }

  scheduledPast.forEach((dateKey, sessionIndex) => {
    const plan = buildSessionPlan({
      childId,
      band,
      durationMin: schedule.durationMin,
      dateKey,
    })
    const results: ResultEntry[] = []
    plan.mainSlugs.forEach((slug, slugIndex) => {
      const exercise = getExercise(slug)
      const params = exercise.ageParams[band]
      if (!params) return
      for (let round = 1; round <= 2; round += 1) {
        const bump = (sessionIndex + slugIndex + round) % 3
        const value =
          exercise.direction === 'higher_better'
            ? Math.round(params.target + bump)
            : Math.round(Math.max(4, params.target - bump))
        const result: ResultEntry = {
          slug,
          metric: exercise.metric,
          value,
          itemKey: `${slug}-r${round}`,
          round,
          block: 'main',
          achievedAt: `${dateKey}T17:30:00.000Z`,
          isNewBest: false,
        }
        results.push(result)
        const direction = exercise.direction
        const key = bestKey(slug, exercise.metric)
        const current = bests[key]
        const better =
          !current ||
          (direction === 'higher_better' ? value > current.value : value < current.value)
        if (better && value > 0) {
          bests[key] = {
            value,
            achievedAt: result.achievedAt,
            metric: exercise.metric,
            direction,
          }
        }
      }
    })
    sessions.push({
      id: uid(),
      childId,
      dateKey,
      plan,
      status: 'completed',
      startedAt: `${dateKey}T17:00:00.000Z`,
      completedAt: `${dateKey}T17:30:00.000Z`,
      activeSec: plan.estimatedSec,
      results,
      bestBefore: {},
    })
  })

  return {
    ...emptyData(),
    parent: { email: 'demo@strongkids.vn', consentedAt: now.toISOString() },
    child,
    measurements: [
      {
        id: uid(),
        dateKey: today,
        heightCm: child.heightCm,
        weightKg: child.weightKg,
        createdAt: now.toISOString(),
      },
    ],
    schedule,
    sessions,
    bests,
  }
}

export interface OnboardingInput {
  email: string
  nickname: string
  birthYear: number
  birthMonth: number | null
  sex: Sex | null
  heightCm: number
  weightKg: number
  weekdays: number[]
  durationMin: 20 | 25 | 30
}

interface StoreValue {
  data: AppData
  signIn: (email: string) => void
  startDemo: () => void
  completeOnboarding: (input: OnboardingInput) => void
  setSchedule: (schedule: Schedule) => void
  updateChild: (patch: Partial<Child>) => void
  addMeasurement: (heightCm: number, weightKg: number, dateKey: string) => void
  startSession: (plan: SessionPlan) => string
  recordResult: (
    sessionId: string,
    input: {
      slug: string
      metric: ResultEntry['metric']
      value: number
      itemKey: string
      round: number
      block: ResultEntry['block']
    },
  ) => { isNewBest: boolean; previousBest?: number; isFirst: boolean }
  completeSession: (sessionId: string, activeSec: number) => void
  abandonSession: (sessionId: string) => void
  setPin: (pin: string) => void
  verifyPin: (pin: string) => boolean
  exportData: () => string
  resetAll: () => void
}

const StoreContext = createContext<StoreValue | null>(null)

export function StoreProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AppData>(() => loadData())
  const dataRef = useRef(data)

  const update = useCallback((updater: (current: AppData) => AppData) => {
    const next = updater(dataRef.current)
    dataRef.current = next
    setData(next)
    persist(next)
  }, [])

  const signIn = useCallback(
    (email: string) => {
      update((current) => ({
        ...current,
        parent: current.parent ?? {
          email,
          consentedAt: new Date().toISOString(),
        },
      }))
    },
    [update],
  )

  const startDemo = useCallback(() => {
    const demo = makeDemoData()
    dataRef.current = demo
    setData(demo)
    persist(demo)
  }, [])

  const completeOnboarding = useCallback(
    (input: OnboardingInput) => {
      const now = new Date()
      const childId = uid()
      const child: Child = {
        id: childId,
        nickname: input.nickname.trim(),
        birthYear: input.birthYear,
        birthMonth: input.birthMonth,
        sex: input.sex,
        heightCm: input.heightCm,
        weightKg: input.weightKg,
        avatarKey: 'panda',
        createdAt: now.toISOString(),
      }
      const measurement: Measurement = {
        id: uid(),
        dateKey: todayKey(now),
        heightCm: input.heightCm,
        weightKg: input.weightKg,
        createdAt: now.toISOString(),
      }
      update((current) => ({
        ...current,
        parent: { email: input.email, consentedAt: now.toISOString() },
        child,
        measurements: [measurement],
        schedule: {
          weekdays: input.weekdays.length ? input.weekdays : [1, 3, 5],
          durationMin: input.durationMin,
        },
      }))
    },
    [update],
  )

  const setSchedule = useCallback(
    (schedule: Schedule) => {
      update((current) => ({ ...current, schedule }))
    },
    [update],
  )

  const updateChild = useCallback(
    (patch: Partial<Child>) => {
      update((current) =>
        current.child
          ? { ...current, child: { ...current.child, ...patch } }
          : current,
      )
    },
    [update],
  )

  const addMeasurement = useCallback(
    (heightCm: number, weightKg: number, dateKey: string) => {
      update((current) => {
        if (!current.child) return current
        const measurement: Measurement = {
          id: uid(),
          dateKey,
          heightCm,
          weightKg,
          createdAt: new Date().toISOString(),
        }
        const measurements = current.measurements
          .filter((item) => item.dateKey !== dateKey)
          .concat(measurement)
          .sort((a, b) => a.dateKey.localeCompare(b.dateKey))
        return {
          ...current,
          child: { ...current.child, heightCm, weightKg },
          measurements,
        }
      })
    },
    [update],
  )

  const startSession = useCallback(
    (plan: SessionPlan) => {
      const id = uid()
      const bestBefore: Record<string, number> = {}
      plan.mainSlugs.forEach((slug) => {
        const exercise = getExercise(slug)
        const best = dataRef.current.bests[bestKey(slug, exercise.metric)]
        if (best) bestBefore[bestKey(slug, exercise.metric)] = best.value
      })
      const session: WorkoutSession = {
        id,
        childId: dataRef.current.child?.id ?? '',
        dateKey: todayKey(),
        plan,
        status: 'in_progress',
        startedAt: new Date().toISOString(),
        activeSec: 0,
        results: [],
        bestBefore,
      }
      update((current) => ({
        ...current,
        sessions: [
          ...current.sessions.map((item) =>
            item.childId === session.childId && item.status === 'in_progress'
              ? { ...item, status: 'abandoned' as const }
              : item,
          ),
          session,
        ],
      }))
      return id
    },
    [update],
  )

  const recordResult = useCallback<StoreValue['recordResult']>(
    (sessionId, input) => {
      const exercise = getExercise(input.slug)
      const achievedAt = new Date().toISOString()
      const previousBest = dataRef.current.sessions.find(
        (session) => session.id === sessionId,
      )?.bestBefore[bestKey(input.slug, input.metric)]
      const better =
        previousBest !== undefined &&
        input.value > 0 &&
        (exercise.direction === 'higher_better'
          ? input.value > previousBest
          : input.value < previousBest)
      const isNewBest = Boolean(better)
      const isFirst = previousBest === undefined

      const entry: ResultEntry = {
        ...input,
        achievedAt,
        isNewBest,
        previousBest,
      }

      update((current) => {
        const sessions = current.sessions.map((session) =>
          session.id === sessionId
            ? { ...session, results: [...session.results, entry] }
            : session,
        )
        return {
          ...current,
          sessions,
          bests: addResultToBests(current.bests, entry, exercise.direction),
        }
      })

      return { isNewBest, previousBest, isFirst }
    },
    [update],
  )

  const completeSession = useCallback(
    (sessionId: string, activeSec: number) => {
      update((current) => ({
        ...current,
        sessions: current.sessions.map((session) =>
          session.id === sessionId && session.status === 'in_progress'
            ? {
                ...session,
                status: 'completed',
                completedAt: new Date().toISOString(),
                activeSec,
              }
            : session,
        ),
      }))
    },
    [update],
  )

  const abandonSession = useCallback(
    (sessionId: string) => {
      update((current) => ({
        ...current,
        sessions: current.sessions.map((session) =>
          session.id === sessionId && session.status === 'in_progress'
            ? { ...session, status: 'abandoned' }
            : session,
        ),
      }))
    },
    [update],
  )

  const setPin = useCallback(
    (pin: string) => {
      update((current) => ({ ...current, pinHash: hashPin(pin) }))
    },
    [update],
  )

  const verifyPin = useCallback((pin: string) => hashPin(pin) === dataRef.current.pinHash, [])

  const exportData = useCallback(() => {
    // Mã PIN chỉ dùng để khoá trên thiết bị này, không xuất kèm dữ liệu.
    const snapshot = { ...dataRef.current, pinHash: undefined }
    return JSON.stringify(snapshot, null, 2)
  }, [])

  const resetAll = useCallback(() => {
    const empty = emptyData()
    dataRef.current = empty
    setData(empty)
    persist(empty)
  }, [])

  const value = useMemo<StoreValue>(
    () => ({
      data,
      signIn,
      startDemo,
      completeOnboarding,
      setSchedule,
      updateChild,
      addMeasurement,
      startSession,
      recordResult,
      completeSession,
      abandonSession,
      setPin,
      verifyPin,
      exportData,
      resetAll,
    }),
    [
      data,
      signIn,
      startDemo,
      completeOnboarding,
      setSchedule,
      updateChild,
      addMeasurement,
      startSession,
      recordResult,
      completeSession,
      abandonSession,
      setPin,
      verifyPin,
      exportData,
      resetAll,
    ],
  )

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export function useStore(): StoreValue {
  const value = useContext(StoreContext)
  if (!value) throw new Error('useStore phải nằm trong StoreProvider')
  return value
}

export function childBand(child: Child) {
  return bandForChild(child.birthYear, child.birthMonth)
}
