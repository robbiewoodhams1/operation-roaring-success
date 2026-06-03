'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Pencil } from 'lucide-react'
import { updateCustomer } from './actions'
import type { Customer } from '@roaring/db'

const CUSTOMER_TYPES = ['business', 'residential']
const CUSTOMER_STATUSES = ['prospect', 'active', 'at_risk', 'churned']

export function CustomerEdit({ customer }: { customer: Customer }) {
  const router = useRouter()
  const [isEditing, setIsEditing] = useState(false)
  const [saving, setSaving] = useState(false)

  const [form, setForm] = useState({
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
    type: customer.type as string,
    status: customer.status as string,
  })

  function update(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSave() {
    setSaving(true)
    await updateCustomer(customer.id, {
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
      type: form.type,
      status: form.status,
    })
    setSaving(false)
    setIsEditing(false)
    router.refresh()
  }

  function handleCancel() {
    setForm({
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
      type: customer.type as string,
      status: customer.status as string,
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

  const SL = ({ field, options }: { field: string; options: string[] }) =>
    isEditing ? (
      <Select
        value={form[field as keyof typeof form] as string}
        onValueChange={(v) => update(field, v)}
      >
        <SelectTrigger className="h-8 w-48">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
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

  return (
    <div className="space-y-6 pb-6">
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

      <Section title="Account">
        <Row label="Account number">
          <span className="text-sm font-mono">{customer.accountNumber}</span>
        </Row>
        <Row label="Type">
          <SL field="type" options={CUSTOMER_TYPES} />
        </Row>
        <Row label="Status">
          <SL field="status" options={CUSTOMER_STATUSES} />
        </Row>
        <Row label="Company name">
          <F field="companyName" />
        </Row>
      </Section>

      <Section title="Contact">
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
      </Section>

      <Section title="Address">
        <Row label="Line 1">
          <F field="addressLine1" />
        </Row>
        <Row label="Line 2">
          <F field="addressLine2" />
        </Row>
        <Row label="Line 3">
          <F field="addressLine3" />
        </Row>
        <Row label="Line 4">
          <F field="addressLine4" />
        </Row>
        <Row label="Postcode">
          <F field="postcode" mono />
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
