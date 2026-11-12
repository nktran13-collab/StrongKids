import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useStore, type CloudStatus } from '../../app/store'
import { calculateAge, bandForChild, BAND_LABEL } from '../../lib/age'
import { BMI_DISCLAIMER, calculateBmi, calculateExactBmi, formatBmi } from '../../lib/bmi'
import { formatViDate, todayKey } from '../../lib/date'
import { computeStreak } from '../../lib/streak'
import { useInstallPrompt } from '../../lib/useInstallPrompt'
import {
  ageInMonthsNow,
  bmiForAge,
  formatAgeMonths,
  formatPercentile,
  percentileNote,
  WHO_BMI_SOURCE,
} from '../../lib/whoBmi'
import type { Measurement } from '../../lib/types'
import {
  Badge,
  Button,
  Card,
  Field,
  Icon,
  Modal,
  PageHeader,
  TextInput,
  cx,
} from '../../components/ui'

function syncCopy(status: CloudStatus): { text: string; tone: string } {
  switch (status) {
    case 'saved':
      return {
        text: 'Đã lưu lên máy chủ. Thiết bị vẫn giữ một bản để dùng khi mất mạng.',
        tone: 'text-teal-dark',
      }
    case 'saving':
      return { text: 'Đang lưu lên máy chủ…', tone: 'text-muted' }
    case 'offline':
      return {
        text: 'Đang offline — thay đổi được giữ trên máy và sẽ tự lưu khi có mạng.',
        tone: 'text-[#8A5C00]',
      }
    case 'error':
      return {
        text: 'Chưa lưu được lên máy chủ. Dữ liệu vẫn an toàn trên máy; app sẽ thử lại.',
        tone: 'text-coral-dark',
      }
    case 'demo':
      return { text: 'Bản demo — dữ liệu không được lưu lên máy chủ.', tone: 'text-muted' }
    case 'off':
      return {
        text: 'Chưa cấu hình máy chủ — dữ liệu chỉ nằm trên thiết bị này.',
        tone: 'text-[#8A5C00]',
      }
    default:
      return {
        text: 'Đã kết nối tài khoản. Thay đổi sẽ được lưu lên máy chủ.',
        tone: 'text-muted',
      }
  }
}

export function ParentPage() {
  return <ParentDashboard />
}

