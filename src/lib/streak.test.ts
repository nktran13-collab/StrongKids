import { describe, expect, it } from 'vitest'
import { computeStreak } from './streak'
import type { WorkoutSession } from './types'
import type { SessionPlan } from './generator'

function session(dateKey: string, status: WorkoutSession['status'] = 'completed'): WorkoutSession {
  return {
    id: `${dateKey}-${status}`,
    childId: 'be-miu',
    dateKey,
    plan: {} as SessionPlan,
    status,
    startedAt: `${dateKey}T17:00:00.000Z`,
    completedAt: status === 'completed' ? `${dateKey}T17:25:00.000Z` : undefined,
    activeSec: 1200,
    results: [],
    bestBefore: {},
  }
}

const WEEKDAYS = [1, 3, 5] // Thứ Hai, Tư, Sáu

describe('chuỗi ngày vận động', () => {
  it('hôm nay chưa tập nhưng chưa hết ngày thì không phá chuỗi', () => {
    // 11/11/2026 là Thứ Tư; Thứ Hai 9/11 đã hoàn thành.
    const result = computeStreak({
      sessions: [session('2026-11-09')],
      weekdays: WEEKDAYS,
      startKey: '2026-11-01',
      todayKey: '2026-11-11',
    })
    expect(result.current).toBe(1)
  })

  it('thiếu một ngày theo lịch thì dừng chuỗi', () => {
    const result = computeStreak({
      sessions: [session('2026-11-04'), session('2026-11-09')],
      weekdays: WEEKDAYS,
      startKey: '2026-10-01',
      todayKey: '2026-11-11',
    })
    // Thứ Hai 9/11 có tập, nhưng Thứ Sáu 6/11 bị thiếu nên chuỗi hiện tại chỉ còn 1.
    expect(result.current).toBe(1)
    expect(result.longest).toBe(1)
  })

  it('buổi tập ngoài lịch không nối dài chuỗi', () => {
    const result = computeStreak({
      sessions: [session('2026-11-10')],
      weekdays: WEEKDAYS,
      startKey: '2026-11-01',
      todayKey: '2026-11-11',
    })
    expect(result.current).toBe(0)
  })

  it('đếm đúng số buổi trong tuần và kỷ lục dài nhất', () => {
    const result = computeStreak({
      sessions: [
        session('2026-10-26'),
        session('2026-10-28'),
        session('2026-10-30'),
        session('2026-11-02'),
        session('2026-11-04'),
      ],
      weekdays: WEEKDAYS,
      startKey: '2026-10-20',
      todayKey: '2026-11-11',
    })
    expect(result.longest).toBe(5)
    expect(result.current).toBe(0)
    expect(result.thisWeekCompleted).toBe(0)
  })

  it('không có lịch tập thì trả về 0 an toàn', () => {
    const result = computeStreak({
      sessions: [session('2026-11-09')],
      weekdays: [],
      startKey: '2026-11-01',
      todayKey: '2026-11-11',
    })
    expect(result).toEqual({ current: 0, longest: 0, thisWeekCompleted: 0, lastCompletedKey: null })
  })
})
