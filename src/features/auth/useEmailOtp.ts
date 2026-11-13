import { useEffect, useState } from 'react'
import { useStore } from '../../app/store'
import { captchaEnabled } from '../../components/TurnstileWidget'

const RESEND_SECONDS = 60

/** Luồng đăng nhập bằng mã 6 số: nhập email → mã xác thực → phiên đã xác thực. */
export function useEmailOtp({
  initialEmail = '',
  initialConsent = false,
}: {
  initialEmail?: string
  initialConsent?: boolean
} = {}) {
  const { sendEmailOtp, verifyEmailOtp } = useStore()
  const [step, setStep] = useState<'email' | 'code'>('email')
  const [email, setEmail] = useState(initialEmail)
  const [consent, setConsent] = useState(initialConsent)
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [resendIn, setResendIn] = useState(0)
  const [captchaToken, setCaptchaToken] = useState('')
  const [captchaAttempt, setCaptchaAttempt] = useState(0)

  useEffect(() => {
    if (resendIn <= 0) return
    const timer = window.setTimeout(() => setResendIn((value) => value - 1), 1000)
    return () => window.clearTimeout(timer)
  }, [resendIn])

  const refreshCaptcha = () => {
    setCaptchaToken('')
    setCaptchaAttempt((value) => value + 1)
  }

  const captchaReady = () => {
    if (!captchaEnabled || captchaToken) return true
    setError('Hệ thống đang xác minh trình duyệt. Bố mẹ chờ ô xác minh hiện dấu tích rồi thử lại nhé.')
    return false
  }

  const send = async () => {
    const clean = email.trim()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) {
      setError('Bố mẹ nhập giúp em một địa chỉ email hợp lệ nhé.')
      return false
    }
    if (!consent) {
      setError('Bố mẹ cần xác nhận là cha mẹ hoặc người giám hộ của bé.')
      return false
    }
    if (!captchaReady()) return false
    setError('')
    setBusy(true)
    const result = await sendEmailOtp(clean, captchaToken)
    setBusy(false)
    refreshCaptcha()
    if (!result.ok) {
      setError(result.message)
      return false
    }
    setStep('code')
    setCode('')
    setResendIn(RESEND_SECONDS)
    return true
  }

  const resend = async () => {
    if (resendIn > 0 || busy) return
    if (!captchaReady()) return
    setBusy(true)
    const result = await sendEmailOtp(email.trim(), captchaToken)
    setBusy(false)
    refreshCaptcha()
    if (!result.ok) {
      setError(result.message)
      return
    }
    setError('')
    setCode('')
    setResendIn(RESEND_SECONDS)
  }

  const verify = async () => {
    if (!/^\d{6}$/.test(code)) {
      setError('Mã xác thực gồm 6 chữ số. Bố mẹ kiểm tra lại email nhé.')
      return false
    }
    setError('')
    setBusy(true)
    const result = await verifyEmailOtp(email.trim(), code)
    setBusy(false)
    if (!result.ok) {
      setError(result.message)
      return false
    }
    return true
  }

  const editEmail = () => {
    setStep('email')
    setCode('')
    setError('')
    setResendIn(0)
  }

  return {
    step,
    email,
    setEmail,
    consent,
    setConsent,
    code,
    setCode,
    error,
    setError,
    busy,
    resendIn,
    captchaToken,
    setCaptchaToken,
    captchaAttempt,
    send,
    resend,
    verify,
    editEmail,
  }
}
