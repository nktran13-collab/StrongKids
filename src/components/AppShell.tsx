import { NavLink, Outlet } from 'react-router-dom'
import { useStore } from '../app/store'
import { computeStreak } from '../lib/streak'
import { todayKey } from '../lib/date'
import { useOnline } from '../lib/useOnline'
import { Icon, cx } from './ui'

const NAV = [
  { to: '/', label: 'Hôm nay', icon: 'home' as const },
  { to: '/bai-tap', label: 'Bài tập', icon: 'book' as const },
  { to: '/lich', label: 'Lịch', icon: 'calendar' as const },
  { to: '/phu-huynh', label: 'Phụ huynh', icon: 'lock' as const },
]

export function AppShell() {
  const { data } = useStore()
  const online = useOnline()
  const child = data.child
  const streak = child
    ? computeStreak({
        sessions: data.sessions,
        weekdays: data.schedule.weekdays,
        startKey: child.createdAt.slice(0, 10),
        todayKey: todayKey(),
      })
    : null

  return (
    <div className="app-backdrop min-h-dvh">
      <a
        href="#main-content"
        onClick={(event) => {
          // HashRouter dùng hash cho route, nên chặn điều hướng mặc định của skip link.
          event.preventDefault()
          document.getElementById('main-content')?.focus()
        }}
        className="focus-ring sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[90] focus:rounded-xl focus:bg-ink focus:px-4 focus:py-3 focus:text-sm focus:font-bold focus:text-white"
      >
        Bỏ qua tới nội dung chính
      </a>
      <div className="mx-auto flex min-h-dvh w-full max-w-[560px] flex-col px-5 pb-28 pt-5">
        <header className="mb-4 flex items-center justify-between gap-3">
          <NavLink to="/" className="focus-ring flex items-center gap-2.5 rounded-2xl">
            <Logo />
            <div className="leading-none">
              <span className="display-title block text-[19px] tracking-tight text-ink">
                StrongKids
              </span>
              <span className="mt-1 block text-xs font-bold uppercase tracking-[0.18em] text-muted">
                Vận động vui khoẻ
              </span>
            </div>
          </NavLink>
          <div className="flex items-center gap-2">
            <NavLink
              to="/lich"
              className="focus-ring flex h-11 items-center gap-1.5 rounded-full bg-white px-3 text-sm font-extrabold text-ink shadow-sm"
              aria-label={`Chuỗi ${streak?.current ?? 0} ngày`}
            >
              <span className={cx('text-coral-dark', (streak?.current ?? 0) > 0 && 'animate-flame')}>
                <Icon name="flame" filled className="h-5 w-5" />
              </span>
              {streak?.current ?? 0}
            </NavLink>
            <NavLink
              to="/phu-huynh"
              className="focus-ring grid h-11 w-11 place-items-center rounded-full bg-ink text-sm font-black text-white shadow-sm"
              aria-label="Khu phụ huynh"
            >
              {child?.nickname.slice(0, 1).toUpperCase() ?? 'S'}
            </NavLink>
          </div>
        </header>

        {!online && (
          <div
            role="status"
            className="mb-3 flex items-center gap-2 rounded-2xl bg-ink px-3 py-2 text-xs font-bold leading-snug text-white"
          >
            <Icon name="info" className="h-4 w-4 shrink-0 text-sun" />
            Bạn đang offline. Bài tập vẫn chạy và kết quả được lưu trên thiết bị này.
          </div>
        )}

        <main id="main-content" tabIndex={-1} className="flex-1 focus:outline-none">
          <Outlet />
        </main>
      </div>

      <nav className="safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-line/80 bg-cream/95 px-3 pt-2 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-[560px] items-stretch justify-between">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                cx(
                  'focus-ring flex flex-1 flex-col items-center gap-1 rounded-2xl py-2 text-xs font-bold transition',
                  isActive ? 'text-coral-dark' : 'text-muted hover:text-ink',
                )
              }
            >
              {({ isActive }) => (
                <>
                  <span
                    className={cx(
                      'grid h-9 w-12 place-items-center rounded-2xl transition',
                      isActive ? 'bg-peach text-coral-dark' : 'text-muted',
                    )}
                  >
                    <Icon name={item.icon} filled={isActive && item.icon !== 'book'} />
                  </span>
                  {item.label}
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}

export function Logo({ size = 42 }: { size?: number }) {
  return (
    <div
      className="relative grid shrink-0 place-items-center rounded-[15px] bg-coral text-white shadow-[0_8px_18px_-8px_rgba(232,91,58,0.9)]"
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none">
        <path
          d="M12 3.2l2.3 4.9 5.4.8-3.9 3.8.9 5.4-4.7-2.5-4.7 2.5.9-5.4L4.3 8.9l5.4-.8z"
          fill="currentColor"
        />
      </svg>
      <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-sun ring-2 ring-cream" />
    </div>
  )
}
