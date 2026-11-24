-- Run once in Supabase → SQL Editor → New query → Run
create table if not exists workspaces (
  team_id      text primary key,
  team_name    text,
  bot_token    text not null,
  bot_user_id  text,
  installed_by text,
  plan         text not null default 'free',
  installed_at timestamptz not null default now()
);

create table if not exists postmortems (
  id          uuid primary key default gen_random_uuid(),
  slug        text unique not null,
  team_id     text references workspaces(team_id) on delete cascade,
  channel_id  text,
  thread_ts   text,
  created_by  text,
  title       text not null,
  severity    text,
  data        jsonb not null,
  markdown    text not null,
  source      text not null default 'slack',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists postmortems_team_created on postmortems (team_id, created_at desc);

-- Server uses the service-role key only. RLS on with no policies = no public access via anon key.
alter table workspaces  enable row level security;
alter table postmortems enable row level security;

-- v0.7 tables: see migration-002-actions.sql
