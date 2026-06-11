import { describe, it, expect, vi, beforeEach } from 'vitest'
import { resetPasswordAction } from '../actions'

const { mockSendPasswordResetEmail } = vi.hoisted(() => {
  const mockSendPasswordResetEmail = vi.fn()
  return { mockSendPasswordResetEmail }
})

vi.mock('@roaring/auth/server', () => ({
  sendPasswordResetEmail: mockSendPasswordResetEmail,
}))

describe('resetPasswordAction', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mockSendPasswordResetEmail.mockResolvedValue({ error: null })
  })

  it('delegates to sendPasswordResetEmail with the provided email', async () => {
    await resetPasswordAction('user@example.com')
    expect(mockSendPasswordResetEmail).toHaveBeenCalledOnce()
    expect(mockSendPasswordResetEmail).toHaveBeenCalledWith('user@example.com')
  })

  it('returns the result from sendPasswordResetEmail', async () => {
    const result = { error: null }
    mockSendPasswordResetEmail.mockResolvedValue(result)
    const response = await resetPasswordAction('user@example.com')
    expect(response).toBe(result)
  })

  it('propagates errors from sendPasswordResetEmail', async () => {
    mockSendPasswordResetEmail.mockRejectedValue(new Error('email send failed'))
    await expect(resetPasswordAction('user@example.com')).rejects.toThrow('email send failed')
  })
})
