export const WEEKDAY_SHORT = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN']
export const WEEKDAY_LONG = [
  'Thứ Hai',
  'Thứ Ba',
  'Thứ Tư',
  'Thứ Năm',
  'Thứ Sáu',
  'Thứ Bảy',
  'Chủ Nhật',
]

export function toKey(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function todayKey(now = new Date()): string {
  return toKey(now)
}

export function fromKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, (m ?? 1) - 1, d ?? 1, 12, 0, 0, 0)
}

export function addDays(key: string, amount: number): string {
  const date = fromKey(key)
  date.setDate(date.getDate() + amount)
  return toKey(date)
}

export function isoWeekday(dateOrKey: Date | string): number {
  const date = typeof dateOrKey === 'string' ? fromKey(dateOrKey) : dateOrKey
  const day = date.getDay()
  return day === 0 ? 7 : day
}

export function startOfWeek(key: string): string {
  return addDays(key, -(isoWeekday(key) - 1))
}

export function formatViDate(key: string, includeWeekday = true): string {
  const date = fromKey(key)
  const weekday = WEEKDAY_LONG[isoWeekday(date) - 1]
  const day = date.getDate()
  const month = date.getMonth() + 1
  return includeWeekday ? `${weekday}, ${day}/${month}` : `${day}/${month}`
}

export function formatMonthYear(year: number, monthIndex: number): string {
  return `Tháng ${monthIndex + 1}, ${year}`
}

export interface CalendarCell {
  key: string
  day: number
  inMonth: boolean
}

export function monthGrid(year: number, monthIndex: number): CalendarCell[] {
  const first = new Date(year, monthIndex, 1, 12)
  const offset = isoWeekday(first) - 1
  const start = new Date(year, monthIndex, 1 - offset, 12)
  const cells: CalendarCell[] = []
  for (let i = 0; i < 42; i += 1) {
    const date = new Date(start)
    date.setDate(start.getDate() + i)
    cells.push({
      key: toKey(date),
      day: date.getDate(),
      inMonth: date.getMonth() === monthIndex,
    })
  }
  return cells
}

export function daysBetweenKeys(startKey: string, endKey: string): number {
  const start = fromKey(startKey).getTime()
  const end = fromKey(endKey).getTime()
  return Math.round((end - start) / 86_400_000)
}

export function greeting(now = new Date()): string {
  const hour = now.getHours()
  if (hour < 11) return 'Chào buổi sáng'
  if (hour < 14) return 'Chào buổi trưa'
  if (hour < 18) return 'Chào buổi chiều'
  return 'Chào buổi tối'
}
