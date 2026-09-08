-- Bring a fresh project in sync with the tables and columns used by the
-- current Employee, HR, and Super Admin portals. No application data is copied.

alter table public.profiles
  add column if not exists employee_email text,
  add column if not exists is_active boolean not null default true;

alter table public.payslips
  add column if not exists published boolean not null default false,
  add column if not exists published_at timestamptz,
  add column if not exists acknowledged_at timestamptz;

alter table public.attendance_disputes
  add column if not exists dispute_type text,
  add column if not exists claimed_time_out timestamptz,
  add column if not exists original_time_out timestamptz;

alter table public.attendance_disputes alter column claimed_time_in drop not null;
alter table public.attendance_disputes drop constraint if exists attendance_disputes_dispute_type_check;
alter table public.attendance_disputes add constraint attendance_disputes_dispute_type_check
  check (dispute_type is null or dispute_type in ('TimeIn', 'TimeOut'));

create table if not exists public.employee_support_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  category text not null,
  subject text not null,
  description text not null,
  status text not null default 'Open' check (status in ('Open', 'In Progress', 'Resolved')),
  hr_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.employee_documents (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  category text not null,
  file_name text not null,
  file_path text not null unique,
  is_active boolean not null default true,
  created_by uuid references public.profiles(id),
  published_at timestamptz not null default now()
);

create table if not exists public.weather_advisories (
  id uuid primary key default gen_random_uuid(),
  location_name text not null,
  advisory_date date not null,
  headline text not null,
  message text not null,
  severity text not null default 'info',
  temperature_c numeric,
  precipitation_probability numeric,
  weather_code integer,
  commute_window text,
  source_name text,
  generated_at timestamptz not null default now(),
  is_active boolean not null default true
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id),
  actor_name text,
  action text not null,
  entity_type text,
  entity_id text,
  summary text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists employee_support_requests_user_created_idx
  on public.employee_support_requests (user_id, created_at desc);
create index if not exists employee_documents_active_published_idx
  on public.employee_documents (is_active, published_at desc);
create index if not exists weather_advisories_date_active_idx
  on public.weather_advisories (advisory_date, is_active);
create index if not exists audit_logs_created_idx on public.audit_logs (created_at desc);

alter table public.employee_support_requests enable row level security;
alter table public.employee_documents enable row level security;
alter table public.weather_advisories enable row level security;
alter table public.audit_logs enable row level security;

create policy "Users can create own support requests"
  on public.employee_support_requests for insert to authenticated
  with check (user_id = auth.uid());
create policy "Users can view own or admins view support requests"
  on public.employee_support_requests for select to authenticated
  using (user_id = auth.uid() or exists (
    select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin', 'super_admin')
  ));
create policy "Admins can update support requests"
  on public.employee_support_requests for update to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin', 'super_admin')))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin', 'super_admin')));

create policy "Authenticated can read active documents"
  on public.employee_documents for select to authenticated
  using (is_active or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin', 'super_admin')));
create policy "Admins can insert documents"
  on public.employee_documents for insert to authenticated
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin', 'super_admin')));
create policy "Admins can update documents"
  on public.employee_documents for update to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin', 'super_admin')))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin', 'super_admin')));
create policy "Admins can delete documents"
  on public.employee_documents for delete to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin', 'super_admin')));

create policy "Authenticated can read active weather advisories"
  on public.weather_advisories for select to authenticated using (is_active);
create policy "Super Admin can read audit logs"
  on public.audit_logs for select to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'super_admin'));

grant select, insert, update on public.employee_support_requests to authenticated;
grant select, insert, update, delete on public.employee_documents to authenticated;
grant select on public.weather_advisories to authenticated;
grant select on public.audit_logs to authenticated;

insert into storage.buckets (id, name, public)
values ('employee-documents', 'employee-documents', false)
on conflict (id) do update set public = excluded.public;

create policy "Authenticated can download employee documents"
  on storage.objects for select to authenticated
  using (bucket_id = 'employee-documents');
create policy "Admins can upload employee documents"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'employee-documents' and exists (
    select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin', 'super_admin')
  ));
create policy "Admins can delete employee documents"
  on storage.objects for delete to authenticated
  using (bucket_id = 'employee-documents' and exists (
    select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin', 'super_admin')
  ));
