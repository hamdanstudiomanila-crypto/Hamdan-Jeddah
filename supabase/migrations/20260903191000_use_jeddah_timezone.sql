-- Use Jeddah/Saudi Arabia local time (Asia/Riyadh, UTC+3) for attendance
-- business dates and all existing public functions. Timestamps remain UTC.

alter table public.attendance_logs
  alter column log_date set default ((current_timestamp at time zone 'Asia/Riyadh')::date);

alter table public.attendance_logs_archive
  alter column log_date set default ((current_timestamp at time zone 'Asia/Riyadh')::date);

do $migration$
declare
  function_definition text;
begin
  for function_definition in
    select pg_get_functiondef(p.oid)
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.prosrc like '%Asia/Manila%'
  loop
    execute replace(function_definition, 'Asia/Manila', 'Asia/Riyadh');
  end loop;
end
$migration$;

comment on column public.attendance_logs.log_date is
  'Attendance business date in Asia/Riyadh (Jeddah) local time.';
