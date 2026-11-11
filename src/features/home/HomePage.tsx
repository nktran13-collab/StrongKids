import { useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useStore } from '../../app/store'
import { getExercise } from '../../content/catalog'
import type { Metric } from '../../content/schema'
import { calculateAge, bandForAge, BAND_LABEL } from '../../lib/age'
import {
  addDays,
  formatViDate,
  greeting,
  isoWeekday,
  startOfWeek,
  todayKey,
  WEEKDAY_SHORT,
} from '../../lib/date'
import { buildSessionPlan } from '../../lib/generator'
import { computeStreak } from '../../lib/streak'
import { ExerciseArt } from '../../components/ExerciseArt'
import { Badge, Button, Card, Icon, Stars, cx } from '../../components/ui'

export function unitForMetric(metric: Metric): string {
  if (metric === 'reps') return 'lần'
  return 'giây'
}

export function formatRecordValue(metric: Metric, value: number): string {
  if (metric === 'reps') return `${Math.round(value)} lần`
  return `${Math.round(value)} giây`
}

export function HomePage() {
  const { data, startSession } = useStore()
  const navigate = useNavigate()
  const child = data.child!
  const today = todayKey()
  const band = bandForAge(calculateAge(child.birthYear, child.birthMonth))
  const weekday = isoWeekday(today)
  const isScheduled = data.schedule.weekdays.includes(weekday)

  const todaySessions = data.sessions.filter(
    (session) => session.dateKey === today && session.status === 'completed',
  )
  const todayCompleted = todaySessions[0] ?? null
  const todayDone = todayCompleted
    ? new Set(
        todayCompleted.results.filter((result) => result.block === 'main').map((result) => result.slug),
      ).size
    : 0
  const todayMainTotal = todayCompleted
    ? todayCompleted.plan.steps.filter((step) => step.kind === 'work' && step.block === 'main').length
    : 0
  const todayStars = todayCompleted
    ? todayMainTotal && todayDone / todayMainTotal >= 1
      ? 3
      : todayMainTotal && todayDone / todayMainTotal >= 0.5
        ? 2
        : 1
    : 0

  const streak = computeStreak({
    sessions: data.sessions,
    weekdays: data.schedule.weekdays,
    startKey: child.createdAt.slice(0, 10),
    todayKey: today,
  })

  const completedDates = useMemo(
    () =>
      new Set(
        data.sessions
          .filter((session) => session.status === 'completed')
          .map((session) => session.dateKey),
      ),
    [data.sessions],
  )

  const weekStart = startOfWeek(today)
  const weekDays = Array.from({ length: 7 }, (_, index) => {
    const key = addDays(weekStart, index)
    const dayWeekday = index + 1
    return {
      key,
      label: WEEKDAY_SHORT[index],
      day: Number(key.slice(8, 10)),
      scheduled: data.schedule.weekdays.includes(dayWeekday),
      completed: completedDates.has(key),
      today: key === today,
      past: key < today,
    }
  })

  const recentBests = useMemo(() => {
    return Object.entries(data.bests)
      .filter(([, best]) => best.value > 0)
      .sort((a, b) => b[1].achievedAt.localeCompare(a[1].achievedAt))
      .slice(0, 3)
  }, [data.bests])

  const startWorkout = () => {
    const recentSlugs = [...data.sessions]
      .filter((session) => session.status === 'completed')
      .sort((a, b) => b.dateKey.localeCompare(a.dateKey))
      .slice(0, 3)
      .flatMap((session) => session.plan.mainSlugs)
    const plan = buildSessionPlan({
      childId: child.id,
      band,
      durationMin: data.schedule.durationMin,
      dateKey: today,
      recentSlugs,
    })
    const id = startSession(plan)
    navigate(`/tap/${id}`)
  }

  const todayPlanPreview = useMemo(() => {
    const plan = buildSessionPlan({
      childId: child.id,
      band,
      durationMin: data.schedule.durationMin,
      dateKey: today,
      recentSlugs: [],
    })
    return plan
  }, [child.id, band, data.schedule.durationMin, today])

  const firstMain = getExercise(todayPlanPreview.mainSlugs[0])

  return (
    <div className="space-y-4 pb-2">
      <section className="animate-slide-up">
        <p className="text-sm font-bold text-muted">
          {greeting()}, {formatViDate(today)}
        </p>
        <div className="mt-1 flex items-end justify-between gap-3">
          <h1 className="display-title text-[30px] leading-none text-ink">
            {child.nickname} ơi!
          </h1>
          <Badge tone="sky" className="mb-0.5">
            {calculateAge(child.birthYear, child.birthMonth)} tuổi · {BAND_LABEL[band]}
          </Badge>
        </div>
      </section>

      <Card className="relative overflow-hidden border-0 bg-[linear-gradient(135deg,#FF7A59_0%,#FF9A5C_55%,#FFC94A_130%)] p-5 text-[#1B2F43]">
        <div className="absolute -right-6 -top-8 h-32 w-32 rounded-full bg-white/15" />
        <div className="absolute -bottom-10 right-14 h-24 w-24 rounded-full bg-white/10" />
        <div className="relative flex items-center gap-4">
          <div className="grid h-16 w-16 shrink-0 place-items-center rounded-[1.4rem] bg-white/30 backdrop-blur">
            <Icon name="flame" filled className="h-9 w-9 animate-flame text-[#B23A16]" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-extrabold uppercase tracking-[0.16em]">
              Chuỗi vận động
            </p>
            <p className="display-title mt-0.5 text-[26px] leading-none">
              {streak.current > 0 ? `${streak.current} ngày liên tiếp` : 'Bắt đầu hôm nay!'}
            </p>
            <p className="mt-1.5 text-xs font-bold">
              Kỷ lục dài nhất: {streak.longest} ngày · Tuần này {streak.thisWeekCompleted} buổi
            </p>
          </div>
          <Icon name="sparkles" className="h-6 w-6 shrink-0 text-[#B23A16]/70" />
        </div>
      </Card>

      {todayCompleted ? (
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-mint text-teal-dark">
              <Icon name="check" className="h-6 w-6" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="display-title text-lg text-ink">Bé đã hoàn thành hôm nay!</p>
              <p className="text-xs font-semibold text-muted">
                {Math.max(1, Math.round(todayCompleted.activeSec / 60))} phút vận động ·{' '}
                {todayDone} bài tập
              </p>
            </div>
          </div>
          <Stars count={todayStars} className="mt-4" />
          <div className="mt-4 grid grid-cols-2 gap-2">
            <Button variant="secondary" onClick={startWorkout}>
              <Icon name="refresh" className="h-4 w-4" />
              Tập thêm
            </Button>
            <Button variant="teal" onClick={() => navigate('/bai-tap')}>
              <Icon name="book" className="h-4 w-4" />
              Xem bài
            </Button>
          </div>
        </Card>
      ) : (
        <Card className="overflow-hidden p-0">
          <div className="flex gap-4 p-4">
            <ExerciseArt
              exercise={firstMain}
              priority
              className="h-[104px] w-[124px] shrink-0 rounded-[1.3rem]"
              decoration={false}
            />
            <div className="min-w-0 flex-1 py-1">
              <div className="flex flex-wrap items-center gap-1.5">
                <Badge tone="coral">{isScheduled ? 'Buổi tập hôm nay' : 'Ngày nghỉ vui vẻ'}</Badge>
                <Badge tone="sun">
                  <Icon name="clock" className="h-3.5 w-3.5" />
                  {todayPlanPreview.durationMin} phút
                </Badge>
              </div>
              <h2 className="display-title mt-2 text-lg leading-tight text-ink">
                {isScheduled ? todayPlanPreview.title : 'Mình chơi nhẹ một chút nhé?'}
              </h2>
              <p className="mt-0.5 line-clamp-2 text-xs font-semibold leading-relaxed text-muted">
                {isScheduled
                  ? `${todayPlanPreview.mainSlugs.length} bài vận động + khởi động và thư giãn.`
                  : 'Hôm nay không có lịch tập. Nếu bé vẫn muốn vận động, mình làm một buổi ngắn thật vui.'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 border-t border-line/70 bg-cream/60 px-4 py-3">
            <Button fullWidth onClick={startWorkout} size="md">
              <Icon name="play" filled className="h-4 w-4" />
              {isScheduled ? 'Bắt đầu buổi tập' : 'Tập tự do 20 phút'}
            </Button>
          </div>
        </Card>
      )}

      <Card className="p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-extrabold text-ink">Tuần này của bé</h2>
          <Link to="/lich" className="text-xs font-bold text-teal-dark hover:underline">
            Xem lịch
          </Link>
        </div>
        <div className="flex justify-between gap-1">
          {weekDays.map((day) => (
            <div key={day.key} className="flex flex-1 flex-col items-center gap-1.5">
              <span className={cx('text-xs font-extrabold', day.today ? 'text-coral-dark' : 'text-muted')}>
                {day.label}
              </span>
              <div
                className={cx(
                  'grid h-9 w-9 place-items-center rounded-full text-xs font-extrabold transition',
                  day.completed
                    ? 'bg-teal-dark text-white'
                    : day.today
                      ? 'bg-peach text-coral-dark ring-2 ring-coral/50'
                      : day.scheduled
                        ? 'bg-ink/5 text-ink'
                        : 'text-muted',
                )}
              >
                {day.completed ? <Icon name="check" className="h-4 w-4" /> : day.day}
              </div>
              <span className="text-xs font-semibold text-muted">
                {day.completed ? 'Xong' : day.scheduled ? 'Tập' : 'Nghỉ'}
              </span>
            </div>
          ))}
        </div>
      </Card>

      <section>
        <div className="mb-2 flex items-end justify-between px-1">
          <h2 className="display-title text-lg text-ink">Kỷ lục của bé</h2>
          <Link to="/bai-tap" className="text-xs font-bold text-teal-dark hover:underline">
            Tất cả bài tập
          </Link>
        </div>
        {recentBests.length ? (
          <div className="space-y-2">
            {recentBests.map(([key, best]) => {
              const slug = key.split(':')[0]
              const exercise = getExercise(slug)
              return (
                <Link
                  key={key}
                  to="/bai-tap"
                  className="focus-ring flex items-center gap-3 rounded-3xl bg-white p-3 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  <ExerciseArt exercise={exercise} className="h-12 w-14 shrink-0 rounded-xl" decoration={false} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-extrabold text-ink">{exercise.nameVi}</p>
                    <p className="text-xs font-semibold text-muted">
                      {best.direction === 'lower_better' ? 'Nhanh nhất' : 'Kỷ lục'} ·{' '}
                      {formatRecordValue(best.metric, best.value)}
                    </p>
                  </div>
                  <span className="grid h-9 w-9 place-items-center rounded-full bg-sun-soft text-[#8A5C00]">
                    <Icon name="star" filled className="h-5 w-5" />
                  </span>
                </Link>
              )
            })}
          </div>
        ) : (
          <Card className="flex items-center gap-3 p-4">
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-sun-soft text-[#8A5C00]">
              <Icon name="star" className="h-6 w-6" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-extrabold text-ink">Chưa có kỷ lục nào</p>
              <p className="text-xs font-semibold text-muted">
                Buổi tập đầu tiên sẽ mở ra kỷ lục đầu tiên của bé.
              </p>
            </div>
          </Card>
        )}
      </section>

      <div className="rounded-3xl bg-mint/70 p-4">
        <div className="flex items-center gap-2 text-sm font-extrabold text-teal-dark">
          <Icon name="info" className="h-4 w-4" />
          Mẹo cho bố mẹ
        </div>
        <p className="mt-1 text-xs font-semibold leading-relaxed text-teal-dark">
          WHO khuyến nghị trẻ 5–17 tuổi vận động khoảng 60 phút mỗi ngày và có hoạt động mạnh ít
          nhất 3 ngày/tuần. Buổi tập của StrongKids là một phần vui vẻ trong tổng vận động đó.
        </p>
      </div>
    </div>
  )
}
