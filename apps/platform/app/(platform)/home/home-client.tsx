'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Users, FileText, Wifi, Plus, X, Check, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'

type AuditLog = {
  id: string
  tableName: string
  recordId: string
  action: string
  changedBy: string | null
  changedAt: Date | string
  oldData: any
  newData: any
}

type Todo = {
  id: string
  text: string
  done: boolean
  createdAt: number
}

const actionColours: Record<string, string> = {
  INSERT: 'bg-green-100 text-green-800 border-green-200',
  UPDATE: 'bg-blue-100 text-blue-800 border-blue-200',
  DELETE: 'bg-red-100 text-red-800 border-red-200',
}

const tableLabels: Record<string, string> = {
  customers: 'Customer',
  deals: 'Deal',
  provisioning: 'Provisioning',
  provisioning_services: 'Service',
  deal_services: 'Deal services',
  deal_pricing: 'Deal pricing',
  deal_billing: 'Deal billing',
  users: 'User',
}

function formatActivityMessage(log: AuditLog): string {
  const table = tableLabels[log.tableName] ?? log.tableName
  const action =
    log.action === 'INSERT' ? 'created' : log.action === 'UPDATE' ? 'updated' : 'deleted'

  // Try to extract a meaningful identifier from the data
  const data = log.newData ?? log.oldData
  if (data) {
    if (data.account_number) return `${table} ${data.account_number} ${action}`
    if (data.company_name) return `${table} "${data.company_name}" ${action}`
    if (data.first_name) return `${table} ${data.first_name} ${data.last_name ?? ''} ${action}`
    if (data.service_type) return `${data.service_type.toUpperCase()} service ${action}`
  }
  return `${table} ${action}`
}

export function HomeClient({
  fullName,
  stats,
  recentActivity,
  userId,
}: {
  fullName: string
  stats: { dealsToday: number; activeCustomers: number; pendingProvisioning: number }
  recentActivity: AuditLog[]
  userId: string
}) {
  const today = new Date().toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

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
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Deals today
                </p>
                <p className="text-3xl font-bold mt-1">{stats.dealsToday}</p>
              </div>
              <div className="p-3 rounded-full bg-purple-100">
                <FileText className="size-5 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Active customers
                </p>
                <p className="text-3xl font-bold mt-1">{stats.activeCustomers}</p>
              </div>
              <div className="p-3 rounded-full bg-blue-100">
                <Users className="size-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Pending provisioning
                </p>
                <p className="text-3xl font-bold mt-1">{stats.pendingProvisioning}</p>
              </div>
              <div className="p-3 rounded-full bg-orange-100">
                <Wifi className="size-5 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Activity + Todo */}
      <div className="grid grid-cols-[1fr_360px] gap-6">
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
                      className={cn('text-xs shrink-0', actionColours[log.action])}
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
            {/* Add todo */}
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

            {/* Pending todos */}
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

            {/* Done todos */}
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
