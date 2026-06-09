'use server'

import {
  db,
  customers,
  deals,
  dealServices,
  dealPricing,
  dealBilling,
  provisioning,
  provisioningServices,
} from '@roaring/db'
import { eq, desc, like, sql, and, gte } from 'drizzle-orm'
import { redirect } from 'next/navigation'
import { requireUser, setAuditUser } from '@roaring/auth'

function generateNextAccountNumber(latest: string | null): string {
  if (!latest) return 'DFB20001'
  const num = parseInt(latest.replace(/^[A-Z]+/, ''))
  if (isNaN(num)) return 'DFB20001'
  return `DFB${num + 1}`
}

function parseConnectionFee(fee: string, other: string): string | null {
  if (!fee) return null
  if (fee === 'Other') return other || null
  return fee.replace('£', '').trim() || null
}

const lineConfigMap: Record<string, string> = {
  'Single Line': 'single',
  'Multi Line': 'multi',
  'MPF (Already has Broadband)': 'mpf',
}

const installTypeMap: Record<string, string> = {
  'New Install': 'new_install',
  Migration: 'migration',
}

const contractLengthMap: Record<string, string> = {
  '24 Months': '24_months',
  '36 Months': '36_months',
  '48 Months': '48_months',
  Other: 'other',
}

const paymentMethodMap: Record<string, string> = {
  DD: 'dd',
  Mandate: 'mandate',
  'Card / Bacs': 'card_bacs',
}

const billingTypeMap: Record<string, string> = {
  Paper: 'paper',
  Email: 'email',
}

