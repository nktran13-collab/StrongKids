import { describe, expect, it } from 'vitest'
import { AGE_BANDS } from '../content/schema'
import { buildSessionPlan } from './generator'

const AGE_FOR_BAND = { '4-6': 5, '7-9': 8, '10-12': 11 } as const

describe('sinh buổi tập', () => {
  it('cùng trẻ, cùng ngày, cùng cấu hình cho ra cùng kế hoạch', () => {
    const options = {
      childId: 'be-minh',
      band: '7-9' as const,
      durationMin: 25,
      dateKey: '2026-11-11',
      recentSlugs: [],
    }
    const first = buildSessionPlan(options)
    const second = buildSessionPlan(options)
    expect(second.steps).toEqual(first.steps)
    expect(second.mainSlugs).toEqual(first.mainSlugs)
    expect(second.title).toBe(first.title)
  })

  it('bắt đầu bằng khởi động và kết thúc bằng thư giãn', () => {
    const plan = buildSessionPlan({
      childId: 'be-lan',
      band: '10-12',
      durationMin: 30,
      dateKey: '2026-11-13',
    })
    expect(plan.steps[0].block).toBe('warmup')
    expect(plan.steps[plan.steps.length - 1].block).toBe('cooldown')
    expect(plan.steps.some((step) => step.kind === 'work' && step.block === 'main')).toBe(true)
  })

  it('không lặp bài chính trong cùng một buổi', () => {
    for (const band of AGE_BANDS) {
      const plan = buildSessionPlan({
        childId: 'be-an',
        band,
        age: AGE_FOR_BAND[band],
        durationMin: 25,
        dateKey: '2026-11-10',
      })
      expect(new Set(plan.mainSlugs).size).toBe(plan.mainSlugs.length)
      expect(plan.mainSlugs.length).toBeGreaterThanOrEqual(4)
      expect(plan.mainSlugs.length).toBeLessThanOrEqual(6)
    }
  })

  it('lịch chạy gần với thời lượng phụ huynh chọn', () => {
    let worst = 0
    for (const band of AGE_BANDS) {
      for (const durationMin of [20, 25, 30]) {
        for (const dateKey of ['2026-11-09', '2026-11-10', '2026-11-11', '2026-11-13', '2026-11-15']) {
          const plan = buildSessionPlan({
            childId: `be-${band}-${durationMin}`,
            band,
            age: AGE_FOR_BAND[band],
            durationMin,
            dateKey,
          })
          const deviation = Math.abs(plan.estimatedSec - durationMin * 60) / (durationMin * 60)
          worst = Math.max(worst, deviation)
        }
      }
    }
    expect(worst).toBeLessThanOrEqual(0.1)
  })

  it('ưu tiên tránh các bài vừa tập gần đây', () => {
    const base = buildSessionPlan({
      childId: 'be-vui',
      band: '7-9',
      durationMin: 25,
      dateKey: '2026-11-14',
      recentSlugs: [],
    })
    const avoided = buildSessionPlan({
      childId: 'be-vui',
      band: '7-9',
      durationMin: 25,
      dateKey: '2026-11-14',
      recentSlugs: base.mainSlugs,
    })
    const overlap = avoided.mainSlugs.filter((slug) => base.mainSlugs.includes(slug)).length
    expect(overlap).toBeLessThan(base.mainSlugs.length)
  })

  it('nhóm 4–6 tập 15/20/30 giây mỗi bài theo đúng tuổi', () => {
    for (const [age, seconds] of [
      [4, 15],
      [5, 20],
      [6, 30],
    ] as const) {
      const plan = buildSessionPlan({
        childId: `be-${age}-tuoi`,
        band: '4-6',
        age,
        durationMin: 20,
        dateKey: '2026-11-10',
      })
      const workSteps = plan.steps.filter((step) => step.kind === 'work')
      expect(workSteps.length).toBeGreaterThan(0)
      for (const step of workSteps) {
        expect(step.durationSec, `${age} tuổi`).toBe(seconds)
      }
    }
  })

  it('nhóm 7–9 và 10–12 giữ nguyên thời lượng khi biết tuổi chính xác', () => {
    for (const band of ['7-9', '10-12'] as const) {
      const base = buildSessionPlan({
        childId: 'be-on-dinh',
        band,
        durationMin: 25,
        dateKey: '2026-11-11',
      })
      const withAge = buildSessionPlan({
        childId: 'be-on-dinh',
        band,
        age: AGE_FOR_BAND[band],
        durationMin: 25,
        dateKey: '2026-11-11',
      })
      expect(withAge.steps).toEqual(base.steps)
    }
  })
})
