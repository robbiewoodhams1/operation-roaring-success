import { describe, it, expect, vi, beforeEach } from 'vitest'
import { inviteUserAction } from '../actions'

const { mockInviteUser, mockRequireRole } = vi.hoisted(() => {
  const mockInviteUser = vi.fn()
  const mockRequireRole = vi.fn()
  return { mockInviteUser, mockRequireRole }
})

vi.mock('@roaring/auth/server', () => ({
  inviteUser: mockInviteUser,
}))

vi.mock('@roaring/auth', () => ({ requireRole: mockRequireRole }))

vi.mock('next/cache', () => ({ revalidatePath: vi.fn(), revalidateTag: vi.fn() }))

const currentUser = {
  id: 'admin-id',
  email: 'admin@example.com',
  fullName: 'Admin User',
  tenantId: 'tenant-1',
  role: 'admin' as const,
}

// The client only supplies invitee details — identity/tenant come from the session.
const inviteInput = {
  email: 'newuser@example.com',
  fullName: 'New User',
  role: 'agent' as const,
  department: 'Sales',
  team: 'Team A',
}

describe('inviteUserAction', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mockRequireRole.mockResolvedValue(currentUser)
    mockInviteUser.mockResolvedValue({ success: true, error: null })
  })

  it('requires the admin role before inviting', async () => {
    await inviteUserAction(inviteInput)
    expect(mockRequireRole).toHaveBeenCalledWith('admin')
  })

  it('does not invite and surfaces the error when the caller is not an admin', async () => {
    mockRequireRole.mockRejectedValue(new Error('unauthorised'))
    await expect(inviteUserAction(inviteInput)).rejects.toThrow('unauthorised')
    expect(mockInviteUser).not.toHaveBeenCalled()
  })

  it('derives tenant and inviter identity from the session, not the payload', async () => {
    // caller attempts to spoof a different tenant / inviter
    await inviteUserAction({
      ...inviteInput,
      // @ts-expect-error — these fields are no longer part of the action contract
      tenantId: 'other-tenant',
      invitedById: 'someone-else',
      role: 'admin',
    })

    expect(mockInviteUser).toHaveBeenCalledWith({
      email: inviteInput.email,
      fullName: inviteInput.fullName,
      role: 'admin',
      department: inviteInput.department,
      team: inviteInput.team,
      tenantId: currentUser.tenantId,
      invitedById: currentUser.id,
      invitedByEmail: currentUser.email,
      invitedByName: currentUser.fullName,
    })
  })

  it('returns the result from inviteUser', async () => {
    const result = { success: true, error: null }
    mockInviteUser.mockResolvedValue(result)
    const response = await inviteUserAction(inviteInput)
    expect(response).toBe(result)
  })

  it('propagates errors from inviteUser', async () => {
    mockInviteUser.mockRejectedValue(new Error('invite failed'))
    await expect(inviteUserAction(inviteInput)).rejects.toThrow('invite failed')
  })
})
