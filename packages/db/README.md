# @roaring/db

Database client, schema definitions, and TypeScript types for the monorepo. All database access — from both `@roaring/platform` and `@roaring/admin` — should go through this package to keep schema and query logic in one place.

## Current Status

Scaffolded. The public API (`src/index.ts`) is a placeholder and will grow as the Drizzle schema and Supabase client are wired up.

## Planned Scope

- Supabase client instantiation (with proper server/browser variants)
- Drizzle ORM schema definitions
- Drizzle query helpers and typed result types
- Database migration utilities

## Usage

```ts
import { db, schema } from '@roaring/db'
```

## Development

```bash
# Type check
pnpm --filter @roaring/db type-check

# Lint
pnpm --filter @roaring/db lint
```

## Environment Variables

The Supabase client will require:

| Variable                        | Description                                 |
| ------------------------------- | ------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`      | Supabase project URL                        |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Anon key for browser-side client            |
| `SUPABASE_SERVICE_ROLE_KEY`     | Service role key for server-side operations |

These are validated at startup via `@roaring/config/env`.

## Dependencies

- `@roaring/config` — shared TypeScript and ESLint config
