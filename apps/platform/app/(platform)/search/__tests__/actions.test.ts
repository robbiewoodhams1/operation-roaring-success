import { describe, it, expect, vi, beforeEach } from 'vitest'
import { search } from '../actions'

const { chain, mockDb } = vi.hoisted(() => {
  const chain: any = {}
  for (const m of ['from', 'where', 'set', 'values', 'leftJoin', 'orderBy', 'select']) {
    chain[m] = vi.fn().mockReturnValue(chain)
  }
  chain.limit = vi.fn().mockResolvedValue([])
  chain.returning = vi.fn().mockResolvedValue([])
  chain.then = (r: any, j: any) => Promise.resolve(undefined).then(r, j)
  chain.catch = (j: any) => Promise.resolve(undefined).catch(j)
  chain.finally = (f: any) => Promise.resolve(undefined).finally(f)

  const mockDb = {
    select: vi.fn().mockReturnValue(chain),
    transaction: vi.fn(),
  }

  return { chain, mockDb }
})

vi.mock('@roaring/db', () => ({
  db: mockDb,
  customers: {},
  deals: {},
  provisioning: {},
  provisioningServices: {},
}))
vi.mock('drizzle-orm', () => ({
  eq: vi.fn((...a: any[]) => ({ op: 'eq', a })),
  or: vi.fn((...a: any[]) => ({ op: 'or', a })),
  and: vi.fn((...a: any[]) => ({ op: 'and', a })),
  ilike: vi.fn((...a: any[]) => ({ op: 'ilike', a })),
}))

function setupMocks() {
  for (const m of ['from', 'where', 'set', 'values', 'leftJoin', 'orderBy', 'select']) {
    chain[m].mockReturnValue(chain)
  }
  chain.limit.mockResolvedValue([])
  mockDb.select.mockReturnValue(chain)
}

describe('search', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    setupMocks()
  })

  it('returns an empty array when no records match', async () => {
    const results = await search('tenant-1', 'nothing')
    expect(results).toEqual([])
  })

  it('maps customer rows to SearchResult with type "customer"', async () => {
    const customerRow = {
      id: 'cust-1',
      accountNumber: 'DFB20001',
      companyName: 'ACME Corp',
      firstName: 'John',
      lastName: 'Doe',
      addressLine1: '1 Main St',
      addressLine2: null,
      postcode: 'SW1A 1AA',
      status: 'active',
      email: null,
      mobile: null,
    }
    // first limit call → customers, rest → empty
    chain.limit.mockResolvedValueOnce([customerRow]).mockResolvedValue([])

    const results = await search('tenant-1', 'ACME')

    expect(results).toHaveLength(1)
    expect(results[0]).toMatchObject({
      type: 'customer',
      id: 'cust-1',
      accountNumber: 'DFB20001',
      title: 'ACME Corp',
      href: '/customers/DFB20001',
      status: 'active',
    })
  })

  it('maps deal rows to SearchResult with type "deal"', async () => {
    const dealRow = {
      id: 'deal-1',
      status: 'pending',
      dealType: 'business',
      salesAgent: 'Agent Smith',
      closingAgent: 'Closer Jones',
      dealDate: '2024-01-15',
      accountNumber: 'DFB20001',
      companyName: 'ACME Corp',
      firstName: 'John',
      lastName: 'Doe',
    }
    // customers → empty, deals → row, rest → empty
    chain.limit.mockResolvedValueOnce([]).mockResolvedValueOnce([dealRow]).mockResolvedValue([])

    const results = await search('tenant-1', 'Agent')

    expect(results).toHaveLength(1)
    expect(results[0]).toMatchObject({
      type: 'deal',
      id: 'deal-1',
      accountNumber: 'DFB20001',
      title: 'ACME Corp',
      href: '/deals/DFB20001',
      status: 'pending',
    })
  })

  it('maps provisioning rows to SearchResult with type "provisioning"', async () => {
    const provRow = {
      id: 'prov-1',
      status: 'in_progress',
      provisioner: 'Bob',
      accountNumber: 'DFB20001',
      companyName: 'ACME Corp',
      firstName: 'John',
      lastName: 'Doe',
    }
    // customers → empty, deals → empty, provisioning → row, services → empty
    chain.limit
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([provRow])
      .mockResolvedValue([])

    const results = await search('tenant-1', 'Bob')

    expect(results).toHaveLength(1)
    expect(results[0]).toMatchObject({
      type: 'provisioning',
      id: 'prov-1',
      accountNumber: 'DFB20001',
      href: '/provisioning/DFB20001',
    })
  })

  it('deduplicates results with the same type and id', async () => {
    const provRow = {
      id: 'prov-1',
      status: 'in_progress',
      provisioner: 'Bob',
      accountNumber: 'DFB20001',
      companyName: 'ACME',
      firstName: 'J',
      lastName: 'D',
    }
    const serviceRow = {
      id: 'svc-1',
      reference: 'REF-001',
      serviceType: 'bb',
      status: 'ordered',
      provisioningId: 'prov-1',
    }
    // customers → [], deals → [], provisioning → [provRow], services → [serviceRow]
    // then service lookup → [provRow] again (same prov-1)
    chain.limit
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([provRow])
      .mockResolvedValueOnce([serviceRow])
      .mockResolvedValueOnce([provRow]) // nested lookup for service

    const results = await search('tenant-1', 'REF-001')

    const provResults = results.filter((r) => r.type === 'provisioning' && r.id === 'prov-1')
    expect(provResults).toHaveLength(1)
  })

  it('falls back to first + last name when companyName is null', async () => {
    const customerRow = {
      id: 'cust-2',
      accountNumber: 'DFB20002',
      companyName: null,
      firstName: 'Jane',
      lastName: 'Smith',
      addressLine1: null,
      addressLine2: null,
      postcode: null,
      status: 'prospect',
      email: null,
      mobile: null,
    }
    chain.limit.mockResolvedValueOnce([customerRow]).mockResolvedValue([])

    const results = await search('tenant-1', 'Jane')

    expect(results[0].title).toBe('Jane Smith')
  })
})
