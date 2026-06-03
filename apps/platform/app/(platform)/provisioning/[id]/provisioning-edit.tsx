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
import { Pencil } from 'lucide-react'
import { updateProvisioning } from './actions'
import type { Provisioning } from '@roaring/db'

const statusColours: Record<string, string> = {
  not_started: 'bg-gray-100 text-gray-700 border-gray-200',
  broadband_applied: 'bg-blue-100 text-blue-800 border-blue-200',
  whc_applied: 'bg-purple-100 text-purple-800 border-purple-200',
  broadband_and_whc_applied: 'bg-indigo-100 text-indigo-800 border-indigo-200',
  live: 'bg-green-100 text-green-800 border-green-200',
  failed: 'bg-red-100 text-red-800 border-red-200',
}

const statusLabels: Record<string, string> = {
  not_started: 'Not started',
  broadband_applied: 'BB applied',
  whc_applied: 'WHC applied',
  broadband_and_whc_applied: 'BB & WHC applied',
  live: 'Live',
  failed: 'Failed',
}

const wcColours: Record<string, string> = {
  answered: 'bg-green-100 text-green-800 border-green-200',
  call_back: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  no_answer: 'bg-gray-100 text-gray-700 border-gray-200',
  cancelled: 'bg-red-100 text-red-800 border-red-200',
}

const WC_OUTCOMES = ['call_back', 'answered', 'no_answer', 'cancelled']
const STATUSES = [
  'not_started',
  'broadband_applied',
  'whc_applied',
  'broadband_and_whc_applied',
  'live',
  'failed',
]
const INSTALL_TYPES = ['new_install', 'migration']

function formatDate(date: string | Date | null | undefined): string {
  if (!date) return ''
  const d = new Date(date)
  return d.toISOString().split('T')[0]
}

