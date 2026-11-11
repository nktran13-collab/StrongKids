import confetti from 'canvas-confetti'

const COLORS = ['#FF7A59', '#2FB8A6', '#FFC94A', '#6EC6F7', '#8C7AE6', '#FFF8EE']

export function celebrate(intensity = 1) {
  const reduced =
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  if (reduced) return

  confetti({
    particleCount: Math.round(90 * intensity),
    spread: 75,
    startVelocity: 42,
    origin: { x: 0.5, y: 0.62 },
    colors: COLORS,
    zIndex: 2000,
    disableForReducedMotion: true,
  })
  window.setTimeout(() => {
    confetti({
      particleCount: Math.round(55 * intensity),
      angle: 60,
      spread: 60,
      origin: { x: 0, y: 0.75 },
      colors: COLORS,
      zIndex: 2000,
      disableForReducedMotion: true,
    })
    confetti({
      particleCount: Math.round(55 * intensity),
      angle: 120,
      spread: 60,
      origin: { x: 1, y: 0.75 },
      colors: COLORS,
      zIndex: 2000,
      disableForReducedMotion: true,
    })
  }, 180)
}
