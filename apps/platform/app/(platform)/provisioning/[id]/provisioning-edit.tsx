'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Pencil, Plus, ChevronDown, ChevronUp } from 'lucide-react'
import {
  updateProvisioning,
  updateProvisioningService,
  addProvisioningServiceAttempt,
} from './actions'
import type { Provisioning, ProvisioningService } from '@roaring/db'
import { cn } from '@/lib/utils'
import CopyButton from '@/components/copy-button'
import {
  PROV_STATUS_COLOURS,
  PROV_STATUS_LABELS,
  PROV_STATUSES,
  SERVICE_STATUS_COLOURS,
  SERVICE_STATUSES,
  WC_COLOURS,
  WC_OUTCOMES,
  CANCELLED_BY_OPTIONS,
} from '@/lib/constants'
import { ServiceFormData } from '@/lib/types'

function formatDate(date: string | Date | null | undefined): string {
  if (!date) return ''
  return new Date(date).toISOString().split('T')[0] ?? ''
}

function Row({
  label,
  children,
  copyValue,
}: {
  label: string
  children: React.ReactNode
  copyValue?: string | undefined
}) {
  return (
    <div className="flex px-4 py-3 items-start gap-4">
      <span className="text-muted-foreground w-40 shrink-0 text-sm pt-1">{label}</span>
      <div className="text-sm flex-1 flex items-center gap-1">
        <span className="flex-1">{children}</span>
        {copyValue && (
          <span className="ml-auto shrink-0">
            <CopyButton value={copyValue} />
          </span>
        )}
      </div>
    </div>
  )
}

