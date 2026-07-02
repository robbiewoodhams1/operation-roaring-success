'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Pencil } from 'lucide-react'
import { updateUserName } from './actions'

export function AccountClient({ fullName }: { fullName: string }) {
  const [isEditing, setIsEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [name, setName] = useState(fullName)
  const [draft, setDraft] = useState(fullName)

  async function handleSave() {
    setSaving(true)
    await updateUserName(draft)
    setName(draft)
    setSaving(false)
    setIsEditing(false)
  }

  return (
    <div className="flex px-4 py-3 items-center">
      <span className="text-muted-foreground w-36 shrink-0">Name</span>
      {isEditing ? (
        <div className="flex items-center gap-2 flex-1">
          <Input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            className="h-8 max-w-xs"
            autoFocus
          />
          <Button size="sm" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save'}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setDraft(name)
              setIsEditing(false)
            }}
          >
            Cancel
          </Button>
        </div>
      ) : (
        <div className="flex items-center gap-2 flex-1">
          <span className="font-medium">{name}</span>
          <Button size="sm" variant="ghost" onClick={() => setIsEditing(true)} className="h-7 px-2">
            <Pencil className="size-3" />
          </Button>
        </div>
      )}
    </div>
  )
}
