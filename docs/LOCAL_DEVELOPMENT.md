# Local development (Docker Supabase)

Local is the primary environment: a complete Supabase stack (Postgres 17, Auth,
Storage, Realtime, Studio, Mailpit) started by the Supabase CLI in Docker, built
only from `supabase/migrations/` and `supabase/seed.sql`. It never contains real
data and never needs hosted credentials. Destroy and rebuild it freely.

## Prerequisites (Windows)

1. **Virtualisation + WSL 2.** In an _elevated_ PowerShell: `wsl --install`, then
   reboot. (`Get-CimInstance Win32_ComputerSystem` → `HypervisorPresent : True`
   means virtualisation is already available.)
2. **Docker Desktop** — install from docker.com (or `choco install docker-desktop`
   from an elevated prompt), use the WSL 2 backend, start it, and wait for
   "Engine running". Give it ≥ 4 GB memory (Settings → Resources).
3. Check: `docker info` prints a server version.
4. `pnpm install` — the Supabase CLI is a pinned dev dependency (`supabase@2.119.0`);
   no global install is needed.

**Status 2026-10-14 (afternoon):** Docker Desktop 29.8 is installed and the stack is
**verified**: `pnpm db:reset` (3 migrations + seed + checks), `pnpm db fingerprint`
(identical to Staging), `pnpm crm --local`, `pnpm crm --local --test` (35/35), the
`supabase-local` MCP, and a browser pass over every page for every seeded role.

## Network exposure

The Supabase CLI has no bind-address setting: Docker publishes every stack port
(54321 API/MCP, 54322 Postgres with password `postgres`, 54323 Studio, 54324
Mailpit) on **all interfaces**, and Docker Desktop's installer adds an inbound
firewall allow rule for `com.docker.backend.exe`. On a shared or public network
that makes the local DB and Studio reachable from other machines. Fix it once per
machine by making loopback Docker's default publish address — Docker Desktop →
Settings → Docker Engine, add `"ip": "127.0.0.1"`, Apply & restart, then
`pnpm db:stop` and `pnpm db:start`. Check with
`docker ps --format "{{.Names}} {{.Ports}}"`: every port should read
`127.0.0.1:543xx->…`, never `0.0.0.0` or `[::]`.

The platform and admin `dev` scripts pass `--hostname 127.0.0.1`, so `next dev`
listens on loopback only (`Network:` in its banner shows `127.0.0.1`).

## Daily commands

| Command                          | What it does                                                                                                    |
| -------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `pnpm crm --local`               | Starts the stack if needed, verifies it is loopback-only, runs the platform on http://localhost:3000 against it |
| `pnpm crm --dev`                 | Alias for `--local`                                                                                             |
| `pnpm db:start` / `pnpm db:stop` | Start / stop the stack (data kept; `pnpm db stop --purge` deletes it)                                           |
| `pnpm db:status`                 | API, DB, Studio, Mailpit and MCP URLs (never keys)                                                              |
| `pnpm db:reset`                  | Drop and rebuild the local DB from every migration + seed, then run `supabase/checks`                           |
| `pnpm db:migrate`                | Apply pending migrations without a reset                                                                        |
| `pnpm db new <name>`             | New timestamped migration file                                                                                  |
| `pnpm db diff`                   | SQL for app-schema changes you made directly in the local DB                                                    |
| `pnpm db:check`                  | Run `supabase/checks/*.sql` (rolled back)                                                                       |
| `pnpm db fingerprint`            | Compare Local's app schema with the recorded Staging fingerprint                                                |
| `pnpm crm --local --test`        | DB integration tests (`*.int.test.ts`) against Local — also `pnpm test:integration`                             |
| `pnpm db:verify`                 | No Docker: replay all migrations + seed + checks on in-process Postgres 17                                      |

Every local command passes `--local` to the Supabase CLI and refuses `--linked`,
`--db-url` and `--project-ref`. If Docker is missing they stop — they never fall
back to Staging.

Default local URLs (from `supabase/config.toml`): API `http://127.0.0.1:54321`,
DB `127.0.0.1:54322`, Studio `http://127.0.0.1:54323`, Mailpit (catches all auth
email) `http://127.0.0.1:54324`.

## Signing in locally

`pnpm db:reset` creates synthetic staff in the "Roaring Local (synthetic)" tenant.
Password for all: **`local-dev-only`** (local stack only — the seed refuses to run on
any database that already has a tenant).

