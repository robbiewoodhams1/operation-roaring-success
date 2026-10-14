/**
 * Environment identity guard.
 *
 * Every process that talks to Supabase (the Next.js app, the `pnpm crm` and
 * `pnpm db` CLIs, drizzle-kit, the integration tests) declares which
 * environment it is via `CRM_ENV`, and this module checks that the Supabase
 * URL, API keys and `DATABASE_URL` all point at that environment:
 *
 *   local       the Supabase CLI stack in Docker on this machine (127.0.0.1)
 *   staging     hosted project gqkugpjmguufavbladxt
 *   production  hosted project wvdwwmfzwvrniwpmiahu
 *
 * A correct URL does not vouch for a mismatched `DATABASE_URL` or key — each
 * value is checked on its own. Local values must be loopback-only and may not
 * carry any hosted project's identity; hosted values must name exactly their
 * own project.
 *
 * There is deliberately no default environment: a missing or unknown
 * `CRM_ENV` fails, it never falls back to anything.
 *
 * Pure and dependency-free so it runs in Node, the Next.js proxy, and the CLI.
 */

export const CRM_ENVIRONMENTS = {
  local: { ref: null, label: 'Local', hosted: false },
  staging: { ref: 'gqkugpjmguufavbladxt', label: 'Staging', hosted: true },
  production: { ref: 'wvdwwmfzwvrniwpmiahu', label: 'Production', hosted: true },
} as const

export type CrmEnvironment = keyof typeof CRM_ENVIRONMENTS
export type HostedEnvironment = Exclude<CrmEnvironment, 'local'>

/** Names that used to be valid, with what replaced them. */
const RENAMED: Record<string, string> = {
  development:
    '"development" was renamed: use "staging" for the hosted project gqkugpjmguufavbladxt, or "local" for Docker',
}

/** Variables that decide which Supabase project a process talks to. */
export const GUARDED_ENV_KEYS = [
  'CRM_ENV',
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'DATABASE_URL',
] as const

export type CheckStatus = 'pass' | 'fail' | 'offline-unverifiable'

export interface EnvCheck {
  name: string
  status: CheckStatus
  /** Safe to print — never contains a secret value. */
  detail: string
}

export interface EnvVerification {
  ok: boolean
  environment: CrmEnvironment | null
  expectedRef: string | null
  checks: EnvCheck[]
}

type EnvSource = Record<string, string | undefined>

export function isCrmEnvironment(value: unknown): value is CrmEnvironment {
  return typeof value === 'string' && Object.hasOwn(CRM_ENVIRONMENTS, value)
}

const LOOPBACK_HOSTS = new Set(['127.0.0.1', 'localhost', '[::1]', '::1'])

export function isLoopbackHost(hostname: string): boolean {
  return LOOPBACK_HOSTS.has(hostname.toLowerCase())
}

/** `https://<ref>.supabase.co` → `<ref>`. Custom domains are unverifiable, so they return null. */
export function refFromSupabaseUrl(value: string): string | null {
  let url: URL
  try {
    url = new URL(value)
  } catch {
    return null
  }
  const match = /^([a-z0-9]{20})\.supabase\.co$/.exec(url.hostname)
  return url.protocol === 'https:' && match ? match[1]! : null
}

