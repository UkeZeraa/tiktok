-- UkeZaraa Studio: tabelas do agendamento.
-- Rode uma vez no Supabase: SQL Editor > New query > cole tudo > Run.

-- Contas conectadas (as chaves ficam criptografadas pelo site com TOKEN_KEY).
create table if not exists public.accounts (
  platform   text primary key check (platform in ('tiktok', 'instagram', 'youtube')),
  label      text,
  picture    text,
  secret     text not null,
  updated_at timestamptz not null default now()
);

-- Fila de publicações.
create table if not exists public.posts (
  id            uuid primary key default gen_random_uuid(),
  scheduled_at  timestamptz not null,
  status        text not null default 'scheduled'
                check (status in ('scheduled', 'running', 'done', 'partial', 'error', 'canceled')),
  title         text not null default '',
  description   text not null default '',
  tags          text[] not null default '{}',
  ai            boolean not null default true,
  video_url     text not null,
  video_name    text,
  cover_url     text,
  comment       text,                                 -- comentário do canal publicado logo após o post (fixar pelo app)
  platforms     jsonb not null default '{}'::jsonb,  -- { "tiktok": {...opções}, "instagram": {...}, "youtube": {...} }
  results       jsonb not null default '{}'::jsonb,  -- { "tiktok": { "state": "ok", "msg": "...", "link": "..." }, ... }
  attempts      int not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists posts_due_idx on public.posts (status, scheduled_at);

-- Só o servidor (chave service_role) acessa. Ninguém lê pelo navegador.
alter table public.accounts enable row level security;
alter table public.posts enable row level security;
revoke all on public.accounts from anon, authenticated;
revoke all on public.posts from anon, authenticated;

-- Atualização de 26/11 (rode também se as tabelas já existiam):
alter table public.posts add column if not exists comment text;
