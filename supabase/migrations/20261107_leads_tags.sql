-- Lead groups/sources (owner decisions 2026-11-07): event, shop-customer,
-- social, website + src:<value>. Used by Admin → Leads and the monthly report.
alter table public.leads add column if not exists tags text[] not null default '{}';
create index if not exists leads_tags_idx on public.leads using gin (tags);
