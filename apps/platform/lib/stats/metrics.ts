/**
 * The Stats Board metric registry — the single place metric definitions live.
 *
 * A metric is `active` only when its business definition AND its credit rule
 * have been approved (docs/STATS.md). Metrics awaiting approval are still
 * recorded as events by the database, but the board shows them as pending
 * rather than as numbers. `unavailable` means no CRM workflow produces the
 * event, so a count would be a misleading zero.
 */

export const EVENT_TYPES = [
  'deal_opened',
  'deal_closed',
  'service_applied',
  'service_live',
  'router_dispatched',
  'welcome_call_logged',
  'fault_resolved',
  'complaint_closed',
  'debt_closed',
  'transfer_completed',
  'cease_completed',
  'todo_completed',
] as const
export type EventType = (typeof EVENT_TYPES)[number]

export const SERVICE_TYPES = ['bb', 'mpf_broadband', 'whc', 'mpf_voice', 'nfon', 'mobile'] as const
export type ServiceType = (typeof SERVICE_TYPES)[number]

export const SERVICE_TYPE_LABELS: Record<ServiceType, string> = {
  bb: 'BB',
  mpf_broadband: 'MPF Broadband',
  whc: 'WHC',
  mpf_voice: 'MPF Voice',
  nfon: 'NFON',
  mobile: 'Mobile',
}

export type MetricStatus = 'active' | 'awaiting_approval' | 'unavailable'

export type MetricGroup =
  | 'sales'
  | 'provisioning'
  | 'provisioning_detail'
  | 'equipment'
  | 'service_desk'
  | 'collections'
  | 'lines'
  | 'tasks'

export const METRIC_GROUP_LABELS: Record<MetricGroup, string> = {
  sales: 'Sales',
  provisioning: 'Provisioning',
  provisioning_detail: 'Provisioning by service type',
  equipment: 'Equipment',
  service_desk: 'Service desk',
  collections: 'Collections',
  lines: 'Transfers & ceases',
  tasks: 'Tasks',
}

export interface MetricMatch {
  eventType: EventType
  /** Restricts to these service types; omitted means any. */
  serviceTypes?: readonly ServiceType[]
}

export interface MetricDefinition {
  key: string
  label: string
  group: MetricGroup
  /** Shown in the UI so everyone knows exactly what is being counted. */
  definition: string
  /** Who receives the credit. */
  creditedTo: string
  status: MetricStatus
  /** Why a non-active metric isn't shown yet. */
  statusNote?: string
  match: MetricMatch
  /** Offered as a leaderboard ranking. */
  leaderboard: boolean
}

const BROADBAND = ['bb', 'mpf_broadband'] as const
const VOICE = ['whc', 'mpf_voice', 'nfon'] as const

const AWAITING_CREDIT_RULE =
  'Events are being recorded. Waiting for approval of who receives the credit (the assignee or the person who completed it).'

function serviceMetrics(type: ServiceType): MetricDefinition[] {
  const label = SERVICE_TYPE_LABELS[type]
  return [
    {
      key: `${type}_applied`,
      label: `${label} applied`,
      group: 'provisioning_detail',
      definition: `${label} services whose status first reached “applied”. Retries of the same service count once.`,
      creditedTo: 'The provisioner assigned when it was applied',
      status: 'active',
      match: { eventType: 'service_applied', serviceTypes: [type] },
      leaderboard: true,
    },
    {
      key: `${type}_live`,
      label: `${label} live`,
      group: 'provisioning_detail',
      definition: `${label} services whose status reached “live”. Retries of the same service count once.`,
      creditedTo: 'The provisioner assigned when it went live',
      status: 'active',
      match: { eventType: 'service_live', serviceTypes: [type] },
      leaderboard: true,
    },
  ]
}

