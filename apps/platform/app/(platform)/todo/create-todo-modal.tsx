'use client'

import { useState } from 'react'
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
import { createTodo } from './actions'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  TODO_PRIORITIES,
  TODO_PRIORITY_LABELS,
  TODO_LINK_TYPES,
  TODO_LINK_TYPE_LABELS,
} from '@/lib/constants'

export function CreateTodoModal({
  userId,
  allUsers,
  linkOptions,
}: {
  userId: string
  allUsers: { id: string; fullName: string }[]
  linkOptions: Record<string, { id: string; label: string }[]>
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [linkOpen, setLinkOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  const [form, setForm] = useState({
    title: '',
    description: '',
    priority: 'today',
    assignedTo: userId,
    linkType: '',
    linkId: '',
    linkLabel: '',
  })

  function update(field: string, value: string) {
    setForm((p) => ({ ...p, [field]: value }))
  }

  function handleLinkTypeChange(type: string) {
    setForm((p) => ({ ...p, linkType: type, linkId: '', linkLabel: '' }))
  }

  async function handleSubmit() {
    if (!form.title) return
    setSaving(true)
    await createTodo({
      title: form.title,
      description: form.description || null,
      priority: form.priority,
      assignedTo: form.assignedTo,
      linkType: form.linkType || null,
      linkId: form.linkId || null,
      linkLabel: form.linkLabel || null,
    })
    setSaving(false)
    setOpen(false)
    setForm({
      title: '',
      description: '',
      priority: 'today',
      assignedTo: userId,
      linkType: '',
      linkId: '',
      linkLabel: '',
    })
    router.refresh()
  }

  const currentLinkOptions = form.linkType ? (linkOptions[form.linkType] ?? []) : []
  const selectedLink = currentLinkOptions.find((o) => o.id === form.linkId)

  return (
    <>
      <Button onClick={() => setOpen(true)} className="gap-2">
        <Plus className="size-4" />
        New task
      </Button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
          <div className="relative bg-background rounded-xl shadow-2xl w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-4 py-3 border-b sticky top-0 bg-background">
              <h2 className="text-sm font-semibold">New task</h2>
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
                  placeholder="What needs doing?"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Description</label>
                <Textarea
                  value={form.description}
                  onChange={(e) => update('description', e.target.value)}
                  placeholder="Any additional details..."
                  className="min-h-16 text-sm resize-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Priority</label>
                <Select
                  value={form.priority}
                  onValueChange={(v) => update('priority', v ?? 'today')}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TODO_PRIORITIES.map((p) => (
                      <SelectItem key={p} value={p}>
                        {TODO_PRIORITY_LABELS[p]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Assign to</label>
                <Select
                  value={form.assignedTo}
                  onValueChange={(v) => update('assignedTo', v ?? userId)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {allUsers.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.fullName}
                        {u.id === userId ? ' (me)' : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">
                  Link to record (optional)
                </label>
                <Select value={form.linkType} onValueChange={(v) => handleLinkTypeChange(v ?? '')}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select record type..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">None</SelectItem>
                    {TODO_LINK_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {TODO_LINK_TYPE_LABELS[t]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {form.linkType && (
                <div className="space-y-1.5 flex flex-col">
                  <label className="text-xs font-medium text-muted-foreground">
                    Select {TODO_LINK_TYPE_LABELS[form.linkType]}
                  </label>
                  <Popover open={linkOpen} onOpenChange={setLinkOpen}>
                    <PopoverTrigger>
                      <div className="w-full flex items-center justify-between h-9 px-3 rounded-md border bg-background text-sm hover:bg-muted/30 transition-colors">
                        <span className={cn(!selectedLink && 'text-muted-foreground')}>
                          {selectedLink ? selectedLink.label : 'Search...'}
                        </span>
                        <ChevronsUpDown className="size-3.5 text-muted-foreground" />
                      </div>
                    </PopoverTrigger>
                    <PopoverContent className="w-[400px] p-0" align="start">
                      <Command>
                        <CommandInput
                          placeholder={`Search ${TODO_LINK_TYPE_LABELS[form.linkType]}...`}
                        />
                        <CommandList>
                          <CommandEmpty>None found.</CommandEmpty>
                          <CommandGroup>
                            <CommandItem
                              value="none"
                              onSelect={() => {
                                update('linkId', '')
                                update('linkLabel', '')
                                setLinkOpen(false)
                              }}
                            >
                              <Check
                                className={cn(
                                  'size-3.5 mr-2',
                                  !form.linkId ? 'opacity-100' : 'opacity-0'
                                )}
                              />
                              None
                            </CommandItem>
                            {currentLinkOptions.map((o) => (
                              <CommandItem
                                key={o.id}
                                value={o.label}
                                onSelect={() => {
                                  update('linkId', o.id)
                                  update('linkLabel', o.label)
                                  setLinkOpen(false)
                                }}
                              >
                                <Check
                                  className={cn(
                                    'size-3.5 mr-2',
                                    form.linkId === o.id ? 'opacity-100' : 'opacity-0'
                                  )}
                                />
                                {o.label}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>
              )}
            </div>

            <div className="px-4 py-3 border-t flex justify-end gap-2 sticky bottom-0 bg-background">
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSubmit} disabled={saving || !form.title}>
                {saving ? 'Creating...' : 'Create task'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
