'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { AlertCircle } from 'lucide-react'
import { submitDeal } from './actions'

const TITLES = ['Mr', 'Mrs', 'Miss', 'Ms', 'Dr', 'Prof', 'Mx']
const CALL_TARIFFS = [
  'Unlimited Calls to UK Landlines',
  'Unlimited Calls to UK Landlines & Mobiles',
  'Standard Call Package - 2ppm Landlines & 10ppm Mobiles',
]
const BB_TYPES = [
  'Line Only',
  'MPF Broadband',
  'Unlimited SOGEA Broadband - Up to 80mbps',
  'Unlimited FTTP Broadband - Up to 80mbps',
  'Unlimited FTTP Broadband - Up to 160mbps',
  'Unlimited FTTP Broadband - Up to 330mbps',
  'Unlimited FTTP Broadband - Up to 550mbps',
  'Unlimited FTTP Broadband - Up to 1000mbps',
]
const INTL_PACKAGES = ['N/A', 'European Calls - 500 Mins', 'Worldwide Calls - 500 Mins', 'Other']

const BB_WHOLESALE: Record<string, number> = {
  'Line Only': 0,
  'MPF Broadband': 12.21,
  'Unlimited SOGEA Broadband - Up to 80mbps': 24.41,
  'Unlimited FTTP Broadband - Up to 80mbps': 27.0,
  'Unlimited FTTP Broadband - Up to 160mbps': 28.04,
  'Unlimited FTTP Broadband - Up to 330mbps': 32.2,
  'Unlimited FTTP Broadband - Up to 550mbps': 39.47,
  'Unlimited FTTP Broadband - Up to 1000mbps': 41.55,
}
const VOICE_OPTION_WHOLESALE: Record<string, number> = { WHC: 4.99, NFON: 10.5 }
const PHONE_ITEMS = [
  { key: 'app', label: 'Mobile App', wholesale: 0 },
  { key: 'yealink', label: 'Yealink Handset', wholesale: 3.05 },
  { key: 'additional', label: 'Additional Yealink Handset', wholesale: 1.92 },
  { key: 'desktop', label: 'Desktop Handset', wholesale: 1.95 },
  { key: 'cordless', label: 'Cordless Desk Phone Bundle', wholesale: 1.92 },
]

type PhoneQtys = Record<string, number>
type Errors = Record<string, boolean>

function SectionHeader({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-3 py-2">
      <div className="flex-1 h-px bg-border" />
      <span className="text-xs font-bold tracking-widest uppercase text-muted-foreground">
        {title}
      </span>
      <div className="flex-1 h-px bg-border" />
    </div>
  )
}

function QuestionCard({
  label,
  required,
  error,
  children,
}: {
  label: string
  required?: boolean
  error?: boolean
  children: React.ReactNode
}) {
  return (
    <Card className={cn(error && 'border-destructive bg-destructive/5')}>
      <CardContent className="pt-4 space-y-3">
        <Label className={cn('text-sm font-semibold', error && 'text-destructive')}>
          {label}
          {required && <span className="text-destructive ml-1">*</span>}
        </Label>
        {error && (
          <p className="text-xs text-destructive flex items-center gap-1">
            <AlertCircle className="size-3" />
            This field is required.
          </p>
        )}
        {children}
      </CardContent>
    </Card>
  )
}

function SRadioGroup({
  options,
  value,
  onChange,
  error,
}: {
  options: string[]
  value: string
  onChange: (v: string) => void
  error?: boolean
}) {
  return (
    <RadioGroup
      value={value}
      onValueChange={onChange}
      className={cn('space-y-1', error && 'border border-destructive rounded-md p-2')}
    >
      {options.map((opt) => (
        <div key={opt} className="flex items-center space-x-2">
          <RadioGroupItem value={opt} id={opt} />
          <Label htmlFor={opt} className="font-normal cursor-pointer">
            {opt}
          </Label>
        </div>
      ))}
    </RadioGroup>
  )
}

function PriceBreakdown({ lines }: { lines: { label: string; amount: number }[] }) {
  if (lines.length === 0) return null
  const total = lines.reduce((s, l) => s + l.amount, 0)
  return (
    <div className="rounded-md bg-primary/5 border border-primary/20 p-3 space-y-1">
      <p className="text-xs font-bold uppercase tracking-wide text-primary">Wholesale breakdown</p>
      {lines.map((l, i) => (
        <div key={i} className="flex justify-between text-xs text-muted-foreground">
          <span>{l.label}</span>
          <span className="font-semibold text-foreground">£{l.amount.toFixed(2)}</span>
        </div>
      ))}
      <div className="flex justify-between text-sm font-bold text-primary pt-1 border-t border-primary/20">
        <span>Auto-calculated total</span>
        <span>£{total.toFixed(2)}</span>
      </div>
    </div>
  )
}

