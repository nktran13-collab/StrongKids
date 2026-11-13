import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { useStore } from '../../app/store'
import { Button, Card, Field, Icon, Modal, PageHeader, TextInput } from '../../components/ui'
import { TurnstileWidget } from '../../components/TurnstileWidget'
import { useEmailOtp } from '../auth/useEmailOtp'

const UNLOCK_KEY = 'strongkids.parentUnlock.v1'
const FAIL_KEY = 'strongkids.parentPinFail.v1'
const UNLOCK_MS = 15 * 60_000
const MAX_TRIES = 5
const BLOCK_MS = 30_000

interface FailureState {
  count: number
  until: number
}

let memoryUnlockUntil = 0

function readUnlockUntil(): number {
  try {
    return Math.max(Number(sessionStorage.getItem(UNLOCK_KEY) ?? 0) || 0, memoryUnlockUntil)
  } catch {
    return memoryUnlockUntil
  }
}

function markUnlocked() {
  memoryUnlockUntil = Date.now() + UNLOCK_MS
  try {
    sessionStorage.setItem(UNLOCK_KEY, String(memoryUnlockUntil))
  } catch {
    // Trình duyệt chặn sessionStorage thì chỉ mở khoá trong phiên hiện tại.
  }
}

function clearUnlocked() {
  memoryUnlockUntil = 0
  try {
    sessionStorage.removeItem(UNLOCK_KEY)
  } catch {
    // Không cần xử lý: khoá vẫn áp dụng khi tải lại trang.
  }
}

function readFailures(): FailureState {
  try {
    const raw = JSON.parse(sessionStorage.getItem(FAIL_KEY) ?? '{}') as Partial<FailureState>
    const until = Number(raw.until) || 0
    if (until && until <= Date.now()) return { count: 0, until: 0 }
    return { count: Number(raw.count) || 0, until }
  } catch {
    return { count: 0, until: 0 }
  }
}

function writeFailures(state: FailureState) {
  try {
    sessionStorage.setItem(FAIL_KEY, JSON.stringify(state))
  } catch {
    // Bỏ qua: giới hạn thử chỉ là lớp bảo vệ phụ.
  }
}

export function ParentPinGate({ children }: { children: ReactNode }) {
  const { data, cloudStatus } = useStore()
  const [unlocked, setUnlocked] = useState(() => readUnlockUntil() > Date.now())
  const [changeOpen, setChangeOpen] = useState(false)
  const [resetOpen, setResetOpen] = useState(false)

  useEffect(() => {
    if (!unlocked) return
    const left = readUnlockUntil() - Date.now()
    if (left <= 0) {
      clearUnlocked()
      setUnlocked(false)
      return
    }
    const timer = window.setTimeout(() => {
      clearUnlocked()
      setUnlocked(false)
    }, left)
    return () => window.clearTimeout(timer)
  }, [unlocked])

  // Bản demo không có dữ liệu thật nên không chặn phụ huynh muốn xem thử.
  if (cloudStatus === 'demo') return <>{children}</>

  const unlock = () => {
    markUnlocked()
    setUnlocked(true)
  }

  const lock = () => {
    clearUnlocked()
    setUnlocked(false)
  }

  return (
    <>
      {!data.pinHash ? (
        <PinShell
          title="Tạo mã PIN cho Khu phụ huynh"
          subtitle="Chỉ bố mẹ mở được thông tin sức khoẻ của bé"
        >
          <PinSetup onCreated={unlock} />
        </PinShell>
      ) : unlocked ? (
        <>
          <div className="mb-3 flex items-center justify-between gap-2 rounded-2xl bg-mint/70 px-3 py-2">
            <span className="flex min-w-0 items-center gap-1.5 text-xs font-bold text-teal-dark">
              <Icon name="lock" className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">Khu phụ huynh đã mở khoá</span>
            </span>
            <div className="flex shrink-0 items-center gap-1 text-xs font-bold">
              <button
                type="button"
                onClick={() => setChangeOpen(true)}
                className="focus-ring rounded-lg px-2 py-1 text-teal-dark hover:bg-white/70"
              >
                Đổi mã PIN
              </button>
              <button
                type="button"
                onClick={lock}
                className="focus-ring rounded-lg px-2 py-1 text-coral-dark hover:bg-white/70"
              >
                Khoá
              </button>
            </div>
          </div>
          {children}
        </>
      ) : (
        <PinShell
          title="Nhập mã PIN để mở khoá"
          subtitle="Khu phụ huynh được khoá để bé không tự xem dữ liệu sức khoẻ"
        >
          <PinUnlock onUnlocked={unlock} onForgot={() => setResetOpen(true)} />
        </PinShell>
      )}

      {changeOpen && <ChangePinModal onClose={() => setChangeOpen(false)} />}
      {resetOpen && (
        <ResetPinModal
          onClose={() => setResetOpen(false)}
          onReset={() => {
            setResetOpen(false)
            lock()
          }}
        />
      )}
    </>
  )
}

