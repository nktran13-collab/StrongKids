import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import type { Session } from '@supabase/supabase-js'
import { getExercise } from '../content/catalog'
import { bandForChild } from '../lib/age'
import { todayKey } from '../lib/date'
import { buildSessionPlan, type SessionPlan } from '../lib/generator'
import {
  deleteFamilyState,
  fetchFamilyState,
  saveFamilyState,
  signInAnonymously,
} from '../lib/cloud'
import { cloudEnabled, supabase } from '../lib/supabase'
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

const LEGACY_KEY = 'strongkids.data.v1'
const CACHE_PREFIX = 'strongkids.cache.v1.'
const PENDING_PREFIX = 'strongkids.pending.v1.'
const CONSENT_KEY = 'strongkids.consent.v1'

export type CloudStatus = 'off' | 'demo' | 'idle' | 'saving' | 'saved' | 'offline' | 'error'

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

const DEFAULT_SCHEDULE: Schedule = { weekdays: [1, 3, 5], durationMin: 25 }

function emptyData(): AppData {
  return {
    version: 2,
    parent: null,
    children: [],
    activeChildId: null,
    measurements: [],
    schedules: {},
    sessions: [],
    bests: {},
    pinHash: null,
    createdAt: new Date().toISOString(),
  }
}

function normalizeSchedule(value: unknown): Schedule | null {
  if (!value || typeof value !== 'object') return null
  const raw = value as Partial<Schedule>
  if (!Array.isArray(raw.weekdays) || typeof raw.durationMin !== 'number') return null
  const weekdays = raw.weekdays.filter(
    (day): day is number => typeof day === 'number' && day >= 1 && day <= 7,
  )
  const durationMin = raw.durationMin === 20 || raw.durationMin === 25 || raw.durationMin === 30
    ? raw.durationMin
    : DEFAULT_SCHEDULE.durationMin
  return { weekdays, durationMin }
}

function normalizeChild(value: unknown): Child | null {
  if (!value || typeof value !== 'object') return null
  const raw = value as Partial<Child>
  if (typeof raw.id !== 'string' || !raw.id) return null
  if (typeof raw.birthYear !== 'number') return null
  return {
    id: raw.id,
    nickname: typeof raw.nickname === 'string' && raw.nickname.trim() ? raw.nickname.trim() : 'Bé',
    birthYear: raw.birthYear,
    birthMonth: typeof raw.birthMonth === 'number' ? raw.birthMonth : null,
    sex: raw.sex === 'male' || raw.sex === 'female' ? raw.sex : null,
    heightCm: typeof raw.heightCm === 'number' ? raw.heightCm : 0,
    weightKg: typeof raw.weightKg === 'number' ? raw.weightKg : 0,
    avatarKey: typeof raw.avatarKey === 'string' ? raw.avatarKey : 'panda',
    createdAt: typeof raw.createdAt === 'string' ? raw.createdAt : new Date().toISOString(),
  }
}

