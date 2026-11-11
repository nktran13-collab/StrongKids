import { describe, expect, it } from 'vitest'
import { WHO_BMI_LMS } from '../content/whoBmi'
import {
  ageInMonths,
  ageInMonthsNow,
  bmiForAge,
  formatAgeMonths,
  formatPercentile,
  normalCdf,
  percentileNote,
} from './whoBmi'

describe('dữ liệu WHO BMI-for-age', () => {
  it('có đủ 168 tháng tuổi từ 61 đến 228 cho cả hai giới', () => {
    for (const table of [WHO_BMI_LMS.boys, WHO_BMI_LMS.girls]) {
      expect(table.l).toHaveLength(168)
      expect(table.m).toHaveLength(168)
      expect(table.s).toHaveLength(168)
    }
    expect(WHO_BMI_LMS.minMonth).toBe(61)
    expect(WHO_BMI_LMS.maxMonth).toBe(228)
  })

  it('khớp giá trị M đã công bố tại 10 tuổi (tháng 120)', () => {
    const index = 120 - WHO_BMI_LMS.minMonth
    expect(WHO_BMI_LMS.boys.m[index]).toBeCloseTo(16.4433, 4)
    expect(WHO_BMI_LMS.girls.m[index]).toBeCloseTo(16.6133, 4)
  })

  it('mọi giá trị L, M, S đều hợp lệ', () => {
    for (const table of [WHO_BMI_LMS.boys, WHO_BMI_LMS.girls]) {
      for (const value of [...table.l, ...table.m, ...table.s]) {
        expect(Number.isFinite(value)).toBe(true)
      }
      expect(Math.min(...table.m)).toBeGreaterThan(10)
      expect(Math.min(...table.s)).toBeGreaterThan(0)
    }
  })
})

describe('ageInMonths', () => {
  it('tính đúng số tháng khi biết tháng sinh', () => {
    expect(ageInMonths(2016, 5, 2026, 11)).toBe(126)
    expect(ageInMonths(2016, 11, 2026, 11)).toBe(120)
    expect(ageInMonths(2016, 12, 2026, 1)).toBe(109)
  })

  it('trả về null khi thiếu tháng sinh hoặc thời điểm trước khi sinh', () => {
    expect(ageInMonths(2016, null, 2026, 11)).toBeNull()
    expect(ageInMonths(2016, 0, 2026, 11)).toBeNull()
    expect(ageInMonths(2026, 11, 2026, 10)).toBeNull()
  })

  it('dùng ngày hiện tại khi không truyền thời điểm', () => {
    const now = new Date(2026, 10, 11)
    expect(ageInMonthsNow(2019, 11, now)).toBe(84)
  })
})

describe('bmiForAge (LMS WHO 2007)', () => {
  it('BMI bằng M cho z = 0 và bách phân vị 50', () => {
    const result = bmiForAge(16.4433, 120, 'male')
    expect(result).not.toBeNull()
    expect(result!.z).toBeCloseTo(0, 3)
    expect(result!.percentile).toBeCloseTo(50, 1)
  })

  it('khớp cột +2SD của WHO tại tháng 120 (bé trai)', () => {
    // Bảng WHO: SD2 = 21.4 tại tháng 120.
    const result = bmiForAge(21.4, 120, 'male')
    expect(result!.z).toBeCloseTo(2, 2)
    expect(result!.percentile).toBeCloseTo(97.72, 1)
  })

  it('khớp cột −2SD của WHO tại tháng 120 (bé trai)', () => {
    const result = bmiForAge(13.735, 120, 'male')
    expect(result!.z).toBeCloseTo(-2, 2)
    expect(result!.percentile).toBeCloseTo(2.28, 1)
  })

  it('khớp cột −3SD của WHO tại tháng 228 (bé gái)', () => {
    const result = bmiForAge(14.724, 228, 'female')
    expect(result!.z).toBeCloseTo(-3, 2)
    expect(result!.percentile).toBeCloseTo(0.135, 1)
  })

  it('trả về null ngoài phạm vi 61–228 tháng hoặc BMI không hợp lệ', () => {
    expect(bmiForAge(16, 60, 'male')).toBeNull()
    expect(bmiForAge(21, 229, 'female')).toBeNull()
    expect(bmiForAge(0, 120, 'male')).toBeNull()
    expect(bmiForAge(Number.NaN, 120, 'male')).toBeNull()
  })
})

describe('normalCdf', () => {
  it('khớp các mốc chuẩn', () => {
    expect(normalCdf(0)).toBeCloseTo(0.5, 6)
    expect(normalCdf(-1.96)).toBeCloseTo(0.025, 4)
    expect(normalCdf(1.96)).toBeCloseTo(0.975, 4)
    expect(normalCdf(2)).toBeCloseTo(0.97725, 4)
  })
})

describe('định dạng và ghi chú', () => {
  it('làm tròn bách phân vị và xử lý hai đầu', () => {
    expect(formatPercentile(62.4)).toBe('62')
    expect(formatPercentile(0.4)).toBe('dưới 1')
    expect(formatPercentile(99.6)).toBe('trên 99')
  })

  it('đổi số tháng thành tuổi dễ đọc', () => {
    expect(formatAgeMonths(126)).toBe('10 tuổi 6 tháng')
    expect(formatAgeMonths(120)).toBe('10 tuổi')
    expect(formatAgeMonths(7)).toBe('7 tháng')
  })

  it('chỉ nhắc trao đổi bác sĩ khi bách phân vị ngoài khoảng 3–97', () => {
    expect(percentileNote(50)).toBeNull()
    expect(percentileNote(2.9)).toContain('bác sĩ nhi')
    expect(percentileNote(97.1)).toContain('bác sĩ nhi')
  })
})