export const METRICS: readonly MetricDefinition[] = [
  {
    key: 'deals_opened',
    label: 'Deals opened',
    group: 'sales',
    definition:
      'Deal sheets submitted successfully. Counted once per deal at submission; edits and resubmissions never add more.',
    creditedTo: 'The sales agent selected on the deal sheet',
    status: 'active',
    match: { eventType: 'deal_opened' },
    leaderboard: true,
  },
  {
    key: 'deals_closed',
    label: 'Deals closed',
    group: 'sales',
    definition:
      'Closing-agent credit at deal-sheet submission. This does not mean the services are live yet.',
    creditedTo: 'The closing agent selected on the deal sheet',
    status: 'active',
    match: { eventType: 'deal_closed' },
    leaderboard: true,
  },
  {
    key: 'broadband_applied',
    label: 'Broadband applied',
    group: 'provisioning',
    definition:
      'BB and MPF Broadband services whose status first reached “applied”. Retries count once.',
    creditedTo: 'The provisioner assigned when it was applied',
    status: 'active',
    match: { eventType: 'service_applied', serviceTypes: BROADBAND },
    leaderboard: true,
  },
  {
    key: 'broadband_live',
    label: 'Broadband live',
    group: 'provisioning',
    definition: 'BB and MPF Broadband services whose status reached “live”. Retries count once.',
    creditedTo: 'The provisioner assigned when it went live',
    status: 'active',
    match: { eventType: 'service_live', serviceTypes: BROADBAND },
    leaderboard: true,
  },
  {
    key: 'voice_applied',
    label: 'Voice applied',
    group: 'provisioning',
    definition:
      'WHC, MPF Voice and NFON services whose status first reached “applied”. Retries count once.',
    creditedTo: 'The provisioner assigned when it was applied',
    status: 'active',
    match: { eventType: 'service_applied', serviceTypes: VOICE },
    leaderboard: true,
  },
  {
    key: 'voice_live',
    label: 'Voice live',
    group: 'provisioning',
    definition: 'WHC, MPF Voice and NFON services whose status reached “live”. Retries count once.',
    creditedTo: 'The provisioner assigned when it went live',
    status: 'active',
    match: { eventType: 'service_live', serviceTypes: VOICE },
    leaderboard: true,
  },
  {
    key: 'mobile_applied',
    label: 'Mobile applied',
    group: 'provisioning',
    definition: 'Mobile services whose status first reached “applied”.',
    creditedTo: 'The provisioner assigned when it was applied',
    status: 'unavailable',
    statusNote:
      'No CRM workflow creates mobile services yet (the deal sheet never adds one), so there is nothing to count.',
    match: { eventType: 'service_applied', serviceTypes: ['mobile'] },
    leaderboard: false,
  },
  {
    key: 'mobile_live',
    label: 'Mobile live',
    group: 'provisioning',
    definition: 'Mobile services whose status reached “live”.',
    creditedTo: 'The provisioner assigned when it went live',
    status: 'unavailable',
    statusNote:
      'No CRM workflow creates mobile services yet (the deal sheet never adds one), so there is nothing to count.',
    match: { eventType: 'service_live', serviceTypes: ['mobile'] },
    leaderboard: false,
  },
  ...serviceMetrics('bb'),
  ...serviceMetrics('mpf_broadband'),
  ...serviceMetrics('whc'),
  ...serviceMetrics('mpf_voice'),
  ...serviceMetrics('nfon'),
  {
    key: 'routers_dispatched',
    label: 'Routers dispatched',
    group: 'equipment',
    definition:
      'Provisioning records whose “router dispatched” changed to Yes. Counted once per record; editing it again never adds more.',
    creditedTo: 'The router assignee on the provisioning record (proposed)',
    status: 'awaiting_approval',
    statusNote:
      'Dispatches are being recorded against a new “router assignee” field. Waiting for approval of that credit rule before showing counts.',
    match: { eventType: 'router_dispatched' },
    leaderboard: false,
  },
  {
    key: 'welcome_calls_logged',
    label: 'Welcome calls logged',
    group: 'service_desk',
    definition: 'Welcome calls 1–3 with an outcome recorded on a provisioning record.',
    creditedTo: 'Not yet defined — there is no assigned caller',
    status: 'awaiting_approval',
    statusNote:
      'Events are being recorded. Waiting for a definition of a completed call (any outcome, or answered only) and who receives the credit.',
    match: { eventType: 'welcome_call_logged' },
    leaderboard: false,
  },
  {
    key: 'faults_resolved',
    label: 'Faults resolved',
    group: 'service_desk',
    definition: 'Faults whose status changed to Resolved. Reopening reverses the credit.',
    creditedTo: 'Proposed: the fault assignee',
    status: 'awaiting_approval',
    statusNote: AWAITING_CREDIT_RULE,
    match: { eventType: 'fault_resolved' },
    leaderboard: false,
  },
  {
    key: 'complaints_closed',
    label: 'Complaints closed',
    group: 'service_desk',
    definition: 'Complaints whose status changed to Closed. Reopening reverses the credit.',
    creditedTo: 'Proposed: the complaint assignee',
    status: 'awaiting_approval',
    statusNote: AWAITING_CREDIT_RULE,
    match: { eventType: 'complaint_closed' },
    leaderboard: false,
  },
  {
    key: 'debts_closed',
    label: 'Debts closed',
    group: 'collections',
    definition:
      'Debts closed with a final outcome (payment, payment plan, uncollectable, deceased or free bill).',
    creditedTo: 'Proposed: the debt assignee',
    status: 'awaiting_approval',
    statusNote:
      'Events are being recorded with their outcome. Waiting for approval of which outcomes count as a success and who receives the credit.',
    match: { eventType: 'debt_closed' },
    leaderboard: false,
  },
  {
    key: 'transfers_completed',
    label: 'Transfers completed',
    group: 'lines',
    definition: 'Transfers (including standard and historical) whose status changed to Completed.',
    creditedTo: 'Proposed: the transfer assignee',
    status: 'awaiting_approval',
    statusNote:
      'Events are being recorded. Waiting for approval of the credit rule and whether historical transfers count.',
    match: { eventType: 'transfer_completed' },
    leaderboard: false,
  },
  {
    key: 'ceases_completed',
    label: 'Ceases completed',
    group: 'lines',
    definition: 'Ceases (including standard) whose status changed to Completed.',
    creditedTo: 'Proposed: the cease assignee',
    status: 'awaiting_approval',
    statusNote: AWAITING_CREDIT_RULE,
    match: { eventType: 'cease_completed' },
    leaderboard: false,
  },
  {
    key: 'todos_completed',
    label: 'To-dos completed',
    group: 'tasks',
    definition: 'To-dos whose status changed to Completed. Reopening reverses the credit.',
    creditedTo: 'Proposed: the person the to-do is assigned to',
    status: 'awaiting_approval',
    statusNote: AWAITING_CREDIT_RULE,
    match: { eventType: 'todo_completed' },
    leaderboard: false,
  },
]

