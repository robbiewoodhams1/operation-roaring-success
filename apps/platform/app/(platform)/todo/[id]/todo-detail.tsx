'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useOptimisticStatus } from '@/lib/hooks/use-optimistic-status'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Send, Trash2 } from 'lucide-react'
import { addTodoComment, deleteTodoComment, updateTodoStatus } from '../actions'
import type { Todo, TodoComment } from '@roaring/db'
import {
  TODO_STATUSES,
  TODO_STATUS_LABELS,
  TODO_STATUS_COLOURS,
  TODO_PRIORITY_LABELS,
  TODO_PRIORITY_COLOURS,
  TODO_LINK_TYPE_LABELS,
} from '@/lib/constants'

export function TodoDetail({
  todo,
  comments,
  userMap,
  currentUserId,
  allUsers,
}: {
  todo: Todo
  comments: TodoComment[]
  userMap: Record<string, string>
  currentUserId: string
  allUsers: { id: string; fullName: string }[]
}) {
  const router = useRouter()
  const [commentBody, setCommentBody] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const [optimisticStatus, applyStatusChange, isPending] = useOptimisticStatus(todo.status)

  function handleStatusChange(status: string) {
    applyStatusChange(status as typeof todo.status, () => updateTodoStatus(todo.id, status))
  }

  async function handleAddComment() {
    if (!commentBody.trim()) return
    setSubmitting(true)
    await addTodoComment(todo.id, commentBody.trim())
    setCommentBody('')
    setSubmitting(false)
    router.refresh()
  }

  async function handleDeleteComment(commentId: string) {
    await deleteTodoComment(commentId, todo.id)
    router.refresh()
  }

  return (
    <div className="space-y-6">
      {/* Details */}
      <div className="border rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b bg-muted/30">
          <h2 className="text-sm font-medium">Details</h2>
        </div>
        <div className="divide-y">
          <Row label="Status">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className={TODO_STATUS_COLOURS[optimisticStatus]}>
                {TODO_STATUS_LABELS[optimisticStatus]}
              </Badge>
              <Select
                value={optimisticStatus}
                onValueChange={(v) => v && handleStatusChange(v)}
                disabled={isPending}
              >
                <SelectTrigger className="h-7 w-36 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TODO_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {TODO_STATUS_LABELS[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {isPending && <span className="text-xs text-muted-foreground">Saving...</span>}
            </div>
          </Row>
          <Row label="Priority">
            <Badge variant="outline" className={TODO_PRIORITY_COLOURS[todo.priority]}>
              {TODO_PRIORITY_LABELS[todo.priority]}
            </Badge>
          </Row>
          <Row label="Title">
            <span className="text-sm">{todo.title}</span>
          </Row>
          {todo.description && (
            <Row label="Description">
              <span className="text-sm whitespace-pre-wrap">{todo.description}</span>
            </Row>
          )}
          <Row label="Assigned to">
            <span className="text-sm">{userMap[todo.assignedTo] ?? 'Unknown'}</span>
          </Row>
          {todo.assignedBy && (
            <Row label="Assigned by">
              <span className="text-sm">{userMap[todo.assignedBy] ?? 'Unknown'}</span>
            </Row>
          )}
          {todo.linkLabel && (
            <Row label="Linked to">
              <span className="text-sm">
                {todo.linkType ? `${TODO_LINK_TYPE_LABELS[todo.linkType]}: ` : ''}
                {todo.linkLabel}
              </span>
            </Row>
          )}
          <Row label="Created">
            <span className="text-sm">{new Date(todo.createdAt).toLocaleString('en-GB')}</span>
          </Row>
          <Row label="Updated">
            <span className="text-sm">{new Date(todo.updatedAt).toLocaleString('en-GB')}</span>
          </Row>
        </div>
      </div>

      {/* Comments */}
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
              disabled={submitting || !commentBody.trim()}
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
    <div className="flex px-4 py-3 items-start gap-4">
      <span className="text-muted-foreground w-32 shrink-0 text-sm pt-0.5">{label}</span>
      <div className="text-sm flex-1">{children}</div>
    </div>
  )
}
