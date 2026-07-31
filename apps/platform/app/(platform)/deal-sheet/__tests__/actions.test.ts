import { describe, it, expect, vi, beforeEach } from 'vitest'
import { submitDeal } from '../actions'

const { chain, mockTx, mockDb, mockRequireUser, mockSetAuditUser, mockRedirect } = vi.hoisted(
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
    const mockRedirect = vi.fn()

    return { chain, mockTx, mockDb, mockRequireUser, mockSetAuditUser, mockRedirect }
  }
)

vi.mock('@roaring/db', () => ({
  db: mockDb,
  customers: {},
  deals: {},
  dealServices: {},
  dealPricing: {},
  dealBilling: {},
  provisioning: {},
  provisioningServices: {},
}))
vi.mock('@roaring/auth', () => ({ requireUser: mockRequireUser, setAuditUser: mockSetAuditUser }))
vi.mock('next/navigation', () => ({ redirect: mockRedirect }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn(), revalidateTag: vi.fn() }))
vi.mock('drizzle-orm', () => ({
  eq: vi.fn((...a: any[]) => ({ op: 'eq', a })),
  and: vi.fn((...a: any[]) => ({ op: 'and', a })),
  like: vi.fn((...a: any[]) => ({ op: 'like', a })),
  desc: vi.fn((...a: any[]) => ({ op: 'desc', a })),
  gte: vi.fn((...a: any[]) => ({ op: 'gte', a })),
  sql: Object.assign(vi.fn().mockReturnValue({}), { raw: vi.fn().mockReturnValue({}) }),
}))

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

const baseData = {
  existingCustomerId: null,
  tenantId: 'tenant-1',
  createdBy: 'user-1',
  businessName: 'ACME Corp',
  customerTitle: 'Mr',
  customerFirstName: 'John',
  customerLastName: 'Doe',
  mobile: '07123456789',
  landline: '',
  email: 'john@acme.com',
  postcode: 'SW1A 1AA',
  address1: '10 Downing St',
  town: 'London',
  county: 'Greater London',
  dealType: 'Business',
  date: '2024-01-15',
  salesAgent: 'Agent Smith',
  closingAgent: 'Closer Jones',
  tradingAddress: '',
  softFacts: '',
  welcomeCall: 'Yes',
  lineChecked: true,
  connectionFee: '£50',
  connectionFeeOther: '',
  voice: true,
  currentVoiceType: 'analogue',
  lineType: 'Single Line',
  numLicenses: '2',
  existingHandsets: '',
  voiceOption: 'NFON',
  callTariff: 'Standard',
  bbType: 'FTTC',
  installType: 'New Install',
  serialNumber: 'SN123',
  normalBbSpeed: '80',
  minSpeed: '20',
  maxSpeed: '80',
  intlPackage: '',
  intlPackageOther: '',
  intlLocation: '',
  intlLocationOther: '',
  premiumPackage: '',
  premiumOther: '',
  phoneEquipment: [] as { item: string; qty: number; wholesale: number }[],
  bbCost: '10',
  bundlePrice: '35',
  monthlyGp: '25',
  billAmount: '50',
  contractLength: '24 Months',
  contractLengthOther: '',
  billingType: 'Email',
  paymentMethod: 'DD',
  emailAddress: 'john@acme.com',
  phoneProvider: 'BT',
  broadbandProvider: 'BT',
  ddCollected: true,
  invoiceName: 'John Doe',
  bankBranch: 'Barclays',
  sortCode: '12-34-56',
  accountNumber: '12345678',
  bankChecked: true,
}

