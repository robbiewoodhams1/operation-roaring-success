'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Check, Plus, Trash2, ChevronDown } from 'lucide-react'
import { toggleTodo, deleteTodo } from './actions'
import { CreateTodoModal } from './create-todo-modal'
import { cn } from '@/lib/utils'
import { TODO_PRIORITY_LABELS, TODO_PRIORITY_COLOURS, TODO_LINK_TYPE_LABELS } from '@/lib/constants'
import type { Todo } from '@roaring/db'

export function TodoClient({
  todos,
  userId,
  userMap,
  allUsers,
  linkOptions,
}: {
  todos: Todo[]
  userId: string
  userMap: Record<string, string>
  allUsers: { id: string; fullName: string }[]
  linkOptions: Record<string, { id: string; label: string }[]>
}) {
  const router = useRouter()
  const [showDone, setShowDone] = useState(false)
  const [tab, setTab] = useState<'mine' | 'assigned'>('mine')

  const mine = todos.filter((t) => t.assignedTo === userId)
  const assigned = todos.filter((t) => t.assignedBy === userId && t.assignedTo !== userId)

  const current = tab === 'mine' ? mine : assigned
  const pending = current.filter((t) => !t.done)
  const done = current.filter((t) => t.done)

  async function handleToggle(id: string, done: boolean) {
    await toggleTodo(id, done)
    router.refresh()
  }

  async function handleDelete(id: string) {
    await deleteTodo(id)
    router.refresh()
  }

  function TodoItem({ todo }: { todo: Todo }) {
    return (
      <div
        className={cn(
          'flex items-start gap-3 py-3 px-4 group border-b last:border-0',
          todo.done && 'opacity-50'
        )}
      >
        <button
          onClick={() => handleToggle(todo.id, !todo.done)}
          className={cn(
            'size-5 rounded border-2 shrink-0 mt-0.5 flex items-center justify-center transition-colors',
            todo.done
              ? 'bg-primary border-primary'
              : 'border-muted-foreground/40 hover:border-primary'
          )}
        >
          {todo.done && <Check className="size-3 text-primary-foreground" />}
        </button>
        <div className="flex-1 min-w-0">
          <p className={cn('text-sm font-medium', todo.done && 'line-through')}>{todo.title}</p>
          {todo.description && (
            <p className="text-xs text-muted-foreground mt-0.5">{todo.description}</p>
          )}
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <Badge
              variant="outline"
              className={cn('text-xs', TODO_PRIORITY_COLOURS[todo.priority])}
            >
              {TODO_PRIORITY_LABELS[todo.priority]}
            </Badge>
            {todo.linkLabel && (
              <span className="text-xs text-muted-foreground">
                {todo.linkType && `${TODO_LINK_TYPE_LABELS[todo.linkType]}: `}
                {todo.linkLabel}
              </span>
            )}
            {tab === 'mine' && todo.assignedBy && (
              <span className="text-xs text-muted-foreground">
                from {userMap[todo.assignedBy] ?? 'Unknown'}
              </span>
            )}
            {tab === 'assigned' && (
              <span className="text-xs text-muted-foreground">
                → {userMap[todo.assignedTo] ?? 'Unknown'}
              </span>
            )}
          </div>
        </div>
        <button
          onClick={() => handleDelete(todo.id)}
          className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive shrink-0"
        >
          <Trash2 className="size-3.5" />
        </button>
      </div>
    )
  }

  return (
    <div className="p-6 w-full space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">To do</h1>
        <CreateTodoModal userId={userId} allUsers={allUsers} linkOptions={linkOptions} />
      </div>

      {/* Tab toggle */}
      <div className="flex items-center gap-1 border rounded-lg p-1 w-fit">
        <Button
          variant={tab === 'mine' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setTab('mine')}
        >
          My tasks{' '}
          {pending.length > 0 && tab !== 'mine' && `(${mine.filter((t) => !t.done).length})`}
        </Button>
        <Button
          variant={tab === 'assigned' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setTab('assigned')}
        >
          Assigned by me{' '}
          {assigned.filter((t) => !t.done).length > 0 &&
            `(${assigned.filter((t) => !t.done).length})`}
        </Button>
      </div>

      {/* Pending */}
      <div className="border rounded-lg overflow-hidden">
        {pending.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            {tab === 'mine' ? 'No pending tasks, well done!' : 'No tasks assigned to others.'}
          </p>
        ) : (
          <div>
            {pending.map((t) => (
              <TodoItem key={t.id} todo={t} />
            ))}
          </div>
        )}
      </div>

      {/* Done */}
      {done.length > 0 && (
        <div>
          <button
            onClick={() => setShowDone(!showDone)}
            className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors mb-2"
          >
            <ChevronDown
              className={cn('size-3.5 transition-transform', showDone && 'rotate-180')}
            />
            {done.length} completed
          </button>
          {showDone && (
            <div className="border rounded-lg overflow-hidden">
              {done.map((t) => (
                <TodoItem key={t.id} todo={t} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
