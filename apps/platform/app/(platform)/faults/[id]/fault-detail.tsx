'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
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
import { Badge } from '@/components/ui/badge'
import { Pencil, Send, Trash2, X } from 'lucide-react'
import { addFaultComment, deleteFaultComment } from './actions'
import { updateFault, updateFaultStatus } from '../actions'
import type { Fault, FaultComment } from '@roaring/db'
import { cn } from '@/lib/utils'

const STATUS_OPTIONS = ['outstanding', 'in_progress', 'resolved']
const TYPE_OPTIONS = ['bb', 'line', 'upgrade', 'dfb', 'provisioning', 'mobile', 'ticket']

const statusColours: Record<string, string> = {
  outstanding: 'bg-red-100 text-red-800 border-red-200',
  in_progress: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  resolved: 'bg-green-100 text-green-800 border-green-200',
}

export function FaultDetail({
  fault,
  comments,
  userMap,
  provCustomer,
  currentUserId,
  allUsers,
}: {
  fault: Fault
  comments: FaultComment[]
  userMap: Record<string, string>
  provCustomer: {
    accountNumber: string
    companyName: string | null
    firstName: string
    lastName: string
  } | null
  currentUserId: string
  allUsers: { id: string; fullName: string }[]
}) {
  const router = useRouter()
  const [isEditing, setIsEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [commentBody, setCommentBody] = useState('')
  const [submittingComment, setSubmittingComment] = useState(false)

  const [form, setForm] = useState({
    title: fault.title,
    type: fault.type as string,
    assignedTo: fault.assignedTo ?? '',
    ticketRef: fault.ticketRef ?? '',
    ticketRaisedAt: fault.ticketRaisedAt
      ? new Date(fault.ticketRaisedAt).toISOString().slice(0, 16)
      : '',
  })

  async function handleSave() {
    setSaving(true)
    await updateFault(fault.id, {
      title: form.title,
      type: form.type,
      assignedTo: form.assignedTo || null,
      ticketRef: form.ticketRef || null,
      ticketRaisedAt: form.ticketRaisedAt || null,
    })
    setSaving(false)
    setIsEditing(false)
    router.refresh()
  }

  async function handleStatusChange(status: string) {
    await updateFaultStatus(fault.id, status)
    router.refresh()
  }

  async function handleAddComment() {
    if (!commentBody.trim()) return
    setSubmittingComment(true)
    await addFaultComment(fault.id, commentBody.trim())
    setCommentBody('')
    setSubmittingComment(false)
    router.refresh()
  }

  async function handleDeleteComment(commentId: string) {
    await deleteFaultComment(commentId, fault.id)
    router.refresh()
  }

  return (
    <div className="space-y-6">
      {/* Details card */}
      <div className="border rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b bg-muted/30 flex items-center justify-between">
          <h2 className="text-sm font-medium">Details</h2>
          {isEditing ? (
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditing(false)}
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
          <Row label="Status">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className={statusColours[fault.status]}>
                {fault.status.replace('_', ' ')}
              </Badge>
              <Select value={fault.status} onValueChange={handleStatusChange}>
                <SelectTrigger className="h-7 w-36 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s.replace('_', ' ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </Row>
          <Row label="Title">
            {isEditing ? (
              <Input
                value={form.title}
                onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                className="h-8 max-w-sm"
              />
            ) : (
              <span className="text-sm">{fault.title}</span>
            )}
          </Row>
          <Row label="Type">
            {isEditing ? (
              <Select
                value={form.type}
                onValueChange={(v) => setForm((p) => ({ ...p, type: v ?? p.type }))}
              >
                <SelectTrigger className="h-8 w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TYPE_OPTIONS.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t.toUpperCase()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <span className="text-sm">{fault.type.toUpperCase()}</span>
            )}
          </Row>
          <Row label="Assigned to">
            {isEditing ? (
              <Select
                value={form.assignedTo}
                onValueChange={(v) => setForm((p) => ({ ...p, assignedTo: v ?? '' }))}
              >
                <SelectTrigger className="h-8 w-48">
                  <SelectValue placeholder="Unassigned" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Unassigned</SelectItem>
                  {allUsers.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.fullName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <span className="text-sm">
                {fault.assignedTo ? (userMap[fault.assignedTo] ?? '—') : '—'}
              </span>
            )}
          </Row>
          {provCustomer && (
            <Row label="Account">
              <span className="text-sm font-mono">{provCustomer.accountNumber}</span>
              <span className="text-sm text-muted-foreground ml-2">
                {provCustomer.companyName ?? `${provCustomer.firstName} ${provCustomer.lastName}`}
              </span>
            </Row>
          )}
          <Row label="Ticket ref">
            {isEditing ? (
              <Input
                value={form.ticketRef}
                onChange={(e) => setForm((p) => ({ ...p, ticketRef: e.target.value }))}
                className="h-8 w-48 font-mono"
                placeholder="INC0012345"
              />
            ) : (
              <span className="text-sm font-mono">{fault.ticketRef ?? '—'}</span>
            )}
          </Row>
          <Row label="Ticket raised">
            {isEditing ? (
              <Input
                type="datetime-local"
                value={form.ticketRaisedAt}
                onChange={(e) => setForm((p) => ({ ...p, ticketRaisedAt: e.target.value }))}
                className="h-8 w-56"
              />
            ) : (
              <span className="text-sm">
                {fault.ticketRaisedAt
                  ? new Date(fault.ticketRaisedAt).toLocaleString('en-GB')
                  : '—'}
              </span>
            )}
          </Row>
          <Row label="Opened">
            <span className="text-sm">{new Date(fault.openedAt).toLocaleString('en-GB')}</span>
          </Row>
          {fault.resolvedAt && (
            <Row label="Resolved">
              <span className="text-sm">{new Date(fault.resolvedAt).toLocaleString('en-GB')}</span>
            </Row>
          )}
        </div>
      </div>

      {/* Comments thread */}
      <div className="border rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b bg-muted/30">
          <h2 className="text-sm font-medium">Comments ({comments.length})</h2>
        </div>

        <div className="divide-y">
          {comments.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-6">No comments yet.</p>
          )}
          {comments.map((comment) => {
            const isOwn = comment.authorId === currentUserId
            return (
              <div key={comment.id} className="px-4 py-3 group">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <div className="size-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary">
                      {(userMap[comment.authorId] ?? '?').charAt(0).toUpperCase()}
                    </div>
                    <span className="text-xs font-medium">
                      {userMap[comment.authorId] ?? 'Unknown'}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(comment.createdAt).toLocaleString('en-GB', {
                        day: '2-digit',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                  {isOwn && (
                    <button
                      onClick={() => handleDeleteComment(comment.id)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  )}
                </div>
                <p className="text-sm ml-8 whitespace-pre-wrap">{comment.body}</p>
              </div>
            )
          })}
        </div>

        {/* Add comment */}
        <div className="px-4 py-3 border-t bg-muted/10">
          <div className="flex gap-2">
            <Textarea
              value={commentBody}
              onChange={(e) => setCommentBody(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleAddComment()
              }}
              placeholder="Add a comment... (Ctrl+Enter to submit)"
              className="min-h-16 text-sm resize-none"
            />
            <Button
              size="sm"
              className="shrink-0 self-end"
              onClick={handleAddComment}
              disabled={submittingComment || !commentBody.trim()}
            >
              <Send className="size-3.5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex px-4 py-3 items-center gap-4">
      <span className="text-muted-foreground w-32 shrink-0 text-sm">{label}</span>
      <div className="text-sm flex-1 flex items-center gap-2">{children}</div>
    </div>
  )
}
