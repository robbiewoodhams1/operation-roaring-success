import { CRM_ENVIRONMENTS, formatProblems, verifyEnvironment } from '@roaring/config/environments'

// Credentials are injected by `pnpm crm --local --test` (or `--staging --test`),
// which resolves and verifies exactly one environment — the same resolution the
// app and the migration tooling use. Nothing is read from env files here, and
// Production is never an accepted target.
const declared = process.env.CRM_ENV
if (declared !== 'local' && declared !== 'staging') {
  throw new Error(
    'Database integration tests run against Local or Staging only, via\n' +
      '  pnpm crm --local --test      (default — the Docker stack)\n' +
      `  pnpm crm --staging --test    (${CRM_ENVIRONMENTS.staging.ref}; every test rolls back)\n` +
      `CRM_ENV is ${declared ? `"${declared}"` : 'not set'}.`
  )
}

const result = verifyEnvironment(process.env, declared)
if (!result.ok) {
  throw new Error(`Integration test environment failed verification:\n${formatProblems(result)}`)
}
