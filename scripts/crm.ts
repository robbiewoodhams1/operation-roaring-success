/**
 * `pnpm crm` — environment-aware entry point for the CRM.
 *
 *   pnpm crm --local            Start local Supabase (Docker) if needed and run the platform on it.
 *   pnpm crm --dev              Alias for --local.
 *   pnpm crm --staging          Run the platform against hosted Staging.
 *   pnpm crm --local --test     Run the database integration tests against Local.
 *   pnpm crm --staging --test   Run them against Staging (every test rolls back).
 *   pnpm crm --local --build    `next build` against Local (also --staging --build).
 *   pnpm crm --prod --credentials <file>
 *                               Production build + validation. Never starts a server,
 *                               opens a database session, runs migrations or deploys.
 *   pnpm crm --status           Show all three environments (no secrets).
 *
 * Credentials come from exactly one source per environment, are validated,
 * and are injected into the child process environment — which Next.js gives
 * precedence over every .env file — so nothing is copied around on disk.
 */
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { parseArgs } from 'node:util'
import {
  CRM_ENVIRONMENTS,
  GUARDED_ENV_KEYS,
  type CrmEnvironment,
  type EnvCheck,
  verifyEnvironment,
} from '../packages/config/src/environments.ts'
import {
  CliError,
  HOSTED_ONLY_KEYS,
  LEGACY_DEV_ENV_FILE,
  PLATFORM_DIR,
  ROOT,
  SHADOW_FILES,
  STAGING_ENV_FILE,
  type Values,
  assertNoShadowing,
  childEnv,
  connect,
  dockerProblem,
  ensureLocalStack,
  findShadowing,
  isGitIgnored,
  isInsideRepo,
  linkedProjectRef,
  localStack,
  localValues,
  readEnvFile,
  runPnpm,
  stagingSource,
} from './lib/cli.ts'

const USAGE = `Usage: pnpm crm <command>

  --local                      Start local Supabase in Docker if needed and run the platform on it
  --dev                        Alias for --local
  --staging                    Run the platform on hosted Staging (${CRM_ENVIRONMENTS.staging.ref})
                               from apps/platform/.env.staging.local
  --local --test               Run DB integration tests against Local
  --staging --test             Run DB integration tests against Staging (each test rolls back)
  --local|--staging --build    \`next build\` of the platform against that environment
  --prod --credentials <file>  Production build + validation from an explicit, git-ignored
                               env file (or shell variables with CRM_ENV=production).
                               Never starts a server, opens a DB session, migrates or deploys.
  --status                     Show all three environments' configuration (no secrets)

  Database commands (migrations, reset, seed): pnpm db --help
`

// ─── output ───────────────────────────────────────────────────────────────────

const LABEL: Record<EnvCheck['status'], string> = {
  pass: 'PASS',
  fail: 'FAIL',
  'offline-unverifiable': 'ONLINE-ONLY',
}

function printChecks(checks: EnvCheck[]) {
  const width = Math.max(...checks.map((c) => c.name.length))
  for (const c of checks) {
    console.log(`    [${LABEL[c.status].padEnd(11)}] ${c.name.padEnd(width)}  ${c.detail}`)
  }
}

function heading(text: string) {
  console.log(`\n${text}\n${'─'.repeat(text.length)}`)
}

// ─── sources ──────────────────────────────────────────────────────────────────

function prodSource(credentialsFile: string | undefined): { values: Values; origin: string } {
  if (credentialsFile) {
    const file = path.resolve(credentialsFile)
    if (!existsSync(file)) throw new CliError(`Production env file not found: ${file}`)
    if (isInsideRepo(file) && !isGitIgnored(file)) {
      throw new CliError(
        `${path.relative(ROOT, file)} is inside the repo and not git-ignored — refusing to use it.`
      )
    }
    if (path.dirname(file) === PLATFORM_DIR) {
      throw new CliError(
        'Production credentials must live outside apps/platform (where development files are kept).'
      )
    }
    return { values: readEnvFile(file), origin: file }
  }
  if (process.env.CRM_ENV === 'production') {
    return { values: { ...process.env }, origin: 'shell environment' }
  }
  throw new CliError(
    'No production configuration provided. Production credentials are never read implicitly.\n' +
      'Pass an approved, git-ignored env file:  pnpm crm --prod --credentials <path>\n' +
      'or export the variables (including CRM_ENV=production) in the shell first.'
  )
}

