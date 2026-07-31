'use client'

import { useState } from 'react'
import { AlertCircle, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { AppConfig } from '@/lib/config'
import { updatePlatformSettings } from './actions'

function Field({
  label,
  hint,
  value,
  onChange,
  type = 'text',
}: {
  label: string
  hint?: string
  value: string
  onChange: (v: string) => void
  type?: string
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium">{label}</Label>
      <Input type={type} value={value} onChange={(e) => onChange(e.target.value)} />
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  )
}

export function SettingsForm({ initial }: { initial: AppConfig }) {
  const [form, setForm] = useState(initial)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)

  // Typed setters for each nested group, so edits stay immutable.
  const setApp = (patch: Partial<AppConfig['app']>) => {
    setForm((f) => ({ ...f, app: { ...f.app, ...patch } }))
    setSaved(false)
  }
  const setSupport = (
    kind: 'residential' | 'business',
    patch: Partial<AppConfig['support']['residential']>
  ) => {
    setForm((f) => ({ ...f, support: { ...f.support, [kind]: { ...f.support[kind], ...patch } } }))
    setSaved(false)
  }
  const setAccount = (patch: Partial<AppConfig['accountNumber']>) => {
    setForm((f) => ({ ...f, accountNumber: { ...f.accountNumber, ...patch } }))
    setSaved(false)
  }
  const setUi = (patch: Partial<AppConfig['ui']>) => {
    setForm((f) => ({ ...f, ui: { ...f.ui, ...patch } }))
    setSaved(false)
  }

  const handleSave = async () => {
    if (saving) return
    setSaving(true)
    setError('')
    setSaved(false)

    const result = await updatePlatformSettings(form)

    if (result?.error) setError(result.error)
    else setSaved(true)
    setSaving(false)
  }

  return (
    <div className="space-y-4 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Branding</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Field
            label="App name"
            hint="Shown in the sidebar and on the sign-in pages."
            value={form.app.name}
            onChange={(v) => setApp({ name: v })}
          />
          <Field
            label="Version"
            hint="Displayed under the app name in the sidebar."
            value={form.app.version}
            onChange={(v) => setApp({ version: v })}
          />
          <Field
            label="Browser title"
            value={form.app.title}
            onChange={(v) => setApp({ title: v })}
          />
          <Field
            label="Description"
            hint="Used as the page meta description."
            value={form.app.description}
            onChange={(v) => setApp({ description: v })}
          />
          <Field
            label="Sign-in tagline"
            value={form.app.loginTagline}
            onChange={(v) => setApp({ loginTagline: v })}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Support contacts</CardTitle>
          <p className="text-xs text-muted-foreground">
            Copied from the quick-provision panel, chosen by customer type.
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {(['business', 'residential'] as const).map((kind) => (
            <div key={kind} className="space-y-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {kind}
              </p>
              <Field
                label="Business name"
                value={form.support[kind].businessName}
                onChange={(v) => setSupport(kind, { businessName: v })}
              />
              <Field
                label="Phone number"
                value={form.support[kind].phone}
                onChange={(v) => setSupport(kind, { phone: v })}
              />
              <Field
                label="Support email"
                type="email"
                value={form.support[kind].email}
                onChange={(v) => setSupport(kind, { email: v })}
              />
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Account numbers</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Field
            label="Prefix"
            hint="Letters in front of generated account numbers, e.g. DFB in DFB20001."
            value={form.accountNumber.prefix}
            onChange={(v) => setAccount({ prefix: v.toUpperCase() })}
          />
          <Field
            label="Starting number"
            type="number"
            hint="Only used before any account numbers exist. Changing it will not renumber existing customers."
            value={String(form.accountNumber.startNumber)}
            onChange={(v) => setAccount({ startNumber: Number(v) })}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Tables</CardTitle>
        </CardHeader>
        <CardContent>
          <Field
            label="Rows per page"
            type="number"
            hint="Applies to every list view."
            value={String(form.ui.pageSize)}
            onChange={(v) => setUi({ pageSize: Number(v) })}
          />
        </CardContent>
      </Card>

      {error && (
        <Card className="border-destructive bg-destructive/5">
          <CardContent className="pt-4 flex items-start gap-3">
            <AlertCircle className="size-4 text-destructive mt-0.5 shrink-0" />
            <p className="text-sm font-medium text-destructive">{error}</p>
          </CardContent>
        </Card>
      )}

      <div className="flex items-center gap-3">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : 'Save changes'}
        </Button>
        {saved && (
          <span className="text-sm text-green-700 flex items-center gap-1.5">
            <Check className="size-4" />
            Saved
          </span>
        )}
      </div>
    </div>
  )
}
