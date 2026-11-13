import type { FormEvent } from 'react'
import { useStore } from '../../app/store'
import { getExercise } from '../../content/catalog'
import { ExerciseArt } from '../../components/ExerciseArt'
import { Badge, Button, Card, Icon, TextInput } from '../../components/ui'
import { Logo } from '../../components/AppShell'
import { TurnstileWidget } from '../../components/TurnstileWidget'
import { cloudEnabled } from '../../lib/supabase'
import { useEmailOtp } from './useEmailOtp'

const heroExercise = getExercise('nhay-day-tuong-tuong')

export function AuthPage() {
  const { startDemo } = useStore()
  const otp = useEmailOtp()

  const submitEmail = async (event: FormEvent) => {
    event.preventDefault()
    await otp.send()
  }

  const submitCode = async (event: FormEvent) => {
    event.preventDefault()
    await otp.verify()
  }

  return (
    <div className="app-backdrop min-h-dvh">
      <div className="mx-auto flex min-h-dvh w-full max-w-[520px] flex-col px-5 pb-8 pt-6">
        <div className="flex items-center gap-3">
          <Logo size={46} />
          <div>
            <div className="display-title text-xl leading-none text-ink">StrongKids</div>
            <div className="mt-1 text-xs font-bold uppercase tracking-[0.2em] text-muted">
              Vận động vui khoẻ
            </div>
          </div>
        </div>

        <section className="mt-8 animate-pop">
          <Badge tone="sun" className="mb-3">
            <Icon name="sparkles" className="h-3.5 w-3.5" />
            Dành cho bé 5–12 tuổi
          </Badge>
          <h1 className="display-title text-[34px] leading-[1.08] text-ink">
            Vận động vui,
            <br />
            <span className="text-coral-dark">lớn lên khoẻ.</span>
          </h1>
          <p className="mt-3 max-w-[420px] text-[15px] font-medium leading-relaxed text-muted">
            Những buổi tập ngắn 20–30 phút, đầy trò chơi và tiếng cười. Bố mẹ đồng hành, bé tự
            tin chinh phục từng kỷ lục nhỏ.
          </p>
        </section>

        <div className="relative mt-6">
          <ExerciseArt
            exercise={heroExercise}
            priority
            className="h-56 w-full rounded-[2rem] shadow-[0_20px_60px_-30px_rgba(36,59,83,0.5)]"
          />
          <div className="animate-float absolute -left-2 top-4 rounded-2xl bg-white px-3 py-2 shadow-lg">
            <div className="flex items-center gap-2 text-xs font-extrabold text-ink">
              <span className="grid h-7 w-7 place-items-center rounded-full bg-mint text-teal-dark">
                <Icon name="clock" className="h-4 w-4" />
              </span>
              20–30 phút
            </div>
          </div>
          <div className="absolute -bottom-3 right-3 rounded-2xl bg-white px-3 py-2 shadow-lg">
            <div className="flex items-center gap-2 text-xs font-extrabold text-ink">
              <span className="grid h-7 w-7 place-items-center rounded-full bg-peach text-coral-dark">
                <Icon name="flame" filled className="h-4 w-4" />
              </span>
              Chuỗi ngày vui
            </div>
          </div>
        </div>

        <Card className="mt-6 p-5">
          {!cloudEnabled && (
            <p className="mb-4 rounded-2xl bg-sun-soft px-3 py-2 text-xs font-bold leading-relaxed text-[#8A5C00]">
              Máy chủ dữ liệu chưa được cấu hình. Bố mẹ có thể xem bản demo; để lưu hồ sơ lên
              database, cần thêm VITE_SUPABASE_URL và VITE_SUPABASE_ANON_KEY.
            </p>
          )}

          {otp.step === 'email' ? (
            <form onSubmit={submitEmail} noValidate>
              <label className="mb-1.5 block text-sm font-bold text-ink" htmlFor="email">
                Email của bố mẹ
              </label>
              <TextInput
                id="email"
                type="email"
                inputMode="email"
                autoComplete="email"
                placeholder="vidu@email.com"
                value={otp.email}
                invalid={Boolean(otp.error) && otp.error.includes('email')}
                onChange={(event) => {
                  otp.setEmail(event.target.value)
                  if (otp.error) otp.setError('')
                }}
              />
              <p className="mt-1.5 text-xs font-semibold text-muted">
                StrongKids gửi mã 6 số để xác thực email. Không gửi quảng cáo.
              </p>

              <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-2xl bg-cream/70 p-3">
                <input
                  type="checkbox"
                  checked={otp.consent}
                  onChange={(event) => otp.setConsent(event.target.checked)}
                  className="mt-0.5 h-5 w-5 shrink-0 accent-[#FF7A59]"
                />
                <span className="text-xs font-semibold leading-relaxed text-muted">
                  Tôi là cha mẹ hoặc người giám hộ của bé, đồng ý tạo hồ sơ và lưu dữ liệu vận động
                  trên máy chủ StrongKids. Chỉ lưu biệt danh, năm/tháng sinh, chiều cao, cân nặng —
                  không ảnh, không họ tên, không địa chỉ.
                </span>
              </label>

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

              <Button
                type="submit"
                size="lg"
                fullWidth
                className="mt-4"
                disabled={otp.busy || !cloudEnabled}
              >
                <Icon name="mail" className="h-4 w-4" />
                {otp.busy ? 'Đang gửi mã…' : 'Gửi mã xác thực'}
              </Button>

              <p className="mt-2 text-center text-xs font-semibold leading-relaxed text-muted">
                Mỗi lần đăng nhập, bố mẹ nhận mã 6 số qua email — không cần nhớ mật khẩu. Hồ sơ
                theo tài khoản email nên dùng được trên nhiều thiết bị.
              </p>
            </form>
          ) : (
            <form onSubmit={submitCode} noValidate>
              <h2 className="text-sm font-bold text-ink">Nhập mã xác thực</h2>
              <p className="mt-0.5 text-xs font-semibold leading-relaxed text-muted">
                Mã 6 số đã gửi tới{' '}
                <span className="font-extrabold text-ink">{otp.email.trim()}</span>. Mã hết hạn
                sau 10 phút.
              </p>

              <label className="mt-4 block" htmlFor="otp">
                <span className="mb-1.5 block text-sm font-bold text-ink">Mã xác thực</span>
                <TextInput
                  id="otp"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  pattern="[0-9]*"
                  maxLength={6}
                  autoFocus
                  value={otp.code}
                  className="text-center text-xl font-bold tracking-[0.45em]"
                  onChange={(event) => {
                    otp.setCode(event.target.value.replace(/\D/g, '').slice(0, 6))
                    if (otp.error) otp.setError('')
                  }}
                />
              </label>

              {otp.error && (
                <p className="mt-3 rounded-xl bg-peach px-3 py-2 text-xs font-bold text-coral-dark">
                  {otp.error}
                </p>
              )}

              <Button
                type="submit"
                size="lg"
                fullWidth
                variant="teal"
                className="mt-4"
                disabled={otp.busy || !cloudEnabled}
              >
                <Icon name="check" className="h-4 w-4" />
                {otp.busy ? 'Đang xác thực…' : 'Xác thực và tiếp tục'}
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

          {otp.step === 'email' && (
            <button
              type="button"
              onClick={startDemo}
              className="focus-ring mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl py-2 text-sm font-bold text-teal-dark hover:bg-mint/60"
            >
              <Icon name="play" className="h-4 w-4" filled />
              Xem bản demo với bé Miu
            </button>
          )}
        </Card>

        <div className="mt-5 flex items-start gap-2 px-2 text-xs font-semibold leading-relaxed text-muted">
          <Icon name="shield" className="mt-0.5 h-4 w-4 shrink-0 text-teal-dark" />
          Hồ sơ được lưu trên máy chủ Supabase theo tài khoản email của bố mẹ và một bản trên
          thiết bị để dùng khi mất mạng. Không quảng cáo, không dùng analytics bên thứ ba.
          StrongKids khuyến khích vận động vui khoẻ, không dùng calo hay cân nặng mục tiêu.
        </div>
      </div>
    </div>
  )
}
