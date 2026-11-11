import { useRegisterSW } from 'virtual:pwa-register/react'
import { Icon } from './ui'

/**
 * Báo khi có bản mới và cho phụ huynh chủ động cập nhật.
 * Không tự reload giữa buổi tập để tránh mất kết quả đang chạy.
 */
export function PwaUpdateToast() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_swUrl, registration) {
      if (!registration) return
      window.setInterval(() => {
        if (navigator.onLine) registration.update().catch(() => undefined)
      }, 60 * 60 * 1000)
    },
  })

  if (!needRefresh) return null

  return (
    <div
      className="animate-pop fixed inset-x-4 top-4 z-[80] mx-auto max-w-[420px]"
      role="status"
    >
      <div className="flex items-start gap-3 rounded-3xl bg-ink px-4 py-3 text-white shadow-xl">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white/15">
          <Icon name="refresh" className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-black">StrongKids có bản mới</p>
          <p className="mt-0.5 text-xs font-semibold leading-snug text-white/80">
            Cập nhật khi bé không đang tập để nhận nội dung mới nhất.
          </p>
          <div className="mt-2.5 flex gap-2">
            <button
              type="button"
              onClick={() => updateServiceWorker(true)}
              className="focus-ring min-h-11 rounded-xl bg-sun px-3 text-xs font-extrabold text-ink"
            >
              Cập nhật ngay
            </button>
            <button
              type="button"
              onClick={() => setNeedRefresh(false)}
              className="focus-ring min-h-11 rounded-xl px-3 text-xs font-bold text-white/80 hover:bg-white/10"
            >
              Để sau
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
