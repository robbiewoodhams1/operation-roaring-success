'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useOptimisticStatus } from '@/lib/hooks/use-optimistic-status'
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
import { addDebtComment, deleteDebtComment } from './actions'
import { updateDebt, updateDebtOutcome } from '../actions'
import type { Debt, DebtComment } from '@roaring/db'
import {
  DEBT_OUTCOMES,
  DEBT_OUTCOME_COLOURS,
  DEBT_OUTCOME_LABELS,
  DEBT_PAYMENT_TYPES,
  DEBT_PAYMENT_TYPE_LABELS,
} from '@/lib/constants'

export function DebtDetail({
  debt,
  comments,
  userMap,
  provCustomer,
  currentUserId,
  allUsers,
}: {
  debt: Debt
  comments: DebtComment[]
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

  const [optimisticOutcome, applyOutcomeChange, isPending] = useOptimisticStatus(debt.outcome)

  const [form, setForm] = useState({
    title: debt.title,
    totalOwed: debt.totalOwed,
    assignedTo: debt.assignedTo ?? '',
    outcome: debt.outcome ?? '',
    paymentTried: debt.paymentTried,
    paymentType: debt.paymentType ?? '',
    dateOfPayment: debt.dateOfPayment ?? '',
  })

  async function handleSave() {
    setSaving(true)
    await updateDebt(debt.id, {
      title: form.title,
      totalOwed: form.totalOwed,
      assignedTo: form.assignedTo || null,
      outcome: form.outcome || null,
      paymentTried: form.paymentTried,
      paymentType: form.paymentType || null,
      dateOfPayment: form.dateOfPayment || null,
    })
    setSaving(false)
    setIsEditing(false)
    router.refresh()
  }

  function handleOutcomeChange(outcome: string) {
    applyOutcomeChange(outcome as typeof debt.outcome, () => updateDebtOutcome(debt.id, outcome))
  }

  async function handleAddComment() {
    if (!commentBody.trim()) return
    setSubmittingComment(true)
    await addDebtComment(debt.id, commentBody.trim())
    setCommentBody('')
    setSubmittingComment(false)
    router.refresh()
  }

  async function handleDeleteComment(commentId: string) {
    await deleteDebtComment(commentId, debt.id)
    router.refresh()
  }

  return (
    <div className="space-y-6">
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
          <Row label="Outcome">
            <div className="flex items-center gap-2">
              {optimisticOutcome && (
                <Badge variant="outline" className={DEBT_OUTCOME_COLOURS[optimisticOutcome]}>
                  {DEBT_OUTCOME_LABELS[optimisticOutcome] ?? optimisticOutcome}
                </Badge>
              )}
              <Select
                value={optimisticOutcome ?? ''}
                onValueChange={(v) => v && handleOutcomeChange(v)}
                disabled={isPending}
              >
                <SelectTrigger className="h-7 w-52 text-xs">
                  <SelectValue placeholder="Set outcome" />
                </SelectTrigger>
                <SelectContent>
                  {DEBT_OUTCOMES.map((o) => (
                    <SelectItem key={o} value={o}>
                      {DEBT_OUTCOME_LABELS[o] ?? o}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {isPending && <span className="text-xs text-muted-foreground">Saving...</span>}
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
              <span className="text-sm">{debt.title}</span>
            )}
          </Row>
          <Row label="Total owed">
            {isEditing ? (
              <Input
                value={form.totalOwed}
                onChange={(e) => setForm((p) => ({ ...p, totalOwed: e.target.value }))}
                className="h-8 w-32 font-mono"
                type="number"
                step="0.01"
              />
            ) : (
              <span className="text-sm font-mono font-medium">
                £{Number(debt.totalOwed).toFixed(2)}
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
                {debt.assignedTo ? (userMap[debt.assignedTo] ?? '—') : '—'}
              </span>
            )}
          </Row>
          <Row label="Payment tried">
            {isEditing ? (
              <Select
                value={form.paymentTried ? 'yes' : 'no'}
                onValueChange={(v) => setForm((p) => ({ ...p, paymentTried: v === 'yes' }))}
              >
                <SelectTrigger className="h-8 w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="no">No</SelectItem>
                  <SelectItem value="yes">Yes</SelectItem>
                </SelectContent>
              </Select>
            ) : (
              <span
                className={`text-sm ${debt.paymentTried ? 'text-green-600' : 'text-muted-foreground'}`}
              >
                {debt.paymentTried ? 'Yes' : 'No'}
              </span>
            )}
          </Row>
          <Row label="Payment type">
            {isEditing ? (
              <Select
                value={form.paymentType}
                onValueChange={(v) => setForm((p) => ({ ...p, paymentType: v ?? '' }))}
              >
                <SelectTrigger className="h-8 w-36">
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">—</SelectItem>
                  {DEBT_PAYMENT_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {DEBT_PAYMENT_TYPE_LABELS[t] ?? t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <span className="text-sm">
                {debt.paymentType
                  ? (DEBT_PAYMENT_TYPE_LABELS[debt.paymentType] ?? debt.paymentType)
                  : '—'}
              </span>
            )}
          </Row>
          <Row label="Date of payment">
            {isEditing ? (
              <Input
                type="date"
                value={form.dateOfPayment}
                onChange={(e) => setForm((p) => ({ ...p, dateOfPayment: e.target.value }))}
                className="h-8 w-40"
              />
            ) : (
              <span className="text-sm">
                {debt.dateOfPayment
                  ? new Date(debt.dateOfPayment).toLocaleDateString('en-GB')
                  : '—'}
              </span>
            )}
          </Row>
          <Row label="Opened">
            <span className="text-sm">{new Date(debt.openedAt).toLocaleString('en-GB')}</span>
          </Row>
          {debt.closedAt && (
            <Row label="Closed">
              <span className="text-sm">{new Date(debt.closedAt).toLocaleString('en-GB')}</span>
            </Row>
          )}
        </div>
      </div>

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
