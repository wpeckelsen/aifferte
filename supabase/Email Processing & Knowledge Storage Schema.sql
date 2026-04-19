-- Run this in your Supabase SQL editor (Dashboard → SQL Editor → New query)

create table if not exists processed_emails (
  email_id     text        not null,
  workspace_id text        not null,
  processed_at timestamptz not null default now(),
  primary key (email_id, workspace_id)
);

create index if not exists processed_emails_workspace_idx
  on processed_emails (workspace_id);

-- ---------------------------------------------------------------------------

create table if not exists email_processing_snapshots (
  email_id      text        not null,
  workspace_id  text        not null,
  provider      text        not null,
  state         text        not null,
  attempt_count int         not null default 0,
  last_error    text,
  updated_at    timestamptz not null default now(),
  primary key (email_id, workspace_id)
);

create index if not exists email_processing_snapshots_workspace_idx
  on email_processing_snapshots (workspace_id);

-- ---------------------------------------------------------------------------

create table if not exists email_processing_events (
  id           uuid        not null default gen_random_uuid(),
  email_id     text        not null,
  workspace_id text        not null,
  from_state   text        not null,
  to_state     text        not null,
  at           timestamptz not null default now(),
  metadata     jsonb,
  primary key (id)
);

create index if not exists email_processing_events_email_idx
  on email_processing_events (email_id);

create index if not exists email_processing_events_workspace_idx
  on email_processing_events (workspace_id);

-- ---------------------------------------------------------------------------

create table if not exists knowledge_chunks (
  id           text    not null,
  workspace_id text    not null,
  title        text    not null,
  content      text    not null,
  tags         text[]  not null default '{}',
  source       text,
  primary key (id, workspace_id)
);

create index if not exists knowledge_chunks_workspace_idx
  on knowledge_chunks (workspace_id);

create index if not exists knowledge_chunks_tags_idx
  on knowledge_chunks using gin (tags);

-- ---------------------------------------------------------------------------
-- Enable Row Level Security on all tables (recommended even with a secret key)

alter table processed_emails              enable row level security;
alter table email_processing_snapshots    enable row level security;
alter table email_processing_events       enable row level security;
alter table knowledge_chunks              enable row level security;