// ─── verification ─────────────────────────────────────────────────────────────

/** The API gateway rejects keys issued for another project, so this proves the key's project. No data is read. */
async function checkKeyOnline(name: string, url: string, key: string): Promise<EnvCheck> {
  try {
    const res = await fetch(`${url.replace(/\/$/, '')}/auth/v1/settings`, {
      headers: { apikey: key },
      signal: AbortSignal.timeout(10_000),
    })
    return res.ok
      ? { name, status: 'pass', detail: 'accepted by the API' }
      : {
          name,
          status: 'fail',
          detail: `rejected by the API (HTTP ${res.status}) — wrong project or revoked`,
        }
  } catch (err) {
    return { name, status: 'fail', detail: `could not reach the API: ${(err as Error).message}` }
  }
}

async function checkDatabaseOnline(databaseUrl: string): Promise<EnvCheck> {
  const name = 'DATABASE_URL (connect)'
  const sql = await connect(databaseUrl)
  try {
    const [row] = await sql.unsafe('select current_database() as db')
    return { name, status: 'pass', detail: `connected (database "${row!.db}")` }
  } catch (err) {
    return { name, status: 'fail', detail: `connection failed: ${(err as Error).message}` }
  } finally {
    await sql.end({ timeout: 5 }).catch(() => {})
  }
}

async function verify(
  environment: CrmEnvironment,
  values: Values,
  { database }: { database: boolean }
): Promise<Values> {
  const offline = verifyEnvironment(values, environment)
  console.log('  Offline checks:')
  printChecks(offline.checks)
  if (!offline.ok)
    throw new CliError(`${CRM_ENVIRONMENTS[environment].label} configuration failed verification.`)

  const url = values.NEXT_PUBLIC_SUPABASE_URL!
  const online = await Promise.all([
    checkKeyOnline(
      'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
      url,
      values.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
    ),
    checkKeyOnline('SUPABASE_SERVICE_ROLE_KEY', url, values.SUPABASE_SERVICE_ROLE_KEY!),
    ...(database ? [checkDatabaseOnline(values.DATABASE_URL!)] : []),
  ])
  console.log('  Online checks:')
  printChecks(online)
  if (online.some((c) => c.status === 'fail')) {
    throw new CliError(
      `${CRM_ENVIRONMENTS[environment].label} credentials failed online verification.`
    )
  }
  return values
}

// ─── commands ─────────────────────────────────────────────────────────────────

type Mode = 'dev' | 'test' | 'build'

/** What a verified environment runs: the dev server, the DB integration tests, or a build. */
const SCRIPT: Record<Mode, string> = { dev: 'dev', test: 'test:integration', build: 'build' }

function target(mode: Mode): string[] {
  return ['--filter', '@roaring/platform', SCRIPT[mode]]
}

function announce(mode: Mode, label: string): string {
  if (mode === 'test')
    return `\n  Verified. Running database integration tests against ${label}...\n`
  if (mode === 'build')
    return `\n  Verified. Running \`next build\` for @roaring/platform against ${label}...\n`
  return `\n  Verified. Starting platform on ${label} — http://localhost:3000\n`
}

async function runLocal(mode: Mode): Promise<number> {
  heading('CRM — Local (Docker)')
  assertNoShadowing()
  const stack = await ensureLocalStack()
  const values = await verify('local', localValues(stack), { database: true })
  console.log(announce(mode, 'Local'))
  if (mode === 'dev' && stack.studioUrl) console.log(`  Studio ${stack.studioUrl}\n`)
  return runPnpm(target(mode), childEnv(values, HOSTED_ONLY_KEYS))
}

