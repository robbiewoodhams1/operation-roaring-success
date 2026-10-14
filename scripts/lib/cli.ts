/**
 * Shared plumbing for `pnpm crm` and `pnpm db`: paths, env-file sources,
 * Supabase CLI invocation and the local stack's connection details.
 *
 * Secrets never reach stdout: env files are parsed in memory, and callers
 * print only the safe `detail` strings produced by the environment guard.
 */
import { execFileSync, spawn, spawnSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { parseEnv } from 'node:util'
import { GUARDED_ENV_KEYS } from '../../packages/config/src/environments.ts'

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
export const PLATFORM_DIR = path.join(ROOT, 'apps', 'platform')
export const STAGING_ENV_FILE = path.join(PLATFORM_DIR, '.env.staging.local')
/** The pre-2026-10-14 name of the Staging file. `next dev` auto-loads it, so it must not hold credentials. */
export const LEGACY_DEV_ENV_FILE = path.join(PLATFORM_DIR, '.env.development.local')
export const LINKED_REF_FILE = path.join(ROOT, 'supabase', '.temp', 'project-ref')

export type Values = Record<string, string | undefined>

export class CliError extends Error {}

// ─── env files ────────────────────────────────────────────────────────────────

export function readEnvFile(file: string): Values {
  return parseEnv(readFileSync(file, 'utf8'))
}

export function isGitIgnored(file: string): boolean {
  try {
    execFileSync('git', ['check-ignore', '-q', file], { cwd: ROOT, stdio: 'ignore' })
    return true
  } catch {
    return false
  }
}

export function isInsideRepo(file: string): boolean {
  const rel = path.relative(ROOT, file)
  return !rel.startsWith('..') && !path.isAbsolute(rel)
}

/**
 * Files Next.js loads on its own in `next dev` / `next build`. None may define
 * a guarded variable, so the selected environment can't be shadowed or topped
 * up with another project's credentials.
 */
export const SHADOW_FILES = [
  '.env',
  '.env.local',
  '.env.development',
  '.env.development.local',
  '.env.production',
  '.env.production.local',
]

export function findShadowing(): { file: string; keys: string[] }[] {
  const found = []
  for (const name of SHADOW_FILES) {
    const file = path.join(PLATFORM_DIR, name)
    if (!existsSync(file)) continue
    const keys = Object.keys(readEnvFile(file)).filter((k) =>
      (GUARDED_ENV_KEYS as readonly string[]).includes(k)
    )
    if (keys.length) found.push({ file: path.relative(ROOT, file), keys })
  }
  return found
}

export function assertNoShadowing() {
  const shadowing = findShadowing()
  if (!shadowing.length) return
  const list = shadowing.map((s) => `  - ${s.file}: ${s.keys.join(', ')}`).join('\n')
  const legacy = shadowing.some((s) => s.file.endsWith('.env.development.local'))
  throw new CliError(
    `These files are auto-loaded by Next.js and define Supabase variables:\n${list}\n` +
      'Remove those variables (or the files) so the selected environment cannot be overridden.' +
      (legacy
        ? '\nStaging credentials now live in apps/platform/.env.staging.local with CRM_ENV=staging:\n' +
          '  move apps/platform/.env.development.local apps/platform/.env.staging.local  (then edit CRM_ENV)'
        : '')
  )
}

/** The git-ignored Staging credentials file. */
export function stagingSource(): Values {
  const rel = path.relative(ROOT, STAGING_ENV_FILE)
  if (!existsSync(STAGING_ENV_FILE)) {
    throw new CliError(
      `${rel} not found.\nCopy apps/platform/.env.example to ${rel} and fill in the Staging project's values` +
        (existsSync(LEGACY_DEV_ENV_FILE)
          ? `\n(or move your existing ${path.relative(ROOT, LEGACY_DEV_ENV_FILE)} there and set CRM_ENV=staging).`
          : '.')
    )
  }
  if (!isGitIgnored(STAGING_ENV_FILE))
    throw new CliError(`${rel} is not git-ignored — refusing to use it.`)
  return readEnvFile(STAGING_ENV_FILE)
}

/**
 * The child process gets guarded keys only from the selected source; anything
 * inherited from the shell is dropped. `drop` removes further inherited keys
 * (e.g. hosted-only integrations when running locally).
 */
export function childEnv(values: Values, drop: string[] = []): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = { ...process.env }
  for (const key of [...GUARDED_ENV_KEYS, ...drop]) delete env[key]
  delete env.NODE_ENV // let Next.js / vitest set it
  for (const [k, v] of Object.entries(values)) if (v !== undefined) env[k] = v
  return env
}

