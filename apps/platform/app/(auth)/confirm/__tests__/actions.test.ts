import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setPasswordAndActivate } from '../actions'

const {
  mockCreateAdminClient,
  mockActivateUser,
  mockSetSession,
  mockUpdateUserById,
  chain,
  mockDb,
  mockRevalidateTag,
} = vi.hoisted(() => {
  const mockSetSession = vi.fn().mockResolvedValue({
    data: { user: { id: 'user-id' } },
    error: null,
  })
  const mockUpdateUserById = vi.fn().mockResolvedValue({ error: null })
  const mockSupabase = {
    auth: {
      setSession: mockSetSession,
      admin: { updateUserById: mockUpdateUserById },
    },
  }
  const mockCreateAdminClient = vi.fn().mockReturnValue(mockSupabase)
  const mockActivateUser = vi.fn().mockResolvedValue({ error: null })

  const chain: any = {}
  for (const m of ['select', 'from', 'where']) {
    chain[m] = vi.fn().mockReturnValue(chain)
  }
  chain.limit = vi.fn().mockResolvedValue([{ tenantId: 'tenant-1' }])

  const mockDb = {
    select: vi.fn().mockReturnValue(chain),
  }

  const mockRevalidateTag = vi.fn()

  return {
    mockCreateAdminClient,
    mockActivateUser,
    mockSetSession,
    mockUpdateUserById,
    chain,
    mockDb,
    mockRevalidateTag,
  }
})

vi.mock('@roaring/auth/server', () => ({
  createAdminClient: mockCreateAdminClient,
  activateUser: mockActivateUser,
}))
vi.mock('@roaring/db', () => ({
  db: mockDb,
  users: {},
}))
vi.mock('drizzle-orm', () => ({
  eq: vi.fn((...a: any[]) => ({ op: 'eq', a })),
}))
vi.mock('next/cache', () => ({
  revalidateTag: mockRevalidateTag,
}))

const validTokens = {
  password: 'NewPass123!',
  accessToken: 'access-token',
  refreshToken: 'refresh-token',
}

describe('setPasswordAndActivate', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mockSetSession.mockResolvedValue({ data: { user: { id: 'user-id' } }, error: null })
    mockUpdateUserById.mockResolvedValue({ error: null })
    mockActivateUser.mockResolvedValue({ error: null })
    const mockSupabase = {
      auth: {
        setSession: mockSetSession,
        admin: { updateUserById: mockUpdateUserById },
      },
    }
    mockCreateAdminClient.mockReturnValue(mockSupabase)

    chain.select.mockReturnValue(chain)
    chain.from.mockReturnValue(chain)
    chain.where.mockReturnValue(chain)
    chain.limit.mockResolvedValue([{ tenantId: 'tenant-1' }])
    mockDb.select.mockReturnValue(chain)
  })

  it('returns { error: null } on success', async () => {
    const result = await setPasswordAndActivate(validTokens)
    expect(result).toEqual({ error: null })
  })

  it('returns an error when setSession returns a session error', async () => {
    mockSetSession.mockResolvedValue({
      data: { user: null },
      error: { message: 'Invalid token' },
    })
    const result = await setPasswordAndActivate(validTokens)
    expect(result).toEqual({ error: 'Invalid token' })
  })

  it('returns a default error when setSession succeeds but user is null', async () => {
    mockSetSession.mockResolvedValue({ data: { user: null }, error: null })
    const result = await setPasswordAndActivate(validTokens)
    expect(result).toEqual({ error: 'Invalid invite link' })
  })

  it('returns an error when updateUserById fails', async () => {
    mockUpdateUserById.mockResolvedValue({ error: { message: 'Password too weak' } })
    const result = await setPasswordAndActivate(validTokens)
    expect(result).toEqual({ error: 'Password too weak' })
  })

  it('does not call activateUser when updateUserById fails', async () => {
    mockUpdateUserById.mockResolvedValue({ error: { message: 'failed' } })
    await setPasswordAndActivate(validTokens)
    expect(mockActivateUser).not.toHaveBeenCalled()
  })

  it('returns an error when activateUser fails', async () => {
    mockActivateUser.mockResolvedValue({ error: 'activation failed' })
    const result = await setPasswordAndActivate(validTokens)
    expect(result).toEqual({ error: 'activation failed' })
  })

  it('calls activateUser with the user id from the session', async () => {
    await setPasswordAndActivate(validTokens)
    expect(mockActivateUser).toHaveBeenCalledWith('user-id')
  })

  it('calls updateUserById with the correct user id and password', async () => {
    await setPasswordAndActivate(validTokens)
    expect(mockUpdateUserById).toHaveBeenCalledWith('user-id', { password: 'NewPass123!' })
  })

  it('revalidates the users cache tag with the tenant id on success', async () => {
    await setPasswordAndActivate(validTokens)
    expect(mockRevalidateTag).toHaveBeenCalledWith('users-tenant-1', 'max')
  })

  it('does not revalidate if the user row lookup returns nothing', async () => {
    chain.limit.mockResolvedValue([])
    const result = await setPasswordAndActivate(validTokens)
    expect(result).toEqual({ error: null })
    expect(mockRevalidateTag).not.toHaveBeenCalled()
  })
})
