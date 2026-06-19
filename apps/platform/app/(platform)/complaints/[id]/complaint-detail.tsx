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
import { Pencil, Send, Trash2, ChevronDown, ChevronUp } from 'lucide-react'
import { addComplaintComment, deleteComplaintComment } from './actions'
import { updateComplaint, updateComplaintStatus } from '../actions'
import type { Complaint, ComplaintComment } from '@roaring/db'
import {
  COMPLAINT_STATUSES,
  COMPLAINT_TYPES,
  COMPLAINT_STATUS_COLOURS,
  COMPLAINT_STATUS_LABELS,
  COMPLAINT_TYPE_LABELS,
} from '@/lib/constants'

export function ComplaintDetail({
  complaint,
  comments,
  userMap,
  provCustomer,
  currentUserId,
  allUsers,
}: {
  complaint: Complaint
  comments: ComplaintComment[]
  userMap: Record<string, string>
  provCustomer: {
    accountNumber: string
    companyName: string | null
    firstName: string
    lastName: string
    mobile: string | null
    landline: string | null
    email: string | null
    addressLine1: string | null
    addressLine2: string | null
    addressLine3: string | null
    addressLine4: string | null
    postcode: string | null
  } | null
  currentUserId: string
  allUsers: { id: string; fullName: string }[]
}) {
  const [customerOpen, setCustomerOpen] = useState(false)
  const router = useRouter()
  const [isEditing, setIsEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [commentBody, setCommentBody] = useState('')
  const [submittingComment, setSubmittingComment] = useState(false)

  const [form, setForm] = useState({
    title: complaint.title,
    type: complaint.type as string,
    assignedTo: complaint.assignedTo ?? '',
    ticketRef: complaint.ticketRef ?? '',
    ticketRaisedAt: complaint.ticketRaisedAt
      ? new Date(complaint.ticketRaisedAt).toISOString().slice(0, 16)
      : '',
  })

  async function handleSave() {
    setSaving(true)
    await updateComplaint(complaint.id, {
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
    await updateComplaintStatus(complaint.id, status)
    router.refresh()
  }

  async function handleAddComment() {
    if (!commentBody.trim()) return
    setSubmittingComment(true)
    await addComplaintComment(complaint.id, commentBody.trim())
    setCommentBody('')
    setSubmittingComment(false)
    router.refresh()
  }

  async function handleDeleteComment(commentId: string) {
    await deleteComplaintComment(commentId, complaint.id)
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
              <Badge variant="outline" className={COMPLAINT_STATUS_COLOURS[complaint.status]}>
                {COMPLAINT_STATUS_LABELS[complaint.status] ?? complaint.status}
              </Badge>
              <Select value={complaint.status} onValueChange={handleStatusChange}>
                <SelectTrigger className="h-7 w-48 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {COMPLAINT_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {COMPLAINT_STATUS_LABELS[s] ?? s}
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
              <span className="text-sm">{complaint.title}</span>
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
                  {COMPLAINT_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {COMPLAINT_TYPE_LABELS[t] ?? t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <span className="text-sm">
                {COMPLAINT_TYPE_LABELS[complaint.type] ?? complaint.type}
              </span>
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
                {complaint.assignedTo ? (userMap[complaint.assignedTo] ?? '—') : '—'}
              </span>
            )}
          </Row>
          <Row label="Ticket ref">
            {isEditing ? (
              <Input
                value={form.ticketRef}
                onChange={(e) => setForm((p) => ({ ...p, ticketRef: e.target.value }))}
                className="h-8 w-48 font-mono"
                placeholder="INC0012345"
              />
            ) : (
              <span className="text-sm font-mono">{complaint.ticketRef ?? '—'}</span>
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
                {complaint.ticketRaisedAt
                  ? new Date(complaint.ticketRaisedAt).toLocaleString('en-GB')
                  : '—'}
              </span>
            )}
          </Row>
          <Row label="Opened">
            <span className="text-sm">{new Date(complaint.openedAt).toLocaleString('en-GB')}</span>
          </Row>
          {complaint.closedAt && (
            <Row label="Closed">
              <span className="text-sm">
                {new Date(complaint.closedAt).toLocaleString('en-GB')}
              </span>
            </Row>
          )}
        </div>
      </div>

      {/* Customer */}
      {provCustomer && (
        <div className="border rounded-lg overflow-hidden">
          <button
            className="w-full px-4 py-3 flex items-center justify-between bg-muted/30 hover:bg-muted/50 transition-colors"
            onClick={() => setCustomerOpen(!customerOpen)}
          >
            <div className="flex items-center gap-3">
              <h2 className="text-sm font-medium">Customer</h2>
              <span className="text-xs font-mono text-muted-foreground">
                {provCustomer.accountNumber}
              </span>
              <span className="text-xs text-muted-foreground">
                {provCustomer.companyName ?? `${provCustomer.firstName} ${provCustomer.lastName}`}
              </span>
            </div>
            {customerOpen ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
          </button>
          {customerOpen && (
            <div className="divide-y">
              <Row label="Account number">
                <span className="text-sm font-mono">{provCustomer.accountNumber}</span>
              </Row>
              <Row label="Company">
                <span className="text-sm">{provCustomer.companyName ?? '—'}</span>
              </Row>
              <Row label="Name">
                <span className="text-sm">
                  {provCustomer.firstName} {provCustomer.lastName}
                </span>
              </Row>
              <Row label="Mobile">
                <span className="text-sm font-mono">{provCustomer.mobile ?? '—'}</span>
              </Row>
              <Row label="Landline">
                <span className="text-sm font-mono">{provCustomer.landline ?? '—'}</span>
              </Row>
              <Row label="Email">
                <span className="text-sm">{provCustomer.email ?? '—'}</span>
              </Row>
              <Row label="Address">
                <span className="text-sm">
                  {[
                    provCustomer.addressLine1,
                    provCustomer.addressLine2,
                    provCustomer.addressLine3,
                    provCustomer.addressLine4,
                  ]
                    .filter(Boolean)
                    .join(', ') || '—'}
                </span>
              </Row>
              <Row label="Postcode">
                <span className="text-sm font-mono">{provCustomer.postcode ?? '—'}</span>
              </Row>
            </div>
          )}
        </div>
      )}

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
