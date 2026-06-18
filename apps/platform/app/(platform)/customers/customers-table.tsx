'use client'

import { useRouter } from 'next/navigation'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { Customer } from '@roaring/db'
import { CUSTOMER_STATUS_COLOURS } from '@/lib/constants'

export function CustomersTable({ customers }: { customers: Customer[] }) {
  const router = useRouter()

  return (
    <div className="border rounded-lg overflow-hidden overflow-x-auto">
      <Table className="min-w-max">
        <TableHeader>
          <TableRow>
            <TableHead>Account</TableHead>
            <TableHead>Company</TableHead>
            <TableHead>Contact</TableHead>
            <TableHead>Postcode</TableHead>
            <TableHead>Mobile</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {customers.map((customer) => (
            <TableRow
              key={customer.id}
              className="cursor-pointer hover:bg-muted/50"
              onClick={() => router.push(`/customers/${customer.accountNumber}`)}
            >
              <TableCell className="font-mono text-sm">{customer.accountNumber}</TableCell>
              <TableCell className="font-medium">
                {customer.companyName ?? `${customer.firstName} ${customer.lastName}`}
              </TableCell>
              <TableCell>
                {customer.firstName} {customer.lastName}
              </TableCell>
              <TableCell className="font-mono text-sm">{customer.postcode ?? '—'}</TableCell>
              <TableCell>{customer.mobile ?? '—'}</TableCell>
              <TableCell>
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${CUSTOMER_STATUS_COLOURS[customer.status]}`}
                >
                  {customer.status.replace('_', ' ')}
                </span>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {customers.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">No customers yet.</div>
      )}
    </div>
  )
}
