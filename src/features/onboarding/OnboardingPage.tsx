import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../../app/store'
import { BAND_DESCRIPTION, BAND_LABEL, bandForAge, calculateAge, recommendedDuration } from '../../lib/age'
import { Badge, Button, Card, Field, Icon, PageHeader, SegmentedControl, Select, TextInput, cx } from '../../components/ui'
import { WEEKDAY_SHORT } from '../../lib/date'
import type { Sex } from '../../lib/types'

type Step = 0 | 1 | 2

export function OnboardingPage() {
  const navigate = useNavigate()
  const { data, completeOnboarding, addChild } = useStore()
  const addingChild = Boolean(data.parent && data.children.length)
  const currentYear = new Date().getFullYear()
  const [step, setStep] = useState<Step>(0)
  const [nickname, setNickname] = useState('')
  const [birthYear, setBirthYear] = useState(currentYear - 8)
  const [birthMonth, setBirthMonth] = useState<number | null>(null)
  const [sex, setSex] = useState<Sex | null>(null)
  const [heightCm, setHeightCm] = useState('125')
  const [weightKg, setWeightKg] = useState('26')
  const [weekdays, setWeekdays] = useState<number[]>([1, 3, 5])
  const [durationMin, setDurationMin] = useState<20 | 25 | 30>(20)
  const [error, setError] = useState('')

  const years = useMemo(() => {
    return Array.from({ length: 9 }, (_, index) => currentYear - 12 + index)
  }, [currentYear])

  const age = calculateAge(birthYear, birthMonth)
  const band = bandForAge(age)
  const recommended = recommendedDuration(band)

  const preset: '246' | '357' | 'custom' =
    weekdays.length === 3 && weekdays.every((day, index) => day === [1, 3, 5][index])
      ? '246'
      : weekdays.length === 3 && weekdays.every((day, index) => day === [2, 4, 6][index])
        ? '357'
        : 'custom'

  const goNext = () => {
    setError('')
    if (step === 0) {
      if (nickname.trim().length < 1) {
        setError('Bố mẹ đặt cho bé một biệt danh thật dễ thương nhé.')
        return
      }
      if (age < 4 || age > 13) {
        setError('StrongKids hiện dành cho bé 5–12 tuổi. Bố mẹ kiểm tra lại năm sinh giúp em nhé.')
        return
      }
      setStep(1)
      return
    }
    if (step === 1) {
      if (!sex) {
        setError('Bố mẹ chọn giúp bé là bé trai hay bé gái nhé.')
        return
      }
      const height = Number(heightCm)
      const weight = Number(weightKg)
      if (!Number.isFinite(height) || height < 80 || height > 200) {
        setError('Chiều cao nên nằm trong khoảng 80–200 cm.')
        return
      }
      if (!Number.isFinite(weight) || weight < 10 || weight > 100) {
        setError('Cân nặng nên nằm trong khoảng 10–100 kg.')
        return
      }
      setDurationMin(recommended)
      setStep(2)
    }
  }

  const finish = () => {
    if (!sex) {
      setError('Bố mẹ chọn giúp bé là bé trai hay bé gái nhé.')
      setStep(1)
      return
    }
    if (!weekdays.length) {
      setError('Bé cần ít nhất một ngày tập trong tuần.')
      return
    }
    const input = {
      email: data.parent?.email ?? 'phuhuynh@strongkids.vn',
      nickname: nickname.trim(),
      birthYear,
      birthMonth,
      sex,
      heightCm: Number(heightCm),
      weightKg: Number(weightKg),
      weekdays,
      durationMin,
    }
    if (addingChild) {
      addChild(input)
      navigate('/phu-huynh', { replace: true })
      return
    }
    completeOnboarding(input)
  }

  const toggleDay = (day: number) => {
    setWeekdays((current) =>
      current.includes(day)
        ? current.filter((item) => item !== day)
        : [...current, day].sort((a, b) => a - b),
    )
  }

  return (
    <div className="app-backdrop min-h-dvh">
      <div className="mx-auto flex min-h-dvh w-full max-w-[520px] flex-col px-5 pb-10 pt-5">
        <PageHeader
          title={step === 0 ? 'Bé là ai nhỉ?' : step === 1 ? 'Chỉ số của bé' : 'Lịch tập vui'}
          subtitle={`Bước ${step + 1}/3 · ${addingChild ? 'Hồ sơ mới của' : 'Hồ sơ của'} ${nickname.trim() || 'bé'}`}
          onBack={
            step === 0
              ? addingChild
                ? () => navigate('/phu-huynh')
                : undefined
              : () => setStep((step - 1) as Step)
          }
        />

        <div className="mb-5 flex gap-1.5">
          {[0, 1, 2].map((item) => (
            <span
              key={item}
              className={cx(
                'h-1.5 flex-1 rounded-full transition',
                item <= step ? 'bg-coral' : 'bg-ink/10',
              )}
            />
          ))}
        </div>

        {step === 0 && (
          <div className="animate-slide-up space-y-4">
            <Card className="p-5">
              <div className="mb-5 flex items-center gap-4">
                <div className="grid h-16 w-16 place-items-center rounded-[1.4rem] bg-sun-soft text-2xl font-black text-[#8A5C00]">
                  {(nickname.trim().slice(0, 1) || '?').toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-bold text-ink">
                    {nickname.trim() || 'Biệt danh của bé'}
                  </p>
                  <p className="mt-1 text-xs font-semibold text-muted">
                    {age} tuổi · Nhóm {BAND_LABEL[band]}
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <Field label="Biệt danh" hint="Tối đa 24 ký tự">
                  <TextInput
                    value={nickname}
                    maxLength={24}
                    autoFocus
                    placeholder="Ví dụ: Miu, Bắp, Tí Nị..."
                    onChange={(event) => setNickname(event.target.value)}
                  />
                </Field>

                <div className="grid grid-cols-2 gap-3">
                  <Field label="Năm sinh">
                    <Select
                      value={birthYear}
                      onChange={(event) => setBirthYear(Number(event.target.value))}
                    >
                      {years.map((year) => (
                        <option key={year} value={year}>
                          {year}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <Field label="Tháng sinh">
                    <Select
                      value={birthMonth ?? ''}
                      onChange={(event) =>
                        setBirthMonth(event.target.value ? Number(event.target.value) : null)
                      }
                    >
                      <option value="">Không rõ</option>
                      {Array.from({ length: 12 }, (_, index) => index + 1).map((month) => (
                        <option key={month} value={month}>
                          Tháng {month}
                        </option>
                      ))}
                    </Select>
                  </Field>
                </div>
              </div>
            </Card>

            <div className="rounded-3xl bg-mint/70 p-4">
              <div className="flex items-center gap-2 text-sm font-extrabold text-teal-dark">
                <Icon name="sparkles" className="h-4 w-4" />
                Nhóm tuổi {BAND_LABEL[band]}
              </div>
              <p className="mt-1 text-xs font-semibold leading-relaxed text-teal-dark">
                {BAND_DESCRIPTION[band]}
              </p>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="animate-slide-up space-y-4">
            <Card className="p-5">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <p className="text-sm font-bold text-ink">Giới tính sinh học</p>
                  <p className="mt-0.5 text-xs font-semibold text-muted">
                    Chỉ dùng để đọc bảng tăng trưởng WHO trong khu phụ huynh.
                  </p>
                </div>

                {[
                  { value: 'male' as const, label: 'Bé trai' },
                  { value: 'female' as const, label: 'Bé gái' },
                ].map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setSex(option.value)}
                    aria-pressed={sex === option.value}
                    className={cx(
                      'focus-ring flex h-12 items-center justify-center rounded-2xl border-2 text-sm font-bold transition',
                      sex === option.value
                        ? 'border-coral bg-peach text-coral-dark'
                        : 'border-line bg-white text-muted hover:border-coral/30',
                    )}
                  >
                    {option.label}
                  </button>
                ))}

                <Field label="Chiều cao" hint="cm">
                  <TextInput
                    type="number"
                    inputMode="decimal"
                    min={80}
                    max={200}
                    value={heightCm}
                    onChange={(event) => setHeightCm(event.target.value)}
                  />
                </Field>
                <Field label="Cân nặng" hint="kg">
                  <TextInput
                    type="number"
                    inputMode="decimal"
                    min={10}
                    max={100}
                    step="0.1"
                    value={weightKg}
                    onChange={(event) => setWeightKg(event.target.value)}
                  />
                </Field>
              </div>
            </Card>

            <div className="flex items-start gap-2.5 rounded-3xl bg-white/70 p-4 text-xs font-semibold leading-relaxed text-muted">
              <Icon name="shield" className="mt-0.5 h-4 w-4 shrink-0 text-teal-dark" />
              Chiều cao và cân nặng chỉ hiển thị trong khu phụ huynh, giúp theo dõi tăng trưởng
              của bé. App không đặt mục tiêu cân nặng và không tính calo.
            </div>

            <div className="rounded-3xl bg-sun-soft/80 p-4">
              <div className="flex items-center gap-2 text-sm font-extrabold text-[#7A5200]">
                <Icon name="info" className="h-4 w-4" />
                Gợi ý cho nhóm {BAND_LABEL[band]}
              </div>
              <p className="mt-1 text-xs font-semibold leading-relaxed text-[#7A5200]">
                Buổi tập {recommended} phút là vừa sức. Bé 5–12 tuổi cần khoảng 60 phút vận động
                mỗi ngày, có thể chia thành nhiều lần chơi trong ngày.
              </p>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="animate-slide-up space-y-4">
            <Card className="p-5">
              <p className="text-sm font-bold text-ink">Chọn lịch tập</p>
              <p className="mt-0.5 text-xs font-semibold text-muted">
                Buổi tập sẽ tự xuất hiện vào những ngày này.
              </p>
              <div className="mt-3 grid grid-cols-3 gap-2">
                {[
                  { id: '246', title: '2 · 4 · 6', days: 'Thứ 2, 4, 6' },
                  { id: '357', title: '3 · 5 · 7', days: 'Thứ 3, 5, 7' },
                  { id: 'custom', title: 'Tự chọn', days: 'Theo ý bé' },
                ].map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => {
                      if (option.id === '246') setWeekdays([1, 3, 5])
                      if (option.id === '357') setWeekdays([2, 4, 6])
                      if (option.id === 'custom') setWeekdays([])
                    }}
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
                      className={cx(
                        'focus-ring h-11 flex-1 rounded-xl text-xs font-extrabold transition',
                        active
                          ? 'bg-ink text-white'
                          : 'bg-ink/5 text-muted hover:bg-ink/10',
                      )}
                      aria-pressed={active}
                    >
                      {label}
                    </button>
                  )
                })}
              </div>

              <div className="mt-5">
                <div className="mb-1.5 flex items-center justify-between">
                  <p className="text-sm font-bold text-ink">Thời lượng mỗi buổi</p>
                  <Badge tone="teal">Gợi ý {recommended} phút</Badge>
                </div>
                <SegmentedControl
                  value={durationMin}
                  onChange={(value) => setDurationMin(value)}
                  options={[
                    { value: 20, label: '20 phút' },
                    { value: 25, label: '25 phút' },
                    { value: 30, label: '30 phút' },
                  ]}
                />
              </div>
            </Card>

            <div className="rounded-3xl bg-peach/70 p-4">
              <div className="flex items-center gap-2 text-sm font-extrabold text-coral-dark">
                <Icon name="heart" filled className="h-4 w-4" />
                Nguyên tắc vui là chính
              </div>
              <ul className="mt-1.5 space-y-1 text-xs font-semibold leading-relaxed text-coral-dark">
                <li>• Bé được nghỉ bất cứ lúc nào, không bị trừ sao.</li>
                <li>• Bố mẹ tập cùng hoặc ngồi cạnh cổ vũ.</li>
                <li>• Không so sánh với bạn khác, chỉ so với chính bé hôm qua.</li>
              </ul>
            </div>
          </div>
        )}

        {error && (
          <p className="mt-4 rounded-2xl bg-peach px-4 py-3 text-xs font-bold text-coral-dark">
            {error}
          </p>
        )}

        <div className="mt-auto pt-6">
          {step < 2 ? (
            <Button size="lg" fullWidth onClick={goNext}>
              Tiếp tục
              <Icon name="arrow" />
            </Button>
          ) : (
            <Button size="lg" fullWidth variant="teal" onClick={finish}>
              <Icon name="check" />
              {addingChild ? 'Lưu hồ sơ bé' : 'Tạo hồ sơ và bắt đầu'}
            </Button>
          )}
          <p className="mt-3 text-center text-xs font-semibold text-muted">
            Bố mẹ có thể đổi lịch tập bất cứ lúc nào trong mục Lịch.
          </p>
        </div>
      </div>
    </div>
  )
}
