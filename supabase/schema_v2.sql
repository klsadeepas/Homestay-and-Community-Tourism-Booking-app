-- ============================================================================
-- RootedStay schema v2 — real relational tables (replaces the app_data blob).
--
-- Run ONCE in the Supabase Dashboard: SQL Editor -> New query -> paste -> Run.
-- Idempotent: safe to run again after edits.
--
-- Every collection gets its own table with typed, queryable columns. `payload`
-- holds the complete app object so nested fields round-trip exactly. The app
-- reads/writes these tables directly and subscribes to Realtime on them, so an
-- action taken on any phone appears on every other device within ~1 second.
--
-- The old public.app_data table is kept (wishlist + pre-v2 fallback) and its
-- contents are migrated into the new tables at the bottom of this file.
-- ============================================================================

-- ---------------------------------------------------------------- app_users
create table if not exists public.app_users (
  id            text primary key,
  email         text,
  password      text,
  name          text,
  role          text,
  phone         text,
  photo         text,
  status        text default 'active',
  village       text,
  homestay_name text,
  bio           text,
  created_at    timestamptz default now(),
  recorded_at   timestamptz default now(),
  payload       jsonb not null
);
create unique index if not exists app_users_email_key on public.app_users (lower(email));

-- ----------------------------------------------------------------- villages
create table if not exists public.villages (
  id          text primary key,
  name        text,
  region      text,
  description text,
  photo       text,
  transport   text,
  etiquette   text,
  recorded_at timestamptz default now(),
  payload     jsonb not null
);

-- ----------------------------------------------------------------- listings
create table if not exists public.listings (
  id                 text primary key,
  type               text,
  owner_id           text,
  village_id         text,
  title              text,
  description        text,
  photo              text,
  price_per_unit_lkr numeric,
  capacity           int,
  rooms              int,
  rating             numeric(3,2),
  review_count       int,
  status             text default 'draft',
  duration           text,
  difficulty         text,
  meeting_point      text,
  tour_category      text,
  experience_category text,
  season_info        text,
  instant_booking    boolean,
  review_reason      text,
  created_at         timestamptz default now(),
  recorded_at        timestamptz default now(),
  payload            jsonb not null
);
create index if not exists listings_owner_id_idx on public.listings (owner_id);
create index if not exists listings_village_id_idx on public.listings (village_id);
create index if not exists listings_status_idx on public.listings (status);

-- ----------------------------------------------------------------- bookings
create table if not exists public.bookings (
  id             text primary key,
  listing_id     text,
  traveler_id    text,
  date_from      date,
  date_to        date,
  guests         int,
  rooms          int,
  total_lkr      numeric,
  status         text default 'pending',
  note           text,
  check_in       text,
  payment_status text,
  payment_method text,
  payment_ref    text,
  paid_at        timestamptz,
  created_at     timestamptz default now(),
  recorded_at    timestamptz default now(),
  payload        jsonb not null
);
create index if not exists bookings_traveler_id_idx on public.bookings (traveler_id);
create index if not exists bookings_listing_id_idx on public.bookings (listing_id);
create index if not exists bookings_status_idx on public.bookings (status);

-- ------------------------------------------------------------------ reviews
create table if not exists public.reviews (
  id          text primary key,
  listing_id  text,
  traveler_id text,
  booking_id  text,
  rating      int,
  body        text,
  hidden      boolean default false,
  created_at  timestamptz default now(),
  recorded_at timestamptz default now(),
  payload     jsonb not null
);
create index if not exists reviews_listing_id_idx on public.reviews (listing_id);

-- ------------------------------------------------------------------- events
create table if not exists public.events (
  id          text primary key,
  village_id  text,
  title       text,
  date_from   date,
  date_to     date,
  description text,
  capacity    int,
  photo       text,
  status      text default 'draft',
  audience    text,
  location    text,
  type        text,
  author_id   text,
  recorded_at timestamptz default now(),
  payload     jsonb not null
);

-- ------------------------------------------------------------ announcements
create table if not exists public.announcements (
  id          text primary key,
  village_id  text,
  title       text,
  body        text,
  audience    text,
  urgent      boolean default false,
  author_id   text,
  created_at  timestamptz default now(),
  recorded_at timestamptz default now(),
  payload     jsonb not null
);

