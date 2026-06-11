'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import CopyButton from '@/components/copy-button'

function Section({
  title,
  children,
  collapsed,
  onToggle,
}: {
  title: string
  children: React.ReactNode
  collapsed: boolean
  onToggle: () => void
}) {
  return (
    <section className="border rounded-lg overflow-hidden">
      <div className="px-4 py-3 border-b bg-muted/30 flex items-center justify-between">
        <h2 className="text-sm font-medium">{title}</h2>
        <button
          onClick={onToggle}
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          {collapsed ? <ChevronDown className="size-4" /> : <ChevronUp className="size-4" />}
        </button>
      </div>
      {!collapsed && <div className="divide-y">{children}</div>}
    </section>
  )
}

function Row({
  label,
  value,
  mono = false,
  copyable = false,
}: {
  label: string
  value: string | null | undefined
  mono?: boolean
  copyable?: boolean
}) {
  return (
    <div className="flex px-4 py-3">
      <span className="text-muted-foreground w-40 shrink-0 text-sm">{label}</span>
      <span className={`text-sm flex items-center gap-1 flex-1 ${mono ? 'font-mono' : ''}`}>
        {value ?? '—'}
        {copyable && value && (
          <span className="ml-auto">
            <CopyButton value={value} />
          </span>
        )}
      </span>
    </div>
  )
}

type ServicesData = {
  broadbandType: string | null
  ontSerialNumber: string | null
  normalSpeed: string | null
  minSpeed: string | null
  maxSpeed: string | null
  voiceOption: string | null
  callTariff: string | null
  equipment: { item: string; qty: number }[] | null
}

type CustomerData = {
  accountNumber: string
  companyName: string | null
  firstName: string
  lastName: string
  title: string | null
  mobile: string | null
  landline: string | null
  email: string | null
  addressLine1: string | null
  addressLine2: string | null
  addressLine3: string | null
  addressLine4: string | null
  postcode: string | null
}

type DealData = {
  salesAgent: string
  closingAgent: string
  dealType: string
  softFacts: string | null
}

export default function ProvisioningDetail({
  services,
  customer,
  deal,
}: {
  services: ServicesData | null
  customer: CustomerData
  deal: DealData
}) {
  const [collapsed, setCollapsed] = useState({
    services: false,
    customer: false,
    deal: false,
  })

  const allCollapsed = Object.values(collapsed).every(Boolean)

  function toggleAll() {
    const next = !allCollapsed
    setCollapsed({ services: next, customer: next, deal: next })
  }

  function toggle(key: keyof typeof collapsed) {
    setCollapsed((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <button
          onClick={toggleAll}
          className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
        >
          {allCollapsed ? (
            <>
              <ChevronDown className="size-3" />
              Expand all
            </>
          ) : (
            <>
              <ChevronUp className="size-3" />
              Collapse all
            </>
          )}
        </button>
      </div>

      {services && (
        <Section
          title="Services (from deal)"
          collapsed={collapsed.services}
          onToggle={() => toggle('services')}
        >
          <Row label="Broadband type" value={services.broadbandType} copyable />
          <Row label="ONT serial" value={services.ontSerialNumber} mono copyable />
          <Row label="Normal speed" value={services.normalSpeed} copyable />
          <Row label="Min speed" value={services.minSpeed} copyable />
          <Row label="Max speed" value={services.maxSpeed} copyable />
          <Row label="Voice option" value={services.voiceOption?.toUpperCase()} copyable />
          <Row label="Call tariff" value={services.callTariff} copyable />
          <Row
            label="Equipment"
            value={
              services.equipment
                ? services.equipment.map((e) => `${e.item} × ${e.qty}`).join(', ')
                : null
            }
            copyable
          />
        </Section>
      )}

      <Section title="Customer" collapsed={collapsed.customer} onToggle={() => toggle('customer')}>
        <Row label="Account number" value={customer.accountNumber} mono copyable />
        <Row label="Company" value={customer.companyName} copyable />
        <Row label="Title" value={customer.title} copyable />
        <Row label="First Name" value={customer.firstName} copyable />
        <Row label="Last Name" value={customer.lastName} copyable />
        <Row label="Mobile" value={customer.mobile} copyable />
        <Row label="Landline" value={customer.landline} copyable />
        <Row label="Email" value={customer.email} copyable />
        <Row label="Address Line 1" value={customer.addressLine1} copyable />
        <Row label="Address Line 2" value={customer.addressLine2} copyable />
        <Row label="Address Line 3" value={customer.addressLine3} copyable />
        <Row label="Address Line 4" value={customer.addressLine4} copyable />
        <Row label="Postcode" value={customer.postcode} copyable />
      </Section>

      <Section title="Deal" collapsed={collapsed.deal} onToggle={() => toggle('deal')}>
        <Row label="Sales agent" value={deal.salesAgent} copyable />
        <Row label="Closing agent" value={deal.closingAgent} copyable />
        <Row label="Deal type" value={deal.dealType} copyable />
        <Row label="Soft facts" value={deal.softFacts} copyable />
      </Section>
    </div>
  )
}
