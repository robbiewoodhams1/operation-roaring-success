'use server'

import { db, platformSettings } from '@roaring/db'
import { requireRole } from '@roaring/auth'
import { revalidatePath, revalidateTag } from 'next/cache'
import { z } from 'zod'
import { SETTINGS_TAG } from '@/lib/settings'

const trimmed = (label: string, max = 200) =>
  z
    .string()
    .trim()
    .min(1, `${label} is required.`)
    .max(max, `${label} must be ${max} characters or fewer.`)

const supportSchema = z.object({
  businessName: trimmed('Business name'),
  phone: trimmed('Phone number', 32),
  email: z.string().trim().email('Enter a valid email address.'),
})

// Not exported — a "use server" file may only export async functions.
const settingsSchema = z.object({
  app: z.object({
    name: trimmed('App name', 60),
    title: trimmed('Browser title', 120),
    description: trimmed('Description', 300),
    loginTagline: trimmed('Login tagline', 120),
  }),
  support: z.object({
    residential: supportSchema,
    business: supportSchema,
  }),
  accountNumber: z.object({
    prefix: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z]{1,10}$/, 'Prefix must be 1–10 letters.'),
    startNumber: z.coerce
      .number()
      .int('Start number must be a whole number.')
      .min(1, 'Start number must be at least 1.'),
  }),
  ui: z.object({
    pageSize: z.coerce
      .number()
      .int('Page size must be a whole number.')
      .min(5, 'Page size must be at least 5.')
      .max(500, 'Page size must be 500 or fewer.'),
  }),
})

type SettingsInput = z.input<typeof settingsSchema>

export async function updatePlatformSettings(input: SettingsInput) {
  // Admin only — the write policy is enforced in the database too.
  const user = await requireRole('admin')

  const parsed = settingsSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Those settings are not valid.' }
  }

  try {
    await db
      .insert(platformSettings)
      .values({ id: true, settings: parsed.data, updatedBy: user.id })
      .onConflictDoUpdate({
        target: platformSettings.id,
        set: { settings: parsed.data, updatedBy: user.id, updatedAt: new Date() },
      })
  } catch {
    return {
      error:
        'Could not save. If this is the first time, run the platform_settings migration in Supabase.',
    }
  }

  revalidateTag(SETTINGS_TAG, 'max')
  // Branding renders from the root layout, so refresh every route.
  revalidatePath('/', 'layout')

  return { success: true as const }
}
