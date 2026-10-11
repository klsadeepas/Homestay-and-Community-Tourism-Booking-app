-- ============================================================
-- onspace / Homestay & Community Tourism — schema v3 (Storage)
-- ============================================================
-- Paste this whole file into the Supabase dashboard:
--   SQL Editor → New query → Run
--
-- What it does
--   1. Creates a public `media` Storage bucket for images picked from a phone.
--   2. Adds Storage policies so any device the app is installed on can read and
--      write images in that bucket (demo-grade permissive rules, matching the
--      table policies in schema_v2.sql).
--
-- Idempotent: safe to run more than once.
--
-- IMPORTANT — demo security posture
--   These policies let ANY anon key upload/read images, which is acceptable for
--   a university demo but must be tightened before a real deployment: require an
--   authenticated Supabase session and scope writes to the uploader's own folder.

-- 1) Public bucket for images
insert into storage.buckets (id, name, public)
values ('media', 'media', true)
on conflict (id) do update set public = excluded.public;

-- 2) Row-level security on storage.objects
alter table storage.objects enable row level security;

-- Anyone holding the app's anon key can display images.
drop policy if exists "media read" on storage.objects;
create policy "media read"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'media');

-- Anyone holding the app's anon key can upload into the media bucket
-- (this is what makes "pick image from device" work from a member's phone).
drop policy if exists "media insert" on storage.objects;
create policy "media insert"
  on storage.objects for insert
  to anon, authenticated
  with check (bucket_id = 'media');

-- Re-picking a photo for the same path replaces the file.
drop policy if exists "media update" on storage.objects;
create policy "media update"
  on storage.objects for update
  to anon, authenticated
  using (bucket_id = 'media')
  with check (bucket_id = 'media');

drop policy if exists "media delete" on storage.objects;
create policy "media delete"
  on storage.objects for delete
  to anon, authenticated
  using (bucket_id = 'media');

-- 3) Verify
select
  (select name from storage.buckets where id = 'media') as bucket,
  (select count(*) from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname like 'media %') as media_policies;
