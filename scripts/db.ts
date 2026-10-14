/**
 * `pnpm db <command>` — the one migration workflow: LOCAL → STAGING → (release) PRODUCTION.
 *
 * Local commands always pass `--local` to the Supabase CLI and refuse any
 * hosted-target flag, so a reset can never reach a hosted project. Staging
 * commands take the URL from the validated Staging env file (never a CLI
 * link), are read-only or dry-run by default, and refuse to write unless the
 * Staging schema matches the reviewed migration history and the project ref
 * is typed back. There are no Production commands: Production changes go
 * through docs/RELEASE.md with separately approved credentials.
 */
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { createInterface } from 'node:readline/promises'
import {
  CRM_ENVIRONMENTS,
  verifyEnvironment,
  formatProblems,
} from '../packages/config/src/environments.ts'
import {
  diffFingerprints,
  fingerprintQuery,
  formatFingerprint,
  fromRows,
  isIdentical,
  parseFingerprint,
  printDiff,
  type Fingerprint,
} from '../packages/db-tools/scripts/lib/fingerprint.ts'
import {
  CliError,
  ROOT,
  assertLocalArgs,
  cliDatabaseUrl,
  connect,
  dockerProblem,
  ensureLocalStack,
  linkedProjectRef,
  localStack,
  localValues,
  runPnpm,
  runSupabase,
  stagingSource,
} from './lib/cli.ts'

const MIGRATIONS_DIR = path.join(ROOT, 'supabase', 'migrations')
const CHECKS_DIR = path.join(ROOT, 'supabase', 'checks')
const STAGING_FINGERPRINT = path.join(ROOT, 'packages', 'db-tools', 'fingerprints', 'staging.txt')

const USAGE = `Usage: pnpm db <command>

Local (Docker; every Supabase CLI call uses --local)
  start                 Start the local Supabase stack (Postgres, Auth, Storage, Studio, Mailpit)
  stop [--purge]        Stop it (data kept; --purge deletes the local volumes)
  status                URLs of the running local stack (no keys)
  reset [--no-seed]     Recreate the local DB from supabase/migrations + seed.sql, then run checks
  migrate               Apply pending migrations to the local DB without resetting
  new <name>            Create supabase/migrations/<timestamp>_<name>.sql
  diff                  Show SQL for schema changes made directly in the local DB (app schema)
  check                 Run supabase/checks/*.sql against the local DB (rolled back)
  fingerprint           Compare the local app schema with the recorded Staging fingerprint
  verify                Docker-free: replay all migrations + seed + checks on PGlite (CI-safe)

Staging (${CRM_ENVIRONMENTS.staging.ref}; credentials from apps/platform/.env.staging.local)
  staging:status        Read-only: migration history + live schema fingerprint vs the repo
  staging:push          Dry run of pending migrations. --apply to apply after drift check + confirmation
  staging:adopt         One-time: record the already-present baseline history (no schema change)

Production: no commands. See docs/RELEASE.md.
`

// ─── local ────────────────────────────────────────────────────────────────────

function warnIfLinked() {
  const ref = linkedProjectRef()
  if (ref) {
    console.log(
      `  Note: this checkout is linked to ${ref}. pnpm db always passes --local; ` +
        'run `pnpm exec supabase unlink` to remove the link.\n'
    )
  }
}

function requireDocker() {
  const problem = dockerProblem()
  if (problem) {
    throw new CliError(
      `${problem}\nLocal Supabase needs Docker Desktop (docs/LOCAL_DEVELOPMENT.md → Prerequisites). ` +
        'Nothing falls back to a hosted project.\n' +
        'Without Docker you can still run `pnpm db verify` (PGlite replay).'
    )
  }
}

/** The local DB URL, verified as loopback-only before anything runs against it. */
async function localDatabaseUrl(): Promise<string> {
  const stack = localStack()
  if (!stack) throw new CliError('The local stack is not running. Start it with `pnpm db start`.')
  const result = verifyEnvironment(localValues(stack), 'local')
  if (!result.ok) throw new CliError(`Local stack failed verification:\n${formatProblems(result)}`)
  return stack.dbUrl
}

