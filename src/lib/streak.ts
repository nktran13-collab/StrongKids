import type { WorkoutSession } from './types'
import { addDays, isoWeekday } from './date'

export interface StreakResult {
  current: number
  longest: number
  thisWeekCompleted: number
  lastCompletedKey: string | null
}

export function completedDateSet(sessions: WorkoutSession[]): Set<string> {
  return new Set(
    sessions.filter((session) => session.status === 'completed').map((session) => session.dateKey),
  )
}

function isScheduled(key: string, weekdays: number[]): boolean {
  return weekdays.includes(isoWeekday(key))
}

function previousScheduled(key: string, weekdays: number[]): string {
  let cursor = addDays(key, -1)
  for (let i = 0; i < 7; i += 1) {
    if (isScheduled(cursor, weekdays)) return cursor
    cursor = addDays(cursor, -1)
  }
  return cursor
}

export function computeStreak(params: {
  sessions: WorkoutSession[]
  weekdays: number[]
  startKey: string
  todayKey: string
}): StreakResult {
  const { sessions, weekdays, startKey, todayKey } = params
  if (weekdays.length === 0) {
    return { current: 0, longest: 0, thisWeekCompleted: 0, lastCompletedKey: null }
  }

  const completed = completedDateSet(sessions)
  const sortedCompleted = [...completed].sort()
  const lastCompletedKey = sortedCompleted.length
    ? sortedCompleted[sortedCompleted.length - 1]
    : null

  let anchor = todayKey
  if (isScheduled(todayKey, weekdays) && !completed.has(todayKey)) {
    anchor = addDays(todayKey, -1)
  }

  let current = 0
  let cursor = anchor
  let guard = 0
  while (cursor >= startKey && guard < 800) {
    guard += 1
    if (!isScheduled(cursor, weekdays)) {
      cursor = addDays(cursor, -1)
      continue
    }
    if (completed.has(cursor)) {
      current += 1
      cursor = previousScheduled(cursor, weekdays)
    } else {
      break
    }
  }

  let longest = 0
  let run = 0
  let scan = startKey
  const limit = todayKey
  let scanGuard = 0
  while (scan <= limit && scanGuard < 1500) {
    scanGuard += 1
    if (isScheduled(scan, weekdays)) {
      if (completed.has(scan)) {
        run += 1
        longest = Math.max(longest, run)
      } else if (scan !== todayKey) {
        run = 0
      }
    }
    scan = addDays(scan, 1)
  }

  const weekStart = addDays(todayKey, -(isoWeekday(todayKey) - 1))
  let thisWeekCompleted = 0
  for (let i = 0; i < 7; i += 1) {
    if (completed.has(addDays(weekStart, i))) thisWeekCompleted += 1
  }

  return { current, longest, thisWeekCompleted, lastCompletedKey }
}

export function sessionsInLastDays(
  sessions: WorkoutSession[],
  todayKey: string,
  days: number,
): WorkoutSession[] {
  const from = addDays(todayKey, -(days - 1))
  return sessions.filter(
    (session) =>
      session.status === 'completed' &&
      session.dateKey >= from &&
      session.dateKey <= todayKey,
  )
}
