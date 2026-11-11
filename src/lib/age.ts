import type { AgeBand } from '../content/schema'

export const BAND_LABEL: Record<AgeBand, string> = {
  '5-7': '5–7 tuổi',
  '8-9': '8–9 tuổi',
  '10-12': '10–12 tuổi',
}

export const BAND_DESCRIPTION: Record<AgeBand, string> = {
  '5-7': 'Chơi là chính, động tác đơn giản và có bố mẹ đồng hành.',
  '8-9': 'Bắt đầu circuit nhỏ, rèn sức mạnh và thăng bằng.',
  '10-12': 'Thử thách phối hợp, sức mạnh thân trọng và đếm thành tích.',
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
  if (age <= 7) return '5-7'
  if (age <= 9) return '8-9'
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
  if (band === '5-7') return 20
  if (band === '8-9') return 25
  return 30
}

export function isAgeSupported(age: number): boolean {
  return age >= 4 && age <= 13
}
