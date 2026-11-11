import { useEffect, useState } from 'react'

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

let deferredPrompt: InstallPromptEvent | null = null
const listeners = new Set<() => void>()

function emit() {
  listeners.forEach((listener) => listener())
}

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (event) => {
    // Chrome yêu cầu chặn mini-infobar mặc định để tự hiển thị nút cài đặt.
    event.preventDefault()
    deferredPrompt = event as InstallPromptEvent
    emit()
  })
  window.addEventListener('appinstalled', () => {
    deferredPrompt = null
    emit()
  })
}

function isStandaloneMode(): boolean {
  if (typeof window === 'undefined') return false
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  )
}

export function useInstallPrompt() {
  const [promptEvent, setPromptEvent] = useState<InstallPromptEvent | null>(deferredPrompt)
  const [installed, setInstalled] = useState(false)

  useEffect(() => {
    const update = () => setPromptEvent(deferredPrompt)
    listeners.add(update)
    const onInstalled = () => setInstalled(true)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      listeners.delete(update)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  const isStandalone = isStandaloneMode() || installed

  const install = async (): Promise<'accepted' | 'dismissed' | 'unavailable'> => {
    if (!promptEvent) return 'unavailable'
    await promptEvent.prompt()
    const choice = await promptEvent.userChoice
    if (choice.outcome === 'accepted') setInstalled(true)
    deferredPrompt = null
    emit()
    return choice.outcome
  }

  return { canInstall: Boolean(promptEvent) && !isStandalone, isStandalone, install }
}
