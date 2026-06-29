import { requireUser } from '@roaring/auth/server'
import { db, todos, todoComments, users } from '@roaring/db'
import { eq, asc } from 'drizzle-orm'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { TodoDetail } from './todo-detail'
import {
  TODO_STATUS_COLOURS,
  TODO_STATUS_LABELS,
  TODO_PRIORITY_COLOURS,
  TODO_PRIORITY_LABELS,
} from '@/lib/constants'

export default async function TodoDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await requireUser()

  const todoResult = await db.select().from(todos).where(eq(todos.id, id)).limit(1)
  const todo = todoResult[0]
  if (!todo || todo.tenantId !== user.tenantId) notFound()

  const [comments, allUsers] = await Promise.all([
    db
      .select()
      .from(todoComments)
      .where(eq(todoComments.todoId, id))
      .orderBy(asc(todoComments.createdAt)),
    db
      .select({ id: users.id, fullName: users.fullName })
      .from(users)
      .where(eq(users.tenantId, user.tenantId)),
  ])

  const userMap = Object.fromEntries(allUsers.map((u) => [u.id, u.fullName]))

  return (
    <div className="p-6 max-w-3xl">
      <div className="flex items-center gap-4 mb-8">
        <Link href="/todo">
          <ArrowLeft className="size-4" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold">{todo.title}</h1>
            <Badge variant="outline" className={TODO_STATUS_COLOURS[todo.status]}>
              {TODO_STATUS_LABELS[todo.status]}
            </Badge>
            <Badge variant="outline" className={TODO_PRIORITY_COLOURS[todo.priority]}>
              {TODO_PRIORITY_LABELS[todo.priority]}
            </Badge>
          </div>
          <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
            <span>Assigned to {userMap[todo.assignedTo] ?? 'Unknown'}</span>
            {todo.assignedBy && <span>by {userMap[todo.assignedBy] ?? 'Unknown'}</span>}
            <span>Created {new Date(todo.createdAt).toLocaleDateString('en-GB')}</span>
          </div>
        </div>
      </div>

      <TodoDetail
        todo={todo}
        comments={comments}
        userMap={userMap}
        currentUserId={user.id}
        allUsers={allUsers}
      />
    </div>
  )
}
