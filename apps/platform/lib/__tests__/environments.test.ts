import { describe, expect, it } from 'vitest'
import {
  assertCrmEnvironment,
  describeKey,
  parseDatabaseUrl,
  refFromSupabaseUrl,
  verifyEnvironment,
  type CrmEnvironment,
} from '@roaring/config/environments'

const STAGING = 'gqkugpjmguufavbladxt'
const PROD = 'wvdwwmfzwvrniwpmiahu'

const enc = (o: object) => Buffer.from(JSON.stringify(o)).toString('base64url')

/** Unsigned JWT with the claims Supabase puts in legacy keys — enough for offline checks. */
function jwt(claims: Record<string, string>) {
  return `${enc({ alg: 'HS256', typ: 'JWT' })}.${enc({ iss: 'supabase', ...claims })}.sig`
}

function envFor(ref: string, overrides: Record<string, string | undefined> = {}) {
  return {
    CRM_ENV: ref === PROD ? 'production' : 'staging',
    NEXT_PUBLIC_SUPABASE_URL: `https://${ref}.supabase.co`,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_abc',
    SUPABASE_SERVICE_ROLE_KEY: 'sb_secret_abc',
    DATABASE_URL: `postgresql://postgres.${ref}:pw@aws-0-eu-west-1.pooler.supabase.com:6543/postgres`,
    ...overrides,
  }
}

/** What `supabase status` reports for a local stack: loopback URLs and the CLI's ref-less demo keys. */
function localEnv(overrides: Record<string, string | undefined> = {}) {
  const demo = (role: string) =>
    `${enc({ alg: 'HS256', typ: 'JWT' })}.${enc({ iss: 'supabase-demo', role })}.sig`
  return {
    CRM_ENV: 'local',
    NEXT_PUBLIC_SUPABASE_URL: 'http://127.0.0.1:54321',
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: demo('anon'),
    SUPABASE_SERVICE_ROLE_KEY: demo('service_role'),
    DATABASE_URL: 'postgresql://postgres:postgres@127.0.0.1:54322/postgres',
    ...overrides,
  }
}

const failed = (env: Record<string, string | undefined>, expected?: CrmEnvironment) =>
  verifyEnvironment(env, expected)
    .checks.filter((c) => c.status === 'fail')
    .map((c) => c.name)

describe('ref parsing', () => {
  it('reads the ref from a Supabase URL and rejects anything else', () => {
    expect(refFromSupabaseUrl(`https://${STAGING}.supabase.co`)).toBe(STAGING)
    expect(refFromSupabaseUrl(`http://${STAGING}.supabase.co`)).toBeNull()
    expect(refFromSupabaseUrl('https://api.example.com')).toBeNull()
    expect(refFromSupabaseUrl('not a url')).toBeNull()
  })

  it('reads the ref from pooler usernames and direct hosts', () => {
    expect(
      parseDatabaseUrl(
        `postgresql://postgres.${STAGING}:pw@aws-0-eu-west-1.pooler.supabase.com:6543/postgres`
      )?.ref
    ).toBe(STAGING)
    expect(
      parseDatabaseUrl(`postgres://postgres:pw@db.${PROD}.supabase.co:5432/postgres`)?.ref
    ).toBe(PROD)
    expect(parseDatabaseUrl('postgresql://postgres:pw@localhost:5432/postgres')?.ref).toBeNull()
    expect(parseDatabaseUrl('postgresql://postgres:pw@localhost:5432/postgres')?.local).toBe(true)
  })

  it('flags a connection string whose user and host disagree', () => {
    const target = parseDatabaseUrl(
      `postgresql://postgres.${STAGING}:pw@db.${PROD}.supabase.co:5432/postgres`
    )
    expect(target?.conflict).toBe(true)
    expect(target?.ref).toBeNull()
  })

  it('never exposes key material when describing keys', () => {
    expect(describeKey('sb_publishable_x')).toEqual({ kind: 'publishable' })
    expect(describeKey(jwt({ ref: STAGING, role: 'anon' }))).toEqual({
      kind: 'jwt',
      ref: STAGING,
      role: 'anon',
    })
    expect(describeKey('garbage')).toEqual({ kind: 'unknown' })
  })
})

