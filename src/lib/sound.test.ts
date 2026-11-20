import { describe, expect, it } from 'vitest'
import { parseSoundPref, pickVietnameseVoice } from './sound'

describe('parseSoundPref', () => {
  it('bật mặc định khi chưa có lựa chọn', () => {
    expect(parseSoundPref(null)).toBe(true)
    expect(parseSoundPref(undefined)).toBe(true)
    expect(parseSoundPref('1')).toBe(true)
  })

  it('tắt khi phụ huynh đã tắt', () => {
    expect(parseSoundPref('0')).toBe(false)
  })
})

describe('pickVietnameseVoice', () => {
  it('ưu tiên giọng vi-VN', () => {
    const voices = [
      { name: 'English', lang: 'en-US' },
      { name: 'Google Tiếng Việt', lang: 'vi-VN' },
      { name: 'Tiếng Việt', lang: 'vi' },
    ]
    expect(pickVietnameseVoice(voices)?.name).toBe('Google Tiếng Việt')
  })

  it('nhận giọng tiếng Việt không có mã vùng', () => {
    expect(pickVietnameseVoice([{ name: 'Vi', lang: 'vi' }])?.name).toBe('Vi')
  })

  it('trả null khi máy không có giọng tiếng Việt', () => {
    expect(pickVietnameseVoice([{ name: 'English', lang: 'en-US' }])).toBeNull()
  })
})
