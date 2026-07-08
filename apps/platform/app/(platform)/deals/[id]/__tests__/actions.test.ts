import { describe, it, expect, vi, beforeEach } from 'vitest'
import { updateDeal } from '../actions'

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
  deals: {},
  dealServices: {},
  dealPricing: {},
  dealBilling: {},
  customers: {},
}))
vi.mock('@roaring/auth', () => ({ requireUser: mockRequireUser, setAuditUser: mockSetAuditUser }))
vi.mock('next/cache', () => ({ revalidatePath: mockRevalidatePath, revalidateTag: vi.fn() }))
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

const baseData = {
  dealId: 'deal-1',
  customerId: 'cust-1',
  salesAgent: 'Agent Smith',
  closingAgent: 'Closer Jones',
  dealType: 'business',
  dealDate: '2024-01-15',
  welcomeCall: 'yes',
  tradingAddress: null,
  softFacts: null,
  servicesId: 'svc-1',
  lineChecked: true,
  connectionFee: null,
  broadbandType: 'fttc',
  installType: null,
  ontSerialNumber: null,
  normalSpeed: '80',
  minSpeed: '20',
  maxSpeed: '80',
  voiceRequired: true,
  currentVoiceType: null,
  lineConfiguration: null,
  numLicenses: null,
  voiceOption: null,
  callTariff: null,
  existingHandsets: null,
  intlPackage: null,
  intlLocation: null,
  premiumPackage: null,
  pricingId: 'price-1',
  bundlePrice: '35',
  wholesaleCost: '10',
  monthlyGp: '25',
  connectionFeePricing: null,
  billAmountLosingSupplier: null,
  contractLength: null,
  contractLengthOther: null,
  billingId: 'bill-1',
  billingType: null,
  paymentMethod: null,
  phoneProvider: null,
  broadbandProvider: null,
  invoiceName: null,
  bankBranch: null,
  sortCode: null,
  accountNumberBilling: null,
  bankChecked: false,
  companyName: 'ACME',
  title: 'Mr',
  firstName: 'John',
  lastName: 'Doe',
  mobile: null,
  email: null,
  addressLine1: null,
  addressLine2: null,
  addressLine3: null,
  addressLine4: null,
  postcode: null,
  customerType: 'business',
  customerStatus: 'active',
}

describe('updateDeal', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    setupMocks()
  })

  it('calls requireUser to gate the action', async () => {
    await updateDeal(baseData)
    expect(mockRequireUser).toHaveBeenCalledOnce()
  })

  it('runs all five updates inside a single transaction', async () => {
    await updateDeal(baseData)
    expect(mockDb.transaction).toHaveBeenCalledOnce()
    // deals + dealServices + dealPricing + dealBilling + customers
    expect(mockTx.update).toHaveBeenCalledTimes(5)
  })

  it('calls setAuditUser inside the transaction', async () => {
    await updateDeal(baseData)
    expect(mockSetAuditUser).toHaveBeenCalledWith(mockTx, 'user-id')
  })

  it('revalidates /deals and /customers', async () => {
    await updateDeal(baseData)
    expect(mockRevalidatePath).toHaveBeenCalledWith('/deals')
    expect(mockRevalidatePath).toHaveBeenCalledWith('/customers')
  })

  it('propagates requireUser errors without running the transaction', async () => {
    mockRequireUser.mockRejectedValue(new Error('Unauthorized'))
    await expect(updateDeal(baseData)).rejects.toThrow('Unauthorized')
    expect(mockDb.transaction).not.toHaveBeenCalled()
  })
})
