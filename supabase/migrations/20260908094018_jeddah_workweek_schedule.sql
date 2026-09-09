-- Jeddah policy effective 2026-09-08. Historical dates retain their old workweek.
begin;
create or replace function public.is_scheduled_workday(p_date date)
returns boolean language sql immutable strict set search_path = public
as $$
  select case when p_date < date '2026-09-08'
    then extract(dow from p_date) not in (0,6)
    else extract(dow from p_date) not in (5,6) end;
$$;
revoke all on function public.is_scheduled_workday(date) from public, anon;
grant execute on function public.is_scheduled_workday(date) to authenticated, service_role;

insert into public.app_settings (key,value) values
 ('late_cutoff_hour','8'::jsonb),('late_cutoff_minute','0'::jsonb),
 ('work_start_hour','8'::jsonb),('work_start_minute','0'::jsonb),
 ('work_end_hour','18'::jsonb),('work_end_minute','0'::jsonb),
 ('time_out_reminder_hour','18'::jsonb),('late_grace_minutes','0'::jsonb)
on conflict (key) do update set value=excluded.value;

CREATE OR REPLACE FUNCTION public.generate_leave_request_days(p_leave_request_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_user_id uuid;
  v_start date;
  v_end date;
  d date;
begin
  if not exists (
    select 1 from public.profiles
    where id = auth.uid() and role = any (array['admin','super_admin'])
  ) then
    raise exception 'Not authorized';
  end if;

  select user_id, start_date, end_date into v_user_id, v_start, v_end
  from public.leave_requests where id = p_leave_request_id and status = 'Approved';

  if v_user_id is null then
    return;
  end if;

  d := v_start;
  while d <= v_end loop
    if public.is_scheduled_workday(d) -- dated Jeddah workweek
      and not exists (select 1 from public.holidays h where h.holiday_date = d) -- skip holidays: not charged as leave
    then
      insert into public.leave_request_days (leave_request_id, user_id, leave_date)
      values (p_leave_request_id, v_user_id, d)
      on conflict (leave_request_id, leave_date) do nothing;
    end if;
    d := d + 1;
  end loop;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.settle_overdue_absences()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_today date := (current_timestamp at time zone 'Asia/Riyadh')::date;
begin
  if not exists (
    select 1 from public.profiles
    where id = auth.uid() and role = any (array['admin','super_admin'])
  ) then
    raise exception 'Not authorized';
  end if;

  insert into public.attendance_logs (user_id, log_date, status, time_in, time_out)
  select p.id, d::date, 'Absent', null, null
  from public.profiles p
  left join public.employee_government_ids g on g.user_id = p.id
  cross join lateral generate_series(
    greatest(coalesce(g.hired_date, v_today - 90), v_today - 90),
    v_today - 1,
    interval '1 day'
  ) as d
  where lower(coalesce(p.role, '')) = 'employee'
    and coalesce(p.is_active, true) = true
    and public.is_scheduled_workday(d::date)
    and not exists (
      select 1 from public.attendance_logs al
      where al.user_id = p.id and al.log_date = d::date
    )
    and not exists (
      select 1 from public.leave_request_days lrd
      where lrd.user_id = p.id and lrd.leave_date = d::date
    )
    and not exists (
      select 1 from public.holidays h
      where h.holiday_date = d::date
    )
  on conflict (user_id, log_date) do nothing;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.settle_leave_day(p_user_id uuid, p_leave_date date)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_day record;
  v_has_timein boolean;
  v_year int;
  v_employment_status text;
  v_credits record;
begin
  select * into v_day
  from public.leave_request_days
  where user_id = p_user_id and leave_date = p_leave_date and status = 'Pending'
  limit 1;

  if v_day.id is null then
    return;
  end if;

  -- Never charge a rest day, including previously generated Pending leave days.
  if not public.is_scheduled_workday(p_leave_date) or exists (
    select 1 from public.holidays where holiday_date = p_leave_date
  ) then
    update public.leave_request_days set status = 'Voided', resolved_at = now() where id = v_day.id;
    return;
  end if;

  select exists(
    select 1 from public.attendance_logs
    where user_id = p_user_id and log_date = p_leave_date and time_in is not null
  ) into v_has_timein;

  if v_has_timein then
    update public.leave_request_days
    set status = 'Voided', resolved_at = now()
    where id = v_day.id;
    return;
  end if;

  select employment_status into v_employment_status
  from public.employee_government_ids where user_id = p_user_id;

  if v_employment_status is distinct from 'Regular' then
    insert into public.attendance_logs (user_id, log_date, status, time_in, time_out)
    values (p_user_id, p_leave_date, 'Leave', null, null)
    on conflict (user_id, log_date) do nothing;

    update public.leave_request_days
    set status = 'Deducted', resolved_at = now()
    where id = v_day.id;
    return;
  end if;

  v_year := extract(year from p_leave_date);

  select id, used_credits, total_credits into v_credits
  from public.leave_credits
  where user_id = p_user_id and year = v_year;

  if v_credits.id is null then
    insert into public.leave_credits (user_id, year, total_credits, used_credits)
    values (p_user_id, v_year, 15, 1);
  else
    update public.leave_credits
    set used_credits = least(v_credits.used_credits + 1, v_credits.total_credits)
    where id = v_credits.id;
  end if;

  insert into public.attendance_logs (user_id, log_date, status, time_in, time_out)
  values (p_user_id, p_leave_date, 'Leave', null, null)
  on conflict (user_id, log_date) do nothing;

  update public.leave_request_days
  set status = 'Deducted', resolved_at = now()
  where id = v_day.id;
end;
$function$
;

-- Reconcile only unresolved future/policy-period leave allocations.
update public.leave_request_days set status='Voided', resolved_at=now()
where leave_date >= date '2026-09-08' and status='Pending'
  and not public.is_scheduled_workday(leave_date);

insert into public.leave_request_days (leave_request_id,user_id,leave_date)
select l.id,l.user_id,d::date
from public.leave_requests l
cross join lateral generate_series(greatest(l.start_date,date '2026-09-08'), l.end_date, interval '1 day') d
where l.status='Approved' and public.is_scheduled_workday(d::date)
  and not exists(select 1 from public.holidays h where h.holiday_date=d::date)
on conflict (leave_request_id,leave_date) do nothing;

-- Reject new rest-day absence entries, including manual HR edits.
create or replace function public.guard_rest_day_absence()
returns trigger language plpgsql set search_path=public as $$
begin
  if new.log_date >= date '2026-09-08' and lower(coalesce(new.status,''))='absent'
     and not public.is_scheduled_workday(new.log_date) then
    raise exception 'Friday and Saturday are Jeddah rest days; absence cannot be recorded.';
  end if;
  return new;
end;
$$;
revoke all on function public.guard_rest_day_absence() from public,anon,authenticated;
drop trigger if exists guard_rest_day_absence on public.attendance_logs;
create trigger guard_rest_day_absence before insert or update of status,log_date
on public.attendance_logs for each row execute function public.guard_rest_day_absence();
commit;
