import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createTeam, renameTeam, setTeamActive } from '../actions'

const { chain, mockTx, mockDb, mockRequireRole } = vi.hoisted(() => {
  const chain: any = {}
  for (const m of ['from', 'where', 'set', 'values']) chain[m] = vi.fn().mockReturnValue(chain)
  chain.limit = vi.fn().mockResolvedValue([])
  chain.then = (r: any, j: any) => Promise.resolve(undefined).then(r, j)
  const mockTx = { insert: vi.fn().mockReturnValue(chain), update: vi.fn().mockReturnValue(chain) }
  const mockDb = {
    select: vi.fn().mockReturnValue(chain),
    transaction: vi.fn().mockImplementation(async (cb: any) => cb(mockTx)),
  }
  return { chain, mockTx, mockDb, mockRequireRole: vi.fn() }
})

vi.mock('@roaring/db', () => ({ db: mockDb, teams: { tenantId: 't', id: 'i', name: 'n' } }))
vi.mock('@roaring/auth', () => ({ requireRole: mockRequireRole, setAuditUser: vi.fn() }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('drizzle-orm', () => ({
  eq: vi.fn((...a: any[]) => ({ op: 'eq', a })),
  ne: vi.fn((...a: any[]) => ({ op: 'ne', a })),
  and: vi.fn((...a: any[]) => ({ op: 'and', a })),
  sql: vi.fn(() => ({})),
}))

beforeEach(() => {
  vi.clearAllMocks()
  for (const m of ['from', 'where', 'set', 'values']) chain[m].mockReturnValue(chain)
  chain.limit.mockResolvedValue([])
  mockDb.select.mockReturnValue(chain)
  mockDb.transaction.mockImplementation(async (cb: any) => cb(mockTx))
  mockTx.insert.mockReturnValue(chain)
  mockTx.update.mockReturnValue(chain)
  mockRequireRole.mockResolvedValue({ id: 'admin', tenantId: 'tenant-1' })
})

describe('team management', () => {
  it('is admin-only', async () => {
    mockRequireRole.mockRejectedValue(new Error('NEXT_REDIRECT'))
    await expect(createTeam('Sales')).rejects.toThrow('NEXT_REDIRECT')
    await expect(renameTeam('t1', 'Sales')).rejects.toThrow('NEXT_REDIRECT')
    await expect(setTeamActive('t1', false)).rejects.toThrow('NEXT_REDIRECT')
    expect(mockDb.transaction).not.toHaveBeenCalled()
  })

  it('creates a team in the admin’s own tenant with a tidied name', async () => {
    expect(await createTeam('  Sales   North ')).toEqual({ error: null })
    expect(chain.values).toHaveBeenCalledWith({ tenantId: 'tenant-1', name: 'Sales North' })
  })

  it('rejects blank and over-long names', async () => {
    expect((await createTeam('   ')).error).toMatch(/1–80/)
    expect((await createTeam('x'.repeat(81))).error).toMatch(/1–80/)
    expect(mockDb.transaction).not.toHaveBeenCalled()
  })

  it('rejects a duplicate name', async () => {
    chain.limit.mockResolvedValueOnce([{ id: 'existing' }])
    expect((await createTeam('Sales')).error).toMatch(/already exists/)
    expect(mockDb.transaction).not.toHaveBeenCalled()
  })

  it('retires rather than deletes, so history keeps its team', async () => {
    await setTeamActive('t1', false)
    expect(chain.set).toHaveBeenCalledWith(expect.objectContaining({ isActive: false }))
    expect(mockTx).not.toHaveProperty('delete')
  })
})