async function runChecks(databaseUrl: string): Promise<boolean> {
  const files = existsSync(CHECKS_DIR)
    ? readdirSync(CHECKS_DIR)
        .filter((f) => f.endsWith('.sql'))
        .sort()
    : []
  const sql = await connect(databaseUrl)
  let ok = true
  try {
    for (const f of files) {
      try {
        await sql.begin(async (tx) => {
          await tx.unsafe(readFileSync(path.join(CHECKS_DIR, f), 'utf8'))
          throw new RollbackSignal()
        })
      } catch (err) {
        if (err instanceof RollbackSignal) {
          console.log(`  passed   supabase/checks/${f}`)
        } else {
          ok = false
          console.log(`  FAILED   supabase/checks/${f}: ${(err as Error).message}`)
        }
      }
    }
  } finally {
    await sql.end({ timeout: 5 })
  }
  return ok
}

class RollbackSignal extends Error {}

async function fingerprintOf(
  databaseUrl: string,
  { readOnly }: { readOnly: boolean }
): Promise<Fingerprint> {
  const sql = await connect(databaseUrl)
  try {
    return await sql.begin(async (tx) => {
      if (readOnly) await tx.unsafe('set transaction read only')
      const rows = (await tx.unsafe(fingerprintQuery())) as {
        kind: string
        name: string
        hash: string
      }[]
      return fromRows(rows)
    })
  } finally {
    await sql.end({ timeout: 5 })
  }
}

function recordedStaging(): { fp: Fingerprint; through: string | null } {
  const text = readFileSync(STAGING_FINGERPRINT, 'utf8')
  return {
    fp: parseFingerprint(text),
    through: /^#\s*applied-through:\s*(\d{14})\s*$/m.exec(text)?.[1] ?? null,
  }
}

function migrationVersions(): string[] {
  return readdirSync(MIGRATIONS_DIR)
    .filter((f) => /^\d{14}_.+\.sql$/.test(f))
    .sort()
    .map((f) => f.slice(0, 14))
}

// ─── staging ──────────────────────────────────────────────────────────────────

function stagingDatabaseUrl(): string {
  const values = stagingSource()
  const result = verifyEnvironment(values, 'staging')
  if (!result.ok) {
    throw new CliError(
      `apps/platform/.env.staging.local failed Staging verification:\n${formatProblems(result)}`
    )
  }
  return values.DATABASE_URL!
}

async function confirm(phrase: string, prompt: string): Promise<boolean> {
  if (!process.stdin.isTTY) {
    console.log('  Refusing: confirmation needs an interactive terminal.')
    return false
  }
  const rl = createInterface({ input: process.stdin, output: process.stdout })
  try {
    return (await rl.question(`${prompt}\n  Type ${phrase} to continue: `)).trim() === phrase
  } finally {
    rl.close()
  }
}

/** Staging's live schema must equal the replay of the history it is recorded as having. */
async function assertNoStagingDrift(databaseUrl: string): Promise<void> {
  const live = await fingerprintOf(databaseUrl, { readOnly: true })
  const { fp: recorded } = recordedStaging()
  const diff = diffFingerprints(live, recorded)
  console.log(
    '  Live Staging schema vs recorded fingerprint (packages/db-tools/fingerprints/staging.txt):'
  )
  printDiff(diff, 'staging (live)', 'recorded')
  if (!isIdentical(diff)) {
    throw new CliError(
      'Staging has drifted from the reviewed migration history. Nothing was changed.\n' +
        'Reproduce the difference as a migration locally (or record why it exists) before pushing — ' +
        'see docs/MIGRATIONS.md → Drift.'
    )
  }
}

/** Versions recorded in Staging's supabase_migrations history (read-only; empty before adoption). */
async function stagingHistory(databaseUrl: string): Promise<string[]> {
  const sql = await connect(databaseUrl)
  try {
    return await sql.begin(async (tx) => {
      await tx.unsafe('set transaction read only')
      const [row] = (await tx.unsafe(
        "select to_regclass('supabase_migrations.schema_migrations') is not null as present"
      )) as { present: boolean }[]
      if (!row?.present) return []
      const rows = (await tx.unsafe(
        'select version from supabase_migrations.schema_migrations order by version'
      )) as { version: string }[]
      return rows.map((r) => r.version)
    })
  } finally {
    await sql.end({ timeout: 5 })
  }
}