export function ProvisioningEdit({ prov }: { prov: Provisioning }) {
  const router = useRouter()
  const [isEditing, setIsEditing] = useState(false)
  const [saving, setSaving] = useState(false)

  const [form, setForm] = useState({
    wc1Outcome: prov.wc1Outcome ?? '',
    wc1Comments: prov.wc1Comments ?? '',
    wc2Outcome: prov.wc2Outcome ?? '',
    wc2Comments: prov.wc2Comments ?? '',
    status: prov.status as string,
    installType: prov.installType ?? '',
    bbAppliedFor: prov.bbAppliedFor ?? '',
    bbOrderRef: prov.bbOrderRef ?? '',
    whcReference: prov.whcReference ?? '',
    dateOrdered: formatDate(prov.dateOrdered),
    proposedLiveDate: formatDate(prov.proposedLiveDate),
    orderFaultRef: prov.orderFaultRef ?? '',
    orderComments: prov.orderComments ?? '',
    provisioner: prov.provisioner ?? '',
    lastCheckedAt: formatDate(prov.lastCheckedAt),
    lastCheckedBy: prov.lastCheckedBy ?? '',
    routerDispatched: prov.routerDispatched,
    routerDispatchRef: prov.routerDispatchRef ?? '',
    routerTrackingNumber: prov.routerTrackingNumber ?? '',
  })

  function update(field: string, value: string | boolean) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSave() {
    setSaving(true)
    await updateProvisioning(prov.id, {
      wc1Outcome: form.wc1Outcome || null,
      wc1Comments: form.wc1Comments || null,
      wc2Outcome: form.wc2Outcome || null,
      wc2Comments: form.wc2Comments || null,
      status: form.status ?? 'not_started',
      installType: form.installType || null,
      bbAppliedFor: form.bbAppliedFor || null,
      bbOrderRef: form.bbOrderRef || null,
      whcReference: form.whcReference || null,
      dateOrdered: form.dateOrdered || null,
      proposedLiveDate: form.proposedLiveDate || null,
      orderFaultRef: form.orderFaultRef || null,
      orderComments: form.orderComments || null,
      provisioner: form.provisioner || null,
      lastCheckedAt: form.lastCheckedAt || null,
      lastCheckedBy: form.lastCheckedBy || null,
      routerDispatched: form.routerDispatched,
      routerDispatchRef: form.routerDispatchRef || null,
      routerTrackingNumber: form.routerTrackingNumber || null,
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
      status: prov.status as string,
      installType: prov.installType ?? '',
      bbAppliedFor: prov.bbAppliedFor ?? '',
      bbOrderRef: prov.bbOrderRef ?? '',
      whcReference: prov.whcReference ?? '',
      dateOrdered: formatDate(prov.dateOrdered),
      proposedLiveDate: formatDate(prov.proposedLiveDate),
      orderFaultRef: prov.orderFaultRef ?? '',
      orderComments: prov.orderComments ?? '',
      provisioner: prov.provisioner ?? '',
      lastCheckedAt: formatDate(prov.lastCheckedAt),
      lastCheckedBy: prov.lastCheckedBy ?? '',
      routerDispatched: prov.routerDispatched,
      routerDispatchRef: prov.routerDispatchRef ?? '',
      routerTrackingNumber: prov.routerTrackingNumber ?? '',
    })
    setIsEditing(false)
  }

  return (
    <div className="space-y-6">
      {/* Edit / Save / Cancel buttons */}
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

      {/* Welcome Calls */}
      <Section title="Welcome Calls">
        <Row label="WC1 outcome">
          {isEditing ? (
            <Select value={form.wc1Outcome} onValueChange={(v) => update('wc1Outcome', v)}>
              <SelectTrigger className="h-8 w-48">
                <SelectValue placeholder="Select outcome" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">—</SelectItem>
                {WC_OUTCOMES.map((o) => (
                  <SelectItem key={o} value={o}>
                    {o.replace('_', ' ')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : form.wc1Outcome ? (
            <Badge variant="outline" className={wcColours[form.wc1Outcome]}>
              {form.wc1Outcome.replace('_', ' ')}
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
              placeholder="Add comments..."
            />
          ) : (
            form.wc1Comments || '—'
          )}
        </Row>
        <Row label="WC2 outcome">
          {isEditing ? (
            <Select value={form.wc2Outcome} onValueChange={(v) => update('wc2Outcome', v)}>
              <SelectTrigger className="h-8 w-48">
                <SelectValue placeholder="Select outcome" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">—</SelectItem>
                {WC_OUTCOMES.map((o) => (
                  <SelectItem key={o} value={o}>
                    {o.replace('_', ' ')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : form.wc2Outcome ? (
            <Badge variant="outline" className={wcColours[form.wc2Outcome]}>
              {form.wc2Outcome.replace('_', ' ')}
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
              placeholder="Add comments..."
            />
          ) : (
            form.wc2Comments || '—'
          )}
        </Row>
      </Section>

      {/* Order */}
      <Section title="Order">
        <Row label="Status">
          {isEditing ? (
            <Select value={form.status} onValueChange={(v) => update('status', v)}>
              <SelectTrigger className="h-8 w-56">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {statusLabels[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <Badge variant="outline" className={statusColours[form.status]}>
              {statusLabels[form.status]}
            </Badge>
          )}
        </Row>
        <Row label="Install type">
          {isEditing ? (
            <Select value={form.installType} onValueChange={(v) => update('installType', v)}>
              <SelectTrigger className="h-8 w-48">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">—</SelectItem>
                {INSTALL_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t.replace('_', ' ')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : form.installType ? (
            form.installType.replace('_', ' ')
          ) : (
            '—'
          )}
        </Row>
        <Row label="BB applied for">
          {isEditing ? (
            <Input
              value={form.bbAppliedFor}
              onChange={(e) => update('bbAppliedFor', e.target.value)}
              className="h-8 w-48"
              placeholder="e.g. FTTP"
            />
          ) : (
            form.bbAppliedFor || '—'
          )}
        </Row>
        <Row label="BB order ref">
          {isEditing ? (
            <Input
              value={form.bbOrderRef}
              onChange={(e) => update('bbOrderRef', e.target.value)}
              className="h-8 w-48 font-mono"
              placeholder="e.g. BTWYPT690"
            />
          ) : (
            <span className="font-mono">{form.bbOrderRef || '—'}</span>
          )}
        </Row>
        <Row label="WHC reference">
          {isEditing ? (
            <Input
              value={form.whcReference}
              onChange={(e) => update('whcReference', e.target.value)}
              className="h-8 w-48 font-mono"
              placeholder="e.g. BTWYPT980"
            />
          ) : (
            <span className="font-mono">{form.whcReference || '—'}</span>
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
          ) : form.dateOrdered ? (
            new Date(form.dateOrdered).toLocaleDateString('en-GB')
          ) : (
            '—'
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
          ) : form.proposedLiveDate ? (
            new Date(form.proposedLiveDate).toLocaleDateString('en-GB')
          ) : (
            '—'
          )}
        </Row>
        <Row label="Order fault ref">
          {isEditing ? (
            <Input
              value={form.orderFaultRef}
              onChange={(e) => update('orderFaultRef', e.target.value)}
              className="h-8 w-48 font-mono"
              placeholder="Fault ref"
            />
          ) : (
            <span className="font-mono">{form.orderFaultRef || '—'}</span>
          )}
        </Row>
        <Row label="Order comments">
          {isEditing ? (
            <Textarea
              value={form.orderComments}
              onChange={(e) => update('orderComments', e.target.value)}
              className="min-h-16 text-sm"
              placeholder="Add comments..."
            />
          ) : (
            form.orderComments || '—'
          )}
        </Row>
        <Row label="Provisioner">
          {isEditing ? (
            <Input
              value={form.provisioner}
              onChange={(e) => update('provisioner', e.target.value)}
              className="h-8 w-48"
              placeholder="Name"
            />
          ) : (
            form.provisioner || '—'
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
          ) : form.lastCheckedAt ? (
            new Date(form.lastCheckedAt).toLocaleDateString('en-GB')
          ) : (
            '—'
          )}
        </Row>
        <Row label="Last checked by">
          {isEditing ? (
            <Input
              value={form.lastCheckedBy}
              onChange={(e) => update('lastCheckedBy', e.target.value)}
              className="h-8 w-48"
              placeholder="Name"
            />
          ) : (
            form.lastCheckedBy || '—'
          )}
        </Row>
      </Section>

      {/* Router */}
      <Section title="Router">
        <Row label="Dispatched">
          {isEditing ? (
            <Select
              value={form.routerDispatched ? 'yes' : 'no'}
              onValueChange={(v) => update('routerDispatched', v === 'yes')}
            >
              <SelectTrigger className="h-8 w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="no">No</SelectItem>
                <SelectItem value="yes">Yes</SelectItem>
              </SelectContent>
            </Select>
          ) : form.routerDispatched ? (
            <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200">
              Dispatched
            </Badge>
          ) : (
            'No'
          )}
        </Row>
        <Row label="Dispatch ref">
          {isEditing ? (
            <Input
              value={form.routerDispatchRef}
              onChange={(e) => update('routerDispatchRef', e.target.value)}
              className="h-8 w-48 font-mono"
              placeholder="Dispatch ref"
            />
          ) : (
            <span className="font-mono">{form.routerDispatchRef || '—'}</span>
          )}
        </Row>
        <Row label="Tracking number">
          {isEditing ? (
            <Input
              value={form.routerTrackingNumber}
              onChange={(e) => update('routerTrackingNumber', e.target.value)}
              className="h-8 w-48 font-mono"
              placeholder="Tracking number"
            />
          ) : (
            <span className="font-mono">{form.routerTrackingNumber || '—'}</span>
          )}
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
    <div className="flex px-4 py-3 items-start gap-4">
      <span className="text-muted-foreground w-40 shrink-0 text-sm pt-1">{label}</span>
      <div className="text-sm flex-1">{children}</div>
    </div>
  )
}