async function runStaging(mode: Mode): Promise<number> {
  const { ref, label } = CRM_ENVIRONMENTS.staging
  heading(`CRM — ${label} (${ref})`)
  console.log(`  Source: ${path.relative(ROOT, STAGING_ENV_FILE)}`)
  assertNoShadowing()
  const values = await verify('staging', stagingSource(), { database: true })
  console.log(announce(mode, mode === 'test' ? `${label} (each test rolls back)` : label))
  return runPnpm(target(mode), childEnv(values))
}

async function runProd(credentialsFile: string | undefined): Promise<number> {
  const { ref, label } = CRM_ENVIRONMENTS.production
  heading(`CRM — ${label} build & validation (${ref})`)
  console.log('  No server is started, nothing is deployed, and no migrations run.')
  const { values, origin } = prodSource(credentialsFile)
  console.log(`  Source: ${origin}`)
  assertNoShadowing()
  // No database connection here: the CLI never opens a session to production.
  const verified = await verify('production', values, { database: false })

  console.log('\n  Verified. Running `next build` for @roaring/platform...\n')
  const code = await runPnpm(['--filter', '@roaring/platform', 'build'], childEnv(verified))
  console.log(
    code === 0 ? '\n  Production build succeeded.' : `\n  Production build FAILED (exit ${code}).`
  )
  return code
}

function runStatus(): number {
  heading('CRM environment status')

  console.log('\n  Local        (Supabase CLI in Docker)')
  const docker = dockerProblem()
  if (docker) {
    console.log(`    Docker: ${docker}`)
  } else {
    const stack = localStack()
    if (!stack) {
      console.log('    Docker running; local stack stopped — `pnpm db:start` or `pnpm crm --local`')
    } else {
      const result = verifyEnvironment(localValues(stack), 'local')
      printChecks(result.checks)
      console.log(
        `    API ${stack.apiUrl}   Studio ${stack.studioUrl ?? '?'}   Mail ${stack.mailUrl ?? '?'}`
      )
      console.log(`    MCP ${stack.mcpUrl ?? `${stack.apiUrl.replace(/\/$/, '')}/mcp (derived)`}`)
    }
  }

  console.log(`\n  Staging      (${CRM_ENVIRONMENTS.staging.ref})`)
  const stagingRel = path.relative(ROOT, STAGING_ENV_FILE)
  if (!existsSync(STAGING_ENV_FILE)) {
    console.log(`    ${stagingRel}: not found — copy apps/platform/.env.example`)
  } else {
    console.log(
      `    ${stagingRel}: present, ${isGitIgnored(STAGING_ENV_FILE) ? 'git-ignored' : 'NOT git-ignored'}`
    )
    const result = verifyEnvironment(readEnvFile(STAGING_ENV_FILE), 'staging')
    printChecks(result.checks)
    console.log(
      `    Offline validation: ${result.ok ? 'OK (keys verified online by --staging)' : 'FAILED'}`
    )
  }

  console.log(`\n  Production   (${CRM_ENVIRONMENTS.production.ref})`)
  console.log('    Runtime secrets: Vercel → Production environment only (never downloaded)')
  console.log('    Development tooling: no Production credentials, MCP or migration target exists')
  if (process.env.CRM_ENV === 'production') {
    const result = verifyEnvironment(process.env, 'production')
    console.log('    Shell environment declares CRM_ENV=production:')
    printChecks(result.checks)
  }

  console.log('\n  Shadowing .env files in apps/platform')
  const shadowing = findShadowing()
  if (!shadowing.length) console.log('    none — the selected environment cannot be overridden')
  for (const s of shadowing) console.log(`    BLOCKING  ${s.file}: ${s.keys.join(', ')}`)
  if (shadowing.some((s) => path.join(ROOT, s.file) === LEGACY_DEV_ENV_FILE)) {
    console.log('    → move it to apps/platform/.env.staging.local and set CRM_ENV=staging')
  }
  console.log(`    (checked: ${SHADOW_FILES.join(', ')})`)

  const shellKeys = GUARDED_ENV_KEYS.filter((k) => process.env[k])
  if (shellKeys.length) {
    console.log(
      `    Note: shell defines ${shellKeys.join(', ')} — always replaced from the selected source`
    )
  }

  const linked = linkedProjectRef()
  console.log('\n  Supabase CLI link')
  console.log(
    linked
      ? `    WARNING: supabase/.temp/project-ref links this checkout to ${linked}. pnpm db never uses --linked, ` +
          'but a raw `supabase ... --linked` would. Remove the link: `pnpm exec supabase unlink`.'
      : '    not linked — hosted projects are only reached through validated --db-url commands'
  )

  console.log('\n  MCP servers (.mcp.json)')
  for (const line of describeMcp()) console.log(`    ${line}`)

  console.log(`\n${USAGE}`)
  return 0
}

