# @roaring/platform

The main user-facing Next.js application. This is the primary product surface — what end users interact with.

## Stack

- **Framework**: Next.js 16 (App Router)
- **React**: 19
- **Styling**: TailwindCSS 4
- **Auth / DB**: Supabase
- **Language**: TypeScript (strict)

## Getting Started

```bash
# From the monorepo root
pnpm install

# Copy the env template and fill in your Supabase credentials
cp lib/.env.example .env.local

# Start the dev server
pnpm --filter @roaring/platform dev
```

Runs on **http://localhost:3000**.

## Environment Variables

Copy `lib/.env.example` to `.env.local` and set:

| Variable                        | Description                                                  |
| ------------------------------- | ------------------------------------------------------------ |
| `NEXT_PUBLIC_SUPABASE_URL`      | Supabase project URL                                         |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Anon key (safe to expose in browser)                         |
| `SUPABASE_SERVICE_ROLE_KEY`     | Service role key — server-side only, never expose publicly   |
| `NEXT_PUBLIC_APP_URL`           | Public URL of this app (defaults to `http://localhost:3000`) |

All variables are validated at startup via `@roaring/config/env` using Zod. The app will throw on launch if any required variable is missing or malformed.

## Scripts

| Command           | Description                   |
| ----------------- | ----------------------------- |
| `pnpm dev`        | Start dev server on port 3000 |
| `pnpm build`      | Production build              |
| `pnpm start`      | Start production server       |
| `pnpm lint`       | Run ESLint                    |
| `pnpm type-check` | TypeScript type checking      |

## Key Files

| Path               | Description                             |
| ------------------ | --------------------------------------- |
| `app/layout.tsx`   | Root layout (fonts, global styles)      |
| `app/page.tsx`     | Homepage                                |
| `app/globals.css`  | Global CSS (Tailwind base)              |
| `lib/env.ts`       | Typed env config (validated at startup) |
| `lib/.env.example` | Environment variable template           |
| `next.config.ts`   | Next.js configuration                   |

## Shared Packages

This app consumes all workspace packages:

- `@roaring/algorithms` — business logic
- `@roaring/auth` — authentication helpers
- `@roaring/config` — TypeScript, ESLint, env validation
- `@roaring/db` — database client and schema
- `@roaring/telephony` — telephony integration
- `@roaring/ui` — shared UI components
