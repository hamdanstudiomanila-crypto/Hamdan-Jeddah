# Jeddah automation setup

The Jeddah app uses the following POST webhook paths under the existing ngrok host's `/webhook/` endpoint. Publish the matching Jeddah workflows in n8n before using these features.

| Automation | Webhook path | Secret environment variable | Header |
| --- | --- | --- | --- |
| Database backup | `backup-notification-jeddah` | `N8N_BACKUP_WEBHOOK_SECRET` | `x-backup-secret` |
| Commute | `commute-jeddah` | `N8N_COMMUTE_WEBHOOK_SECRET` | `x-commute-secret` |
| Ask AI classifier | `employee-ask-ai-classify-jeddah` | `N8N_EMPLOYEE_AI_WEBHOOK_SECRET` | `x-employee-ai-secret` |
| Ask AI payslip reader | `employee-ask-ai-payslip-jeddah` | `N8N_EMPLOYEE_AI_WEBHOOK_SECRET` | `x-employee-ai-secret` |
| Publish payslip email trigger | `publish-payslip-jeddah` | `N8N_PUBLISH_WEBHOOK_SECRET` | `x-publish-secret` |

Copy each secret from `.env.local` into its corresponding Jeddah workflow header-auth credential or secret-validation node. Keep values out of workflow exports and Git. A new publish-payslip secret was generated locally for this setup.

The two Ask AI JSON templates in this directory use the Jeddah paths. Their imported credential references must be assigned to the intended Jeddah credentials in n8n.

The root `auto send payslip in email.json` uses a ten-minute schedule rather than a webhook. Duplicate it as a Jeddah workflow, configure Jeddah Supabase and email credentials, and use a separate sent-email tracking data table. A new webhook URL alone does not separate its database or email tracking. The publish-payslip endpoint requires a matching authenticated POST trigger in n8n; the existing schedule-only export does not include one.

Configure every database-reading or backup workflow with the Jeddah database credentials and intended recipients. Keep the Manila workflows and paths separate. Set Jeddah schedules to the `Asia/Riyadh` timezone.

App environment configuration does not publish n8n workflows. Workflow activation and real notification/backup delivery still need verification in n8n.

## Publish troubleshooting

If the portal reports publication but the card remains unpublished, check the
database write before debugging email. The original endpoint accepted an UPDATE
that affected zero rows. The endpoint now requires a returned row with
`published: true` and returns an error without calling n8n if the write fails.

The baseline policies include SELECT, INSERT, and DELETE for payslips but omit
UPDATE. Apply `supabase/migrations/20260909063525_payslip_admin_publish_policy.sql`
to the Jeddah project after confirming its policy state. It permits UPDATE only
for authenticated users whose stored profile role is `admin` or `super_admin`.
Do not bypass RLS with a service-role client to fix publication.

For the deployed portal, configure `N8N_PUBLISH_PAYSLIP_WEBHOOK_URL` and
`N8N_PUBLISH_WEBHOOK_SECRET` in the Jeddah Vercel project's Production environment.
The URL must use `/webhook/publish-payslip-jeddah`; the secret must match the
Jeddah workflow's `Valid Secret?` check. `.env.local` does not configure Vercel.
Redeploy after changing production environment variables or application code.

Validate a single intended publication: the database row becomes published,
the new n8n execution starts at `Publish Webhook`, the item passes `Is Published?`,
and email succeeds before `Mark Emailed`. A successful ten-minute scheduled
execution does not verify the webhook. A webhook HTTP 200 acknowledges the
request, not email delivery. In `Send Payslip Email`, use **On Error: Stop Workflow**
so failed emails do not get recorded as sent.
