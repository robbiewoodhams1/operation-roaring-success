/// <reference types="node" />
import type { Config } from 'drizzle-kit'
import { assertCrmEnvironment } from '@roaring/config/environments'

// drizzle-kit uses the same environment identity as the app: it refuses to
// run unless CRM_ENV and DATABASE_URL agree on one project.
assertCrmEnvironment()

// Migrations live ONLY in supabase/migrations (one history; see
// docs/MIGRATIONS.md). drizzle-kit output goes to a git-ignored scratch folder:
// use `drizzle-kit generate` at most to draft SQL, then copy the reviewed
// statements into a file from `pnpm db new <name>`. Never run `drizzle-kit
// migrate` or `push` — they would bypass the Supabase migration history.
export default {
  schema: './src/schema',
  out: './drizzle-drafts',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
} satisfies Config
