import { describe, expect, it } from 'vitest'
import { AGE_BANDS } from '../content/schema'
import { buildSessionPlan } from './generator'

describe('sinh buổi tập', () => {
  it('cùng trẻ, cùng ngày, cùng cấu hình cho ra cùng kế hoạch', () => {
    const options = {
      childId: 'be-minh',
      band: '8-9' as const,
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
      band: '8-9',
      durationMin: 25,
      dateKey: '2026-11-14',
      recentSlugs: [],
    })
    const avoided = buildSessionPlan({
      childId: 'be-vui',
      band: '8-9',
      durationMin: 25,
      dateKey: '2026-11-14',
      recentSlugs: base.mainSlugs,
    })
    const overlap = avoided.mainSlugs.filter((slug) => base.mainSlugs.includes(slug)).length
    expect(overlap).toBeLessThan(base.mainSlugs.length)
  })
})
