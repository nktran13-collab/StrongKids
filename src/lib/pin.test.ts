import { describe, expect, it } from 'vitest'
import { checkPin, createPinHash } from './pin'

describe('PIN', () => {
  it('lưu hash PBKDF2 có salt, không lưu mã gốc', async () => {
    const stored = await createPinHash('1234')
    const parts = stored.split('$')

    expect(parts).toHaveLength(4)
    expect(parts[0]).toBe('pbkdf2')
    expect(Number(parts[1])).toBeGreaterThanOrEqual(210_000)
    expect(stored).not.toContain('1234')
  })

  it('nhận đúng mã và từ chối mã sai', async () => {
    const stored = await createPinHash('2468')

    await expect(checkPin('2468', stored)).resolves.toBe(true)
    await expect(checkPin('2469', stored)).resolves.toBe(false)
    await expect(checkPin('', stored)).resolves.toBe(false)
  })

  it('dùng salt ngẫu nhiên nên hai hash của cùng mã khác nhau', async () => {
    const first = await createPinHash('1357')
    const second = await createPinHash('1357')

    expect(first).not.toBe(second)
    await expect(checkPin('1357', first)).resolves.toBe(true)
    await expect(checkPin('1357', second)).resolves.toBe(true)
  })

  it('từ chối hash trống hoặc không đúng định dạng', async () => {
    await expect(checkPin('1234', null)).resolves.toBe(false)
    await expect(checkPin('1234', '')).resolves.toBe(false)
    await expect(checkPin('1234', 'djb2$abc')).resolves.toBe(false)
    await expect(checkPin('1234', 'pbkdf2$1000$c2FsdA==$aGFzaA==')).resolves.toBe(false)
    await expect(checkPin('1234', 'pbkdf2$210000$not-base64$zzz')).resolves.toBe(false)
  })
})