describe('verifyEnvironment — hosted', () => {
  it('accepts a consistent staging environment', () => {
    const result = verifyEnvironment(envFor(STAGING), 'staging')
    expect(result.ok).toBe(true)
    expect(result.expectedRef).toBe(STAGING)
  })

  it('has no default: a missing or unknown CRM_ENV fails', () => {
    expect(verifyEnvironment(envFor(STAGING, { CRM_ENV: undefined })).ok).toBe(false)
    expect(verifyEnvironment(envFor(STAGING, { CRM_ENV: 'qa' })).ok).toBe(false)
  })

  it('explains the retired "development" name instead of guessing what it meant', () => {
    const check = verifyEnvironment(envFor(STAGING, { CRM_ENV: 'development' })).checks[0]!
    expect(check.status).toBe('fail')
    expect(check.detail).toMatch(/renamed/)
  })

  it('rejects CRM_ENV that disagrees with the selected environment', () => {
    expect(failed(envFor(PROD), 'staging')).toContain('CRM_ENV')
  })

  it('never accepts production credentials as staging', () => {
    const env = { ...envFor(PROD), CRM_ENV: 'staging' }
    expect(failed(env, 'staging')).toEqual(['NEXT_PUBLIC_SUPABASE_URL', 'DATABASE_URL'])
  })

  it('rejects a production DATABASE_URL behind a staging URL', () => {
    const env = envFor(STAGING, {
      DATABASE_URL: `postgresql://postgres.${PROD}:pw@aws-0-eu-west-1.pooler.supabase.com:6543/postgres`,
    })
    expect(failed(env, 'staging')).toEqual(['DATABASE_URL'])
  })

  it('rejects a local DATABASE_URL in a hosted environment', () => {
    expect(
      failed(envFor(STAGING, { DATABASE_URL: 'postgresql://postgres:pw@localhost:5432/postgres' }))
    ).toEqual(['DATABASE_URL'])
  })

  it('rejects a legacy service-role key from another project', () => {
    const env = envFor(STAGING, {
      SUPABASE_SERVICE_ROLE_KEY: jwt({ ref: PROD, role: 'service_role' }),
    })
    expect(failed(env)).toEqual(['SUPABASE_SERVICE_ROLE_KEY'])
  })

  it('rejects swapped key slots', () => {
    const env = envFor(STAGING, {
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: jwt({ ref: STAGING, role: 'service_role' }),
      SUPABASE_SERVICE_ROLE_KEY: 'sb_publishable_abc',
    })
    expect(failed(env)).toEqual([
      'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
      'SUPABASE_SERVICE_ROLE_KEY',
    ])
  })

  it('rejects missing credentials', () => {
    const env = envFor(STAGING, { SUPABASE_SERVICE_ROLE_KEY: '', DATABASE_URL: undefined })
    expect(failed(env)).toEqual(['SUPABASE_SERVICE_ROLE_KEY', 'DATABASE_URL'])
  })

  it('leaves sb_ keys to online verification without failing', () => {
    const statuses = verifyEnvironment(envFor(STAGING)).checks.map((c) => c.status)
    expect(statuses).toContain('offline-unverifiable')
  })
})

