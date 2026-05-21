'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { inviteUserAction } from './actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { UserRole } from '@roaring/auth'

const ROLES = [
  { value: 'agent', label: 'Agent' },
  { value: 'team_leader', label: 'Team Leader' },
  { value: 'manager', label: 'Manager' },
  { value: 'director', label: 'Director' },
  { value: 'admin', label: 'Admin' },
] as const

export function InviteUserForm({
  tenantId,
  invitedById,
  invitedByEmail,
  invitedByName,
}: {
  tenantId: string
  invitedById: string
  invitedByEmail: string
  invitedByName: string
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const [form, setForm] = useState({
    email: '',
    fullName: '',
    role: 'agent' as const,
    department: '',
    team: '',
  })

  function updateField(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e: React.SubmitEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { success, error } = await inviteUserAction({
      email: form.email,
      fullName: form.fullName,
      role: form.role,
      tenantId,
      invitedById,
      invitedByEmail,
      invitedByName,
      ...(form.department && { department: form.department }),
      ...(form.team && { team: form.team }),
    })

    if (error) {
      setError(error)
      setLoading(false)
      return
    }

    setSuccess(true)
    setTimeout(() => router.push('/users/'), 2000)
  }

  if (success) {
    return (
      <div className="text-center py-12">
        <p className="text-lg font-medium">Invite sent</p>
        <p className="text-sm text-muted-foreground mt-1">
          {form.email} will receive an email to set up their account
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="fullName">Full name</Label>
        <Input
          id="fullName"
          value={form.fullName}
          onChange={(e) => updateField('fullName', e.target.value)}
          placeholder="Jane Smith"
          required
          disabled={loading}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          value={form.email}
          onChange={(e) => updateField('email', e.target.value)}
          placeholder="jane@roaringsuccess.co.uk"
          required
          disabled={loading}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="role">Role</Label>
        <Select
          value={form.role}
          onValueChange={(value) => updateField('role', value as UserRole)}
          disabled={loading}
        >
          <SelectTrigger id="role">
            <SelectValue>
              {ROLES.find((r) => r.value === form.role)?.label ?? 'Select a role'}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {ROLES.map((role) => (
              <SelectItem key={role.value} value={role.value}>
                {role.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="department">
          Department
          <span className="text-muted-foreground ml-1 font-normal">(optional)</span>
        </Label>
        <Input
          id="department"
          value={form.department}
          onChange={(e) => updateField('department', e.target.value)}
          placeholder="Operations"
          disabled={loading}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="team">
          Team
          <span className="text-muted-foreground ml-1 font-normal">(optional)</span>
        </Label>
        <Input
          id="team"
          value={form.team}
          onChange={(e) => updateField('team', e.target.value)}
          placeholder="Team A"
          disabled={loading}
        />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex gap-3 pt-2">
        <Button type="button" variant="outline" onClick={() => router.back()} disabled={loading}>
          Cancel
        </Button>
        <Button type="submit" disabled={loading} className="flex-1">
          {loading ? 'Sending invite...' : 'Send invite'}
        </Button>
      </div>
    </form>
  )
}
