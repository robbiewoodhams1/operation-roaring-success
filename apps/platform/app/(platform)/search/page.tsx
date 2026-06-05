import { requireUser } from '@roaring/auth/server'
import { SearchClient } from './search-client'

export default async function SearchPage() {
  const user = await requireUser()
  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Search</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Search across customers, deals and provisioning
        </p>
      </div>
      <SearchClient tenantId={user.tenantId} />
    </div>
  )
}
