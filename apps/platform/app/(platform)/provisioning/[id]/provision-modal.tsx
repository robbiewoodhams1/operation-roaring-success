'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Check, Copy, X, Zap } from 'lucide-react'

type ProvisionData = {
  accountNumber: string
  customerName: string
  companyName: string | null
  title: string | null
  firstName: string
  lastName: string
  mobile: string | null
  landline: string | null
  email: string | null
  addressLine1: string | null
  addressLine2: string | null
  addressLine3: string | null
  postcode: string | null
  broadbandType: string | null
  ontSerialNumber: string | null
  businessType: string | null
}

function CopyField({
  num,
  label,
  value,
}: {
  num: number
  label: string
  value: string | null | undefined
}) {
  const [copied, setCopied] = useState(false)

  if (!value) return null

  async function handleCopy() {
    await navigator.clipboard.writeText(value!)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <button
      onClick={handleCopy}
      className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-muted/60 transition-colors text-left group"
    >
      <span className="size-6 rounded-md bg-muted text-muted-foreground text-xs font-bold flex items-center justify-center shrink-0 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
        {num}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium truncate">{value}</p>
      </div>
      {copied ? (
        <Check className="size-3.5 text-green-600 shrink-0" />
      ) : (
        <Copy className="size-3.5 text-muted-foreground shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
      )}
    </button>
  )
}

export function ProvisionModal({ data }: { data: ProvisionData }) {
  const [open, setOpen] = useState(false)

  const fields = [
    { label: 'Account number', value: data.accountNumber },
    { label: 'Company / Name', value: data.companyName ?? `${data.firstName} ${data.lastName}` },
    { label: 'Title', value: data.title },
    { label: 'First name', value: data.firstName },
    { label: 'Last name', value: data.lastName },
    { label: 'Last name capitalised', value: data.lastName?.toUpperCase() },
    { label: 'Mobile', value: data.mobile },
    { label: 'Landline', value: data.landline },
    { label: 'Email', value: data.email },
    {
      label: 'URL',
      value:
        (data.companyName ?? `${data.firstName}${data.lastName}`)
          .toLowerCase()
          .replace(/\s+/g, '') + '.co.uk',
    },
    { label: 'Address line 1', value: data.addressLine1 },
    { label: 'Address line 2', value: data.addressLine2 },
    { label: 'Address line 3', value: data.addressLine3 },
    { label: 'Postcode', value: data.postcode },
    { label: 'Broadband type', value: data.broadbandType },
    {
      label: 'Business Name',
      value: data.businessType === 'residential' ? 'Premier Talk' : 'Digital Fibre',
    },
    {
      label: 'Business Number',
      value: data.businessType === 'residential' ? '03300431746' : '01622392476',
    },
    {
      label: 'Business Email',
      value:
        data.businessType === 'residential'
          ? 'support@premier-talk.com'
          : 'support@digitalfibre.uk',
    },
  ].filter((f) => f.value)

  return (
    <>
      <Button
        size="sm"
        onClick={() => setOpen(true)}
        className="gap-2 bg-blue-700 hover:scale-104 hover:bg-blue-700 text-white"
      >
        <Zap className="size-3.5" />
        Provision
      </Button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />

          {/* Modal */}
          <div className="relative bg-background rounded-xl shadow-2xl w-full max-w-md mx-4 max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <div>
                <h2 className="text-sm font-semibold">Quick provision</h2>
                <p className="text-xs text-muted-foreground">
                  {data.customerName} · {data.accountNumber}
                </p>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="overflow-y-auto px-2 py-2 space-y-0.5">
              {fields.map((field, i) => (
                <CopyField key={field.label} num={i + 1} label={field.label} value={field.value} />
              ))}
            </div>

            <div className="px-4 py-3 border-t">
              <p className="text-xs text-muted-foreground">Click any row to copy to clipboard</p>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
