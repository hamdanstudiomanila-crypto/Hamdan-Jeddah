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
