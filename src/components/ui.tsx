import {
  useEffect,
  useId,
  useRef,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
} from 'react'

export function cx(...values: Array<string | false | null | undefined>): string {
  return values.filter(Boolean).join(' ')
}

type IconName =
  | 'home'
  | 'book'
  | 'calendar'
  | 'lock'
  | 'flame'
  | 'play'
  | 'pause'
  | 'close'
  | 'left'
  | 'right'
  | 'check'
  | 'star'
  | 'arrow'
  | 'shield'
  | 'download'
  | 'trash'
  | 'info'
  | 'clock'
  | 'sparkles'
  | 'user'
  | 'settings'
  | 'plus'
  | 'minus'
  | 'refresh'
  | 'heart'
  | 'stop'
  | 'ruler'
  | 'scale'

const ICON_PATHS: Record<IconName, ReactNode> = {
  home: <path d="M3 10.5 12 3l9 7.5M5 9.5V21h5v-6h4v6h5V9.5" />,
  book: (
    <>
      <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5z" />
      <path d="M4 20.5A2.5 2.5 0 0 1 6.5 18H20v3H6.5" />
    </>
  ),
  calendar: (
    <>
      <rect x="3" y="5" width="18" height="16" rx="3" />
      <path d="M8 3v4M16 3v4M3 10h18" />
    </>
  ),
  lock: (
    <>
      <rect x="4" y="10" width="16" height="11" rx="3" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3" />
    </>
  ),
  flame: <path d="M12 3c1 4 4 5 4 8a4 4 0 0 1-8 0c0-1.5.5-2.5 1.5-3.5C8 9 7 11 7 13a5 5 0 0 0 10 0c0-4-3-5-5-10z" />,
  play: <path d="M8 5.5v13l11-6.5z" />,
  pause: <path d="M8 5v14M16 5v14" />,
  close: <path d="M6 6l12 12M18 6 6 18" />,
  left: <path d="M15 5l-7 7 7 7" />,
  right: <path d="M9 5l7 7-7 7" />,
  check: <path d="M5 12.5l4.5 4.5L19 6.5" />,
  star: <path d="M12 3.5l2.6 5.3 5.9.9-4.2 4.1 1 5.9-5.3-2.8-5.3 2.8 1-5.9L3.5 9.7l5.9-.9z" />,
  arrow: <path d="M4 12h16M14 6l6 6-6 6" />,
  shield: <path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z" />,
  download: <path d="M12 3v12M7 10l5 5 5-5M4 20h16" />,
  trash: <path d="M4 7h16M9 7V4h6v3M6 7l1 14h10l1-14M10 11v6M14 11v6" />,
  info: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5M12 8h.01" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  sparkles: (
    <>
      <path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z" />
      <path d="M18 16l.9 2.1L21 19l-2.1.9L18 22l-.9-2.1L15 19l2.1-.9z" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21a8 8 0 0 1 16 0" />
    </>
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  minus: <path d="M5 12h14" />,
  refresh: <path d="M20 11a8 8 0 1 0-2.3 6M20 5v6h-6" />,
  heart: <path d="M12 20s-7-4.4-7-9.5A4 4 0 0 1 12 7a4 4 0 0 1 7 3.5C19 15.6 12 20 12 20z" />,
  stop: <rect x="7" y="7" width="10" height="10" rx="2" />,
  ruler: <path d="M4 16 16 4l4 4L8 20zM11 7l2 2M8 10l2 2M14 6l2 2" />,
  scale: <path d="M12 4v16M7 20h10M5 8h14M8 8l-3 6h6zM16 8l-3 6h6z" />,
}

export function Icon({
  name,
  className,
  filled = false,
}: {
  name: IconName
  className?: string
  filled?: boolean
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={cx('h-5 w-5', className)}
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {ICON_PATHS[name]}
    </svg>
  )
}

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'teal' | 'sun' | 'dark'
type ButtonSize = 'sm' | 'md' | 'lg'

const BUTTON_STYLES: Record<ButtonVariant, string> = {
  primary:
    'bg-coral text-white shadow-[0_10px_24px_-12px_rgba(232,91,58,0.9)] hover:bg-coral-dark',
  secondary:
    'bg-white text-ink border-2 border-line hover:border-coral/40 hover:text-coral-dark',
  ghost: 'bg-transparent text-muted hover:bg-ink/5 hover:text-ink',
  teal: 'bg-teal text-white shadow-[0_10px_24px_-12px_rgba(31,143,129,0.9)] hover:bg-teal-dark',
  sun: 'bg-sun text-ink shadow-[0_10px_24px_-12px_rgba(232,169,59,0.9)] hover:bg-[#F5BC2F]',
  dark: 'bg-ink text-white hover:bg-[#1A2C3F]',
}

