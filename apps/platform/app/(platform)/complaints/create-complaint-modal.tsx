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
import { Textarea } from '@/components/ui/textarea'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Plus, X, ChevronsUpDown, Check } from 'lucide-react'
import { createComplaint } from './actions'
import { useRouter } from 'next/navigation'
import { COMPLAINT_TYPES, COMPLAINT_TYPE_LABELS } from '@/lib/constants'
import { cn } from '@/lib/utils'

export function CreateComplaintModal({
  users,
  provisioning,
}: {
  users: { id: string; fullName: string }[]
  provisioning: { id: string; accountNumber: string }[]
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [provOpen, setProvOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  const [form, setForm] = useState({
    title: '',
    type: '',
    assignedTo: '',
    provisioningId: '',
    description: '',
  })

  function update(field: string, value: string) {
    setForm((p) => ({ ...p, [field]: value }))
  }

  async function handleSubmit() {
    if (!form.title || !form.type) return
    setSaving(true)
    await createComplaint({
      title: form.title,
      type: form.type,
      assignedTo: form.assignedTo || null,
      provisioningId: form.provisioningId || null,
      description: form.description || null,
    })
    setSaving(false)
    setOpen(false)
    setForm({ title: '', type: '', assignedTo: '', provisioningId: '', description: '' })
    router.refresh()
  }

  const selectedProv = provisioning.find((p) => p.id === form.provisioningId)

  return (
    <>
      <Button onClick={() => setOpen(true)} className="gap-2">
        <Plus className="size-4" />
        New complaint
      </Button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
          <div className="relative bg-background rounded-xl shadow-2xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <h2 className="text-sm font-semibold">New complaint</h2>
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
                  placeholder="Title of complaint"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Description</label>
                <Textarea
                  value={form.description}
                  onChange={(e) => update('description', e.target.value)}
                  placeholder="Describe the complaint in detail..."
                  className="min-h-20 text-sm resize-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Type *</label>
                <Select value={form.type} onValueChange={(v) => update('type', v ?? '')}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {COMPLAINT_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {COMPLAINT_TYPE_LABELS[t] ?? t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5 w-full">
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

              <div className="space-y-1.5 flex flex-col">
                <label className="text-xs font-medium text-muted-foreground">
                  Linked provisioning
                </label>
                <Popover open={provOpen} onOpenChange={setProvOpen}>
                  <PopoverTrigger>
                    <button className="w-full flex items-center justify-between h-9 px-3 rounded-md border bg-background text-sm hover:bg-muted/30 transition-colors">
                      <span className={cn(!selectedProv && 'text-muted-foreground')}>
                        {selectedProv ? `${selectedProv.accountNumber}` : 'Search account...'}
                      </span>
                      <ChevronsUpDown className="size-3.5 text-muted-foreground" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[400px] p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Search account number or name..." />
                      <CommandList>
                        <CommandEmpty>No accounts found.</CommandEmpty>
                        <CommandGroup>
                          <CommandItem
                            value="none"
                            onSelect={() => {
                              update('provisioningId', '')
                              setProvOpen(false)
                            }}
                          >
                            <Check
                              className={cn(
                                'size-3.5 mr-2',
                                form.provisioningId === '' ? 'opacity-100' : 'opacity-0'
                              )}
                            />
                            None
                          </CommandItem>
                          {provisioning.map((p) => (
                            <CommandItem
                              key={p.id}
                              value={`${p.accountNumber}`}
                              onSelect={() => {
                                update('provisioningId', p.id)
                                setProvOpen(false)
                              }}
                            >
                              <Check
                                className={cn(
                                  'size-3.5 mr-2',
                                  form.provisioningId === p.id ? 'opacity-100' : 'opacity-0'
                                )}
                              />
                              <span className="font-mono mr-2">{p.accountNumber}</span>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
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
