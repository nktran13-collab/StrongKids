import { useEffect, useState } from 'react'
import { useStore } from '../../app/store'

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

  useEffect(() => {
    if (resendIn <= 0) return
    const timer = window.setTimeout(() => setResendIn((value) => value - 1), 1000)
    return () => window.clearTimeout(timer)
  }, [resendIn])

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
    setError('')
    setBusy(true)
    const result = await sendEmailOtp(clean)
    setBusy(false)
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
    setBusy(true)
    const result = await sendEmailOtp(email.trim())
    setBusy(false)
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
    send,
    resend,
    verify,
    editEmail,
  }
}
