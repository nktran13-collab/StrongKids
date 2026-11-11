import { describe, expect, it } from 'vitest'
import { calculateBmi, calculateExactBmi } from './bmi'

describe('BMI', () => {
  it('tính BMI và làm tròn một chữ số thập phân', () => {
    const result = calculateBmi(128, 27.5)
    expect(result?.bmi).toBe(16.8)
  })

  it('giữ giá trị chưa làm tròn cho tính bách phân vị', () => {
    expect(calculateExactBmi(128, 27.5)).toBeCloseTo(16.7847, 4)
    expect(calculateBmi(128, 27.5)?.bmi).toBe(16.8)
  })

  it('trả về null khi dữ liệu không hợp lệ', () => {
    expect(calculateBmi(0, 20)).toBeNull()
    expect(calculateBmi(120, 0)).toBeNull()
    expect(calculateBmi(Number.NaN, 20)).toBeNull()
  })

  it('không dùng ngưỡng người lớn để phân loại', () => {
    const result = calculateBmi(120, 22)
    expect(result).not.toBeNull()
    expect(Object.keys(result ?? {})).toEqual(['bmi', 'heightCm', 'weightKg'])
  })
})