export function normalizeData(value: unknown): AppData | null {
  if (!value || typeof value !== 'object') return null
  const raw = value as Record<string, unknown>
  if (raw.version !== 1 && raw.version !== 2) return null
  const base = emptyData()

  const parent =
    raw.parent && typeof raw.parent === 'object'
      ? (raw.parent as AppData['parent'])
      : null
  const sessions = Array.isArray(raw.sessions) ? (raw.sessions as WorkoutSession[]) : []
  const pinHash = typeof raw.pinHash === 'string' ? raw.pinHash : null
  const createdAt = typeof raw.createdAt === 'string' ? raw.createdAt : base.createdAt

  if (raw.version === 1) {
    // Bản cũ chỉ có một bé: chuyển toàn bộ dữ liệu sang hồ sơ đầu tiên.
    const child = normalizeChild(raw.child)
    const childId = child?.id ?? null
    const measurements = (Array.isArray(raw.measurements) ? raw.measurements : [])
      .filter((item): item is Measurement => Boolean(item) && typeof item === 'object')
      .map((item) => ({ ...item, childId: item.childId || childId || '' }))
      .filter((item) => item.childId)
    const schedule = normalizeSchedule(raw.schedule)
    const bests =
      raw.bests && typeof raw.bests === 'object' && childId
        ? { [childId]: raw.bests as Record<string, BestEntry> }
        : {}
    return {
      version: 2,
      parent,
      children: child ? [child] : [],
      activeChildId: childId,
      measurements,
      schedules: childId ? { [childId]: schedule ?? { ...DEFAULT_SCHEDULE } } : {},
      sessions,
      bests,
      pinHash,
      createdAt,
    }
  }

  const children = (Array.isArray(raw.children) ? raw.children : [])
    .map(normalizeChild)
    .filter((child): child is Child => Boolean(child))
  const activeChildId =
    typeof raw.activeChildId === 'string' && children.some((child) => child.id === raw.activeChildId)
      ? raw.activeChildId
      : (children[0]?.id ?? null)
  const schedules: Record<string, Schedule> = {}
  const rawSchedules =
    raw.schedules && typeof raw.schedules === 'object'
      ? (raw.schedules as Record<string, unknown>)
      : {}
  const bests: Record<string, Record<string, BestEntry>> = {}
  const rawBests =
    raw.bests && typeof raw.bests === 'object'
      ? (raw.bests as Record<string, unknown>)
      : {}

  children.forEach((child) => {
    schedules[child.id] = normalizeSchedule(rawSchedules[child.id]) ?? { ...DEFAULT_SCHEDULE }
    const own = rawBests[child.id]
    bests[child.id] = own && typeof own === 'object' ? (own as Record<string, BestEntry>) : {}
  })

  return {
    version: 2,
    parent,
    children,
    activeChildId,
    measurements: (Array.isArray(raw.measurements) ? raw.measurements : [])
      .filter((item): item is Measurement => Boolean(item) && typeof item === 'object')
      .filter((item) => typeof item.childId === 'string' && item.childId)
      .map((item, index) => ({ ...item, id: item.id || `measure-${index}` })),
    schedules,
    sessions: sessions.filter(
      (session) =>
        session &&
        typeof session === 'object' &&
        children.some((child) => child.id === session.childId),
    ),
    bests,
    pinHash,
    createdAt,
  }
}

function readStorage(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

function writeStorage(key: string, value: string) {
  try {
    localStorage.setItem(key, value)
  } catch {
    // Bộ nhớ đầy hoặc trình duyệt chặn: dữ liệu vẫn được giữ trong phiên hiện tại.
  }
}

function removeStorage(key: string) {
  try {
    localStorage.removeItem(key)
  } catch {
    // Không xoá được thì bỏ qua.
  }
}

function readCache(userId: string): AppData | null {
  const raw = readStorage(CACHE_PREFIX + userId)
  if (!raw) return null
  try {
    return normalizeData(JSON.parse(raw))
  } catch {
    return null
  }
}

function writeCache(userId: string, data: AppData) {
  writeStorage(CACHE_PREFIX + userId, JSON.stringify(data))
}

function clearCache(userId: string) {
  removeStorage(CACHE_PREFIX + userId)
  removeStorage(PENDING_PREFIX + userId)
}

function isPending(userId: string): boolean {
  return readStorage(PENDING_PREFIX + userId) === '1'
}

function markPending(userId: string) {
  writeStorage(PENDING_PREFIX + userId, '1')
}

function markSynced(userId: string) {
  removeStorage(PENDING_PREFIX + userId)
}

function readConsent(email: string): string | null {
  const raw = readStorage(CONSENT_KEY)
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as { email?: string; at?: string }
    if (
      typeof parsed.email === 'string' &&
      parsed.email.trim().toLowerCase() === email.trim().toLowerCase() &&
      typeof parsed.at === 'string'
    ) {
      return parsed.at
    }
  } catch {
    // Bản ghi hỏng thì coi như chưa có.
  }
  return null
}

function rememberConsent(email: string): string {
  const at = new Date().toISOString()
  writeStorage(CONSENT_KEY, JSON.stringify({ email, at, version: 1 }))
  return at
}

function withParent(data: AppData, email: string, consentAt: string | null): AppData {
  const now = new Date().toISOString()
  if (!data.parent) {
    return { ...data, parent: { email, consentedAt: consentAt ?? now } }
  }
  if (!data.parent.email || data.parent.email.toLowerCase() !== email.toLowerCase()) {
    return { ...data, parent: { ...data.parent, email } }
  }
  return data
}

