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
