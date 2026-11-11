import { useState } from 'react'
import type { Category, Exercise, Pose } from '../content/schema'

interface Geometry {
  head: [number, number]
  neck: [number, number]
  hip: [number, number]
  armL: [number, number, number, number]
  armR: [number, number, number, number]
  legL: [number, number, number, number]
  legR: [number, number, number, number]
}

const POSES: Record<Pose, Geometry> = {
  jump: {
    head: [120, 62],
    neck: [120, 88],
    hip: [120, 132],
    armL: [106, 92, 78, 58],
    armR: [134, 92, 162, 58],
    legL: [114, 134, 96, 168],
    legR: [126, 134, 144, 168],
  },
  run: {
    head: [122, 62],
    neck: [120, 88],
    hip: [116, 130],
    armL: [106, 94, 82, 74],
    armR: [132, 94, 156, 112],
    legL: [112, 132, 96, 164],
    legR: [124, 132, 152, 154],
  },
  squat: {
    head: [120, 74],
    neck: [120, 100],
    hip: [120, 142],
    armL: [106, 104, 78, 100],
    armR: [134, 104, 162, 100],
    legL: [112, 144, 94, 172],
    legR: [128, 144, 146, 172],
  },
  push: {
    head: [126, 66],
    neck: [124, 94],
    hip: [104, 138],
    armL: [118, 98, 172, 76],
    armR: [124, 106, 174, 106],
    legL: [104, 140, 78, 168],
    legR: [108, 142, 94, 174],
  },
  balance: {
    head: [120, 62],
    neck: [120, 88],
    hip: [120, 132],
    armL: [106, 94, 72, 90],
    armR: [134, 94, 168, 90],
    legL: [116, 134, 128, 172],
    legR: [124, 134, 158, 140],
  },
  stretch: {
    head: [120, 64],
    neck: [120, 90],
    hip: [120, 134],
    armL: [108, 94, 98, 44],
    armR: [132, 94, 142, 44],
    legL: [114, 136, 110, 172],
    legR: [126, 136, 130, 172],
  },
  crouch: {
    head: [84, 104],
    neck: [102, 108],
    hip: [150, 116],
    armL: [106, 106, 84, 154],
    armR: [124, 110, 106, 158],
    legL: [148, 118, 146, 162],
    legR: [156, 118, 172, 158],
  },
  crab: {
    head: [120, 96],
    neck: [120, 118],
    hip: [124, 142],
    armL: [108, 120, 80, 154],
    armR: [136, 120, 166, 154],
    legL: [120, 144, 96, 168],
    legR: [130, 144, 150, 168],
  },
  superman: {
    head: [82, 96],
    neck: [104, 100],
    hip: [152, 102],
    armL: [100, 96, 48, 82],
    armR: [102, 104, 52, 112],
    legL: [150, 104, 184, 92],
    legR: [152, 108, 182, 116],
  },
  sit: {
    head: [120, 92],
    neck: [120, 116],
    hip: [134, 136],
    armL: [114, 118, 96, 152],
    armR: [130, 120, 166, 148],
    legL: [134, 138, 168, 158],
    legR: [136, 142, 152, 170],
  },
  dance: {
    head: [118, 62],
    neck: [118, 88],
    hip: [118, 132],
    armL: [104, 94, 82, 52],
    armR: [132, 94, 170, 92],
    legL: [112, 134, 94, 170],
    legR: [124, 134, 148, 166],
  },
  throw: {
    head: [118, 64],
    neck: [118, 90],
    hip: [118, 134],
    armL: [104, 94, 80, 70],
    armR: [132, 94, 160, 58],
    legL: [112, 136, 96, 172],
    legR: [124, 136, 144, 170],
  },
}

const TINTS: Record<Category, { bg: string; accent: string; soft: string }> = {
  cardio: { bg: '#FFE3D6', accent: '#FF7A59', soft: '#FFD1BE' },
  strength: { bg: '#DDF6F0', accent: '#2FB8A6', soft: '#C4EEE5' },
  balance: { bg: '#E3F3FE', accent: '#5AAFE0', soft: '#CDEAFB' },
  flexibility: { bg: '#ECE8FF', accent: '#8C7AE6', soft: '#DED7FF' },
  coordination: { bg: '#FFF3CD', accent: '#E8A93B', soft: '#FFE9AE' },
  game: { bg: '#FFE8F0', accent: '#E96C9A', soft: '#FFD6E5' },
}

