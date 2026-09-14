begin;
alter policy "Helpdesk assigned department updates active requests"
on public.employee_support_requests
with check (
 exists (
  select 1 from public.profiles p where p.id=(select auth.uid()) and (
   (p.role='admin' and category<>'IT Concern' and status in ('Open','In Progress','Resolved','Cancelled'))
   or (p.role='super_admin' and category='IT Concern' and status in ('Open','In Progress','Resolved'))
  )
 )
);
commit;
