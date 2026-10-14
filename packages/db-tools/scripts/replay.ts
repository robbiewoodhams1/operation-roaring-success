/**
 * `pnpm db:replay` — fresh-install migration replay without Docker.
 *
 * Applies supabase/migrations/*.sql in version order to a brand-new, in-process
 * Postgres 17 (PGlite) behind a minimal Supabase shim, optionally loads
 * supabase/seed.sql and the SQL checks in supabase/checks/, then fingerprints the
 * resulting `app` schema and compares it with the recorded Staging fingerprint
 * (replaying only up to the version Staging is recorded as having).
 *
 *   pnpm db:replay                 replay + compare with Staging
 *   pnpm db:replay --seed          also load seed.sql and run supabase/checks/*.sql
 *
 * Nothing here connects to any server. It complements, and never replaces,
 * `pnpm db:reset` on the real local Supabase stack.
 */
import { PGlite } from '@electric-sql/pglite'
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { parseArgs } from 'node:util'
import {
  FINGERPRINT_DIR,
  MIGRATIONS_DIR,
  ROOT,
  diffFingerprints,
  fingerprintQuery,
  fromRows,
  isIdentical,
  parseFingerprint,
  printDiff,
} from './lib/fingerprint.ts'

const SHIM = path.join(import.meta.dirname, 'lib', 'supabase-shim.sql')
const SEED = path.join(ROOT, 'supabase', 'seed.sql')
const TESTS_DIR = path.join(ROOT, 'supabase', 'checks')

export interface Migration {
  version: string
  name: string
  file: string
}

export function listMigrations(): Migration[] {
  return readdirSync(MIGRATIONS_DIR)
    .filter((f) => /^\d{14}_.+\.sql$/.test(f))
    .sort()
    .map((f) => ({
      version: f.slice(0, 14),
      name: f.slice(15, -4),
      file: path.join(MIGRATIONS_DIR, f),
    }))
}

/** Reads `# applied-through: <version>` from a recorded fingerprint. */
function appliedThrough(text: string): string | null {
  return /^#\s*applied-through:\s*(\d{14})\s*$/m.exec(text)?.[1] ?? null
}

async function exec(db: PGlite, label: string, sql: string) {
  try {
    await db.exec(sql)
  } catch (err) {
    throw new Error(`${label} failed: ${(err as Error).message}`)
  }
}

async function main() {
  const { values } = parseArgs({ options: { seed: { type: 'boolean' } }, strict: true })

  const stagingFile = path.join(FINGERPRINT_DIR, 'staging.txt')
  const stagingText = existsSync(stagingFile) ? readFileSync(stagingFile, 'utf8') : null
  const through = stagingText ? appliedThrough(stagingText) : null
  const migrations = listMigrations()

  const db = await PGlite.create({ extensions: { pgcrypto } })
  try {
    await exec(db, 'Supabase shim', readFileSync(SHIM, 'utf8'))

    let compared = false
    const compare = async () => {
      compared = true
      if (!stagingText) return true
      const { rows } = await db.query<{ kind: string; name: string; hash: string }>(
        fingerprintQuery()
      )
      const diff = diffFingerprints(fromRows(rows), parseFingerprint(stagingText))
      console.log(
        `\nSchema after replay through ${through ?? 'latest'} vs recorded Staging fingerprint:`
      )
      printDiff(diff, 'replay', 'staging')
      return isIdentical(diff)
    }

    console.log(`Replaying ${migrations.length} migration(s) on a fresh Postgres 17 (PGlite):`)
    let matches = true
    for (const m of migrations) {
      // Each file is atomic, as it is under the Supabase CLI.
      await exec(db, m.version, `begin;\n${readFileSync(m.file, 'utf8')}\ncommit;`)
      console.log(`  applied  ${m.version}  ${m.name}`)
      if (m.version === through) matches = await compare()
    }
    if (!compared) matches = await compare()
    const pending = through ? migrations.filter((m) => m.version > through) : []
    if (pending.length) {
      console.log(`\nNot yet recorded on Staging (pending review):`)
      for (const m of pending) console.log(`  ${m.version}  ${m.name}`)
    }

    if (values.seed) {
      await exec(db, 'seed.sql', readFileSync(SEED, 'utf8'))
      console.log('\nLoaded supabase/seed.sql')
      const tests = existsSync(TESTS_DIR)
        ? readdirSync(TESTS_DIR)
            .filter((f) => f.endsWith('.sql'))
            .sort()
        : []
      for (const t of tests) {
        // Checks raise an exception on failure and roll back their own writes.
        await exec(
          db,
          `supabase/checks/${t}`,
          `begin;\n${readFileSync(path.join(TESTS_DIR, t), 'utf8')}\nrollback;`
        )
        console.log(`  passed   supabase/checks/${t}`)
      }
    }

    if (!matches) {
      console.error('\nReplay does NOT reproduce the recorded Staging schema.')
      process.exitCode = 1
    } else {
      console.log('\nReplay OK.')
    }
  } finally {
    await db.close()
  }
}

main().catch((err) => {
  console.error(`\n  ✖ ${(err as Error).message}\n`)
  process.exit(1)
})