function ParentDashboard() {
  const navigate = useNavigate()
  const {
    data,
    activeChild,
    activeSchedule,
    activeMeasurements,
    activeSessions,
    addMeasurement,
    exportData,
    resetAll,
    cloudStatus,
    setActiveChild,
    removeChild,
  } = useStore()
  const child = activeChild!
  const { canInstall, isStandalone, install } = useInstallPrompt()
  const today = todayKey()
  const age = calculateAge(child.birthYear, child.birthMonth)
  const band = bandForChild(child.birthYear, child.birthMonth)
  const bmi = calculateBmi(child.heightCm, child.weightKg)
  const ageMonths = ageInMonthsNow(child.birthYear, child.birthMonth)
  const exactBmi = calculateExactBmi(child.heightCm, child.weightKg)
  const bmiPercentile =
    exactBmi !== null && ageMonths !== null && child.sex
      ? bmiForAge(exactBmi, ageMonths, child.sex)
      : null
  const percentileUnavailable = !child.sex
    ? 'Bách phân vị cần giới tính sinh học; hồ sơ này chưa cung cấp nên app không ước tính.'
    : ageMonths === null
      ? 'Bách phân vị cần tháng sinh; hồ sơ này chưa cung cấp nên app không ước tính.'
      : 'Bảng WHO 2007 dùng cho bé từ 5 tuổi 1 tháng đến 19 tuổi; hồ sơ này nằm ngoài phạm vi đó.'

  const [measureOpen, setMeasureOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteError, setDeleteError] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [removeChildOpen, setRemoveChildOpen] = useState(false)

  const measurements = activeMeasurements

  const completed = activeSessions.filter((session) => session.status === 'completed')
  const totalMinutes = completed.reduce(
    (sum, session) => sum + Math.max(1, Math.round(session.activeSec / 60)),
    0,
  )
  const streak = computeStreak({
    sessions: activeSessions,
    weekdays: activeSchedule.weekdays,
    startKey: child.createdAt.slice(0, 10),
    todayKey: today,
  })

  const exportJson = () => {
    const blob = new Blob([exportData()], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `strongkids-${today}.json`
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
    URL.revokeObjectURL(url)
  }

  const sync = syncCopy(cloudStatus)

  return (
    <div className="pb-2">
      <PageHeader
        title="Khu phụ huynh"
        subtitle="Thông tin sức khoẻ và dữ liệu của các bé"
      />

      <Card className="mb-3 p-4">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-extrabold text-ink">Hồ sơ các bé</h2>
            <p className="mt-0.5 text-xs font-semibold text-muted">
              {data.children.length} hồ sơ · chọn bé đang tập
            </p>
          </div>
          <Link
            to="/them-be"
            className="focus-ring flex shrink-0 items-center gap-1 rounded-full bg-teal-dark px-3 py-2 text-xs font-extrabold text-white"
          >
            <span className="text-base leading-none">+</span>
            Thêm bé
          </Link>
        </div>

        <div className="mt-3 space-y-2">
          {data.children.map((item) => {
            const active = item.id === child.id
            return (
              <div
                key={item.id}
                className={cx(
                  'flex items-center gap-2 rounded-2xl border-2 p-2 transition',
                  active ? 'border-teal bg-mint/50' : 'border-line bg-white',
                )}
              >
                <button
                  type="button"
                  onClick={() => setActiveChild(item.id)}
                  aria-pressed={active}
                  className="focus-ring flex min-w-0 flex-1 items-center gap-2.5 rounded-xl text-left"
                >
                  <span
                    className={cx(
                      'grid h-10 w-10 shrink-0 place-items-center rounded-xl text-sm font-black',
                      active ? 'bg-teal-dark text-white' : 'bg-sun-soft text-[#8A5C00]',
                    )}
                  >
                    {item.nickname.slice(0, 1).toUpperCase()}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-extrabold text-ink">
                      {item.nickname}
                    </span>
                    <span className="block truncate text-xs font-semibold text-muted">
                      {calculateAge(item.birthYear, item.birthMonth)} tuổi · Nhóm{' '}
                      {BAND_LABEL[bandForChild(item.birthYear, item.birthMonth)]}
                    </span>
                  </span>
                </button>
                {active && <Badge tone="teal">Đang chọn</Badge>}
              </div>
            )
          })}
        </div>

        {data.children.length > 1 && (
          <button
            type="button"
            onClick={() => setRemoveChildOpen(true)}
            className="focus-ring mt-3 w-full rounded-xl py-2 text-xs font-bold text-coral-dark hover:bg-peach/60"
          >
            Xoá hồ sơ bé đang chọn
          </button>
        )}
      </Card>

      <Card className="p-5">
        <div className="flex items-center gap-3">
          <span className="grid h-14 w-14 place-items-center rounded-2xl bg-ink text-xl font-black text-white">
            {child.nickname.slice(0, 1).toUpperCase()}
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="display-title truncate text-xl text-ink">{child.nickname}</h2>
            <p className="text-xs font-semibold text-muted">
              {age} tuổi · Nhóm {BAND_LABEL[band]} ·{' '}
              {child.sex === 'male' ? 'Bé trai' : child.sex === 'female' ? 'Bé gái' : 'Chưa cung cấp giới tính'}
            </p>
          </div>
          <Badge tone="teal">Đang tập</Badge>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2">
          <div className="rounded-2xl bg-cream p-3 text-center">
            <p className="display-title text-xl text-ink">{child.heightCm}</p>
            <p className="text-xs font-extrabold uppercase tracking-wide text-muted">cm cao</p>
          </div>
          <div className="rounded-2xl bg-cream p-3 text-center">
            <p className="display-title text-xl text-ink">{child.weightKg}</p>
            <p className="text-xs font-extrabold uppercase tracking-wide text-muted">kg</p>
          </div>
          <div className="rounded-2xl bg-sun-soft p-3 text-center">
            <p className="display-title text-xl text-[#7A5200]">
              {bmi ? formatBmi(bmi.bmi) : '—'}
            </p>
            <p className="text-xs font-extrabold uppercase tracking-wide text-[#8A5C00]">BMI</p>
          </div>
        </div>

        {bmi && (
          bmiPercentile ? (
            <div className="mt-3 rounded-2xl bg-white p-3 ring-1 ring-line">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-extrabold uppercase tracking-wide text-muted">
                    Bách phân vị BMI theo tuổi
                  </p>
                  <p className="display-title mt-0.5 text-2xl text-ink">
                    {formatPercentile(bmiPercentile.percentile)}
                    <span className="ml-1 text-xs font-extrabold text-muted">/ 100</span>
                  </p>
                </div>
                <a
                  href={WHO_BMI_SOURCE.url}
                  target="_blank"
                  rel="noreferrer"
                  className="focus-ring rounded-lg px-2 py-1 text-xs font-extrabold text-teal-dark underline decoration-dotted underline-offset-2"
                >
                  WHO 2007
                </a>
              </div>
              <p className="mt-1 text-xs font-semibold leading-relaxed text-muted">
                Vị trí của bé so với 100 trẻ cùng tuổi, cùng giới. Ước tính cho{' '}
                {child.sex === 'male' ? 'bé trai' : 'bé gái'} {formatAgeMonths(bmiPercentile.ageMonths)}{' '}
                theo tháng sinh.
              </p>
              {percentileNote(bmiPercentile.percentile) && (
                <p className="mt-2 rounded-xl bg-sun-soft px-2.5 py-2 text-xs font-semibold leading-relaxed text-[#7A5200]">
                  {percentileNote(bmiPercentile.percentile)}
                </p>
              )}
            </div>
          ) : (
            <div className="mt-3 flex items-start gap-2 rounded-2xl bg-white p-3 ring-1 ring-line">
              <Icon name="info" className="mt-0.5 h-4 w-4 shrink-0 text-muted" />
              <p className="text-xs font-semibold leading-relaxed text-muted">
                {percentileUnavailable} BMI vẫn được hiển thị và lưu bình thường.
              </p>
            </div>
          )
        )}

        <div className="mt-3 flex items-start gap-2 rounded-2xl bg-white p-3 ring-1 ring-line">
          <Icon name="info" className="mt-0.5 h-4 w-4 shrink-0 text-muted" />
          <p className="text-xs font-semibold leading-relaxed text-muted">{BMI_DISCLAIMER}</p>
        </div>

        <Button className="mt-3" variant="secondary" fullWidth onClick={() => setMeasureOpen(true)}>
          <Icon name="ruler" className="h-4 w-4" />
          Ghi đo mới
        </Button>
      </Card>

      <Card className="mt-3 p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-extrabold text-ink">Tăng trưởng của bé</h2>
          <span className="text-xs font-semibold text-muted">{measurements.length} lần đo</span>
        </div>

        {measurements.length >= 2 ? (
          <GrowthChart points={measurements} />
        ) : (
          <div className="rounded-2xl bg-cream p-3 text-xs font-semibold leading-relaxed text-muted">
            Cần ít nhất 2 lần đo để vẽ đường xu hướng. Hãy ghi chiều cao, cân nặng mỗi 1–2 tháng để
            theo dõi cùng bác sĩ nhi.
          </div>
        )}

        <div className="mt-3 space-y-1.5">
          {[...measurements].reverse().slice(0, 5).map((item) => {
            const itemBmi = calculateBmi(item.heightCm, item.weightKg)
            return (
              <div
                key={item.id}
                className="flex items-center gap-2 rounded-2xl bg-cream px-3 py-2 text-xs font-bold text-muted"
              >
                <span className="w-16 shrink-0">{formatViDate(item.dateKey, false)}</span>
                <span className="flex-1">{item.heightCm} cm</span>
                <span className="flex-1">{item.weightKg} kg</span>
                <span className="w-16 text-right text-ink">
                  BMI {itemBmi ? formatBmi(itemBmi.bmi) : '—'}
                </span>
              </div>
            )
          })}
        </div>
      </Card>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <StatCard label="Buổi hoàn thành" value={`${completed.length}`} icon="check" tone="bg-mint text-teal-dark" />
        <StatCard label="Phút vận động" value={`${totalMinutes}`} icon="clock" tone="bg-peach text-coral-dark" />
        <StatCard label="Chuỗi hiện tại" value={`${streak.current} ngày`} icon="flame" tone="bg-sun-soft text-[#8A5C00]" />
        <StatCard label="Chuỗi dài nhất" value={`${streak.longest} ngày`} icon="star" tone="bg-[#ECE8FF] text-[#6350C4]" />
      </div>

      <div className="mt-3 rounded-3xl bg-mint/70 p-4">
        <div className="flex items-center gap-2 text-sm font-extrabold text-teal-dark">
          <Icon name="heart" className="h-4 w-4" />
          Khuyến nghị vận động
        </div>
        <p className="mt-1 text-xs font-semibold leading-relaxed text-teal-dark">
          WHO khuyến nghị trẻ 5–17 tuổi vận động aerobic trung bình–mạnh khoảng 60 phút mỗi ngày,
          kèm hoạt động mạnh và tăng cường cơ/xương ít nhất 3 ngày mỗi tuần. Buổi tập StrongKids
          (20–30 phút) là một phần trong tổng vận động đó — không thay thế vui chơi và vận động
          hằng ngày của bé.
        </p>
        <p className="mt-2 text-xs font-semibold leading-relaxed text-teal-dark">
          Trẻ đang lớn không cần ăn kiêng để “giảm cân”. Ưu tiên đủ chất, ngủ đủ và vận động vui vẻ.
          Nếu bạn lo lắng về tăng trưởng của bé, hãy trao đổi với bác sĩ nhi.
        </p>
      </div>

      <Card className="mt-3 p-4">
        <div className="flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-full bg-mint text-teal-dark">
            <Icon name="download" className="h-4 w-4" />
          </span>
          <h2 className="text-sm font-extrabold text-ink">Cài StrongKids lên điện thoại</h2>
        </div>
        {isStandalone ? (
          <p className="mt-2 text-xs font-semibold leading-relaxed text-muted">
            StrongKids đang chạy toàn màn hình trên thiết bị này. Bé vẫn xem bài và tập được khi
            không có mạng; kết quả được lưu trên máy và đồng bộ khi có kết nối.
          </p>
        ) : canInstall ? (
          <>
            <p className="mt-2 text-xs font-semibold leading-relaxed text-muted">
              Mở nhanh hơn, chạy toàn màn hình và dùng được khi không có mạng. Dữ liệu được đồng
              bộ lên máy chủ khi có kết nối.
            </p>
            <Button
              className="mt-3"
              fullWidth
              variant="teal"
              onClick={() => {
                void install()
              }}
            >
              <Icon name="download" className="h-4 w-4" />
              Cài lên màn hình chính
            </Button>
          </>
        ) : (
          <p className="mt-2 text-xs font-semibold leading-relaxed text-muted">
            Trên iPhone: mở bằng Safari → nút Chia sẻ → “Thêm vào Màn hình chính”. Trên Android:
            mở menu ⋮ → “Cài đặt ứng dụng” hoặc “Thêm vào Màn hình chính”.
          </p>
        )}
      </Card>

      <Card className="mt-3 p-4">
        <h2 className="text-sm font-extrabold text-ink">Dữ liệu & quyền riêng tư</h2>
        <div className="mt-2 space-y-1.5 text-xs font-semibold leading-relaxed text-muted">
          <p>
            Tài khoản phụ huynh: <span className="font-extrabold text-ink">{data.parent?.email}</span>
          </p>
          <p>
            Đồng ý xử lý dữ liệu trẻ:{' '}
            <span className="font-extrabold text-ink">
              {data.parent?.consentedAt ? formatViDate(data.parent.consentedAt.slice(0, 10), false) : '—'}
            </span>
          </p>
          <p>
            Dữ liệu được lưu trên máy chủ StrongKids (Supabase) và một bản trên thiết bị để dùng
            khi mất mạng. Không có quảng cáo và không gửi dữ liệu trẻ cho bên thứ ba.
          </p>
          <p>
            Tài khoản đang gắn với trình duyệt này (chưa dùng mật khẩu hay mã PIN). Xoá dữ liệu
            trình duyệt sẽ làm mất liên kết tới hồ sơ trên máy chủ — hãy xuất dữ liệu trước.
          </p>
          <p className={cx('flex items-start gap-2', sync.tone)}>
            <Icon name="cloud" className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>{sync.text}</span>
          </p>
        </div>
        <div className="mt-3 grid gap-2">
          <Button variant="secondary" onClick={exportJson}>
            <Icon name="download" className="h-4 w-4" />
            Xuất dữ liệu (JSON)
          </Button>
          <Button
            variant="ghost"
            className="text-coral-dark"
            onClick={() => setDeleteOpen(true)}
          >
            <Icon name="trash" className="h-4 w-4" />
            Xoá toàn bộ dữ liệu
          </Button>
        </div>
      </Card>

      <p className="mt-3 px-2 text-center text-xs font-semibold leading-relaxed text-muted">
        StrongKids là công cụ hỗ trợ vận động, không phải thiết bị y tế và không đưa ra chẩn đoán.
        Nội dung bài tập cần được bác sĩ nhi hoặc chuyên gia vận động cho trẻ xem xét trước khi
        dùng đại trà.
      </p>

      <Modal
        open={removeChildOpen}
        onClose={() => setRemoveChildOpen(false)}
        title={`Xoá hồ sơ ${child.nickname}?`}
        footer={
          <div className="grid grid-cols-2 gap-2">
            <Button variant="secondary" onClick={() => setRemoveChildOpen(false)}>
              Giữ lại
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                removeChild(child.id)
                setRemoveChildOpen(false)
              }}
            >
              Xoá hồ sơ
            </Button>
          </div>
        }
      >
        <p className="text-sm font-semibold leading-relaxed text-muted">
          Lịch tập, số đo, buổi tập và kỷ lục của {child.nickname} sẽ bị xoá trên thiết bị này và
          máy chủ. Hồ sơ của các bé khác vẫn được giữ nguyên.
        </p>
      </Modal>

      <MeasurementModal
        open={measureOpen}
        onClose={() => setMeasureOpen(false)}
        defaultHeight={child.heightCm}
        defaultWeight={child.weightKg}
        onSave={(height, weight, dateKey) => {
          addMeasurement(height, weight, dateKey)
          setMeasureOpen(false)
        }}
      />

      <Modal
        open={deleteOpen}
        onClose={() => {
          if (deleting) return
          setDeleteOpen(false)
          setDeleteError('')
        }}
        title="Xoá toàn bộ dữ liệu?"
        footer={
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="secondary"
              disabled={deleting}
              onClick={() => {
                setDeleteOpen(false)
                setDeleteError('')
              }}
            >
              Giữ lại
            </Button>
            <Button
              variant="primary"
              disabled={deleting}
              onClick={() => {
                setDeleting(true)
                setDeleteError('')
                void resetAll().then((result) => {
                  setDeleting(false)
                  if (!result.ok) {
                    setDeleteError(result.message)
                    return
                  }
                  setDeleteOpen(false)
                  navigate('/bat-dau', { replace: true })
                })
              }}
            >
              {deleting ? 'Đang xoá…' : 'Xoá hết'}
            </Button>
          </div>
        }
      >
        <p className="text-sm font-semibold leading-relaxed text-muted">
          Toàn bộ hồ sơ các bé, lịch sử buổi tập và kỷ lục trên thiết bị và máy chủ sẽ bị xoá vĩnh
          viễn. Bạn nên xuất dữ liệu trước nếu muốn lưu lại.
        </p>
        {deleteError && (
          <p className="mt-3 rounded-xl bg-peach px-3 py-2 text-xs font-bold text-coral-dark">
            {deleteError}
          </p>
        )}
      </Modal>
    </div>
  )
}

