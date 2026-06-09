import { requireUser } from '@roaring/auth/server'
import { SignOutButton } from '@roaring/ui'
import { AccountClient } from './account-client'

export default async function AccountPage() {
  const user = await requireUser()

  return (
    <div className="p-6 w-full mx-auto">
      <h1 className="text-2xl font-semibold mb-6">Account</h1>
      <div className="border rounded-lg divide-y">
        <AccountClient userId={user.id} fullName={user.fullName} />
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
      </div>
    </div>
  )
}
