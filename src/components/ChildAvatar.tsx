import { useId } from 'react'
import type { Sex } from '../lib/types'
import { cx } from './ui'

const SKIN = '#F7C8A8'
const HAIR = '#4A3226'
const INK = '#243B53'

const LOOKS = {
  male: { bg: '#E3F3FE', shirt: '#2FB8A6', deco: '#5AAFE0' },
  female: { bg: '#FFE8F0', shirt: '#E96C9A', deco: '#E96C9A' },
  neutral: { bg: '#FFF3CD', shirt: '#E8A93B', deco: '#E8A93B' },
} as const

interface Props {
  sex: Sex | null
  className?: string
}

export function ChildAvatar({ sex, className }: Props) {
  const clipId = useId()
  const look = sex === 'male' ? LOOKS.male : sex === 'female' ? LOOKS.female : LOOKS.neutral
  const girl = sex === 'female'

  return (
    <svg viewBox="0 0 64 64" className={cx('shrink-0 rounded-full', className)} aria-hidden="true">
      <defs>
        <clipPath id={clipId}>
          <circle cx="32" cy="32" r="32" />
        </clipPath>
      </defs>
      <g clipPath={`url(#${clipId})`}>
        <rect width="64" height="64" fill={look.bg} />
        <circle cx="11" cy="13" r="3" fill="#FFFFFF" opacity="0.7" />
        <circle cx="53" cy="11" r="2.2" fill="#FFFFFF" opacity="0.7" />
        <path
          d="M52 42l1.4 3.4 3.4 1.4-3.4 1.4-1.4 3.4-1.4-3.4-3.4-1.4 3.4-1.4z"
          fill={look.deco}
          opacity="0.45"
        />

        {girl && (
          <g fill={HAIR}>
            <circle cx="32" cy="30" r="19" />
            <circle cx="8.5" cy="36" r="6.2" />
            <circle cx="55.5" cy="36" r="6.2" />
          </g>
        )}
        {girl && (
          <g fill="#FF7A59">
            <circle cx="13.5" cy="32.5" r="2.3" />
            <circle cx="50.5" cy="32.5" r="2.3" />
          </g>
        )}

        <ellipse cx="32" cy="63" rx="17.5" ry="12" fill={look.shirt} />
        <path d="M26 52 Q32 57 38 52" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" fill="none" opacity="0.5" />
        <rect x="28.5" y="43" width="7" height="9" rx="3.5" fill={SKIN} />
        <circle cx="32" cy="30.5" r="15.5" fill={SKIN} />

        {girl ? (
          <path
            d="M16.5 30 A15.5 15.5 0 0 1 47.5 30 Q44 21 39 23.5 Q36 18.5 32 22.5 Q28 18.5 25 23.5 Q20 21 16.5 30 Z"
            fill={HAIR}
          />
        ) : (
          <path
            d="M16.5 29.5 A15.5 15.5 0 0 1 47.5 29.5 Q41 20 34 21.5 Q25 19.5 16.5 29.5 Z"
            fill={HAIR}
          />
        )}
        {sex === 'male' && (
          <path d="M31 15.5 Q33.5 9.5 39 12" stroke={HAIR} strokeWidth="3" strokeLinecap="round" fill="none" />
        )}
        {girl && (
          <g>
            <path d="M43.5 16.5 L37.5 12.5 L38.5 19.5 Z" fill="#FF7A59" />
            <path d="M43.5 16.5 L49.5 12.5 L48.5 19.5 Z" fill="#FF7A59" />
            <circle cx="43.5" cy="16.5" r="2" fill="#E85B3A" />
          </g>
        )}

        <circle cx="26.5" cy="31.5" r="1.9" fill={INK} />
        <circle cx="37.5" cy="31.5" r="1.9" fill={INK} />
        <circle cx="22" cy="37" r="2.8" fill="#FF9E9E" opacity="0.5" />
        <circle cx="42" cy="37" r="2.8" fill="#FF9E9E" opacity="0.5" />
        <path d="M27.5 38.5 Q32 42.5 36.5 38.5" stroke={INK} strokeWidth="1.8" strokeLinecap="round" fill="none" />
      </g>
    </svg>
  )
}