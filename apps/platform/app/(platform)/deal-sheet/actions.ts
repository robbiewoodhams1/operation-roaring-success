'use server'

import {
  db,
  customers,
  users,
  deals,
  dealServices,
  dealPricing,
  dealBilling,
  provisioning,
  provisioningServices,
} from '@roaring/db'
import type { Title } from '@roaring/db'
import { eq, desc, sql, gte, and, inArray } from 'drizzle-orm'
import { redirect } from 'next/navigation'
import { revalidateTag } from 'next/cache'
import { requireUser, setAuditUser } from '@roaring/auth'
import { getSettings } from '@/lib/settings'

function generateNextAccountNumber(
  latest: string | null,
  prefix: string,
  startNumber: number
): string {
  const first = `${prefix}${startNumber}`
  if (!latest) return first
  const num = parseInt(latest.slice(prefix.length))
  if (isNaN(num)) return first
  return `${prefix}${num + 1}`
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

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** The deal already created for this submission key, if any. */
async function existingSubmission(tenantId: string, submissionKey: string) {
  const [row] = await db
    .select({ id: deals.id })
    .from(deals)
    .where(and(eq(deals.tenantId, tenantId), eq(deals.submissionKey, submissionKey)))
    .limit(1)
  return row?.id ?? null
}

type PgError = { code?: string; constraint_name?: string; message?: string; cause?: unknown }

/** Drizzle wraps driver errors, so walk the `cause` chain looking for Postgres's 23505. */
function isUniqueViolation(err: unknown, constraint: string): boolean {
  for (let e = err as PgError | undefined; e; e = e.cause as PgError | undefined) {
    if (
      e.code === '23505' &&
      (e.constraint_name === constraint || String(e.message).includes(constraint))
    )
      return true
  }
  return false
}

export async function submitDeal(data: {
  existingCustomerId: string | null
  /** Optional manual account number; blank means auto-generate the next in sequence. */
  customerAccountNumber?: string
  /**
   * Generated once per deal-sheet form. A double-click or network retry
   * resubmits the same key and lands on the deal already created.
   */
  submissionKey: string
  businessName: string
  customerTitle: string
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
  /** User ids — the employees credited with opening and closing the deal. */
  salesAgentId: string
  closingAgentId: string
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
  let createdDealId: string = ''

  const parsedConnectionFee = parseConnectionFee(data.connectionFee, data.connectionFeeOther)
  const user = await requireUser()

  // Tenant and creator always come from the session, never from the payload.
  const tenantId = user.tenantId

  if (!UUID.test(data.submissionKey ?? '')) {
    return { error: 'This form has expired. Reload the page and try again.' }
  }
  const alreadySubmitted = await existingSubmission(tenantId, data.submissionKey)
  if (alreadySubmitted) redirect(`/deals/${alreadySubmitted}`)

  // Agents must be active, approved employees of this tenant. The names are
  // stored alongside the ids as a display snapshot.
  const agentIds = [...new Set([data.salesAgentId, data.closingAgentId])].filter((id) =>
    UUID.test(id ?? '')
  )
  const agents =
    agentIds.length > 0
      ? await db
          .select({ id: users.id, fullName: users.fullName })
          .from(users)
          .where(
            and(
              inArray(users.id, agentIds),
              eq(users.tenantId, tenantId),
              eq(users.isActive, true),
              eq(users.approvalStatus, 'approved')
            )
          )
      : []
  const salesAgent = agents.find((a) => a.id === data.salesAgentId)
  const closingAgent = agents.find((a) => a.id === data.closingAgentId)
  if (!salesAgent || !closingAgent) {
    return { error: 'Choose a sales agent and a closing agent from the list.' }
  }

  if (data.existingCustomerId) {
    const [existing] = await db
      .select({ id: customers.id })
      .from(customers)
      .where(and(eq(customers.id, data.existingCustomerId), eq(customers.tenantId, tenantId)))
      .limit(1)
    if (!existing) return { error: 'That customer could not be found.' }
  }

  const { accountNumber: accountFormat } = await getSettings()

  // Manual account numbers are normalised to match the generated format
  const manualAccountNumber = (data.customerAccountNumber ?? '').trim().toUpperCase()

  if (manualAccountNumber && !data.existingCustomerId) {
    if (!/^[A-Z0-9-]{3,32}$/.test(manualAccountNumber)) {
      return { error: 'Account number must be 3–32 letters, numbers or hyphens, with no spaces.' }
    }

    const clash = await db
      .select({ id: customers.id })
      .from(customers)
      .where(eq(customers.accountNumber, manualAccountNumber))
      .limit(1)

    if (clash.length > 0) {
      return { error: `Account number ${manualAccountNumber} is already in use.` }
    }
  }

  try {
    await db.transaction(async (tx) => {
      await setAuditUser(tx, user.id)

      // Step 1 — use existing customer, or create a new one
      if (data.existingCustomerId) {
        customerId = data.existingCustomerId
      } else {
        let accountNumber = manualAccountNumber

        if (!accountNumber) {
          // Only count account numbers that are prefix + digits. Manual ones can
          // carry a non-numeric suffix, and the CASE keeps the cast from seeing
          // those rows at all — an unguarded CAST would error on them. The start
          // position needs ::integer: untyped, Postgres resolves the regex form
          // substring(text FROM pattern) and the latest number is never found.
          const sequenceNumber = sql`CASE WHEN ${customers.accountNumber} ~ ${`^${accountFormat.prefix}[0-9]+$`} THEN CAST(SUBSTRING(${customers.accountNumber} FROM ${accountFormat.prefix.length + 1}::integer) AS INTEGER) END`

          const latest = await tx
            .select({ accountNumber: customers.accountNumber })
            .from(customers)
            .where(gte(sequenceNumber, accountFormat.startNumber))
            .orderBy(desc(sequenceNumber))
            .limit(1)

          accountNumber = generateNextAccountNumber(
            latest[0]?.accountNumber ?? null,
            accountFormat.prefix,
            accountFormat.startNumber
          )
        }

        const [newCustomer] = await tx
          .insert(customers)
          .values({
            tenantId,
            accountNumber,
            type: data.dealType.toLowerCase() as any,
            companyName: data.businessName || null,
            title: (data.customerTitle || null) as Title | null,
            firstName: data.customerFirstName,
            lastName: data.customerLastName,
            landline: data.landline || null,
            mobile: data.mobile || null,
            email: data.email || null,
            addressLine1: data.address1 || null,
            addressLine2: data.town || null,
            addressLine3: data.county || null,
            postcode: data.postcode || null,
            status: 'prospect',
            createdBy: user.id,
          })
          .returning({ id: customers.id })

        if (!newCustomer) throw new Error('Failed to create customer')
        customerId = newCustomer.id
      }

      // Step 2 — deal
      const [newDeal] = await tx
        .insert(deals)
        .values({
          tenantId,
          customerId,
          salesAgent: salesAgent.fullName,
          closingAgent: closingAgent.fullName,
          salesAgentId: salesAgent.id,
          closingAgentId: closingAgent.id,
          submissionKey: data.submissionKey,
          dealType: data.dealType.toLowerCase() as any,
          status: 'pending',
          tradingAddress: data.tradingAddress || null,
          softFacts: data.softFacts || null,
          dealDate: data.date,
          welcomeCall: data.welcomeCall.toLowerCase() as any,
          createdBy: user.id,
        })
        .returning({ id: deals.id })

      if (!newDeal) throw new Error('Failed to create deal')
      const dealId = newDeal.id
      createdDealId = dealId

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
        intlPackage:
          data.intlPackage === 'Other' ? data.intlPackageOther : data.intlPackage || null,
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
        contractLength: data.contractLength
          ? (contractLengthMap[data.contractLength] as any)
          : null,
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
          tenantId,
          dealId,
          status: 'not_started',
        })
        .returning({ id: provisioning.id })

      if (!newProv) throw new Error('Failed to create provisioning record')

      const servicesToInsert: {
        provisioningId: string
        serviceType: any
        status: 'not_applied'
        attempt: number
      }[] = []

      if (data.bbType === 'MPF Broadband') {
        servicesToInsert.push({
          provisioningId: newProv.id,
          serviceType: 'mpf_broadband',
          status: 'not_applied',
          attempt: 1,
        })
      } else if (data.bbType && data.bbType !== 'Line Only') {
        servicesToInsert.push({
          provisioningId: newProv.id,
          serviceType: 'bb',
          status: 'not_applied',
          attempt: 1,
        })
      }

      if (data.voice) {
        if (data.voiceOption === 'WHC') {
          servicesToInsert.push({
            provisioningId: newProv.id,
            serviceType: 'whc',
            status: 'not_applied',
            attempt: 1,
          })
        } else if (data.voiceOption === 'NFON') {
          servicesToInsert.push({
            provisioningId: newProv.id,
            serviceType: 'nfon',
            status: 'not_applied',
            attempt: 1,
          })
        } else if (data.voiceOption === 'MPF') {
          servicesToInsert.push({
            provisioningId: newProv.id,
            serviceType: 'mpf_voice',
            status: 'not_applied',
            attempt: 1,
          })
          const alreadyHasMpfBb = servicesToInsert.some((s) => s.serviceType === 'mpf_broadband')
          if (!alreadyHasMpfBb) {
            servicesToInsert.push({
              provisioningId: newProv.id,
              serviceType: 'mpf_broadband',
              status: 'not_applied',
              attempt: 1,
            })
          }
        }
      }

      if (servicesToInsert.length > 0) {
        await tx.insert(provisioningServices).values(servicesToInsert)
      }
    })
  } catch (err) {
    // Two requests with the same key raced past the check above; the
    // database kept exactly one. Send this one to the deal that won.
    if (!isUniqueViolation(err, 'deals_tenant_submission_key')) throw err
    const winner = await existingSubmission(tenantId, data.submissionKey)
    if (!winner) throw err
    redirect(`/deals/${winner}`)
  }

  revalidateTag(`customers-${tenantId}`, 'max')
  revalidateTag(`deals-${tenantId}`, 'max')
  revalidateTag(`provisioning-${tenantId}`, 'max')

  redirect(`/deals/${createdDealId}`)
}