export function runPnpm(args: string[], env: NodeJS.ProcessEnv): Promise<number> {
  const execPath = process.env.npm_execpath
  const child =
    execPath && /\.[cm]?js$/.test(execPath)
      ? spawn(process.execPath, [execPath, ...args], { cwd: ROOT, env, stdio: 'inherit' })
      : spawn('pnpm', args, {
          cwd: ROOT,
          env,
          stdio: 'inherit',
          shell: process.platform === 'win32',
        })
  return new Promise((resolve) => {
    child.on('exit', (code, signal) => resolve(code ?? (signal ? 1 : 0)))
    child.on('error', (err) => {
      console.error(err)
      resolve(1)
    })
  })
}

// ─── Supabase CLI ─────────────────────────────────────────────────────────────

const require = createRequire(path.join(ROOT, 'package.json'))

/** The pinned CLI from devDependencies, run with Node directly — no shell, so arguments are never re-parsed. */
function supabaseEntry(): string {
  const pkg = require.resolve('supabase/package.json')
  const bin = JSON.parse(readFileSync(pkg, 'utf8')).bin.supabase as string
  return path.join(path.dirname(pkg), bin)
}

/** Flags that would point a local command at a hosted database. */
const HOSTED_TARGET_FLAGS = ['--linked', '--db-url', '--project-ref']

export function assertLocalArgs(args: string[]) {
  const bad = args.filter((a) => HOSTED_TARGET_FLAGS.some((f) => a === f || a.startsWith(`${f}=`)))
  if (bad.length) throw new CliError(`Local database commands never accept ${bad.join(', ')}.`)
}

export function runSupabase(
  args: string[],
  opts: { env?: NodeJS.ProcessEnv } = {}
): Promise<number> {
  const child = spawn(process.execPath, [supabaseEntry(), ...args], {
    cwd: ROOT,
    env: opts.env ?? process.env,
    stdio: 'inherit',
  })
  return new Promise((resolve) => {
    child.on('exit', (code, signal) => resolve(code ?? (signal ? 1 : 0)))
    child.on('error', (err) => {
      console.error(err)
      resolve(1)
    })
  })
}

export function captureSupabase(args: string[]): { code: number; stdout: string; stderr: string } {
  const r = spawnSync(process.execPath, [supabaseEntry(), ...args], { cwd: ROOT, encoding: 'utf8' })
  return { code: r.status ?? 1, stdout: r.stdout ?? '', stderr: r.stderr ?? '' }
}

/** Docker must answer before anything local is attempted. Never falls back to a hosted project. */
export function dockerProblem(): string | null {
  // No shell: a missing binary must surface as ENOENT, not as cmd.exe's exit code 1.
  const r = spawnSync('docker', ['info', '--format', '{{.ServerVersion}}'], { encoding: 'utf8' })
  if (r.error || r.status === null) return 'Docker is not installed (no `docker` on PATH).'
  if (r.status !== 0)
    return 'Docker is installed but the engine is not running — start Docker Desktop.'
  return null
}

export function linkedProjectRef(): string | null {
  return existsSync(LINKED_REF_FILE) ? readFileSync(LINKED_REF_FILE, 'utf8').trim() || null : null
}

export interface LocalStack {
  apiUrl: string
  dbUrl: string
  studioUrl?: string
  mailUrl?: string
  mcpUrl?: string
  publishableKey: string
  serviceKey: string
}

