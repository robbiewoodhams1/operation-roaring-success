'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Pencil, Plus } from 'lucide-react'
import { createTeam, renameTeam, setTeamActive } from './actions'

type TeamRow = { id: string; name: string; isActive: boolean; members: number }

function TeamItem({ team }: { team: TeamRow }) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(team.name)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function save() {
    startTransition(async () => {
      const result = await renameTeam(team.id, name)
      setError(result.error)
      if (!result.error) {
        setEditing(false)
        router.refresh()
      }
    })
  }

  function toggleActive() {
    startTransition(async () => {
      await setTeamActive(team.id, !team.isActive)
      router.refresh()
    })
  }

  return (
    <li className="px-4 py-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      {editing ? (
        <div className="flex-1 flex flex-col gap-1">
          <div className="flex gap-2">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-8 max-w-xs"
              aria-label="Team name"
              autoFocus
            />
            <Button size="sm" onClick={save} disabled={pending}>
              Save
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setName(team.name)
                setError(null)
                setEditing(false)
              }}
              disabled={pending}
            >
              Cancel
            </Button>
          </div>
          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
      ) : (
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-sm font-medium truncate">{team.name}</span>
          {!team.isActive && (
            <Badge variant="outline" className="text-muted-foreground">
              Retired
            </Badge>
          )}
          <span className="text-xs text-muted-foreground">
            {team.members} active member{team.members === 1 ? '' : 's'}
          </span>
        </div>
      )}
      {!editing && (
        <div className="flex gap-2 shrink-0">
          <Button size="sm" variant="ghost" onClick={() => setEditing(true)} disabled={pending}>
            <Pencil className="size-3 mr-1" />
            Rename
          </Button>
          <Button size="sm" variant="outline" onClick={toggleActive} disabled={pending}>
            {team.isActive ? 'Retire' : 'Reinstate'}
          </Button>
        </div>
      )}
    </li>
  )
}

export function TeamsManager({ teams, unassigned }: { teams: TeamRow[]; unassigned: number }) {
  const router = useRouter()
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function add(e: React.FormEvent) {
    e.preventDefault()
    startTransition(async () => {
      const result = await createTeam(name)
      setError(result.error)
      if (!result.error) {
        setName('')
        router.refresh()
      }
    })
  }

  return (
    <div className="space-y-6">
      <form onSubmit={add} className="border rounded-lg p-4 space-y-2">
        <label htmlFor="new-team" className="text-sm font-medium">
          New team
        </label>
        <div className="flex gap-2">
          <Input
            id="new-team"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Sales — Maidstone"
            className="h-9 max-w-sm"
          />
          <Button type="submit" disabled={pending || !name.trim()}>
            <Plus className="size-4 mr-1" />
            Add
          </Button>
        </div>
        {error && <p className="text-xs text-destructive">{error}</p>}
      </form>

      <div className="border rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b bg-muted/30 flex items-center justify-between">
          <h2 className="text-sm font-medium">Teams</h2>
          <span className="text-xs text-muted-foreground">
            {unassigned} active employee{unassigned === 1 ? '' : 's'} without a team
          </span>
        </div>
        {teams.length === 0 ? (
          <p className="px-4 py-8 text-sm text-center text-muted-foreground">
            No teams yet. Add one above, then assign people from their user page.
          </p>
        ) : (
          <ul className="divide-y">
            {teams.map((t) => (
              <TeamItem key={t.id} team={t} />
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