export default function SalesForm({
  tenantId,
  createdBy,
  salesAgents,
  prefilledCustomer,
}: {
  tenantId: string
  createdBy: string
  salesAgents: string[]
  prefilledCustomer: {
    id: string
    companyName: string | null
    accountNumber: string
    title: string | null
    firstName: string
    lastName: string
    mobile: string | null
    landline: string | null
    postcode: string | null
    addressLine1: string | null
    addressLine2: string | null
    addressLine3: string | null
  } | null
}) {
  const [submitted, setSubmitted] = useState(false)
  const [errors, setErrors] = useState<Errors>({})
  const [submitting, setSubmitting] = useState(false)

  const [businessName, setBusinessName] = useState(prefilledCustomer?.companyName ?? '')
  const [customerTitle, setCustomerTitle] = useState(prefilledCustomer?.title ?? '')
  const [landline, setLandline] = useState(prefilledCustomer?.landline ?? '')
  const [customerFirstName, setCustomerFirstName] = useState(prefilledCustomer?.firstName ?? '')
  const [customerLastName, setCustomerLastName] = useState(prefilledCustomer?.lastName ?? '')
  const [mobile, setMobile] = useState(prefilledCustomer?.mobile ?? '')
  const [postcode, setPostcode] = useState(prefilledCustomer?.postcode ?? '')
  const [address1, setAddress1] = useState(prefilledCustomer?.addressLine1 ?? '')
  const [town, setTown] = useState(prefilledCustomer?.addressLine2 ?? '')
  const [county, setCounty] = useState(prefilledCustomer?.addressLine3 ?? '')
  const [date, setDate] = useState('')
  const [salesAgent, setSalesAgent] = useState('')
  const [closingAgent, setClosingAgent] = useState('')
  const [additionalHolder, setAdditionalHolder] = useState('')
  const [tradingAddress, setTradingAddress] = useState('')
  const [lineChecked, setLineChecked] = useState('')
  const [connectionFee, setConnectionFee] = useState('')
  const [connectionFeeOther, setConnectionFeeOther] = useState('')
  const [voice, setVoice] = useState('')
  const [currentVoiceType, setCurrentVoiceType] = useState('')
  const [lineType, setLineType] = useState('')
  const [numLicenses, setNumLicenses] = useState('')
  const [existingHandsets, setExistingHandsets] = useState('')
  const [voiceOption, setVoiceOption] = useState('')
  const [callTariff, setCallTariff] = useState('')
  const [bbType, setBbType] = useState('')
  const [installType, setInstallType] = useState('')
  const [serialNumber, setSerialNumber] = useState('')
  const [normalBbSpeed, setNormalBbSpeed] = useState('')
  const [minSpeed, setMinSpeed] = useState('')
  const [maxSpeed, setMaxSpeed] = useState('')
  const [bbCostOverride, setBbCostOverride] = useState<string | null>(null)
  const [bundlePrice, setBundlePrice] = useState('')
  const [intlPackage, setIntlPackage] = useState('')
  const [intlPackageOther, setIntlPackageOther] = useState('')
  const [intlLocation, setIntlLocation] = useState('')
  const [intlLocationOther, setIntlLocationOther] = useState('')
  const [premiumPackage, setPremiumPackage] = useState('')
  const [premiumOther, setPremiumOther] = useState('')
  const [phoneQtys, setPhoneQtys] = useState<PhoneQtys>({})
  const [billingType, setBillingType] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('')
  const [emailAddress, setEmailAddress] = useState('')
  const [phoneProvider, setPhoneProvider] = useState('')
  const [broadbandProvider, setBroadbandProvider] = useState('')
  const [billAmount, setBillAmount] = useState('')
  const [contractLength, setContractLength] = useState('')
  const [contractLengthOther, setContractLengthOther] = useState('')
  const [softFacts, setSoftFacts] = useState('')
  const [ddCollected, setDdCollected] = useState('')
  const [invoiceName, setInvoiceName] = useState('')
  const [bankBranch, setBankBranch] = useState('')
  const [sortCode, setSortCode] = useState('')
  const [accountNumber, setAccountNumber] = useState('')
  const [bankChecked, setBankChecked] = useState('')
  const [dealType, setDealType] = useState('')
  const [welcomeCall, setWelcomeCall] = useState('')

  // Wholesale lines
  const wholesaleLines: { label: string; amount: number }[] = []
  if (bbType && BB_WHOLESALE[bbType] !== undefined) {
    wholesaleLines.push({ label: bbType, amount: BB_WHOLESALE[bbType] ?? 0 })
  }
  if (voice === 'Yes' && voiceOption && VOICE_OPTION_WHOLESALE[voiceOption] !== undefined) {
    const perSeat = VOICE_OPTION_WHOLESALE[voiceOption] ?? 0
    if (lineType === 'Multi Line' && numLicenses && parseInt(numLicenses) > 0) {
      wholesaleLines.push({
        label: `${voiceOption} × ${numLicenses} licences`,
        amount: perSeat * parseInt(numLicenses),
      })
    } else {
      wholesaleLines.push({ label: voiceOption, amount: perSeat })
    }
  }
  PHONE_ITEMS.forEach((item) => {
    const qty = phoneQtys[item.key] ?? 0
    if (qty > 0)
      wholesaleLines.push({ label: `${item.label} × ${qty}`, amount: item.wholesale * qty })
  })

  const autoWholesale = wholesaleLines.reduce((s, l) => s + l.amount, 0)
  const bbCost =
    bbCostOverride !== null ? bbCostOverride : autoWholesale > 0 ? autoWholesale.toFixed(2) : ''
  const wholesaleManuallyEdited = bbCostOverride !== null

  const monthlyGp = (() => {
    const wholesale = parseFloat(bbCost) || 0
    const agreed = parseFloat(bundlePrice) || 0
    return agreed > 0 || wholesale > 0 ? (agreed - wholesale).toFixed(2) : ''
  })()

  const gpValue = parseFloat(monthlyGp) || 0
  const gpPositive = gpValue >= 0

  const handlePhoneQty = (key: string, qty: number) => {
    setPhoneQtys((prev) => {
      const next = { ...prev }
      if (qty <= 0) delete next[key]
      else next[key] = qty
      return next
    })
    setBbCostOverride(null)
  }

  const clear = (key: string) =>
    setErrors((prev) => {
      const n = { ...prev }
      delete n[key]
      return n
    })

  const validate = (): Errors => {
    const e: Errors = {}
    if (!date) e.date = true
    if (!salesAgent) e.salesAgent = true
    if (!closingAgent) e.closingAgent = true
    if (!businessName.trim()) e.businessName = true
    if (!customerTitle) e.customerTitle = true
    if (!customerFirstName.trim()) e.customerFirstName = true
    if (!customerLastName.trim()) e.customerLastName = true
    if (!landline.trim()) e.landline = true
    if (!postcode.trim()) e.postcode = true
    if (!address1.trim()) e.address1 = true
    if (!town.trim()) e.town = true
    if (!county.trim()) e.county = true
    if (!lineChecked) e.lineChecked = true
    if (!connectionFee) e.connectionFee = true
    if (connectionFee === 'Other' && !connectionFeeOther.trim()) e.connectionFeeOther = true
    if (!voice) e.voice = true
    if (voice === 'Yes') {
      if (!currentVoiceType) e.currentVoiceType = true
      if (!lineType) e.lineType = true
      if (lineType === 'Multi Line' && !numLicenses.trim()) e.numLicenses = true
      if (!voiceOption) e.voiceOption = true
      if (!callTariff) e.callTariff = true
    }
    if (!bbType) e.bbType = true
    if (!normalBbSpeed.trim()) e.normalBbSpeed = true
    if (!minSpeed.trim()) e.minSpeed = true
    if (!maxSpeed.trim()) e.maxSpeed = true
    if (!bbCost.trim()) e.bbCost = true
    if (!bundlePrice.trim()) e.bundlePrice = true
    if (!intlPackage) e.intlPackage = true
    if (intlPackage === 'Other' && !intlPackageOther.trim()) e.intlPackageOther = true
    if (!intlLocation) e.intlLocation = true
    if (intlLocation === 'Other' && !intlLocationOther.trim()) e.intlLocationOther = true
    if (!premiumPackage) e.premiumPackage = true
    if (premiumPackage === 'Other' && !premiumOther.trim()) e.premiumOther = true
    if (!billingType) e.billingType = true
    if (!paymentMethod) e.paymentMethod = true
    if (!phoneProvider.trim()) e.phoneProvider = true
    if (!broadbandProvider.trim()) e.broadbandProvider = true
    if (!billAmount.trim()) e.billAmount = true
    if (!contractLength) e.contractLength = true
    if (contractLength === 'Other' && !contractLengthOther.trim()) e.contractLengthOther = true
    if (!ddCollected) e.ddCollected = true
    if (ddCollected === 'Yes') {
      if (!invoiceName.trim()) e.invoiceName = true
      if (!bankBranch.trim()) e.bankBranch = true
      if (!sortCode.trim()) e.sortCode = true
      if (!accountNumber.trim()) e.accountNumber = true
      if (!bankChecked) e.bankChecked = true
    }
    if (!dealType) e.dealType = true
    if (!welcomeCall) e.welcomeCall = true
    return e
  }

  const handleSubmit = async () => {
    if (submitting) return
    setSubmitting(true)
    const e = validate()
    setErrors(e)
    setSubmitted(true)

    if (Object.keys(e).length > 0) {
      setTimeout(() => {
        document
          .querySelector('[data-error="true"]')
          ?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }, 50)
      setSubmitting(false)
      return
    }

    const phoneEquipment = PHONE_ITEMS.filter((item) => (phoneQtys[item.key] ?? 0) > 0).map(
      (item) => ({ item: item.label, qty: phoneQtys[item.key]!, wholesale: item.wholesale })
    )

    await submitDeal({
      existingCustomerId: prefilledCustomer?.id ?? null,
      tenantId,
      createdBy,
      businessName,
      customerTitle,
      customerFirstName,
      customerLastName,
      mobile,
      landline,
      email: emailAddress,
      postcode,
      address1,
      town,
      county,
      dealType,
      date,
      salesAgent,
      closingAgent,
      tradingAddress,
      softFacts,
      welcomeCall,
      lineChecked: lineChecked === 'Line checked – BT Wholesale',
      connectionFee,
      voice: voice === 'Yes',
      currentVoiceType,
      lineType,
      numLicenses,
      existingHandsets,
      voiceOption,
      callTariff,
      bbType,
      installType,
      serialNumber,
      normalBbSpeed,
      minSpeed,
      maxSpeed,
      intlPackage,
      intlPackageOther,
      intlLocation,
      intlLocationOther,
      premiumPackage,
      premiumOther,
      phoneEquipment,
      bbCost,
      bundlePrice,
      connectionFeeOther,
      monthlyGp,
      billAmount,
      contractLength,
      contractLengthOther,
      billingType,
      paymentMethod,
      emailAddress,
      phoneProvider,
      broadbandProvider,
      ddCollected: ddCollected === 'Yes',
      invoiceName,
      bankBranch,
      sortCode,
      accountNumber,
      bankChecked: bankChecked === 'Yes',
    })
  }

  const e = errors
  const errorCount = Object.keys(e).length

  return (
    <div className="max-w-2xl mx-auto pb-20 space-y-3">
      {/* Header card */}
      <Card className="overflow-hidden">
        <div className="h-2 bg-gradient-to-r from-primary via-purple-500 to-violet-500" />
        <CardHeader>
          <CardTitle className="text-2xl">New Deal Submission</CardTitle>
          <p className="text-sm text-muted-foreground">
            Complete all required fields before submitting. Fields marked{' '}
            <span className="text-destructive">*</span> are mandatory.
          </p>
        </CardHeader>
      </Card>

      {/* Error summary */}
      {submitted && errorCount > 0 && (
        <Card className="border-destructive bg-destructive/5">
          <CardContent className="pt-4 flex items-start gap-3">
            <AlertCircle className="size-4 text-destructive mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-destructive">
                {errorCount} required field{errorCount !== 1 ? 's' : ''} incomplete
              </p>
              <p className="text-xs text-destructive/80">
                Scroll up to review highlighted sections.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <SectionHeader title="Deal Information" />
      <QuestionCard label="Date" required error={!!e.date}>
        <Input
          type="date"
          value={date}
          onChange={(ev) => {
            setDate(ev.target.value)
            clear('date')
          }}
          className={cn(e.date && 'border-destructive')}
        />
      </QuestionCard>
      <QuestionCard label="Sales Agent" required error={!!e.salesAgent}>
        <Select
          value={salesAgent}
          onValueChange={(v) => {
            setSalesAgent(v ?? '')
            clear('salesAgent')
          }}
        >
          <SelectTrigger className={cn(e.salesAgent && 'border-destructive')}>
            <SelectValue placeholder="Select sales agent" />
          </SelectTrigger>
          <SelectContent>
            {salesAgents.map((a) => (
              <SelectItem key={a} value={a}>
                {a}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </QuestionCard>
      <QuestionCard label="Closing Agent" required error={!!e.closingAgent}>
        <Select
          value={closingAgent}
          onValueChange={(v) => {
            setClosingAgent(v ?? '')
            clear('closingAgent')
          }}
        >
          <SelectTrigger className={cn(e.closingAgent && 'border-destructive')}>
            <SelectValue placeholder="Select closing agent" />
          </SelectTrigger>
          <SelectContent>
            {salesAgents.map((a) => (
              <SelectItem key={a} value={a}>
                {a}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </QuestionCard>

      <SectionHeader title="Customer Details" />
      <QuestionCard label="Business Name" required error={!!e.businessName}>
        <Input
          value={businessName}
          onChange={(ev) => {
            setBusinessName(ev.target.value)
            clear('businessName')
          }}
          placeholder="e.g. Acme Ltd"
          className={cn(errors.businessName && 'border-destructive')}
        />
      </QuestionCard>
      <QuestionCard label="Customer Title" required error={!!e.customerTitle}>
        <Select
          value={customerTitle}
          onValueChange={(v) => {
            setCustomerTitle(v ?? '')
            clear('customerTitle')
          }}
        >
          <SelectTrigger className={cn(e.customerTitle && 'border-destructive')}>
            <SelectValue placeholder="Select title" />
          </SelectTrigger>
          <SelectContent>
            {TITLES.map((t) => (
              <SelectItem key={t} value={t}>
                {t}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </QuestionCard>
      <QuestionCard label="Customer First Name" required error={!!e.customerFirstName}>
        <Input
          value={customerFirstName}
          onChange={(ev) => {
            setCustomerFirstName(ev.target.value)
            clear('customerFirstName')
          }}
          placeholder="e.g. Robbie"
          className={cn(errors.customerFirstName && 'border-destructive')}
        />
      </QuestionCard>
      <QuestionCard label="Customer Last Name" required error={!!e.customerLastName}>
        <Input
          value={customerLastName}
          onChange={(ev) => {
            setCustomerLastName(ev.target.value)
            clear('customerLastName')
          }}
          placeholder="e.g. Woodhams"
          className={cn(errors.customerLastName && 'border-destructive')}
        />
      </QuestionCard>
      <QuestionCard label="Additional Account Holder">
        <Input
          value={additionalHolder}
          onChange={(ev) => setAdditionalHolder(ev.target.value)}
          placeholder="Full name (if applicable)"
        />
      </QuestionCard>
      <QuestionCard label="Landline Number" required error={!!e.landline}>
        <Input
          type="tel"
          value={landline}
          onChange={(ev) => {
            setLandline(ev.target.value.replace(/\D/g, ''))
            clear('landline')
          }}
          placeholder="e.g. 01213456789"
          className={cn(e.landline && 'border-destructive')}
        />
      </QuestionCard>
      <QuestionCard label="Mobile Number">
        <Input
          type="tel"
          value={mobile}
          onChange={(ev) => setMobile(ev.target.value.replace(/\D/g, ''))}
          placeholder="e.g. 07700900000"
        />
      </QuestionCard>

      <SectionHeader title="Address" />
      <QuestionCard label="Postcode" required error={!!e.postcode}>
        <Input
          value={postcode}
          maxLength={8}
          onChange={(ev) => {
            setPostcode(ev.target.value.toUpperCase())
            clear('postcode')
          }}
          placeholder="e.g. B1 1BB"
          className={cn(e.postcode && 'border-destructive')}
        />
      </QuestionCard>
      <QuestionCard label="Address Line 1" required error={!!e.address1}>
        <Input
          value={address1}
          onChange={(ev) => {
            setAddress1(ev.target.value)
            clear('address1')
          }}
          placeholder="Street address"
          className={cn(errors.address1 && 'border-destructive')}
        />
      </QuestionCard>
      <QuestionCard label="Town" required error={!!e.town}>
        <Input
          value={town}
          onChange={(ev) => {
            setTown(ev.target.value)
            clear('town')
          }}
          placeholder="e.g. Birmingham"
          className={cn(errors.town && 'border-destructive')}
        />
      </QuestionCard>
      <QuestionCard label="County" required error={!!e.county}>
        <Input
          value={county}
          onChange={(ev) => {
            setCounty(ev.target.value)
            clear('county')
          }}
          placeholder="e.g. Kent"
          className={cn(errors.county && 'border-destructive')}
        />
      </QuestionCard>
      <QuestionCard label="Trading Address">
        <Input
          value={tradingAddress}
          onChange={(ev) => setTradingAddress(ev.target.value)}
          placeholder="If different from above"
        />
      </QuestionCard>

      <SectionHeader title="Line & Connection" />
      <QuestionCard label="Line Checked" required error={!!e.lineChecked}>
        <SRadioGroup
          options={['Line checked – BT Wholesale', 'Line not checked']}
          value={lineChecked}
          onChange={(v) => {
            setLineChecked(v)
            clear('lineChecked')
          }}
          error={!!e.lineChecked}
        />
      </QuestionCard>
      <QuestionCard label="Connection Fee" required error={!!e.connectionFee}>
        <SRadioGroup
          options={['149.99', 'Other']}
          value={connectionFee}
          onChange={(v) => {
            setConnectionFee(v)
            clear('connectionFee')
          }}
          error={!!e.connectionFee}
        />
        {connectionFee === 'Other' && (
          <Input
            type="number"
            value={connectionFeeOther}
            onChange={(ev) => {
              setConnectionFeeOther(ev.target.value)
              clear('connectionFeeOther')
            }}
            placeholder="Enter amount (£)"
            className={cn('mt-2', e.connectionFeeOther && 'border-destructive')}
          />
        )}
      </QuestionCard>

      <SectionHeader title="Voice" />
      <QuestionCard label="Voice Required?" required error={!!e.voice}>
        <SRadioGroup
          options={['Yes', 'No']}
          value={voice}
          onChange={(v) => {
            setVoice(v)
            clear('voice')
          }}
          error={!!e.voice}
        />
      </QuestionCard>
      {voice === 'Yes' && (
        <>
          <QuestionCard label="Current Voice Type" required error={!!e.currentVoiceType}>
            <SRadioGroup
              options={['Analogue', 'VoIP']}
              value={currentVoiceType}
              onChange={(v) => {
                setCurrentVoiceType(v)
                clear('currentVoiceType')
              }}
              error={!!e.currentVoiceType}
            />
          </QuestionCard>
          <QuestionCard label="Line Configuration" required error={!!e.lineType}>
            <SRadioGroup
              options={['Single Line', 'Multi Line', 'MPF (Already has Broadband)']}
              value={lineType}
              onChange={(v) => {
                setLineType(v)
                clear('lineType')
                if (v === 'Single Line') {
                  setVoiceOption('WHC')
                  clear('voiceOption')
                }
                if (v === 'Multi Line') {
                  setVoiceOption('NFON')
                  clear('voiceOption')
                }
                if (v === 'MPF (Already has Broadband)') {
                  setVoiceOption('MPF')
                  clear('voiceOption')
                }
              }}
              error={!!e.lineType}
            />
          </QuestionCard>
          {lineType === 'Multi Line' && (
            <QuestionCard label="Number of Licences" required error={!!e.numLicenses}>
              <Input
                type="number"
                value={numLicenses}
                onChange={(ev) => {
                  setNumLicenses(ev.target.value)
                  clear('numLicenses')
                }}
                placeholder="e.g. 5"
                className={cn(errors.numLicenses && 'border-destructive')}
              />
            </QuestionCard>
          )}
          <QuestionCard label="Make of Existing Handsets">
            <Input
              value={existingHandsets}
              onChange={(ev) => setExistingHandsets(ev.target.value)}
              placeholder="e.g. Yealink T42S"
            />
          </QuestionCard>
          <QuestionCard label="Voice Option" required error={!!e.voiceOption}>
            <SRadioGroup
              options={['WHC', 'NFON', 'MPF']}
              value={voiceOption}
              onChange={(v) => {
                setVoiceOption(v)
                clear('voiceOption')
              }}
              error={!!e.voiceOption}
            />
          </QuestionCard>
          <QuestionCard label="Call Tariff" required error={!!e.callTariff}>
            <SRadioGroup
              options={CALL_TARIFFS}
              value={callTariff}
              onChange={(v) => {
                setCallTariff(v)
                clear('callTariff')
              }}
              error={!!e.callTariff}
            />
          </QuestionCard>
        </>
      )}

      <SectionHeader title="Broadband" />
      <QuestionCard label="Broadband Type" required error={!!e.bbType}>
        <SRadioGroup
          options={BB_TYPES}
          value={bbType}
          onChange={(v) => {
            setBbType(v)
            clear('bbType')
            setBbCostOverride(null)
          }}
          error={!!e.bbType}
        />
      </QuestionCard>
      {bbType.includes('FTTP') && (
        <QuestionCard label="New Install or Migration" required error={!!e.installType}>
          <SRadioGroup
            options={['Migration', 'New Install']}
            value={installType}
            onChange={(v) => {
              setInstallType(v)
              clear('installType')
            }}
            error={!!e.installType}
          />
        </QuestionCard>
      )}
      {installType === 'Migration' && bbType.includes('FTTP') && (
        <QuestionCard label="ONT Serial Number" required error={!!e.serialNumber}>
          <Input
            value={serialNumber}
            onChange={(ev) => {
              setSerialNumber(ev.target.value)
              clear('serialNumber')
            }}
            placeholder="e.g. ALCLF977A701"
            className={cn(errors.serialNumber && 'border-destructive')}
          />
        </QuestionCard>
      )}
      <QuestionCard label="Normal Available BB Speed (Mbps)" required error={!!e.normalBbSpeed}>
        <Input
          value={normalBbSpeed}
          onChange={(ev) => {
            setNormalBbSpeed(ev.target.value)
            clear('normalBbSpeed')
          }}
          placeholder="e.g. 80"
          className={cn(errors.normalBbSpeed && 'border-destructive')}
        />
      </QuestionCard>
      <QuestionCard label="Minimum Speed (Mbps)" required error={!!e.minSpeed}>
        <Input
          value={minSpeed}
          onChange={(ev) => {
            setMinSpeed(ev.target.value)
            clear('minSpeed')
          }}
          placeholder="e.g. 10"
          className={cn(errors.minSpeed && 'border-destructive')}
        />
      </QuestionCard>
      <QuestionCard label="Maximum Speed (Mbps)" required error={!!e.maxSpeed}>
        <Input
          value={maxSpeed}
          onChange={(ev) => {
            setMaxSpeed(ev.target.value)
            clear('maxSpeed')
          }}
          placeholder="e.g. 80"
          className={cn(errors.maxSpeed && 'border-destructive')}
        />
      </QuestionCard>

      <SectionHeader title="Extras & Packages" />
      <QuestionCard label="International Call Packages" required error={!!e.intlPackage}>
        <SRadioGroup
          options={INTL_PACKAGES}
          value={intlPackage}
          onChange={(v) => {
            setIntlPackage(v)
            clear('intlPackage')
          }}
          error={!!e.intlPackage}
        />
        {intlPackage === 'Other' && (
          <Input
            value={intlPackageOther}
            onChange={(ev) => {
              setIntlPackageOther(ev.target.value)
              clear('intlPackageOther')
            }}
            placeholder="Specify package(s)"
            className={cn('mt-2', e.intlPackageOther && 'border-destructive')}
          />
        )}
      </QuestionCard>
      <QuestionCard label="International Call Location" required error={!!e.intlLocation}>
        <SRadioGroup
          options={['N/A', 'Other']}
          value={intlLocation}
          onChange={(v) => {
            setIntlLocation(v)
            clear('intlLocation')
          }}
          error={!!e.intlLocation}
        />
        {intlLocation === 'Other' && (
          <Input
            value={intlLocationOther}
            onChange={(ev) => {
              setIntlLocationOther(ev.target.value)
              clear('intlLocationOther')
            }}
            placeholder="Specify location(s)"
            className={cn('mt-2', e.intlLocationOther && 'border-destructive')}
          />
        )}
      </QuestionCard>
      <QuestionCard label="Premium Rate Packages" required error={!!e.premiumPackage}>
        <SRadioGroup
          options={[
            'N/A',
            'Premium Package – 250 minutes',
            'Premium Package – 500 minutes',
            'Other',
          ]}
          value={premiumPackage}
          onChange={(v) => {
            setPremiumPackage(v)
            clear('premiumPackage')
          }}
          error={!!e.premiumPackage}
        />
        {premiumPackage === 'Other' && (
          <Input
            value={premiumOther}
            onChange={(ev) => {
              setPremiumOther(ev.target.value)
              clear('premiumOther')
            }}
            placeholder="Specify package details"
            className={cn('mt-2', e.premiumOther && 'border-destructive')}
          />
        )}
      </QuestionCard>

      {/* Phone Equipment */}
      <QuestionCard label="Phone & Equipment Add-ons">
        <div className="space-y-2">
          {PHONE_ITEMS.map((item) => {
            const qty = phoneQtys[item.key] ?? 0
            const selected = qty > 0
            return (
              <div key={item.key}>
                <div
                  className="flex items-center gap-3 p-2 rounded-md cursor-pointer hover:bg-muted/50"
                  onClick={() => handlePhoneQty(item.key, selected ? 0 : 1)}
                >
                  <div
                    className={cn(
                      'size-4 rounded flex items-center justify-center border-2 transition-colors',
                      selected ? 'bg-primary border-primary' : 'border-muted-foreground'
                    )}
                  >
                    {selected && <span className="text-primary-foreground text-xs">✓</span>}
                  </div>
                  <span className="flex-1 text-sm">{item.label}</span>
                  <span className="text-xs text-muted-foreground">
                    £{item.wholesale.toFixed(2)}/mo
                  </span>
                </div>
                {selected && item.key !== 'app' && (
                  <div className="ml-7 mt-1 flex items-center gap-3 p-2 rounded-md bg-primary/5 border border-primary/15">
                    <span className="text-xs text-muted-foreground flex-1">Quantity</span>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => handlePhoneQty(item.key, Math.max(0, qty - 1))}
                    >
                      −
                    </Button>
                    <span className="text-sm font-semibold w-5 text-center">{qty}</span>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => handlePhoneQty(item.key, qty + 1)}
                    >
                      +
                    </Button>
                    <span className="text-xs font-semibold text-primary">
                      = £{(item.wholesale * qty).toFixed(2)}/mo
                    </span>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </QuestionCard>

      <SectionHeader title="Pricing" />
      <QuestionCard label="Deal Wholesale Cost (£/month)" required error={!!e.bbCost}>
        <PriceBreakdown lines={wholesaleLines} />
        <Input
          type="number"
          value={bbCost}
          onChange={(ev) => {
            setBbCostOverride(ev.target.value)
            clear('bbCost')
          }}
          placeholder="e.g. 29.99"
          className={cn('mt-2', e.bbCost && 'border-destructive')}
        />
        {wholesaleLines.length > 0 && !wholesaleManuallyEdited && (
          <p className="text-xs text-muted-foreground mt-1">Auto-calculated — edit to override.</p>
        )}
        {wholesaleManuallyEdited && (
          <button
            onClick={() => setBbCostOverride(null)}
            className="text-xs text-primary underline mt-1"
          >
            Reset to auto-calculated (£{autoWholesale.toFixed(2)})
          </button>
        )}
      </QuestionCard>
      <QuestionCard label="Deal Agreed Price (£/month)" required error={!!e.bundlePrice}>
        <Input
          type="number"
          value={bundlePrice}
          onChange={(ev) => {
            setBundlePrice(ev.target.value)
            clear('bundlePrice')
          }}
          placeholder="e.g. 49.99"
          className={cn(errors.bundlePrice && 'border-destructive')}
        />
      </QuestionCard>
      <QuestionCard label="Monthly GP (£)" required error={!!e.monthlyGp}>
        <div className="flex items-center gap-3">
          <Input
            type="number"
            value={monthlyGp}
            readOnly
            placeholder="Auto-calculated"
            className="opacity-80"
          />
          {monthlyGp !== '' && (
            <span
              className={cn(
                'shrink-0 px-3 py-1.5 rounded-md text-sm font-bold border',
                gpPositive
                  ? 'bg-green-500/10 text-green-600 border-green-500/20'
                  : 'bg-destructive/10 text-destructive border-destructive/20'
              )}
            >
              {gpPositive ? '+' : ''}£{gpValue.toFixed(2)}
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Auto-calculated as Agreed Price − Wholesale Cost.
        </p>
      </QuestionCard>

      <SectionHeader title="Billing & Contract" />
      <QuestionCard label="Billing Type" required error={!!e.billingType}>
        <SRadioGroup
          options={['Paper', 'Email']}
          value={billingType}
          onChange={(v) => {
            setBillingType(v)
            clear('billingType')
          }}
          error={!!e.billingType}
        />
      </QuestionCard>
      <QuestionCard label="Preferred Payment Method" required error={!!e.paymentMethod}>
        <SRadioGroup
          options={['DD', 'Mandate', 'Card / Bacs']}
          value={paymentMethod}
          onChange={(v) => {
            setPaymentMethod(v)
            clear('paymentMethod')
          }}
          error={!!e.paymentMethod}
        />
      </QuestionCard>
      <QuestionCard label="Email Address">
        <Input
          type="email"
          value={emailAddress}
          onChange={(ev) => setEmailAddress(ev.target.value)}
          placeholder="e.g. billing@company.com"
        />
      </QuestionCard>
      <QuestionCard label="Phone Provider" required error={!!e.phoneProvider}>
        <Input
          value={phoneProvider}
          onChange={(ev) => {
            setPhoneProvider(ev.target.value)
            clear('phoneProvider')
          }}
          placeholder="e.g. BT, Sky, Virgin"
          className={cn(errors.phoneProvider && 'border-destructive')}
        />
      </QuestionCard>
      <QuestionCard label="Broadband Provider" required error={!!e.broadbandProvider}>
        <Input
          value={broadbandProvider}
          onChange={(ev) => {
            setBroadbandProvider(ev.target.value)
            clear('broadbandProvider')
          }}
          placeholder="e.g. BT, TalkTalk"
          className={cn(errors.broadbandProvider && 'border-destructive')}
        />
      </QuestionCard>
      <QuestionCard label="Bill Amount with Losing Supplier (£)" required error={!!e.billAmount}>
        <Input
          type="number"
          value={billAmount}
          onChange={(ev) => {
            setBillAmount(ev.target.value)
            clear('billAmount')
          }}
          placeholder="e.g. 45.00"
          className={cn(errors.billAmount && 'border-destructive')}
        />
      </QuestionCard>
      <QuestionCard label="Contract Length" required error={!!e.contractLength}>
        <SRadioGroup
          options={['24 Months', '36 Months', '48 Months', 'Other']}
          value={contractLength}
          onChange={(v) => {
            setContractLength(v)
            clear('contractLength')
          }}
          error={!!e.contractLength}
        />
        {contractLength === 'Other' && (
          <Input
            value={contractLengthOther}
            onChange={(ev) => {
              setContractLengthOther(ev.target.value)
              clear('contractLengthOther')
            }}
            placeholder="Specify contract length"
            className={cn('mt-2', e.contractLengthOther && 'border-destructive')}
          />
        )}
      </QuestionCard>
      <QuestionCard label="Soft Facts">
        <Textarea
          value={softFacts}
          onChange={(ev) => setSoftFacts(ev.target.value)}
          placeholder="Any additional notes about the customer or deal"
        />
      </QuestionCard>

      <SectionHeader title="Direct Debit" />
      <QuestionCard label="Sort Code & Account Number Collected?" required error={!!e.ddCollected}>
        <SRadioGroup
          options={['Yes', 'No']}
          value={ddCollected}
          onChange={(v) => {
            setDdCollected(v)
            clear('ddCollected')
          }}
          error={!!e.ddCollected}
        />
      </QuestionCard>
      {ddCollected === 'Yes' && (
        <>
          <QuestionCard label="Invoice Name" required error={!!e.invoiceName}>
            <Input
              value={invoiceName}
              onChange={(ev) => {
                setInvoiceName(ev.target.value)
                clear('invoiceName')
              }}
              placeholder="Name on invoice"
              className={cn(errors.invoiceName && 'border-destructive')}
            />
          </QuestionCard>
          <QuestionCard label="Bank Branch" required error={!!e.bankBranch}>
            <Input
              value={bankBranch}
              onChange={(ev) => {
                setBankBranch(ev.target.value)
                clear('bankBranch')
              }}
              placeholder="e.g. Lloyds Bank Birmingham"
              className={cn(errors.bankBranch && 'border-destructive')}
            />
          </QuestionCard>
          <QuestionCard label="Sort Code" required error={!!e.sortCode}>
            <Input
              type="number"
              value={sortCode}
              onChange={(ev) => {
                setSortCode(ev.target.value)
                clear('sortCode')
              }}
              placeholder="e.g. 123456"
              className={cn(e.sortCode && 'border-destructive')}
            />
          </QuestionCard>
          <QuestionCard label="Account Number" required error={!!e.accountNumber}>
            <Input
              type="number"
              value={accountNumber}
              onChange={(ev) => {
                setAccountNumber(ev.target.value)
                clear('accountNumber')
              }}
              placeholder="e.g. 12345678"
              className={cn(e.accountNumber && 'border-destructive')}
            />
          </QuestionCard>
          <QuestionCard label="Bank Info Checked on IBAN" required error={!!e.bankChecked}>
            <SRadioGroup
              options={['Yes', 'No']}
              value={bankChecked}
              onChange={(v) => {
                setBankChecked(v)
                clear('bankChecked')
              }}
              error={!!e.bankChecked}
            />
          </QuestionCard>
        </>
      )}

      <SectionHeader title="Deal & Welcome" />
      <QuestionCard label="Deal Type" required error={!!e.dealType}>
        <Select
          value={dealType}
          onValueChange={(v) => {
            setDealType(v ?? '')
            clear('dealType')
          }}
        >
          <SelectTrigger className={cn(e.dealType && 'border-destructive')}>
            <SelectValue placeholder="Select deal type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Business">Business</SelectItem>
            <SelectItem value="Residential">Residential</SelectItem>
          </SelectContent>
        </Select>
      </QuestionCard>
      <QuestionCard label="Welcome Call" required error={!!e.welcomeCall}>
        <SRadioGroup
          options={['AM', 'PM']}
          value={welcomeCall}
          onChange={(v) => {
            setWelcomeCall(v)
            clear('welcomeCall')
          }}
          error={!!e.welcomeCall}
        />
      </QuestionCard>

      {/* Submit */}
      <div className="pt-4 space-y-3">
        {submitted && errorCount > 0 && (
          <p className="text-center text-sm text-destructive font-medium">
            {errorCount} field{errorCount !== 1 ? 's' : ''} still incomplete — review above.
          </p>
        )}
        <Button className="w-full" size="lg" disabled={submitting} onClick={handleSubmit}>
          {submitting ? 'Submitting...' : 'Submit Sale'}
        </Button>
        <p className="text-center text-xs text-muted-foreground">
          Ensure all required fields are completed before submitting.
        </p>
      </div>
    </div>
  )
}
