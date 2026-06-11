import { describe, it, expect, vi, beforeEach } from 'vitest'
import { updateUser, toggleUserSuspension } from '../actions'

const { chain, mockTx, mockDb, mockRequireRole, mockSetAuditUser, mockRevalidatePath } = vi.hoisted(
  () => {
    const chain: any = {}
    for (const m of ['from', 'where', 'set', 'values', 'leftJoin', 'orderBy']) {
      chain[m] = vi.fn().mockReturnValue(chain)
    }
    chain.limit = vi.fn().mockResolvedValue([])
    chain.returning = vi.fn().mockResolvedValue([])
    chain.then = (r: any, j: any) => Promise.resolve(undefined).then(r, j)
    chain.catch = (j: any) => Promise.resolve(undefined).catch(j)
    chain.finally = (f: any) => Promise.resolve(undefined).finally(f)

    const mockTx = {
      update: vi.fn().mockReturnValue(chain),
      insert: vi.fn().mockReturnValue(chain),
      select: vi.fn().mockReturnValue(chain),
    }
    const mockDb = {
      select: vi.fn().mockReturnValue(chain),
      transaction: vi.fn().mockImplementation(async (cb: any) => cb(mockTx)),
    }
    const mockRequireRole = vi.fn().mockResolvedValue({ id: 'admin-id' })
    const mockSetAuditUser = vi.fn().mockResolvedValue(undefined)
    const mockRevalidatePath = vi.fn()

    return { chain, mockTx, mockDb, mockRequireRole, mockSetAuditUser, mockRevalidatePath }
  }
)

vi.mock('@roaring/db', () => ({ db: mockDb, users: {} }))
vi.mock('@roaring/auth', () => ({ requireRole: mockRequireRole, setAuditUser: mockSetAuditUser }))
vi.mock('next/cache', () => ({ revalidatePath: mockRevalidatePath }))
vi.mock('drizzle-orm', () => ({ eq: vi.fn((...a: any[]) => ({ op: 'eq', a })) }))

function setupMocks() {
  for (const m of ['from', 'where', 'set', 'values', 'leftJoin', 'orderBy'])
    chain[m].mockReturnValue(chain)
  chain.limit.mockResolvedValue([])
  chain.returning.mockResolvedValue([])
  mockTx.update.mockReturnValue(chain)
  mockTx.insert.mockReturnValue(chain)
  mockTx.select.mockReturnValue(chain)
  mockDb.select.mockReturnValue(chain)
  mockDb.transaction.mockImplementation(async (cb: any) => cb(mockTx))
  mockRequireRole.mockResolvedValue({ id: 'admin-id' })
  mockSetAuditUser.mockResolvedValue(undefined)
}

describe('updateUser', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    setupMocks()
  })

  it('requires the admin role', async () => {
    await updateUser('user-1', { fullName: 'Jane', role: 'agent' })
    expect(mockRequireRole).toHaveBeenCalledWith('admin')
  })

  it('runs the update inside a transaction', async () => {
    await updateUser('user-1', { fullName: 'Jane', role: 'agent' })
    expect(mockDb.transaction).toHaveBeenCalledOnce()
    expect(mockTx.update).toHaveBeenCalled()
  })

  it('revalidates /users and the specific user path', async () => {
    await updateUser('user-1', { fullName: 'Jane', role: 'agent' })
    expect(mockRevalidatePath).toHaveBeenCalledWith('/users')
    expect(mockRevalidatePath).toHaveBeenCalledWith('/users/user-1')
  })

  it('propagates auth errors without running the transaction', async () => {
    mockRequireRole.mockRejectedValue(new Error('Forbidden'))
    await expect(updateUser('user-1', { fullName: 'Jane', role: 'agent' })).rejects.toThrow(
      'Forbidden'
    )
    expect(mockDb.transaction).not.toHaveBeenCalled()
  })
})

describe('toggleUserSuspension', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    setupMocks()
  })

  it('requires the admin role', async () => {
    await toggleUserSuspension('user-1', true)
    expect(mockRequireRole).toHaveBeenCalledWith('admin')
  })

  it('runs the update inside a transaction', async () => {
    await toggleUserSuspension('user-1', true)
    expect(mockDb.transaction).toHaveBeenCalledOnce()
    expect(mockTx.update).toHaveBeenCalled()
  })

  it('revalidates /users and the specific user path', async () => {
    await toggleUserSuspension('user-1', false)
    expect(mockRevalidatePath).toHaveBeenCalledWith('/users')
    expect(mockRevalidatePath).toHaveBeenCalledWith('/users/user-1')
  })

  it('propagates auth errors without running the transaction', async () => {
    mockRequireRole.mockRejectedValue(new Error('Forbidden'))
    await expect(toggleUserSuspension('user-1', true)).rejects.toThrow('Forbidden')
    expect(mockDb.transaction).not.toHaveBeenCalled()
  })
})