function PinShell({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle: string
  children: ReactNode
}) {
  return (
    <div className="pb-2">
      <PageHeader title="Khu phụ huynh" subtitle="Khu vực dành cho bố mẹ" />
      <Card className="p-5">
        <div className="mb-4 flex items-start gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-peach text-coral-dark">
            <Icon name="lock" className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-sm font-extrabold text-ink">{title}</h2>
            <p className="mt-0.5 text-xs font-semibold leading-relaxed text-muted">{subtitle}</p>
          </div>
        </div>
        {children}
      </Card>
    </div>
  )
}

function PinSetup({ onCreated }: { onCreated: () => void }) {
  const { setPin } = useStore()
  const [pin, setPinValue] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (!/^\d{4}$/.test(pin)) {
      setError('Mã PIN gồm 4 chữ số. Bố mẹ nhập lại giúp em nhé.')
      return
    }
    if (pin !== confirm) {
      setError('Hai lần nhập chưa khớp. Bố mẹ nhập lại giúp em nhé.')
      return
    }
    setError('')
    setBusy(true)
    try {
      await setPin(pin)
      onCreated()
    } catch {
      setError('Chưa lưu được mã PIN. Bố mẹ thử lại nhé.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} noValidate>
      <Field label="Mã PIN mới" hint="4 chữ số">
        <TextInput
          type="password"
          inputMode="numeric"
          autoComplete="new-password"
          pattern="[0-9]*"
          maxLength={4}
          autoFocus
          value={pin}
          className="text-center text-xl font-bold tracking-[0.45em]"
          onChange={(event) => {
            setPinValue(event.target.value.replace(/\D/g, '').slice(0, 4))
            if (error) setError('')
          }}
        />
      </Field>
      <div className="mt-3">
        <Field label="Nhập lại mã PIN">
          <TextInput
            type="password"
            inputMode="numeric"
            autoComplete="new-password"
            pattern="[0-9]*"
            maxLength={4}
            value={confirm}
            className="text-center text-xl font-bold tracking-[0.45em]"
            onChange={(event) => {
              setConfirm(event.target.value.replace(/\D/g, '').slice(0, 4))
              if (error) setError('')
            }}
          />
        </Field>
      </div>

      {error && (
        <p className="mt-3 rounded-xl bg-peach px-3 py-2 text-xs font-bold text-coral-dark">
          {error}
        </p>
      )}

      <Button type="submit" fullWidth className="mt-4" disabled={busy}>
        <Icon name="shield" className="h-4 w-4" />
        {busy ? 'Đang lưu…' : 'Tạo mã PIN'}
      </Button>

      <p className="mt-3 text-xs font-semibold leading-relaxed text-muted">
        Mã PIN chỉ khoá Khu phụ huynh sau khi đăng nhập, không thay cho đăng nhập email. Nếu quên
        mã, bố mẹ xác thực lại email để đặt mã mới.
      </p>
    </form>
  )
}

function PinUnlock({
  onUnlocked,
  onForgot,
}: {
  onUnlocked: () => void
  onForgot: () => void
}) {
  const { verifyPin } = useStore()
  const [pin, setPinValue] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [failures, setFailures] = useState<FailureState>(readFailures)
  const [now, setNow] = useState(() => Date.now())

  const blocked = failures.until > now

  useEffect(() => {
    if (!blocked) return
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [blocked])

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (blocked) {
      setError(`Bố mẹ thử lại sau ${Math.ceil((failures.until - now) / 1000)} giây nhé.`)
      return
    }
    if (!/^\d{4}$/.test(pin)) {
      setError('Mã PIN gồm 4 chữ số. Bố mẹ kiểm tra lại nhé.')
      return
    }
    setError('')
    setBusy(true)
    const ok = await verifyPin(pin)
    setBusy(false)
    setPinValue('')
    if (ok) {
      const cleared = { count: 0, until: 0 }
      writeFailures(cleared)
      setFailures(cleared)
      onUnlocked()
      return
    }
    const count = failures.count + 1
    if (count >= MAX_TRIES) {
      const next = { count: 0, until: Date.now() + BLOCK_MS }
      writeFailures(next)
      setFailures(next)
      setNow(Date.now())
      setError('Sai 5 lần. Bố mẹ chờ 30 giây rồi thử lại nhé.')
      return
    }
    const next = { count, until: 0 }
    writeFailures(next)
    setFailures(next)
    setError(`Mã PIN chưa đúng. Bố mẹ còn ${MAX_TRIES - count} lần thử.`)
  }

  return (
    <form onSubmit={submit} noValidate>
      <Field label="Mã PIN" hint="4 chữ số">
        <TextInput
          type="password"
          inputMode="numeric"
          autoComplete="current-password"
          pattern="[0-9]*"
          maxLength={4}
          autoFocus
          value={pin}
          className="text-center text-xl font-bold tracking-[0.45em]"
          onChange={(event) => {
            setPinValue(event.target.value.replace(/\D/g, '').slice(0, 4))
            if (error) setError('')
          }}
        />
      </Field>

      {error && (
        <p className="mt-3 rounded-xl bg-peach px-3 py-2 text-xs font-bold text-coral-dark">
          {error}
        </p>
      )}

      <Button type="submit" fullWidth className="mt-4" disabled={busy || blocked}>
        <Icon name="lock" className="h-4 w-4" />
        {busy ? 'Đang kiểm tra…' : 'Mở khoá'}
      </Button>

      <button
        type="button"
        onClick={onForgot}
        className="focus-ring mt-3 w-full rounded-xl py-2 text-xs font-bold text-teal-dark hover:bg-mint/60"
      >
        Quên mã PIN?
      </button>
    </form>
  )
}

function ChangePinModal({ onClose }: { onClose: () => void }) {
  const { verifyPin, setPin } = useStore()
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (!/^\d{4}$/.test(current)) {
      setError('Bố mẹ nhập mã PIN hiện tại gồm 4 chữ số.')
      return
    }
    if (!/^\d{4}$/.test(next)) {
      setError('Mã PIN mới gồm 4 chữ số.')
      return
    }
    if (next !== confirm) {
      setError('Hai lần nhập mã mới chưa khớp.')
      return
    }
    setError('')
    setBusy(true)
    const ok = await verifyPin(current)
    if (!ok) {
      setBusy(false)
      setError('Mã PIN hiện tại chưa đúng.')
      return
    }
    await setPin(next)
    setBusy(false)
    onClose()
  }

  return (
    <Modal open onClose={onClose} title="Đổi mã PIN">
      <form onSubmit={submit} noValidate>
        <Field label="Mã PIN hiện tại">
          <TextInput
            type="password"
            inputMode="numeric"
            autoComplete="current-password"
            pattern="[0-9]*"
            maxLength={4}
            value={current}
            className="text-center text-xl font-bold tracking-[0.45em]"
            onChange={(event) => {
              setCurrent(event.target.value.replace(/\D/g, '').slice(0, 4))
              if (error) setError('')
            }}
          />
        </Field>
        <div className="mt-3">
          <Field label="Mã PIN mới">
            <TextInput
              type="password"
              inputMode="numeric"
              autoComplete="new-password"
              pattern="[0-9]*"
              maxLength={4}
              value={next}
              className="text-center text-xl font-bold tracking-[0.45em]"
              onChange={(event) => {
                setNext(event.target.value.replace(/\D/g, '').slice(0, 4))
                if (error) setError('')
              }}
            />
          </Field>
        </div>
        <div className="mt-3">
          <Field label="Nhập lại mã PIN mới">
            <TextInput
              type="password"
              inputMode="numeric"
              autoComplete="new-password"
              pattern="[0-9]*"
              maxLength={4}
              value={confirm}
              className="text-center text-xl font-bold tracking-[0.45em]"
              onChange={(event) => {
                setConfirm(event.target.value.replace(/\D/g, '').slice(0, 4))
                if (error) setError('')
              }}
            />
          </Field>
        </div>

        {error && (
          <p className="mt-3 rounded-xl bg-peach px-3 py-2 text-xs font-bold text-coral-dark">
            {error}
          </p>
        )}

        <Button type="submit" fullWidth className="mt-4" disabled={busy}>
          <Icon name="check" className="h-4 w-4" />
          {busy ? 'Đang lưu…' : 'Lưu mã PIN mới'}
        </Button>
      </form>
    </Modal>
  )
}