function describeMcp(): string[] {
  try {
    const config = JSON.parse(readFileSync(path.join(ROOT, '.mcp.json'), 'utf8'))
    const lines = Object.entries<{ url?: string }>(config.mcpServers ?? {}).map(([name, s]) => {
      if (!s.url) return `${name} → (not an http server)`
      const url = new URL(s.url)
      if (url.hostname === '127.0.0.1' || url.hostname === 'localhost')
        return `${name} → local ${url.host}`
      if (!url.hostname.endsWith('supabase.com')) return `${name} → ${url.host}`
      const ref = url.searchParams.get('project_ref')
      const env = Object.entries(CRM_ENVIRONMENTS).find(([, e]) => e.ref && e.ref === ref)?.[0]
      const mode = url.searchParams.get('read_only') === 'true' ? 'read-only' : 'READ-WRITE'
      const flag = env === 'production' ? '  ✖ PRODUCTION — remove this server' : ''
      return `${name} → ${ref ?? 'UNSCOPED (all projects!)'}${env ? ` (${env})` : ''}, ${mode}${flag}`
    })
    return lines.length ? lines : ['no servers configured']
  } catch {
    return ['could not read .mcp.json']
  }
}

// ─── main ─────────────────────────────────────────────────────────────────────

async function main(): Promise<number> {
  const { values } = parseArgs({
    options: {
      local: { type: 'boolean' },
      dev: { type: 'boolean' },
      staging: { type: 'boolean' },
      prod: { type: 'boolean' },
      status: { type: 'boolean' },
      test: { type: 'boolean' },
      build: { type: 'boolean' },
      credentials: { type: 'string' },
      help: { type: 'boolean', short: 'h' },
    },
    strict: true,
  })

  if (values.help) {
    console.log(USAGE)
    return 0
  }
  const selected = (['local', 'dev', 'staging', 'prod', 'status'] as const).filter((k) => values[k])
  if (selected.length !== 1) {
    // Never pick an environment on the user's behalf.
    console.error(
      selected.length ? 'Choose exactly one of --local/--dev, --staging, --prod, --status.\n' : ''
    )
    console.error(USAGE)
    return 1
  }
  if (values.credentials && !values.prod)
    throw new CliError('--credentials is only valid with --prod.')
  if (values.test && !(values.local || values.dev || values.staging)) {
    throw new CliError(
      '--test runs against --local or --staging only. Tests never target Production.'
    )
  }

  if (values.dev) console.log('  (--dev is an alias for --local; hosted Staging is --staging)')
  if (values.build && !(values.local || values.dev || values.staging)) {
    throw new CliError(
      '--build is for --local or --staging; Production builds use --prod --credentials.'
    )
  }
  if (values.build && values.test) throw new CliError('Choose one of --test or --build.')
  const mode: Mode = values.test ? 'test' : values.build ? 'build' : 'dev'
  if (values.local || values.dev) return runLocal(mode)
  if (values.staging) return runStaging(mode)
  if (values.prod) return runProd(values.credentials)
  return runStatus()
}

main().then(
  (code) => process.exit(code),
  (err) => {
    if (err instanceof CliError || (err as { code?: string }).code?.startsWith('ERR_PARSE_ARGS')) {
      console.error(`\n  ✖ ${(err as Error).message}\n`)
    } else {
      console.error(err)
    }
    process.exit(1)
  }
)
