import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useStore } from '../../app/store'
import { getExercise } from '../../content/catalog'
import { CATEGORY_LABEL, type AgeBand, type Exercise, type Metric } from '../../content/schema'
import { celebrate } from '../../lib/confetti'
import { useOnline } from '../../lib/useOnline'
import type { PlanStep, SessionPlan } from '../../lib/generator'
import { ExerciseArt } from '../../components/ExerciseArt'
import {
  Badge,
  Button,
  Card,
  Icon,
  Modal,
  ProgressRing,
  Stars,
  cx,
} from '../../components/ui'

function formatValue(metric: Metric, value: number): string {
  return metric === 'reps' ? `${Math.round(value)} lần` : `${Math.round(value)} giây`
}

function vibrate(pattern: number | number[]) {
  try {
    navigator.vibrate?.(pattern)
  } catch {
    // Trình duyệt không hỗ trợ rung: bỏ qua.
  }
}

/** Đếm ngược dựa trên performance.now để không lệch khi tab bị throttle. */
function useSteadyCountdown(seconds: number, running: boolean, onDone: () => void) {
  const [left, setLeft] = useState(seconds)
  const leftRef = useRef(seconds)
  const deadlineRef = useRef(0)
  const doneRef = useRef(false)
  const callbackRef = useRef(onDone)
  callbackRef.current = onDone

  useEffect(() => {
    if (!running || doneRef.current) return
    deadlineRef.current = performance.now() + leftRef.current * 1000
    const id = window.setInterval(() => {
      const remain = Math.max(0, (deadlineRef.current - performance.now()) / 1000)
      leftRef.current = remain
      setLeft(remain)
      if (remain <= 0) {
        window.clearInterval(id)
        if (!doneRef.current) {
          doneRef.current = true
          callbackRef.current()
        }
      }
    }, 120)
    return () => window.clearInterval(id)
  }, [running])

  return left
}

/** Đồng hồ bấm giây cho bài tính thời gian. */
function useStopwatch(running: boolean) {
  const [elapsed, setElapsed] = useState(0)
  const accumulatedRef = useRef(0)
  const startedAtRef = useRef<number | null>(null)

  useEffect(() => {
    if (!running) return
    startedAtRef.current = performance.now()
    const id = window.setInterval(() => {
      if (startedAtRef.current === null) return
      const total = accumulatedRef.current + (performance.now() - startedAtRef.current)
      setElapsed(total / 1000)
    }, 100)
    return () => {
      window.clearInterval(id)
      if (startedAtRef.current !== null) {
        accumulatedRef.current += performance.now() - startedAtRef.current
        startedAtRef.current = null
      }
    }
  }, [running])

  return elapsed
}

interface ToastInfo {
  title: string
  detail: string
  fresh: boolean
}

interface RecordItem {
  slug: string
  name: string
  metric: Metric
  value: number
  previous?: number
  isNewBest: boolean
}

