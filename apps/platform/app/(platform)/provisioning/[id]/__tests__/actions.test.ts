import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  updateProvisioning,
  updateProvisioningService,
  addProvisioningServiceAttempt,
} from '../actions'

const { chain, state, mockTx, mockDb, mockRequireUser, mockSetAuditUser, mockRevalidatePath } =
  vi.hoisted(() => {
    const state = { thenValue: [] as unknown }
    const chain: any = {}
    for (const m of ['from', 'where', 'set', 'values', 'leftJoin', 'innerJoin', 'orderBy']) {
      chain[m] = vi.fn().mockReturnValue(chain)
    }
    chain.limit = vi.fn().mockResolvedValue([])
    chain.returning = vi.fn().mockResolvedValue([])
    chain.then = (r: any, j: any) => Promise.resolve(state.thenValue).then(r, j)
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

    return { chain, state, mockTx, mockDb, mockRequireUser, mockSetAuditUser, mockRevalidatePath }
  })

vi.mock('@roaring/db', () => ({
  db: mockDb,
  provisioning: {},
  provisioningServices: {},
  users: {},
}))
vi.mock('@roaring/auth', () => ({ requireUser: mockRequireUser, setAuditUser: mockSetAuditUser }))
vi.mock('next/cache', () => ({ revalidatePath: mockRevalidatePath, revalidateTag: vi.fn() }))
vi.mock('drizzle-orm', () => ({
  eq: vi.fn((...a: any[]) => ({ op: 'eq', a })),
  and: vi.fn((...a: any[]) => ({ op: 'and', a })),
  inArray: vi.fn((...a: any[]) => ({ op: 'inArray', a })),
}))

function setupMocks() {
  for (const m of ['from', 'where', 'set', 'values', 'leftJoin', 'innerJoin', 'orderBy'])
    chain[m].mockReturnValue(chain)
  // The record exists in the caller's tenant.
  chain.limit.mockResolvedValue([
    { id: 'prov-1', provisionerUserId: null, routerAssignedUserId: null },
  ])
  state.thenValue = [PROVISIONER]
  chain.returning.mockResolvedValue([])
  mockTx.update.mockReturnValue(chain)
  mockTx.insert.mockReturnValue(chain)
  mockTx.select.mockReturnValue(chain)
  mockDb.select.mockReturnValue(chain)
  mockDb.transaction.mockImplementation(async (cb: any) => cb(mockTx))
  mockRequireUser.mockResolvedValue({ id: 'user-id', tenantId: 'tenant-1' })
  mockSetAuditUser.mockResolvedValue(undefined)
}

const PROVISIONER = {
  id: 'prov-user',
  fullName: 'Pat Provisioner',
  isActive: true,
  approvalStatus: 'approved',
}

const baseProvData = {
  wc1Outcome: null,
  wc1Comments: null,
  wc2Outcome: null,
  wc2Comments: null,
  wc3Outcome: null,
  wc3Comments: null,
  status: 'in_progress',
  proposedLiveDate: null,
  dateOrdered: null,
  orderFaultRef: null,
  orderComments: null,
  provisionerUserId: null as string | null,
  routerAssignedUserId: null as string | null,
  lastCheckedAt: null,
  lastCheckedBy: null,
  routerDispatched: 'no',
  routerDispatchRef: null,
  routerTrackingNumber: null,
  routerOrderedDate: null,
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

describe('provisioning attribution and tenant checks', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    setupMocks()
  })

  it('refuses a provisioning record from another tenant', async () => {
    chain.limit.mockResolvedValue([])
    await expect(updateProvisioning('prov-x', baseProvData)).rejects.toThrow('not found')
    expect(mockDb.transaction).not.toHaveBeenCalled()
  })

  it('refuses a service from another tenant', async () => {
    chain.limit.mockResolvedValue([])
    await expect(updateProvisioningService('svc-x', baseServiceData)).rejects.toThrow('not found')
    expect(mockDb.transaction).not.toHaveBeenCalled()
  })

  it('refuses a retry on another tenant’s record', async () => {
    chain.limit.mockResolvedValue([])
    await expect(addProvisioningServiceAttempt('prov-x', 'bb', 1)).rejects.toThrow('not found')
    expect(mockDb.transaction).not.toHaveBeenCalled()
  })

  it('links the provisioner by id and snapshots the name for display', async () => {
    await updateProvisioning('prov-1', { ...baseProvData, provisionerUserId: 'prov-user' })
    expect(chain.set.mock.calls[0]?.[0]).toMatchObject({
      provisionerUserId: 'prov-user',
      provisioner: 'Pat Provisioner',
    })
  })

  it('keeps a legacy free-text provisioner when nobody is linked', async () => {
    await updateProvisioning('prov-1', baseProvData)
    const set = chain.set.mock.calls[0]?.[0]
    expect(set.provisionerUserId).toBeNull()
    expect(set).not.toHaveProperty('provisioner')
  })

  it('refuses a provisioner who is not an active employee of this tenant', async () => {
    state.thenValue = []
    await expect(
      updateProvisioning('prov-1', { ...baseProvData, provisionerUserId: 'stranger' })
    ).rejects.toThrow('Choose an employee')
    expect(mockDb.transaction).not.toHaveBeenCalled()
  })

  it('records the router assignee by id', async () => {
    await updateProvisioning('prov-1', { ...baseProvData, routerAssignedUserId: 'prov-user' })
    expect(chain.set.mock.calls[0]?.[0]).toMatchObject({ routerAssignedUserId: 'prov-user' })
  })
})