/** `http://127.0.0.1:54321` → `127.0.0.1:54321`; null for anything not on loopback. */
export function localApiHost(value: string): string | null {
  let url: URL
  try {
    url = new URL(value)
  } catch {
    return null
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return null
  return isLoopbackHost(url.hostname) ? url.host : null
}

export interface DatabaseTarget {
  ref: string | null
  host: string
  user: string
  /** Set when the username and host name different projects. */
  conflict: boolean
  /** True for a loopback host whose username carries no project ref. */
  local: boolean
}

/**
 * Reads the project ref out of a Supabase Postgres connection string. The
 * pooler routes on the `postgres.<ref>` username; direct connections route on
 * the `db.<ref>.supabase.co` host. Both are checked when both are present.
 */
export function parseDatabaseUrl(value: string): DatabaseTarget | null {
  let url: URL
  try {
    url = new URL(value)
  } catch {
    return null
  }
  if (url.protocol !== 'postgres:' && url.protocol !== 'postgresql:') return null

  const user = decodeURIComponent(url.username)
  const host = url.hostname
  const userRef = /^postgres\.([a-z0-9]{20})$/.exec(user)?.[1] ?? null
  const hostRef = /^db\.([a-z0-9]{20})\.supabase\.co$/.exec(host)?.[1] ?? null
  const conflict = userRef !== null && hostRef !== null && userRef !== hostRef

  return {
    ref: conflict ? null : (userRef ?? hostRef),
    host,
    user,
    conflict,
    local: isLoopbackHost(host) && userRef === null,
  }
}

export type KeyInfo =
  | { kind: 'publishable' }
  | { kind: 'secret' }
  | { kind: 'jwt'; role: string | null; ref: string | null }
  | { kind: 'unknown' }

/** Classifies a Supabase API key without exposing it. Legacy JWT keys carry their project ref. */
export function describeKey(key: string): KeyInfo {
  if (key.startsWith('sb_publishable_')) return { kind: 'publishable' }
  if (key.startsWith('sb_secret_')) return { kind: 'secret' }

  const parts = key.split('.')
  if (parts.length === 3) {
    try {
      const b64 = parts[1]!.replace(/-/g, '+').replace(/_/g, '/')
      const payload = JSON.parse(atob(b64.padEnd(b64.length + ((4 - (b64.length % 4)) % 4), '=')))
      return {
        kind: 'jwt',
        role: typeof payload.role === 'string' ? payload.role : null,
        ref: typeof payload.ref === 'string' ? payload.ref : null,
      }
    } catch {
      return { kind: 'unknown' }
    }
  }
  return { kind: 'unknown' }
}

function checkKey(
  name: string,
  value: string | undefined,
  slot: 'publishable' | 'service',
  target: CrmEnvironment | null
): EnvCheck {
  if (!value) return { name, status: 'fail', detail: 'missing' }

  const info = describeKey(value)
  const wantedNewKind = slot === 'publishable' ? 'publishable' : 'secret'
  const wantedRole = slot === 'publishable' ? 'anon' : 'service_role'
  const expectedRef = target ? CRM_ENVIRONMENTS[target].ref : null

  if (info.kind === wantedNewKind) {
    return {
      name,
      status: 'offline-unverifiable',
      detail: `sb_${wantedNewKind}_… key (its ${target === 'local' ? 'instance' : 'project'} can only be verified online)`,
    }
  }
  if (info.kind === 'jwt') {
    if (info.role !== wantedRole) {
      return {
        name,
        status: 'fail',
        detail: `legacy JWT has role "${info.role}", expected "${wantedRole}"`,
      }
    }
    if (target === 'local') {
      // The CLI's demo keys carry no project ref; any ref means a hosted key.
      return info.ref === null
        ? { name, status: 'pass', detail: `local ${wantedRole} JWT (no hosted project)` }
        : { name, status: 'fail', detail: `hosted key for project "${info.ref}" in a local config` }
    }
    if (!expectedRef || info.ref !== expectedRef) {
      return { name, status: 'fail', detail: `legacy JWT belongs to project "${info.ref}"` }
    }
    return { name, status: 'pass', detail: `legacy ${wantedRole} JWT for ${info.ref}` }
  }
  if (info.kind === 'publishable' || info.kind === 'secret') {
    return {
      name,
      status: 'fail',
      detail: `holds an sb_${info.kind}_… key — wrong key type for this variable`,
    }
  }
  return { name, status: 'fail', detail: 'unrecognised key format' }
}

function checkUrl(url: string | undefined, target: CrmEnvironment | null): EnvCheck {
  const name = 'NEXT_PUBLIC_SUPABASE_URL'
  if (!url) return { name, status: 'fail', detail: 'missing' }
  const ref = refFromSupabaseUrl(url)

  if (target === 'local') {
    const host = localApiHost(url)
    if (host) return { name, status: 'pass', detail: `local API ${host}` }
    return {
      name,
      status: 'fail',
      detail: ref
        ? `points at hosted project "${ref}"`
        : 'not a loopback (127.0.0.1/localhost) URL',
    }
  }
  const expectedRef = target ? CRM_ENVIRONMENTS[target].ref : null
  if (ref === null) {
    return { name, status: 'fail', detail: 'not an https://<ref>.supabase.co URL' }
  }
  return ref === expectedRef
    ? { name, status: 'pass', detail: ref }
    : { name, status: 'fail', detail: `points at project "${ref}"` }
}

function checkDatabaseUrl(dbUrl: string | undefined, target: CrmEnvironment | null): EnvCheck {
  const name = 'DATABASE_URL'
  if (!dbUrl) return { name, status: 'fail', detail: 'missing' }
  const db = parseDatabaseUrl(dbUrl)
  if (db === null) return { name, status: 'fail', detail: 'not a postgres:// connection string' }
  if (db.conflict) {
    return {
      name,
      status: 'fail',
      detail: `user ${db.user} and host ${db.host} name different projects`,
    }
  }

  if (target === 'local') {
    if (db.local) return { name, status: 'pass', detail: `${db.user}@${db.host} (local)` }
    return {
      name,
      status: 'fail',
      detail: db.ref ? `points at hosted project "${db.ref}"` : `${db.host} is not a loopback host`,
    }
  }
  const expectedRef = target ? CRM_ENVIRONMENTS[target].ref : null
  if (db.ref === null) {
    return { name, status: 'fail', detail: `cannot determine project from ${db.user}@${db.host}` }
  }
  return db.ref === expectedRef
    ? { name, status: 'pass', detail: `${db.user}@${db.host}` }
    : { name, status: 'fail', detail: `points at project "${db.ref}"` }
}

/**
 * Checks every guarded variable against the environment named by `CRM_ENV`
 * (or `expected`, which must then agree with `CRM_ENV`). `ok` is true when
 * nothing failed; `offline-unverifiable` checks are left for the CLI's online
 * verification and do not fail here.
 */
export function verifyEnvironment(env: EnvSource, expected?: CrmEnvironment): EnvVerification {
  const checks: EnvCheck[] = []
  const declared = env.CRM_ENV

  let environment: CrmEnvironment | null = null
  if (!declared) {
    checks.push({
      name: 'CRM_ENV',
      status: 'fail',
      detail: 'missing — there is no default environment',
    })
  } else if (!isCrmEnvironment(declared)) {
    checks.push({
      name: 'CRM_ENV',
      status: 'fail',
      detail:
        RENAMED[declared] ?? `unknown environment "${declared}" (local | staging | production)`,
    })
  } else if (expected && declared !== expected) {
    checks.push({
      name: 'CRM_ENV',
      status: 'fail',
      detail: `is "${declared}" but "${expected}" was selected`,
    })
  } else {
    environment = declared
    checks.push({ name: 'CRM_ENV', status: 'pass', detail: declared })
  }

  const target = environment ?? expected ?? null

  checks.push(checkUrl(env.NEXT_PUBLIC_SUPABASE_URL, target))
  checks.push(
    checkKey(
      'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
      env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
      'publishable',
      target
    )
  )
  checks.push(
    checkKey('SUPABASE_SERVICE_ROLE_KEY', env.SUPABASE_SERVICE_ROLE_KEY, 'service', target)
  )
  checks.push(checkDatabaseUrl(env.DATABASE_URL, target))

  return {
    ok: environment !== null && checks.every((c) => c.status !== 'fail'),
    environment,
    expectedRef: target ? CRM_ENVIRONMENTS[target].ref : null,
    checks,
  }
}

export function formatProblems(result: EnvVerification): string {
  return result.checks
    .filter((c) => c.status === 'fail')
    .map((c) => `  - ${c.name}: ${c.detail}`)
    .join('\n')
}

/**
 * Deployment rules that hold even when every value is internally consistent:
 * a `next dev` server never runs as production, a Vercel Preview never
 * reaches Production, a Vercel Production deployment only ever runs as
 * production, and nothing deployed can use the local stack. Returns the
 * reason a combination is refused, or null.
 */
export function deploymentViolation(environment: CrmEnvironment, env: EnvSource): string | null {
  if (environment === 'production' && env.NODE_ENV === 'development') {
    return 'a local development server must never use the production project. Use `pnpm crm --local`.'
  }
  const vercelEnv = env.VERCEL_ENV
  if (vercelEnv && vercelEnv !== 'production' && environment === 'production') {
    return `a Vercel ${vercelEnv} deployment must never use the production project — give it Staging credentials.`
  }
  if (vercelEnv === 'production' && environment !== 'production') {
    return `the Vercel Production deployment is configured as "${environment}".`
  }
  if ((vercelEnv || env.VERCEL) && environment === 'local') {
    return 'a deployed build cannot use the local Supabase stack.'
  }
  return null
}

let verifiedProcessEnv: CrmEnvironment | null = null

/**
 * Throws unless the environment is fully consistent and allowed here. Call
 * before creating any database connection or privileged Supabase client.
 *
 * Results for the live `process.env` are cached, so this is cheap to call per
 * request.
 */
export function assertCrmEnvironment(env: EnvSource = process.env): CrmEnvironment {
  if (env === process.env && verifiedProcessEnv) return verifiedProcessEnv

  const result = verifyEnvironment(env)
  if (!result.ok || !result.environment) {
    throw new Error(
      `Refusing to connect: Supabase environment could not be verified.\n${formatProblems(result)}\n` +
        'Start the app with `pnpm crm --local` (see README → Environments).'
    )
  }
  const violation = deploymentViolation(result.environment, env)
  if (violation) throw new Error(`Refusing to connect: ${violation}`)

  if (env === process.env) verifiedProcessEnv = result.environment
  return result.environment
}
