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
- [x] **Brand colors applied app-wide**: dark charcoal `#212629` and orange
      `#f85814`, set as Tailwind theme tokens (`brand-dark` / `brand`) in
      `src/app/globals.css` — used for the new persistent header
      (`src/components/app-header.tsx`), primary buttons, links, focus rings,
      progress bar fill, and the Kanban board's "Complete" column accent.
      Semantic state colors (green=verified, red=rejected/expired,
      amber=received/pending) were deliberately left alone for clarity
- [x] **Input text visibility fixed everywhere**: every input/select/textarea
      now explicitly sets `bg-white text-zinc-900` rather than inheriting
      color from the page — the previous code relied on inheritance, which
      combined with `globals.css`'s now-removed `prefers-color-scheme: dark`
      override could have rendered near-invisible light-on-light text
- [x] Removed the `prefers-color-scheme: dark` override in `globals.css` —
      the app now stays on one fixed light palette by design, both for
      consistent branding and to eliminate the input-visibility risk above
- [x] Tasteful animations added: modal fade/scale-in, card hover-lift on the
      board, button press/hover transitions, list-item fade-in — gated behind
      `prefers-reduced-motion` for the custom keyframes
- [x] **Confetti on licence completion**: `CompleteCaseButton` now navigates
      to `/?completed=1` on success instead of just refreshing; the dashboard
      (`src/components/completion-confetti.tsx`, using `canvas-confetti`)
      fires a single brand-colored burst on mount when that param is present,
      then strips it from the URL so a refresh doesn't re-trigger it
- [x] **Client management**: rename (`ClientNameEditor`, inline edit on the
      case header), move an active case back a stage (`BackStageButton` +
      `moveToPreviousStage` action — resets that stage's checklist to
      `missing` so it requires fresh verification, rather than leaving it
      falsely 100% and letting the auto-advance trigger immediately send it
      forward again), and delete a client with a type-to-confirm safety guard
      (`DeleteClientDialog`, must type `delete {company name}` exactly).
      Deletion relies on the existing `ON DELETE CASCADE` foreign keys
      (applications → documents/tasks/cbk_correspondence/pending_uploads all
      cascade from `clients`), verified live
- [x] **Two bugs found and fixed while building "back a stage"**:
      (1) the auto-advance checklist seed wasn't idempotent — re-advancing
      into a stage whose documents already existed (a back-then-forward
      cycle) would have inserted duplicate rows; fixed with a `not exists`
      guard (`0009_idempotent_stage_advance.sql`). (2) that same idempotency
      fix then meant `completion_pct` stopped being recalculated when the
      insert was skipped (it was only being recomputed as a side effect of
      newly inserted rows each firing their own trigger), leaving it stuck
      at the previous stage's 100%; fixed by explicitly recalculating right
      after advancing regardless of whether rows were inserted
      (`0010_fix_completion_after_reduce_advance.sql`). Both verified live:
      advance → back → re-advance → correct 0%, no duplicate documents
- [x] **Visualize progress**: `/cases/[id]/progress` page — three concentric
      SVG rings (one per stage; "circle nested gantt" interpreted as a radial
      completion view rather than a literal date-based Gantt, since stages
      have no start/end dates in the schema), an overall %, and lists of
      remaining checklist items and open tasks below. "Visualize" links added
      on board cards, list rows, and the case detail page
      (`src/components/progress-rings.tsx`,
      `src/app/cases/[id]/progress/page.tsx`) — ring math verified via DB
      script, rendering verified via a real browser screenshot
- [x] **Guided walkthrough ("Guide me")**: a reusable spotlight+tooltip tour
      engine (`src/components/guided-tour.tsx`) with steps defined per page —
      one for the dashboard (Add client → view toggle → stage column →
      Complete column → sign out) and one for the case detail page (WorkDrive
      link → Visualize progress → checklist → tasks → CBK log). Verified live
      in a real browser (login → click "Guide me" → confirmed spotlight and
      tooltip position, step navigation, and "Skip tour")
- [x] **`TEST_GUIDE.md`** added — a QA reference listing what to test per
      feature area, how it was verified (DB script / browser / code-review
      only), and current pass status. Kept the same document standing for
      future rounds rather than a one-off
- [x] **Two real bugs found via this round's browser testing (not the DB
      scripts) and fixed**: (1) `.animate-fade-in`'s `translateY` keyframe on
      page-level wrapper divs made those ancestors a CSS containing block for
      `position: fixed` descendants, silently mispositioning the tour
      spotlight and the Add Client / Delete Client modals — fixed by making
      `fade-in` a pure opacity animation; (2) the progress page showed a
      misleading "27% overall" for a *completed* case that had been started
      partway through (Stage 3 only, skipping 1/2 as already done outside
      the app), contradicting the case page's own "100% complete" — fixed by
      treating any `complete` case as 100% overall regardless of which
      stages it actually tracked
- [x] **Browser-testing tooling notes captured** for future sessions (see
      `TEST_GUIDE.md`'s closing section): the `browser-automation` skill's
      `--script` flag needs a leading-`/`-before-drive-letter path *and*
      `MSYS2_ARG_CONV_EXCL="*"` set on Windows/Git Bash, and login forms
      should be filled via Playwright's `page.locator().fill()` inside a real
      script rather than `--eval` with direct `.value` assignment (React
      controlled-input timing makes the latter unreliable)
- [ ] Task view: dedicated task list per case manager across all their cases
      (current UI only shows tasks scoped to one case)
- [ ] Notify case manager on auto-advance (no notification channel exists
      yet — Phase 4)
- [ ] Overview/analytics page across all clients (explicitly deferred by user
      to a later pass)
- [x] **Checkbox for verifying documents + faster response**: the checklist
      table now has a dedicated "Verified" checkbox (same interaction
      pattern as the task checkboxes) instead of only a small "Verify" text
      link. Both `DocumentChecklist` and `TaskList` were converted to
      optimistic UI — the checkbox/status updates instantly from local
      state on click, the server write happens in the background, and a
      non-blocking `router.refresh()` catches up the page's server-derived
      numbers (stage label, overall %) once it lands, with a revert-on-error
      path if the write fails. Verified live: a browser screenshot taken
      ~119ms after clicking the checkbox already showed it checked and the
      badge updated to "Verified" — well under any real network round-trip —
      and the actual `completion_pct` in the database was confirmed correct
      (recalculated 0% → 50%) once the background refresh settled

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