-- -------------------------------------------------------------- chat_threads
create table if not exists public.chat_threads (
  id           text primary key,
  participants text[],
  listing_id   text,
  booking_id   text,
  last_message text,
  updated_at   timestamptz,
  recorded_at  timestamptz default now(),
  payload      jsonb not null
);

-- ------------------------------------------------------------- chat_messages
create table if not exists public.chat_messages (
  id           text primary key,
  thread_id    text,
  sender_id    text,
  recipient_id text,
  body         text,
  created_at   timestamptz default now(),
  recorded_at  timestamptz default now(),
  payload      jsonb not null
);
create index if not exists chat_messages_thread_id_idx on public.chat_messages (thread_id);

-- ------------------------------------------------------------- notifications
create table if not exists public.notifications (
  id          text primary key,
  user_id     text,
  title       text,
  body        text,
  read        boolean default false,
  type        text,
  link        text,
  created_at  timestamptz default now(),
  recorded_at timestamptz default now(),
  payload     jsonb not null
);
create index if not exists notifications_user_id_idx on public.notifications (user_id);

-- ----------------------------------------------------------------- audit_log
-- Append-only. Each device inserts its own row, so activity from many phones can
-- never overwrite each other the way the old single-blob log did.
create table if not exists public.audit_log (
  id          text primary key,
  actor_id    text,
  action      text,
  target      text,
  reason      text,
  created_at  timestamptz default now(),
  recorded_at timestamptz default now(),
  payload     jsonb not null
);
create index if not exists audit_log_recorded_at_idx on public.audit_log (recorded_at desc);
create index if not exists audit_log_actor_id_idx on public.audit_log (actor_id);

-- ------------------------------------------------------------------- reports
create table if not exists public.reports (
  id          text primary key,
  reporter_id text,
  target_type text,
  target_id   text,
  reason      text,
  status      text default 'open',
  created_at  timestamptz default now(),
  recorded_at timestamptz default now(),
  payload     jsonb not null
);

-- ------------------------------------------------------------- transport_info
create table if not exists public.transport_info (
  id             text primary key,
  village_id     text,
  name           text,
  mode           text,
  operating_area text,
  contact_method text,
  availability   text,
  accessibility  text,
  est_fare_lkr   numeric,
  note           text,
  recorded_at    timestamptz default now(),
  payload        jsonb not null
);

-- ----------------------------------------------------------- pickup_requests
create table if not exists public.pickup_requests (
  id            text primary key,
  booking_id    text,
  traveler_id   text,
  pickup_from   text,
  date_time     text,
  passengers    int,
  accessibility text,
  note          text,
  status        text default 'requested',
  response      text,
  responder_id  text,
  created_at    timestamptz default now(),
  recorded_at   timestamptz default now(),
  payload       jsonb not null
);

-- -------------------------------------------------------------- arrival_info
-- Keyed by booking_id (one arrival sheet per booking), so no id column.
create table if not exists public.arrival_info (
  booking_id           text primary key,
  traveler_eta         text,
  traveler_method      text,
  host_check_in_window text,
  host_meeting_point   text,
  acknowledged         boolean default false,
  updated_at           timestamptz default now(),
  payload              jsonb not null
);

-- -------------------------------------------------------- responsible_guides
create table if not exists public.responsible_guides (
  id          text primary key,
  village_id  text,
  topic       text,
  title       text,
  body        text,
  status      text default 'draft',
  reviewed_by text,
  reviewed_at timestamptz,
  updated_at  timestamptz,
  recorded_at timestamptz default now(),
  payload     jsonb not null
);

-- ------------------------------------------------------- seasonal_highlights
create table if not exists public.seasonal_highlights (
  id          text primary key,
  village_id  text,
  title       text,
  type        text,
  description text,
  date_from   text,
  date_to     text,
  recurring   boolean,
  photo       text,
  recorded_at timestamptz default now(),
  payload     jsonb not null
);

-- ---------------------------------------------------------------------- faqs
create table if not exists public.faqs (
  id          text primary key,
  question    text,
  answer      text,
  category    text,
  published   boolean default true,
  sort_order  int default 0,
  recorded_at timestamptz default now(),
  payload     jsonb not null
);

-- ----------------------------------------------------------- support_tickets
create table if not exists public.support_tickets (
  id          text primary key,
  user_id     text,
  subject     text,
  category    text,
  message     text,
  status      text default 'open',
  priority    text default 'normal',
  replies     jsonb default '[]'::jsonb,
  created_at  timestamptz default now(),
  recorded_at timestamptz default now(),
  payload     jsonb not null
);

