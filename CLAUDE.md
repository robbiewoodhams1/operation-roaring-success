# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

All commands run from the repo root using `pnpm`.

```bash
pnpm dev              # Start all apps (platform :3000, admin :3001)
pnpm build            # Build all apps and packages
pnpm lint             # ESLint across monorepo
pnpm type-check       # TypeScript checks across monorepo
pnpm format           # Prettier write
pnpm format:check     # Prettier check only
pnpm clean            # Remove build artifacts + node_modules
```

To run a single app:

```bash
pnpm --filter @roaring/platform dev
pnpm --filter @roaring/admin dev
```

To run a command in a specific package (e.g., db migrations):

```bash
pnpm --filter @roaring/db <script>
```

Run tests (vitest, platform app only):

```bash
pnpm --filter @roaring/platform test          # run once
pnpm --filter @roaring/platform test:watch    # watch mode
```

Pre-commit hooks (Husky + lint-staged) run lint and format checks on staged files automatically.

## Architecture

### Monorepo Structure

Turborepo monorepo with `pnpm` workspaces. Two apps and six shared packages:

- **`apps/platform`** — Main user-facing Next.js 16 app (port 3000). All customer-facing features live here.
- **`apps/admin`** — Internal admin dashboard (port 3001). Stripe payments and platform administration.
- **`packages/db`** — Drizzle ORM schema and Supabase client. The single source of truth for the database schema.
- **`packages/auth`** — Session management, Supabase SSR helpers, and middleware. Consumed by both apps.
- **`packages/config`** — Shared TypeScript, ESLint, and Zod-based env validation (`createEnv()`). All env vars are validated at startup.
- **`packages/algorithms`** — Business logic and target-scoring calculations, isolated from UI concerns.
- **`packages/ui`** — Shared React components used across apps.
- **`packages/telephony`** — Telephony integration (placeholder).

### Platform App Routing

Uses Next.js App Router with route groups:

- `(auth)/` — Public auth pages (login, confirm, reset-password)
- `(platform)/` — Protected routes; session required
  - `(admin)/` — Admin-only sub-routes (users, audit)
  - Feature pages: customers, deals, provisioning, routers, stats, targets, complaints, faults, search, help

### Authentication & Authorization

- **Supabase Auth** for identity; session cookie managed via `@supabase/ssr`
- Middleware in `packages/auth` validates sessions and injects user context on every request
- Roles: `agent | team_leader | manager | director | admin` — stored on the `users` table
- Users have an `approval_status` (`pending → approved → active`) — users must be approved before accessing the platform
- Multi-tenant isolation via a `tenants` table; Supabase RLS enforces row-level access

### Database

- **Drizzle ORM** over **Supabase PostgreSQL**; all schema lives in `packages/db/src/schema/`
- Key tables: `tenants`, `users`, `customers`, `deals`, `audit_logs`, `user_invitations`, `provisioning`, `provisioning_services`
- Customers have a `type` (`residential | business`) and `status` (`prospect | active | at_risk | churned`)
- Run migrations with `drizzle-kit` via the `@roaring/db` package scripts

### Environment Variables

Each app has a `lib/env.ts` that calls `createEnv()` from `@roaring/config/env` (Zod-validated). Copy `lib/.env.example` to `lib/.env.local` in each app. Required vars include Supabase URL/keys, `DATABASE_URL`, and `RESEND_API_KEY`.

### Tech Stack

- **React 19**, **Next.js 16** (App Router, RSC by default), **TypeScript 5** strict mode
- **TailwindCSS 4**, **shadcn/ui** components, **base-ui/react** headless primitives
- **Zod 4** for all validation (forms, env vars, server actions)
- All package imports use the `@roaring/*` workspace alias
