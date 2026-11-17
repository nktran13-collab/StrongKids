import { describe, expect, it } from 'vitest'
import {
  BAND_LABEL,
  bandForAge,
  isAgeSupported,
  recommendedDuration,
  workSecondsForAge,
} from './age'

describe('nhóm tuổi', () => {
  it('chia đúng ba nhóm 4–6, 7–9 và 10–12', () => {
    expect([4, 5, 6].map(bandForAge)).toEqual(['4-6', '4-6', '4-6'])
    expect([7, 8, 9].map(bandForAge)).toEqual(['7-9', '7-9', '7-9'])
    expect([10, 11, 12].map(bandForAge)).toEqual(['10-12', '10-12', '10-12'])
  })

  it('chỉ nhận hồ sơ từ 4 đến 12 tuổi', () => {
    expect(isAgeSupported(4)).toBe(true)
    expect(isAgeSupported(12)).toBe(true)
    expect(isAgeSupported(3)).toBe(false)
    expect(isAgeSupported(13)).toBe(false)
  })

  it('nhóm 4–6 dùng 15/20/30 giây theo tuổi, nhóm lớn giữ nguyên', () => {
    expect(workSecondsForAge('4-6', 4, 99)).toBe(15)
    expect(workSecondsForAge('4-6', 5, 99)).toBe(20)
    expect(workSecondsForAge('4-6', 6, 99)).toBe(30)
    expect(workSecondsForAge('7-9', 8, 99)).toBe(99)
    expect(workSecondsForAge('10-12', 11, 99)).toBe(99)
    expect(workSecondsForAge('4-6', undefined, 99)).toBe(99)
  })

  it('giữ gợi ý thời lượng 20/25/30 phút cho ba nhóm', () => {
    expect(recommendedDuration('4-6')).toBe(20)
    expect(recommendedDuration('7-9')).toBe(25)
    expect(recommendedDuration('10-12')).toBe(30)
  })

  it('hiển thị nhãn tuổi mới', () => {
    expect(BAND_LABEL).toEqual({
      '4-6': '4–6 tuổi',
      '7-9': '7–9 tuổi',
      '10-12': '10–12 tuổi',
    })
  })
})