/** Staging's recorded history must be exactly the repo's migrations up to applied-through. */
async function assertStagingHistory(databaseUrl: string): Promise<void> {
  const { through } = recordedStaging()
  const expected = migrationVersions().filter((v) => through && v <= through)
  const actual = await stagingHistory(databaseUrl)
  if (!actual.length) {
    throw new CliError(
      'Staging has no migration history yet. Run `pnpm db staging:adopt` once (docs/MIGRATIONS.md → Adoption).'
    )
  }
  const unknown = actual.filter((v) => !migrationVersions().includes(v))
  if (unknown.length || actual.join() !== expected.join()) {
    throw new CliError(
      `Staging history (${actual.join(', ')}) does not match the repo (${expected.join(', ')})` +
        (unknown.length
          ? `; versions missing from supabase/migrations: ${unknown.join(', ')}`
          : '') +
        '.\nNothing was changed. Reconcile the history before pushing (docs/MIGRATIONS.md → Drift).'
    )
  }
}

async function stagingStatus(): Promise<number> {
  const url = stagingDatabaseUrl()
  console.log(`Staging (${CRM_ENVIRONMENTS.staging.ref}) — read-only\n`)
  console.log('Migration history recorded on Staging (supabase_migrations.schema_migrations):')
  await runSupabase(['migration', 'list', '--db-url', cliDatabaseUrl(url)])
  console.log('')
  try {
    await assertNoStagingDrift(url)
  } catch (err) {
    if (!(err instanceof CliError)) throw err
    console.log(`\n  ${err.message}`)
    return 1
  }
  const { through } = recordedStaging()
  const pending = migrationVersions().filter((v) => !through || v > through)
  console.log(
    pending.length
      ? `\n  Pending for Staging: ${pending.join(', ')} — \`pnpm db staging:push\` for a dry run`
      : '\n  Staging is up to date with supabase/migrations.'
  )
  return 0
}

async function stagingPush(apply: boolean): Promise<number> {
  const url = stagingDatabaseUrl()
  const dbUrl = cliDatabaseUrl(url)
  console.log(`Staging (${CRM_ENVIRONMENTS.staging.ref}) — ${apply ? 'APPLY' : 'dry run'}\n`)
  await assertStagingHistory(url)
  await assertNoStagingDrift(url)

  if (!apply) {
    const code = await runSupabase(['db', 'push', '--db-url', dbUrl, '--dry-run'])
    console.log(
      '\n  Dry run only. Re-run with --apply after review (docs/MIGRATIONS.md → Promote to Staging).'
    )
    return code
  }

  console.log('  Pre-flight: fresh-install replay of every migration, seed and checks (PGlite)...')
  if ((await runPnpm(['db', 'verify'], process.env)) !== 0) {
    throw new CliError('Local verification failed — not pushing to Staging.')
  }
  const ok = await confirm(
    CRM_ENVIRONMENTS.staging.ref,
    '\n  This applies pending migrations to Staging. It never runs seed.sql and never resets.'
  )
  if (!ok) {
    console.log('  Not confirmed — nothing applied.')
    return 1
  }
  // Never --include-seed: seed.sql is for an empty local database only (and refuses otherwise).
  const code = await runSupabase(['db', 'push', '--db-url', dbUrl])
  if (code === 0) {
    const fp = await fingerprintOf(url, { readOnly: true })
    const latest = migrationVersions().at(-1)!
    writeStagingFingerprint(fp, latest)
    console.log(
      `\n  Applied. Recorded the new Staging fingerprint (applied-through ${latest}) — commit it.`
    )
  }
  return code
}