/** Dữ liệu cũ trước khi có tài khoản: chỉ nhận nếu đúng email đang đăng nhập. */
function legacyFor(email: string): AppData | null {
  const raw = readStorage(LEGACY_KEY)
  if (!raw) return null
  try {
    const parsed = normalizeData(JSON.parse(raw))
    if (!parsed?.parent) return null
    const stored = parsed.parent.email.trim().toLowerCase()
    if (stored === 'demo@strongkids.vn') return null
    if (stored !== email.trim().toLowerCase()) return null
    return parsed
  } catch {
    return null
  }
}

function removeLegacy() {
  removeStorage(LEGACY_KEY)
}

/** Sau khi magic link đổi mã xong, bỏ ?code khỏi thanh địa chỉ. */
function removeAuthCodeFromUrl() {
  const url = new URL(window.location.href)
  if (!url.searchParams.has('code')) return
  url.searchParams.delete('code')
  url.searchParams.delete('state')
  const search = url.searchParams.toString()
  window.history.replaceState(
    {},
    '',
    `${url.pathname}${search ? `?${search}` : ''}${url.hash}`,
  )
}

function bestKey(slug: string, metric: string): string {
  return `${slug}:${metric}`
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
    children: [child],
    activeChildId: child.id,
    measurements: [
      {
        id: uid(),
        childId,
        dateKey: today,
        heightCm: child.heightCm,
        weightKg: child.weightKg,
        createdAt: now.toISOString(),
      },
    ],
    schedules: { [childId]: schedule },
    sessions,
    bests: { [childId]: bests },
  }
}

export interface OnboardingInput {
  email: string
  nickname: string
  birthYear: number
  birthMonth: number | null
  sex: Sex
  heightCm: number
  weightKg: number
  weekdays: number[]
  durationMin: 20 | 25 | 30
}

interface StoreValue {
  data: AppData
  authReady: boolean
  accountEmail: string | null
  cloudStatus: CloudStatus
  /** Bé đang được chọn để tập; null khi chưa có hồ sơ nào. */
  activeChild: Child | null
  activeSchedule: Schedule
  activeMeasurements: Measurement[]
  activeSessions: WorkoutSession[]
  activeBests: Record<string, BestEntry>
  startWithEmail: (email: string) => Promise<{ ok: boolean; message: string }>
  startDemo: () => void
  completeOnboarding: (input: OnboardingInput) => void
  addChild: (input: OnboardingInput) => void
  setActiveChild: (childId: string) => void
  removeChild: (childId: string) => void
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
  resetAll: () => Promise<{ ok: boolean; message: string }>
}

const StoreContext = createContext<StoreValue | null>(null)

