import { useMemo, useState } from 'react'
import { useStore } from '../../app/store'
import { bandForChild, recommendedDuration } from '../../lib/age'
import {
  formatMonthYear,
  isoWeekday,
  monthGrid,
  todayKey,
  WEEKDAY_SHORT,
} from '../../lib/date'
import { computeStreak } from '../../lib/streak'
import { Badge, Button, Card, Icon, PageHeader, SegmentedControl, cx } from '../../components/ui'

export function SchedulePage() {
  const { activeChild } = useStore()
  // Mỗi bé một lịch riêng: đổi hồ sơ thì dựng lại phần chỉnh lịch.
  return <ScheduleEditor key={activeChild!.id} />
}

function ScheduleEditor() {
  const { activeChild, activeSchedule, activeSessions, setSchedule } = useStore()
  const child = activeChild!
  const band = bandForChild(child.birthYear, child.birthMonth)
  const [weekdays, setWeekdays] = useState<number[]>(activeSchedule.weekdays)
  const [durationMin, setDurationMin] = useState<20 | 25 | 30>(activeSchedule.durationMin)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  const now = new Date()
  const today = todayKey()
  const [monthCursor, setMonthCursor] = useState(() => ({
    year: now.getFullYear(),
    month: now.getMonth(),
  }))

  const streak = computeStreak({
    sessions: activeSessions,
    weekdays: activeSchedule.weekdays,
    startKey: child.createdAt.slice(0, 10),
    todayKey: today,
  })

  const completedDates = useMemo(
    () =>
      new Set(
        activeSessions
          .filter((session) => session.status === 'completed')
          .map((session) => session.dateKey),
      ),
    [activeSessions],
  )

  const cells = useMemo(
    () => monthGrid(monthCursor.year, monthCursor.month),
    [monthCursor],
  )

  const preset: '246' | '357' | 'custom' =
    weekdays.length === 3 && weekdays.join(',') === '1,3,5'
      ? '246'
      : weekdays.length === 3 && weekdays.join(',') === '2,4,6'
        ? '357'
        : 'custom'

  const applyPreset = (value: '246' | '357' | 'custom') => {
    setSaved(false)
    if (value === '246') setWeekdays([1, 3, 5])
    else if (value === '357') setWeekdays([2, 4, 6])
    else setWeekdays([])
  }

  const toggleDay = (day: number) => {
    setSaved(false)
    setWeekdays((current) =>
      current.includes(day)
        ? current.filter((item) => item !== day)
        : [...current, day].sort((a, b) => a - b),
    )
  }

  const save = () => {
    if (!weekdays.length) {
      setError('Chọn ít nhất một ngày tập trong tuần nhé.')
      return
    }
    setError('')
    setSchedule({ weekdays, durationMin })
    setSaved(true)
  }

  const shiftMonth = (delta: number) => {
    const date = new Date(monthCursor.year, monthCursor.month + delta, 1)
    setMonthCursor({ year: date.getFullYear(), month: date.getMonth() })
  }

  return (
    <div className="pb-2">
      <PageHeader
        title="Lịch tập"
        subtitle="Chọn ngày vui để bé vận động"
        right={<Badge tone="teal">{streak.thisWeekCompleted} buổi tuần này</Badge>}
      />

      <div className="mb-4 grid grid-cols-3 gap-2">
        <Card className="p-3 text-center">
          <p className="display-title text-2xl text-coral-dark">{streak.current}</p>
          <p className="text-xs font-extrabold uppercase tracking-wide text-muted">Chuỗi hiện tại</p>
        </Card>
        <Card className="p-3 text-center">
          <p className="display-title text-2xl text-teal-dark">{streak.longest}</p>
          <p className="text-xs font-extrabold uppercase tracking-wide text-muted">Dài nhất</p>
        </Card>
        <Card className="p-3 text-center">
          <p className="display-title text-2xl text-[#8A5C00]">{streak.thisWeekCompleted}</p>
          <p className="text-xs font-extrabold uppercase tracking-wide text-muted">Tuần này</p>
        </Card>
      </div>

      <Card className="p-5">
        <div className="grid grid-cols-3 gap-2">
          {[
            { id: '246' as const, title: '2 · 4 · 6', days: 'Thứ 2, 4, 6' },
            { id: '357' as const, title: '3 · 5 · 7', days: 'Thứ 3, 5, 7' },
            { id: 'custom' as const, title: 'Tự chọn', days: 'Theo ý bé' },
          ].map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => applyPreset(option.id)}
              className={cx(
                'focus-ring rounded-2xl border-2 px-2 py-3 text-center transition',
                preset === option.id
                  ? 'border-teal bg-mint text-teal-dark'
                  : 'border-line bg-white text-muted',
              )}
            >
              <span className="block text-base font-black">{option.title}</span>
              <span className="mt-0.5 block text-xs font-bold">{option.days}</span>
            </button>
          ))}
        </div>

        <div className="mt-4 flex justify-between gap-1.5">
          {WEEKDAY_SHORT.map((label, index) => {
            const day = index + 1
            const active = weekdays.includes(day)
            return (
              <button
                key={label}
                type="button"
                onClick={() => toggleDay(day)}
                aria-pressed={active}
                className={cx(
                  'focus-ring h-11 flex-1 rounded-xl text-xs font-extrabold transition',
                  active ? 'bg-ink text-white' : 'bg-ink/5 text-muted hover:bg-ink/10',
                )}
              >
                {label}
              </button>
            )
          })}
        </div>

        <div className="mt-5">
          <div className="mb-1.5 flex items-center justify-between">
            <p className="text-sm font-bold text-ink">Thời lượng mỗi buổi</p>
            <Badge tone="sun">Gợi ý {recommendedDuration(band)} phút</Badge>
          </div>
          <SegmentedControl
            value={durationMin}
            onChange={(value) => {
              setDurationMin(value)
              setSaved(false)
            }}
            options={[
              { value: 20, label: '20 phút' },
              { value: 25, label: '25 phút' },
              { value: 30, label: '30 phút' },
            ]}
          />
        </div>

        {error && (
          <p className="mt-3 rounded-xl bg-peach px-3 py-2 text-xs font-bold text-coral-dark">
            {error}
          </p>
        )}

        <Button fullWidth size="lg" className="mt-4" onClick={save}>
          {saved ? (
            <>
              <Icon name="check" />
              Đã lưu lịch tập
            </>
          ) : (
            <>
              <Icon name="calendar" />
              Lưu lịch tập
            </>
          )}
        </Button>
      </Card>

      <Card className="mt-4 p-4">
        <div className="mb-3 flex items-center justify-between">
          <button
            type="button"
            onClick={() => shiftMonth(-1)}
            className="focus-ring grid h-9 w-9 place-items-center rounded-full bg-ink/5 text-ink hover:bg-ink/10"
            aria-label="Tháng trước"
          >
            <Icon name="left" className="h-4 w-4" />
          </button>
          <h2 className="text-sm font-extrabold text-ink">
            {formatMonthYear(monthCursor.year, monthCursor.month)}
          </h2>
          <button
            type="button"
            onClick={() => shiftMonth(1)}
            className="focus-ring grid h-9 w-9 place-items-center rounded-full bg-ink/5 text-ink hover:bg-ink/10"
            aria-label="Tháng sau"
          >
            <Icon name="right" className="h-4 w-4" />
          </button>
        </div>

        <div className="mb-1 grid grid-cols-7 gap-1">
          {WEEKDAY_SHORT.map((label) => (
            <span
              key={label}
              className="text-center text-xs font-extrabold uppercase tracking-wide text-muted"
            >
              {label}
            </span>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {cells.map((cell) => {
            const scheduled = weekdays.includes(isoWeekday(cell.key))
            const completed = completedDates.has(cell.key)
            const isToday = cell.key === today
            return (
              <div
                key={cell.key}
                className={cx(
                  'relative grid h-9 place-items-center rounded-xl text-xs font-bold',
                  !cell.inMonth && 'invisible',
                  completed
                    ? 'bg-teal-dark text-white'
                    : isToday
                      ? 'bg-peach text-coral-dark ring-2 ring-coral/40'
                      : scheduled
                        ? 'bg-sun-soft/80 text-[#7A5200]'
                        : 'text-muted',
                )}
              >
                {completed ? <Icon name="check" className="h-3.5 w-3.5" /> : cell.day}
                {scheduled && !completed && (
                  <span className="absolute bottom-1 h-1 w-1 rounded-full bg-current opacity-70" />
                )}
              </div>
            )
          })}
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-3 text-xs font-bold text-muted">
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-teal" /> Đã tập
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-sun-soft ring-1 ring-[#E8A93B]/40" /> Ngày
            tập
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-peach ring-1 ring-coral/40" /> Hôm nay
          </span>
        </div>
      </Card>

      <div className="mt-4 flex items-start gap-2.5 rounded-3xl bg-white/70 p-4 text-xs font-semibold leading-relaxed text-muted">
        <Icon name="info" className="mt-0.5 h-4 w-4 shrink-0 text-teal-dark" />
        Hôm nay chưa tập sẽ không làm mất chuỗi. Bé chỉ cần hoàn thành buổi tiếp theo đúng lịch là
        chuỗi vẫn được nối tiếp.
      </div>

      <p className="mt-3 px-2 text-center text-xs font-semibold text-muted">
        Lịch được tính theo ngày trên thiết bị này.
      </p>
    </div>
  )
}
