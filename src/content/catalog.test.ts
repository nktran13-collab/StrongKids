import { describe, expect, it } from 'vitest'
import { catalog, poolFor } from '../content/catalog'
import { AGE_BANDS, CATEGORIES } from '../content/schema'

describe('thư viện bài tập', () => {
  it('có đúng 36 bài với slug duy nhất', () => {
    expect(catalog).toHaveLength(36)
    expect(new Set(catalog.map((exercise) => exercise.slug)).size).toBe(36)
  })

  it('mỗi nhóm cơ thể có đúng 6 bài', () => {
    for (const category of CATEGORIES) {
      const count = catalog.filter((exercise) => exercise.category === category).length
      expect(count, category).toBe(6)
    }
  })

  it('mỗi nhóm tuổi đủ bài cho khởi động, mạch chính và thư giãn', () => {
    for (const band of AGE_BANDS) {
      expect(poolFor(band, 'warmup').length, `${band} warmup`).toBeGreaterThanOrEqual(3)
      expect(poolFor(band, 'cooldown').length, `${band} cooldown`).toBeGreaterThanOrEqual(3)
      expect(poolFor(band, 'main').length, `${band} main`).toBeGreaterThanOrEqual(6)
    }
  })

  it('mỗi bài có đủ hướng dẫn, 3 cue và ghi chú an toàn', () => {
    for (const exercise of catalog) {
      expect(exercise.howToVi.length).toBeGreaterThanOrEqual(40)
      expect(exercise.cuesVi).toHaveLength(3)
      expect(exercise.safetyVi.length).toBeGreaterThanOrEqual(1)
      expect(exercise.easierVi.length).toBeGreaterThan(4)
      expect(exercise.harderVi.length).toBeGreaterThan(4)
    }
  })

  it('ageParams chỉ khai báo cho nhóm tuổi bài tập hỗ trợ', () => {
    for (const exercise of catalog) {
      for (const band of AGE_BANDS) {
        if (exercise.bands.includes(band)) {
          expect(exercise.ageParams[band], `${exercise.slug} ${band}`).toBeDefined()
        } else {
          expect(exercise.ageParams[band], `${exercise.slug} ${band}`).toBeUndefined()
        }
      }
    }
  })

  it('copy dành cho bé không dùng ngôn từ giảm cân', () => {
    const banned = ['béo', 'giảm cân', 'calo', 'mỡ', 'thâm hụt', 'cân nặng mục tiêu']
    for (const exercise of catalog) {
      const childCopy = [exercise.nameVi, exercise.shortVi, ...exercise.cuesVi]
        .join(' ')
        .toLowerCase()
      for (const word of banned) {
        expect(childCopy, `${exercise.slug} chứa "${word}"`).not.toContain(word)
      }
    }
  })
})