export function StoreProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AppData>(emptyData)
  const [authReady, setAuthReady] = useState(!cloudEnabled)
  const [accountEmail, setAccountEmail] = useState<string | null>(null)
  const [cloudStatus, setCloudStatus] = useState<CloudStatus>(cloudEnabled ? 'idle' : 'off')

  const dataRef = useRef(data)
  const modeRef = useRef<'guest' | 'demo' | 'account'>('guest')
  const userIdRef = useRef<string | null>(null)
  const sessionRef = useRef<Session | null>(null)
  const emailRef = useRef<string>('')
  const startingRef = useRef(false)
  const dirtyRef = useRef(false)
  const pendingRef = useRef<AppData | null>(null)
  const saveTimerRef = useRef<number | null>(null)
  const retryTimerRef = useRef<number | null>(null)
  const retryCountRef = useRef(0)
  const retryBlockedRef = useRef(false)
  const inFlightRef = useRef(false)
  const mountedRef = useRef(true)
  const pushRef = useRef<() => Promise<void>>(async () => {})

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current)
      if (retryTimerRef.current) window.clearTimeout(retryTimerRef.current)
    }
  }, [])

  const scheduleRetry = useCallback((delay = 6000) => {
    if (retryTimerRef.current) return
    retryTimerRef.current = window.setTimeout(() => {
      retryTimerRef.current = null
      void pushRef.current()
    }, delay)
  }, [])

  const pushPending = useCallback(async () => {
    const userId = userIdRef.current
    if (!cloudEnabled || !userId || modeRef.current !== 'account') return
    if (inFlightRef.current) return
    const snapshot = pendingRef.current
    if (!snapshot) return

    pendingRef.current = null
    inFlightRef.current = true
    if (mountedRef.current) setCloudStatus('saving')

    try {
      await saveFamilyState(userId, snapshot)
      if (userId !== userIdRef.current) return
      markSynced(userId)
      dirtyRef.current = false
      retryCountRef.current = 0
      retryBlockedRef.current = false
      if (mountedRef.current) setCloudStatus('saved')
    } catch {
      if (userId !== userIdRef.current) return
      if (!pendingRef.current) pendingRef.current = snapshot
      markPending(userId)
      if (!navigator.onLine) {
        if (mountedRef.current) setCloudStatus('offline')
        return
      }
      retryCountRef.current += 1
      if (retryCountRef.current >= 5) retryBlockedRef.current = true
      if (mountedRef.current) setCloudStatus('error')
      if (!retryBlockedRef.current) scheduleRetry()
    } finally {
      inFlightRef.current = false
      if (
        pendingRef.current &&
        userIdRef.current === userId &&
        navigator.onLine &&
        !retryBlockedRef.current &&
        !retryTimerRef.current
      ) {
        scheduleRetry(0)
      }
    }
  }, [scheduleRetry])

  pushRef.current = pushPending

  const queueSave = useCallback(() => {
    if (!cloudEnabled || !userIdRef.current || modeRef.current !== 'account') return
    pendingRef.current = dataRef.current
    retryCountRef.current = 0
    retryBlockedRef.current = false
    if (retryTimerRef.current) {
      window.clearTimeout(retryTimerRef.current)
      retryTimerRef.current = null
    }
    if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current)
    saveTimerRef.current = window.setTimeout(() => {
      saveTimerRef.current = null
      void pushRef.current()
    }, 700)
  }, [])

  const commit = useCallback(
    (next: AppData) => {
      dataRef.current = next
      setData(next)
      if (modeRef.current !== 'account' || !userIdRef.current) return

      writeCache(userIdRef.current, next)
      markPending(userIdRef.current)
      dirtyRef.current = true
      pendingRef.current = next

      if (!navigator.onLine) {
        if (mountedRef.current) setCloudStatus('offline')
        return
      }
      if (mountedRef.current) setCloudStatus('saving')
      queueSave()
    },
    [queueSave],
  )

  const update = useCallback(
    (updater: (current: AppData) => AppData) => {
      commit(updater(dataRef.current))
    },
    [commit],
  )

  const adoptSession = useCallback(
    async (session: Session | null, preferredEmail?: string) => {
      if (!cloudEnabled || !session?.user) return
      const userId = session.user.id
      sessionRef.current = session
      const cached = readCache(userId)
      // Người dùng ẩn danh trả email = '' (không phải null), nên phải dùng || để
      // rơi xuống email bố mẹ vừa nhập.
      const email = (
        session.user.email ||
        preferredEmail ||
        emailRef.current ||
        cached?.parent?.email ||
        ''
      ).trim()

      if (userIdRef.current === userId && modeRef.current === 'account') {
        // Đã ở đúng tài khoản: chỉ cập nhật email nếu bố mẹ vừa nhập lại.
        if (email) {
          emailRef.current = email
          setAccountEmail(email)
          if (dataRef.current.parent?.email !== email) {
            const next = withParent(dataRef.current, email, readConsent(email))
            dataRef.current = next
            setData(next)
            writeCache(userId, next)
            markPending(userId)
            pendingRef.current = next
            if (navigator.onLine) {
              if (mountedRef.current) setCloudStatus('saving')
              queueSave()
            }
          }
        }
        return
      }

      userIdRef.current = userId
      modeRef.current = 'account'
      emailRef.current = email
      setAccountEmail(email || null)
      const consentAt = readConsent(email)
      const hadPending = isPending(userId)

      const ensureParent = (source: AppData) => (email ? withParent(source, email, consentAt) : source)

      if (cached) {
        // Mở app ngay bằng bản trên máy, kể cả khi đang offline.
        dataRef.current = cached
        setData(cached)
        setAuthReady(true)
        if (mountedRef.current) setCloudStatus(navigator.onLine ? 'idle' : 'offline')
      }

      const applyRemote = (next: AppData) => {
        dataRef.current = next
        setData(next)
        writeCache(userId, next)
        const nextEmail = next.parent?.email ?? ''
        if (nextEmail) {
          emailRef.current = nextEmail
          setAccountEmail(nextEmail)
        }
      }

      try {
        const remote = await fetchFamilyState(userId)
        if (userIdRef.current !== userId) return
        const remoteData = remote ? normalizeData(remote.data) : null

        if (cached && (hadPending || dirtyRef.current)) {
          // Có thay đổi chưa kịp lưu: bản trên máy là bản mới nhất.
          pendingRef.current = dataRef.current
          await pushRef.current()
        } else if (remoteData) {
          applyRemote(ensureParent(remoteData))
          markSynced(userId)
          if (mountedRef.current) setCloudStatus('saved')
        } else {
          const fallback = cached ?? legacyFor(email) ?? emptyData()
          const next = ensureParent(fallback)
          applyRemote(next)
          removeLegacy()
          pendingRef.current = next
          await pushRef.current()
        }
        setAuthReady(true)
      } catch {
        if (userIdRef.current !== userId) return
        if (!cached) {
          const next = ensureParent(legacyFor(email) ?? emptyData())
          dataRef.current = next
          setData(next)
          writeCache(userId, next)
          markPending(userId)
          pendingRef.current = next
        }
        setAuthReady(true)
        if (mountedRef.current) setCloudStatus(navigator.onLine ? 'error' : 'offline')
      } finally {
        // Dọn tham số xác thực còn sót lại trên URL (nếu có).
        removeAuthCodeFromUrl()
      }
    },
    [queueSave],
  )

  const handleAuthLost = useCallback(() => {
    // Mất phiên do token hết hạn: vẫn cho dùng bản offline, chỉ báo chưa đồng bộ được.
    if (modeRef.current === 'account' && userIdRef.current) {
      if (mountedRef.current) setCloudStatus(navigator.onLine ? 'error' : 'offline')
      return
    }
    setCloudStatus(cloudEnabled ? 'idle' : 'off')
  }, [])

  useEffect(() => {
    if (!supabase) {
      setAuthReady(true)
      return
    }

    let active = true
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active) return
      if (event === 'SIGNED_OUT') {
        handleAuthLost()
        return
      }
      // Bỏ qua sự kiện phát sinh ngay trong lúc startWithEmail đang chạy,
      // để email bố mẹ vừa nhập không bị ghi đè.
      if (session && !startingRef.current) void adoptSession(session)
    })

    void (async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession()
        if (!active) return
        await adoptSession(session)
      } catch {
        if (active) setCloudStatus(navigator.onLine ? 'error' : 'offline')
      } finally {
        if (active) {
          setAuthReady(true)
          removeAuthCodeFromUrl()
        }
      }
    })()

    return () => {
      active = false
      listener.subscription.unsubscribe()
    }
  }, [adoptSession, handleAuthLost])

  useEffect(() => {
    const onOnline = () => {
      const userId = userIdRef.current
      if (!userId || modeRef.current !== 'account') return
      retryCountRef.current = 0
      retryBlockedRef.current = false
      if (isPending(userId)) pendingRef.current = dataRef.current
      if (pendingRef.current) void pushRef.current()
    }
    const onOffline = () => {
      if (modeRef.current === 'account') setCloudStatus('offline')
    }
    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)
    return () => {
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOffline)
    }
  }, [])

  /**
   * Bản hiện tại chưa gửi email OTP. Bố mẹ nhập email để gắn hồ sơ; quyền truy cập
   * dữ liệu dựa trên phiên ẩn danh của chính thiết bị/trình duyệt này.
   */
  const startWithEmail = useCallback(
    async (email: string) => {
      if (!cloudEnabled || !supabase) {
        return {
          ok: false,
          message:
            'Máy chủ dữ liệu chưa được cấu hình. Bố mẹ xem hướng dẫn thiết lập Supabase rồi thử lại.',
        }
      }
      const clean = email.trim()
      startingRef.current = true
      try {
        emailRef.current = clean
        if (!readConsent(clean)) rememberConsent(clean)

        const existing = await supabase.auth.getSession()
        let session = existing.data.session
        if (!session) session = await signInAnonymously()

        await adoptSession(session, clean)

        if (!dataRef.current.parent) {
          return {
            ok: false,
            message: 'Chưa tạo được hồ sơ trên máy chủ. Bố mẹ kiểm tra mạng rồi thử lại.',
          }
        }
        return { ok: true, message: '' }
      } catch (error) {
        const detail = error instanceof Error ? error.message : ''
        console.error('StrongKids: không tạo được phiên đăng nhập', error)
        if (/anonymous/i.test(detail) && /disabled|not allowed|not enabled/i.test(detail)) {
          return {
            ok: false,
            message:
              'Máy chủ chưa bật đăng nhập thiết bị. Trong Supabase, vào Authentication → Providers → Anonymous và bật lên rồi thử lại.',
          }
        }
        if (/rate limit|too many/i.test(detail)) {
          return {
            ok: false,
            message: 'Máy chủ đang giới hạn số lần tạo hồ sơ. Bố mẹ chờ khoảng một phút rồi thử lại.',
          }
        }
        return {
          ok: false,
          message: 'Chưa kết nối được máy chủ dữ liệu. Bố mẹ kiểm tra mạng rồi thử lại.',
        }
      } finally {
        startingRef.current = false
      }
    },
    [adoptSession],
  )

  const startDemo = useCallback(() => {
    if (modeRef.current === 'account') return
    const demo = makeDemoData()
    modeRef.current = 'demo'
    dirtyRef.current = false
    pendingRef.current = null
    dataRef.current = demo
    setData(demo)
    setAccountEmail(null)
    setCloudStatus('demo')
  }, [])

  const addChild = useCallback(
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
        childId,
        dateKey: todayKey(now),
        heightCm: input.heightCm,
        weightKg: input.weightKg,
        createdAt: now.toISOString(),
      }
      update((current) => ({
        ...current,
        parent: current.parent
          ? { ...current.parent, email: input.email }
          : { email: input.email, consentedAt: now.toISOString() },
        children: [...current.children, child],
        activeChildId: childId,
        measurements: [...current.measurements, measurement],
        schedules: {
          ...current.schedules,
          [childId]: {
            weekdays: input.weekdays.length ? input.weekdays : [1, 3, 5],
            durationMin: input.durationMin,
          },
        },
        bests: { ...current.bests, [childId]: {} },
      }))
    },
    [update],
  )

  const completeOnboarding = addChild

  const setActiveChild = useCallback(
    (childId: string) => {
      update((current) =>
        current.activeChildId === childId ||
        !current.children.some((child) => child.id === childId)
          ? current
          : { ...current, activeChildId: childId },
      )
    },
    [update],
  )

  const removeChild = useCallback(
    (childId: string) => {
      update((current) => {
        if (!current.children.some((child) => child.id === childId)) return current
        const children = current.children.filter((child) => child.id !== childId)
        const schedules = { ...current.schedules }
        const bests = { ...current.bests }
        delete schedules[childId]
        delete bests[childId]
        return {
          ...current,
          children,
          activeChildId:
            current.activeChildId === childId
              ? (children[0]?.id ?? null)
              : current.activeChildId,
          schedules,
          bests,
          measurements: current.measurements.filter((item) => item.childId !== childId),
          sessions: current.sessions.filter((session) => session.childId !== childId),
        }
      })
    },
    [update],
  )

  const setSchedule = useCallback(
    (schedule: Schedule) => {
      update((current) =>
        current.activeChildId
          ? {
              ...current,
              schedules: { ...current.schedules, [current.activeChildId]: schedule },
            }
          : current,
      )
    },
    [update],
  )

  const updateChild = useCallback(
    (patch: Partial<Child>) => {
      update((current) =>
        current.activeChildId
          ? {
              ...current,
              children: current.children.map((child) =>
                child.id === current.activeChildId ? { ...child, ...patch } : child,
              ),
            }
          : current,
      )
    },
    [update],
  )

  const addMeasurement = useCallback(
    (heightCm: number, weightKg: number, dateKey: string) => {
      update((current) => {
        const childId = current.activeChildId
        if (!childId) return current
        const measurement: Measurement = {
          id: uid(),
          childId,
          dateKey,
          heightCm,
          weightKg,
          createdAt: new Date().toISOString(),
        }
        const measurements = current.measurements
          .filter((item) => !(item.childId === childId && item.dateKey === dateKey))
          .concat(measurement)
          .sort((a, b) => a.dateKey.localeCompare(b.dateKey))
        return {
          ...current,
          children: current.children.map((child) =>
            child.id === childId ? { ...child, heightCm, weightKg } : child,
          ),
          measurements,
        }
      })
    },
    [update],
  )

  const startSession = useCallback(
    (plan: SessionPlan) => {
      const id = uid()
      const childId = dataRef.current.activeChildId ?? ''
      const childBests = dataRef.current.bests[childId] ?? {}
      const bestBefore: Record<string, number> = {}
      plan.mainSlugs.forEach((slug) => {
        const exercise = getExercise(slug)
        const best = childBests[bestKey(slug, exercise.metric)]
        if (best) bestBefore[bestKey(slug, exercise.metric)] = best.value
      })
      const session: WorkoutSession = {
        id,
        childId,
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
      const targetSession = dataRef.current.sessions.find(
        (session) => session.id === sessionId,
      )
      const previousBest = targetSession?.bestBefore[bestKey(input.slug, input.metric)]
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
        const childId = targetSession?.childId ?? current.activeChildId
        if (!childId) return { ...current, sessions }
        return {
          ...current,
          sessions,
          bests: {
            ...current.bests,
            [childId]: addResultToBests(
              current.bests[childId] ?? {},
              entry,
              exercise.direction,
            ),
          },
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

  const resetAll = useCallback(async () => {
    const userId = userIdRef.current
    if (userId) {
      try {
        await deleteFamilyState(userId)
      } catch {
        return {
          ok: false,
          message:
            'Chưa xoá được dữ liệu trên máy chủ. Bố mẹ kiểm tra kết nối mạng rồi thử lại.',
        }
      }
      clearCache(userId)
      removeLegacy()
    }

    const empty = emptyData()
    const email = emailRef.current || dataRef.current.parent?.email || ''
    if (email) {
      empty.parent = { email, consentedAt: new Date().toISOString() }
    }
    dataRef.current = empty
    setData(empty)
    dirtyRef.current = false
    pendingRef.current = null
    retryCountRef.current = 0
    retryBlockedRef.current = false
    if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current)
    if (retryTimerRef.current) window.clearTimeout(retryTimerRef.current)
    saveTimerRef.current = null
    retryTimerRef.current = null

    if (userId) {
      try {
        await saveFamilyState(userId, empty)
        markSynced(userId)
        writeCache(userId, empty)
        if (mountedRef.current) setCloudStatus('saved')
      } catch {
        markPending(userId)
        writeCache(userId, empty)
        pendingRef.current = empty
        if (mountedRef.current) setCloudStatus(navigator.onLine ? 'error' : 'offline')
      }
    }
    return { ok: true, message: '' }
  }, [])

  const activeChild = useMemo(
    () => data.children.find((child) => child.id === data.activeChildId) ?? null,
    [data.children, data.activeChildId],
  )
  const activeSchedule = useMemo(
    () =>
      (data.activeChildId ? data.schedules[data.activeChildId] : undefined) ?? DEFAULT_SCHEDULE,
    [data.schedules, data.activeChildId],
  )
  const activeMeasurements = useMemo(
    () =>
      [...data.measurements]
        .filter((item) => item.childId === data.activeChildId)
        .sort((a, b) => a.dateKey.localeCompare(b.dateKey)),
    [data.measurements, data.activeChildId],
  )
  const activeSessions = useMemo(
    () => data.sessions.filter((session) => session.childId === data.activeChildId),
    [data.sessions, data.activeChildId],
  )
  const activeBests = useMemo(
    () => (data.activeChildId ? (data.bests[data.activeChildId] ?? {}) : {}),
    [data.bests, data.activeChildId],
  )

  const value = useMemo<StoreValue>(
    () => ({
      data,
      authReady,
      accountEmail,
      cloudStatus,
      activeChild,
      activeSchedule,
      activeMeasurements,
      activeSessions,
      activeBests,
      startWithEmail,
      startDemo,
      completeOnboarding,
      addChild,
      setActiveChild,
      removeChild,
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
      authReady,
      accountEmail,
      cloudStatus,
      activeChild,
      activeSchedule,
      activeMeasurements,
      activeSessions,
      activeBests,
      startWithEmail,
      startDemo,
      completeOnboarding,
      addChild,
      setActiveChild,
      removeChild,
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
  const context = useContext(StoreContext)
  if (!context) throw new Error('useStore phải nằm trong StoreProvider')
  return context
}

export function childBand(child: Child) {
  return bandForChild(child.birthYear, child.birthMonth)
}
