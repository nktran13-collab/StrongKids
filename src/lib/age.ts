import type { AgeBand } from '../content/schema'

export const BAND_LABEL: Record<AgeBand, string> = {
  '4-6': '4–6 tuổi',
  '7-9': '7–9 tuổi',
  '10-12': '10–12 tuổi',
}

export const BAND_DESCRIPTION: Record<AgeBand, string> = {
  '4-6': 'Chơi là chính, mỗi bài ngắn 15–30 giây và có bố mẹ đồng hành.',
  '7-9': 'Bắt đầu circuit nhỏ, rèn sức mạnh và thăng bằng.',
  '10-12': 'Thử thách phối hợp, sức mạnh thân trọng và đếm thành tích.',
}

/** Nhóm 4–6 tập theo đúng tuổi; nhóm lớn hơn dùng thời lượng chung của nhóm. */
const BAND1_WORK_SEC: Partial<Record<number, number>> = { 4: 15, 5: 20, 6: 30 }

export function workSecondsForAge(
  band: AgeBand,
  age: number | undefined,
  fallback: number,
): number {
  if (band !== '4-6' || age === undefined) return fallback
  return BAND1_WORK_SEC[age] ?? fallback
}

export function calculateAge(
  birthYear: number,
  birthMonth: number | null | undefined,
  now = new Date(),
): number {
  let age = now.getFullYear() - birthYear
  if (birthMonth && now.getMonth() + 1 < birthMonth) age -= 1
  return Math.max(0, age)
}

export function bandForAge(age: number): AgeBand {
  if (age <= 6) return '4-6'
  if (age <= 9) return '7-9'
  return '10-12'
}

export function bandForChild(
  birthYear: number,
  birthMonth: number | null | undefined,
  now = new Date(),
): AgeBand {
  return bandForAge(calculateAge(birthYear, birthMonth, now))
}

export function recommendedDuration(band: AgeBand): 20 | 25 | 30 {
  if (band === '4-6') return 20
  if (band === '7-9') return 25
  return 30
}

export function isAgeSupported(age: number): boolean {
  return age >= 4 && age <= 12
}