function writeStagingFingerprint(fp: Fingerprint, through: string) {
  const text = readFileSync(STAGING_FINGERPRINT, 'utf8')
  const header = text
    .split(/\r?\n/)
    .filter((l) => l.startsWith('#') && !/^#\s*applied-through:/.test(l))
    .join('\n')
  writeFileSync(
    STAGING_FINGERPRINT,
    `${header}\n# applied-through: ${through}\n${formatFingerprint(fp)}\n`
  )
}

async function stagingAdopt(): Promise<number> {
  const url = stagingDatabaseUrl()
  const { through } = recordedStaging()
  if (!through)
    throw new CliError('packages/db-tools/fingerprints/staging.txt has no applied-through version.')
  const versions = migrationVersions().filter((v) => v <= through)

  console.log(`Staging (${CRM_ENVIRONMENTS.staging.ref}) — adopt migration history\n`)
  const existing = await stagingHistory(url)
  if (existing.length) {
    throw new CliError(
      `Staging already has a migration history (${existing.join(', ')}). Adoption is one-time only.`
    )
  }
  console.log(
    '  Records these versions as already applied (writes only supabase_migrations metadata):'
  )
  for (const v of versions) console.log(`    ${v}`)
  await assertNoStagingDrift(url)

  const ok = await confirm(
    CRM_ENVIRONMENTS.staging.ref,
    '\n  Schema verified identical to the replay of those migrations. No schema or data is changed.'
  )
  if (!ok) {
    console.log('  Not confirmed — nothing recorded.')
    return 1
  }
  return runSupabase([
    'migration',
    'repair',
    '--status',
    'applied',
    ...versions,
    '--db-url',
    cliDatabaseUrl(url),
  ])
}

// ─── main ─────────────────────────────────────────────────────────────────────

async function main(argv: string[]): Promise<number> {
  const [command, ...rest] = argv
  if (!command || command === '--help' || command === '-h' || command === 'help') {
    console.log(USAGE)
    return command ? 0 : 1
  }

  switch (command) {
    case 'start':
      assertLocalArgs(rest)
      requireDocker()
      warnIfLinked()
      await ensureLocalStack()
      return runSupabase(['status'])
    case 'stop':
      assertLocalArgs(rest)
      return runSupabase(['stop', ...(rest.includes('--purge') ? ['--no-backup'] : [])])
    case 'status': {
      const stack = localStack()
      if (!stack) {
        console.log(dockerProblem() ?? 'Local stack is not running — `pnpm db start`.')
        return 1
      }
      console.log(
        `API     ${stack.apiUrl}\nDB      ${new URL(stack.dbUrl).host}\nStudio  ${stack.studioUrl ?? '?'}`
      )
      console.log(
        `Mail    ${stack.mailUrl ?? '?'}\nMCP     ${stack.mcpUrl ?? `${stack.apiUrl}/mcp (derived)`}`
      )
      return 0
    }
    case 'reset': {
      assertLocalArgs(rest)
      requireDocker()
      warnIfLinked()
      await localDatabaseUrl() // refuses unless the running stack verifies as local
      const code = await runSupabase([
        'db',
        'reset',
        '--local',
        ...(rest.includes('--no-seed') ? ['--no-seed'] : []),
      ])
      if (code !== 0 || rest.includes('--no-seed')) return code
      console.log('\nChecks:')
      return (await runChecks(await localDatabaseUrl())) ? 0 : 1
    }
    case 'migrate':
      assertLocalArgs(rest)
      requireDocker()
      await localDatabaseUrl()
      return runSupabase(['migration', 'up', '--local'])
    case 'new': {
      const name = rest[0]
      if (!name || !/^[a-z0-9_]+$/.test(name))
        throw new CliError('Usage: pnpm db new <snake_case_name>')
      return runSupabase(['migration', 'new', name])
    }
    case 'diff':
      assertLocalArgs(rest)
      requireDocker()
      await localDatabaseUrl()
      return runSupabase(['db', 'diff', '--local', '--schema', 'app'])
    case 'check': {
      const ok = await runChecks(await localDatabaseUrl())
      return ok ? 0 : 1
    }
    case 'fingerprint': {
      const local = await fingerprintOf(await localDatabaseUrl(), { readOnly: true })
      const { fp, through } = recordedStaging()
      console.log(`Local app schema vs recorded Staging (applied-through ${through ?? '?'}):`)
      printDiff(diffFingerprints(local, fp), 'local', 'staging')
      const pending = migrationVersions().filter((v) => through && v > through)
      if (pending.length)
        console.log(`  (expected while ${pending.join(', ')} are pending for Staging)`)
      return 0
    }
    case 'verify':
      return runPnpm(['--filter', '@roaring/db-tools', 'replay', '--seed'], process.env)
    case 'staging:status':
      return stagingStatus()
    case 'staging:push':
      return stagingPush(rest.includes('--apply'))
    case 'staging:adopt':
      return stagingAdopt()
    default:
      if (/prod/i.test(command)) {
        throw new CliError('There are no Production database commands. See docs/RELEASE.md.')
      }
      console.error(`Unknown command "${command}".\n`)
      console.error(USAGE)
      return 1
  }
}

main(process.argv.slice(2)).then(
  (code) => process.exit(code),
  (err) => {
    console.error(err instanceof CliError ? `\n  ✖ ${err.message}\n` : err)
    process.exit(1)
  }
)
