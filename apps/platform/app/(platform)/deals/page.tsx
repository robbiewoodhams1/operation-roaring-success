import { requireUser } from '@roaring/auth/server'
import { SignOutButton } from '@roaring/ui'

export default async function DealsPage() {
  const user = await requireUser()

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-semibold mb-6">Deals</h1>
      <div className="border rounded-lg divide-y">
        <div className="flex px-4 py-3">
          <span className="text-muted-foreground w-36 shrink-0">Name</span>
          <span className="font-medium">{user.fullName}</span>
        </div>
        <div className="flex px-4 py-3">
          <span className="text-muted-foreground w-36 shrink-0">Email</span>
          <span>{user.email}</span>
        </div>
        <div className="flex px-4 py-3">
          <span className="text-muted-foreground w-36 shrink-0">Role</span>
          <span className="capitalize">{user.role.replace('_', ' ')}</span>
        </div>
        <div className="flex px-4 py-3">
          <span className="text-muted-foreground w-36 shrink-0">Tenant ID</span>
          <span className="text-sm font-mono text-muted-foreground">{user.tenantId}</span>
        </div>
        <div className="flex px-4 py-3">
          <span className="text-muted-foreground w-36 shrink-0">Status</span>
          <span className="capitalize">{user.approvalStatus}</span>
        </div>
        <div className="flex px-4 py-3">
          <SignOutButton className="cursor-pointer" />
        </div>
      </div>
    </div>
  )
}