export function WorkoutPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const online = useOnline()
  const { data, recordResult, completeSession, abandonSession } = useStore()
  const session = data.sessions.find((item) => item.id === id)

  const plan: SessionPlan | undefined = session?.plan
  const steps = plan?.steps ?? []
  const band: AgeBand = plan?.band ?? '8-9'

  const [stage, setStage] = useState<'intro' | 'countdown' | 'step' | 'summary'>('intro')
  const [stepIndex, setStepIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const [tired, setTired] = useState(false)
  const [tiredRest, setTiredRest] = useState(false)
  const [exitOpen, setExitOpen] = useState(false)
  const [activeSec, setActiveSec] = useState(0)
  const [mainDone, setMainDone] = useState(0)
  const [records, setRecords] = useState<RecordItem[]>([])
  const [endedEarly, setEndedEarly] = useState(false)
  const [toast, setToast] = useState<ToastInfo | null>(null)

  const activeRef = useRef(0)
  const indexRef = useRef(0)
  const stepsRef = useRef<PlanStep[]>(steps)
  stepsRef.current = steps
  const finishedRef = useRef(false)

  const mainWorkTotal = steps.filter(
    (step) => step.kind === 'work' && step.block === 'main',
  ).length

  useEffect(() => {
    if (stage !== 'step' || paused || tiredRest) return
    const timer = window.setInterval(() => {
      activeRef.current += 1
      setActiveSec(activeRef.current)
    }, 1000)
    return () => window.clearInterval(timer)
  }, [stage, paused, tiredRest])

  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(null), 4200)
    return () => window.clearTimeout(timer)
  }, [toast])

  useEffect(() => {
    if (stage !== 'step') return
    const nav = navigator as Navigator & {
      wakeLock?: { request: (type: 'screen') => Promise<{ release: () => Promise<void> }> }
    }
    let sentinel: { release: () => Promise<void> } | null = null
    let cancelled = false
    nav.wakeLock
      ?.request('screen')
      .then((lock) => {
        if (cancelled) void lock.release()
        else sentinel = lock
      })
      .catch(() => undefined)
    return () => {
      cancelled = true
      if (sentinel) void sentinel.release().catch(() => undefined)
    }
  }, [stage])

  const finishWorkout = (early: boolean) => {
    if (!session || finishedRef.current) return
    finishedRef.current = true
    setEndedEarly(early)
    completeSession(session.id, Math.max(1, activeRef.current))
    setPaused(false)
    setTired(false)
    setTiredRest(false)
    setStage('summary')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const moveNext = () => {
    const next = indexRef.current + 1
    if (next >= stepsRef.current.length) {
      finishWorkout(false)
      return
    }
    indexRef.current = next
    setStepIndex(next)
  }

  const handleStepFinish = (value?: number) => {
    const current = stepsRef.current[indexRef.current]
    if (!current) return
    if (
      session &&
      value !== undefined &&
      value > 0 &&
      current.kind === 'work' &&
      current.block === 'main'
    ) {
      const exercise = getExercise(current.slug)
      const result = recordResult(session.id, {
        slug: current.slug,
        metric: exercise.metric,
        value,
        itemKey: current.key,
        round: current.round,
        block: current.block,
      })
      setMainDone((count) => count + 1)
      setRecords((list) => [
        ...list,
        {
          slug: current.slug,
          name: exercise.nameVi,
          metric: exercise.metric,
          value,
          previous: result.previousBest,
          isNewBest: result.isNewBest,
        },
      ])
      if (result.isNewBest) {
        celebrate(1.15)
        vibrate([30, 60, 30])
        setToast({
          title: 'Kỷ lục mới!',
          detail: `${exercise.nameVi}: ${formatValue(exercise.metric, value)}${
            result.previousBest !== undefined
              ? ` — trước đó ${formatValue(exercise.metric, result.previousBest)}`
              : ''
          }`,
          fresh: true,
        })
      } else if (result.isFirst) {
        setToast({
          title: 'Kỷ lục đầu tiên!',
          detail: `${exercise.nameVi}: ${formatValue(exercise.metric, value)}. Lần sau mình thử vượt qua nhé!`,
          fresh: false,
        })
      }
    }
    moveNext()
  }

  const handleStart = () => {
    indexRef.current = 0
    setStepIndex(0)
    setStage('countdown')
    vibrate(20)
  }

  const handleExit = () => {
    if (!session) return
    abandonSession(session.id)
    navigate('/')
  }

  if (!session) {
    return (
      <div className="app-backdrop min-h-dvh px-5 py-10">
        <Card className="mx-auto max-w-[520px] p-6 text-center">
          <p className="text-sm font-extrabold text-ink">Không tìm thấy buổi tập</p>
          <p className="mt-1 text-xs font-semibold text-muted">
            Buổi tập có thể đã kết thúc hoặc được tạo trên thiết bị khác.
          </p>
          <Button className="mt-4" fullWidth onClick={() => navigate('/')}>
            Về trang hôm nay
          </Button>
        </Card>
      </div>
    )
  }

  const step = steps[stepIndex]
  const exercise = step ? getExercise(step.slug) : null

  const nextWork = (() => {
    for (let index = stepIndex + 1; index < steps.length; index += 1) {
      const candidate = steps[index]
      if (candidate.kind === 'work') return candidate
    }
    return null
  })()

  const progress = steps.length ? Math.min(1, (stepIndex + (stage === 'summary' ? 1 : 0)) / steps.length) : 0

  // Chỉ đọc thay đổi bước để trình đọc màn hình không đọc từng giây đếm ngược.
  const announcement = (() => {
    if (stage === 'intro' && plan) {
      return `Buổi tập ${plan.durationMin} phút. Nhấn Bắt đầu khi bé sẵn sàng.`
    }
    if (stage === 'countdown' && exercise) {
      return `Chuẩn bị bắt đầu ${exercise.nameVi}.`
    }
    if (stage === 'summary') {
      return `Đã kết thúc buổi tập. ${mainDone} trên ${mainWorkTotal} bài chính hoàn thành.`
    }
    if (!step || !exercise) return ''
    if (step.kind !== 'work') {
      const next = nextWork ? getExercise(nextWork.slug).nameVi : ''
      return `Nghỉ ${step.durationSec} giây.${next ? ` Bài tiếp theo: ${next}.` : ''}`
    }
    const roundText = step.block === 'main' ? ` Vòng ${step.round}.` : ''
    const dose =
      exercise.metric === 'reps' && step.block === 'main'
        ? ` Mục tiêu ${Math.round(exercise.ageParams[band]?.target ?? 10)} lần.`
        : ` Làm ${step.durationSec} giây.`
    return `${exercise.nameVi}.${roundText}${dose}`
  })()

  if (stage === 'summary') {
    return (
      <div className="app-backdrop min-h-dvh">
        <div className="mx-auto flex min-h-dvh w-full max-w-[560px] flex-col px-5 py-6">
          <SummaryScreen
            plan={plan!}
            activeSec={activeSec}
            mainDone={mainDone}
            mainTotal={mainWorkTotal}
            records={records}
            endedEarly={endedEarly}
            onHome={() => navigate('/')}
            onLibrary={() => navigate('/bai-tap')}
          />
        </div>
      </div>
    )
  }

  if (session.status !== 'in_progress') {
    return (
      <div className="app-backdrop min-h-dvh px-5 py-10">
        <Card className="mx-auto max-w-[520px] p-6 text-center">
          <div className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-full bg-mint text-teal-dark">
            <Icon name="check" className="h-7 w-7" />
          </div>
          <p className="text-sm font-extrabold text-ink">Buổi tập này đã kết thúc</p>
          <p className="mt-1 text-xs font-semibold text-muted">
            Bé có thể bắt đầu một buổi mới từ trang Hôm nay.
          </p>
          <Button className="mt-4" fullWidth onClick={() => navigate('/')}>
            Về trang hôm nay
          </Button>
        </Card>
      </div>
    )
  }

  return (
    <div className="app-backdrop relative min-h-dvh">
      <div className="mx-auto flex min-h-dvh w-full max-w-[560px] flex-col px-5 pb-6 pt-4">
        <header className="mb-3 flex items-center gap-2">
          <button
            type="button"
            onClick={() => setExitOpen(true)}
            className="focus-ring grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white text-ink shadow-sm"
            aria-label="Thoát buổi tập"
          >
            <Icon name="close" />
          </button>
          <div className="min-w-0 flex-1">
            <div
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(progress * 100)}
              aria-label="Tiến trình buổi tập"
              className="h-2 overflow-hidden rounded-full bg-ink/10"
            >
              <div
                className="h-full rounded-full bg-coral transition-[width] duration-500"
                style={{ width: `${Math.round(progress * 100)}%` }}
              />
            </div>
            <p className="mt-1 text-center text-xs font-extrabold uppercase tracking-[0.14em] text-muted">
              {stage === 'intro'
                ? `${plan?.durationMin} phút vận động`
                : `Bước ${Math.min(stepIndex + 1, steps.length)}/${steps.length}`}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setPaused((value) => !value)}
            disabled={stage !== 'step'}
            className="focus-ring grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white text-ink shadow-sm disabled:opacity-40"
            aria-label={paused ? 'Tiếp tục' : 'Tạm dừng'}
          >
            <Icon name={paused ? 'play' : 'pause'} filled={paused} />
          </button>
        </header>

        {!online && (
          <div
            role="status"
            className="mb-2 rounded-2xl bg-ink px-3 py-2 text-xs font-bold leading-snug text-white"
          >
            Đang offline. Buổi tập và kết quả vẫn được lưu trên thiết bị này.
          </div>
        )}

        <p className="sr-only" role="status" aria-live="polite" aria-atomic="true">
          {announcement}
        </p>

        {stage === 'intro' && exercise && plan && (
          <IntroScreen
            plan={plan}
            exercise={exercise}
            onStart={handleStart}
            onExit={() => setExitOpen(true)}
          />
        )}

        {stage === 'countdown' && exercise && (
          <CountdownScreen
            exercise={exercise}
            onDone={() => setStage('step')}
            onTired={() => setTired(true)}
          />
        )}

        {stage === 'step' && step && exercise && (
          <>
            <StepScreen
              key={step.key}
              step={step}
              exercise={exercise}
              band={band}
              next={nextWork ? getExercise(nextWork.slug) : null}
              paused={paused || tiredRest}
              onFinish={handleStepFinish}
              onTired={() => setTired(true)}
            />
            {tiredRest && <TiredRestOverlay onDone={() => setTiredRest(false)} />}
            {paused && !tiredRest && (
              <PauseOverlay
                onResume={() => setPaused(false)}
                onFinish={() => finishWorkout(true)}
              />
            )}
          </>
        )}
      </div>

      {toast && (
        <div className="pointer-events-none fixed inset-x-4 top-4 z-[60] mx-auto max-w-[420px] animate-pop">
          <div
            role="status"
            className={cx(
              'flex items-center gap-3 rounded-3xl px-4 py-3 shadow-xl',
              toast.fresh
                ? 'bg-[linear-gradient(120deg,#FF7A59,#FFC94A)] text-[#1B2F43]'
                : 'bg-ink text-white',
            )}
          >
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white/20">
              <Icon name="star" filled className="h-6 w-6" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-black">{toast.title}</p>
              <p className="text-xs font-bold leading-snug">{toast.detail}</p>
            </div>
          </div>
        </div>
      )}

      <Modal
        open={exitOpen}
        onClose={() => setExitOpen(false)}
        title="Tạm dừng buổi tập?"
        footer={
          <div className="grid grid-cols-2 gap-2">
            <Button variant="secondary" onClick={() => setExitOpen(false)}>
              Ở lại tập tiếp
            </Button>
            <Button variant="primary" onClick={handleExit}>
              Thoát buổi tập
            </Button>
          </div>
        }
      >
        <p className="text-sm font-semibold leading-relaxed text-muted">
          Kết quả bé đã đạt được vẫn được giữ lại. Buổi tập này sẽ được tính là chưa hoàn thành và
          không cộng vào chuỗi ngày.
        </p>
      </Modal>

      <Modal
        open={tired}
        onClose={() => setTired(false)}
        title="Bé mệt rồi?"
        footer={
          <Button variant="secondary" fullWidth onClick={() => setTired(false)}>
            Bé vẫn tập tiếp được
          </Button>
        }
      >
        <p className="text-sm font-semibold leading-relaxed text-muted">
          Nghỉ là hoàn toàn bình thường, không bị trừ sao. Chọn cách bé muốn nhé:
        </p>
        <div className="mt-3 space-y-2">
          <Button
            variant="teal"
            fullWidth
            onClick={() => {
              setTired(false)
              setTiredRest(true)
            }}
          >
            <Icon name="heart" className="h-4 w-4" />
            Nghỉ thêm 30 giây
          </Button>
          <Button
            variant="secondary"
            fullWidth
            onClick={() => {
              setTired(false)
              moveNext()
            }}
          >
            <Icon name="right" className="h-4 w-4" />
            Bỏ qua bài này
          </Button>
          <Button
            variant="ghost"
            fullWidth
            onClick={() => {
              setTired(false)
              finishWorkout(true)
            }}
          >
            <Icon name="stop" className="h-4 w-4" />
            Kết thúc buổi tập hôm nay
          </Button>
        </div>
      </Modal>
    </div>
  )
}