function StatCard({
  label,
  value,
  icon,
  tone,
}: {
  label: string
  value: string
  icon: 'check' | 'clock' | 'flame' | 'star'
  tone: string
}) {
  return (
    <div className={cx('rounded-2xl p-3', tone)}>
      <div className="flex items-center justify-between">
        <span className="display-title text-xl leading-none">{value}</span>
        <Icon name={icon} className="h-4 w-4 opacity-70" />
      </div>
      <p className="mt-1 text-xs font-extrabold uppercase tracking-wide opacity-80">{label}</p>
    </div>
  )
}

function GrowthChart({ points }: { points: Measurement[] }) {
  const recent = points.slice(-6)
  const width = 300
  const height = 132
  const padX = 26
  const padY = 22
  const weights = recent.map((point) => point.weightKg)
  const min = Math.min(...weights) - 0.6
  const max = Math.max(...weights) + 0.6
  const span = Math.max(0.8, max - min)
  const stepX = recent.length > 1 ? (width - padX * 2) / (recent.length - 1) : 0
  const coords = recent.map((point, index) => {
    const x = padX + stepX * index
    const y = height - padY - ((point.weightKg - min) / span) * (height - padY * 2)
    return { x, y, point }
  })
  const line = coords.map((coord) => `${coord.x.toFixed(1)},${coord.y.toFixed(1)}`).join(' ')

  return (
    <div>
      <div className="rounded-2xl bg-cream p-2">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full" role="img" aria-label="Biểu đồ cân nặng của bé theo các lần đo">
          {[0.25, 0.5, 0.75].map((ratio) => (
            <line
              key={ratio}
              x1={padX}
              x2={width - padX}
              y1={padY + (height - padY * 2) * ratio}
              y2={padY + (height - padY * 2) * ratio}
              stroke="rgba(36,59,83,0.08)"
              strokeWidth="1"
            />
          ))}
          <polyline
            points={line}
            fill="none"
            stroke="#2FB8A6"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {coords.map((coord) => (
            <g key={coord.point.id}>
              <circle cx={coord.x} cy={coord.y} r="4.5" fill="#2FB8A6" stroke="#FFFFFF" strokeWidth="2" />
              <text
                x={coord.x}
                y={coord.y - 9}
                textAnchor="middle"
                fontSize="8"
                fontWeight="700"
                fill="#1F8F81"
              >
                {coord.point.weightKg}
              </text>
            </g>
          ))}
        </svg>
      </div>
      <div className="mt-1 flex justify-between px-1 text-xs font-bold text-muted">
        <span>{formatViDate(recent[0].dateKey, false)}</span>
        <span>Cân nặng (kg)</span>
        <span>{formatViDate(recent[recent.length - 1].dateKey, false)}</span>
      </div>
    </div>
  )
}

