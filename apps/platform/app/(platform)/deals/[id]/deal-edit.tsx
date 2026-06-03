'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Pencil } from 'lucide-react'
import { updateDeal } from './actions'
import type { Deal, DealService, DealPricing, DealBilling, Customer } from '@roaring/db'

const DEAL_TYPES = ['business', 'residential']
const WELCOME_CALLS = ['am', 'pm']
const INSTALL_TYPES = ['new_install', 'migration']
const LINE_CONFIGS = ['single', 'multi', 'mpf']
const VOICE_OPTIONS = ['whc', 'nfon', 'mpf']
const BILLING_TYPES = ['paper', 'email']
const PAYMENT_METHODS = ['dd', 'mandate', 'card_bacs']
const CONTRACT_LENGTHS = ['24_months', '36_months', '48_months', 'other']
const CUSTOMER_TYPES = ['business', 'residential']
const CUSTOMER_STATUSES = ['prospect', 'active', 'at_risk', 'churned']

const dealStatusColours: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  live: 'bg-green-100 text-green-800 border-green-200',
  cancelled: 'bg-red-100 text-red-800 border-red-200',
}

export function DealEdit({
  deal,
  services,
  pricing,
  billing,
  customer,
}: {
  deal: Deal
  services: DealService | null
  pricing: DealPricing | null
  billing: DealBilling | null
  customer: Customer
}) {
  const router = useRouter()
  const [isEditing, setIsEditing] = useState(false)
  const [saving, setSaving] = useState(false)

  const [form, setForm] = useState({
    // Deal
    salesAgent: deal.salesAgent,
    closingAgent: deal.closingAgent,
    dealType: deal.dealType as string,
    dealDate: deal.dealDate,
    welcomeCall: deal.welcomeCall ?? '',
    tradingAddress: deal.tradingAddress ?? '',
    softFacts: deal.softFacts ?? '',
    // Services
    lineChecked: services?.lineChecked ?? false,
    connectionFee: services?.connectionFee ?? '',
    broadbandType: services?.broadbandType ?? '',
    installType: services?.installType ?? '',
    ontSerialNumber: services?.ontSerialNumber ?? '',
    normalSpeed: services?.normalSpeed ?? '',
    minSpeed: services?.minSpeed ?? '',
    maxSpeed: services?.maxSpeed ?? '',
    voiceRequired: services?.voiceRequired ?? false,
    currentVoiceType: services?.currentVoiceType ?? '',
    lineConfiguration: services?.lineConfiguration ?? '',
    numLicenses: services?.numLicenses?.toString() ?? '',
    voiceOption: services?.voiceOption ?? '',
    callTariff: services?.callTariff ?? '',
    existingHandsets: services?.existingHandsets ?? '',
    intlPackage: services?.intlPackage ?? '',
    intlLocation: services?.intlLocation ?? '',
    premiumPackage: services?.premiumPackage ?? '',
    // Pricing
    bundlePrice: pricing?.bundlePrice ?? '',
    wholesaleCost: pricing?.wholesaleCost ?? '',
    monthlyGp: pricing?.monthlyGp ?? '',
    connectionFeePricing: pricing?.connectionFee ?? '',
    billAmountLosingSupplier: pricing?.billAmountLosingSupplier ?? '',
    contractLength: pricing?.contractLength ?? '',
    contractLengthOther: pricing?.contractLengthOther ?? '',
    // Billing
    billingType: billing?.billingType ?? '',
    paymentMethod: billing?.paymentMethod ?? '',
    phoneProvider: billing?.phoneProvider ?? '',
    broadbandProvider: billing?.broadbandProvider ?? '',
    invoiceName: billing?.invoiceName ?? '',
    bankBranch: billing?.bankBranch ?? '',
    sortCode: billing?.sortCode ?? '',
    accountNumberBilling: billing?.accountNumber ?? '',
    bankChecked: billing?.bankChecked ?? false,
    // Customer
    companyName: customer.companyName ?? '',
    firstName: customer.firstName,
    lastName: customer.lastName,
    mobile: customer.mobile ?? '',
    email: customer.email ?? '',
    addressLine1: customer.addressLine1 ?? '',
    addressLine2: customer.addressLine2 ?? '',
    addressLine3: customer.addressLine3 ?? '',
    addressLine4: customer.addressLine4 ?? '',
    postcode: customer.postcode ?? '',
    customerType: customer.type as string,
    customerStatus: customer.status as string,
  })

  function update(field: string, value: string | boolean) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSave() {
    setSaving(true)
    await updateDeal({
      dealId: deal.id,
      customerId: customer.id,
      servicesId: services?.id ?? '',
      pricingId: pricing?.id ?? '',
      billingId: billing?.id ?? '',
      salesAgent: form.salesAgent,
      closingAgent: form.closingAgent,
      dealType: form.dealType,
      dealDate: form.dealDate,
      welcomeCall: form.welcomeCall || null,
      tradingAddress: form.tradingAddress || null,
      softFacts: form.softFacts || null,
      lineChecked: form.lineChecked,
      connectionFee: form.connectionFee || null,
      broadbandType: form.broadbandType || null,
      installType: form.installType || null,
      ontSerialNumber: form.ontSerialNumber || null,
      normalSpeed: form.normalSpeed || null,
      minSpeed: form.minSpeed || null,
      maxSpeed: form.maxSpeed || null,
      voiceRequired: form.voiceRequired,
      currentVoiceType: form.currentVoiceType || null,
      lineConfiguration: form.lineConfiguration || null,
      numLicenses: form.numLicenses || null,
      voiceOption: form.voiceOption || null,
      callTariff: form.callTariff || null,
      existingHandsets: form.existingHandsets || null,
      intlPackage: form.intlPackage || null,
      intlLocation: form.intlLocation || null,
      premiumPackage: form.premiumPackage || null,
      bundlePrice: form.bundlePrice,
      wholesaleCost: form.wholesaleCost,
      monthlyGp: form.monthlyGp,
      connectionFeePricing: form.connectionFeePricing || null,
      billAmountLosingSupplier: form.billAmountLosingSupplier || null,
      contractLength: form.contractLength || null,
      contractLengthOther: form.contractLengthOther || null,
      billingType: form.billingType || null,
      paymentMethod: form.paymentMethod || null,
      phoneProvider: form.phoneProvider || null,
      broadbandProvider: form.broadbandProvider || null,
      invoiceName: form.invoiceName || null,
      bankBranch: form.bankBranch || null,
      sortCode: form.sortCode || null,
      accountNumberBilling: form.accountNumberBilling || null,
      bankChecked: form.bankChecked,
      companyName: form.companyName || null,
      firstName: form.firstName,
      lastName: form.lastName,
      mobile: form.mobile || null,
      email: form.email || null,
      addressLine1: form.addressLine1 || null,
      addressLine2: form.addressLine2 || null,
      addressLine3: form.addressLine3 || null,
      addressLine4: form.addressLine4 || null,
      postcode: form.postcode || null,
      customerType: form.customerType,
      customerStatus: form.customerStatus,
    })
    setSaving(false)
    setIsEditing(false)
    router.refresh()
  }

  function handleCancel() {
    setForm({
      salesAgent: deal.salesAgent,
      closingAgent: deal.closingAgent,
      dealType: deal.dealType as string,
      dealDate: deal.dealDate,
      welcomeCall: deal.welcomeCall ?? '',
      tradingAddress: deal.tradingAddress ?? '',
      softFacts: deal.softFacts ?? '',
      lineChecked: services?.lineChecked ?? false,
      connectionFee: services?.connectionFee ?? '',
      broadbandType: services?.broadbandType ?? '',
      installType: services?.installType ?? '',
      ontSerialNumber: services?.ontSerialNumber ?? '',
      normalSpeed: services?.normalSpeed ?? '',
      minSpeed: services?.minSpeed ?? '',
      maxSpeed: services?.maxSpeed ?? '',
      voiceRequired: services?.voiceRequired ?? false,
      currentVoiceType: services?.currentVoiceType ?? '',
      lineConfiguration: services?.lineConfiguration ?? '',
      numLicenses: services?.numLicenses?.toString() ?? '',
      voiceOption: services?.voiceOption ?? '',
      callTariff: services?.callTariff ?? '',
      existingHandsets: services?.existingHandsets ?? '',
      intlPackage: services?.intlPackage ?? '',
      intlLocation: services?.intlLocation ?? '',
      premiumPackage: services?.premiumPackage ?? '',
      bundlePrice: pricing?.bundlePrice ?? '',
      wholesaleCost: pricing?.wholesaleCost ?? '',
      monthlyGp: pricing?.monthlyGp ?? '',
      connectionFeePricing: pricing?.connectionFee ?? '',
      billAmountLosingSupplier: pricing?.billAmountLosingSupplier ?? '',
      contractLength: pricing?.contractLength ?? '',
      contractLengthOther: pricing?.contractLengthOther ?? '',
      billingType: billing?.billingType ?? '',
      paymentMethod: billing?.paymentMethod ?? '',
      phoneProvider: billing?.phoneProvider ?? '',
      broadbandProvider: billing?.broadbandProvider ?? '',
      invoiceName: billing?.invoiceName ?? '',
      bankBranch: billing?.bankBranch ?? '',
      sortCode: billing?.sortCode ?? '',
      accountNumberBilling: billing?.accountNumber ?? '',
      bankChecked: billing?.bankChecked ?? false,
      companyName: customer.companyName ?? '',
      firstName: customer.firstName,
      lastName: customer.lastName,
      mobile: customer.mobile ?? '',
      email: customer.email ?? '',
      addressLine1: customer.addressLine1 ?? '',
      addressLine2: customer.addressLine2 ?? '',
      addressLine3: customer.addressLine3 ?? '',
      addressLine4: customer.addressLine4 ?? '',
      postcode: customer.postcode ?? '',
      customerType: customer.type as string,
      customerStatus: customer.status as string,
    })
    setIsEditing(false)
  }

  const F = ({
    field,
    placeholder,
    mono,
  }: {
    field: string
    placeholder?: string
    mono?: boolean
  }) =>
    isEditing ? (
      <Input
        value={form[field as keyof typeof form] as string}
        onChange={(e) => update(field, e.target.value)}
        className={`h-8 w-full max-w-sm ${mono ? 'font-mono' : ''}`}
        placeholder={placeholder}
      />
    ) : (
      <span className={`text-sm ${mono ? 'font-mono' : ''}`}>
        {(form[field as keyof typeof form] as string) || '—'}
      </span>
    )

  const TA = ({ field, placeholder }: { field: string; placeholder?: string }) =>
    isEditing ? (
      <Textarea
        value={form[field as keyof typeof form] as string}
        onChange={(e) => update(field, e.target.value)}
        className="text-sm min-h-16"
        placeholder={placeholder}
      />
    ) : (
      <span className="text-sm">{(form[field as keyof typeof form] as string) || '—'}</span>
    )

  const SL = ({
    field,
    options,
    placeholder,
  }: {
    field: string
    options: string[]
    placeholder?: string
  }) =>
    isEditing ? (
      <Select
        value={form[field as keyof typeof form] as string}
        onValueChange={(v) => update(field, v)}
      >
        <SelectTrigger className="h-8 w-48">
          <SelectValue placeholder={placeholder ?? 'Select'} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="">—</SelectItem>
          {options.map((o) => (
            <SelectItem key={o} value={o}>
              {o.replace(/_/g, ' ')}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    ) : (
      <span className="text-sm capitalize">
        {((form[field as keyof typeof form] as string) || '—').replace(/_/g, ' ')}
      </span>
    )

  const Bool = ({ field }: { field: string }) =>
    isEditing ? (
      <Select
        value={form[field as keyof typeof form] ? 'yes' : 'no'}
        onValueChange={(v) => update(field, v === 'yes')}
      >
        <SelectTrigger className="h-8 w-32">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="no">No</SelectItem>
          <SelectItem value="yes">Yes</SelectItem>
        </SelectContent>
      </Select>
    ) : (
      <span className="text-sm">{form[field as keyof typeof form] ? 'Yes' : 'No'}</span>
    )

  return (
    <div className="space-y-6">
      <div className="flex justify-end gap-2">
        {isEditing ? (
          <>
            <Button variant="outline" onClick={handleCancel} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : 'Save changes'}
            </Button>
          </>
        ) : (
          <Button variant="outline" onClick={() => setIsEditing(true)}>
            <Pencil className="size-4 mr-2" />
            Edit
          </Button>
        )}
      </div>

      <Section title="Deal">
        <Row label="Sales agent">
          <F field="salesAgent" />
        </Row>
        <Row label="Closing agent">
          <F field="closingAgent" />
        </Row>
        <Row label="Deal type">
          <SL field="dealType" options={DEAL_TYPES} />
        </Row>
        <Row label="Deal date">
          {isEditing ? (
            <Input
              type="date"
              value={form.dealDate}
              onChange={(e) => update('dealDate', e.target.value)}
              className="h-8 w-48"
            />
          ) : (
            <span className="text-sm">{new Date(form.dealDate).toLocaleDateString('en-GB')}</span>
          )}
        </Row>
        <Row label="Welcome call">
          <SL field="welcomeCall" options={WELCOME_CALLS} />
        </Row>
        <Row label="Trading address">
          <F field="tradingAddress" />
        </Row>
        <Row label="Soft facts">
          <TA field="softFacts" />
        </Row>
      </Section>

      <Section title="Services">
        <Row label="Line checked">
          <Bool field="lineChecked" />
        </Row>
        <Row label="Connection fee">
          <F field="connectionFee" placeholder="e.g. 149.99" />
        </Row>
        <Row label="Broadband type">
          <F field="broadbandType" />
        </Row>
        <Row label="Install type">
          <SL field="installType" options={INSTALL_TYPES} />
        </Row>
        <Row label="ONT serial">
          <F field="ontSerialNumber" mono />
        </Row>
        <Row label="Normal speed">
          <F field="normalSpeed" />
        </Row>
        <Row label="Min speed">
          <F field="minSpeed" />
        </Row>
        <Row label="Max speed">
          <F field="maxSpeed" />
        </Row>
        <Row label="Voice required">
          <Bool field="voiceRequired" />
        </Row>
        <Row label="Current voice type">
          <F field="currentVoiceType" />
        </Row>
        <Row label="Line configuration">
          <SL field="lineConfiguration" options={LINE_CONFIGS} />
        </Row>
        <Row label="Num licenses">
          <F field="numLicenses" />
        </Row>
        <Row label="Voice option">
          <SL field="voiceOption" options={VOICE_OPTIONS} />
        </Row>
        <Row label="Call tariff">
          <F field="callTariff" />
        </Row>
        <Row label="Existing handsets">
          <F field="existingHandsets" />
        </Row>
        <Row label="Intl package">
          <F field="intlPackage" />
        </Row>
        <Row label="Intl location">
          <F field="intlLocation" />
        </Row>
        <Row label="Premium package">
          <F field="premiumPackage" />
        </Row>
      </Section>

      <Section title="Pricing">
        <Row label="Bundle price">
          <F field="bundlePrice" placeholder="e.g. 45.00" mono />
        </Row>
        <Row label="Wholesale cost">
          <F field="wholesaleCost" placeholder="e.g. 31.99" mono />
        </Row>
        <Row label="Monthly GP">
          <F field="monthlyGp" placeholder="e.g. 13.01" mono />
        </Row>
        <Row label="Connection fee">
          <F field="connectionFeePricing" placeholder="e.g. 149.99" mono />
        </Row>
        <Row label="Bill losing supplier">
          <F field="billAmountLosingSupplier" placeholder="e.g. 33.00" mono />
        </Row>
        <Row label="Contract length">
          <SL field="contractLength" options={CONTRACT_LENGTHS} />
        </Row>
        <Row label="Contract length other">
          <F field="contractLengthOther" />
        </Row>
      </Section>

      <Section title="Billing">
        <Row label="Billing type">
          <SL field="billingType" options={BILLING_TYPES} />
        </Row>
        <Row label="Payment method">
          <SL field="paymentMethod" options={PAYMENT_METHODS} />
        </Row>
        <Row label="Phone provider">
          <F field="phoneProvider" />
        </Row>
        <Row label="Broadband provider">
          <F field="broadbandProvider" />
        </Row>
        <Row label="Invoice name">
          <F field="invoiceName" />
        </Row>
        <Row label="Bank branch">
          <F field="bankBranch" />
        </Row>
        <Row label="Sort code">
          <F field="sortCode" mono />
        </Row>
        <Row label="Account number">
          <F field="accountNumberBilling" mono />
        </Row>
        <Row label="Bank checked">
          <Bool field="bankChecked" />
        </Row>
      </Section>

      <Section title="Customer">
        <Row label="Company name">
          <F field="companyName" />
        </Row>
        <Row label="First name">
          <F field="firstName" />
        </Row>
        <Row label="Last name">
          <F field="lastName" />
        </Row>
        <Row label="Mobile">
          <F field="mobile" mono />
        </Row>
        <Row label="Email">
          <F field="email" />
        </Row>
        <Row label="Address line 1">
          <F field="addressLine1" />
        </Row>
        <Row label="Address line 2">
          <F field="addressLine2" />
        </Row>
        <Row label="Address line 3">
          <F field="addressLine3" />
        </Row>
        <Row label="Address line 4">
          <F field="addressLine4" />
        </Row>
        <Row label="Postcode">
          <F field="postcode" mono />
        </Row>
        <Row label="Type">
          <SL field="customerType" options={CUSTOMER_TYPES} />
        </Row>
        <Row label="Status">
          <SL field="customerStatus" options={CUSTOMER_STATUSES} />
        </Row>
      </Section>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border rounded-lg overflow-hidden">
      <div className="px-4 py-3 border-b bg-muted/30">
        <h2 className="text-sm font-medium">{title}</h2>
      </div>
      <div className="divide-y">{children}</div>
    </section>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex px-4 py-3 items-center gap-4">
      <span className="text-muted-foreground w-40 shrink-0 text-sm">{label}</span>
      <div className="text-sm flex-1">{children}</div>
    </div>
  )
}
