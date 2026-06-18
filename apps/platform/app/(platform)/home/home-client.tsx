'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Users, FileText, Wifi, Plus, X, Check, Clock, TrendingUp } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  STAT_DEFINITIONS,
  DEFAULT_STATS,
  type StatKey,
  type StatCategory,
} from './stat-definitions'
import { type AuditLog } from '@/lib/types'
import { AUDIT_ACTION_COLOURS, AUDIT_TABLE_LABELS } from '@/lib/constants'

type Todo = {
  id: string
  text: string
  done: boolean
  createdAt: number
}

const categoryLabels: Record<StatCategory, string> = {
  sales: 'Sales',
  provisioning: 'Provisioning',
  customers: 'Customers',
}

const categoryIcons: Record<StatCategory, React.ComponentType<{ className?: string }>> = {
  sales: FileText,
  provisioning: Wifi,
  customers: Users,
}

function formatActivityMessage(log: AuditLog): string {
  const table = AUDIT_TABLE_LABELS[log.tableName] ?? log.tableName
  const action =
    log.action === 'INSERT' ? 'created' : log.action === 'UPDATE' ? 'updated' : 'deleted'

  const data = log.newData ?? log.oldData
  if (data) {
    if (data.account_number) return `${table} ${data.account_number} ${action}`
    if (data.company_name) return `${table} "${data.company_name}" ${action}`
    if (data.first_name) return `${table} ${data.first_name} ${data.last_name ?? ''} ${action}`
    if (data.service_type) return `${data.service_type.toUpperCase()} service ${action}`
  }
  return `${table} ${action}`
}