/** Connection details of the running local stack, from `supabase status`. Null when it is not running. */
export function localStack(): LocalStack | null {
  const r = captureSupabase(['status', '-o', 'json'])
  if (r.code !== 0) return null
  const start = r.stdout.indexOf('{')
  if (start < 0) return null
  let s: Record<string, string>
  try {
    s = JSON.parse(r.stdout.slice(start))
  } catch {
    return null
  }
  if (!s.API_URL || !s.DB_URL) return null
  const publishableKey = s.ANON_KEY ?? s.PUBLISHABLE_KEY
  const serviceKey = s.SERVICE_ROLE_KEY ?? s.SECRET_KEY
  if (!publishableKey || !serviceKey) return null
  return {
    apiUrl: s.API_URL,
    dbUrl: s.DB_URL,
    studioUrl: s.STUDIO_URL,
    mailUrl: s.MAILPIT_URL ?? s.INBUCKET_URL,
    mcpUrl: s.MCP_URL,
    publishableKey,
    serviceKey,
  }
}

/** Starts the local stack if needed and returns its details. */
export async function ensureLocalStack(): Promise<LocalStack> {
  const running = localStack()
  if (running) return running
  const docker = dockerProblem()
  if (docker) {
    throw new CliError(
      `${docker}\nThe local Supabase stack needs Docker Desktop (see docs/LOCAL_DEVELOPMENT.md → Prerequisites).\n` +
        'Nothing was started, and nothing falls back to a hosted project.'
    )
  }
  console.log('  Local Supabase is not running — starting it (first run downloads images)...\n')
  const code = await runSupabase(['start'])
  const started = code === 0 ? localStack() : null
  if (!started)
    throw new CliError('`supabase start` did not bring the local stack up. See its output above.')
  return started
}

/** Values for CRM_ENV=local. Every one comes from the local CLI, none from a hosted project. */
export function localValues(stack: LocalStack): Values {
  return {
    CRM_ENV: 'local',
    NEXT_PUBLIC_SUPABASE_URL: stack.apiUrl,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: stack.publishableKey,
    SUPABASE_SERVICE_ROLE_KEY: stack.serviceKey,
    DATABASE_URL: stack.dbUrl,
    NEXT_PUBLIC_APP_URL: 'http://localhost:3000',
    // Required by lib/env.ts; no code sends email today, and Local must never use a real key.
    RESEND_API_KEY: 're_local_disabled',
  }
}

/** Hosted-only integrations that a local run must never inherit from the shell. */
export const HOSTED_ONLY_KEYS = [
  'RESEND_API_KEY',
  'NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN',
  'NEXT_PUBLIC_POSTHOG_HOST',
  'SUPABASE_ACCESS_TOKEN',
  'SUPABASE_DB_PASSWORD',
]

// ─── database helpers ─────────────────────────────────────────────────────────

type Sql = {
  unsafe: (q: string) => Promise<Record<string, unknown>[]>
  begin: <T>(fn: (sql: Sql) => Promise<T>) => Promise<T>
  end: (o?: { timeout?: number }) => Promise<void>
}

/** A short-lived postgres.js connection, resolved from packages/db (where the driver lives). */
export async function connect(databaseUrl: string): Promise<Sql> {
  const dbRequire = createRequire(path.join(ROOT, 'packages', 'db', 'package.json'))
  const { default: postgres } = await import(pathToFileURL(dbRequire.resolve('postgres')).href)
  return postgres(databaseUrl, { max: 1, prepare: false, connect_timeout: 10, onnotice: () => {} })
}

/**
 * The Supabase CLI applies migrations over a session connection; the
 * transaction pooler (port 6543) is unsuitable, so pooler URLs use the
 * session port (5432) on the same host.
 */
export function cliDatabaseUrl(databaseUrl: string): string {
  const url = new URL(databaseUrl)
  if (url.hostname.endsWith('.pooler.supabase.com') && url.port === '6543') url.port = '5432'
  return url.toString()
}
