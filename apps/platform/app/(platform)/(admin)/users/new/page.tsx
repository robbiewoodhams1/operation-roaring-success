import { requireRole } from '@roaring/auth/server'
import { InviteUserForm } from './invite-form'

export default async function InviteUserPage() {
  await requireRole('admin')

  return (
    <div className="p-8 max-w-lg mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold">Invite user</h1>
        <p className="text-sm text-muted-foreground mt-1">
          They&apos;ll receive an email to set up their account
        </p>
      </div>
      <InviteUserForm />
    </div>
  )
}