describe('submitDeal', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    setupMocks()
  })

  it('calls requireUser to gate the action', async () => {
    chain.returning
      .mockResolvedValueOnce([{ id: 'cust-id' }])
      .mockResolvedValueOnce([{ id: 'deal-id' }])
      .mockResolvedValueOnce([{ id: 'prov-id' }])

    await submitDeal(baseData)
    expect(mockRequireUser).toHaveBeenCalledOnce()
  })

  it('runs everything inside a single transaction', async () => {
    chain.returning
      .mockResolvedValueOnce([{ id: 'cust-id' }])
      .mockResolvedValueOnce([{ id: 'deal-id' }])
      .mockResolvedValueOnce([{ id: 'prov-id' }])

    await submitDeal(baseData)
    expect(mockDb.transaction).toHaveBeenCalledOnce()
  })

  it('creates a new customer when existingCustomerId is null', async () => {
    chain.returning
      .mockResolvedValueOnce([{ id: 'cust-id' }])
      .mockResolvedValueOnce([{ id: 'deal-id' }])
      .mockResolvedValueOnce([{ id: 'prov-id' }])

    await submitDeal(baseData)

    // insert called for: customers, deals, dealServices, dealPricing, dealBilling, provisioning, provisioningServices
    expect(mockTx.insert).toHaveBeenCalledTimes(7)
  })

  it('skips customer insert when existingCustomerId is provided', async () => {
    chain.returning
      .mockResolvedValueOnce([{ id: 'deal-id' }])
      .mockResolvedValueOnce([{ id: 'prov-id' }])

    await submitDeal({ ...baseData, existingCustomerId: 'existing-cust-id' })

    // insert called for: deals, dealServices, dealPricing, dealBilling, provisioning, provisioningServices
    expect(mockTx.insert).toHaveBeenCalledTimes(6)
  })

  it('redirects to /deals/<dealId> after success', async () => {
    chain.returning
      .mockResolvedValueOnce([{ id: 'cust-id' }])
      .mockResolvedValueOnce([{ id: 'deal-id' }])
      .mockResolvedValueOnce([{ id: 'prov-id' }])

    await submitDeal(baseData)
    expect(mockRedirect).toHaveBeenCalledWith('/deals/deal-id')
  })

  it('redirects to the new deal id when using an existing customer', async () => {
    chain.returning
      .mockResolvedValueOnce([{ id: 'deal-id' }])
      .mockResolvedValueOnce([{ id: 'prov-id' }])

    await submitDeal({ ...baseData, existingCustomerId: 'existing-cust-id' })
    expect(mockRedirect).toHaveBeenCalledWith('/deals/deal-id')
  })

  it('uses a manual account number when one is supplied', async () => {
    chain.returning
      .mockResolvedValueOnce([{ id: 'cust-id' }])
      .mockResolvedValueOnce([{ id: 'deal-id' }])
      .mockResolvedValueOnce([{ id: 'prov-id' }])

    await submitDeal({ ...baseData, customerAccountNumber: 'ACME-99' })

    expect(chain.values.mock.calls[0]?.[0]).toMatchObject({ accountNumber: 'ACME-99' })
  })

  it('uppercases and trims a manual account number', async () => {
    chain.returning
      .mockResolvedValueOnce([{ id: 'cust-id' }])
      .mockResolvedValueOnce([{ id: 'deal-id' }])
      .mockResolvedValueOnce([{ id: 'prov-id' }])

    await submitDeal({ ...baseData, customerAccountNumber: '  acme-99  ' })

    expect(chain.values.mock.calls[0]?.[0]).toMatchObject({ accountNumber: 'ACME-99' })
  })

  it('falls back to the generated sequence when left blank', async () => {
    chain.returning
      .mockResolvedValueOnce([{ id: 'cust-id' }])
      .mockResolvedValueOnce([{ id: 'deal-id' }])
      .mockResolvedValueOnce([{ id: 'prov-id' }])

    await submitDeal({ ...baseData, customerAccountNumber: '' })

    expect(chain.values.mock.calls[0]?.[0]).toMatchObject({ accountNumber: 'DFB20001' })
  })

  it('rejects a manual account number that is already in use', async () => {
    chain.limit.mockResolvedValueOnce([{ id: 'existing-cust' }]) // clash lookup

    const result = await submitDeal({ ...baseData, customerAccountNumber: 'DFB20001' })

    expect(result).toEqual({ error: 'Account number DFB20001 is already in use.' })
    expect(mockDb.transaction).not.toHaveBeenCalled()
    expect(mockRedirect).not.toHaveBeenCalled()
  })

  it('rejects a malformed manual account number', async () => {
    const result = await submitDeal({ ...baseData, customerAccountNumber: 'has spaces' })

    expect(result?.error).toMatch(/3–32 letters/)
    expect(mockDb.transaction).not.toHaveBeenCalled()
  })

  it('ignores a manual account number when using an existing customer', async () => {
    chain.returning
      .mockResolvedValueOnce([{ id: 'deal-id' }])
      .mockResolvedValueOnce([{ id: 'prov-id' }])

    await submitDeal({
      ...baseData,
      existingCustomerId: 'existing-cust-id',
      customerAccountNumber: 'ACME-99',
    })

    // no customer insert, so no account number is written
    expect(mockTx.insert).toHaveBeenCalledTimes(6)
    expect(mockRedirect).toHaveBeenCalledWith('/deals/deal-id')
  })

  it('propagates requireUser errors without starting the transaction', async () => {
    mockRequireUser.mockRejectedValue(new Error('Unauthorized'))
    await expect(submitDeal(baseData)).rejects.toThrow('Unauthorized')
    expect(mockDb.transaction).not.toHaveBeenCalled()
  })

  it('throws if the customers insert returns no row', async () => {
    chain.returning.mockResolvedValue([]) // all returning calls return []
    await expect(submitDeal(baseData)).rejects.toThrow('Failed to create customer')
  })
})
