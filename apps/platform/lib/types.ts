// Shared types used across multiple components in the platform app

export type AuditLog = {
  id: string
  tableName: string
  recordId: string
  action: string
  changedBy: string | null
  changedAt: Date | string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  oldData: any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  newData: any
}

export type IssueRow = {
  id: string
  title: string
  type: string
  status: string
  ticketRef: string | null
  openedAt: Date | string
  assignedTo: string | null
  provisioningId: string | null
  createdAt: Date | string
}

export type FaultRow = IssueRow & {
  resolvedAt: Date | string | null
}

export type ComplaintRow = IssueRow & {
  closedAt: Date | string | null
}

export type DebtRow = {
  id: string
  title: string
  outcome: string | null
  totalOwed: string
  paymentTried: boolean
  paymentType: string | null
  dateOfPayment: string | null
  openedAt: Date | string
  closedAt: Date | string | null
  assignedTo: string | null
  provisioningId: string | null
  createdAt: Date | string
}

export type DealRow = {
  id: string
  dealDate: string
  status: string
  dealType: string
  salesAgent: string
  closingAgent: string
  accountNumber: string | null
  companyName: string | null
  firstName: string | null
  lastName: string | null
  mobile: string | null
  landline: string | null
  bundlePrice: string | null
  wholesaleCost: string | null
  monthlyGp: string | null
  contractLength: string | null
}

export type ProvisioningRow = {
  id: string
  status: string
  dealId: string | null
  provisioner: string | null
  proposedLiveDate: string | null
  dateOrdered: string | null
  lastCheckedAt: Date | null
  lastCheckedBy: string | null
  wc1Outcome: string | null
  wc2Outcome: string | null
  routerDispatched: string | null
  accountNumber: string | null
  companyName: string | null
  firstName: string | null
  lastName: string | null
  mobile: string | null
  landline: string | null
  salesAgent: string | null
  dealDate: string | null
  bbStatus: string | null
  whcStatus: string | null
  nfonStatus: string | null
  mpfBbStatus: string | null
  mpfVoiceStatus: string | null
  mobileStatus: string | null
  customerType: string | null
}

export type ServiceFormData = {
  status: string
  reference: string | null
  dateOrdered: string | null
  liveDate: string | null
  lastCheckedAt: string | null
  cancelledDate: string | null
  cancelledBy: string | null
  cancellationReason: string | null
  delayedDate: string | null
  presumedSolveDate: string | null
  delayReason: string | null
  notes: string | null
}

export type SearchResult = {
  type: 'customer' | 'deal' | 'provisioning'
  id: string
  accountNumber: string
  title: string
  subtitle: string
  status: string | null
  href: string
}

export type User = {
  id: string
  fullName: string
  email: string
  role: string
  isActive: boolean
  approvalStatus: string
  createdAt: Date | string
}

export type ViewMode = 'team' | 'individual'
export type SortOption = 'newest' | 'oldest'
