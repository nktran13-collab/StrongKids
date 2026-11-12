import { useMemo, useState } from 'react'
import { useStore } from '../../app/store'
import { catalog } from '../../content/catalog'
import {
  AGE_BANDS,
  CATEGORIES,
  CATEGORY_LABEL,
  type AgeBand,
  type Category,
  type Exercise,
} from '../../content/schema'
import { bandForAge, calculateAge, BAND_LABEL } from '../../lib/age'
import { ExerciseArt } from '../../components/ExerciseArt'
import { Badge, Button, Card, Icon, Modal, PageHeader, cx } from '../../components/ui'
import { formatRecordValue } from '../home/HomePage'

type BandFilter = AgeBand | 'all'
type CategoryFilter = Category | 'all'

export function LibraryPage() {
  const { activeChild } = useStore()
  // Nhóm tuổi gợi ý phụ thuộc từng bé: đổi hồ sơ thì dựng lại bộ lọc.
  return <LibraryView key={activeChild!.id} />
}

function LibraryView() {
  const { activeChild, activeBests } = useStore()
  const child = activeChild!
  const childBand = bandForAge(calculateAge(child.birthYear, child.birthMonth))
  const [band, setBand] = useState<BandFilter>(childBand)
  const [category, setCategory] = useState<CategoryFilter>('all')
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Exercise | null>(null)

  const filtered = useMemo(() => {
    return catalog.filter((exercise) => {
      const matchesBand = band === 'all' || exercise.bands.includes(band)
      const matchesCategory = category === 'all' || exercise.category === category
      const matchesSearch =
        !search.trim() || exercise.nameVi.toLowerCase().includes(search.trim().toLowerCase())
      return matchesBand && matchesCategory && matchesSearch
    })
  }, [band, category, search])

  return (
    <div className="pb-2">
      <PageHeader
        title="Thư viện bài tập"
        subtitle={`${catalog.length} bài vận động vui cho bé`}
        right={<Badge tone="teal">Nhóm {BAND_LABEL[childBand]}</Badge>}
      />

      <div className="relative mb-3">
        <Icon name="book" className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Tìm bài tập..."
          className="focus-ring h-11 w-full rounded-2xl border-2 border-line bg-white pl-10 pr-4 text-sm font-semibold text-ink placeholder:text-muted"
        />
      </div>

      <div className="no-scrollbar -mx-5 mb-2 flex gap-2 overflow-x-auto px-5 pb-1">
        {(['all', ...AGE_BANDS] as BandFilter[]).map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => setBand(option)}
            className={cx(
              'focus-ring shrink-0 rounded-full px-3.5 py-2 text-xs font-extrabold transition',
              band === option ? 'bg-ink text-white' : 'bg-white text-muted shadow-sm hover:text-ink',
            )}
          >
            {option === 'all' ? 'Mọi độ tuổi' : BAND_LABEL[option]}
          </button>
        ))}
      </div>

      <div className="no-scrollbar -mx-5 mb-4 flex gap-2 overflow-x-auto px-5 pb-1">
        {(['all', ...CATEGORIES] as CategoryFilter[]).map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => setCategory(option)}
            className={cx(
              'focus-ring shrink-0 rounded-full px-3 py-1.5 text-xs font-bold transition',
              category === option
                ? 'bg-coral-dark text-white'
                : 'bg-white/70 text-muted hover:bg-white hover:text-ink',
            )}
          >
            {option === 'all' ? 'Tất cả nhóm' : CATEGORY_LABEL[option]}
          </button>
        ))}
      </div>

      {filtered.length ? (
        <div className="grid grid-cols-2 gap-3">
          {filtered.map((exercise) => {
            const best = activeBests[`${exercise.slug}:${exercise.metric}`]
            return (
              <button
                key={exercise.slug}
                type="button"
                onClick={() => setSelected(exercise)}
                className="focus-ring group text-left"
              >
                <Card className="h-full overflow-hidden p-3 transition group-hover:-translate-y-0.5 group-hover:shadow-lg">
                  <ExerciseArt
                    exercise={exercise}
                    className="mb-2 h-28 w-full rounded-2xl"
                    decoration={false}
                  />
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-xs font-extrabold uppercase tracking-wide text-muted">
                      {CATEGORY_LABEL[exercise.category]}
                    </span>
                    {best && (
                      <span className="flex items-center gap-0.5 text-xs font-extrabold text-[#8A5C00]">
                        <Icon name="star" filled className="h-3 w-3" />
                        {best.direction === 'lower_better' ? 'Nhanh nhất' : 'Kỷ lục'}
                      </span>
                    )}
                  </div>
                  <p className="mt-1 line-clamp-2 text-sm font-extrabold leading-snug text-ink">
                    {exercise.nameVi}
                  </p>
                  <p className="mt-1 line-clamp-1 text-xs font-semibold text-muted">
                    {exercise.shortVi}
                  </p>
                </Card>
              </button>
            )
          })}
        </div>
      ) : (
        <Card className="px-6 py-10 text-center">
          <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full bg-ink/5 text-muted">
            <Icon name="book" className="h-6 w-6" />
          </div>
          <p className="text-sm font-extrabold text-ink">Chưa tìm thấy bài phù hợp</p>
          <p className="mt-1 text-xs font-semibold text-muted">
            Thử đổi nhóm tuổi hoặc bỏ từ khoá tìm kiếm nhé.
          </p>
        </Card>
      )}

      <ExerciseDetail
        exercise={selected}
        band={childBand}
        onClose={() => setSelected(null)}
        record={selected ? activeBests[`${selected.slug}:${selected.metric}`] : undefined}
      />
    </div>
  )
}