-- ----------------------------------------------------------- platform_config
create table if not exists public.platform_config (
  id                  text primary key default 'platform',
  service_fee_pct     numeric default 5,
  booking_notice_days int default 1,
  maintenance_mode    boolean default false,
  support_email       text,
  recorded_at         timestamptz default now(),
  payload             jsonb not null
);

-- ============================================================================
-- Row Level Security — demo-grade: anyone holding the project URL + anon key can
-- read and write, matching the previous app_data policies. Tighten this to real
-- Supabase Auth before any production deployment (passwords are stored plain).
-- ============================================================================
do $$
declare t text;
begin
  foreach t in array array[
    'app_users','villages','listings','bookings','reviews','events','announcements',
    'chat_threads','chat_messages','notifications','audit_log','reports','transport_info',
    'pickup_requests','arrival_info','responsible_guides','seasonal_highlights','faqs',
    'support_tickets','platform_config'
  ] loop
    execute format('alter table public.%I enable row level security;', t);
    execute format('drop policy if exists "demo read" on public.%I;', t);
    execute format('create policy "demo read" on public.%I for select to anon, authenticated using (true);', t);
    execute format('drop policy if exists "demo insert" on public.%I;', t);
    execute format('create policy "demo insert" on public.%I for insert to anon, authenticated with check (true);', t);
    execute format('drop policy if exists "demo update" on public.%I;', t);
    execute format('create policy "demo update" on public.%I for update to anon, authenticated using (true) with check (true);', t);
    execute format('drop policy if exists "demo delete" on public.%I;', t);
    execute format('create policy "demo delete" on public.%I for delete to anon, authenticated using (true);', t);
    -- Full old-row image in DELETE events, which Realtime listeners need.
    execute format('alter table public.%I replica identity full;', t);
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I;', t);
    end if;
  end loop;
end $$;

-- ============================================================================
-- One-time migration: move everything already inside the app_data blobs into the
-- real tables, so registrations, bookings and admin history already on the
-- dashboard survive the switch. Rows that already exist are left untouched.
-- ============================================================================
do $$
declare
  v_key      text;
  v_table    text;
  v_ts_field text;
