import { requireUser } from '@roaring/auth/server'
import { db, customers } from '@roaring/db'
import { eq } from 'drizzle-orm'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'

export default async function CustomerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await requireUser()

  const customer = await db.query.customers.findFirst({
    where: eq(customers.accountNumber, id),
  })

  if (!customer || customer.tenantId !== user.tenantId) {
    notFound()
  }

  return (
    <div className="px-6 max-w-3xl">
      <div className="flex items-center gap-4 mb-8">
        <Link href="/customers">
          <ArrowLeft className="size-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-semibold">
            {customer.companyName ?? `${customer.firstName} ${customer.lastName}`}
          </h1>
          <p className="text-sm font-mono text-muted-foreground">{customer.accountNumber}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <section className="border rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b bg-muted/30">
            <h2 className="text-sm font-medium">Account</h2>
          </div>
          <div className="divide-y">
            <Row label="Account number" value={customer.accountNumber} mono />
            <Row label="Type" value={customer.type} />
            <Row label="Status" value={customer.status.replace('_', ' ')} />
            {customer.companyName && <Row label="Company" value={customer.companyName} />}
          </div>
        </section>

        <section className="border rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b bg-muted/30">
            <h2 className="text-sm font-medium">Contact</h2>
          </div>
          <div className="divide-y">
            <Row label="Name" value={`${customer.firstName} ${customer.lastName}`} />
            <Row label="Mobile" value={customer.mobile} />
            <Row label="Email" value={customer.email} />
          </div>
        </section>

        <section className="border rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b bg-muted/30">
            <h2 className="text-sm font-medium">Address</h2>
          </div>
          <div className="divide-y">
            <Row label="Line 1" value={customer.addressLine1} />
            <Row label="Line 2" value={customer.addressLine2} />
            <Row label="Line 3" value={customer.addressLine3} />
            <Row label="Line 4" value={customer.addressLine4} />
            <Row label="Postcode" value={customer.postcode} mono />
          </div>
        </section>
      </div>
    </div>
  )
}

function Row({
  label,
  value,
  mono = false,
}: {
  label: string
  value: string | null | undefined
  mono?: boolean
}) {
  return (
    <div className="flex px-4 py-3">
      <span className="text-muted-foreground w-36 shrink-0 text-sm">{label}</span>
      <span className={`text-sm ${mono ? 'font-mono' : ''}`}>{value ?? '—'}</span>
    </div>
  )
}
