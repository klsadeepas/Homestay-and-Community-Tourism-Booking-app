-- Demo cloud-sync schema for the Homestay & Community Tourism app.
-- Run this once in the Supabase SQL Editor (Dashboard -> SQL Editor -> New query -> paste -> Run).
-- The whole app shares one jsonb table; each AsyncStorage key becomes one row.

create table if not exists public.app_data (
  data_key text primary key,
  value jsonb,
  updated_at timestamptz not null default now()
);

alter table public.app_data enable row level security;

-- Demo-grade access: anyone holding the project URL + anon key can read/write.
-- Fine for a university demo; tighten policies before any real deployment.
drop policy if exists "demo read" on public.app_data;
create policy "demo read" on public.app_data
  for select to anon, authenticated using (true);

drop policy if exists "demo insert" on public.app_data;
create policy "demo insert" on public.app_data
  for insert to anon, authenticated with check (true);

drop policy if exists "demo update" on public.app_data;
create policy "demo update" on public.app_data
  for update to anon, authenticated using (true) with check (true);

-- Live updates: stream row changes to every connected app instance
-- (Supabase Realtime). Idempotent — safe to re-run. If you skip this, the app
-- still syncs, but only via startup pull + 20s polling instead of ~1s push.
alter table public.app_data replica identity full;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'app_data'
  ) then
    alter publication supabase_realtime add table public.app_data;
  end if;
end $$;
