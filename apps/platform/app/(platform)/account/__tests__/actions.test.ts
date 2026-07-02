import { describe, it, expect, vi, beforeEach } from 'vitest'
import { updateUserName } from '../actions'

const { chain, mockTx, mockDb, mockRequireUser, mockSetAuditUser, mockRevalidatePath } = vi.hoisted(
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
    const mockRequireUser = vi.fn().mockResolvedValue({ id: 'user-id' })
    const mockSetAuditUser = vi.fn().mockResolvedValue(undefined)
    const mockRevalidatePath = vi.fn()

    return { chain, mockTx, mockDb, mockRequireUser, mockSetAuditUser, mockRevalidatePath }
  }
)

vi.mock('@roaring/db', () => ({ db: mockDb, users: {} }))
vi.mock('@roaring/auth', () => ({ requireUser: mockRequireUser, setAuditUser: mockSetAuditUser }))
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
  mockRequireUser.mockResolvedValue({ id: 'user-id' })
  mockSetAuditUser.mockResolvedValue(undefined)
}

describe('updateUserName', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    setupMocks()
  })

  it('calls requireUser to gate the action', async () => {
    await updateUserName('Jane Doe')
    expect(mockRequireUser).toHaveBeenCalledOnce()
  })

  it('runs the update inside a transaction', async () => {
    await updateUserName('Jane Doe')
    expect(mockDb.transaction).toHaveBeenCalledOnce()
    expect(mockTx.update).toHaveBeenCalled()
  })

  it('scopes the update to the authenticated user, ignoring any client-supplied id', async () => {
    const eqMock = (await import('drizzle-orm')).eq as unknown as ReturnType<typeof vi.fn>
    await updateUserName('Jane Doe')
    // the WHERE must be built from the session user's id, never a client argument
    const eqCall = eqMock.mock.calls.find((c) => c[1] === 'user-id')
    expect(eqCall, 'update must be scoped to the session user id').toBeDefined()
  })

  it('calls setAuditUser inside the transaction', async () => {
    await updateUserName('Jane Doe')
    expect(mockSetAuditUser).toHaveBeenCalledWith(mockTx, 'user-id')
  })

  it('revalidates the account path', async () => {
    await updateUserName('Jane Doe')
    expect(mockRevalidatePath).toHaveBeenCalledWith('/account')
  })

  it('propagates requireUser errors', async () => {
    mockRequireUser.mockRejectedValue(new Error('Unauthorized'))
    await expect(updateUserName('Jane Doe')).rejects.toThrow('Unauthorized')
    expect(mockDb.transaction).not.toHaveBeenCalled()
  })
})
