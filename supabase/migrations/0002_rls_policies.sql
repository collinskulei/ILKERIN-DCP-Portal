-- Row-level security: this is an internal tool for authenticated staff only.
-- Default posture: any authenticated user with a profile row can read
-- everything (the whole point of the centralized dashboard is a shared view
-- across all cases). Writes to checklist_templates are restricted to
-- compliance/admin; other writes are open to any authenticated staff member.
-- Tighten further once real role boundaries are confirmed with the client.

create function is_staff() returns boolean as $$
  select exists (select 1 from profiles where id = auth.uid());
$$ language sql security definer stable;

create function is_compliance_or_admin() returns boolean as $$
  select exists (
    select 1 from profiles
    where id = auth.uid() and role in ('compliance', 'admin')
  );
$$ language sql security definer stable;

-- profiles ------------------------------------------------------------------
alter table profiles enable row level security;

create policy "staff can read profiles" on profiles
  for select using (is_staff());

create policy "users can update own profile" on profiles
  for update using (id = auth.uid());

-- checklist_templates ---------------------------------------------------------
alter table checklist_templates enable row level security;

create policy "staff can read checklist templates" on checklist_templates
  for select using (is_staff());

create policy "compliance/admin can write checklist templates" on checklist_templates
  for all using (is_compliance_or_admin()) with check (is_compliance_or_admin());

-- clients ---------------------------------------------------------------------
alter table clients enable row level security;

create policy "staff can read clients" on clients
  for select using (is_staff());

create policy "staff can write clients" on clients
  for all using (is_staff()) with check (is_staff());

-- applications ------------------------------------------------------------------
alter table applications enable row level security;

create policy "staff can read applications" on applications
  for select using (is_staff());

create policy "staff can write applications" on applications
  for all using (is_staff()) with check (is_staff());

-- shareholders_directors ---------------------------------------------------------
alter table shareholders_directors enable row level security;

create policy "staff can read shareholders_directors" on shareholders_directors
  for select using (is_staff());

create policy "staff can write shareholders_directors" on shareholders_directors
  for all using (is_staff()) with check (is_staff());

-- documents ------------------------------------------------------------------------
alter table documents enable row level security;

create policy "staff can read documents" on documents
  for select using (is_staff());

create policy "staff can write documents" on documents
  for all using (is_staff()) with check (is_staff());

-- tasks -----------------------------------------------------------------------------
alter table tasks enable row level security;

create policy "staff can read tasks" on tasks
  for select using (is_staff());

create policy "staff can write tasks" on tasks
  for all using (is_staff()) with check (is_staff());

-- cbk_correspondence ------------------------------------------------------------------
alter table cbk_correspondence enable row level security;

create policy "staff can read cbk_correspondence" on cbk_correspondence
  for select using (is_staff());

create policy "staff can write cbk_correspondence" on cbk_correspondence
  for all using (is_staff()) with check (is_staff());

-- fee_payments ------------------------------------------------------------------------
alter table fee_payments enable row level security;

create policy "staff can read fee_payments" on fee_payments
  for select using (is_staff());

create policy "staff can write fee_payments" on fee_payments
  for all using (is_staff()) with check (is_staff());

-- notification_log --------------------------------------------------------------------
alter table notification_log enable row level security;

create policy "staff can read notification_log" on notification_log
  for select using (is_staff());

-- writes to notification_log come from server-side (service role) jobs only,
-- so no insert/update policy is granted to regular staff sessions here.

-- audit_log ------------------------------------------------------------------------------
alter table audit_log enable row level security;

create policy "staff can read audit_log" on audit_log
  for select using (is_staff());

-- audit_log is append-only and written by triggers/service role, not by
-- direct client writes, so no insert/update/delete policy for staff sessions.