// ── Service Panel ─────────────────────────────────────────────────────────────
function ServicePanel({
  service,
  label,
  onSave,
  onAddAttempt,
  isLatest,
  collapsed,
  onToggleCollapse,
}: {
  service: ProvisioningService
  label: string
  onSave: (id: string, data: ServiceFormData) => Promise<void>
  onAddAttempt: () => Promise<void>
  isLatest: boolean
  collapsed: boolean
  onToggleCollapse: () => void
}) {
  const [isEditing, setIsEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [addingAttempt, setAddingAttempt] = useState(false)

  const [form, setForm] = useState({
    status: (service.status as string) ?? 'not_applied',
    reference: service.reference ?? '',
    dateOrdered: formatDate(service.dateOrdered),
    liveDate: formatDate(service.liveDate),
    lastCheckedAt: formatDate(service.lastCheckedAt),
    cancelledDate: formatDate(service.cancelledDate),
    cancelledBy: service.cancelledBy ?? '',
    cancellationReason: service.cancellationReason ?? '',
    delayedDate: formatDate(service.delayedDate),
    presumedSolveDate: formatDate(service.presumedSolveDate),
    delayReason: service.delayReason ?? '',
    notes: service.notes ?? '',
  })

  function update(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSave() {
    setSaving(true)
    await onSave(service.id, {
      status: form.status,
      reference: form.reference || null,
      dateOrdered: form.dateOrdered || null,
      liveDate: form.liveDate || null,
      lastCheckedAt: form.lastCheckedAt || null,
      cancelledDate: form.cancelledDate || null,
      cancelledBy: form.cancelledBy || null,
      cancellationReason: form.cancellationReason || null,
      delayedDate: form.delayedDate || null,
      presumedSolveDate: form.presumedSolveDate || null,
      delayReason: form.delayReason || null,
      notes: form.notes || null,
    })
    setSaving(false)
    setIsEditing(false)
  }

  function handleCancel() {
    setForm({
      status: (service.status as string) ?? 'not_applied',
      reference: service.reference ?? '',
      dateOrdered: formatDate(service.dateOrdered),
      liveDate: formatDate(service.liveDate),
      lastCheckedAt: formatDate(service.lastCheckedAt),
      cancelledDate: formatDate(service.cancelledDate),
      cancelledBy: service.cancelledBy ?? '',
      cancellationReason: service.cancellationReason ?? '',
      delayedDate: formatDate(service.delayedDate),
      presumedSolveDate: formatDate(service.presumedSolveDate),
      delayReason: service.delayReason ?? '',
      notes: service.notes ?? '',
    })
    setIsEditing(false)
  }

  const showCancelled = form.status === 'cancelled' || service.status === 'cancelled'
  const showDelayed = form.status === 'delayed' || service.status === 'delayed'

  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="px-4 py-3 border-b bg-muted/30 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-sm font-medium">{label}</h2>
          {service.attempt > 1 && (
            <span className="text-xs text-muted-foreground">Attempt {service.attempt}</span>
          )}
          <Badge variant="outline" className={SERVICE_STATUS_COLOURS[service.status]}>
            {service.status.replace(/_/g, ' ')}
          </Badge>
          {service.status === 'cancelled' && (
            <Badge variant="outline" className="bg-red-100 text-red-800 border-red-200 text-xs">
              {service.cancelledBy?.replace(/_/g, ' ') ?? 'unknown'}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          {isLatest && service.status === 'cancelled' && !isEditing && (
            <Button
              variant="outline"
              size="sm"
              disabled={addingAttempt}
              onClick={async () => {
                setAddingAttempt(true)
                await onAddAttempt()
                setAddingAttempt(false)
              }}
            >
              <Plus className="size-3 mr-1" />
              Re-apply
            </Button>
          )}
          {isEditing ? (
            <>
              <Button variant="outline" size="sm" onClick={handleCancel} disabled={saving}>
                Cancel
              </Button>
              <Button size="sm" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving...' : 'Save'}
              </Button>
            </>
          ) : (
            <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
              <Pencil className="size-3 mr-1" />
              Edit
            </Button>
          )}
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={onToggleCollapse}>
            {collapsed ? <ChevronDown className="size-4" /> : <ChevronUp className="size-4" />}
          </Button>
        </div>
      </div>

      {!collapsed && (
        <div className="divide-y">
          <Row label="Status">
            {isEditing ? (
              <Select value={form.status} onValueChange={(v) => update('status', v ?? '')}>
                <SelectTrigger className="h-8 w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SERVICE_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s.replace(/_/g, ' ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Badge variant="outline" className={SERVICE_STATUS_COLOURS[form.status]}>
                {form.status.replace(/_/g, ' ')}
              </Badge>
            )}
          </Row>

          <Row
            label="Reference"
            copyValue={!isEditing && form.reference ? form.reference : undefined}
          >
            {isEditing ? (
              <Input
                value={form.reference}
                onChange={(e) => update('reference', e.target.value)}
                className="h-8 w-48 font-mono"
                placeholder="e.g. BTWYPT690"
              />
            ) : (
              <span className="font-mono text-sm">{form.reference || '—'}</span>
            )}
          </Row>

          <Row label="Date ordered">
            {isEditing ? (
              <Input
                type="date"
                value={form.dateOrdered}
                onChange={(e) => update('dateOrdered', e.target.value)}
                className="h-8 w-48"
              />
            ) : (
              <span className="text-sm">
                {form.dateOrdered ? new Date(form.dateOrdered).toLocaleDateString('en-GB') : '—'}
              </span>
            )}
          </Row>

          <Row label="Live date">
            {isEditing ? (
              <Input
                type="date"
                value={form.liveDate}
                onChange={(e) => update('liveDate', e.target.value)}
                className="h-8 w-48"
              />
            ) : (
              <span className="text-sm">
                {form.liveDate ? new Date(form.liveDate).toLocaleDateString('en-GB') : '—'}
              </span>
            )}
          </Row>

          <Row label="Last checked">
            {isEditing ? (
              <Input
                type="date"
                value={form.lastCheckedAt}
                onChange={(e) => update('lastCheckedAt', e.target.value)}
                className="h-8 w-48"
              />
            ) : (
              <span className="text-sm">
                {form.lastCheckedAt
                  ? new Date(form.lastCheckedAt).toLocaleDateString('en-GB')
                  : '—'}
              </span>
            )}
          </Row>

          {(showCancelled || isEditing) && (
            <>
              <Row label="Cancelled date">
                {isEditing ? (
                  <Input
                    type="date"
                    value={form.cancelledDate}
                    onChange={(e) => update('cancelledDate', e.target.value)}
                    className="h-8 w-48"
                  />
                ) : (
                  <span className="text-sm">
                    {form.cancelledDate
                      ? new Date(form.cancelledDate).toLocaleDateString('en-GB')
                      : '—'}
                  </span>
                )}
              </Row>
              <Row label="Cancelled by">
                {isEditing ? (
                  <Select
                    value={form.cancelledBy}
                    onValueChange={(v) => update('cancelledBy', v ?? '')}
                  >
                    <SelectTrigger className="h-8 w-48">
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">—</SelectItem>
                      {CANCELLED_BY_OPTIONS.map((o) => (
                        <SelectItem key={o} value={o}>
                          {o.replace(/_/g, ' ')}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <span className="text-sm capitalize">
                    {form.cancelledBy?.replace(/_/g, ' ') || '—'}
                  </span>
                )}
              </Row>
              <Row label="Cancellation reason">
                {isEditing ? (
                  <Textarea
                    value={form.cancellationReason}
                    onChange={(e) => update('cancellationReason', e.target.value)}
                    className="min-h-16 text-sm"
                    placeholder="Reason..."
                  />
                ) : (
                  <span className="text-sm">{form.cancellationReason || '—'}</span>
                )}
              </Row>
            </>
          )}

          {(showDelayed || isEditing) && (
            <>
              <Row label="Delayed date">
                {isEditing ? (
                  <Input
                    type="date"
                    value={form.delayedDate}
                    onChange={(e) => update('delayedDate', e.target.value)}
                    className="h-8 w-48"
                  />
                ) : (
                  <span className="text-sm">
                    {form.delayedDate
                      ? new Date(form.delayedDate).toLocaleDateString('en-GB')
                      : '—'}
                  </span>
                )}
              </Row>
              <Row label="Presumed solve">
                {isEditing ? (
                  <Input
                    type="date"
                    value={form.presumedSolveDate}
                    onChange={(e) => update('presumedSolveDate', e.target.value)}
                    className="h-8 w-48"
                  />
                ) : (
                  <span className="text-sm">
                    {form.presumedSolveDate
                      ? new Date(form.presumedSolveDate).toLocaleDateString('en-GB')
                      : '—'}
                  </span>
                )}
              </Row>
              <Row label="Delay reason">
                {isEditing ? (
                  <Textarea
                    value={form.delayReason}
                    onChange={(e) => update('delayReason', e.target.value)}
                    className="min-h-16 text-sm"
                    placeholder="Reason..."
                  />
                ) : (
                  <span className="text-sm">{form.delayReason || '—'}</span>
                )}
              </Row>
            </>
          )}

          <Row label="Notes">
            {isEditing ? (
              <Textarea
                value={form.notes}
                onChange={(e) => update('notes', e.target.value)}
                className="min-h-16 text-sm"
                placeholder="Any notes..."
              />
            ) : (
              <span className="text-sm">{form.notes || '—'}</span>
            )}
          </Row>
        </div>
      )}
    </div>
  )
}

// ── Service History ───────────────────────────────────────────────────────────
function ServiceHistory({ services, label }: { services: ProvisioningService[]; label: string }) {
  const [open, setOpen] = useState(false)
  const history = services.slice(0, -1)
  if (history.length === 0) return null
  return (
    <div className="border rounded-lg overflow-hidden">
      <button
        className="w-full px-4 py-3 flex items-center justify-between bg-muted/20 hover:bg-muted/40 transition-colors"
        onClick={() => setOpen(!open)}
      >
        <span className="text-sm font-medium text-muted-foreground">
          {label} history ({history.length} previous attempt{history.length !== 1 ? 's' : ''})
        </span>
        {open ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
      </button>
      {open && (
        <div className="divide-y">
          {history.map((s) => (
            <div key={s.id} className="px-4 py-3 space-y-1 bg-muted/10">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium">Attempt {s.attempt}</span>
                <Badge
                  variant="outline"
                  className={cn(SERVICE_STATUS_COLOURS[s.status], 'text-xs')}
                >
                  {s.status.replace(/_/g, ' ')}
                </Badge>
                {s.cancelledBy && (
                  <span className="text-xs text-muted-foreground">
                    by {s.cancelledBy.replace(/_/g, ' ')}
                  </span>
                )}
              </div>
              {s.reference && (
                <p className="text-xs font-mono text-muted-foreground">Ref: {s.reference}</p>
              )}
              {s.dateOrdered && (
                <p className="text-xs text-muted-foreground">
                  Ordered: {new Date(s.dateOrdered).toLocaleDateString('en-GB')}
                </p>
              )}
              {s.cancelledDate && (
                <p className="text-xs text-muted-foreground">
                  Cancelled: {new Date(s.cancelledDate).toLocaleDateString('en-GB')}
                </p>
              )}
              {s.cancellationReason && (
                <p className="text-xs text-muted-foreground">Reason: {s.cancellationReason}</p>
              )}
              {s.delayReason && (
                <p className="text-xs text-muted-foreground">Delay: {s.delayReason}</p>
              )}
              {s.notes && <p className="text-xs text-muted-foreground">Notes: {s.notes}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────
export function ProvisioningEdit({
  prov,
  bbServices,
  whcServices,
  nfonServices,
  mpfBbServices,
  mpfVoiceServices,
  mobileServices,
}: {
  prov: Provisioning
  bbServices: ProvisioningService[]
  whcServices: ProvisioningService[]
  nfonServices: ProvisioningService[]
  mpfBbServices: ProvisioningService[]
  mpfVoiceServices: ProvisioningService[]
  mobileServices: ProvisioningService[]
}) {
  const router = useRouter()
  const [isEditing, setIsEditing] = useState(false)
  const [saving, setSaving] = useState(false)

  // Collapse state for each panel
  const [collapsed, setCollapsed] = useState({
    bb: false,
    whc: false,
    nfon: false,
    mpfBb: false,
    mpfVoice: false,
    mobile: false,
    order: false,
    welcomeCalls: false,
    router: false,
  })

  const allCollapsed = Object.values(collapsed).every(Boolean)

  function toggleAll() {
    const next = !allCollapsed
    setCollapsed({
      bb: next,
      whc: next,
      nfon: next,
      mpfBb: next,
      mpfVoice: next,
      mobile: next,
      order: next,
      welcomeCalls: next,
      router: next,
    })
  }

  function toggle(key: keyof typeof collapsed) {
    setCollapsed((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  const latestBb = bbServices[bbServices?.length - 1]
  const latestWhc = whcServices[whcServices?.length - 1]
  const latestNfon = nfonServices[nfonServices?.length - 1]
  const latestMpfBb = mpfBbServices[mpfBbServices?.length - 1]
  const latestMpfVoice = mpfVoiceServices[mpfVoiceServices?.length - 1]
  const latestMobile = mobileServices[mobileServices?.length - 1]

  const [form, setForm] = useState({
    wc1Outcome: prov.wc1Outcome ?? '',
    wc1Comments: prov.wc1Comments ?? '',
    wc2Outcome: prov.wc2Outcome ?? '',
    wc2Comments: prov.wc2Comments ?? '',
    wc3Outcome: prov.wc3Outcome ?? '',
    wc3Comments: prov.wc3Comments ?? '',
    status: prov.status as string,
    proposedLiveDate: formatDate(prov.proposedLiveDate),
    dateOrdered: formatDate(prov.dateOrdered),
    orderFaultRef: prov.orderFaultRef ?? '',
    orderComments: prov.orderComments ?? '',
    provisioner: prov.provisioner ?? '',
    lastCheckedAt: formatDate(prov.lastCheckedAt),
    lastCheckedBy: prov.lastCheckedBy ?? '',
    routerDispatched: (prov.routerDispatched as string) ?? 'no',
    routerDispatchRef: prov.routerDispatchRef ?? '',
    routerTrackingNumber: prov.routerTrackingNumber ?? '',
    routerOrderedDate: prov.routerOrderedDate ?? '',
  })

  function update(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSave() {
    setSaving(true)
    await updateProvisioning(prov.id, {
      wc1Outcome: form.wc1Outcome || null,
      wc1Comments: form.wc1Comments || null,
      wc2Outcome: form.wc2Outcome || null,
      wc2Comments: form.wc2Comments || null,
      wc3Outcome: form.wc3Outcome || null,
      wc3Comments: form.wc3Comments || null,
      status: form.status,
      proposedLiveDate: form.proposedLiveDate || null,
      dateOrdered: form.dateOrdered || null,
      orderFaultRef: form.orderFaultRef || null,
      orderComments: form.orderComments || null,
      provisioner: form.provisioner || null,
      lastCheckedAt: form.lastCheckedAt || null,
      lastCheckedBy: form.lastCheckedBy || null,
      routerDispatched: form.routerDispatched,
      routerDispatchRef: form.routerDispatchRef || null,
      routerTrackingNumber: form.routerTrackingNumber || null,
      routerOrderedDate: form.routerOrderedDate || null,
    })
    setSaving(false)
    setIsEditing(false)
    router.refresh()
  }

  function handleCancel() {
    setForm({
      wc1Outcome: prov.wc1Outcome ?? '',
      wc1Comments: prov.wc1Comments ?? '',
      wc2Outcome: prov.wc2Outcome ?? '',
      wc2Comments: prov.wc2Comments ?? '',
      wc3Outcome: prov.wc3Outcome ?? '',
      wc3Comments: prov.wc3Comments ?? '',
      status: prov.status as string,
      proposedLiveDate: formatDate(prov.proposedLiveDate),
      dateOrdered: formatDate(prov.dateOrdered),
      orderFaultRef: prov.orderFaultRef ?? '',
      orderComments: prov.orderComments ?? '',
      provisioner: prov.provisioner ?? '',
      lastCheckedAt: formatDate(prov.lastCheckedAt),
      lastCheckedBy: prov.lastCheckedBy ?? '',
      routerDispatched: (prov.routerDispatched as string) ?? 'no',
      routerDispatchRef: prov.routerDispatchRef ?? '',
      routerTrackingNumber: prov.routerTrackingNumber ?? '',
      routerOrderedDate: prov.routerOrderedDate ?? '',
    })
    setIsEditing(false)
  }

  return (
    <div className="space-y-6 pb-6">
      {/* Global toggle */}
      <div className="flex justify-end">
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleAll}
          className="text-xs text-muted-foreground"
        >
          {allCollapsed ? (
            <>
              <ChevronDown className="size-3 mr-1" />
              Expand all
            </>
          ) : (
            <>
              <ChevronUp className="size-3 mr-1" />
              Collapse all
            </>
          )}
        </Button>
      </div>

      {/* BB Service */}
      {latestBb && (
        <>
          <ServicePanel
            service={latestBb}
            label="Broadband"
            isLatest
            collapsed={collapsed.bb}
            onToggleCollapse={() => toggle('bb')}
            onSave={async (id, data) => {
              await updateProvisioningService(id, data)
              router.refresh()
            }}
            onAddAttempt={async () => {
              await addProvisioningServiceAttempt(prov.id, 'bb', latestBb.attempt)
              router.refresh()
            }}
          />
          <ServiceHistory services={bbServices} label="Broadband" />
        </>
      )}

      {/* WHC Service */}
      {latestWhc && (
        <>
          <ServicePanel
            service={latestWhc}
            label="WHC"
            isLatest
            collapsed={collapsed.whc}
            onToggleCollapse={() => toggle('whc')}
            onSave={async (id, data) => {
              await updateProvisioningService(id, data)
              router.refresh()
            }}
            onAddAttempt={async () => {
              await addProvisioningServiceAttempt(prov.id, 'whc', latestWhc.attempt)
              router.refresh()
            }}
          />
          <ServiceHistory services={whcServices} label="WHC" />
        </>
      )}

      {/* NFON Service */}
      {latestNfon && (
        <>
          <ServicePanel
            service={latestNfon}
            label="NFON"
            isLatest
            collapsed={collapsed.nfon}
            onToggleCollapse={() => toggle('nfon')}
            onSave={async (id, data) => {
              await updateProvisioningService(id, data)
              router.refresh()
            }}
            onAddAttempt={async () => {
              await addProvisioningServiceAttempt(prov.id, 'nfon', latestNfon.attempt)
              router.refresh()
            }}
          />
          <ServiceHistory services={nfonServices} label="NFON" />
        </>
      )}

      {/* MPF Broadband */}
      {latestMpfBb && (
        <>
          <ServicePanel
            service={latestMpfBb}
            label="MPF Broadband"
            isLatest
            collapsed={collapsed.mpfBb}
            onToggleCollapse={() => toggle('mpfBb')}
            onSave={async (id, data) => {
              await updateProvisioningService(id, data)
              router.refresh()
            }}
            onAddAttempt={async () => {
              await addProvisioningServiceAttempt(prov.id, 'mpf_broadband', latestMpfBb.attempt)
              router.refresh()
            }}
          />
          <ServiceHistory services={mpfBbServices} label="MPF Broadband" />
        </>
      )}

      {/* MPF Voice */}
      {latestMpfVoice && (
        <>
          <ServicePanel
            service={latestMpfVoice}
            label="MPF Voice"
            isLatest
            collapsed={collapsed.mpfVoice}
            onToggleCollapse={() => toggle('mpfVoice')}
            onSave={async (id, data) => {
              await updateProvisioningService(id, data)
              router.refresh()
            }}
            onAddAttempt={async () => {
              await addProvisioningServiceAttempt(prov.id, 'mpf_voice', latestMpfVoice.attempt)
              router.refresh()
            }}
          />
          <ServiceHistory services={mpfVoiceServices} label="MPF Voice" />
        </>
      )}

      {/* Mobile */}
      {latestMobile && (
        <>
          <ServicePanel
            service={latestMobile}
            label="Mobile"
            isLatest
            collapsed={collapsed.mobile}
            onToggleCollapse={() => toggle('mobile')}
            onSave={async (id, data) => {
              await updateProvisioningService(id, data)
              router.refresh()
            }}
            onAddAttempt={async () => {
              await addProvisioningServiceAttempt(prov.id, 'mobile', latestMobile.attempt)
              router.refresh()
            }}
          />
          <ServiceHistory services={mobileServices} label="Mobile" />
        </>
      )}

      {/* Overall provisioning */}
      <div className="border rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b bg-muted/30 flex items-center justify-between">
          <h2 className="text-sm font-medium">Order</h2>
          <div className="flex items-center gap-2">
            {isEditing ? (
              <>
                <Button variant="outline" size="sm" onClick={handleCancel} disabled={saving}>
                  Cancel
                </Button>
                <Button size="sm" onClick={handleSave} disabled={saving}>
                  {saving ? 'Saving...' : 'Save'}
                </Button>
              </>
            ) : (
              <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                <Pencil className="size-3 mr-1" />
                Edit
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => toggle('order')}
            >
              {collapsed.order ? (
                <ChevronDown className="size-4" />
              ) : (
                <ChevronUp className="size-4" />
              )}
            </Button>
          </div>
        </div>
        {!collapsed.order && (
          <div className="divide-y">
            <Row label="Overall status">
              {isEditing ? (
                <Select value={form.status} onValueChange={(v) => update('status', v ?? '')}>
                  <SelectTrigger className="h-8 w-56">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PROV_STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {PROV_STATUS_LABELS[s]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Badge variant="outline" className={PROV_STATUS_COLOURS[form.status]}>
                  {PROV_STATUS_LABELS[form.status]}
                </Badge>
              )}
            </Row>
            <Row label="Proposed live date">
              {isEditing ? (
                <Input
                  type="date"
                  value={form.proposedLiveDate}
                  onChange={(e) => update('proposedLiveDate', e.target.value)}
                  className="h-8 w-48"
                />
              ) : (
                <span className="text-sm">
                  {form.proposedLiveDate
                    ? new Date(form.proposedLiveDate).toLocaleDateString('en-GB')
                    : '—'}
                </span>
              )}
            </Row>
            <Row
              label="Order fault ref"
              copyValue={!isEditing && form.orderFaultRef ? form.orderFaultRef : undefined}
            >
              {isEditing ? (
                <Input
                  value={form.orderFaultRef}
                  onChange={(e) => update('orderFaultRef', e.target.value)}
                  className="h-8 w-48 font-mono"
                  placeholder="Fault ref"
                />
              ) : (
                <span className="text-sm font-mono">{form.orderFaultRef || '—'}</span>
              )}
            </Row>
            <Row label="Order comments">
              {isEditing ? (
                <Textarea
                  value={form.orderComments}
                  onChange={(e) => update('orderComments', e.target.value)}
                  className="min-h-16 text-sm"
                />
              ) : (
                <span className="text-sm">{form.orderComments || '—'}</span>
              )}
            </Row>
            <Row label="Provisioner">
              {isEditing ? (
                <Input
                  value={form.provisioner}
                  onChange={(e) => update('provisioner', e.target.value)}
                  className="h-8 w-48"
                />
              ) : (
                <span className="text-sm">{form.provisioner || '—'}</span>
              )}
            </Row>
            <Row label="Last checked at">
              {isEditing ? (
                <Input
                  type="date"
                  value={form.lastCheckedAt}
                  onChange={(e) => update('lastCheckedAt', e.target.value)}
                  className="h-8 w-48"
                />
              ) : (
                <span className="text-sm">
                  {form.lastCheckedAt
                    ? new Date(form.lastCheckedAt).toLocaleDateString('en-GB')
                    : '—'}
                </span>
              )}
            </Row>
            <Row label="Last checked by">
              {isEditing ? (
                <Input
                  value={form.lastCheckedBy}
                  onChange={(e) => update('lastCheckedBy', e.target.value)}
                  className="h-8 w-48"
                />
              ) : (
                <span className="text-sm">{form.lastCheckedBy || '—'}</span>
              )}
            </Row>
          </div>
        )}
      </div>

      {/* Welcome Calls */}
      <div className="border rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b bg-muted/30 flex items-center justify-between">
          <h2 className="text-sm font-medium">Welcome Calls</h2>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => toggle('welcomeCalls')}
          >
            {collapsed.welcomeCalls ? (
              <ChevronDown className="size-4" />
            ) : (
              <ChevronUp className="size-4" />
            )}
          </Button>
        </div>
        {!collapsed.welcomeCalls && (
          <div className="divide-y">
            <Row label="WC1 outcome">
              {isEditing ? (
                <Select
                  value={form.wc1Outcome}
                  onValueChange={(v) => update('wc1Outcome', v ?? '')}
                >
                  <SelectTrigger className="h-8 w-48">
                    <SelectValue placeholder="Select outcome" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">—</SelectItem>
                    {WC_OUTCOMES.map((o) => (
                      <SelectItem key={o} value={o}>
                        {o.replace(/_/g, ' ')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : form.wc1Outcome ? (
                <Badge variant="outline" className={WC_COLOURS[form.wc1Outcome]}>
                  {form.wc1Outcome.replace(/_/g, ' ')}
                </Badge>
              ) : (
                '—'
              )}
            </Row>
            <Row label="WC1 comments">
              {isEditing ? (
                <Textarea
                  value={form.wc1Comments}
                  onChange={(e) => update('wc1Comments', e.target.value)}
                  className="min-h-16 text-sm"
                />
              ) : (
                <span className="text-sm">{form.wc1Comments || '—'}</span>
              )}
            </Row>
            <Row label="WC2 outcome">
              {isEditing ? (
                <Select
                  value={form.wc2Outcome}
                  onValueChange={(v) => update('wc2Outcome', v ?? '')}
                >
                  <SelectTrigger className="h-8 w-48">
                    <SelectValue placeholder="Select outcome" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">—</SelectItem>
                    {WC_OUTCOMES.map((o) => (
                      <SelectItem key={o} value={o}>
                        {o.replace(/_/g, ' ')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : form.wc2Outcome ? (
                <Badge variant="outline" className={WC_COLOURS[form.wc2Outcome]}>
                  {form.wc2Outcome.replace(/_/g, ' ')}
                </Badge>
              ) : (
                '—'
              )}
            </Row>
            <Row label="WC2 comments">
              {isEditing ? (
                <Textarea
                  value={form.wc2Comments}
                  onChange={(e) => update('wc2Comments', e.target.value)}
                  className="min-h-16 text-sm"
                />
              ) : (
                <span className="text-sm">{form.wc2Comments || '—'}</span>
              )}
            </Row>
            <Row label="WC3 outcome">
              {isEditing ? (
                <Select
                  value={form.wc3Outcome}
                  onValueChange={(v) => update('wc3Outcome', v ?? '')}
                >
                  <SelectTrigger className="h-8 w-48">
                    <SelectValue placeholder="Select outcome" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">—</SelectItem>
                    {WC_OUTCOMES.map((o) => (
                      <SelectItem key={o} value={o}>
                        {o.replace(/_/g, ' ')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : form.wc3Outcome ? (
                <Badge variant="outline" className={WC_COLOURS[form.wc3Outcome]}>
                  {form.wc3Outcome.replace(/_/g, ' ')}
                </Badge>
              ) : (
                '—'
              )}
            </Row>
            <Row label="WC3 comments">
              {isEditing ? (
                <Textarea
                  value={form.wc3Comments}
                  onChange={(e) => update('wc3Comments', e.target.value)}
                  className="min-h-16 text-sm"
                />
              ) : (
                <span className="text-sm">{form.wc3Comments || '—'}</span>
              )}
            </Row>
          </div>
        )}
      </div>

      {/* Router */}
      <div className="border rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b bg-muted/30 flex items-center justify-between">
          <h2 className="text-sm font-medium">Router</h2>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => toggle('router')}
          >
            {collapsed.router ? (
              <ChevronDown className="size-4" />
            ) : (
              <ChevronUp className="size-4" />
            )}
          </Button>
        </div>
        {!collapsed.router && (
          <div className="divide-y">
            <Row label="Dispatched">
              {isEditing ? (
                <Select
                  value={form.routerDispatched ?? 'no'}
                  onValueChange={(v) => update('routerDispatched', v ?? 'no')}
                >
                  <SelectTrigger className="h-8 w-36">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="no">No</SelectItem>
                    <SelectItem value="yes">Yes</SelectItem>
                    <SelectItem value="not_needed">Not needed</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <Badge
                  variant="outline"
                  className={
                    form.routerDispatched === 'yes'
                      ? 'bg-green-100 text-green-800 border-green-200'
                      : form.routerDispatched === 'not_needed'
                        ? 'bg-gray-100 text-gray-700 border-gray-200'
                        : 'bg-red-100 text-red-800 border-red-200'
                  }
                >
                  {form.routerDispatched === 'yes'
                    ? 'Yes'
                    : form.routerDispatched === 'not_needed'
                      ? 'Not needed'
                      : 'No'}
                </Badge>
              )}
            </Row>
            <Row
              label="Dispatch ref"
              copyValue={!isEditing && form.routerDispatchRef ? form.routerDispatchRef : undefined}
            >
              {isEditing ? (
                <Input
                  value={form.routerDispatchRef}
                  onChange={(e) => update('routerDispatchRef', e.target.value)}
                  className="h-8 w-48 font-mono"
                />
              ) : (
                <span className="text-sm font-mono">{form.routerDispatchRef || '—'}</span>
              )}
            </Row>
            <Row label="Router ordered date">
              {isEditing ? (
                <Input
                  type="date"
                  value={form.routerOrderedDate ?? ''}
                  onChange={(e) => setForm((p) => ({ ...p, routerOrderedDate: e.target.value }))}
                  className="h-8 w-40"
                />
              ) : (
                <span className="text-sm">
                  {form.routerOrderedDate
                    ? new Date(form.routerOrderedDate).toLocaleDateString('en-GB')
                    : '—'}
                </span>
              )}
            </Row>
            <Row
              label="Tracking number"
              copyValue={
                !isEditing && form.routerTrackingNumber ? form.routerTrackingNumber : undefined
              }
            >
              {isEditing ? (
                <Input
                  value={form.routerTrackingNumber}
                  onChange={(e) => update('routerTrackingNumber', e.target.value)}
                  className="h-8 w-48 font-mono"
                />
              ) : (
                <span className="text-sm font-mono">{form.routerTrackingNumber || '—'}</span>
              )}
            </Row>
          </div>
        )}
      </div>
    </div>
  )
}
