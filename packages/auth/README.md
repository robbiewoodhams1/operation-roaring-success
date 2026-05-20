# @roaring/auth

Authentication utilities shared across `@roaring/platform` and `@roaring/admin`. This package is the single place for session handling, auth helpers, and any Supabase Auth wrappers — keeping auth logic out of the apps.

## Current Status

Scaffolded. The public API (`src/index.ts`) is a placeholder and will grow as authentication flows are implemented. The intended integrations are Supabase Auth and Drizzle-backed session storage.

## Planned Scope

- Supabase Auth client setup (browser and server-side)
- Session / JWT helpers
- Middleware utilities for Next.js App Router route protection
- Role / permission checks shared between apps

## Usage

```ts
import {} from '@roaring/auth'
```

## Development

```bash
# Type check
pnpm --filter @roaring/auth type-check

# Lint
pnpm --filter @roaring/auth lint
```

## Dependencies

- `@roaring/config` — shared TypeScript and ESLint config