const BY_KEY = new Map(METRICS.map((m) => [m.key, m]))

export function getMetric(key: string): MetricDefinition | undefined {
  return BY_KEY.get(key)
}

export const ACTIVE_METRICS = METRICS.filter((m) => m.status === 'active')
export const LEADERBOARD_METRICS = METRICS.filter((m) => m.status === 'active' && m.leaderboard)
export const DEFAULT_LEADERBOARD_METRIC = 'deals_opened'

/** A row of summed credit deltas, as returned by the aggregate queries. */
export interface DeltaRow {
  eventType: string
  serviceType: string | null
  total: number
}

export function matches(def: MetricDefinition, row: Pick<DeltaRow, 'eventType' | 'serviceType'>) {
  if (row.eventType !== def.match.eventType) return false
  if (!def.match.serviceTypes) return true
  return (
    row.serviceType !== null &&
    (def.match.serviceTypes as readonly string[]).includes(row.serviceType)
  )
}

/** Net credit for a metric from aggregated rows. */
export function metricValue(def: MetricDefinition, rows: readonly DeltaRow[]): number {
  let total = 0
  for (const row of rows) if (matches(def, row)) total += row.total
  return total
}

/** Human labels for events in the activity feed. */
export function describeEvent(eventType: string, serviceType: string | null): string {
  const service = serviceType
    ? (SERVICE_TYPE_LABELS[serviceType as ServiceType] ?? serviceType)
    : ''
  switch (eventType) {
    case 'deal_opened':
      return 'Deal opened'
    case 'deal_closed':
      return 'Deal closed'
    case 'service_applied':
      return `${service} applied`
    case 'service_live':
      return `${service} went live`
    case 'router_dispatched':
      return 'Router dispatched'
    case 'welcome_call_logged':
      return 'Welcome call logged'
    case 'fault_resolved':
      return 'Fault resolved'
    case 'complaint_closed':
      return 'Complaint closed'
    case 'debt_closed':
      return 'Debt closed'
    case 'transfer_completed':
      return 'Transfer completed'
    case 'cease_completed':
      return 'Cease completed'
    case 'todo_completed':
      return 'To-do completed'
    default:
      return eventType
  }
}

/** Event types whose metrics are visible on the board (drives the activity feed filter). */
export const VISIBLE_EVENT_TYPES: readonly EventType[] = [
  ...new Set(ACTIVE_METRICS.map((m) => m.match.eventType)),
]
