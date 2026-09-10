# Employee attendance boundaries

The employee dashboard composes attendance with other portal features; it no longer owns attendance queries, clock request handling, or the clock/action card markup.

- `lib/employee/attendance.ts`: typed attendance rows, user-scoped history query, and shared POST response handling. Clock timestamps and authorization remain server responsibilities.
- `hooks/employee/useAttendance.ts`: history/today state, office-network checks, recording state, messages, and refresh callbacks.
- `components/employee/AttendanceSection.tsx`: existing clock, recording buttons, and network notices with typed props.
- `app/employee/page.tsx`: dashboard initialization, realtime subscriptions, early-time-out confirmation, reminders, and feature coordination. Attendance still loads in parallel with the other dashboard data.

Keep workday and late calculations in the existing shared rules. Do not introduce another browser-side clock write or a second attendance query in the page.

Validation covers employee filtering, nullable history, API success/rejection, and unavailable/completed UI states. A temporary browser fixture verified recording callbacks refresh data and dismiss the time-out reminder using synthetic responses; no live attendance was recorded. The fixture was removed before deployment.

This is the first feature extraction. Leave, dispute, and report logic remain candidates for separate, reviewed refactors.
