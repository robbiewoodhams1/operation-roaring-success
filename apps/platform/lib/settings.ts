import { db, platformSettings } from '@roaring/db'
import { cachedQuery } from '@/lib/cached-query'
import { config as defaults, type AppConfig } from '@/lib/config'

/** Cache tag for the settings row — revalidate this after saving. */
export const SETTINGS_TAG = 'platform-settings'

type Plain = Record<string, unknown>

const isPlainObject = (v: unknown): v is Plain =>
  typeof v === 'object' && v !== null && !Array.isArray(v)

/**
 * Overlay stored settings on the defaults. Only keys present in the override
 * win, so a key added to app.config.json later still shows up without needing
 * the stored row to be rewritten.
 */
function deepMerge<T>(base: T, override: unknown): T {
  if (!isPlainObject(base) || !isPlainObject(override)) return base

  const result: Plain = { ...base }
  for (const [key, value] of Object.entries(override)) {
    if (!(key in result)) continue // ignore stored keys the config no longer has
    if (value === undefined || value === null) continue
    result[key] = isPlainObject(result[key]) ? deepMerge(result[key], value) : value
  }
  return result as T
}

/**
 * Resolved app settings: the JSON defaults with any dashboard edits applied.
 *
 * Falls back to the bare defaults if the table is missing or the database is
 * unreachable, so the app still renders before the migration has been run.
 */
export async function getSettings(): Promise<AppConfig> {
  try {
    const rows = await cachedQuery([SETTINGS_TAG], [SETTINGS_TAG], () =>
      db.select({ settings: platformSettings.settings }).from(platformSettings).limit(1)
    )
    return deepMerge(defaults, rows[0]?.settings)
  } catch {
    return defaults
  }
}