function ExerciseDetail({
  exercise,
  band,
  onClose,
  record,
}: {
  exercise: Exercise | null
  band: AgeBand
  onClose: () => void
  record?: { value: number; metric: Exercise['metric'] } | undefined
}) {
  if (!exercise) return null
  const params = exercise.ageParams[band]

  return (
    <Modal
      open={Boolean(exercise)}
      onClose={onClose}
      title={exercise.nameVi}
      footer={
        <Button fullWidth variant="secondary" onClick={onClose}>
          Đã hiểu, đóng lại
        </Button>
      }
    >
      <ExerciseArt exercise={exercise} className="h-44 w-full rounded-3xl" />

      <div className="mt-4 flex flex-wrap gap-1.5">
        <Badge tone="coral">{CATEGORY_LABEL[exercise.category]}</Badge>
        {exercise.bands.map((band) => (
          <Badge key={band} tone="sky">
            {BAND_LABEL[band]}
          </Badge>
        ))}
        <Badge tone={exercise.intensity === 'vigorous' ? 'coral' : 'mint'}>
          {exercise.intensity === 'low'
            ? 'Nhẹ nhàng'
            : exercise.intensity === 'moderate'
              ? 'Vừa sức'
              : 'Sôi động'}
        </Badge>
        {record && (
          <Badge tone="sun">
            <Icon name="star" filled className="h-3.5 w-3.5" />
            {formatRecordValue(record.metric, record.value)}
          </Badge>
        )}
      </div>

      <section className="mt-4">
        <h3 className="text-sm font-extrabold text-ink">Bố mẹ hướng dẫn bé</h3>
        <p className="mt-1 text-sm font-medium leading-relaxed text-muted">{exercise.howToVi}</p>
      </section>

      <section className="mt-4">
        <h3 className="text-sm font-extrabold text-ink">3 điều bé nhớ nhé</h3>
        <div className="mt-2 space-y-1.5">
          {exercise.cuesVi.map((cue, index) => (
            <div key={cue} className="flex items-start gap-2.5 rounded-2xl bg-white p-2.5">
              <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-sun-soft text-xs font-black text-[#8A5C00]">
                {index + 1}
              </span>
              <p className="text-xs font-semibold leading-relaxed text-ink">{cue}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-4 flex items-start gap-2.5 rounded-2xl bg-peach/70 p-3.5">
        <Icon name="shield" className="mt-0.5 h-4 w-4 shrink-0 text-coral-dark" />
        <div>
          <h3 className="text-xs font-extrabold text-coral-dark">An toàn trước tiên</h3>
          {exercise.safetyVi.map((safety) => (
            <p key={safety} className="mt-1 text-xs font-semibold leading-relaxed text-coral-dark">
              {safety}
            </p>
          ))}
        </div>
      </section>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <div className="rounded-2xl bg-mint/70 p-3">
          <p className="text-xs font-extrabold uppercase tracking-wide text-teal-dark">
            Dễ hơn
          </p>
          <p className="mt-1 text-xs font-semibold leading-relaxed text-teal-dark">
            {exercise.easierVi}
          </p>
        </div>
        <div className="rounded-2xl bg-sun-soft/80 p-3">
          <p className="text-xs font-extrabold uppercase tracking-wide text-[#8A5C00]">
            Thử thách hơn
          </p>
          <p className="mt-1 text-xs font-semibold leading-relaxed text-[#7A5200]">
            {exercise.harderVi}
          </p>
        </div>
      </div>

      {params && (
        <p className="mt-3 text-center text-xs font-semibold text-muted">
          Gợi ý cho nhóm {BAND_LABEL[band]}: {params.target} {exercise.metric === 'reps' ? 'lần' : 'giây'} ·
          nghỉ {params.restSec} giây giữa hiệp
        </p>
      )}
    </Modal>
  )
}
