import { requireUser } from '@roaring/auth/server'

export default async function TargetsPage() {
  const user = await requireUser()

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold">Targets</h1>
          <p className="text-sm text-muted-foreground mt-1">v1.0.0</p>
        </div>
      </div>
    </div>
  )
}
