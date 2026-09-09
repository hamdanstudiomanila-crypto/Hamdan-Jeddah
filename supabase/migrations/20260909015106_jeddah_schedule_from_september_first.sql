-- Move the effective date to September 1 at the office request.
begin;
create or replace function public.is_scheduled_workday(p_date date)
returns boolean language sql immutable strict set search_path = public
as $$
  select case when p_date < date '2026-09-01'
    then extract(dow from p_date) not in (0,6)
    else extract(dow from p_date) not in (5,6) end;
$$;
revoke all on function public.is_scheduled_workday(date) from public, anon;
grant execute on function public.is_scheduled_workday(date) to authenticated, service_role;

create or replace function public.guard_rest_day_absence()
returns trigger language plpgsql set search_path=public as $$
begin
  if new.log_date >= date '2026-09-01' and lower(coalesce(new.status,''))='absent'
     and not public.is_scheduled_workday(new.log_date) then
    raise exception 'Friday and Saturday are Jeddah rest days; absence cannot be recorded.';
  end if;
  return new;
end;
$$;

-- No settled allocations existed in this interval at review time. Abort if that changed
-- rather than guessing whether/how much of a capped credit balance was charged.
do $$ begin
  if exists(select 1 from public.leave_request_days where leave_date between date '2026-09-01' and date '2026-09-07' and status='Deducted' and not public.is_scheduled_workday(leave_date)) then
    raise exception 'Review settled rest-day credits before changing the effective date';
  end if;
end $$;
update public.leave_request_days set status='Voided',resolved_at=now()
where leave_date between date '2026-09-01' and date '2026-09-07'
  and status='Pending' and not public.is_scheduled_workday(leave_date);

-- Remove only empty absence records on the newly recognised rest days.
delete from public.attendance_logs where log_date between date '2026-09-01' and date '2026-09-07'
  and not public.is_scheduled_workday(log_date) and status='Absent' and time_in is null and time_out is null;

-- Preserve clock timestamps and apply the 8 AM cutoff to the newly covered interval.
update public.attendance_logs set status=case
  when public.is_scheduled_workday(log_date) and (time_in at time zone 'Asia/Riyadh')::time > time '08:00:00' then 'Late' else 'Present' end
where log_date between date '2026-09-01' and date '2026-09-07' and time_in is not null and status in ('Present','Late');

insert into public.leave_request_days(leave_request_id,user_id,leave_date)
select l.id,l.user_id,d::date from public.leave_requests l
cross join lateral generate_series(greatest(l.start_date,date '2026-09-01'),least(l.end_date,date '2026-09-07'),interval '1 day') d
where l.status='Approved' and public.is_scheduled_workday(d::date)
  and not exists(select 1 from public.holidays h where h.holiday_date=d::date)
on conflict(leave_request_id,leave_date) do nothing;

-- Same eligibility rules as automatic settlement, scoped to the corrected week.
insert into public.attendance_logs(user_id,log_date,status,time_in,time_out)
select p.id,d::date,'Absent',null,null from public.profiles p
left join public.employee_government_ids g on g.user_id=p.id
cross join lateral generate_series(greatest(coalesce(g.hired_date,date '2026-09-01'),date '2026-09-01'),date '2026-09-07',interval '1 day') d
where lower(coalesce(p.role,''))='employee' and coalesce(p.is_active,true)
  and public.is_scheduled_workday(d::date)
  and not exists(select 1 from public.attendance_logs a where a.user_id=p.id and a.log_date=d::date)
  and not exists(select 1 from public.leave_request_days l where l.user_id=p.id and l.leave_date=d::date)
  and not exists(select 1 from public.holidays h where h.holiday_date=d::date)
on conflict(user_id,log_date) do nothing;
commit;
