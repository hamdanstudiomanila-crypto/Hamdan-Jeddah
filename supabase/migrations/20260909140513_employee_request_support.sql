-- Supporting documents stay private to their owner and HR.
alter table public.leave_requests add column if not exists attachment_path text;
alter table public.leave_requests add column if not exists attachment_name text;
-- archive_old_records copies rows with SELECT *, so preserve column parity.
alter table public.leave_requests_archive add column if not exists attachment_path text;
alter table public.leave_requests_archive add column if not exists attachment_name text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('leave-support', 'leave-support', false, 10485760, array['application/pdf','image/jpeg','image/png'])
on conflict (id) do nothing;

create policy "Upload own leave support" on storage.objects for insert to authenticated
with check (bucket_id = 'leave-support' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "Read own or HR leave support" on storage.objects for select to authenticated
using (bucket_id = 'leave-support' and ((storage.foldername(name))[1] = auth.uid()::text
  or exists (select 1 from public.profiles where id = auth.uid() and role in ('admin','super_admin'))));
create policy "Delete unsubmitted leave support" on storage.objects for delete to authenticated
using (bucket_id = 'leave-support' and (storage.foldername(name))[1] = auth.uid()::text
  and not exists (select 1 from public.leave_requests where attachment_path = name)
  and not exists (select 1 from public.leave_requests_archive where attachment_path = name));

-- Enforce on new submissions; existing sick leave requests remain reviewable.
create or replace function public.validate_leave_support() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  if new.leave_type = 'Sick' and nullif(btrim(new.attachment_path), '') is null then
    raise exception 'Sick leave requires a supporting document.';
  end if;
  if new.attachment_path is not null and (
    split_part(new.attachment_path, '/', 1) <> new.user_id::text
    or not exists (select 1 from storage.objects where bucket_id = 'leave-support' and name = new.attachment_path)
  ) then
    raise exception 'Supporting document must be uploaded by the request owner.';
  end if;
  return new;
end;
$$;
create trigger validate_leave_support_before_insert before insert on public.leave_requests
for each row execute function public.validate_leave_support();

-- Serialize review against cancellation. Attendance and request status commit together.
create or replace function public.review_employee_request(
  p_kind text, p_id uuid, p_approve boolean, p_notes text default null,
  p_attendance_status text default null
) returns void language plpgsql security invoker set search_path = '' as $$
declare
  dispute public.attendance_disputes%rowtype;
  leave_row public.leave_requests%rowtype;
  decision text := case when p_approve then 'Approved' else 'Rejected' end;
begin
  if auth.uid() is null or not exists (
    select 1 from public.profiles where id = auth.uid() and role in ('admin', 'super_admin')
  ) then raise exception 'HR access required.'; end if;
  if p_kind = 'leave' then
    select * into leave_row from public.leave_requests where id = p_id for update;
    if not found or leave_row.status <> 'Pending' then
      raise exception 'This leave request was cancelled or already reviewed.';
    end if;
    update public.leave_requests set status = decision,
      hr_notes = coalesce(nullif(btrim(p_notes), ''), case when p_approve then 'Request approved.' else 'Request declined.' end),
      reviewed_by = auth.uid(), reviewed_at = now() where id = p_id;
    if p_approve then perform public.generate_leave_request_days(p_id); end if;
  elsif p_kind = 'dispute' then
    select * into dispute from public.attendance_disputes where id = p_id for update;
    if not found or dispute.status <> 'Pending' then
      raise exception 'This dispute was cancelled or already reviewed.';
    end if;
    if p_approve then
      if coalesce(dispute.dispute_type, 'TimeIn') = 'TimeOut' then
        if dispute.attendance_log_id is null or dispute.claimed_time_out is null then
          raise exception 'Missing attendance record or claimed time-out.';
        end if;
        update public.attendance_logs set time_out = dispute.claimed_time_out
          where id = dispute.attendance_log_id and user_id = dispute.user_id;
        if not found then raise exception 'Attendance record not found.'; end if;
      else
        if dispute.claimed_time_in is null or p_attendance_status is null or p_attendance_status not in ('Present', 'Late') then
          raise exception 'Invalid claimed time-in or attendance status.';
        end if;
        if dispute.attendance_log_id is not null then
          update public.attendance_logs set time_in = dispute.claimed_time_in, status = p_attendance_status
            where id = dispute.attendance_log_id and user_id = dispute.user_id;
          if not found then raise exception 'Attendance record not found.'; end if;
        else
          insert into public.attendance_logs (user_id, log_date, time_in, status)
            values (dispute.user_id, dispute.dispute_date, dispute.claimed_time_in, p_attendance_status)
            on conflict (user_id, log_date) do update set time_in = excluded.time_in, status = excluded.status;
        end if;
      end if;
    end if;
    update public.attendance_disputes set status = decision,
      hr_notes = coalesce(nullif(btrim(p_notes), ''), case when p_approve then 'Request approved.' else 'Request declined.' end),
      reviewed_by = auth.uid(), reviewed_at = now() where id = p_id;
  else
    raise exception 'Unknown request type.';
  end if;
end;
$$;
revoke all on function public.review_employee_request(text, uuid, boolean, text, text) from public, anon;
grant execute on function public.review_employee_request(text, uuid, boolean, text, text) to authenticated;

create policy "Cancel own pending attendance dispute" on public.attendance_disputes
for delete to authenticated using (user_id = auth.uid() and status = 'Pending');

create function public.cancel_pending_attendance_dispute(p_dispute_id uuid)
returns void language plpgsql security invoker set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'Sign in to cancel a dispute.'; end if;
  delete from public.attendance_disputes
    where id = p_dispute_id and user_id = auth.uid() and status = 'Pending';
  if not found then raise exception 'This dispute was cancelled or already reviewed.'; end if;
end;
$$;
revoke all on function public.cancel_pending_attendance_dispute(uuid) from public, anon;
grant execute on function public.cancel_pending_attendance_dispute(uuid) to authenticated;

-- Required for HR to receive cancellation and review changes.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'leave_requests') then
      alter publication supabase_realtime add table public.leave_requests;
    end if;
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'attendance_disputes') then
      alter publication supabase_realtime add table public.attendance_disputes;
    end if;
  end if;
end;
$$;
