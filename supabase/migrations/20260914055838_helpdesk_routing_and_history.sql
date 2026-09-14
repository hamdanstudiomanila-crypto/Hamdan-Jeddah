begin;
drop policy if exists "Users can view own or admins view support requests" on public.employee_support_requests;
drop policy if exists "Admins can update support requests" on public.employee_support_requests;
drop policy if exists "Users can create own support requests" on public.employee_support_requests;

create policy "Helpdesk owner or assigned department reads" on public.employee_support_requests
for select to authenticated using (
 user_id = (select auth.uid()) or exists (
  select 1 from public.profiles p where p.id = (select auth.uid()) and (
   (p.role = 'super_admin' and category = 'IT Concern') or
   (p.role = 'admin' and category <> 'IT Concern')
  )
 )
);
create policy "Helpdesk employees submit clean requests" on public.employee_support_requests
for insert to authenticated with check (
 user_id = (select auth.uid()) and status = 'Open' and hr_notes is null
 and exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'employee')
);
create policy "Helpdesk assigned department updates active requests" on public.employee_support_requests
for update to authenticated using (
 status <> 'Resolved' and exists (
  select 1 from public.profiles p where p.id = (select auth.uid()) and (
   (p.role = 'super_admin' and category = 'IT Concern') or (p.role = 'admin' and category <> 'IT Concern')
  )
 )
) with check (
 exists (select 1 from public.profiles p where p.id = (select auth.uid()) and (
  (p.role = 'super_admin' and category = 'IT Concern') or (p.role = 'admin' and category <> 'IT Concern')
 ))
);

create or replace function public.guard_helpdesk_history() returns trigger
language plpgsql set search_path = '' as $$
begin
 if old.status = 'Resolved' then
  raise exception 'Resolved tickets are read-only.' using errcode = '23514';
 end if;
 if new.id is distinct from old.id or new.user_id is distinct from old.user_id
 or new.category is distinct from old.category or new.subject is distinct from old.subject
 or new.description is distinct from old.description or new.created_at is distinct from old.created_at then
  raise exception 'Request identity and original content cannot be changed.' using errcode = '23514';
 end if;
 return new;
end;
$$;
revoke all on function public.guard_helpdesk_history() from public, anon, authenticated;
drop trigger if exists guard_helpdesk_history on public.employee_support_requests;
create trigger guard_helpdesk_history before update on public.employee_support_requests
for each row execute function public.guard_helpdesk_history();
commit;
