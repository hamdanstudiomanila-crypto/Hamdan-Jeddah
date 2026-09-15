-- Jeddah only: leave requests have no annual credit balance.
-- Keep historical credit rows and the legacy internal 'Deducted' settlement
-- status; it means the approved day was processed, not a credit deduction.
-- Retroactive approved leave replaces an existing Absent row.
CREATE OR REPLACE FUNCTION public.settle_leave_day(p_user_id uuid, p_leave_date date)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_day record;
  v_has_timein boolean;
begin
  select * into v_day
  from public.leave_request_days
  where user_id = p_user_id and leave_date = p_leave_date and status = 'Pending'
  limit 1 for update;

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

  insert into public.attendance_logs (user_id, log_date, status, time_in, time_out)
  values (p_user_id, p_leave_date, 'Leave', null, null)
  on conflict (user_id, log_date) do update
  set status = excluded.status
  where attendance_logs.time_in is null and attendance_logs.status = 'Absent';

  update public.leave_request_days
  set status = 'Deducted', resolved_at = now()
  where id = v_day.id;
end;
$function$
;


revoke all on function public.settle_leave_day(uuid, date) from public, anon, authenticated;