function IntroScreen({
  plan,
  exercise,
  onStart,
  onExit,
}: {
  plan: SessionPlan
  exercise: Exercise
  onStart: () => void
  onExit: () => void
}) {
  const warmups = plan.steps.filter((step) => step.block === 'warmup' && step.kind === 'work')
  const cooldowns = plan.steps.filter((step) => step.block === 'cooldown' && step.kind === 'work')
  const rounds = Math.max(...plan.steps.map((step) => step.round), 1)

  return (
    <div className="flex flex-1 flex-col">
      <div className="animate-pop overflow-hidden rounded-[2rem] bg-white shadow-[0_18px_40px_-24px_rgba(36,59,83,0.4)]">
        <ExerciseArt exercise={exercise} priority className="h-48 w-full" />
        <div className="p-5">
          <div className="flex flex-wrap gap-1.5">
            <Badge tone="coral">{plan.title}</Badge>
            <Badge tone="sun">
              <Icon name="clock" className="h-3.5 w-3.5" />
              {plan.durationMin} phút
            </Badge>
            <Badge tone="sky">{CATEGORY_LABEL[exercise.category]}</Badge>
          </div>
          <h1 className="display-title mt-3 text-[26px] leading-tight text-ink">
            Sẵn sàng vận động chưa?
          </h1>
          <p className="mt-1 text-sm font-semibold text-muted">{plan.subtitle}</p>

          <div className="mt-4 space-y-2">
            <PlanRow
              tint="bg-sun-soft text-[#8A5C00]"
              icon="flame"
              title="Khởi động"
              detail={`${warmups.length} bài · làm nóng cơ thể`}
            />
            <PlanRow
              tint="bg-peach text-coral-dark"
              icon="sparkles"
              title="Mạch chính"
              detail={`${plan.mainSlugs.length} bài × ${rounds} vòng`}
            />
            <PlanRow
              tint="bg-mint text-teal-dark"
              icon="heart"
              title="Thư giãn"
              detail={`${cooldowns.length} bài · hít thở và giãn cơ`}
            />
          </div>

          <div className="mt-4 rounded-2xl bg-cream p-3 text-xs font-semibold leading-relaxed text-muted">
            Bố mẹ ngồi gần, quan sát bé và cùng đếm nhé. Bé mệt thì bấm “Bé mệt” bất cứ lúc nào —
            không bị trừ sao.
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2">
            <Button variant="secondary" onClick={onExit}>
              <Icon name="left" className="h-4 w-4" />
              Để sau
            </Button>
            <Button onClick={onStart}>
              <Icon name="play" filled className="h-5 w-5" />
              Bắt đầu!
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

function PlanRow({
  tint,
  icon,
  title,
  detail,
}: {
  tint: string
  icon: 'flame' | 'sparkles' | 'heart'
  title: string
  detail: string
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-white px-1 py-1">
      <span className={cx('grid h-9 w-9 shrink-0 place-items-center rounded-xl', tint)}>
        <Icon name={icon} className="h-4.5 w-4.5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-extrabold text-ink">{title}</p>
        <p className="text-xs font-semibold text-muted">{detail}</p>
      </div>
    </div>
  )
}

function CountdownScreen({
  exercise,
  onDone,
  onTired,
}: {
  exercise: Exercise
  onDone: () => void
  onTired: () => void
}) {
  const [count, setCount] = useState(3)

  useEffect(() => {
    vibrate(25)
    if (count <= 0) {
      const timer = window.setTimeout(onDone, 600)
      return () => window.clearTimeout(timer)
    }
    const timer = window.setTimeout(() => setCount((value) => value - 1), 800)
    return () => window.clearTimeout(timer)
  }, [count, onDone])

  return (
    <div className="flex flex-1 flex-col items-center justify-center text-center">
      <div className="animate-float w-full max-w-[280px]">
        <ExerciseArt exercise={exercise} priority className="mx-auto h-40 w-full rounded-[2rem]" />
      </div>
      <p className="mt-5 text-xs font-extrabold uppercase tracking-[0.2em] text-muted">
        {count > 0 ? 'Chuẩn bị nhé' : 'Bắt đầu!'}
      </p>
      <p
        key={count}
        className="display-title animate-pop mt-1 text-[92px] leading-none text-coral-dark"
        aria-live="assertive"
      >
        {count > 0 ? count : 'GO!'}
      </p>
      <p className="mt-3 max-w-[260px] text-sm font-bold text-ink">
        {exercise.nameVi}
      </p>
      <p className="mt-1 max-w-[280px] text-xs font-semibold text-muted">
        {exercise.cuesVi[0]}
      </p>
      <Button variant="ghost" className="mt-6" onClick={onTired}>
        <Icon name="heart" className="h-4 w-4" />
        Bé mệt
      </Button>
    </div>
  )
}

function StepScreen({
  step,
  exercise,
  band,
  next,
  paused,
  onFinish,
  onTired,
}: {
  step: PlanStep
  exercise: Exercise
  band: AgeBand
  next: Exercise | null
  paused: boolean
  onFinish: (value?: number) => void
  onTired: () => void
}) {
  const isWork = step.kind === 'work'
  const isMain = step.block === 'main'
  const isReps = isWork && isMain && exercise.metric === 'reps'
  const isStopwatch = isWork && isMain && exercise.metric === 'time_seconds'
  const manual = isReps || isStopwatch

  const target = exercise.ageParams[band]?.target ?? 10
  const elapsed = useStopwatch(isStopwatch && !paused)

  const left = useSteadyCountdown(step.durationSec, !manual && !paused, () => {
    onFinish(isWork && isMain ? step.durationSec : undefined)
  })

  const blockLabel =
    step.block === 'warmup' ? 'Khởi động' : step.block === 'cooldown' ? 'Thư giãn' : 'Mạch chính'

  if (step.kind !== 'work') {
    const isBreak = step.kind === 'break'
    return (
      <div className="flex flex-1 flex-col items-center text-center">
        <Badge tone={isBreak ? 'grape' : 'teal'} className="mt-1">
          {isBreak ? 'Nghỉ giữa vòng' : 'Nghỉ ngơi'}
        </Badge>
        {next && (
          <div className="mt-4 flex items-center gap-3 rounded-3xl bg-white p-3 shadow-sm">
            <ExerciseArt exercise={next} className="h-14 w-16 shrink-0 rounded-xl" decoration={false} />
            <div className="text-left">
              <p className="text-xs font-extrabold uppercase tracking-wide text-muted">
                Sắp tới
              </p>
              <p className="text-sm font-extrabold text-ink">{next.nameVi}</p>
            </div>
          </div>
        )}
        <div className="my-5">
          <ProgressRing
            progress={1 - left / step.durationSec}
            size={210}
            stroke={12}
            color={isBreak ? '#8C7AE6' : '#2FB8A6'}
            label={`Còn ${Math.ceil(left)} giây${isBreak ? ' nghỉ' : ' thư giãn'}`}
          >
            <span className="display-title text-[56px] leading-none text-ink">
              {Math.ceil(left)}
            </span>
            <span className="mt-1 text-xs font-extrabold uppercase tracking-[0.16em] text-muted">
              giây
            </span>
          </ProgressRing>
        </div>
        <p className="text-sm font-extrabold text-ink">
          {isBreak ? 'Uống nước, thở đều nhé!' : 'Thư giãn, thở chậm nào'}
        </p>
        <p className="mt-1 max-w-[280px] text-xs font-semibold leading-relaxed text-muted">
          {isBreak
            ? 'Nghỉ một chút rồi mình chơi vòng tiếp theo.'
            : 'Ngồi yên, hít vào thật sâu và thở ra chậm.'}
        </p>
        <div className="mt-6 flex flex-col items-center gap-2">
          <Button variant="secondary" onClick={() => onFinish()}>
            <Icon name="right" className="h-4 w-4" />
            Bỏ qua nghỉ
          </Button>
          <Button variant="ghost" size="sm" onClick={onTired}>
            <Icon name="heart" className="h-4 w-4" />
            Bé mệt
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col">
      <div className="animate-pop overflow-hidden rounded-[2rem] bg-white shadow-[0_18px_40px_-24px_rgba(36,59,83,0.4)]">
        <div className="relative">
          <ExerciseArt exercise={exercise} priority className="h-40 w-full sm:h-44" />
          <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
            <Badge tone={isMain ? 'coral' : 'sun'}>{blockLabel}</Badge>
            {isMain && (
              <Badge tone="neutral" className="bg-white/85">
                Vòng {step.round}
              </Badge>
            )}
          </div>
        </div>

        <div className="px-5 pb-5 pt-4">
          <h1 className="display-title text-[22px] leading-tight text-ink">{exercise.nameVi}</h1>
          <p className="mt-0.5 text-xs font-semibold text-muted">{exercise.shortVi}</p>

          <div className="mt-3 flex flex-wrap gap-1.5">
            {exercise.cuesVi.map((cue) => (
              <span
                key={cue}
                className="rounded-full bg-cream px-2.5 py-1 text-xs font-bold text-ink/80"
              >
                {cue}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-1 flex-col items-center justify-center rounded-[2rem] bg-white/70 px-4 py-5">
        {isReps && (
          <RepCounter
            target={Math.round(target)}
            onDone={(value) => onFinish(value)}
          />
        )}

        {isStopwatch && (
          <StopwatchCounter
            elapsed={elapsed}
            target={step.durationSec}
            onDone={() => onFinish(Math.max(1, Math.round(elapsed)))}
          />
        )}

        {!manual && (
          <>
            <ProgressRing
              progress={1 - left / step.durationSec}
              size={200}
              stroke={12}
              color={step.block === 'cooldown' ? '#2FB8A6' : '#FF7A59'}
              label={`Còn ${Math.ceil(left)} giây`}
            >
              <span className="display-title text-[52px] leading-none text-ink">
                {Math.ceil(left)}
              </span>
              <span className="mt-1 text-xs font-extrabold uppercase tracking-[0.16em] text-muted">
                giây còn lại
              </span>
            </ProgressRing>
            <p className="mt-3 text-xs font-bold text-muted">
              {exercise.metric === 'hold_seconds'
                ? `Giữ tư thế đủ ${step.durationSec} giây nhé!`
                : 'Làm theo nhịp đều, đừng vội.'}
            </p>
          </>
        )}

        <div className="mt-4 flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={onTired}>
            <Icon name="heart" className="h-4 w-4" />
            Bé mệt
          </Button>
        </div>

        {next && (
          <p className="mt-3 max-w-[300px] truncate text-xs font-semibold text-muted">
            Tiếp theo: <span className="font-extrabold text-ink/70">{next.nameVi}</span>
          </p>
        )}
      </div>
    </div>
  )
}

function RepCounter({
  target,
  onDone,
}: {
  target: number
  onDone: (value: number) => void
}) {
  const [value, setValue] = useState(Math.max(1, target))
  const valueRef = useRef(Math.max(1, target))

  const change = (delta: number) => {
    valueRef.current = Math.max(0, valueRef.current + delta)
    setValue(valueRef.current)
  }

  return (
    <div className="w-full text-center">
      <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-muted">
        Đếm số lần
      </p>
      <div className="mt-2 flex items-center justify-center gap-4">
        <button
          type="button"
          onClick={() => change(-1)}
          className="focus-ring grid h-14 w-14 place-items-center rounded-full bg-ink/5 text-ink active:scale-95"
          aria-label="Bớt một lần"
        >
          <Icon name="minus" className="h-6 w-6" />
        </button>
        <div className="min-w-[110px]">
          <span className="display-title block text-[68px] leading-none text-coral-dark">{value}</span>
          <span className="text-xs font-extrabold uppercase tracking-wide text-muted">lần</span>
        </div>
        <button
          type="button"
          onClick={() => change(1)}
          className="focus-ring grid h-14 w-14 place-items-center rounded-full bg-teal-dark text-white active:scale-95"
          aria-label="Thêm một lần"
        >
          <Icon name="plus" className="h-6 w-6" />
        </button>
      </div>
      <p className="mt-2 text-xs font-bold text-muted">Mục tiêu khoảng {target} lần</p>
      <Button
        className="mt-4"
        size="lg"
        fullWidth
        onClick={() => onDone(Math.max(1, valueRef.current))}
      >
        <Icon name="check" className="h-5 w-5" />
        Xong bài này
      </Button>
    </div>
  )
}

function StopwatchCounter({
  elapsed,
  target,
  onDone,
}: {
  elapsed: number
  target: number
  onDone: () => void
}) {
  return (
    <div className="w-full text-center">
      <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-muted">
        Bấm giờ
      </p>
      <span className="display-title mt-2 block text-[64px] leading-none text-teal-dark">
        {Math.floor(elapsed)}
      </span>
      <span className="text-xs font-extrabold uppercase tracking-wide text-muted">giây</span>
      <p className="mt-2 text-xs font-bold text-muted">
        Mục tiêu khoảng {target} giây · nhanh mà vẫn an toàn nhé
      </p>
      <Button className="mt-4" size="lg" variant="teal" fullWidth onClick={onDone}>
        <Icon name="check" className="h-5 w-5" />
        Xong rồi!
      </Button>
    </div>
  )
}

function TiredRestOverlay({ onDone }: { onDone: () => void }) {
  const left = useSteadyCountdown(30, true, onDone)
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Nghỉ thêm 30 giây"
      className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-cream/95 px-6 text-center backdrop-blur-sm"
    >
      <div className="grid h-16 w-16 place-items-center rounded-full bg-mint text-teal-dark">
        <Icon name="heart" className="h-8 w-8" />
      </div>
      <p className="display-title mt-4 text-2xl text-ink">Nghỉ một chút nhé</p>
      <p className="mt-1 text-sm font-semibold text-muted">Hít vào thật sâu… thở ra chậm…</p>
      <p className="display-title mt-4 text-[64px] leading-none text-teal-dark">{Math.ceil(left)}</p>
      <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-muted">giây</p>
      <Button className="mt-6" variant="teal" onClick={onDone}>
        Bé khoẻ rồi, tập tiếp!
      </Button>
    </div>
  )
}

function PauseOverlay({
  onResume,
  onFinish,
}: {
  onResume: () => void
  onFinish: () => void
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Buổi tập đang tạm dừng"
      className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-cream/95 px-6 text-center backdrop-blur-sm"
    >
      <div className="grid h-16 w-16 place-items-center rounded-full bg-peach text-coral-dark">
        <Icon name="pause" className="h-8 w-8" />
      </div>
      <p className="display-title mt-4 text-2xl text-ink">Đang tạm dừng</p>
      <p className="mt-1 max-w-[280px] text-sm font-semibold text-muted">
        Bé nghỉ một chút rồi mình tiếp tục nhé. Không sao cả!
      </p>
      <Button className="mt-6 w-full max-w-[280px]" onClick={onResume}>
        <Icon name="play" filled className="h-4 w-4" />
        Tiếp tục tập
      </Button>
      <Button className="mt-2" variant="ghost" onClick={onFinish}>
        Kết thúc buổi tập
      </Button>
    </div>
  )
}

function SummaryScreen({
  plan,
  activeSec,
  mainDone,
  mainTotal,
  records,
  endedEarly,
  onHome,
  onLibrary,
}: {
  plan: SessionPlan
  activeSec: number
  mainDone: number
  mainTotal: number
  records: RecordItem[]
  endedEarly: boolean
  onHome: () => void
  onLibrary: () => void
}) {
  const percent = mainTotal ? mainDone / mainTotal : 0
  const stars = percent >= 1 ? 3 : percent >= 0.5 ? 2 : 1
  const minutes = Math.max(1, Math.round(activeSec / 60))
  const fresh = records.filter((record) => record.isNewBest)

  return (
    <div className="flex flex-1 flex-col">
      <div className="animate-pop rounded-[2rem] bg-[linear-gradient(150deg,#FF7A59,#FF9A5C_55%,#FFC94A)] p-6 text-center text-[#1B2F43] shadow-[0_20px_44px_-24px_rgba(232,91,58,0.8)]">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-white/30">
          <Icon name="sparkles" className="h-8 w-8" />
        </div>
        <p className="mt-3 text-xs font-extrabold uppercase tracking-[0.2em]">
          {endedEarly ? 'Mình nghỉ sớm một chút' : 'Hoàn thành buổi tập'}
        </p>
        <h1 className="display-title mt-1 text-[30px] leading-tight">Giỏi quá, bé ơi!</h1>
        <div className="mt-4">
          <Stars count={stars} />
        </div>
        <p className="mt-3 text-sm font-bold">
          {endedEarly
            ? 'Nghỉ khi thấy mệt là điều rất đúng. Mai mình chơi tiếp nhé!'
            : 'Mỗi ngày vận động là một ngày bé khoẻ hơn.'}
        </p>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        <StatTile label="Phút vận động" value={`${minutes}`} tint="bg-mint text-teal-dark" />
        <StatTile label="Bài tập" value={`${mainDone}/${mainTotal}`} tint="bg-peach text-coral-dark" />
        <StatTile label="Kỷ lục mới" value={`${fresh.length}`} tint="bg-sun-soft text-[#8A5C00]" />
      </div>

      <Card className="mt-4 p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-extrabold text-ink">Kết quả lần này</h2>
          <Badge tone="neutral">{plan.title}</Badge>
        </div>
        {records.length ? (
          <div className="mt-3 space-y-2">
            {records.map((record) => (
              <div
                key={`${record.slug}-${record.value}-${record.name}`}
                className="flex items-center gap-2.5 rounded-2xl bg-cream px-3 py-2"
              >
                <span
                  className={cx(
                    'grid h-8 w-8 shrink-0 place-items-center rounded-full',
                    record.isNewBest ? 'bg-sun text-[#6B4700]' : 'bg-white text-muted',
                  )}
                >
                  <Icon name="star" filled={record.isNewBest} className="h-4 w-4" />
                </span>
                <p className="min-w-0 flex-1 truncate text-xs font-extrabold text-ink">
                  {record.name}
                </p>
                <span className="shrink-0 text-xs font-black text-ink">
                  {formatValue(record.metric, record.value)}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-2 text-xs font-semibold leading-relaxed text-muted">
            {endedEarly
              ? 'Buổi tập dừng trước khi hoàn thành bài chính nên chưa có kết quả mới. Không sao nhé!'
              : 'Buổi tập chưa ghi nhận kết quả bài chính nào.'}
          </p>
        )}
        {fresh.length > 0 && (
          <div className="mt-3 flex items-start gap-2 rounded-2xl bg-sun-soft/70 p-3">
            <Icon name="sparkles" className="mt-0.5 h-4 w-4 shrink-0 text-[#8A5C00]" />
            <p className="text-xs font-bold leading-relaxed text-[#7A5200]">
              Kỷ lục mới đã được lưu lại. Lần sau bé thử vượt qua chính mình nhé!
            </p>
          </div>
        )}
      </Card>

      <div className="mt-4 rounded-3xl bg-mint/70 p-4">
        <div className="flex items-center gap-2 text-sm font-extrabold text-teal-dark">
          <Icon name="info" className="h-4 w-4" />
          Nhắc bố mẹ
        </div>
        <p className="mt-1 text-xs font-semibold leading-relaxed text-teal-dark">
          Khen bé cụ thể (“con giữ thăng bằng tốt hơn hôm qua!”) thay vì chỉ khen kết quả. Nếu bé
          đau, chóng mặt hoặc thở gấp bất thường, hãy dừng lại và hỏi bác sĩ nhi.
        </p>
      </div>

      <div className="mt-auto grid gap-2 pt-4">
        <Button size="lg" fullWidth onClick={onHome}>
          <Icon name="home" className="h-5 w-5" />
          Về trang hôm nay
        </Button>
        <Button variant="secondary" fullWidth onClick={onLibrary}>
          <Icon name="book" className="h-5 w-5" />
          Xem kỷ lục bài tập
        </Button>
      </div>
    </div>
  )
}

function StatTile({
  label,
  value,
  tint,
}: {
  label: string
  value: string
  tint: string
}) {
  return (
    <div className={cx('rounded-2xl px-2 py-3 text-center', tint)}>
      <p className="display-title text-[22px] leading-none">{value}</p>
      <p className="mt-1 text-xs font-extrabold uppercase leading-tight tracking-wide">
        {label}
      </p>
    </div>
  )
}
