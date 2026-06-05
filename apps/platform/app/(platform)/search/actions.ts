'use server'

import { db, customers, deals, provisioning, provisioningServices } from '@roaring/db'
import { eq, or, ilike, and } from 'drizzle-orm'

type SearchResult = {
  type: 'customer' | 'deal' | 'provisioning'
  id: string
  accountNumber: string
  title: string
  subtitle: string
  status: string | null
  href: string
}

export async function search(tenantId: string, query: string): Promise<SearchResult[]> {
  const q = `%${query}%`
  const results: SearchResult[] = []

  // Customers
  const customerRows = await db
    .select()
    .from(customers)
    .where(
      and(
        eq(customers.tenantId, tenantId),
        or(
          ilike(customers.accountNumber, q),
          ilike(customers.companyName, q),
          ilike(customers.firstName, q),
          ilike(customers.lastName, q),
          ilike(customers.email, q),
          ilike(customers.postcode, q),
          ilike(customers.mobile, q),
          ilike(customers.addressLine1, q)
        )
      )
    )
    .limit(20)

  for (const c of customerRows) {
    results.push({
      type: 'customer',
      id: c.id,
      accountNumber: c.accountNumber,
      title: c.companyName ?? `${c.firstName} ${c.lastName}`,
      subtitle: [c.addressLine1, c.addressLine2, c.postcode].filter(Boolean).join(', '),
      status: c.status,
      href: `/customers/${c.accountNumber}`,
    })
  }

  // Deals
  const dealRows = await db
    .select({
      id: deals.id,
      status: deals.status,
      dealType: deals.dealType,
      salesAgent: deals.salesAgent,
      closingAgent: deals.closingAgent,
      dealDate: deals.dealDate,
      accountNumber: customers.accountNumber,
      companyName: customers.companyName,
      firstName: customers.firstName,
      lastName: customers.lastName,
    })
    .from(deals)
    .leftJoin(customers, eq(deals.customerId, customers.id))
    .where(
      and(
        eq(deals.tenantId, tenantId),
        or(
          ilike(customers.accountNumber, q),
          ilike(customers.companyName, q),
          ilike(customers.firstName, q),
          ilike(customers.lastName, q),
          ilike(deals.salesAgent, q),
          ilike(deals.closingAgent, q),
          ilike(deals.softFacts, q)
        )
      )
    )
    .limit(20)

  for (const d of dealRows) {
    results.push({
      type: 'deal',
      id: d.id,
      accountNumber: d.accountNumber ?? '',
      title: d.companyName ?? `${d.firstName} ${d.lastName}`,
      subtitle: `${d.salesAgent} · ${d.dealDate ? new Date(d.dealDate).toLocaleDateString('en-GB') : ''}`,
      status: d.status,
      href: `/deals/${d.accountNumber}`,
    })
  }

  // Provisioning — search by reference
  // Provisioning — search by customer name/account
  const provRows = await db
    .select({
      id: provisioning.id,
      status: provisioning.status,
      provisioner: provisioning.provisioner,
      accountNumber: customers.accountNumber,
      companyName: customers.companyName,
      firstName: customers.firstName,
      lastName: customers.lastName,
    })
    .from(provisioning)
    .leftJoin(deals, eq(provisioning.dealId, deals.id))
    .leftJoin(customers, eq(deals.customerId, customers.id))
    .where(
      or(
        ilike(customers.accountNumber, q),
        ilike(customers.companyName, q),
        ilike(customers.firstName, q),
        ilike(customers.lastName, q)
      )
    )
    .limit(20)

  for (const p of provRows) {
    results.push({
      type: 'provisioning',
      id: p.id,
      accountNumber: p.accountNumber ?? '',
      title: p.companyName ?? `${p.firstName} ${p.lastName}`,
      subtitle: p.provisioner ? `Provisioner: ${p.provisioner}` : '',
      status: p.status,
      href: `/provisioning/${p.accountNumber}`,
    })
  }

  // Provisioning — also search by BB/WHC/NFON/MPF reference
  const provServiceRows = await db
    .select({
      id: provisioningServices.id,
      reference: provisioningServices.reference,
      serviceType: provisioningServices.serviceType,
      status: provisioningServices.status,
      provisioningId: provisioningServices.provisioningId,
    })
    .from(provisioningServices)
    .where(ilike(provisioningServices.reference, q))
    .limit(20)

  if (provServiceRows.length > 0) {
    const provIds = [...new Set(provServiceRows.map((r) => r.provisioningId))]
    for (const provId of provIds) {
      const prov = await db
        .select({
          id: provisioning.id,
          status: provisioning.status,
          accountNumber: customers.accountNumber,
          companyName: customers.companyName,
          firstName: customers.firstName,
          lastName: customers.lastName,
        })
        .from(provisioning)
        .leftJoin(deals, eq(provisioning.dealId, deals.id))
        .leftJoin(customers, eq(deals.customerId, customers.id))
        .where(eq(provisioning.id, provId))
        .limit(1)

      if (prov[0]) {
        const matchedServices = provServiceRows.filter((r) => r.provisioningId === provId)
        results.push({
          type: 'provisioning',
          id: prov[0].id,
          accountNumber: prov[0].accountNumber ?? '',
          title: prov[0].companyName ?? `${prov[0].firstName} ${prov[0].lastName}`,
          subtitle: matchedServices
            .map((s) => `${s.serviceType.toUpperCase()}: ${s.reference}`)
            .join(' · '),
          status: prov[0].status,
          href: `/provisioning/${prov[0].accountNumber}`,
        })
      }
    }
  }

  // Deduplicate by id+type
  const seen = new Set<string>()
  return results.filter((r) => {
    const key = `${r.type}-${r.id}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}
