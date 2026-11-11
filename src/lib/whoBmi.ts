import { WHO_BMI_LMS } from '../content/whoBmi'
import type { Sex } from './types'

export interface BmiForAgeResult {
  /** Tuổi tại thời điểm đo, tính theo tháng. */
  ageMonths: number
  z: number
  /** Bách phân vị 0–100. */
  percentile: number
}

/**
 * Tuổi theo tháng tại một thời điểm. Hồ sơ chỉ lưu năm/tháng sinh nên
 * kết quả là ước tính (sai số tối đa dưới 1 tháng).
 */
export function ageInMonths(
  birthYear: number,
  birthMonth: number | null | undefined,
  atYear: number,
  atMonth: number,
): number | null {
  if (!birthMonth || birthMonth < 1 || birthMonth > 12) return null
  const months = (atYear - birthYear) * 12 + (atMonth - birthMonth)
  return months >= 0 ? months : null
}

export function ageInMonthsNow(
  birthYear: number,
  birthMonth: number | null | undefined,
  now = new Date(),
): number | null {
  return ageInMonths(birthYear, birthMonth, now.getFullYear(), now.getMonth() + 1)
}

function lmsFor(ageMonths: number, sex: Sex) {
  if (!Number.isFinite(ageMonths)) return null
  if (ageMonths < WHO_BMI_LMS.minMonth || ageMonths > WHO_BMI_LMS.maxMonth) return null
  const table = sex === 'male' ? WHO_BMI_LMS.boys : WHO_BMI_LMS.girls
  const index = ageMonths - WHO_BMI_LMS.minMonth
  const l = table.l[index]
  const m = table.m[index]
  const s = table.s[index]
  if (![l, m, s].every((value) => Number.isFinite(value)) || m <= 0 || s <= 0) return null
  return { l, m, s }
}

/** Hàm phân phối chuẩn tích luỹ (xấp xỉ Abramowitz–Stegun 7.1.26). */
export function normalCdf(z: number): number {
  const t = 1 / (1 + 0.2316419 * Math.abs(z))
  const density = 0.3989422804014327 * Math.exp((-z * z) / 2)
  const tail =
    density *
    t *
    (0.31938153 +
      t * (-0.356563782 + t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))))
  return z >= 0 ? 1 - tail : tail
}

/**
 * Z-score BMI-for-age theo chuẩn WHO 2007 (5–19 tuổi).
 * Công thức LMS: z = ((BMI / M)^L − 1) / (L × S).
 */
export function bmiForAge(
  bmi: number,
  ageMonths: number,
  sex: Sex,
): BmiForAgeResult | null {
  if (!Number.isFinite(bmi) || bmi <= 0) return null
  const lms = lmsFor(ageMonths, sex)
  if (!lms) return null
  const { l, m, s } = lms
  const z =
    Math.abs(l) < 1e-9
      ? Math.log(bmi / m) / s
      : ((bmi / m) ** l - 1) / (l * s)
  if (!Number.isFinite(z)) return null
  return { ageMonths, z, percentile: normalCdf(z) * 100 }
}

export function formatPercentile(percentile: number): string {
  if (percentile < 1) return 'dưới 1'
  if (percentile > 99) return 'trên 99'
  return String(Math.round(percentile))
}

export function formatAgeMonths(ageMonths: number): string {
  const years = Math.floor(ageMonths / 12)
  const months = ageMonths % 12
  if (years === 0) return `${months} tháng`
  if (months === 0) return `${years} tuổi`
  return `${years} tuổi ${months} tháng`
}

/**
 * Ghi chú trung tính, không chẩn đoán. Chỉ hiện khi bách phân vị nằm
 * ngoài khoảng 3–97 để tránh gắn nhãn lên trẻ.
 */
export function percentileNote(percentile: number): string | null {
  if (percentile < 3 || percentile > 97) {
    return 'Bách phân vị nằm ngoài khoảng 3–97 của trẻ cùng tuổi, cùng giới. Đây không phải chẩn đoán — bố mẹ nên trao đổi với bác sĩ nhi để được đánh giá đầy đủ.'
  }
  return null
}

export const WHO_BMI_SOURCE = {
  label: 'WHO BMI-for-age 2007 (5–19 tuổi)',
  url: WHO_BMI_LMS.sourceUrl,
  retrieved: WHO_BMI_LMS.retrieved,
}
