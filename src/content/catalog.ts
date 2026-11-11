import { exerciseSchema } from './schema'
import type { AgeBand, Block, Category, Exercise } from './schema'
import { exercises } from './exercises'

export const catalog: Exercise[] = exercises.map((exercise) => exerciseSchema.parse(exercise))

const bySlug = new Map(catalog.map((exercise) => [exercise.slug, exercise]))

export function getExercise(slug: string): Exercise {
  const exercise = bySlug.get(slug)
  if (!exercise) throw new Error(`Không tìm thấy bài tập: ${slug}`)
  return exercise
}

export function paramsFor(exercise: Exercise, band: AgeBand) {
  return exercise.ageParams[band]
}

export function poolFor(
  band: AgeBand,
  block: Block,
  categories?: Category[],
): Exercise[] {
  return catalog.filter(
    (exercise) =>
      exercise.block === block &&
      exercise.bands.includes(band) &&
      (!categories || categories.includes(exercise.category)),
  )
}

export function exercisesForBand(band: AgeBand): Exercise[] {
  return catalog.filter((exercise) => exercise.bands.includes(band))
}

export const CATALOG_VERSION = '2026.11.1'
