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

- [x] Link an existing WorkDrive folder to a client — for clients already in
      progress before this app existed. Field: `clients.workdrive_folder_url`
      (`0005_client_workdrive_link.sql`); settable at Add Client time or later
      via the case detail page (`src/components/workdrive-link-editor.tsx`)
      — verified live against Supabase
- [x] New Zoho Self Client grant issued with write + sharing scopes
      (`WorkDrive.files.ALL`, `WorkDrive.teamfolders.ALL`,
      `WorkDrive.teamfolders.sharing.CREATE/READ`, `WorkDrive.links.ALL`),
      refresh token rotated into `.env.local`
- [x] Created a dedicated **"Clients" Team Folder** in WorkDrive
      (id `we29le656a761af504bc89b9a223fd1dcaf30`) as the parent for all new
      client folders going forward; stored as `ZOHO_CLIENTS_PARENT_FOLDER_ID`
- [x] Zoho integration helper (`src/lib/zoho.ts`): token refresh + folder
      creation + upload-permission (`role_id: 7`) external share link
      creation, verified against the real API
- [x] Add Client flow now auto-creates a subfolder under "Clients" and an
      upload share link whenever no existing folder link is provided,
      storing `zoho_workdrive_folder_id`, `workdrive_folder_url` (internal,
      case-manager-facing), and `workdrive_share_link` (external,
      client-facing) on the client record
      (`0006_client_workdrive_share_link.sql`) — verified live end-to-end;
      Zoho call failures degrade gracefully (client still gets created, with
      a warning to link the folder manually instead of blocking)
- [x] Case detail page shows the client upload link with a copy button
      (`src/components/copy-link.tsx`)
- [ ] Note: two test folders ("Test Fintech Ltd", "Auto Folder Test Ltd")
      were created in the live "Clients" Team Folder while verifying this —
      couldn't delete via API (delete/trash needs a call we haven't found the
      right shape for yet), safe to delete manually in the WorkDrive UI
- [ ] Build proper Zoho access-token caching (currently fetches a fresh
      access token on every API call — works fine at this volume, but worth
      caching with expiry once usage grows)
- [x] **Detection: polling built as the primary mechanism** (no webhook yet —
      see below). `GET /api/cron/poll-workdrive` (`src/app/api/cron/poll-workdrive/route.ts`),
      secured with a `CRON_SECRET` bearer token (Vercel sends this
      automatically for its own Cron Jobs once the env var is set). **Runs
      once daily (`0 6 * * *`)**, not every 15 min as originally built — the
      Vercel project is on the **Hobby plan**, which caps Cron Jobs at once
      per day; a more frequent schedule caused/risked failing the whole
      deployment, not just the cron feature. Upgrading to Pro would allow a
      tighter interval if faster upload detection matters later. For each
      active application, resolves the WorkDrive folder ID from either
      `zoho_workdrive_folder_id` or by parsing `/folder/{id}` out of
      `workdrive_folder_url`, lists the folder's files
      (`listFolderFiles` in `src/lib/zoho.ts`), and inserts any file not
      already known (checked against both `documents.zoho_file_id` and
      existing `pending_uploads`) into the new `pending_uploads` table
      (`0007_pending_uploads.sql`)
- [x] **Matching: manual, not automatic filename matching** — a case manager
      picks which checklist item each unmatched upload satisfies. Real
      end-to-end test (create folder → upload a real file via the Zoho API →
      poll → match → verify) passed against the live Supabase + Zoho
      projects. Server actions in `src/app/actions/uploads.ts`
      (`matchPendingUpload`, `ignorePendingUpload`); UI in
      `src/components/pending-uploads.tsx`, shown on the case detail page
      above the checklist
- [x] **Bug found and fixed while testing**: `proxy.ts`'s matcher didn't
      exclude `/api/*`, so the auth-redirect middleware would have hijacked
      the cron route (and any future API route) before its handler ever ran
      — Vercel Cron would have silently gotten a 307 instead of running the
      job. Fixed by excluding `api/` from the matcher
- [x] **Bug found and fixed while testing**: Zoho's file-listing response
      returns `uploaded_time`/`created_time` as locale display strings with
      no year (e.g. `"Aug 19, 5:08 pm"`) — unsafe to store as a timestamp.
      Fixed to use `uploaded_time_in_millisecond` (epoch ms) instead
- [ ] Implement a real WorkDrive webhook receiver as a faster/primary path
      (polling every 15 min is the fallback either way, per the original
      plan) — not yet built
- [ ] Delete/trash support for pending uploads or documents via the Zoho API
      hasn't been found/tested yet (only affects cleanup, not the core flow)
- [ ] **Expiry tracking deliberately deferred**: user chose OCR/document-AI
      (read the issue date off the actual uploaded document) over a manual
      issue-date input, but wants it left dormant for now and activated later
      — no expiry computation is implemented yet. `documents.expiry_date`
      and `checklist_templates.expiry_rule_days` already exist in the schema
      for whichever mechanism lands

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
      (`src/app/cases/[id]/page.tsx`, `src/components/document-checklist.tsx`)
- [x] **Stage-advance automation — fully automatic** (user's choice): a
      Postgres trigger (`0008_stage_advance_and_scoped_progress.sql`)
      auto-advances `stage_1 → stage_2 → stage_3` the moment every item in
      the *current* stage is verified, seeding the next stage's checklist in
      the same trigger. Stage 3 deliberately does **not** auto-complete the
      case — see the explicit action below. Progress/counts
      (`completion_pct`, and `application_board`'s item counts) are now
      correctly scoped to the current stage only, so a completed prior
      stage's items don't blend into the new stage's percentage
- [x] **"Licence received" completion — explicit action** (user's choice):
      `completeCase` server action (`src/app/actions/cases.ts`) only allowed
      from Stage 3, sets `status = 'complete'`. Case detail page then locks
      the checklist, pending uploads, tasks, and CBK log from further edits
      (`locked` prop threaded through those components)
- [x] Tasks: add/mark-done UI (`src/components/task-list.tsx`,
      `src/app/actions/tasks.ts`) — case managers can add ad-hoc tasks and
      check them off
- [x] CBK correspondence: log-query / mark-responded UI
      (`src/components/cbk-log.tsx`, `src/app/actions/cbk.ts`) — logging a
      query auto-creates a linked task with the response deadline as its due
      date (per PLAN.md's automation rule); marking responded closes that
      task automatically
- [x] Full live test passed: stage_1 fully verified → auto-advanced to
      stage_2 with correctly reset/scoped progress → stage_2 verified →
      auto-advanced to stage_3 → stage_3 fully verified but stayed **active**
      (no auto-complete) → explicit complete action → `status = 'complete'`.
      Task and CBK flows (including the auto-created linked task) verified
      in the same run
- [ ] Task view: dedicated task list per case manager across all their cases
      (current UI only shows tasks scoped to one case)
- [ ] Notify case manager on auto-advance (no notification channel exists
      yet — Phase 4)
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
- [x] CBK correspondence log — moved up and built in Phase 3 alongside tasks,
      since the two are tightly linked (see Phase 3)
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