const SKIN = '#F7C8A8'
const SKIN_SHADE = '#E9B08C'
const HAIR = '#4A3226'
const PANTS = '#3B5B7A'
const SHOE = '#243B53'

interface Props {
  exercise: Exercise
  className?: string
  decoration?: boolean
  /** Ảnh lớn ở màn hình đầu: tải ngay để không chậm LCP. */
  priority?: boolean
}

function ArtFallback({ exercise, className, decoration = true }: Props) {
  const geometry = POSES[exercise.art.pose]
  const tint = TINTS[exercise.category]
  const { head, neck, hip, armL, armR, legL, legR } = geometry
  const [hx, hy] = head

  return (
    <svg
      viewBox="0 0 240 200"
      className={className}
      role="img"
      aria-label={`Minh hoạ ${exercise.nameVi}`}
    >
      <rect width="240" height="200" rx="28" fill={tint.bg} />
      {decoration && (
        <g fill="#FFFFFF" opacity="0.65">
          <circle cx="34" cy="38" r="7" />
          <circle cx="206" cy="52" r="5" />
          <circle cx="196" cy="160" r="4" />
          <circle cx="42" cy="148" r="4" />
          <path d="M196 24l2.6 6.4 6.4 2.6-6.4 2.6-2.6 6.4-2.6-6.4-6.4-2.6 6.4-2.6z" fill={tint.accent} opacity="0.55" />
          <path d="M30 96l2 5 5 2-5 2-2 5-2-5-5-2 5-2z" fill={tint.accent} opacity="0.4" />
        </g>
      )}
      <ellipse cx="120" cy="176" rx="72" ry="9" fill={tint.soft} opacity="0.75" />

      {/* chân */}
      <g stroke={PANTS} strokeWidth="13" strokeLinecap="round" fill="none">
        <line x1={legL[0]} y1={legL[1]} x2={legL[2]} y2={legL[3]} />
        <line x1={legR[0]} y1={legR[1]} x2={legR[2]} y2={legR[3]} />
      </g>
      <ellipse cx={legL[2]} cy={legL[3]} rx="8" ry="5.5" fill={SHOE} />
      <ellipse cx={legR[2]} cy={legR[3]} rx="8" ry="5.5" fill={SHOE} />

      {/* thân */}
      <line
        x1={neck[0]}
        y1={neck[1]}
        x2={hip[0]}
        y2={hip[1]}
        stroke={tint.accent}
        strokeWidth="30"
        strokeLinecap="round"
      />
      <line
        x1={neck[0]}
        y1={neck[1] + 4}
        x2={hip[0]}
        y2={hip[1] - 2}
        stroke="#FFFFFF"
        strokeWidth="6"
        strokeLinecap="round"
        opacity="0.18"
      />

      {/* tay */}
      <g stroke={SKIN} strokeWidth="11" strokeLinecap="round" fill="none">
        <line x1={armL[0]} y1={armL[1]} x2={armL[2]} y2={armL[3]} />
        <line x1={armR[0]} y1={armR[1]} x2={armR[2]} y2={armR[3]} />
      </g>
      <circle cx={armL[2]} cy={armL[3]} r="5.5" fill={SKIN} />
      <circle cx={armR[2]} cy={armR[3]} r="5.5" fill={SKIN} />

      {/* đầu */}
      <circle cx={hx} cy={hy} r="23" fill={SKIN} />
      <circle cx={hx} cy={hy + 2} r="23" fill="none" stroke={SKIN_SHADE} strokeWidth="1.5" opacity="0.35" />
      <path
        d={`M ${hx - 23} ${hy - 2} A 23 23 0 0 1 ${hx + 23} ${hy - 2} Q ${hx + 10} ${hy - 16} ${hx - 4} ${hy - 13} Q ${hx - 16} ${hy - 11} ${hx - 23} ${hy - 2} Z`}
        fill={HAIR}
      />
      <path
        d={`M ${hx - 18} ${hy - 12} Q ${hx - 8} ${hy - 26} ${hx + 8} ${hy - 20}`}
        stroke={HAIR}
        strokeWidth="5"
        strokeLinecap="round"
        fill="none"
      />
      <circle cx={hx - 7} cy={hy + 3} r="2.4" fill={SHOE} />
      <circle cx={hx + 7} cy={hy + 3} r="2.4" fill={SHOE} />
      <circle cx={hx - 12} cy={hy + 9} r="4" fill="#FF9E9E" opacity="0.45" />
      <circle cx={hx + 12} cy={hy + 9} r="4" fill="#FF9E9E" opacity="0.45" />
      <path
        d={`M ${hx - 6} ${hy + 11} Q ${hx} ${hy + 17} ${hx + 6} ${hy + 11}`}
        stroke={SHOE}
        strokeWidth="2.4"
        strokeLinecap="round"
        fill="none"
      />

      {/* đạo cụ */}
      {exercise.art.prop === 'rope' && (
        <g>
          <path
            d="M 76 152 Q 120 6 164 152"
            stroke={tint.accent}
            strokeWidth="3.5"
            fill="none"
            strokeLinecap="round"
          />
          <circle cx="76" cy="152" r="5" fill={tint.accent} />
          <circle cx="164" cy="152" r="5" fill={tint.accent} />
        </g>
      )}
      {exercise.art.prop === 'ball' && (
        <g>
          <circle cx={armR[2]} cy={armR[3]} r="11" fill="#FFB020" stroke="#E09000" strokeWidth="2" />
          <path
            d={`M ${armR[2] - 8} ${armR[3] - 3} Q ${armR[2]} ${armR[3] - 10} ${armR[2] + 8} ${armR[3] - 3}`}
            stroke="#FFFFFF"
            strokeWidth="2"
            fill="none"
          />
        </g>
      )}
      {exercise.art.prop === 'towel' && (
        <g transform={`rotate(-8 ${hx} ${hy - 20})`}>
          <rect x={hx - 17} y={hy - 30} width="34" height="11" rx="5" fill="#FFFFFF" stroke="#D8C8B8" strokeWidth="1.5" />
          <line x1={hx - 10} y1={hy - 24} x2={hx + 10} y2={hy - 24} stroke="#E7DACE" strokeWidth="2" />
        </g>
      )}
      {exercise.art.prop === 'paper' && (
        <g>
          <circle cx={armR[2] + 4} cy={armR[3] - 8} r="9" fill="#FFFFFF" stroke="#D8C8B8" strokeWidth="1.5" />
          <path d={`M ${armR[2]} ${armR[3] - 14} l 4 6 -5 1`} stroke="#C9B8A6" strokeWidth="1.4" fill="none" />
        </g>
      )}
      {exercise.art.prop === 'cone' && (
        <g>
          <path d="M 190 168 L 200 140 L 210 168 Z" fill="#FF9F43" stroke="#E07C1A" strokeWidth="2" />
          <line x1="196" y1="154" x2="204" y2="154" stroke="#FFFFFF" strokeWidth="3" />
          <ellipse cx="200" cy="169" rx="12" ry="3.5" fill="#E07C1A" opacity="0.35" />
        </g>
      )}
    </svg>
  )
}

export function ExerciseArt({ exercise, className, decoration = true, priority = false }: Props) {
  const [failedSlug, setFailedSlug] = useState<string | null>(null)
  const alt = `Minh hoạ ${exercise.nameVi}`

  if (failedSlug === exercise.slug) {
    return <ArtFallback exercise={exercise} className={className} decoration={decoration} />
  }

  return (
    <img
      src={`${import.meta.env.BASE_URL}art/${exercise.slug}.webp`}
      alt={alt}
      width={1024}
      height={576}
      className={`object-cover object-center bg-[#FFF8EE] ${className ?? ''}`}
      loading={priority ? 'eager' : 'lazy'}
      fetchPriority={priority ? 'high' : 'auto'}
      decoding="async"
      draggable={false}
      onError={() => setFailedSlug(exercise.slug)}
    />
  )
}
