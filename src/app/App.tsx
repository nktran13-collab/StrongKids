import { Component, lazy, Suspense, type ReactNode } from 'react'
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { StoreProvider, useStore } from './store'
import { AppShell } from '../components/AppShell'
import { PwaUpdateToast } from '../components/PwaUpdateToast'
import { Button, Icon } from '../components/ui'

const AuthPage = lazy(() => import('../features/auth/AuthPage').then((m) => ({ default: m.AuthPage })))
const OnboardingPage = lazy(() =>
  import('../features/onboarding/OnboardingPage').then((m) => ({ default: m.OnboardingPage })),
)
const HomePage = lazy(() => import('../features/home/HomePage').then((m) => ({ default: m.HomePage })))
const LibraryPage = lazy(() =>
  import('../features/library/LibraryPage').then((m) => ({ default: m.LibraryPage })),
)
const SchedulePage = lazy(() =>
  import('../features/schedule/SchedulePage').then((m) => ({ default: m.SchedulePage })),
)
const ParentPage = lazy(() =>
  import('../features/parent/ParentPage').then((m) => ({ default: m.ParentPage })),
)
const WorkoutPage = lazy(() =>
  import('../features/workout/WorkoutPage').then((m) => ({ default: m.WorkoutPage })),
)

function PageLoader() {
  return (
    <div className="app-backdrop grid min-h-dvh place-items-center px-5" role="status" aria-live="polite">
      <div className="flex items-center gap-3 rounded-3xl bg-white px-5 py-4 shadow-lg">
        <span className="h-5 w-5 animate-spin rounded-full border-[3px] border-coral border-t-transparent" />
        <span className="text-sm font-bold text-ink">Đang mở…</span>
      </div>
    </div>
  )
}

function AuthReadyGate({ children }: { children: ReactNode }) {
  const { authReady } = useStore()
  if (!authReady) return <PageLoader />
  return <>{children}</>
}

function AuthRoute() {
  const { data } = useStore()
  if (data.parent && data.child) return <Navigate to="/" replace />
  if (data.parent) return <Navigate to="/bat-dau" replace />
  return <AuthPage />
}

function OnboardingRoute() {
  const { data } = useStore()
  if (!data.parent) return <Navigate to="/dang-nhap" replace />
  if (data.child) return <Navigate to="/" replace />
  return <OnboardingPage />
}

function ShellRoute() {
  const { data } = useStore()
  if (!data.parent) return <Navigate to="/dang-nhap" replace />
  if (!data.child) return <Navigate to="/bat-dau" replace />
  return <AppShell />
}

function WorkoutRoute() {
  const { data } = useStore()
  if (!data.parent) return <Navigate to="/dang-nhap" replace />
  if (!data.child) return <Navigate to="/bat-dau" replace />
  return <WorkoutPage />
}

class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  state = { hasError: false }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error: unknown) {
    console.error('StrongKids: lỗi không mong muốn', error)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="app-backdrop grid min-h-dvh place-items-center px-5 py-10">
          <div className="w-full max-w-[440px] rounded-[2rem] bg-white p-6 text-center shadow-xl">
            <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-peach text-coral-dark">
              <Icon name="info" className="h-8 w-8" />
            </div>
            <h1 className="display-title mt-4 text-xl text-ink">Có gì đó chưa ổn</h1>
            <p className="mt-2 text-sm font-semibold leading-relaxed text-muted">
              Dữ liệu vẫn an toàn trên thiết bị và máy chủ. Bố mẹ tải lại trang để tiếp tục nhé.
              Nếu lỗi lặp lại, hãy mở Khu phụ huynh và xuất dữ liệu trước khi xoá.
            </p>
            <Button className="mt-4" fullWidth onClick={() => window.location.reload()}>
              <Icon name="refresh" className="h-4 w-4" />
              Tải lại trang
            </Button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

export function App() {
  return (
    <ErrorBoundary>
      <StoreProvider>
        <HashRouter>
          <AuthReadyGate>
            <Suspense fallback={<PageLoader />}>
              <Routes>
                <Route path="/dang-nhap" element={<AuthRoute />} />
                <Route path="/bat-dau" element={<OnboardingRoute />} />
                <Route path="/tap/:id" element={<WorkoutRoute />} />
                <Route element={<ShellRoute />}>
                  <Route index element={<HomePage />} />
                  <Route path="/bai-tap" element={<LibraryPage />} />
                  <Route path="/lich" element={<SchedulePage />} />
                  <Route path="/phu-huynh" element={<ParentPage />} />
                </Route>
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Suspense>
          </AuthReadyGate>
        </HashRouter>
        <PwaUpdateToast />
      </StoreProvider>
    </ErrorBoundary>
  )
}
