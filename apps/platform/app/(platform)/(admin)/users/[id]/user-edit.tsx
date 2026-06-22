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
import { Pencil } from 'lucide-react'
import { updateUser, toggleUserSuspension } from './actions'
import { useRouter } from 'next/navigation'
import { type User } from '@/lib/types'

const ROLES = ['admin', 'manager', 'director', 'team_leader', 'agent', 'sales']

export function UserEdit({ user, currentUserId }: { user: User; currentUserId: string }) {
  const router = useRouter()
  const [isEditing, setIsEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [suspending, setSuspending] = useState(false)
  const isSelf = user.id === currentUserId

  const [form, setForm] = useState({
    fullName: user.fullName,
    role: user.role,
  })

  async function handleSave() {
    setSaving(true)
    await updateUser(user.id, form)
    setSaving(false)
    setIsEditing(false)
    router.refresh()
  }

  async function handleToggleSuspension() {
    setSuspending(true)
    await toggleUserSuspension(user.id, user.isActive)
    setSuspending(false)
    router.refresh()
  }

  return (
    <div className="space-y-6">
      {/* Account info */}
      <div className="border rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b bg-muted/30 flex items-center justify-between">
          <h2 className="text-sm font-medium">Account</h2>
          {isEditing ? (
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setForm({ fullName: user.fullName, role: user.role })
                  setIsEditing(false)
                }}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button size="sm" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving...' : 'Save'}
              </Button>
            </div>
          ) : (
            <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
              <Pencil className="size-3 mr-1" />
              Edit
            </Button>
          )}
        </div>
        <div className="divide-y">
          <Row label="Full name">
            {isEditing ? (
              <Input
                value={form.fullName}
                onChange={(e) => setForm((p) => ({ ...p, fullName: e.target.value }))}
                className="h-8 max-w-xs"
              />
            ) : (
              <span className="text-sm">{user.fullName}</span>
            )}
          </Row>
          <Row label="Email">
            <span className="text-sm text-muted-foreground">{user.email}</span>
          </Row>
          <Row label="Role">
            {isEditing && !isSelf ? (
              <Select
                value={form.role}
                onValueChange={(v) => setForm((p) => ({ ...p, role: v ?? p.role }))}
              >
                <SelectTrigger className="h-8 w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLES.map((r) => (
                    <SelectItem key={r} value={r}>
                      {r.replace('_', ' ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <span className="text-sm capitalize">{user.role.replace('_', ' ')}</span>
            )}
          </Row>
          <Row label="Status">
            <span className="text-sm capitalize">{user.approvalStatus.replace('_', ' ')}</span>
          </Row>
          <Row label="Joined">
            <span className="text-sm text-muted-foreground">
              {new Date(user.createdAt).toLocaleDateString('en-GB', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </span>
          </Row>
          <Row label="User ID">
            <span className="text-xs font-mono text-muted-foreground">{user.id}</span>
          </Row>
        </div>
      </div>

      {/* Danger zone */}
      {!isSelf && user.approvalStatus !== 'pending' && (
        <div className="border border-red-200 rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-red-200 bg-red-50">
            <h2 className="text-sm font-medium text-red-800">Danger zone</h2>
          </div>
          <div className="px-4 py-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">
                {user.isActive ? 'Suspend account' : 'Restore account'}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {user.isActive
                  ? 'Prevents this user from logging in. Reversible.'
                  : 'Restores login access for this user.'}
              </p>
            </div>
            <Button
              variant={user.isActive ? 'destructive' : 'outline'}
              size="sm"
              onClick={handleToggleSuspension}
              disabled={suspending}
            >
              {suspending ? 'Updating...' : user.isActive ? 'Suspend' : 'Restore'}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex px-4 py-3 items-center gap-4">
      <span className="text-muted-foreground w-32 shrink-0 text-sm">{label}</span>
      <div className="text-sm flex-1">{children}</div>
    </div>
  )
}
