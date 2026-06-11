'use server'

import { db, deals, dealServices, dealPricing, dealBilling, customers } from '@roaring/db'
import { eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { requireUser, setAuditUser } from '@roaring/auth'

export async function updateDeal(data: {
  dealId: string
  customerId: string
  salesAgent: string
  closingAgent: string
  dealType: string
  dealDate: string
  welcomeCall: string | null
  tradingAddress: string | null
  softFacts: string | null
  servicesId: string
  lineChecked: boolean
  connectionFee: string | null
  broadbandType: string | null
  installType: string | null
  ontSerialNumber: string | null
  normalSpeed: string | null
  minSpeed: string | null
  maxSpeed: string | null
  voiceRequired: boolean
  currentVoiceType: string | null
  lineConfiguration: string | null
  numLicenses: string | null
  voiceOption: string | null
  callTariff: string | null
  existingHandsets: string | null
  intlPackage: string | null
  intlLocation: string | null
  premiumPackage: string | null
  pricingId: string
  bundlePrice: string
  wholesaleCost: string
  monthlyGp: string
  connectionFeePricing: string | null
  billAmountLosingSupplier: string | null
  contractLength: string | null
  contractLengthOther: string | null
  billingId: string
  billingType: string | null
  paymentMethod: string | null
  phoneProvider: string | null
  broadbandProvider: string | null
  invoiceName: string | null
  bankBranch: string | null
  sortCode: string | null
  accountNumberBilling: string | null
  bankChecked: boolean
  companyName: string | null
  title: string | null
  firstName: string
  lastName: string
  mobile: string | null
  email: string | null
  addressLine1: string | null
  addressLine2: string | null
  addressLine3: string | null
  addressLine4: string | null
  postcode: string | null
  customerType: string
  customerStatus: string
}) {
  const user = await requireUser()

  await db.transaction(async (tx) => {
    await setAuditUser(tx, user.id)

    await Promise.all([
      tx
        .update(deals)
        .set({
          salesAgent: data.salesAgent,
          closingAgent: data.closingAgent,
          dealType: data.dealType as any,
          dealDate: data.dealDate,
          welcomeCall: (data.welcomeCall || null) as any,
          tradingAddress: data.tradingAddress || null,
          softFacts: data.softFacts || null,
        })
        .where(eq(deals.id, data.dealId)),

      tx
        .update(dealServices)
        .set({
          lineChecked: data.lineChecked,
          connectionFee: data.connectionFee || null,
          broadbandType: data.broadbandType || null,
          installType: (data.installType || null) as any,
          ontSerialNumber: data.ontSerialNumber || null,
          normalSpeed: data.normalSpeed || null,
          minSpeed: data.minSpeed || null,
          maxSpeed: data.maxSpeed || null,
          voiceRequired: data.voiceRequired,
          currentVoiceType: data.currentVoiceType || null,
          lineConfiguration: (data.lineConfiguration || null) as any,
          numLicenses: data.numLicenses ? parseInt(data.numLicenses) : null,
          voiceOption: (data.voiceOption || null) as any,
          callTariff: data.callTariff || null,
          existingHandsets: data.existingHandsets || null,
          intlPackage: data.intlPackage || null,
          intlLocation: data.intlLocation || null,
          premiumPackage: data.premiumPackage || null,
        })
        .where(eq(dealServices.id, data.servicesId)),

      tx
        .update(dealPricing)
        .set({
          bundlePrice: data.bundlePrice,
          wholesaleCost: data.wholesaleCost,
          monthlyGp: data.monthlyGp,
          connectionFee: data.connectionFeePricing || null,
          billAmountLosingSupplier: data.billAmountLosingSupplier || null,
          contractLength: (data.contractLength || null) as any,
          contractLengthOther: data.contractLengthOther || null,
        })
        .where(eq(dealPricing.id, data.pricingId)),

      tx
        .update(dealBilling)
        .set({
          billingType: (data.billingType || null) as any,
          paymentMethod: (data.paymentMethod || null) as any,
          phoneProvider: data.phoneProvider || null,
          broadbandProvider: data.broadbandProvider || null,
          invoiceName: data.invoiceName || null,
          bankBranch: data.bankBranch || null,
          sortCode: data.sortCode || null,
          accountNumber: data.accountNumberBilling || null,
          bankChecked: data.bankChecked,
        })
        .where(eq(dealBilling.id, data.billingId)),

      tx
        .update(customers)
        .set({
          companyName: data.companyName || null,
          title: data.title,
          firstName: data.firstName,
          lastName: data.lastName,
          mobile: data.mobile || null,
          email: data.email || null,
          addressLine1: data.addressLine1 || null,
          addressLine2: data.addressLine2 || null,
          addressLine3: data.addressLine3 || null,
          addressLine4: data.addressLine4 || null,
          postcode: data.postcode || null,
          type: data.customerType as any,
          status: data.customerStatus as any,
        })
        .where(eq(customers.id, data.customerId)),
    ])
  })

  revalidatePath('/deals')
  revalidatePath('/customers')
}