export async function submitDeal(data: {
  existingCustomerId: string | null
  tenantId: string
  createdBy: string
  businessName: string
  customerFirstName: string
  customerLastName: string
  mobile: string
  landline: string
  email: string
  postcode: string
  address1: string
  town: string
  county: string
  dealType: string
  date: string
  salesAgent: string
  closingAgent: string
  tradingAddress: string
  softFacts: string
  welcomeCall: string
  lineChecked: boolean
  connectionFee: string
  connectionFeeOther: string
  voice: boolean
  currentVoiceType: string
  lineType: string
  numLicenses: string
  existingHandsets: string
  voiceOption: string
  callTariff: string
  bbType: string
  installType: string
  serialNumber: string
  normalBbSpeed: string
  minSpeed: string
  maxSpeed: string
  intlPackage: string
  intlPackageOther: string
  intlLocation: string
  intlLocationOther: string
  premiumPackage: string
  premiumOther: string
  phoneEquipment: { item: string; qty: number; wholesale: number }[]
  bbCost: string
  bundlePrice: string
  monthlyGp: string
  billAmount: string
  contractLength: string
  contractLengthOther: string
  billingType: string
  paymentMethod: string
  emailAddress: string
  phoneProvider: string
  broadbandProvider: string
  ddCollected: boolean
  invoiceName: string
  bankBranch: string
  sortCode: string
  accountNumber: string
  bankChecked: boolean
}) {
  let customerId: string = ''
  let accountNumber: string = ''

  const parsedConnectionFee = parseConnectionFee(data.connectionFee, data.connectionFeeOther)
  const user = await requireUser()

  await db.transaction(async (tx) => {
    await setAuditUser(tx, user.id)

    // Step 1 — customer
    if (data.existingCustomerId) {
      customerId = data.existingCustomerId
      const existing = await tx
        .select()
        .from(customers)
        .where(eq(customers.id, data.existingCustomerId))
        .limit(1)
      accountNumber = existing[0]?.accountNumber ?? ''
    } else {
      const latest = await tx
        .select({ accountNumber: customers.accountNumber })
        .from(customers)
        .where(
          and(
            like(customers.accountNumber, 'DFB2%'),
            gte(sql`CAST(SUBSTRING(${customers.accountNumber} FROM 4) AS INTEGER)`, 20001)
          )
        )
        .orderBy(desc(sql`CAST(SUBSTRING(${customers.accountNumber} FROM 4) AS INTEGER)`))
        .limit(1)

      accountNumber = generateNextAccountNumber(latest[0]?.accountNumber ?? null)

      const [newCustomer] = await tx
        .insert(customers)
        .values({
          tenantId: data.tenantId,
          accountNumber,
          type: data.dealType.toLowerCase() as any,
          companyName: data.businessName || null,
          firstName: data.customerFirstName,
          lastName: data.customerLastName,
          mobile: data.mobile || null,
          email: data.email || null,
          addressLine1: data.address1 || null,
          addressLine2: data.town || null,
          addressLine3: data.county || null,
          postcode: data.postcode || null,
          status: 'prospect',
          createdBy: data.createdBy,
        })
        .returning({ id: customers.id })

      if (!newCustomer) throw new Error('Failed to create customer')
      customerId = newCustomer.id
    }

    // Step 2 — deal
    const [newDeal] = await tx
      .insert(deals)
      .values({
        tenantId: data.tenantId,
        customerId,
        salesAgent: data.salesAgent,
        closingAgent: data.closingAgent,
        dealType: data.dealType.toLowerCase() as any,
        status: 'pending',
        tradingAddress: data.tradingAddress || null,
        softFacts: data.softFacts || null,
        dealDate: data.date,
        welcomeCall: data.welcomeCall.toLowerCase() as any,
        createdBy: data.createdBy,
      })
      .returning({ id: deals.id })

    if (!newDeal) throw new Error('Failed to create deal')
    const dealId = newDeal.id

    // Step 3 — deal services
    await tx.insert(dealServices).values({
      dealId,
      lineChecked: data.lineChecked,
      connectionFee: parsedConnectionFee,
      broadbandType: data.bbType || null,
      installType: data.installType ? ((installTypeMap[data.installType] as any) ?? null) : null,
      ontSerialNumber: data.serialNumber || null,
      normalSpeed: data.normalBbSpeed || null,
      minSpeed: data.minSpeed || null,
      maxSpeed: data.maxSpeed || null,
      voiceRequired: data.voice,
      currentVoiceType: data.currentVoiceType || null,
      lineConfiguration: data.lineType ? ((lineConfigMap[data.lineType] as any) ?? null) : null,
      numLicenses: data.numLicenses ? parseInt(data.numLicenses) : null,
      voiceOption: data.voiceOption ? (data.voiceOption.toLowerCase() as any) : null,
      callTariff: data.callTariff || null,
      existingHandsets: data.existingHandsets || null,
      intlPackage: data.intlPackage === 'Other' ? data.intlPackageOther : data.intlPackage || null,
      intlLocation:
        data.intlLocation === 'Other' ? data.intlLocationOther : data.intlLocation || null,
      premiumPackage:
        data.premiumPackage === 'Other' ? data.premiumOther : data.premiumPackage || null,
      equipment: data.phoneEquipment.length > 0 ? data.phoneEquipment : null,
    })

    // Step 4 — deal pricing
    await tx.insert(dealPricing).values({
      dealId,
      bundlePrice: data.bundlePrice,
      wholesaleCost: data.bbCost,
      monthlyGp: data.monthlyGp,
      connectionFee: parsedConnectionFee,
      billAmountLosingSupplier: data.billAmount || null,
      contractLength: data.contractLength ? (contractLengthMap[data.contractLength] as any) : null,
      contractLengthOther: data.contractLengthOther || null,
    })

    // Step 5 — deal billing
    await tx.insert(dealBilling).values({
      dealId,
      billingType: data.billingType ? (billingTypeMap[data.billingType] as any) : null,
      paymentMethod: data.paymentMethod ? (paymentMethodMap[data.paymentMethod] as any) : null,
      phoneProvider: data.phoneProvider || null,
      broadbandProvider: data.broadbandProvider || null,
      invoiceName: data.ddCollected ? data.invoiceName || null : null,
      bankBranch: data.ddCollected ? data.bankBranch || null : null,
      sortCode: data.ddCollected ? data.sortCode || null : null,
      accountNumber: data.ddCollected ? data.accountNumber || null : null,
      bankChecked: data.ddCollected ? data.bankChecked : false,
    })

    // Step 6 — provisioning + services
    const [newProv] = await tx
      .insert(provisioning)
      .values({
        tenantId: data.tenantId,
        dealId,
        status: 'not_started',
      })
      .returning({ id: provisioning.id })

    if (!newProv) throw new Error('Failed to create provisioning record')

    await tx.insert(provisioningServices).values([
      { provisioningId: newProv.id, serviceType: 'bb', status: 'not_applied', attempt: 1 },
      { provisioningId: newProv.id, serviceType: 'whc', status: 'not_applied', attempt: 1 },
    ])
  })

  redirect(`/deals/${accountNumber}`)
}
