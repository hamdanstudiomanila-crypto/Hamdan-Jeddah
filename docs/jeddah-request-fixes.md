# Request, recovery, and Arabic updates

The code now refreshes HR's pending requests on insert, update, and cancellation, clears cancelled request details, and closes the review modal after a successful approval or decline. A dashboard confirmation remains visible, and a default decision note is saved if HR supplies no note. Database review locks the pending request and commits its attendance correction and review status in one transaction.

New sick leave submissions require a PDF, JPG, or PNG supporting document up to 10 MB. The private `leave-support` bucket allows the owner and HR to download it. HR can download it from leave details. Existing requests can still be reviewed without retroactive attachments. Archive columns stay aligned with the existing archive function.

Password recovery consumes links once, supports implicit tokens, PKCE codes, and recovery token-hash templates, and displays expired-link errors from both query strings and URL fragments. The reset form signs out after changing the password. Supabase Auth must allow the deployed origin's `/auth/reset-password` redirect URL; email delivery and a real recovery link still need an authenticated deployment check.

Office dates and remaining automation timezone references use `Asia/Riyadh` (UTC+3). The employee summary rolls over on Jeddah midnight. Existing timestamp values are not shifted. No Philippines or Manila timezone references remain in runtime application code or the current AI automation templates.

Arabic and Saudi/Hijazi questions use the same classification and access checks as English questions. The application translates only its authorized answer through the existing classifier webhook's new `translate_answer` operation. Arabic mode uses right-to-left message text automatically. Update the workflow before enabling the new frontend; the old workflow does not support this operation.

## Rollout dependencies

1. Applied to Jeddah-Office on September 9, 2026: `supabase/migrations/20260909140513_employee_request_support.sql` before the application push. The payslip acknowledgment migration `20260909140532_payslip_acknowledgement_rpc.sql` was also applied. It supplies the attachment columns, private bucket and policies, review RPC, cancellation RPC, and Realtime publication membership. Keep the existing Jeddah timezone and workweek migrations applied as well.
2. Import the updated `docs/automations/employee-ask-ai-classifier.json` into the existing n8n classifier workflow, retain its webhook URL and credentials, and publish it. It adds Arabic classification and answer translation; no new environment variable is required. The template continues to disable execution-data retention.
3. Deploy the application, then verify employee cancellation against an open HR dashboard, attachment upload/download, approval and decline, and an actual recovery email.

## Verification performed locally

- TypeScript: `npx tsc --noEmit` passed. Production build: `npm run build` passed.
- Unit/integration tests: 155 passed, including Arabic workflow branches, privacy refusals, Jeddah date boundaries, and recovery link formats.
- Browser: missing and expired recovery links display the expected errors without a Next.js error overlay or browser errors. The Arabic preview rendered right-to-left and showed 4:57 PM Jeddah when the UTC clock showed 13:57.
- Live database access was restored and both migrations were applied. Verified private storage limits, archive columns, Realtime membership, and RPC permissions. Rollback-only PostgreSQL tests passed for missing sick-leave attachments and unauthenticated review/cancellation rejection. No test records were retained.
- Security advisors flagged existing functions and Auth settings outside these migrations. The newly added public RPCs are security invoker and deny anonymous execution. Existing findings include [mutable function search paths](https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable), [publicly executable definer functions](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable), and [disabled leaked-password protection](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).
- The n8n workflow has been tested as local code, not published or exercised against a live model. Authenticated HR/employee flows and email delivery have not been verified end to end.
