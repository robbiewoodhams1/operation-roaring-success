'use client'

import { ChangeHistory } from '@/components/change-history'
import type { AuditLog } from '@/lib/types'

// Nice labels for the fields we track. Falls back to prettified snake_case.
const FIELD_LABELS: Record<string, string> = {
  status: 'Status',
  // Welcome calls
  wc1_outcome: 'WC1 outcome',
  wc1_comments: 'WC1 comments',
  wc2_outcome: 'WC2 outcome',
  wc2_comments: 'WC2 comments',
  wc3_outcome: 'WC3 outcome',
  wc3_comments: 'WC3 comments',
  // Router
  router_dispatched: 'Router dispatched',
  router_dispatch_ref: 'Router dispatch ref',
  router_tracking_number: 'Router tracking number',
  // Order
  proposed_live_date: 'Proposed live date',
  date_ordered: 'Date ordered',
  order_comments: 'Order comments',
  order_fault_ref: 'Order fault ref',
  provisioner: 'Provisioner',
  last_checked_at: 'Last checked at',
  last_checked_by: 'Last checked by',
  // Service
  reference: 'Reference',
  live_date: 'Live date',
  cancelled_date: 'Cancelled date',
  cancelled_by: 'Cancelled by',
  cancellation_reason: 'Cancellation reason',
  delayed_date: 'Delayed date',
  presumed_solve_date: 'Presumed solve date',
  delay_reason: 'Delay reason',
  notes: 'Notes',
}

const SERVICE_LABELS: Record<string, string> = {
  bb: 'Broadband',
  whc: 'WHC',
  nfon: 'NFON',
  mpf: 'MPF',
}

// Which section of the record a provisioning field belongs to.
function sectionForField(
  tableName: string,
  data: Record<string, unknown> | null | undefined,
  field: string
): string {
  if (tableName === 'provisioning_services') {
    const type = SERVICE_LABELS[String(data?.service_type)] ?? 'Service'
    const attempt =
      typeof data?.attempt === 'number' && data.attempt > 1 ? ` · attempt ${data.attempt}` : ''
    return `${type}${attempt}`
  }
  if (field.startsWith('wc')) return 'Welcome Calls'
  if (field.startsWith('router_')) return 'Router'
  return 'Order'
}

export function ProvisioningHistory({
  logs,
  userNames,
}: {
  logs: AuditLog[]
  userNames: Record<string, string>
}) {
  return (
    <ChangeHistory
      logs={logs}
      userNames={userNames}
      fieldLabels={FIELD_LABELS}
      ignoredFields={['service_type', 'attempt']}
      sectionForField={sectionForField}
    />
  )
}
