-- SentinelEye database schema (Supabase / PostgreSQL 15+)
-- Run once in the Supabase SQL editor: Dashboard -> SQL Editor -> New query -> paste -> Run.
--
-- Design
--   alerts          current state of each case (updatable: status changes)
--   ledger_blocks   evidence hash chain, APPEND-ONLY (updates and deletes are rejected)
--   chain_anchors   chain-head anchors, APPEND-ONLY
--   zones           protected-zone boundaries with a PostGIS geometry
--   alert_zone_check  view: is each alert point inside its zone? (PostGIS)
--
-- Security model for this prototype: the browser uses the public anon key. Row-level security
-- allows anon to read and insert, to update alerts, and never to update or delete evidence.
-- Production would use Supabase Auth with per-role policies.

create extension if not exists postgis;

-- ── alerts ────────────────────────────────────────────────────────────────
create table if not exists public.alerts (
  id           bigint primary key,
  zone_id      integer,
  zone_name    text,
  class        text,
  severity     text,
  status       text,
  lat          double precision,
  lng          double precision,
  area_m2      double precision,
  overlap_pct  double precision,
  data_source  text,
  is_real_scene boolean default false,
  t0_scene_id  text,
  t1_scene_id  text,
  data         jsonb not null,             -- full alert record incl. audit trail
  created_at   timestamptz,
  updated_at   timestamptz not null default now(),
  geom         geometry(Point, 4326)
);

create or replace function public.alerts_set_geom() returns trigger language plpgsql as $$
begin
  if new.lat is not null and new.lng is not null then
    new.geom := ST_SetSRID(ST_MakePoint(new.lng, new.lat), 4326);
  end if;
  new.updated_at := now();
  return new;
end $$;
drop trigger if exists alerts_set_geom on public.alerts;
create trigger alerts_set_geom before insert or update on public.alerts
  for each row execute function public.alerts_set_geom();

-- ── ledger_blocks (append-only evidence chain) ────────────────────────────
create table if not exists public.ledger_blocks (
  chain_id    text not null,                -- hash of the chain's genesis block
  idx         integer not null,
  type        text not null,
  ts          timestamptz,
  operator    text,
  prev_hash   text not null,
  hash        text not null,
  signature   text,
  public_key  text,
  payload     jsonb not null,
  manifest    jsonb,
  received_at timestamptz not null default now(),
  primary key (chain_id, idx)
);
create index if not exists ledger_blocks_hash on public.ledger_blocks (hash);

create or replace function public.reject_change() returns trigger language plpgsql as $$
begin
  raise exception 'Evidence records are append-only: % is not allowed on %', tg_op, tg_table_name;
end $$;
drop trigger if exists ledger_blocks_append_only on public.ledger_blocks;
create trigger ledger_blocks_append_only before update or delete on public.ledger_blocks
  for each row execute function public.reject_change();

-- ── chain_anchors (append-only) ───────────────────────────────────────────
create table if not exists public.chain_anchors (
  id           bigserial primary key,
  chain_id     text not null,
  head_hash    text not null,
  block_index  integer not null,
  anchored_at  timestamptz not null default now(),
  unique (chain_id, head_hash)
);
drop trigger if exists chain_anchors_append_only on public.chain_anchors;
create trigger chain_anchors_append_only before update or delete on public.chain_anchors
  for each row execute function public.reject_change();

-- ── zones (PostGIS) ───────────────────────────────────────────────────────
create table if not exists public.zones (
  id          integer primary key,
  code        text,
  name        text not null,
  risk_level  text,
  geojson     jsonb not null,
  geom        geometry(Geometry, 4326),
  area_m2     double precision
);

create or replace function public.zones_set_geom() returns trigger language plpgsql as $$
begin
  new.geom := ST_SetSRID(ST_GeomFromGeoJSON((coalesce(new.geojson->'geometry', new.geojson))::text), 4326);
  new.area_m2 := ST_Area(new.geom::geography);
  return new;
end $$;
drop trigger if exists zones_set_geom on public.zones;
create trigger zones_set_geom before insert or update on public.zones
  for each row execute function public.zones_set_geom();

-- Spatial check done by the database: is each alert inside its protected zone?
create or replace view public.alert_zone_check with (security_invoker = true) as
select a.id as alert_id, a.zone_id, z.name as zone_name, a.status, a.severity,
       ST_Contains(z.geom, a.geom) as inside_zone,
       round(ST_Distance(z.geom::geography, a.geom::geography)::numeric, 1) as distance_outside_m
from public.alerts a
join public.zones z on z.id = a.zone_id;

-- ── row-level security ────────────────────────────────────────────────────
alter table public.alerts         enable row level security;
alter table public.ledger_blocks  enable row level security;
alter table public.chain_anchors  enable row level security;
alter table public.zones          enable row level security;

drop policy if exists "read alerts" on public.alerts;
drop policy if exists "insert alerts" on public.alerts;
drop policy if exists "update alerts" on public.alerts;
create policy "read alerts"   on public.alerts for select to anon, authenticated using (true);
create policy "insert alerts" on public.alerts for insert to anon, authenticated with check (true);
create policy "update alerts" on public.alerts for update to anon, authenticated using (true) with check (true);

drop policy if exists "read ledger" on public.ledger_blocks;
drop policy if exists "append ledger" on public.ledger_blocks;
create policy "read ledger"   on public.ledger_blocks for select to anon, authenticated using (true);
create policy "append ledger" on public.ledger_blocks for insert to anon, authenticated with check (true);

drop policy if exists "read anchors" on public.chain_anchors;
drop policy if exists "append anchors" on public.chain_anchors;
create policy "read anchors"   on public.chain_anchors for select to anon, authenticated using (true);
create policy "append anchors" on public.chain_anchors for insert to anon, authenticated with check (true);

drop policy if exists "read zones" on public.zones;
drop policy if exists "upsert zones" on public.zones;
drop policy if exists "update zones" on public.zones;
create policy "read zones"   on public.zones for select to anon, authenticated using (true);
create policy "upsert zones" on public.zones for insert to anon, authenticated with check (true);
create policy "update zones" on public.zones for update to anon, authenticated using (true) with check (true);

grant select, insert, update on public.alerts to anon, authenticated;
grant select, insert on public.ledger_blocks, public.chain_anchors to anon, authenticated;
grant usage, select on sequence public.chain_anchors_id_seq to anon, authenticated;
grant select, insert, update on public.zones to anon, authenticated;
grant select on public.alert_zone_check to anon, authenticated;
