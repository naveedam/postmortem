-- Afterwatch v0.7 — run once in Supabase → SQL Editor → New query → Run

create table if not exists action_items (
  id            uuid primary key default gen_random_uuid(),
  team_id       text not null references workspaces(team_id) on delete cascade,
  postmortem_id uuid not null references postmortems(id) on delete cascade,
  priority      text not null default 'P1',
  action        text not null,
  owner         text,
  status        text not null default 'open',      -- open | done
  tracker       text,                              -- linear | github | jira (when pushed)
  external_key  text,                              -- e.g. ENG-142, #57, OPS-9
  external_url  text,
  created_at    timestamptz not null default now(),
  done_at       timestamptz
);
create index if not exists action_items_team_status on action_items (team_id, status, created_at desc);
create index if not exists action_items_postmortem on action_items (postmortem_id);

create table if not exists workspace_settings (
  team_id           text primary key references workspaces(team_id) on delete cascade,
  reminder_channel  text,
  reminders_enabled boolean not null default true,
  tracker           text,          -- linear | github | jira
  tracker_config    text,          -- encrypted JSON (API keys/tokens)
  updated_at        timestamptz not null default now()
);

alter table action_items       enable row level security;
alter table workspace_settings enable row level security;

-- Backfill action items from existing postmortems
insert into action_items (team_id, postmortem_id, priority, action, owner)
select p.team_id, p.id,
       coalesce(a->>'priority', 'P1'), a->>'action', nullif(a->>'owner', '')
from postmortems p
cross join lateral jsonb_array_elements(coalesce(p.data->'actionItems', '[]'::jsonb)) a
where p.team_id is not null
  and not exists (select 1 from action_items x where x.postmortem_id = p.id);