function MeasurementModal({
  open,
  onClose,
  defaultHeight,
  defaultWeight,
  onSave,
}: {
  open: boolean
  onClose: () => void
  defaultHeight: number
  defaultWeight: number
  onSave: (heightCm: number, weightKg: number, dateKey: string) => void
}) {
  const [height, setHeight] = useState(String(defaultHeight))
  const [weight, setWeight] = useState(String(defaultWeight))
  const [date, setDate] = useState(todayKey())
  const [error, setError] = useState('')

  const submit = () => {
    const heightCm = Number(height)
    const weightKg = Number(weight)
    if (!Number.isFinite(heightCm) || heightCm < 80 || heightCm > 200) {
      setError('Chiều cao cần trong khoảng 80–200 cm.')
      return
    }
    if (!Number.isFinite(weightKg) || weightKg < 10 || weightKg > 100) {
      setError('Cân nặng cần trong khoảng 10–100 kg.')
      return
    }
    if (!date) {
      setError('Chọn ngày đo.')
      return
    }
    setError('')
    onSave(Math.round(heightCm * 10) / 10, Math.round(weightKg * 10) / 10, date)
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Ghi chiều cao & cân nặng"
      footer={
        <Button fullWidth onClick={submit}>
          <Icon name="check" className="h-4 w-4" />
          Lưu lần đo
        </Button>
      }
    >
      <p className="text-xs font-semibold leading-relaxed text-muted">
        Đo vào buổi sáng, mặc quần áo nhẹ và đứng thẳng để con số ổn định hơn. Chỉ bố mẹ thấy dữ
        liệu này.
      </p>
      <div className="mt-4 space-y-3">
        <Field label="Ngày đo">
          <TextInput
            type="date"
            value={date}
            max={todayKey()}
            onChange={(event) => setDate(event.target.value)}
          />
        </Field>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Chiều cao (cm)">
            <TextInput
              inputMode="decimal"
              value={height}
              onChange={(event) => setHeight(event.target.value)}
            />
          </Field>
          <Field label="Cân nặng (kg)">
            <TextInput
              inputMode="decimal"
              value={weight}
              onChange={(event) => setWeight(event.target.value)}
            />
          </Field>
        </div>
        {error && <p className="text-xs font-bold text-coral-dark">{error}</p>}
      </div>
    </Modal>
  )
}
