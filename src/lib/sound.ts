import { useSyncExternalStore } from 'react'

const SOUND_KEY = 'strongkids.sound.v1'

export type CueName =
  | 'tick'
  | 'go'
  | 'workEnd'
  | 'restEnd'
  | 'sessionDone'
  | 'newBest'

interface Tone {
  at: number
  freq: number
  dur: number
  peak?: number
  type?: OscillatorType
}

// Chuông tự tổng hợp bằng Web Audio để khỏi phải tải file âm thanh.
const CUES: Record<CueName, Tone[]> = {
  tick: [{ at: 0, freq: 880, dur: 0.09 }],
  go: [
    { at: 0, freq: 660, dur: 0.12 },
    { at: 0.13, freq: 880, dur: 0.14 },
    { at: 0.3, freq: 1320, dur: 0.24 },
  ],
  workEnd: [
    { at: 0, freq: 784, dur: 0.12 },
    { at: 0.14, freq: 1046, dur: 0.2 },
  ],
  restEnd: [
    { at: 0, freq: 523, dur: 0.12 },
    { at: 0.13, freq: 659, dur: 0.12 },
    { at: 0.26, freq: 784, dur: 0.2 },
  ],
  sessionDone: [
    { at: 0, freq: 523, dur: 0.14 },
    { at: 0.15, freq: 659, dur: 0.14 },
    { at: 0.3, freq: 784, dur: 0.14 },
    { at: 0.45, freq: 1046, dur: 0.32 },
  ],
  newBest: [
    { at: 0, freq: 1046, dur: 0.09 },
    { at: 0.1, freq: 1318, dur: 0.09 },
    { at: 0.2, freq: 1568, dur: 0.18 },
  ],
}

let enabled = readSoundPref()
const listeners = new Set<() => void>()
let audio: AudioContext | null = null
let master: GainNode | null = null
let cachedVoice: SpeechSynthesisVoice | null | undefined
let voicesBound = false

export function parseSoundPref(raw: string | null | undefined): boolean {
  return raw !== '0'
}

function readSoundPref(): boolean {
  try {
    if (typeof localStorage === 'undefined') return true
    return parseSoundPref(localStorage.getItem(SOUND_KEY))
  } catch {
    return true
  }
}

export function getSoundEnabled(): boolean {
  return enabled
}

export function setSoundEnabled(next: boolean) {
  enabled = next
  try {
    localStorage.setItem(SOUND_KEY, next ? '1' : '0')
  } catch {
    // Chế độ riêng tư không cho ghi: chỉ áp dụng cho phiên hiện tại.
  }
  if (next) {
    void audio?.resume().catch(() => undefined)
  } else {
    stopVoice()
    void audio?.suspend().catch(() => undefined)
  }
  listeners.forEach((listener) => listener())
}

export function subscribeSound(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function useSoundEnabled(): boolean {
  return useSyncExternalStore(subscribeSound, getSoundEnabled, getSoundEnabled)
}

function ensureAudio(): AudioContext | null {
  if (typeof window === 'undefined') return null
  if (audio) return audio
  const Ctor =
    window.AudioContext ??
    (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!Ctor) return null
  try {
    audio = new Ctor()
    master = audio.createGain()
    master.gain.value = 1
    master.connect(audio.destination)
  } catch {
    audio = null
    master = null
  }
  return audio
}

function scheduleTone(ctx: AudioContext, tone: Tone, start: number) {
  if (!master) return
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = tone.type ?? 'sine'
  osc.frequency.setValueAtTime(tone.freq, start)
  const peak = tone.peak ?? 0.12
  gain.gain.setValueAtTime(0.0001, start)
  gain.gain.exponentialRampToValueAtTime(peak, start + 0.015)
  gain.gain.exponentialRampToValueAtTime(0.0001, start + tone.dur)
  osc.connect(gain)
  gain.connect(master)
  osc.start(start)
  osc.stop(start + tone.dur + 0.05)
}

export function playCue(name: CueName, delayMs = 0) {
  if (!enabled || typeof window === 'undefined') return
  const run = () => {
    if (!enabled) return
    const ctx = ensureAudio()
    if (!ctx || !master) return
    if (ctx.state === 'suspended') void ctx.resume().catch(() => undefined)
    const base = ctx.currentTime + 0.02
    for (const tone of CUES[name]) scheduleTone(ctx, tone, base + tone.at)
  }
  if (delayMs > 0) window.setTimeout(run, delayMs)
  else run()
}

// Tên voice gợi ý giọng nữ/nam của từng hệ điều hành (iOS "Linh", Windows
// "HoaiMy"/"NamMinh", Google "Tiếng Việt"). Web Speech API không cho chọn
// vùng miền, nên chỉ ưu tiên giọng nữ tiếng Việt có sẵn trên máy.
const FEMALE_VOICE_HINTS = ['linh', 'hoai my', 'hoaimy', 'ngoc', 'mai', 'thao', 'lan', 'female', 'nữ']
const MALE_VOICE_HINTS = ['nam minh', 'namminh', 'minh nam', 'male']

function voiceScore(voice: { name?: string; lang?: string }): number {
  const name = (voice.name ?? '').toLowerCase()
  const lang = (voice.lang ?? '').toLowerCase()
  if (!lang.startsWith('vi')) return -100
  let score = lang === 'vi-vn' ? 4 : 3
  if (FEMALE_VOICE_HINTS.some((hint) => name.includes(hint))) score += 4
  if (MALE_VOICE_HINTS.some((hint) => name.includes(hint))) score -= 4
  return score
}

export function pickVietnameseVoice<T extends { name?: string; lang?: string }>(
  voices: T[],
): T | null {
  let best: T | null = null
  let bestScore = -Infinity
  for (const voice of voices) {
    const score = voiceScore(voice)
    if (score > bestScore) {
      best = voice
      bestScore = score
    }
  }
  return bestScore >= 3 ? best : null
}

function resolveVoice(): SpeechSynthesisVoice | null {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return null
  const synth = window.speechSynthesis
  if (!voicesBound) {
    voicesBound = true
    synth.addEventListener?.('voiceschanged', () => {
      cachedVoice = undefined
    })
  }
  if (cachedVoice !== undefined) return cachedVoice
  const voices = synth.getVoices()
  if (!voices.length) return null
  cachedVoice = pickVietnameseVoice(voices)
  return cachedVoice
}

export function speak(text: string, options: { delayMs?: number } = {}) {
  if (!enabled || typeof window === 'undefined' || !('speechSynthesis' in window)) return
  const synth = window.speechSynthesis
  const say = () => {
    if (!enabled) return
    try {
      if (synth.speaking || synth.pending) synth.cancel()
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.lang = 'vi-VN'
      utterance.rate = 0.9
      utterance.pitch = 1.05
      utterance.volume = 1
      const voice = resolveVoice()
      if (voice) utterance.voice = voice
      synth.speak(utterance)
    } catch {
      // Trình duyệt không hỗ trợ đọc tiếng Việt: bé vẫn có chuông báo.
    }
  }
  const delay = options.delayMs ?? 0
  if (delay > 0) window.setTimeout(say, delay)
  else say()
}

export function stopVoice() {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return
  try {
    window.speechSynthesis.cancel()
  } catch {
    // Không có gì đang đọc.
  }
}

/** Gọi trong thao tác chạm đầu tiên để iOS cho phép phát âm thanh. */
export function unlockAudio() {
  const ctx = ensureAudio()
  if (ctx?.state === 'suspended') void ctx.resume().catch(() => undefined)
  resolveVoice()
}
