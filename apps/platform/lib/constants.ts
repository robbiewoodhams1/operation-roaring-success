// Shared constants used across multiple components in the platform app

// ── Audit ─────────────────────────────────────────────────────────────────────

export const AUDIT_ACTION_COLOURS: Record<string, string> = {
  INSERT: 'bg-green-100 text-green-800 border-green-200',
  UPDATE: 'bg-blue-100 text-blue-800 border-blue-200',
  DELETE: 'bg-red-100 text-red-800 border-red-200',
}

export const AUDIT_TABLE_LABELS: Record<string, string> = {
  customers: 'Customer',
  deals: 'Deal',
  provisioning: 'Provisioning',
  provisioning_services: 'Service',
  deal_services: 'Deal services',
  deal_pricing: 'Deal pricing',
  deal_billing: 'Deal billing',
  users: 'User',
}

// ── Faults ────────────────────────────────────────────────────────────────────

export const FAULT_STATUS_LABELS: Record<string, string> = {
  outstanding: 'Outstanding',
  in_progress: 'In progress',
  resolved: 'Resolved',
}

export const FAULT_TYPE_LABELS: Record<string, string> = {
  bb: 'Broadband',
  line: 'Line',
  upgrade: 'Upgrade',
  dfb: 'DFB',
  provisioning: 'Provisioning',
  mobile: 'Mobile',
}

export const FAULT_STATUSES = Object.keys(FAULT_STATUS_LABELS)
export const FAULT_TYPES = Object.keys(FAULT_TYPE_LABELS)

export const FAULT_STATUS_COLOURS: Record<string, string> = {
  outstanding: 'bg-red-100 text-red-800 border-red-200',
  in_progress: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  resolved: 'bg-green-100 text-green-800 border-green-200',
}

export const FAULT_TYPE_COLOURS: Record<string, string> = {
  bb: 'bg-blue-100 text-blue-800 border-blue-200',
  line: 'bg-purple-100 text-purple-800 border-purple-200',
  upgrade: 'bg-indigo-100 text-indigo-800 border-indigo-200',
  dfb: 'bg-orange-100 text-orange-800 border-orange-200',
  provisioning: 'bg-cyan-100 text-cyan-800 border-cyan-200',
  mobile: 'bg-pink-100 text-pink-800 border-pink-200',
  ticket: 'bg-gray-100 text-gray-700 border-gray-200',
}

// ── Deals ─────────────────────────────────────────────────────────────────────

export const DEAL_STATUS_COLOURS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  live: 'bg-green-100 text-green-800 border-green-200',
  cancelled: 'bg-red-100 text-red-800 border-red-200',
}

export const DEAL_CONTRACT_LABELS: Record<string, string> = {
  '24_months': '24m',
  '36_months': '36m',
  '48_months': '48m',
  other: 'Other',
}

// ── Provisioning ──────────────────────────────────────────────────────────────

export const PROV_STATUS_COLOURS: Record<string, string> = {
  not_started: 'bg-gray-100 text-gray-700 border-gray-200',
  in_progress: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  broadband_applied: 'bg-blue-100 text-blue-800 border-blue-200',
  whc_applied: 'bg-purple-100 text-purple-800 border-purple-200',
  broadband_and_whc_applied: 'bg-indigo-100 text-indigo-800 border-indigo-200',
  live: 'bg-green-100 text-green-800 border-green-200',
  failed: 'bg-red-100 text-red-800 border-red-200',
}

export const PROV_STATUS_LABELS: Record<string, string> = {
  not_started: 'Not started',
  in_progress: 'In progress',
  broadband_applied: 'BB applied',
  whc_applied: 'WHC applied',
  broadband_and_whc_applied: 'BB & WHC applied',
  live: 'Live',
  failed: 'Failed',
}

export const PROV_STATUSES = [
  'not_started',
  'in_progress',
  'broadband_applied',
  'whc_applied',
  'broadband_and_whc_applied',
  'live',
  'failed',
]
export const SERVICE_STATUS_COLOURS: Record<string, string> = {
  not_applied: 'bg-gray-100 text-gray-700 border-gray-200',
  cant_provision: 'bg-orange-100 text-orange-800 border-orange-200',
  applied: 'bg-blue-100 text-blue-800 border-blue-200',
  delayed: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  cancelled: 'bg-red-100 text-red-800 border-red-200',
  live: 'bg-green-100 text-green-800 border-green-200',
}

