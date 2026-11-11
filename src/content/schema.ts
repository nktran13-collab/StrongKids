import { z } from 'zod'

export const AGE_BANDS = ['5-7', '8-9', '10-12'] as const
export const CATEGORIES = [
  'cardio',
  'strength',
  'balance',
  'flexibility',
  'coordination',
  'game',
] as const
export const BLOCKS = ['warmup', 'main', 'cooldown'] as const
export const METRICS = ['reps', 'hold_seconds', 'time_seconds'] as const
export const POSES = [
  'jump',
  'run',
  'squat',
  'push',
  'balance',
  'stretch',
  'crouch',
  'crab',
  'superman',
  'sit',
  'dance',
  'throw',
] as const

export type AgeBand = (typeof AGE_BANDS)[number]
export type Category = (typeof CATEGORIES)[number]
export type Block = (typeof BLOCKS)[number]
export type Metric = (typeof METRICS)[number]
export type Pose = (typeof POSES)[number]

export const ageParamSchema = z.object({
  target: z.number().positive(),
  workSec: z.number().positive(),
  restSec: z.number().min(0),
})

export const exerciseSchema = z.object({
  slug: z.string().regex(/^[a-z0-9-]+$/),
  nameVi: z.string().min(2),
  shortVi: z.string().min(2),
  category: z.enum(CATEGORIES),
  block: z.enum(BLOCKS),
  bands: z.array(z.enum(AGE_BANDS)).min(1),
  metric: z.enum(METRICS),
  direction: z.enum(['higher_better', 'lower_better']),
  intensity: z.enum(['low', 'moderate', 'vigorous']),
  equipment: z.array(z.enum(['none', 'ball', 'towel', 'paper'])),
  howToVi: z.string().min(40),
  cuesVi: z.array(z.string()).length(3),
  safetyVi: z.array(z.string()).min(1),
  easierVi: z.string().min(5),
  harderVi: z.string().min(5),
  art: z.object({
    pose: z.enum(POSES),
    prop: z.enum(['none', 'rope', 'ball', 'towel', 'paper', 'cone']).default('none'),
  }),
  ageParams: z.object({
    '5-7': ageParamSchema.optional(),
    '8-9': ageParamSchema.optional(),
    '10-12': ageParamSchema.optional(),
  }),
})

export type Exercise = z.infer<typeof exerciseSchema>
export type AgeParams = z.infer<typeof ageParamSchema>

export const CATEGORY_LABEL: Record<Category, string> = {
  cardio: 'Tim khoẻ',
  strength: 'Sức mạnh',
  balance: 'Thăng bằng',
  flexibility: 'Dẻo dai',
  coordination: 'Phối hợp',
  game: 'Trò chơi',
}

export const CATEGORY_COLOR: Record<Category, string> = {
  cardio: 'coral',
  strength: 'teal',
  balance: 'sky',
  flexibility: 'grape',
  coordination: 'sun',
  game: 'coral',
}
