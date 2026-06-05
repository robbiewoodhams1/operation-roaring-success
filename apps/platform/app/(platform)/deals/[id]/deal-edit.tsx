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

function F({
  value,
  onChange,
  isEditing,
  placeholder,
  mono,
}: {
  value: string
  onChange: (v: string) => void
  isEditing: boolean
  placeholder?: string
  mono?: boolean
}) {
  return isEditing ? (
    <Input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`h-8 w-full max-w-sm ${mono ? 'font-mono' : ''}`}
      placeholder={placeholder}
    />
  ) : (
    <span className={`text-sm ${mono ? 'font-mono' : ''}`}>{value || '—'}</span>
  )
}

function TA({
  value,
  onChange,
  isEditing,
  placeholder,
}: {
  value: string
  onChange: (v: string) => void
  isEditing: boolean
  placeholder?: string
}) {
  return isEditing ? (
    <Textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="text-sm min-h-16"
      placeholder={placeholder}
    />
  ) : (
    <span className="text-sm">{value || '—'}</span>
  )
}

function SL({
  value,
  onChange,
  isEditing,
  options,
  placeholder,
}: {
  value: string
  onChange: (v: string) => void
  isEditing: boolean
  options: string[]
  placeholder?: string
}) {
  return isEditing ? (
    <Select value={value} onValueChange={onChange}>
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
    <span className="text-sm capitalize">{(value || '—').replace(/_/g, ' ')}</span>
  )
}