export const SERVICE_STATUSES = [
  'not_applied',
  'cant_provision',
  'applied',
  'delayed',
  'cancelled',
  'live',
]
export const WC_COLOURS: Record<string, string> = {
  answered: 'bg-green-100 text-green-800 border-green-200',
  call_back: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  no_answer: 'bg-gray-100 text-gray-700 border-gray-200',
  cancelled: 'bg-red-100 text-red-800 border-red-200',
}

export const WC_OUTCOMES = ['call_back', 'answered', 'no_answer', 'cancelled']
export const CANCELLED_BY_OPTIONS = ['customer', 'bt_wholesale', 'openreach', 'us']
// ── Customers ─────────────────────────────────────────────────────────────────

export const CUSTOMER_STATUS_COLOURS: Record<string, string> = {
  active: 'bg-green-100 text-green-800 border-green-200',
  prospect: 'bg-blue-100 text-blue-800 border-blue-200',
  at_risk: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  churned: 'bg-red-100 text-red-800 border-red-200',
}

export const CUSTOMER_TYPE_COLOURS: Record<string, string> = {
  business: 'bg-purple-100 text-purple-800 border-purple-200',
  residential: 'bg-orange-100 text-orange-800 border-orange-200',
}

// ── Complaints ─────────────────────────────────────────────────────────────────

export const COMPLAINT_STATUS_LABELS: Record<string, string> = {
  open: 'Open',
  investigating: 'Investigating',
  pending_customer: 'Pending customer',
  pending_chess: 'Pending Chess',
  pending_tech: 'Pending tech',
  pending_recorded_call: 'Pending recorded call',
  ofcom: 'Ofcom',
  cisas: 'CISAS',
  scheduled_call_back: 'Scheduled call back',
  closed: 'Closed',
}

export const COMPLAINT_TYPE_LABELS: Record<string, string> = {
  bb: 'Broadband',
  line: 'Line',
  upgrade: 'Upgrade',
  dfb: 'DFB',
  provisioning: 'Provisioning',
  mobile: 'Mobile',
  billing: 'Billing',
  service: 'Service',
  other: 'Other',
}

export const COMPLAINT_STATUSES = Object.keys(COMPLAINT_STATUS_LABELS)
export const COMPLAINT_TYPES = Object.keys(COMPLAINT_TYPE_LABELS)

export const COMPLAINT_STATUS_COLOURS: Record<string, string> = {
  open: 'bg-red-100 text-red-800 border-red-200',
  investigating: 'bg-blue-100 text-blue-800 border-blue-200',
  pending_customer: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  pending_chess: 'bg-orange-100 text-orange-800 border-orange-200',
  pending_tech: 'bg-purple-100 text-purple-800 border-purple-200',
  pending_recorded_call: 'bg-indigo-100 text-indigo-800 border-indigo-200',
  ofcom: 'bg-pink-100 text-pink-800 border-pink-200',
  cisas: 'bg-rose-100 text-rose-800 border-rose-200',
  scheduled_call_back: 'bg-cyan-100 text-cyan-800 border-cyan-200',
  closed: 'bg-green-100 text-green-800 border-green-200',
}

export const COMPLAINT_TYPE_COLOURS: Record<string, string> = {
  bb: 'bg-blue-100 text-blue-800 border-blue-200',
  line: 'bg-purple-100 text-purple-800 border-purple-200',
  upgrade: 'bg-indigo-100 text-indigo-800 border-indigo-200',
  dfb: 'bg-orange-100 text-orange-800 border-orange-200',
  provisioning: 'bg-cyan-100 text-cyan-800 border-cyan-200',
  mobile: 'bg-pink-100 text-pink-800 border-pink-200',
  billing: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  service: 'bg-gray-100 text-gray-700 border-gray-200',
  other: 'bg-muted text-muted-foreground border-border',
}

// ── Debts ─────────────────────────────────────────────────────────────────

export const DEBT_OUTCOME_LABELS: Record<string, string> = {
  payment: 'Payment',
  payment_plan: 'Payment plan',
  no_answer: 'No answer',
  invalid_contact_details: 'Invalid contact details',
  refused: 'Refused',
  call_back: 'Call back',
  left: 'Left',
  promised_payment: 'Promised payment',
  free_bill: 'Free bill',
  taken_by_dd_already: 'Taken by DD already',
  deceased: 'Deceased',
  not_in_live_list: 'Not in live list',
  needs_investigating: 'Needs investigating',
  active_dd: 'Active DD',
  part_payment: 'Part payment',
  take_on_dd: 'Take on DD',
  uncollectable: 'Uncollectable',
}

