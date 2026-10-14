import { describe, it, expect, vi, beforeEach } from 'vitest'
import { submitDeal } from '../actions'

const { chain, state, mockTx, mockDb, mockRequireUser, mockSetAuditUser, mockRedirect } =
  vi.hoisted(() => {
    // What an awaited query chain without .limit()/.returning() resolves to —
    // the agent lookup reads it.
    const state = { thenValue: [] as unknown }
    const chain: any = {}
    for (const m of ['from', 'where', 'set', 'values', 'leftJoin', 'orderBy']) {
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
    const mockRedirect = vi.fn()

    return { chain, state, mockTx, mockDb, mockRequireUser, mockSetAuditUser, mockRedirect }
  })

vi.mock('@roaring/db', () => ({
  db: mockDb,
  customers: {},
  users: {},
  deals: {},
  dealServices: {},
  dealPricing: {},
  dealBilling: {},
  provisioning: {},
  provisioningServices: {},
}))
vi.mock('@roaring/auth', () => ({ requireUser: mockRequireUser, setAuditUser: mockSetAuditUser }))
// Settings come from their own query — stub them so they don't consume the
// shared db chain mocks, which would shift every mockResolvedValueOnce below.
vi.mock('@/lib/settings', () => ({
  SETTINGS_TAG: 'platform-settings',
  // A plain function, not a spy — the suite resets mocks between tests.
  getSettings: async () => ({
    app: {
      name: 'Roaring Success',
      title: 'T',
      description: 'D',
      loginTagline: 'L',
    },
    support: {
      residential: { businessName: 'R', phone: '1', email: 'r@example.com' },
      business: { businessName: 'B', phone: '2', email: 'b@example.com' },
    },
    accountNumber: { prefix: 'DFB', startNumber: 20001 },
    ui: { pageSize: 50 },
  }),
}))
vi.mock('next/navigation', () => ({ redirect: mockRedirect }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn(), revalidateTag: vi.fn() }))
vi.mock('drizzle-orm', () => ({
  eq: vi.fn((...a: any[]) => ({ op: 'eq', a })),
  and: vi.fn((...a: any[]) => ({ op: 'and', a })),
  like: vi.fn((...a: any[]) => ({ op: 'like', a })),
  desc: vi.fn((...a: any[]) => ({ op: 'desc', a })),
  gte: vi.fn((...a: any[]) => ({ op: 'gte', a })),
  inArray: vi.fn((...a: any[]) => ({ op: 'inArray', a })),
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
  mockRequireUser.mockResolvedValue({ id: 'user-id', tenantId: 'tenant-1' })
  mockSetAuditUser.mockResolvedValue(undefined)
  state.thenValue = [SALES, CLOSER]
}

const SALES = { id: '11111111-1111-4111-8111-111111111111', fullName: 'Agent Smith' }
const CLOSER = { id: '22222222-2222-4222-8222-222222222222', fullName: 'Closer Jones' }
const SUBMISSION_KEY = '33333333-3333-4333-8333-333333333333'

/** The values object passed to the deals insert (second insert when a customer is created). */
function dealInsertValues(withNewCustomer = true) {
  return chain.values.mock.calls[withNewCustomer ? 1 : 0]?.[0]
}

const baseData = {
  existingCustomerId: null,
  submissionKey: SUBMISSION_KEY,
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
  salesAgentId: SALES.id,
  closingAgentId: CLOSER.id,
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
    chain.limit.mockResolvedValueOnce([]).mockResolvedValueOnce([{ id: 'existing-cust-id' }])
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
    chain.limit.mockResolvedValueOnce([]).mockResolvedValueOnce([{ id: 'existing-cust-id' }])
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
    chain.limit
      .mockResolvedValueOnce([]) // no earlier submission with this key
      .mockResolvedValueOnce([{ id: 'existing-cust' }]) // clash lookup

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
    chain.limit.mockResolvedValueOnce([]).mockResolvedValueOnce([{ id: 'existing-cust-id' }])
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

  // ── Attribution ───────────────────────────────────────────────────────────

  it('takes the tenant and creator from the session, never the payload', async () => {
    chain.returning
      .mockResolvedValueOnce([{ id: 'cust-id' }])
      .mockResolvedValueOnce([{ id: 'deal-id' }])
      .mockResolvedValueOnce([{ id: 'prov-id' }])

    await submitDeal({ ...baseData, tenantId: 'forged-tenant', createdBy: 'forged-user' } as any)

    expect(dealInsertValues()).toMatchObject({ tenantId: 'tenant-1', createdBy: 'user-id' })
    expect(chain.values.mock.calls[0]?.[0]).toMatchObject({
      tenantId: 'tenant-1',
      createdBy: 'user-id',
    })
  })

  it('records the selected agents by id, with their names as a snapshot', async () => {
    chain.returning
      .mockResolvedValueOnce([{ id: 'cust-id' }])
      .mockResolvedValueOnce([{ id: 'deal-id' }])
      .mockResolvedValueOnce([{ id: 'prov-id' }])

    await submitDeal(baseData)

    expect(dealInsertValues()).toMatchObject({
      salesAgentId: SALES.id,
      salesAgent: 'Agent Smith',
      closingAgentId: CLOSER.id,
      closingAgent: 'Closer Jones',
      submissionKey: SUBMISSION_KEY,
    })
  })

  it('accepts the same employee as both sales and closing agent', async () => {
    state.thenValue = [SALES]
    chain.returning
      .mockResolvedValueOnce([{ id: 'cust-id' }])
      .mockResolvedValueOnce([{ id: 'deal-id' }])
      .mockResolvedValueOnce([{ id: 'prov-id' }])

    await submitDeal({ ...baseData, closingAgentId: SALES.id })

    expect(dealInsertValues()).toMatchObject({ salesAgentId: SALES.id, closingAgentId: SALES.id })
  })

  it('rejects an agent who is not an active employee of this tenant', async () => {
    state.thenValue = [SALES] // the closer is not among the tenant's active staff

    const result = await submitDeal(baseData)

    expect(result).toEqual({ error: 'Choose a sales agent and a closing agent from the list.' })
    expect(mockDb.transaction).not.toHaveBeenCalled()
  })

  it('rejects a free-text agent name in place of an id', async () => {
    const result = await submitDeal({ ...baseData, salesAgentId: 'Agent Smith' })
    expect(result?.error).toMatch(/sales agent/)
    expect(mockDb.transaction).not.toHaveBeenCalled()
  })

  // ── Duplicate submissions ─────────────────────────────────────────────────

  it('sends a resubmitted form to the deal it already created', async () => {
    mockRedirect.mockImplementation(() => {
      throw new Error('NEXT_REDIRECT')
    })
    chain.limit.mockResolvedValueOnce([{ id: 'deal-from-first-click' }])

    await expect(submitDeal(baseData)).rejects.toThrow('NEXT_REDIRECT')

    expect(mockRedirect).toHaveBeenCalledWith('/deals/deal-from-first-click')
    expect(mockDb.transaction).not.toHaveBeenCalled()
  })

  it('lands on the winning deal when two identical submissions race', async () => {
    const violation = Object.assign(new Error('duplicate key'), {
      code: '23505',
      constraint_name: 'deals_tenant_submission_key',
    })
    mockDb.transaction.mockRejectedValueOnce(violation)
    chain.limit
      .mockResolvedValueOnce([]) // not yet submitted when checked
      .mockResolvedValueOnce([{ id: 'winning-deal' }]) // lookup after the conflict

    await submitDeal(baseData)

    expect(mockRedirect).toHaveBeenCalledWith('/deals/winning-deal')
  })

  it('rethrows database errors that are not a duplicate submission', async () => {
    mockDb.transaction.mockRejectedValueOnce(new Error('connection lost'))
    await expect(submitDeal(baseData)).rejects.toThrow('connection lost')
  })

  it('refuses a form without a valid submission key', async () => {
    const result = await submitDeal({ ...baseData, submissionKey: 'not-a-uuid' })
    expect(result?.error).toMatch(/expired/)
    expect(mockDb.transaction).not.toHaveBeenCalled()
  })

  it('refuses an existing customer from another tenant', async () => {
    chain.limit.mockResolvedValueOnce([]).mockResolvedValueOnce([])

    const result = await submitDeal({ ...baseData, existingCustomerId: 'other-tenant-cust' })

    expect(result).toEqual({ error: 'That customer could not be found.' })
    expect(mockDb.transaction).not.toHaveBeenCalled()
  })
})