function Bool({
  value,
  onChange,
  isEditing,
}: {
  value: boolean
  onChange: (v: boolean) => void
  isEditing: boolean
}) {
  return isEditing ? (
    <Select value={value ? 'yes' : 'no'} onValueChange={(v) => onChange(v === 'yes')}>
      <SelectTrigger className="h-8 w-32">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="no">No</SelectItem>
        <SelectItem value="yes">Yes</SelectItem>
      </SelectContent>
    </Select>
  ) : (
    <span className="text-sm">{value ? 'Yes' : 'No'}</span>
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

  const e = isEditing

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
          <F value={form.salesAgent} onChange={(v) => update('salesAgent', v)} isEditing={e} />
        </Row>
        <Row label="Closing agent">
          <F value={form.closingAgent} onChange={(v) => update('closingAgent', v)} isEditing={e} />
        </Row>
        <Row label="Deal type">
          <SL
            value={form.dealType}
            onChange={(v) => update('dealType', v)}
            isEditing={e}
            options={DEAL_TYPES}
          />
        </Row>
        <Row label="Deal date">
          {isEditing ? (
            <Input
              type="date"
              value={form.dealDate}
              onChange={(ev) => update('dealDate', ev.target.value)}
              className="h-8 w-48"
            />
          ) : (
            <span className="text-sm">{new Date(form.dealDate).toLocaleDateString('en-GB')}</span>
          )}
        </Row>
        <Row label="Welcome call">
          <SL
            value={form.welcomeCall}
            onChange={(v) => update('welcomeCall', v)}
            isEditing={e}
            options={WELCOME_CALLS}
          />
        </Row>
        <Row label="Trading address">
          <F
            value={form.tradingAddress}
            onChange={(v) => update('tradingAddress', v)}
            isEditing={e}
          />
        </Row>
        <Row label="Soft facts">
          <TA value={form.softFacts} onChange={(v) => update('softFacts', v)} isEditing={e} />
        </Row>
      </Section>

      <Section title="Services">
        <Row label="Line checked">
          <Bool value={form.lineChecked} onChange={(v) => update('lineChecked', v)} isEditing={e} />
        </Row>
        <Row label="Connection fee">
          <F
            value={form.connectionFee}
            onChange={(v) => update('connectionFee', v)}
            isEditing={e}
            placeholder="e.g. 149.99"
          />
        </Row>
        <Row label="Broadband type">
          <F
            value={form.broadbandType}
            onChange={(v) => update('broadbandType', v)}
            isEditing={e}
          />
        </Row>
        <Row label="Install type">
          <SL
            value={form.installType}
            onChange={(v) => update('installType', v)}
            isEditing={e}
            options={INSTALL_TYPES}
          />
        </Row>
        <Row label="ONT serial">
          <F
            value={form.ontSerialNumber}
            onChange={(v) => update('ontSerialNumber', v)}
            isEditing={e}
            mono
          />
        </Row>
        <Row label="Normal speed">
          <F value={form.normalSpeed} onChange={(v) => update('normalSpeed', v)} isEditing={e} />
        </Row>
        <Row label="Min speed">
          <F value={form.minSpeed} onChange={(v) => update('minSpeed', v)} isEditing={e} />
        </Row>
        <Row label="Max speed">
          <F value={form.maxSpeed} onChange={(v) => update('maxSpeed', v)} isEditing={e} />
        </Row>
        <Row label="Voice required">
          <Bool
            value={form.voiceRequired}
            onChange={(v) => update('voiceRequired', v)}
            isEditing={e}
          />
        </Row>
        <Row label="Current voice type">
          <F
            value={form.currentVoiceType}
            onChange={(v) => update('currentVoiceType', v)}
            isEditing={e}
          />
        </Row>
        <Row label="Line configuration">
          <SL
            value={form.lineConfiguration}
            onChange={(v) => update('lineConfiguration', v)}
            isEditing={e}
            options={LINE_CONFIGS}
          />
        </Row>
        <Row label="Num licenses">
          <F value={form.numLicenses} onChange={(v) => update('numLicenses', v)} isEditing={e} />
        </Row>
        <Row label="Voice option">
          <SL
            value={form.voiceOption}
            onChange={(v) => update('voiceOption', v)}
            isEditing={e}
            options={VOICE_OPTIONS}
          />
        </Row>
        <Row label="Call tariff">
          <F value={form.callTariff} onChange={(v) => update('callTariff', v)} isEditing={e} />
        </Row>
        <Row label="Existing handsets">
          <F
            value={form.existingHandsets}
            onChange={(v) => update('existingHandsets', v)}
            isEditing={e}
          />
        </Row>
        <Row label="Intl package">
          <F value={form.intlPackage} onChange={(v) => update('intlPackage', v)} isEditing={e} />
        </Row>
        <Row label="Intl location">
          <F value={form.intlLocation} onChange={(v) => update('intlLocation', v)} isEditing={e} />
        </Row>
        <Row label="Premium package">
          <F
            value={form.premiumPackage}
            onChange={(v) => update('premiumPackage', v)}
            isEditing={e}
          />
        </Row>
      </Section>

      <Section title="Pricing">
        <Row label="Bundle price">
          <F
            value={form.bundlePrice}
            onChange={(v) => update('bundlePrice', v)}
            isEditing={e}
            placeholder="e.g. 45.00"
            mono
          />
        </Row>
        <Row label="Wholesale cost">
          <F
            value={form.wholesaleCost}
            onChange={(v) => update('wholesaleCost', v)}
            isEditing={e}
            placeholder="e.g. 31.99"
            mono
          />
        </Row>
        <Row label="Monthly GP">
          <F
            value={form.monthlyGp}
            onChange={(v) => update('monthlyGp', v)}
            isEditing={e}
            placeholder="e.g. 13.01"
            mono
          />
        </Row>
        <Row label="Connection fee">
          <F
            value={form.connectionFeePricing}
            onChange={(v) => update('connectionFeePricing', v)}
            isEditing={e}
            placeholder="e.g. 149.99"
            mono
          />
        </Row>
        <Row label="Bill losing supplier">
          <F
            value={form.billAmountLosingSupplier}
            onChange={(v) => update('billAmountLosingSupplier', v)}
            isEditing={e}
            placeholder="e.g. 33.00"
            mono
          />
        </Row>
        <Row label="Contract length">
          <SL
            value={form.contractLength}
            onChange={(v) => update('contractLength', v)}
            isEditing={e}
            options={CONTRACT_LENGTHS}
          />
        </Row>
        <Row label="Contract length other">
          <F
            value={form.contractLengthOther}
            onChange={(v) => update('contractLengthOther', v)}
            isEditing={e}
          />
        </Row>
      </Section>

      <Section title="Billing">
        <Row label="Billing type">
          <SL
            value={form.billingType}
            onChange={(v) => update('billingType', v)}
            isEditing={e}
            options={BILLING_TYPES}
          />
        </Row>
        <Row label="Payment method">
          <SL
            value={form.paymentMethod}
            onChange={(v) => update('paymentMethod', v)}
            isEditing={e}
            options={PAYMENT_METHODS}
          />
        </Row>
        <Row label="Phone provider">
          <F
            value={form.phoneProvider}
            onChange={(v) => update('phoneProvider', v)}
            isEditing={e}
          />
        </Row>
        <Row label="Broadband provider">
          <F
            value={form.broadbandProvider}
            onChange={(v) => update('broadbandProvider', v)}
            isEditing={e}
          />
        </Row>
        <Row label="Invoice name">
          <F value={form.invoiceName} onChange={(v) => update('invoiceName', v)} isEditing={e} />
        </Row>
        <Row label="Bank branch">
          <F value={form.bankBranch} onChange={(v) => update('bankBranch', v)} isEditing={e} />
        </Row>
        <Row label="Sort code">
          <F value={form.sortCode} onChange={(v) => update('sortCode', v)} isEditing={e} mono />
        </Row>
        <Row label="Account number">
          <F
            value={form.accountNumberBilling}
            onChange={(v) => update('accountNumberBilling', v)}
            isEditing={e}
            mono
          />
        </Row>
        <Row label="Bank checked">
          <Bool value={form.bankChecked} onChange={(v) => update('bankChecked', v)} isEditing={e} />
        </Row>
      </Section>

      <Section title="Customer">
        <Row label="Company name">
          <F value={form.companyName} onChange={(v) => update('companyName', v)} isEditing={e} />
        </Row>
        <Row label="First name">
          <F value={form.firstName} onChange={(v) => update('firstName', v)} isEditing={e} />
        </Row>
        <Row label="Last name">
          <F value={form.lastName} onChange={(v) => update('lastName', v)} isEditing={e} />
        </Row>
        <Row label="Mobile">
          <F value={form.mobile} onChange={(v) => update('mobile', v)} isEditing={e} mono />
        </Row>
        <Row label="Email">
          <F value={form.email} onChange={(v) => update('email', v)} isEditing={e} />
        </Row>
        <Row label="Address line 1">
          <F value={form.addressLine1} onChange={(v) => update('addressLine1', v)} isEditing={e} />
        </Row>
        <Row label="Address line 2">
          <F value={form.addressLine2} onChange={(v) => update('addressLine2', v)} isEditing={e} />
        </Row>
        <Row label="Address line 3">
          <F value={form.addressLine3} onChange={(v) => update('addressLine3', v)} isEditing={e} />
        </Row>
        <Row label="Address line 4">
          <F value={form.addressLine4} onChange={(v) => update('addressLine4', v)} isEditing={e} />
        </Row>
        <Row label="Postcode">
          <F value={form.postcode} onChange={(v) => update('postcode', v)} isEditing={e} mono />
        </Row>
        <Row label="Type">
          <SL
            value={form.customerType}
            onChange={(v) => update('customerType', v)}
            isEditing={e}
            options={CUSTOMER_TYPES}
          />
        </Row>
        <Row label="Status">
          <SL
            value={form.customerStatus}
            onChange={(v) => update('customerStatus', v)}
            isEditing={e}
            options={CUSTOMER_STATUSES}
          />
        </Row>
      </Section>
    </div>
  )
}
