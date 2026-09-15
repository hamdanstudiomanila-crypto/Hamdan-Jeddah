begin;
select plan(7);

-- Synthetic employee and past working days; every change rolls back.
insert into auth.users (id, raw_user_meta_data)
values ('d32d7586-cd40-48d2-906f-e8f016b9dc61', '{"full_name":"Leave regression fixture"}');
delete from public.holidays where holiday_date between '2026-09-13' and '2026-09-14';
insert into public.leave_requests (id, user_id, leave_type, start_date, end_date, status)
values ('632382b1-10f5-454f-8320-52a2f3e27b58', 'd32d7586-cd40-48d2-906f-e8f016b9dc61', 'Vacation', '2026-09-13', '2026-09-14', 'Approved');
insert into public.leave_request_days (leave_request_id, user_id, leave_date)
values
  ('632382b1-10f5-454f-8320-52a2f3e27b58', 'd32d7586-cd40-48d2-906f-e8f016b9dc61', '2026-09-13'),
  ('632382b1-10f5-454f-8320-52a2f3e27b58', 'd32d7586-cd40-48d2-906f-e8f016b9dc61', '2026-09-14')
on conflict (leave_request_id, leave_date) do nothing;
insert into public.attendance_logs (user_id, log_date, status)
values ('d32d7586-cd40-48d2-906f-e8f016b9dc61', '2026-09-13', 'Absent');

select public.settle_leave_day('d32d7586-cd40-48d2-906f-e8f016b9dc61', '2026-09-13');
select is((select status from public.attendance_logs where user_id = 'd32d7586-cd40-48d2-906f-e8f016b9dc61' and log_date = '2026-09-13'), 'Leave', 'retroactive leave replaces existing absence');
select is((select count(*)::int from public.leave_credits where user_id = 'd32d7586-cd40-48d2-906f-e8f016b9dc61'), 0, 'settlement does not create credits');

insert into public.leave_credits (user_id, year, total_credits, used_credits)
values ('d32d7586-cd40-48d2-906f-e8f016b9dc61', 2026, 0, 0);
select public.settle_leave_day('d32d7586-cd40-48d2-906f-e8f016b9dc61', '2026-09-14');
select is((select status from public.attendance_logs where user_id = 'd32d7586-cd40-48d2-906f-e8f016b9dc61' and log_date = '2026-09-14'), 'Leave', 'zero historical balance does not block leave');
select is((select used_credits from public.leave_credits where user_id = 'd32d7586-cd40-48d2-906f-e8f016b9dc61'), 0, 'historical credits remain unchanged');

select public.settle_leave_day('d32d7586-cd40-48d2-906f-e8f016b9dc61', '2026-09-14');
select is((select count(*)::int from public.attendance_logs where user_id = 'd32d7586-cd40-48d2-906f-e8f016b9dc61'), 2, 'repeated settlement does not duplicate attendance');
select ok(not has_function_privilege('authenticated', 'public.settle_leave_day(uuid,date)', 'execute'), 'settlement remains internal');
select ok(not has_function_privilege('anon', 'public.settle_leave_day(uuid,date)', 'execute'), 'anonymous callers cannot settle leave');
select * from finish();
rollback;
