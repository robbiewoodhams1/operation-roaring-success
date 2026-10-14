-- Minimal stand-in for the parts of a Supabase database that the `app`
-- migrations and seed touch. Used ONLY by the Docker-free replay harness
-- (packages/db-tools/scripts/replay.ts) on an in-process PGlite database.
--
-- It is not Supabase: no GoTrue, PostgREST, Storage or real JWT handling. The
-- real local stack (`pnpm db:start`) provides all of this for real; never load
-- this file into a Supabase database.

create role anon nologin noinherit;
create role authenticated nologin noinherit;
create role service_role nologin noinherit bypassrls;

create schema auth;
create schema extensions;
create extension if not exists pgcrypto with schema extensions;

-- Same claim lookups Supabase defines; replay runs never set the claims.
create function auth.uid() returns uuid language sql stable as $$
  select nullif(coalesce(current_setting('request.jwt.claim.sub', true),
                         (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')), '')::uuid
$$;
create function auth.role() returns text language sql stable as $$
  select nullif(coalesce(current_setting('request.jwt.claim.role', true),
                         (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role')), '')::text
$$;

-- Only the columns supabase/seed.sql writes; real auth.users has many more.
create table auth.users (
  instance_id                uuid,
  id                         uuid primary key,
  aud                        varchar(255),
  role                       varchar(255),
  email                      varchar(255),
  encrypted_password         varchar(255),
  email_confirmed_at         timestamptz,
  raw_app_meta_data          jsonb,
  raw_user_meta_data         jsonb,
  created_at                 timestamptz,
  updated_at                 timestamptz,
  confirmation_token         varchar(255),
  email_change               varchar(255),
  email_change_token_new     varchar(255),
  recovery_token             varchar(255)
);

create table auth.identities (
  provider_id     text not null,
  user_id         uuid not null references auth.users (id) on delete cascade,
  identity_data   jsonb not null,
  provider        text not null,
  last_sign_in_at timestamptz,
  created_at      timestamptz,
  updated_at      timestamptz,
  id              uuid primary key default gen_random_uuid(),
  unique (provider_id, provider)
);
