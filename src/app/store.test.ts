import { describe, expect, it } from 'vitest'
import { normalizeData } from './store'

const child = {
  id: 'c1',
  nickname: 'Miu',
  birthYear: 2018,
  birthMonth: 5,
  sex: 'female' as const,
  heightCm: 128,
  weightKg: 27,
  avatarKey: 'panda',
  createdAt: '2026-01-01T00:00:00.000Z',
}

describe('normalizeData', () => {
  it('chuyển dữ liệu một bé (v1) sang nhiều hồ sơ (v2)', () => {
    const migrated = normalizeData({
      version: 1,
      parent: { email: 'a@b.c', consentedAt: '2026-01-01T00:00:00.000Z' },
      child,
      measurements: [
        { id: 'm1', dateKey: '2026-11-01', heightCm: 128, weightKg: 27, createdAt: '2026-11-01T00:00:00.000Z' },
      ],
      schedule: { weekdays: [1, 3, 5], durationMin: 25 },
      sessions: [{ id: 's1', childId: 'c1' }],
      bests: { 'nhay-day:reps': { value: 12, achievedAt: '2026-11-01T00:00:00.000Z', metric: 'reps', direction: 'higher_better' } },
      pinHash: null,
      createdAt: '2026-01-01T00:00:00.000Z',
    })

    expect(migrated?.version).toBe(2)
    expect(migrated?.children).toHaveLength(1)
    expect(migrated?.activeChildId).toBe('c1')
    expect(migrated?.measurements[0].childId).toBe('c1')
    expect(migrated?.schedules.c1).toEqual({ weekdays: [1, 3, 5], durationMin: 25 })
    expect(migrated?.bests.c1['nhay-day:reps']?.value).toBe(12)
    expect(migrated?.sessions).toHaveLength(1)
  })

  it('giữ nhiều hồ sơ và tự chọn bé đầu tiên khi activeChildId không hợp lệ', () => {
    const migrated = normalizeData({
      version: 2,
      parent: { email: 'a@b.c', consentedAt: '2026-01-01T00:00:00.000Z' },
      children: [child, { ...child, id: 'c2', nickname: 'Bắp', sex: 'male' }],
      activeChildId: 'missing',
      measurements: [],
      schedules: { c1: { weekdays: [1, 3, 5], durationMin: 30 } },
      sessions: [],
      bests: {},
      pinHash: null,
      createdAt: '2026-01-01T00:00:00.000Z',
    })

    expect(migrated?.children).toHaveLength(2)
    expect(migrated?.activeChildId).toBe('c1')
    expect(migrated?.schedules.c1.durationMin).toBe(30)
    expect(migrated?.schedules.c2.durationMin).toBe(25)
    expect(migrated?.bests.c2).toEqual({})
  })

  it('bỏ dữ liệu không nhận dạng được', () => {
    expect(normalizeData(null)).toBeNull()
    expect(normalizeData({ version: 99 })).toBeNull()
  })
})