| Email                                                       | Role        | Notes                                  |
| ----------------------------------------------------------- | ----------- | -------------------------------------- |
| admin@synthetic.invalid                                     | admin       | full access, platform settings         |
| director@synthetic.invalid                                  | director    |                                        |
| manager@synthetic.invalid                                   | manager     | created most seed records              |
| lead.north@synthetic.invalid / lead.south@synthetic.invalid | team_leader | Sales North / South                    |
| alice@ / bob@ / cara@ / dan@ / eve@synthetic.invalid        | agent       | Bob moved North → South 20 days ago    |
| sam@synthetic.invalid                                       | sales       |                                        |
| pia@ / pete@synthetic.invalid                               | agent       | Provisioning team                      |
| pending@synthetic.invalid                                   | agent       | approval pending → `/pending-approval` |
| rejected@synthetic.invalid                                  | agent       | → `/rejected`                          |
| inactive@synthetic.invalid                                  | agent       | suspended → signed out, `/login`¹      |
| outsider@synthetic.invalid                                  | admin       | a second tenant, for isolation checks  |

¹ `requireUser()` redirects to `/login?suspended=true`, but the login form's
`router.push('/home'); router.refresh()` lands on plain `/login`, so the
"suspended" banner is not shown (observed 2026-10-14; the session is still removed).

## Synthetic data

`supabase/seed.sql` is deterministic (fixed UUIDs, md5-derived ids, no `random()`),
with timestamps relative to the reset so "this week/month" views have data. It
contains 120 customers (residential/business, every status), 72 deals over 90 days
with pricing/billing/services, provisioning for each, and these scenarios: BB + WHC,
BB + NFON, MPF broadband + voice, still-applied, delayed then live, cancelled then
retried (attempt 2), can't-provision, marked live then corrected (credit reversal),
not started, router dispatched then returned; welcome calls with retries; faults,
complaints, debts, transfers/ceases and to-dos in every state including reopened
items; invitations (pending/expired/accepted); a team move; legacy deals with only
free-text agent names. Status changes go through the real triggers, so `audit_logs`
and the Stats Board ledger are populated exactly as the app would populate them.
Stats events for services/cases are stamped at reset time (triggers use `now()`);
deal events carry their historical dates.

Only invented values are used: Ofcom drama numbers (07700 900xxx, 01632 960xxx),
`example.com` / `synthetic.invalid` emails, non-existent `ZZ` postcodes, sort code
`00-00-00`. Never copy rows from Staging or Production into Local.

## Local MCP

`.mcp.json` defines `supabase-local` → `http://127.0.0.1:54321/mcp`, the MCP
endpoint the Supabase CLI serves on its API port. Confirm the exact URL with
`pnpm db:status` once the stack runs (it prints the CLI's reported MCP URL, or marks
it "derived" if this CLI version does not report one). MCP changes take effect only
after restarting Claude Code; check with `/mcp`.

## Troubleshooting

| Symptom                                                                | Fix                                                                                                                     |
| ---------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `Docker is not installed` / `engine is not running`                    | Install/start Docker Desktop (above). Local never falls back to a hosted project.                                       |
| `supabase start` hangs on image pulls                                  | First start downloads ~2–3 GB; check proxy/VPN; retry.                                                                  |
| Port 54321–54324 in use                                                | Another stack is running: `pnpm db:stop`, or `docker ps` to find it; ports are in `supabase/config.toml`.               |
| `seed.sql refuses to run: app.tenants is not empty`                    | You ran the seed against a non-empty DB. Use `pnpm db:reset` (drops first).                                             |
| Sign-in "succeeds" but bounces back to /login                          | `app.users.id` must equal the auth user id — re-run `pnpm db:reset`.                                                    |
| `These files are auto-loaded by Next.js and define Supabase variables` | Move `apps/platform/.env.development.local` to `.env.staging.local` and set `CRM_ENV=staging`.                          |
| `CRM_ENV "development" was renamed`                                    | Use `local` or `staging`.                                                                                               |
| Analytics/vector container errors on Windows                           | Analytics is disabled in `config.toml`; re-enable only with Docker's tcp daemon exposed.                                |
| `pnpm db fingerprint` shows differences                                | Expected for migrations not yet on Staging; anything else means Local was changed outside migrations — `pnpm db:reset`. |
| Linked project warning                                                 | `pnpm exec supabase unlink`. Hosted projects are reached only through validated `--db-url` commands.                    |
| Pages show pre-reset data, or routes 404 with Next's default 404 page  | `unstable_cache` and Turbopack state live in `apps/platform/.next` (1 h TTL). Stop the server, delete `.next`, restart. |
| `pnpm db:reset` → `DbSetupError: error running container: exit 1`      | Transient container-restart race in the CLI; run `pnpm db:reset` again.                                                 |