function ResetPinModal({ onClose, onReset }: { onClose: () => void; onReset: () => void }) {
  const { accountEmail, data, removePin } = useStore()
  const otp = useEmailOtp({
    initialEmail: accountEmail ?? data.parent?.email ?? '',
    initialConsent: true,
  })

  const submitEmail = async (event: FormEvent) => {
    event.preventDefault()
    await otp.send()
  }

  const submitCode = async (event: FormEvent) => {
    event.preventDefault()
    const ok = await otp.verify()
    if (!ok) return
    removePin()
    onReset()
  }

  return (
    <Modal open onClose={onClose} title="Quên mã PIN">
      <p className="text-sm font-semibold leading-relaxed text-muted">
        Để đặt lại mã PIN, bố mẹ xác thực email của tài khoản bằng mã 6 số. Sau khi xác thực, app
        sẽ mở khoá và cho tạo mã PIN mới.
      </p>

      {otp.step === 'email' ? (
        <form onSubmit={submitEmail} noValidate className="mt-3">
          <Field label="Email nhận mã" hint="6 số">
            <TextInput
              type="email"
              inputMode="email"
              autoComplete="email"
              value={otp.email}
              onChange={(event) => {
                otp.setEmail(event.target.value)
                if (otp.error) otp.setError('')
              }}
            />
          </Field>

          <TurnstileWidget
            key={otp.captchaAttempt}
            onToken={otp.setCaptchaToken}
            className="mt-3"
          />

          {otp.error && (
            <p className="mt-3 rounded-xl bg-peach px-3 py-2 text-xs font-bold text-coral-dark">
              {otp.error}
            </p>
          )}

          <Button type="submit" fullWidth className="mt-3" disabled={otp.busy}>
            <Icon name="mail" className="h-4 w-4" />
            {otp.busy ? 'Đang gửi mã…' : 'Gửi mã xác thực'}
          </Button>
        </form>
      ) : (
        <form onSubmit={submitCode} noValidate className="mt-3">
          <p className="text-xs font-semibold leading-relaxed text-muted">
            Mã 6 số đã gửi tới <span className="font-extrabold text-ink">{otp.email.trim()}</span>.
          </p>
          <div className="mt-3">
            <Field label="Mã xác thực">
              <TextInput
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                autoFocus
                value={otp.code}
                className="text-center text-xl font-bold tracking-[0.45em]"
                onChange={(event) => {
                  otp.setCode(event.target.value.replace(/\D/g, '').slice(0, 6))
                  if (otp.error) otp.setError('')
                }}
              />
            </Field>
          </div>

          {otp.error && (
            <p className="mt-3 rounded-xl bg-peach px-3 py-2 text-xs font-bold text-coral-dark">
              {otp.error}
            </p>
          )}

          <Button type="submit" fullWidth className="mt-3" disabled={otp.busy}>
            <Icon name="check" className="h-4 w-4" />
            {otp.busy ? 'Đang xác thực…' : 'Xác thực và đặt lại PIN'}
          </Button>

          <TurnstileWidget
            key={otp.captchaAttempt}
            onToken={otp.setCaptchaToken}
            className="mt-3"
          />

          <div className="mt-3 flex items-center justify-between text-xs font-bold">
            <button
              type="button"
              onClick={otp.editEmail}
              className="focus-ring rounded-lg px-1 py-1 text-muted hover:text-ink"
            >
              Đổi email
            </button>
            <button
              type="button"
              onClick={() => void otp.resend()}
              disabled={otp.resendIn > 0 || otp.busy}
              className="focus-ring rounded-lg px-1 py-1 text-teal-dark disabled:text-muted"
            >
              {otp.resendIn > 0 ? `Gửi lại sau ${otp.resendIn}s` : 'Gửi lại mã'}
            </button>
          </div>
        </form>
      )}
    </Modal>
  )
}
