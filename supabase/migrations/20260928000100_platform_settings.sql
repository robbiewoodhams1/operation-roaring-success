-- 0001 — Platform settings: dashboard-editable overrides for app.config.json.
--
-- Formerly packages/db/migrations/0001_platform_settings.sql, which was run by
-- hand in the Supabase SQL editor (Staging on 2026-10-13; whether Production
-- has it is unverified — check before recording it as applied there).
-- Idempotent. Until it exists, getSettings() falls back to the JSON defaults,
-- so the app keeps working either way.

create table if not exists app.platform_settings (
  id         boolean primary key default true,
  settings   jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by uuid references app.users (id),

  -- Pins the table to a single row: the only allowed key is `true`.
  constraint platform_settings_single_row check (id)
);

insert into app.platform_settings (id, settings)
values (true, '{}'::jsonb)
on conflict (id) do nothing;

-- Settings are global (not tenant-scoped) because the sign-in and password
-- pages render before any session exists, so no tenant is known there.
-- Reads go through the server-side helper; only admins can write.
alter table app.platform_settings enable row level security;

drop policy if exists platform_settings_read on app.platform_settings;
create policy platform_settings_read
  on app.platform_settings
  for select
  using (true);

drop policy if exists platform_settings_write on app.platform_settings;
create policy platform_settings_write
  on app.platform_settings
  for update
  using (
    exists (
      select 1 from app.users u
      where u.id = auth.uid() and u.role = 'admin'
    )
  );
