import { requireUser } from '@roaring/auth/server'
import { db, todos, todoComments, users } from '@roaring/db'
import { eq, asc } from 'drizzle-orm'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { cachedQuery } from '@/lib/cached-query'
import { getChangeHistory } from '@/lib/change-history'
import { ChangeHistory } from '@/components/change-history'
import { TodoDetail } from './todo-detail'
import {
  TODO_STATUS_COLOURS,
  TODO_STATUS_LABELS,
  TODO_PRIORITY_COLOURS,
  TODO_PRIORITY_LABELS,
} from '@/lib/constants'

const getCachedTodo = (tenantId: string, id: string) =>
  cachedQuery([`todo-${id}`], [`todos-${tenantId}`], () =>
    db.select().from(todos).where(eq(todos.id, id)).limit(1)
  )

const getCachedTodoComments = (tenantId: string, id: string) =>
  cachedQuery([`todo-comments-${id}`], [`todos-${tenantId}`], () =>
    db
      .select()
      .from(todoComments)
      .where(eq(todoComments.todoId, id))
      .orderBy(asc(todoComments.createdAt))
  )

const getCachedTodoDetailUsers = (tenantId: string) =>
  cachedQuery([`users-${tenantId}`], [`users-${tenantId}`], () =>
    db
      .select({ id: users.id, fullName: users.fullName })
      .from(users)
      .where(eq(users.tenantId, tenantId))
  )

export default async function TodoDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await requireUser()

  const todoResult = await getCachedTodo(user.tenantId, id)
  const todo = todoResult[0]
  if (!todo || todo.tenantId !== user.tenantId) notFound()

  const [comments, allUsers] = await Promise.all([
    getCachedTodoComments(user.tenantId, id),
    getCachedTodoDetailUsers(user.tenantId),
  ])

  const userMap = Object.fromEntries(allUsers.map((u) => [u.id, u.fullName]))

  const { logs, userNames } = await getChangeHistory([
    { table: 'todos', ids: [todo.id] },
    { table: 'todo_comments', parentField: 'todo_id', parentId: todo.id },
  ])

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

      <div className="mt-6">
        <ChangeHistory
          logs={logs}
          userNames={userNames}
          tableLabels={{ todos: 'Todo', todo_comments: 'Comment' }}
        />
      </div>
    </div>
  )
}