describe('verifyEnvironment — local', () => {
  it('accepts what the local Supabase CLI reports', () => {
    const result = verifyEnvironment(localEnv(), 'local')
    expect(result.ok).toBe(true)
    expect(result.expectedRef).toBeNull()
  })

  it('accepts localhost and the sb_ local keys', () => {
    const env = localEnv({
      NEXT_PUBLIC_SUPABASE_URL: 'http://localhost:54321',
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_local',
      SUPABASE_SERVICE_ROLE_KEY: 'sb_secret_local',
    })
    expect(verifyEnvironment(env, 'local').ok).toBe(true)
  })

  it.each([
    ['NEXT_PUBLIC_SUPABASE_URL', `https://${STAGING}.supabase.co`],
    ['NEXT_PUBLIC_SUPABASE_URL', 'http://192.168.1.20:54321'],
    ['NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', jwt({ ref: STAGING, role: 'anon' })],
    ['SUPABASE_SERVICE_ROLE_KEY', jwt({ ref: PROD, role: 'service_role' })],
    [
      'DATABASE_URL',
      `postgresql://postgres.${PROD}:pw@aws-0-eu-west-1.pooler.supabase.com:5432/postgres`,
    ],
    ['DATABASE_URL', `postgresql://postgres:pw@db.${STAGING}.supabase.co:5432/postgres`],
    ['DATABASE_URL', 'postgresql://postgres:pw@10.0.0.5:5432/postgres'],
    // A tunnel on loopback that still names a hosted project is not local.
    ['DATABASE_URL', `postgresql://postgres.${PROD}:pw@127.0.0.1:5432/postgres`],
  ])('never inherits hosted credentials: %s = %s', (key, value) => {
    expect(failed(localEnv({ [key]: value }), 'local')).toEqual([key])
  })

  it('a local config is not accepted as staging, and vice versa', () => {
    expect(verifyEnvironment(localEnv(), 'staging').ok).toBe(false)
    expect(verifyEnvironment({ ...envFor(STAGING), CRM_ENV: 'local' }, 'local').ok).toBe(false)
  })
})

describe('assertCrmEnvironment', () => {
  it('throws on an inconsistent environment', () => {
    expect(() =>
      assertCrmEnvironment(
        envFor(STAGING, { NEXT_PUBLIC_SUPABASE_URL: `https://${PROD}.supabase.co` })
      )
    ).toThrow(/could not be verified/)
  })

  it('refuses production in a local dev server', () => {
    expect(() => assertCrmEnvironment({ ...envFor(PROD), NODE_ENV: 'development' })).toThrow(
      /never use the production/
    )
  })

  it('allows production for production builds and servers', () => {
    expect(assertCrmEnvironment({ ...envFor(PROD), NODE_ENV: 'production' })).toBe('production')
  })

  it('allows local and staging dev servers', () => {
    expect(assertCrmEnvironment({ ...localEnv(), NODE_ENV: 'development' })).toBe('local')
    expect(assertCrmEnvironment({ ...envFor(STAGING), NODE_ENV: 'development' })).toBe('staging')
  })

  it('refuses production credentials in a Vercel Preview deployment', () => {
    expect(() =>
      assertCrmEnvironment({
        ...envFor(PROD),
        NODE_ENV: 'production',
        VERCEL: '1',
        VERCEL_ENV: 'preview',
      })
    ).toThrow(/Vercel preview deployment must never use the production/)
  })

  it('refuses a Vercel Production deployment that is not production', () => {
    expect(() =>
      assertCrmEnvironment({
        ...envFor(STAGING),
        NODE_ENV: 'production',
        VERCEL: '1',
        VERCEL_ENV: 'production',
      })
    ).toThrow(/configured as "staging"/)
  })

  it('allows staging in Vercel Preview and production in Vercel Production', () => {
    expect(
      assertCrmEnvironment({
        ...envFor(STAGING),
        NODE_ENV: 'production',
        VERCEL: '1',
        VERCEL_ENV: 'preview',
      })
    ).toBe('staging')
    expect(
      assertCrmEnvironment({
        ...envFor(PROD),
        NODE_ENV: 'production',
        VERCEL: '1',
        VERCEL_ENV: 'production',
      })
    ).toBe('production')
  })

  it('refuses the local stack in any deployed build', () => {
    expect(() =>
      assertCrmEnvironment({ ...localEnv(), VERCEL: '1', VERCEL_ENV: 'preview' })
    ).toThrow(/cannot use the local/)
  })
})