begin
  if to_regclass('public.app_data') is null then
    raise notice 'no app_data table — nothing to migrate';
    return;
  end if;

  for v_key, v_table, v_ts_field in
    select k, t, f from (values
      ('rs_users','app_users','createdAt'),
      ('rs_listings','listings','createdAt'),
      ('rs_bookings','bookings','createdAt'),
      ('rs_reviews','reviews','createdAt'),
      ('rs_events','events','createdAt'),
      ('rs_announcements','announcements','createdAt'),
      ('rs_threads','chat_threads','updatedAt'),
      ('rs_messages','chat_messages','createdAt'),
      ('rs_notifications','notifications','createdAt'),
      ('rs_audit','audit_log','createdAt'),
      ('rs_reports','reports','createdAt'),
      ('rs_transport','transport_info','createdAt'),
      ('rs_pickups','pickup_requests','createdAt'),
      ('rs_responsible','responsible_guides','updatedAt'),
      ('rs_seasonal','seasonal_highlights','createdAt'),
      ('rs_faqs','faqs','createdAt'),
      ('rs_tickets','support_tickets','createdAt'),
      ('rs_villages','villages','createdAt')
    ) as m(k, t, f)
  loop
    execute format(
      'with src as (
         select x as item
         from (select value from public.app_data
                where data_key = $1 and jsonb_typeof(value) = ''array'') b,
              jsonb_array_elements(b.value) as x
       )
       insert into public.%I (id, recorded_at, payload)
       select item->>''id'',
              coalesce(nullif(item ->> $2, '''')::timestamptz, now()),
              item
       from src
       where coalesce(item->>''id'', '''') <> ''''
       on conflict (id) do nothing',
      v_table) using v_key, v_ts_field;
  end loop;

  -- arrival_info is keyed by bookingId and has no id field.
  with src as (
    select x as item
    from (select value from public.app_data
           where data_key = 'rs_arrivals' and jsonb_typeof(value) = 'array') b,
         jsonb_array_elements(b.value) as x
  )
  insert into public.arrival_info (booking_id, payload)
  select item->>'bookingId', item from src
  where coalesce(item->>'bookingId', '') <> ''
  on conflict (booking_id) do nothing;

  -- platform_config is a single object, not an array.
  insert into public.platform_config (id, service_fee_pct, booking_notice_days, maintenance_mode, support_email, recorded_at, payload)
  select 'platform',
         coalesce((p->>'serviceFeePct')::numeric, 5),
         coalesce((p->>'bookingNoticeDays')::numeric, 1)::int,
         coalesce((p->>'maintenanceMode')::boolean, false),
         p->>'supportEmail',
         now(), p
  from (select value as p from public.app_data
        where data_key = 'rs_platform' and jsonb_typeof(value) = 'object') s
  on conflict (id) do nothing;
exception when others then
  raise notice 'app_data migration skipped or partial: %', sqlerrm;
end $$;

-- ============================================================================
-- Backfill typed columns from payload. Runs on every execution, so rows created
-- by an older app build (payload only) get their columns filled in too.
-- ============================================================================
update public.app_users set
  email = payload->>'email', password = payload->>'password', name = payload->>'name',
  role = payload->>'role', phone = payload->>'phone', photo = payload->>'photo',
  status = coalesce(payload->>'status','active'), village = payload->>'village',
  homestay_name = payload->>'homestayName', bio = payload->>'bio'
where payload ? 'email';

update public.villages set
  name = payload->>'name', region = payload->>'region', description = payload->>'description',
  photo = payload->>'photo', transport = payload->>'transport', etiquette = payload->>'etiquette'
where payload ? 'name';

update public.listings set
  type = payload->>'type', owner_id = payload->>'ownerId', village_id = payload->>'villageId',
  title = payload->>'title', description = payload->>'description', photo = payload->>'photo',
  price_per_unit_lkr = nullif(payload->>'pricePerUnitLKR','')::numeric,
  capacity = nullif(payload->>'capacity','')::int,
  rooms = nullif(payload->>'rooms','')::int,
  rating = nullif(payload->>'rating','')::numeric,
  review_count = nullif(payload->>'reviewCount','')::int,
  status = coalesce(payload->>'status','draft'), duration = payload->>'duration',
  difficulty = payload->>'difficulty', meeting_point = payload->>'meetingPoint',
  tour_category = payload->>'tourCategory', experience_category = payload->>'experienceCategory',
  season_info = payload->>'seasonInfo',
  instant_booking = nullif(payload->>'instantBooking','')::boolean,
  review_reason = payload->>'reviewReason'
where payload ? 'title';

update public.bookings set
  listing_id = payload->>'listingId', traveler_id = payload->>'travelerId',
  date_from = nullif(payload->>'dateFrom','')::date,
  date_to = nullif(payload->>'dateTo','')::date,
  guests = nullif(payload->>'guests','')::int,
  rooms = nullif(payload->>'rooms','')::int,
  total_lkr = nullif(payload->>'totalLKR','')::numeric,
  status = coalesce(payload->>'status','pending'),
  note = payload->>'note', check_in = payload->>'checkIn',
  payment_status = payload->>'paymentStatus', payment_method = payload->>'paymentMethod',
  payment_ref = payload->>'paymentRef',
  paid_at = nullif(payload->>'paidAt','')::timestamptz
where payload ? 'travelerId';

update public.reviews set
  listing_id = payload->>'listingId', traveler_id = payload->>'travelerId',
  booking_id = payload->>'bookingId',
  rating = nullif(payload->>'rating','')::int, body = payload->>'text',
  hidden = coalesce((payload->>'hidden')::boolean, false)
where payload ? 'listingId';

update public.events set
  village_id = payload->>'villageId', title = payload->>'title',
  date_from = nullif(payload->>'dateFrom','')::date,
  date_to = nullif(payload->>'dateTo','')::date,
  description = payload->>'description',
  capacity = nullif(payload->>'capacity','')::int,
  photo = payload->>'photo', status = coalesce(payload->>'status','draft'),
  audience = payload->>'audience', location = payload->>'location',
  type = payload->>'type', author_id = payload->>'authorId'
where payload ? 'title' and payload ? 'dateFrom';

update public.announcements set
  village_id = payload->>'villageId', title = payload->>'title', body = payload->>'body',
  audience = payload->>'audience',
  urgent = coalesce((payload->>'urgent')::boolean, false),
  author_id = payload->>'authorId'
where payload ? 'audience';

update public.chat_threads set
  participants = coalesce((select array_agg(e) from jsonb_array_elements_text(payload->'participants') e), '{}'),
  listing_id = payload->>'listingId', booking_id = payload->>'bookingId',
  last_message = payload->>'lastMessage',
  updated_at = nullif(payload->>'updatedAt','')::timestamptz
where payload ? 'participants';

update public.chat_messages set
  thread_id = payload->>'threadId', sender_id = payload->>'from',
  recipient_id = payload->>'to', body = payload->>'text'
where payload ? 'threadId';

update public.notifications set
  user_id = payload->>'userId', title = payload->>'title', body = payload->>'body',
  read = coalesce((payload->>'read')::boolean, false),
  type = payload->>'type', link = payload->>'link'
where payload ? 'userId';

update public.audit_log set
  actor_id = payload->>'actorId', action = payload->>'action',
  target = payload->>'target', reason = payload->>'reason'
where payload ? 'action';

update public.reports set
  reporter_id = payload->>'reporterId', target_type = payload->>'targetType',
  target_id = payload->>'targetId', reason = payload->>'reason',
  status = coalesce(payload->>'status','open')
where payload ? 'reporterId';

update public.transport_info set
  village_id = payload->>'villageId', name = payload->>'name', mode = payload->>'mode',
  operating_area = payload->>'operatingArea', contact_method = payload->>'contactMethod',
  availability = payload->>'availability', accessibility = payload->>'accessibility',
  est_fare_lkr = nullif(payload->>'estFareLKR','')::numeric, note = payload->>'note'
where payload ? 'operatingArea';

update public.pickup_requests set
  booking_id = payload->>'bookingId', traveler_id = payload->>'travelerId',
  pickup_from = payload->>'pickupFrom', date_time = payload->>'dateTime',
  passengers = nullif(payload->>'passengers','')::int,
  accessibility = payload->>'accessibility', note = payload->>'note',
  status = coalesce(payload->>'status','requested'), response = payload->>'response',
  responder_id = payload->>'responderId'
where payload ? 'pickupFrom';

update public.arrival_info set
  traveler_eta = payload->>'travelerEta', traveler_method = payload->>'travelerMethod',
  host_check_in_window = payload->>'hostCheckInWindow',
  host_meeting_point = payload->>'hostMeetingPoint',
  acknowledged = coalesce((payload->>'acknowledged')::boolean, false)
where booking_id is not null;

update public.responsible_guides set
  village_id = payload->>'villageId', topic = payload->>'topic', title = payload->>'title',
  body = payload->>'body', status = coalesce(payload->>'status','draft'),
  reviewed_by = payload->>'reviewedBy',
  reviewed_at = nullif(payload->>'reviewedAt','')::timestamptz,
  updated_at = nullif(payload->>'updatedAt','')::timestamptz
where payload ? 'topic';

update public.seasonal_highlights set
  village_id = payload->>'villageId', title = payload->>'title', type = payload->>'type',
  description = payload->>'description', date_from = payload->>'dateFrom',
  date_to = payload->>'dateTo',
  recurring = (payload->>'recurring')::boolean, photo = payload->>'photo'
where payload ? 'type';

update public.faqs set
  question = payload->>'question', answer = payload->>'answer', category = payload->>'category',
  published = coalesce((payload->>'published')::boolean, true),
  sort_order = coalesce((payload->>'order')::int, 0)
where payload ? 'question';

update public.support_tickets set
  user_id = payload->>'userId', subject = payload->>'subject', category = payload->>'category',
  message = payload->>'message', status = coalesce(payload->>'status','open'),
  priority = coalesce(payload->>'priority','normal'),
  replies = coalesce(payload->'replies', '[]'::jsonb)
where payload ? 'subject';

update public.platform_config set
  service_fee_pct = coalesce((payload->>'serviceFeePct')::numeric, service_fee_pct),
  booking_notice_days = coalesce((payload->>'bookingNoticeDays')::int, booking_notice_days),
  maintenance_mode = coalesce((payload->>'maintenanceMode')::boolean, maintenance_mode),
  support_email = coalesce(payload->>'supportEmail', support_email);

-- ============================================================================
-- Done. Check it worked:
--   select count(*) from public.audit_log;
--   select count(*) from public.app_users;
--   select count(*) from public.bookings;
-- Leave public.app_data in place: APKs built before this change still use it.
-- ============================================================================
