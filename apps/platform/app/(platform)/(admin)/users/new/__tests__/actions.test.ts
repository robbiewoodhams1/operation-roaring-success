import { describe, it, expect, vi, beforeEach } from 'vitest'
import { inviteUserAction } from '../actions'

const { mockInviteUser } = vi.hoisted(() => {
  const mockInviteUser = vi.fn()
  return { mockInviteUser }
})

vi.mock('@roaring/auth/server', () => ({
  inviteUser: mockInviteUser,
}))

vi.mock('@roaring/auth', () => ({}))

const baseInviteData = {
  email: 'newuser@example.com',
  fullName: 'New User',
  role: 'agent' as const,
  tenantId: 'tenant-1',
  department: 'Sales',
  team: 'Team A',
  invitedById: 'admin-id',
  invitedByEmail: 'admin@example.com',
  invitedByName: 'Admin User',
}

describe('inviteUserAction', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mockInviteUser.mockResolvedValue({ error: null })
  })

  it('delegates to inviteUser with all provided data', async () => {
    await inviteUserAction(baseInviteData)
    expect(mockInviteUser).toHaveBeenCalledOnce()
    expect(mockInviteUser).toHaveBeenCalledWith(baseInviteData)
  })

  it('returns the result from inviteUser', async () => {
    const result = { error: null }
    mockInviteUser.mockResolvedValue(result)
    const response = await inviteUserAction(baseInviteData)
    expect(response).toBe(result)
  })

  it('propagates errors from inviteUser', async () => {
    mockInviteUser.mockRejectedValue(new Error('invite failed'))
    await expect(inviteUserAction(baseInviteData)).rejects.toThrow('invite failed')
  })
})
