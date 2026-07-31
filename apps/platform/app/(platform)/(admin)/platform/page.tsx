import { requireRole } from '@roaring/auth/server'
import { getSettings } from '@/lib/settings'
import { SettingsForm } from './settings-form'

export default async function PlatformSettingsPage() {
  await requireRole('admin')

  const settings = await getSettings()

  return (
    <div className="p-6 w-full">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold">Platform</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Settings that apply across the platform. Saved changes take effect immediately.
        </p>
      </div>

      <SettingsForm initial={settings} />
    </div>
  )
}
