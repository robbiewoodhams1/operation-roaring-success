'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { deleteTodo } from './actions'
import type { Todo } from '@roaring/db'
import {
  TODO_STATUSES,
  TODO_STATUS_LABELS,
  TODO_STATUS_COLOURS,
  TODO_PRIORITY_LABELS,
  TODO_PRIORITY_COLOURS,
  TODO_LINK_TYPE_LABELS,
} from '@/lib/constants'

export function TodoFilters({
  todos,
  userId,
  userMap,
}: {
  todos: Todo[]
  userId: string
  userMap: Record<string, string>
}) {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string[]>(['not_started', 'in_progress'])
  const [tab, setTab] = useState<'mine' | 'assigned'>('mine')

  const mine = todos.filter((t) => t.assignedTo === userId)
  const assigned = todos.filter((t) => t.assignedBy === userId && t.assignedTo !== userId)
  const current = tab === 'mine' ? mine : assigned

  const filtered = useMemo(() => {
    let result = [...current]
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          (t.description ?? '').toLowerCase().includes(q) ||
          (t.linkLabel ?? '').toLowerCase().includes(q)
      )
    }
    if (statusFilter.length > 0) {
      result = result.filter((t) => statusFilter.includes(t.status))
    }
    return result
  }, [current, search, statusFilter])

  function toggleStatus(s: string) {
    setStatusFilter((p) => (p.includes(s) ? p.filter((x) => x !== s) : [...p, s]))
  }

  async function handleDelete(id: string) {
    await deleteTodo(id)
    router.refresh()
  }

  return (
    <div className="space-y-4">
      {/* Tab toggle */}
      <div className="flex items-center gap-1 border rounded-lg p-1 w-fit">
        <Button
          variant={tab === 'mine' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setTab('mine')}
        >
          My tasks (
          {mine.filter((t) => t.status === 'not_started' || t.status === 'in_progress').length})
        </Button>
        <Button
          variant={tab === 'assigned' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setTab('assigned')}
        >
          Assigned by me (
          {assigned.filter((t) => t.status === 'not_started' || t.status === 'in_progress').length})
        </Button>
      </div>

      <div className="flex flex-wrap gap-3">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search tasks..."
          className="max-w-sm"
        />
        {search && (
          <Button variant="ghost" size="sm" onClick={() => setSearch('')}>
            <X className="size-3 mr-1" />
            Clear
          </Button>
        )}
      </div>

      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Status</p>
        <div className="flex flex-wrap gap-2">
          {TODO_STATUSES.map((s) => (
            <button
              key={s}
              onClick={() => toggleStatus(s)}
              className={cn(
                'px-2.5 py-1 rounded-md text-xs font-medium border transition-all',
                TODO_STATUS_COLOURS[s],
                statusFilter.includes(s)
                  ? 'ring-2 ring-offset-1 ring-foreground/30'
                  : 'hover:opacity-80'
              )}
            >
              {TODO_STATUS_LABELS[s]}
            </button>
          ))}
        </div>
      </div>

      <p className="text-xs text-muted-foreground">{filtered.length} tasks</p>

      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Linked to</TableHead>
              {tab === 'mine' && <TableHead>From</TableHead>}
              {tab === 'assigned' && <TableHead>Assigned to</TableHead>}
              <TableHead>Created</TableHead>
              <TableHead className="w-8" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((todo) => (
              <TableRow
                key={todo.id}
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => router.push(`/todo/${todo.id}`)}
              >
                <TableCell className="font-medium">{todo.title}</TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    className={cn('text-xs', TODO_PRIORITY_COLOURS[todo.priority])}
                  >
                    {TODO_PRIORITY_LABELS[todo.priority]}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    className={cn('text-xs', TODO_STATUS_COLOURS[todo.status])}
                  >
                    {TODO_STATUS_LABELS[todo.status]}
                  </Badge>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {todo.linkLabel
                    ? `${todo.linkType ? TODO_LINK_TYPE_LABELS[todo.linkType] + ': ' : ''}${todo.linkLabel}`
                    : '—'}
                </TableCell>
                {tab === 'mine' && (
                  <TableCell className="text-sm text-muted-foreground">
                    {todo.assignedBy ? (userMap[todo.assignedBy] ?? 'Unknown') : 'Me'}
                  </TableCell>
                )}
                {tab === 'assigned' && (
                  <TableCell className="text-sm text-muted-foreground">
                    {userMap[todo.assignedTo] ?? 'Unknown'}
                  </TableCell>
                )}
                <TableCell className="text-xs text-muted-foreground">
                  {new Date(todo.createdAt).toLocaleDateString('en-GB')}
                </TableCell>
                <TableCell>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDelete(todo.id)
                    }}
                    className="text-muted-foreground hover:text-destructive transition-colors"
                  >
                    <X className="size-3.5" />
                  </button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {filtered.length === 0 && (
          <div className="text-center py-12 text-muted-foreground text-sm">No tasks found.</div>
        )}
      </div>
    </div>
  )
}