const BUTTON_SIZES: Record<ButtonSize, string> = {
  sm: 'h-11 px-4 text-sm gap-1.5 rounded-2xl',
  md: 'h-12 px-5 text-[15px] gap-2 rounded-2xl',
  lg: 'h-14 px-6 text-base gap-2 rounded-[1.25rem]',
}

export function Button({
  variant = 'primary',
  size = 'md',
  fullWidth,
  className,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant
  size?: ButtonSize
  fullWidth?: boolean
}) {
  return (
    <button
      className={cx(
        'tap-scale focus-ring inline-flex items-center justify-center font-bold disabled:cursor-not-allowed disabled:opacity-50',
        BUTTON_STYLES[variant],
        BUTTON_SIZES[size],
        fullWidth && 'w-full',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  )
}

export function Card({
  className,
  children,
  as: Tag = 'div',
}: {
  className?: string
  children: ReactNode
  as?: 'div' | 'section' | 'article'
}) {
  return <Tag className={cx('card-surface', className)}>{children}</Tag>
}

export function Badge({
  children,
  tone = 'neutral',
  className,
}: {
  children: ReactNode
  tone?: 'neutral' | 'coral' | 'teal' | 'sun' | 'sky' | 'grape' | 'mint'
  className?: string
}) {
  const tones: Record<string, string> = {
    neutral: 'bg-ink/5 text-muted',
    coral: 'bg-peach text-coral-dark',
    teal: 'bg-mint text-teal-dark',
    sun: 'bg-sun-soft text-[#9C6B00]',
    sky: 'bg-[#E3F3FE] text-[#2C7BB0]',
    grape: 'bg-[#ECE8FF] text-[#6350C4]',
    mint: 'bg-mint text-teal-dark',
  }
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold',
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  )
}

export function SegmentedControl<T extends string | number>({
  options,
  value,
  onChange,
  className,
}: {
  options: Array<{ value: T; label: string; hint?: string }>
  value: T
  onChange: (value: T) => void
  className?: string
}) {
  return (
    <div className={cx('flex gap-1 rounded-2xl bg-ink/5 p-1.5', className)}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={cx(
            'focus-ring flex-1 rounded-xl px-3 py-2.5 text-sm font-bold transition',
            option.value === value
              ? 'bg-white text-ink shadow-sm'
              : 'text-muted hover:text-ink',
          )}
        >
          <span className="block">{option.label}</span>
          {option.hint && (
            <span className="mt-0.5 block text-[10px] font-semibold uppercase tracking-wide opacity-60">
              {option.hint}
            </span>
          )}
        </button>
      ))}
    </div>
  )
}

export function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string
  hint?: string
  error?: string
  children: ReactNode
}) {
  return (
    <label className="block">
      <span className="mb-1.5 flex items-baseline justify-between gap-3">
        <span className="text-sm font-bold text-ink">{label}</span>
        {hint && <span className="text-xs font-semibold text-muted">{hint}</span>}
      </span>
      {children}
      {error && <span className="mt-1 block text-xs font-semibold text-coral-dark">{error}</span>}
    </label>
  )
}

export function TextInput({
  className,
  invalid,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }) {
  return (
    <input
      className={cx(
        'focus-ring h-12 w-full rounded-2xl border-2 bg-white px-4 text-[15px] font-semibold text-ink placeholder:font-medium placeholder:text-muted/60',
        invalid ? 'border-coral' : 'border-line focus:border-coral/60',
        className,
      )}
      {...props}
    />
  )
}

export function Select({
  className,
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cx(
        'focus-ring h-12 w-full appearance-none rounded-2xl border-2 border-line bg-white px-4 text-[15px] font-semibold text-ink',
        className,
      )}
      {...props}
    >
      {children}
    </select>
  )
}

