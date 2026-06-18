'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Plus, X } from 'lucide-react'
import { createFault } from './actions'
import { useRouter } from 'next/navigation'
import { FAULT_TYPES } from '@/lib/constants'

export function CreateFaultModal({
  users,
  provisioning,
}: {
  users: { id: string; fullName: string }[]
  provisioning: { id: string; accountNumber: string; name: string }[]
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  const [form, setForm] = useState({
    title: '',
    type: '',
    assignedTo: '',
    provisioningId: '',
  })

  function update(field: string, value: string) {
    setForm((p) => ({ ...p, [field]: value }))
  }

  async function handleSubmit() {
    if (!form.title || !form.type) return
    setSaving(true)
    await createFault({
      title: form.title,
      type: form.type,
      assignedTo: form.assignedTo || null,
      provisioningId: form.provisioningId || null,
    })
    setSaving(false)
    setOpen(false)
    setForm({ title: '', type: '', assignedTo: '', provisioningId: '' })
    router.refresh()
  }

  return (
    <>
      <Button onClick={() => setOpen(true)} className="gap-2">
        <Plus className="size-4" />
        New fault
      </Button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
          <div className="relative bg-background rounded-xl shadow-2xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <h2 className="text-sm font-semibold">New fault</h2>
              <button
                onClick={() => setOpen(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="px-4 py-4 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Title *</label>
                <Input
                  value={form.title}
                  onChange={(e) => update('title', e.target.value)}
                  placeholder="Brief description of the fault"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Type *</label>
                <Select value={form.type} onValueChange={(v) => update('type', v ?? '')}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {FAULT_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t.toUpperCase()}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Assigned to</label>
                <Select
                  value={form.assignedTo}
                  onValueChange={(v) => update('assignedTo', v ?? '')}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select agent" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Unassigned</SelectItem>
                    {users.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.fullName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  Linked provisioning
                </label>
                <Select
                  value={form.provisioningId}
                  onValueChange={(v) => update('provisioningId', v ?? '')}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Search account..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">None</SelectItem>
                    {provisioning.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.accountNumber} — {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="px-4 py-3 border-t flex justify-end gap-2">
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSubmit} disabled={saving || !form.title || !form.type}>
                {saving ? 'Creating...' : 'Create fault'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