export const DEBT_PAYMENT_TYPE_LABELS: Record<string, string> = {
  bacs: 'BACS',
  card: 'Card',
  dd: 'DD',
  cheque: 'Cheque',
  eft: 'EFT',
}

export const DEBT_OUTCOMES = Object.keys(DEBT_OUTCOME_LABELS)
export const DEBT_PAYMENT_TYPES = Object.keys(DEBT_PAYMENT_TYPE_LABELS)

export const DEBT_OUTCOME_COLOURS: Record<string, string> = {
  payment: 'bg-green-100 text-green-800 border-green-200',
  payment_plan: 'bg-teal-100 text-teal-800 border-teal-200',
  no_answer: 'bg-gray-100 text-gray-700 border-gray-200',
  invalid_contact_details: 'bg-orange-100 text-orange-800 border-orange-200',
  refused: 'bg-red-100 text-red-800 border-red-200',
  call_back: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  left: 'bg-gray-100 text-gray-700 border-gray-200',
  promised_payment: 'bg-blue-100 text-blue-800 border-blue-200',
  free_bill: 'bg-purple-100 text-purple-800 border-purple-200',
  taken_by_dd_already: 'bg-green-100 text-green-800 border-green-200',
  deceased: 'bg-zinc-100 text-zinc-800 border-zinc-200',
  not_in_live_list: 'bg-zinc-100 text-zinc-700 border-zinc-200',
  needs_investigating: 'bg-amber-100 text-amber-800 border-amber-200',
  active_dd: 'bg-green-100 text-green-800 border-green-200',
  part_payment: 'bg-cyan-100 text-cyan-800 border-cyan-200',
  take_on_dd: 'bg-indigo-100 text-indigo-800 border-indigo-200',
  uncollectable: 'bg-red-100 text-red-800 border-red-200',
}

// ── To Dos ─────────────────────────────────────────────────────────────────

export const TODO_PRIORITY_LABELS: Record<string, string> = {
  asap: 'ASAP',
  today: 'Today',
  tomorrow: 'Tomorrow',
  this_week: 'This week',
  no_rush: 'No rush',
}

export const TODO_PRIORITY_COLOURS: Record<string, string> = {
  asap: 'bg-red-100 text-red-800 border-red-200',
  today: 'bg-orange-100 text-orange-800 border-orange-200',
  tomorrow: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  this_week: 'bg-blue-100 text-blue-800 border-blue-200',
  no_rush: 'bg-gray-100 text-gray-700 border-gray-200',
}

export const TODO_PRIORITIES = Object.keys(TODO_PRIORITY_LABELS)

export const TODO_LINK_TYPE_LABELS: Record<string, string> = {
  customer: 'Customer',
  provisioning: 'Provisioning',
  fault: 'Fault',
  complaint: 'Complaint',
  debt: 'Debt',
  deal: 'Deal',
}

export const TODO_LINK_TYPES = Object.keys(TODO_LINK_TYPE_LABELS)

// ── Transfers and Ceases ─────────────────────────────────────────────────────────────────

export const TRANSFER_CEASE_TYPE_LABELS: Record<string, string> = {
  cease: 'Cease',
  transfer: 'Transfer',
  historical_transfer: 'Historical transfer',
  standard_cease: 'Standard cease',
  standard_transfer: 'Standard transfer',
}

export const TRANSFER_CEASE_STATUS_LABELS: Record<string, string> = {
  open: 'Open',
  in_progress: 'In progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
}

export const TRANSFER_CEASE_TYPES = Object.keys(TRANSFER_CEASE_TYPE_LABELS)
export const TRANSFER_CEASE_STATUSES = Object.keys(TRANSFER_CEASE_STATUS_LABELS)

export const TRANSFER_CEASE_TYPE_COLOURS: Record<string, string> = {
  cease: 'bg-red-100 text-red-800 border-red-200',
  transfer: 'bg-blue-100 text-blue-800 border-blue-200',
  historical_transfer: 'bg-gray-100 text-gray-700 border-gray-200',
  standard_cease: 'bg-orange-100 text-orange-800 border-orange-200',
  standard_transfer: 'bg-green-100 text-green-800 border-green-200',
}

export const TRANSFER_CEASE_STATUS_COLOURS: Record<string, string> = {
  open: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  in_progress: 'bg-blue-100 text-blue-800 border-blue-200',
  completed: 'bg-green-100 text-green-800 border-green-200',
  cancelled: 'bg-red-100 text-red-800 border-red-200',
}
