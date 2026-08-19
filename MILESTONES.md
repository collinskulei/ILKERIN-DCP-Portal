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
- [x] Vercel project and Supabase project created
- [x] Zoho WorkDrive API credentials obtained via a Self Client (Zoho API
      Console) — client ID/secret + long-lived refresh token generated,
      verified live against the "Ilkerin & Associates" org
      (`GET /workdrive/api/v1/users/me` succeeded), scopes: `WorkDrive.files.READ`,
      `WorkDrive.teamfolders.READ`, `WorkDrive.workspace.READ`,
      `WorkDrive.organization.READ`. Stored in `.env.local`
      (`ZOHO_CLIENT_ID`/`ZOHO_CLIENT_SECRET`/`ZOHO_REFRESH_TOKEN`) — **still
      needs to be added to Vercel's environment variables** before Phase 2
      code depends on it in production
- [ ] Get admin access to configure WorkDrive webhooks (separate from the API
      credentials above — done in the WorkDrive admin UI, or via the
      Webhooks API using this same token if we go that route in Phase 2)
- [ ] Get the compliance team's authoritative Stage 1/2/3 document checklist
      (item name, owner tag, expiry rule if any) — this becomes the first real
      data import, not a placeholder
- [ ] Standardize Zoho WorkDrive client folder template structure so it maps
      1:1 to the Stage 1/2/3 checklist
- [ ] Decide whether to layer Vercel deployment protection on top of app-level
      login for extra access control

## Phase 1 — Foundations (data model & project scaffolding)

- [x] Scaffold Next.js/TypeScript project (App Router, Tailwind) — builds and
      lints clean locally
- [ ] Connect this repo to the Vercel project and confirm a deploy goes out
      (repo already has a GitHub remote: `collinskulei/ILKERIN-DCP-Portal`)
- [x] Supabase browser + server client helpers wired in (`src/lib/supabase/`);
      needs real `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`
      in `.env.local` (see `.env.example`) to actually connect
- [x] Postgres schema applied to the live Supabase project (verified via
      `supabase db push` + a read-back query) — Client, Application,
      Shareholder/Director, Document, Checklist Template, Task, CBK
      Correspondence, Fee Payment, Notification Log, User (profiles), Audit Log
- [x] Checklist template table supports versioning (`version`, `is_active`
      columns); an admin UI to edit it without a deploy is still open (Phase 5)
- [x] Supabase Auth (email + password) login page and route protection wired
      (`src/app/login`, `src/proxy.ts`)
- [x] RLS policies applied to the live project
      (`supabase/migrations/0002_rls_policies.sql`) — default posture is "any
      authenticated staff member can read everything, only compliance/admin
      can edit checklist templates" per PLAN.md section 6, tighten later if
      needed
- [ ] Implement audit logging writes (append-only log table exists; no
      triggers/write path populating it yet)
- [x] Placeholder Stage 1/2/3 checklist seed data applied
      (`supabase/migrations/0003_seed_checklist_placeholder.sql`, 11 rows
      confirmed live) — **must be replaced with the real compliance-team
      checklist before the pilot**
- [x] First case-manager user created (Supabase Auth + matching `profiles`
      row, role `admin`) — credentials shared with user directly, not stored
      in this repo

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

- [x] "Add client" flow: company name + starting stage → creates the client,
      application, and the full checklist (documents) for that stage
      automatically from `checklist_templates`
      (`src/app/actions/clients.ts`, `src/components/add-client-dialog.tsx`)
- [x] Case whiteboard (dashboard) with two switchable views — **Board**
      (Kanban columns per stage + Complete) and **List** (table) — both
      backed by a single `application_board` view exposing progress %,
      item counts, and notification counts (overdue tasks, expiring
      documents, pending CBK queries) (`src/components/case-board.tsx`)
- [x] Auto-recalculated `completion_pct` via a Postgres trigger whenever a
      document's status changes (`0004_progress_and_board.sql`) — verified
      live (1/6 items verified → 17%)
- [x] Case detail view: checklist per application with item name, owner tag,
      status, expiry, and mark received/verify/reject actions
      (`src/app/cases/[id]/page.tsx`, `src/components/document-checklist.tsx`);
      also lists tasks and CBK correspondence (empty until Phase 4 populates
      them)
- [ ] Task view: dedicated task list per case manager across all their cases
      (current case detail page only shows tasks for one case)
- [ ] Add ad-hoc task action (checklist status changes are covered; free-form
      task creation is not yet built)
- [ ] Stage-advance automation: when all required items for a stage are
      verified, auto-advance to next stage, generate next stage's checklist,
      and notify case manager (completion_pct now tracks this correctly but
      nothing auto-advances the stage itself yet)
- [ ] Overview/analytics page across all clients (explicitly deferred by user
      to a later pass)

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
