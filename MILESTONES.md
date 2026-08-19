# Implementation Milestones — Ilkerin DCP Workflow Automation

Companion to `PLAN.md`. Check items off as they're completed. Phases run
sequentially but items within "Foundations" and "Integration" can overlap once
unblocked.

## Phase 0 — Groundwork & decisions (before coding starts)

- [x] Auth mechanism for case managers: **email + password** (via Supabase Auth)
- [x] Hosting: **Vercel** (Next.js frontend) + **Supabase** (Postgres, Auth,
      Realtime, Storage, Edge Functions)
- [x] Push notifications confirmed feasible as a secondary channel (web push,
      requires installable PWA for iOS) — see PLAN.md section 6
- [x] E-signature confirmed **dropped** — out of scope, no signed-document flow
- [ ] Create the Vercel project and Supabase project; wire up environment
      variables/secrets between them
- [ ] Obtain Zoho WorkDrive API credentials (client ID/secret) and admin access to
      configure webhooks
- [ ] Get the compliance team's authoritative Stage 1/2/3 document checklist
      (item name, owner tag, expiry rule if any) — this becomes the first real
      data import, not a placeholder
- [ ] Standardize Zoho WorkDrive client folder template structure so it maps
      1:1 to the Stage 1/2/3 checklist
- [ ] Decide whether to layer Vercel deployment protection on top of app-level
      login for extra access control

## Phase 1 — Foundations (data model & project scaffolding)

- [ ] Scaffold Next.js/TypeScript project, deploy a hello-world build to Vercel
- [ ] Create Supabase project, connect it to the Next.js app (client + server SDK)
- [ ] Set up Postgres schema (via Supabase migrations) for core entities: Client,
      Application, Shareholder/Director, Document, Checklist Template, Task, CBK
      Correspondence, Fee Payment, Notification Log, User, Audit Log
- [ ] Implement checklist template versioning (compliance team can edit without
      a code deploy)
- [ ] Set up Supabase Auth (email + password) for case-manager login
- [ ] Write row-level security (RLS) policies for role-based access (case
      manager / compliance / admin)
- [ ] Implement audit logging (append-only, actor + timestamp on every write —
      e.g. via Postgres triggers or a shared data-access layer)
- [ ] Import the real Stage 1/2/3 checklist as seed data

## Phase 2 — Zoho WorkDrive integration

- [ ] Build Zoho OAuth app registration + token refresh handling (stored server-side,
      e.g. in a Supabase Edge Function or Vercel serverless function)
- [ ] Implement WorkDrive webhook receiver (Supabase Edge Function or Vercel
      route) for file-upload events
- [ ] Implement polling fallback (scheduled Edge Function, in case webhooks are
      missed/unreliable)
- [ ] Build document-to-checklist matching logic (filename/metadata → checklist
      item)
- [ ] On match: mark checklist item "received", log Document record, queue for
      case-manager verification
- [ ] Handle unmatched/ambiguous uploads (surface to case manager for manual
      tagging rather than silently dropping)
- [ ] Implement document expiry tracking (e.g. CRB report 90-day validity) and
      the "nearing expiry" flag rule

## Phase 3 — Case manager webapp core

- [ ] Case list view: all active clients, stage, completion %, outstanding items
- [ ] Case detail view: checklist per stage, document status, owner tags,
      verification action (approve/reject upload)
- [ ] Task view: task list per case manager, due dates, linked item drill-down
- [ ] Manual override actions: mark item received/waived, add ad-hoc task
- [ ] Stage-advance automation: when all required items for a stage are
      verified, auto-advance to next stage and notify case manager

## Phase 4 — Reminders, CBK tracker, fees, push notifications

- [ ] Task & Reminder Engine: scheduled Supabase Edge Function(s) for overdue
      items, nearing-expiry documents, and CBK response deadlines
- [ ] Email notification dispatcher (internal alerts to case managers, automated
      emails to clients for missing/overdue documents)
- [ ] Add PWA manifest + service worker to the Next.js app (installable, required
      for iOS web push)
- [ ] Implement web push (VAPID + service worker, or a managed provider like
      OneSignal/FCM) as a secondary notification channel, triggered from the
      same events as email
- [ ] CBK correspondence log: record queries, response deadlines, response status
      — CBK query received auto-creates a task with owner + due date
- [ ] Fee payment tracking: type, amount, status, receipt reference

## Phase 5 — Reporting dashboard & polish

- [ ] Aggregate dashboard: live status across all active clients (stage
      progress, outstanding tasks, missing files, CBK query summary)
- [ ] Audit trail view (searchable/filterable by client, entity, actor, date)
- [ ] Admin screen for compliance team to edit checklist templates without
      developer involvement
- [ ] Licence-issued flow: mark case complete, archive/lock documents

## Phase 6 — Pilot

- [ ] Select one active client engagement for the pilot
- [ ] Migrate that client's real checklist state into the system
- [ ] Run the full workflow live with a case manager, collect feedback
- [ ] Fix issues surfaced by the pilot before wider rollout

## Phase 7 — Ongoing / continuous improvement

- [ ] Roll out to remaining active clients
- [ ] Revisit whether a desktop/mobile wrapper (Tauri/Electron or PWA) is still
      wanted, per the original Features.md data-protection note
- [ ] Periodic review of checklist logic changes driven by CBK regulatory updates
- [ ] Monitor Zoho WorkDrive API reliability/rate limits; tune polling fallback
      cadence as needed