export function ProgressRing({
  progress,
  children,
  size = 240,
  stroke = 12,
  color = '#FF7A59',
  trackColor = 'rgba(36,59,83,0.08)',
  label,
}: {
  progress: number
  children?: ReactNode
  size?: number
  stroke?: number
  color?: string
  trackColor?: string
  label?: string
}) {
  const radius = 54
  const circumference = 2 * Math.PI * radius
  const clamped = Math.max(0, Math.min(1, progress))
  return (
    <div
      className="relative"
      style={{ width: size, height: size }}
      role={label ? 'timer' : undefined}
      aria-label={label}
      aria-live="off"
    >
      <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
        <circle cx="60" cy="60" r={radius} fill="none" stroke={trackColor} strokeWidth={stroke} />
        <circle
          cx="60"
          cy="60"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - clamped)}
          style={{ transition: 'stroke-dashoffset 300ms linear' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">{children}</div>
    </div>
  )
}

export function Stars({ count, className }: { count: number; className?: string }) {
  return (
    <div className={cx('flex items-center justify-center gap-1', className)} aria-label={`${count} trên 3 sao`}>
      {[1, 2, 3].map((star) => (
        <Icon
          key={star}
          name="star"
          filled
          className={cx(
            'h-7 w-7 transition',
            star <= count ? 'text-sun drop-shadow-sm' : 'text-ink/15',
          )}
        />
      ))}
    </div>
  )
}

export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
}: {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  footer?: ReactNode
}) {
  const titleId = useId()
  const panelRef = useRef<HTMLDivElement | null>(null)
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  useEffect(() => {
    if (!open) return
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const panel = panelRef.current

    const focusables = () =>
      Array.from(
        panel?.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ) ?? [],
      ).filter((element) => element.offsetParent !== null)

    // Ưu tiên ô nhập đầu tiên, sau đó mới tới nút, để phụ huynh nhập liệu ngay.
    const timer = window.setTimeout(() => {
      const preferred = panel?.querySelector<HTMLElement>(
        'input:not([disabled]), select:not([disabled]), textarea:not([disabled])',
      )
      const first = preferred ?? focusables()[0] ?? panel
      first?.focus()
    }, 40)

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onCloseRef.current()
        return
      }
      if (event.key !== 'Tab' || !panel) return
      const items = focusables()
      if (!items.length) {
        event.preventDefault()
        panel.focus()
        return
      }
      const first = items[0]
      const last = items[items.length - 1]
      if (event.shiftKey && (document.activeElement === first || document.activeElement === panel)) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', onKeyDown)
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.clearTimeout(timer)
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = previousOverflow
      previous?.focus()
    }
  }, [open])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <button
        type="button"
        tabIndex={-1}
        aria-label="Đóng"
        className="absolute inset-0 bg-ink/40 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="animate-slide-up relative flex max-h-[92dvh] w-full max-w-[520px] flex-col overflow-hidden rounded-t-[2rem] bg-cream focus:outline-none sm:rounded-[2rem]"
      >
        <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-4">
          <h2 id={titleId} className="display-title text-lg text-ink">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="focus-ring grid h-10 w-10 place-items-center rounded-full bg-ink/5 text-ink hover:bg-ink/10"
            aria-label="Đóng"
          >
            <Icon name="close" />
          </button>
        </div>
        <div className="no-scrollbar overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className="border-t border-line bg-white/60 px-5 py-4">{footer}</div>}
      </div>
    </div>
  )
}

export function PageHeader({
  title,
  subtitle,
  onBack,
  right,
}: {
  title: string
  subtitle?: string
  onBack?: () => void
  right?: ReactNode
}) {
  return (
    <header className="mb-4 flex items-center gap-3">
      {onBack && (
        <button
          type="button"
          onClick={onBack}
          className="focus-ring grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white text-ink shadow-sm"
          aria-label="Quay lại"
        >
          <Icon name="left" />
        </button>
      )}
      <div className="min-w-0 flex-1">
        <h1 className="display-title truncate text-[22px] leading-tight text-ink">{title}</h1>
        {subtitle && <p className="mt-0.5 truncate text-sm font-semibold text-muted">{subtitle}</p>}
      </div>
      {right}
    </header>
  )
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string
  description: string
  action?: ReactNode
}) {
  return (
    <Card className="px-6 py-8 text-center">
      <div className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-full bg-sun-soft text-[#9C6B00]">
        <Icon name="sparkles" className="h-7 w-7" />
      </div>
      <h3 className="display-title text-base text-ink">{title}</h3>
      <p className="mx-auto mt-1 max-w-xs text-sm font-medium leading-relaxed text-muted">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </Card>
  )
}
