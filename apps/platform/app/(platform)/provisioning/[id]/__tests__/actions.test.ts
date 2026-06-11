import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  updateProvisioning,
  updateProvisioningService,
  addProvisioningServiceAttempt,
} from '../actions'

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

vi.mock('@roaring/db', () => ({
  db: mockDb,
  provisioning: {},
  provisioningServices: {},
}))
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

const baseProvData = {
  wc1Outcome: null,
  wc1Comments: null,
  wc2Outcome: null,
  wc2Comments: null,
  status: 'in_progress',
  proposedLiveDate: null,
  dateOrdered: null,
  orderFaultRef: null,
  orderComments: null,
  provisioner: null,
  lastCheckedAt: null,
  lastCheckedBy: null,
  routerDispatched: false,
  routerDispatchRef: null,
  routerTrackingNumber: null,
}

const baseServiceData = {
  status: 'ordered',
  reference: 'REF-001',
  dateOrdered: null,
  liveDate: null,
  lastCheckedAt: null,
  cancelledDate: null,
  cancelledBy: null,
  cancellationReason: null,
  delayedDate: null,
  presumedSolveDate: null,
  delayReason: null,
  notes: null,
}

describe('updateProvisioning', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    setupMocks()
  })

  it('calls requireUser to gate the action', async () => {
    await updateProvisioning('prov-1', baseProvData)
    expect(mockRequireUser).toHaveBeenCalledOnce()
  })

  it('runs the update inside a transaction', async () => {
    await updateProvisioning('prov-1', baseProvData)
    expect(mockDb.transaction).toHaveBeenCalledOnce()
    expect(mockTx.update).toHaveBeenCalled()
  })

  it('revalidates /provisioning', async () => {
    await updateProvisioning('prov-1', baseProvData)
    expect(mockRevalidatePath).toHaveBeenCalledWith('/provisioning')
  })

  it('propagates requireUser errors', async () => {
    mockRequireUser.mockRejectedValue(new Error('Unauthorized'))
    await expect(updateProvisioning('prov-1', baseProvData)).rejects.toThrow('Unauthorized')
    expect(mockDb.transaction).not.toHaveBeenCalled()
  })
})

describe('updateProvisioningService', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    setupMocks()
  })

  it('calls requireUser to gate the action', async () => {
    await updateProvisioningService('svc-1', baseServiceData)
    expect(mockRequireUser).toHaveBeenCalledOnce()
  })

  it('runs the update inside a transaction', async () => {
    await updateProvisioningService('svc-1', baseServiceData)
    expect(mockDb.transaction).toHaveBeenCalledOnce()
    expect(mockTx.update).toHaveBeenCalled()
  })

  it('revalidates /provisioning', async () => {
    await updateProvisioningService('svc-1', baseServiceData)
    expect(mockRevalidatePath).toHaveBeenCalledWith('/provisioning')
  })

  it('propagates requireUser errors', async () => {
    mockRequireUser.mockRejectedValue(new Error('Unauthorized'))
    await expect(updateProvisioningService('svc-1', baseServiceData)).rejects.toThrow(
      'Unauthorized'
    )
    expect(mockDb.transaction).not.toHaveBeenCalled()
  })
})

describe('addProvisioningServiceAttempt', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    setupMocks()
  })

  it('calls requireUser to gate the action', async () => {
    await addProvisioningServiceAttempt('prov-1', 'bb', 1)
    expect(mockRequireUser).toHaveBeenCalledOnce()
  })

  it('inserts a new provisioning service inside a transaction', async () => {
    await addProvisioningServiceAttempt('prov-1', 'bb', 1)
    expect(mockDb.transaction).toHaveBeenCalledOnce()
    expect(mockTx.insert).toHaveBeenCalled()
  })

  it('revalidates /provisioning', async () => {
    await addProvisioningServiceAttempt('prov-1', 'bb', 1)
    expect(mockRevalidatePath).toHaveBeenCalledWith('/provisioning')
  })

  it('propagates requireUser errors', async () => {
    mockRequireUser.mockRejectedValue(new Error('Unauthorized'))
    await expect(addProvisioningServiceAttempt('prov-1', 'bb', 1)).rejects.toThrow('Unauthorized')
    expect(mockDb.transaction).not.toHaveBeenCalled()
  })
})
