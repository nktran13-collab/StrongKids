import { useEffect, useRef } from 'react'

const SITE_KEY = (import.meta.env.VITE_TURNSTILE_SITE_KEY ?? '').trim()

/** Chỉ hiện captcha khi build có cấu hình site key của Cloudflare Turnstile. */
export const captchaEnabled = SITE_KEY.length > 0

interface TurnstileApi {
  render: (element: HTMLElement, options: Record<string, unknown>) => string
  remove: (widgetId: string) => void
}

declare global {
  interface Window {
    turnstile?: TurnstileApi
  }
}

let loader: Promise<TurnstileApi> | null = null

function loadTurnstile(): Promise<TurnstileApi> {
  if (window.turnstile) return Promise.resolve(window.turnstile)
  if (loader) return loader
  loader = new Promise<TurnstileApi>((resolve, reject) => {
    const script = document.createElement('script')
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
    script.async = true
    script.defer = true
    script.onload = () => {
      if (window.turnstile) resolve(window.turnstile)
      else reject(new Error('Turnstile không khởi động được'))
    }
    script.onerror = () => reject(new Error('Không tải được Turnstile'))
    document.head.appendChild(script)
  })
  return loader
}

/**
 * Widget Turnstile dạng Managed. Mỗi lần mount tạo một widget mới; mã xác minh chỉ dùng
 * được một lần nên trang gọi lại phải đổi `key` để lấy mã mới.
 */
export function TurnstileWidget({
  onToken,
  className,
}: {
  onToken: (token: string) => void
  className?: string
}) {
  const holder = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!captchaEnabled || !holder.current) return
    const element = holder.current
    let widgetId: string | null = null
    let cancelled = false

    void loadTurnstile()
      .then((api) => {
        if (cancelled) return
        widgetId = api.render(element, {
          sitekey: SITE_KEY,
          language: 'vi',
          theme: 'light',
          callback: (token: string) => onToken(token),
          'expired-callback': () => onToken(''),
          'error-callback': () => onToken(''),
        })
      })
      .catch(() => onToken(''))

    return () => {
      cancelled = true
      if (widgetId && window.turnstile) window.turnstile.remove(widgetId)
    }
  }, [onToken])

  if (!captchaEnabled) return null
  return <div ref={holder} className={className} />
}