// ── Add Stat Modal ──────────────────────────────────────────────────────────
function AddStatModal({
  currentStats,
  onAdd,
  onClose,
}: {
  currentStats: StatKey[]
  onAdd: (key: StatKey) => void
  onClose: () => void
}) {
  const categories: StatCategory[] = ['sales', 'provisioning', 'customers']

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-background rounded-xl shadow-2xl w-full max-w-md mx-4 max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h2 className="text-sm font-semibold">Add a stat</h2>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="size-4" />
          </button>
        </div>
        <div className="overflow-y-auto px-4 py-3 space-y-4">
          {categories.map((cat) => {
            const Icon = categoryIcons[cat]
            const items = (
              Object.entries(STAT_DEFINITIONS) as [StatKey, (typeof STAT_DEFINITIONS)[StatKey]][]
            ).filter(([, def]) => def.category === cat)

            return (
              <div key={cat}>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1.5">
                  <Icon className="size-3.5" />
                  {categoryLabels[cat]}
                </p>
                <div className="space-y-1">
                  {items.map(([key, def]) => {
                    const added = currentStats.includes(key)
                    return (
                      <button
                        key={key}
                        disabled={added}
                        onClick={() => onAdd(key)}
                        className={cn(
                          'w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm text-left transition-colors',
                          added
                            ? 'bg-muted/40 text-muted-foreground cursor-not-allowed'
                            : 'hover:bg-muted/60 cursor-pointer'
                        )}
                      >
                        {def.label}
                        {added ? <Check className="size-3.5" /> : <Plus className="size-3.5" />}
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ── Stat Card ───────────────────────────────────────────────────────────────
function StatCard({
  statKey,
  value,
  onRemove,
}: {
  statKey: StatKey
  value: string
  onRemove: () => void
}) {
  const def = STAT_DEFINITIONS[statKey]
  const Icon = categoryIcons[def.category]

  const iconColours: Record<StatCategory, string> = {
    sales: 'bg-purple-100 text-purple-600',
    provisioning: 'bg-orange-100 text-orange-600',
    customers: 'bg-blue-100 text-blue-600',
  }

  return (
    <Card className="group relative">
      <button
        onClick={onRemove}
        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground"
      >
        <X className="size-3.5" />
      </button>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              {def.label}
            </p>
            <p className="text-3xl font-bold mt-1">{value}</p>
          </div>
          <div className={cn('p-3 rounded-full', iconColours[def.category])}>
            <Icon className="size-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export function HomeClient({
  fullName,
  statValues,
  recentActivity,
  userId,
}: {
  fullName: string
  statValues: Record<string, { value: string; sub?: string }>
  recentActivity: AuditLog[]
  userId: string
}) {
  const today = new Date().toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  // Stats — persisted in localStorage
  const statsKey = `home-stats-${userId}`
  const [activeStats, setActiveStats] = useState<StatKey[]>(DEFAULT_STATS)
  const [showAddStat, setShowAddStat] = useState(false)

  useEffect(() => {
    try {
      const stored = localStorage.getItem(statsKey)
      if (stored) setActiveStats(JSON.parse(stored))
    } catch {}
  }, [statsKey])

  function saveStats(updated: StatKey[]) {
    setActiveStats(updated)
    try {
      localStorage.setItem(statsKey, JSON.stringify(updated))
    } catch {}
  }

  function addStat(key: StatKey) {
    if (!activeStats.includes(key)) saveStats([...activeStats, key])
    setShowAddStat(false)
  }

  function removeStat(key: StatKey) {
    saveStats(activeStats.filter((k) => k !== key))
  }

  // Todo list — persisted in localStorage
  const storageKey = `todos-${userId}`
  const [todos, setTodos] = useState<Todo[]>([])
  const [newTodo, setNewTodo] = useState('')

  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey)
      if (stored) setTodos(JSON.parse(stored))
    } catch {}
  }, [storageKey])

  function saveTodos(updated: Todo[]) {
    setTodos(updated)
    try {
      localStorage.setItem(storageKey, JSON.stringify(updated))
    } catch {}
  }

  function addTodo() {
    if (!newTodo.trim()) return
    saveTodos([
      ...todos,
      { id: crypto.randomUUID(), text: newTodo.trim(), done: false, createdAt: Date.now() },
    ])
    setNewTodo('')
  }

  function toggleTodo(id: string) {
    saveTodos(todos.map((t) => (t.id === id ? { ...t, done: !t.done } : t)))
  }

  function removeTodo(id: string) {
    saveTodos(todos.filter((t) => t.id !== id))
  }

  const pending = todos.filter((t) => !t.done)
  const done = todos.filter((t) => t.done)

  return (
    <div className="p-6 w-full space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-semibold">Welcome back, {fullName}</h1>
        <p className="text-muted-foreground mt-1 flex items-center gap-2">
          <Clock className="size-3.5" />
          {today}
        </p>
      </div>

      {/* Stats */}
      <div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {activeStats.map((key) => (
            <StatCard
              key={key}
              statKey={key}
              value={statValues[key]?.value ?? '—'}
              onRemove={() => removeStat(key)}
            />
          ))}
          <button
            onClick={() => setShowAddStat(true)}
            className="border border-dashed rounded-lg flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors min-h-[104px]"
          >
            <Plus className="size-4" />
            Add stat
          </button>
        </div>
      </div>

      {showAddStat && (
        <AddStatModal
          currentStats={activeStats}
          onAdd={addStat}
          onClose={() => setShowAddStat(false)}
        />
      )}

      {/* Activity + Todo */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">
        {/* Recent activity */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Recent activity</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {recentActivity.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No activity yet</p>
            ) : (
              <div className="space-y-1">
                {recentActivity.map((log) => (
                  <div key={log.id} className="flex items-center gap-3 py-2 border-b last:border-0">
                    <Badge
                      variant="outline"
                      className={cn('text-xs shrink-0', AUDIT_ACTION_COLOURS[log.action])}
                    >
                      {log.action}
                    </Badge>
                    <span className="text-sm flex-1">{formatActivityMessage(log)}</span>
                    <span className="text-xs text-muted-foreground shrink-0">
                      {new Date(log.changedAt).toLocaleTimeString('en-GB', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Todo list */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center justify-between">
              To do
              {pending.length > 0 && (
                <Badge variant="outline" className="text-xs">
                  {pending.length}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-3">
            <div className="flex gap-2">
              <Input
                value={newTodo}
                onChange={(e) => setNewTodo(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addTodo()}
                placeholder="Add a task..."
                className="h-8 text-sm"
              />
              <Button size="sm" className="h-8 px-2 shrink-0" onClick={addTodo}>
                <Plus className="size-3.5" />
              </Button>
            </div>

            {pending.length === 0 && done.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-3">No tasks yet</p>
            )}
            <div className="space-y-1">
              {pending.map((todo) => (
                <div key={todo.id} className="flex items-center gap-2 group py-1">
                  <button
                    onClick={() => toggleTodo(todo.id)}
                    className="size-4 rounded border-2 border-muted-foreground/40 shrink-0 hover:border-primary transition-colors flex items-center justify-center"
                  />
                  <span className="text-sm flex-1">{todo.text}</span>
                  <button
                    onClick={() => removeTodo(todo.id)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="size-3 text-muted-foreground" />
                  </button>
                </div>
              ))}
            </div>

            {done.length > 0 && (
              <div className="space-y-1 pt-2 border-t">
                <p className="text-xs text-muted-foreground mb-1">Completed</p>
                {done.map((todo) => (
                  <div key={todo.id} className="flex items-center gap-2 group py-1">
                    <button
                      onClick={() => toggleTodo(todo.id)}
                      className="size-4 rounded border-2 border-primary bg-primary shrink-0 flex items-center justify-center"
                    >
                      <Check className="size-2.5 text-primary-foreground" />
                    </button>
                    <span className="text-sm flex-1 line-through text-muted-foreground">
                      {todo.text}
                    </span>
                    <button
                      onClick={() => removeTodo(todo.id)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="size-3 text-muted-foreground" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
