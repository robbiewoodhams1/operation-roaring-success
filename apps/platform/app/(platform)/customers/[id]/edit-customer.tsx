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

function SL({
  value,
  onChange,
  isEditing,
  options,
}: {
  value: string
  onChange: (v: string) => void
  isEditing: boolean
  options: string[]
}) {
  return isEditing ? (
    <Select value={value} onValueChange={onChange}>
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
    <span className="text-sm capitalize">{(value || '—').replace(/_/g, ' ')}</span>
  )
}

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
          <SL
            value={form.type}
            onChange={(v) => update('type', v)}
            isEditing={isEditing}
            options={CUSTOMER_TYPES}
          />
        </Row>
        <Row label="Status">
          <SL
            value={form.status}
            onChange={(v) => update('status', v)}
            isEditing={isEditing}
            options={CUSTOMER_STATUSES}
          />
        </Row>
        <Row label="Company name">
          <F
            value={form.companyName}
            onChange={(v) => update('companyName', v)}
            isEditing={isEditing}
          />
        </Row>
      </Section>

      <Section title="Contact">
        <Row label="First name">
          <F
            value={form.firstName}
            onChange={(v) => update('firstName', v)}
            isEditing={isEditing}
          />
        </Row>
        <Row label="Last name">
          <F value={form.lastName} onChange={(v) => update('lastName', v)} isEditing={isEditing} />
        </Row>
        <Row label="Mobile">
          <F value={form.mobile} onChange={(v) => update('mobile', v)} isEditing={isEditing} mono />
        </Row>
        <Row label="Email">
          <F value={form.email} onChange={(v) => update('email', v)} isEditing={isEditing} />
        </Row>
      </Section>

      <Section title="Address">
        <Row label="Line 1">
          <F
            value={form.addressLine1}
            onChange={(v) => update('addressLine1', v)}
            isEditing={isEditing}
          />
        </Row>
        <Row label="Line 2">
          <F
            value={form.addressLine2}
            onChange={(v) => update('addressLine2', v)}
            isEditing={isEditing}
          />
        </Row>
        <Row label="Line 3">
          <F
            value={form.addressLine3}
            onChange={(v) => update('addressLine3', v)}
            isEditing={isEditing}
          />
        </Row>
        <Row label="Line 4">
          <F
            value={form.addressLine4}
            onChange={(v) => update('addressLine4', v)}
            isEditing={isEditing}
          />
        </Row>
        <Row label="Postcode">
          <F
            value={form.postcode}
            onChange={(v) => update('postcode', v)}
            isEditing={isEditing}
            mono
          />
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
